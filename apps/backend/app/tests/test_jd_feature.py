"""
Test cases cho JD Feature
"""
import pytest
from unittest.mock import MagicMock, patch


# ── Test JD Parsing ──────────────────────────────────────────────────────────

def test_parse_jd_fallback_returns_structure():
    """Khi Gemini fail, fallback vẫn trả về đúng cấu trúc"""
    from apps.backend.app.modules.interview.jd_service import JDService
    db = MagicMock()
    svc = JDService.__new__(JDService)
    svc.db = db
    svc.gemini = MagicMock()
    svc.gemini.stream_manager.generate_content_with_retry.side_effect = Exception("API error")

    result = svc.parse_jd_text("Java developer needed")
    assert "required_skills" in result
    assert "tools" in result
    assert "responsibilities" in result
    assert "experience_level" in result
    assert isinstance(result["required_skills"], list)


def test_parse_jd_valid_json_response():
    """Khi Gemini trả về JSON hợp lệ, parse đúng"""
    from apps.backend.app.modules.interview.jd_service import JDService
    db = MagicMock()
    svc = JDService.__new__(JDService)
    svc.db = db
    svc.gemini = MagicMock()
    svc.gemini.stream_manager.generate_content_with_retry.return_value = '''
    {
      "required_skills": ["Java", "Spring Boot"],
      "tools": ["MySQL", "Git"],
      "responsibilities": ["Build REST API", "Training 3 months"],
      "experience_level": "Fresher",
      "domain": "Web Backend",
      "company_culture": "",
      "benefits": []
    }
    '''

    result = svc.parse_jd_text("Java developer JD...")
    assert result["required_skills"] == ["Java", "Spring Boot"]
    assert result["tools"] == ["MySQL", "Git"]
    assert result["experience_level"] == "Fresher"


# ── Test Context Builder ─────────────────────────────────────────────────────

def test_build_context_no_jd():
    """Không có JD thì trả về nguyên neo4j context"""
    from apps.backend.app.modules.interview.context_builder import build_interview_context
    neo4j_ctx = {"skills": [{"skill_name": "Python", "importance": 4.0}], "title": "Dev"}
    result = build_interview_context(neo4j_ctx, None)
    assert result == neo4j_ctx


def test_build_context_merges_new_skills():
    """JD skills mới được thêm vào, không duplicate"""
    from apps.backend.app.modules.interview.context_builder import build_interview_context
    neo4j_ctx = {
        "skills": [{"skill_name": "Python", "skill_type": "hard", "importance": 4.0, "level": 3.0}],
        "title": "Dev"
    }
    jd_data = {
        "required_skills": ["Python", "FastAPI"],  # Python đã có, FastAPI mới
        "tools": ["Docker"],
        "responsibilities": ["Build API"],
        "experience_level": "Junior",
        "domain": "Backend"
    }
    result = build_interview_context(neo4j_ctx, jd_data)
    skill_names = [s["skill_name"] for s in result["skills"]]
    assert "Python" in skill_names
    assert "FastAPI" in skill_names
    assert "Docker" in skill_names
    assert skill_names.count("Python") == 1  # không duplicate
    assert result["has_jd"] is True
    assert result["jd_level"] == "Junior"


def test_build_context_preserves_neo4j_data():
    """Neo4j data không bị mất khi merge"""
    from apps.backend.app.modules.interview.context_builder import build_interview_context
    neo4j_ctx = {
        "skills": [{"skill_name": "Java", "importance": 5.0}],
        "onet_code": "15-1252.00",
        "title": "Software Dev"
    }
    jd_data = {"required_skills": ["Spring"], "tools": [], "responsibilities": [], "experience_level": "Middle", "domain": ""}
    result = build_interview_context(neo4j_ctx, jd_data)
    assert result["onet_code"] == "15-1252.00"
    assert result["title"] == "Software Dev"


# ── Test File Extraction ─────────────────────────────────────────────────────

def test_extract_pdf_invalid_bytes_raises():
    """Bytes không hợp lệ raise ValueError"""
    from apps.backend.app.modules.interview.jd_service import JDService
    svc = JDService.__new__(JDService)
    svc.db = MagicMock()
    svc.gemini = MagicMock()
    with pytest.raises((ValueError, Exception)):
        svc.extract_pdf_text(b"not a pdf")


def test_extract_docx_invalid_bytes_raises():
    """DOCX bytes không hợp lệ raise ValueError"""
    from apps.backend.app.modules.interview.jd_service import JDService
    svc = JDService.__new__(JDService)
    svc.db = MagicMock()
    svc.gemini = MagicMock()
    with pytest.raises((ValueError, Exception)):
        svc.extract_docx_text(b"not a docx")


# ── Test Save JD ─────────────────────────────────────────────────────────────

def test_save_jd_calls_parse_and_commits():
    """save_jd gọi parse và commit DB"""
    from apps.backend.app.modules.interview.jd_service import JDService
    db = MagicMock()
    svc = JDService.__new__(JDService)
    svc.db = db
    svc.gemini = MagicMock()
    svc.gemini.stream_manager.generate_content_with_retry.return_value = '{"required_skills":[],"tools":[],"responsibilities":[],"experience_level":"Middle","domain":"","company_culture":"","benefits":[]}'

    mock_jd = MagicMock()
    mock_jd.id = 1
    db.add = MagicMock()
    db.commit = MagicMock()
    db.refresh = MagicMock()

    with patch("apps.backend.app.modules.interview.jd_service.JobDescription", return_value=mock_jd):
        svc.save_jd(user_id=1, career_id="15-1252.00", raw_text="Java developer needed for backend role")

    db.add.assert_called_once()
    db.commit.assert_called_once()
