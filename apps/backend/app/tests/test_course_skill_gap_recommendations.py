import json
import sys
import types

from app.modules.courses import service
from app.modules.courses.schemas import CourseOut, CourseRecommendation


def _rec(skill: str, score: float = 0.8) -> CourseRecommendation:
    return CourseRecommendation(
        course=CourseOut(
            id=0,
            external_id=f"test_{skill}",
            title=f"{skill} Course",
            description=f"Course for {skill}",
            url=f"https://www.coursera.org/search?query={skill}",
            platform="coursera",
            instructor=None,
            rating=4.7,
            num_reviews=100,
            price=0,
            is_free=True,
            level="beginner",
            duration_hrs=12,
            thumbnail=None,
            language="en",
            tags=[skill],
        ),
        skill_name=skill,
        similarity_score=score,
        relevance_label="Relevant",
    )


def test_skill_gap_recommendations_exclude_owned_skills_and_annotate_fallback(monkeypatch):
    captured = []

    def fake_ai(grouped, career_name, top_k_per_skill):
        captured.append(grouped)
        return []

    def fake_fallback(db, skills, top_k_per_skill):
        return service.CourseRecommendationsResponse(
            missing_skills=skills,
            recommendations=[_rec(skill) for skill in skills],
            total=len(skills),
            source="online_search",
        )

    monkeypatch.setattr(service, "_recommend_with_gemini", fake_ai)
    monkeypatch.setattr(service, "recommend_courses_for_skills", fake_fallback)

    result = service.recommend_courses_for_skill_groups(
        db=None,
        critical=["Python", "SQL"],
        important=["Machine Learning", "Python"],
        nice_to_have=["Docker"],
        owned_skills=["python"],
        career_name="Data Analyst",
        top_k_per_skill=2,
    )

    assert captured == [{
        "critical": ["SQL"],
        "important": ["Machine Learning"],
        "nice_to_have": ["Docker"],
    }]
    assert result.source == "fallback_db_search"
    assert result.missing_skills == ["SQL", "Machine Learning", "Docker"]
    assert result.grouped_counts == {"critical": 1, "important": 1, "nice_to_have": 1}
    assert {rec.skill_name for rec in result.recommendations} == {"SQL", "Machine Learning", "Docker"}
    assert all(rec.skill_name != "Python" for rec in result.recommendations)
    assert all(rec.priority_label for rec in result.recommendations)
    assert all("fallback" in (rec.reason or "").lower() for rec in result.recommendations)


def test_empty_response_when_all_missing_skills_are_already_owned(monkeypatch):
    monkeypatch.setattr(service, "_recommend_with_gemini", lambda *args, **kwargs: [])

    result = service.recommend_courses_for_skill_groups(
        db=None,
        critical=["Python"],
        important=["SQL"],
        nice_to_have=[],
        owned_skills=["python", "sql"],
    )

    assert result.source == "empty"
    assert result.total == 0
    assert result.recommendations == []
    assert result.grouped_counts == {"critical": 0, "important": 0, "nice_to_have": 0}


def test_gemini_recommendations_validate_skill_domain_and_sort(monkeypatch):
    class FakeResponse:
        text = json.dumps({
            "courses": [
                {
                    "skill_name": "Docker",
                    "priority_group": "nice_to_have",
                    "title": "Docker for Developers",
                    "platform": "udemy",
                    "provider": "Udemy Instructor",
                    "url": "https://evil.example/docker",
                    "description": "Docker basics with hands-on practice.",
                    "rating": 4.6,
                    "num_reviews": 1500,
                    "duration_hrs": 11,
                    "is_free": False,
                    "price": 19,
                    "level": "beginner",
                    "language": "en",
                    "fit_score": 0.83,
                    "source_quality": "high_review_count",
                    "reason": "Giúp bổ sung Docker ở mức thực hành.",
                },
                {
                    "skill_name": "SQL",
                    "priority_group": "critical",
                    "title": "SQL for Data Analysis",
                    "platform": "coursera",
                    "provider": "University",
                    "url": "https://www.coursera.org/learn/sql-data-analysis",
                    "description": "SQL querying and analysis.",
                    "rating": 4.9,
                    "num_reviews": 20000,
                    "duration_hrs": 32,
                    "is_free": False,
                    "price": 49,
                    "level": "beginner",
                    "language": "en",
                    "fit_score": 0.94,
                    "source_quality": "university",
                    "reason": "Ưu tiên vì SQL là kỹ năng thiếu nghiêm trọng.",
                },
                {
                    "skill_name": "Already Owned Skill",
                    "title": "Should be ignored",
                    "platform": "coursera",
                    "url": "https://www.coursera.org/search?query=ignored",
                },
            ]
        })

    class FakeModel:
        def __init__(self, name):
            self.name = name

        def generate_content(self, prompt, generation_config):
            assert "Coursera, edX, Udemy, freeCodeCamp, LinkedIn Learning" in prompt
            return FakeResponse()

    fake_genai = types.ModuleType("google.generativeai")
    fake_genai.configure = lambda api_key: None
    fake_genai.GenerativeModel = FakeModel
    google_pkg = types.ModuleType("google")
    google_pkg.__path__ = []
    google_pkg.generativeai = fake_genai

    monkeypatch.setenv("GEMINI_COURSE_API_KEY", "test-key")
    monkeypatch.setitem(sys.modules, "google", google_pkg)
    monkeypatch.setitem(sys.modules, "google.generativeai", fake_genai)

    recs = service._recommend_with_gemini(
        {
            "critical": ["SQL"],
            "important": [],
            "nice_to_have": ["Docker"],
        },
        "Data Analyst",
        top_k_per_skill=2,
    )

    assert [rec.skill_name for rec in recs] == ["SQL", "Docker"]
    assert [rec.priority_group for rec in recs] == ["critical", "nice_to_have"]
    assert recs[0].course.url == "https://www.coursera.org/learn/sql-data-analysis"
    assert recs[1].course.url.startswith("https://www.udemy.com/courses/search/")
    assert service._is_trusted_url(recs[1].course.url, "udemy")


def test_online_search_fallback_uses_only_trusted_sources():
    recs = service._build_online_search_recs(["Python"], top_k=5)

    platforms = {rec.course.platform for rec in recs}
    assert platforms == {"coursera", "edx", "udemy", "freecodecamp", "linkedin learning"}
    assert all(service._is_trusted_url(rec.course.url or "", rec.course.platform) for rec in recs)


def test_skill_gap_recommendations_use_db_cache_after_first_generation(monkeypatch):
    class FakeQuery:
        def __init__(self, db):
            self.db = db

        def filter(self, *args, **kwargs):
            return self

        def first(self):
            return self.db.row

    class FakeDb:
        def __init__(self):
            self.row = None
            self.commits = 0

        def query(self, *args, **kwargs):
            return FakeQuery(self)

        def add(self, row):
            self.row = row

        def commit(self):
            self.commits += 1

        def rollback(self):
            pass

    calls = []

    def fake_ai(grouped, career_name, top_k_per_skill):
        calls.append((grouped, career_name, top_k_per_skill))
        rec = _rec("SQL", 0.93)
        rec.priority_group = "critical"
        rec.priority_label = "Thiếu nghiêm trọng"
        rec.reason = "Học SQL trước để bù kỹ năng lõi."
        return [rec]

    db = FakeDb()
    monkeypatch.setattr(service, "_recommend_with_gemini", fake_ai)

    first = service.recommend_courses_for_skill_groups(
        db=db,
        critical=["SQL"],
        important=[],
        nice_to_have=[],
        owned_skills=[],
        career_name="Data Analyst",
        analysis_id=18,
    )
    second = service.recommend_courses_for_skill_groups(
        db=db,
        critical=["SQL"],
        important=[],
        nice_to_have=[],
        owned_skills=[],
        career_name="Tên nghề có thể đổi",
        analysis_id=18,
    )

    assert first.source == "gemini"
    assert second.source == "cache"
    assert second.recommendations[0].skill_name == "SQL"
    assert len(calls) == 1
    assert db.commits == 1


def test_course_model_default_uses_latest_flash(monkeypatch):
    class FakeResponse:
        text = json.dumps({"courses": []})

    class FakeModel:
        seen_model = None

        def __init__(self, name):
            FakeModel.seen_model = name

        def generate_content(self, prompt, generation_config):
            return FakeResponse()

    fake_genai = types.ModuleType("google.generativeai")
    fake_genai.configure = lambda api_key: None
    fake_genai.GenerativeModel = FakeModel
    google_pkg = types.ModuleType("google")
    google_pkg.__path__ = []
    google_pkg.generativeai = fake_genai

    monkeypatch.setenv("GEMINI_COURSE_API_KEY", "test-key")
    monkeypatch.delenv("GEMINI_COURSE_MODEL", raising=False)
    monkeypatch.setitem(sys.modules, "google", google_pkg)
    monkeypatch.setitem(sys.modules, "google.generativeai", fake_genai)

    service._recommend_with_gemini({"critical": ["SQL"], "important": [], "nice_to_have": []}, None, 1)

    assert FakeModel.seen_model == "gemini-flash-latest"


def test_deprecated_course_model_is_replaced(monkeypatch):
    monkeypatch.setenv("GEMINI_COURSE_MODEL", "gemini-1.5-flash")

    assert service._course_gemini_model_name() == "gemini-flash-latest"
