"""
Course Recommendation Service
Pipeline: seed → embed → map → query
"""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

from .embedder import cosine_similarity, embed_batch, embed_text, relevance_label
from .models import CourseCatalog, CourseSkillMap
from .schemas import CourseOut, CourseRecommendation, CourseRecommendationsResponse

logger = logging.getLogger(__name__)

# Minimum cosine similarity to consider a course relevant
MIN_SIMILARITY = 0.40


# ── 1. Seed ────────────────────────────────────────────────────────

def seed_courses(db: "Session") -> dict:
    """Load static course dataset into PostgreSQL (idempotent)."""
    from .seed_data import SEED_COURSES

    inserted = 0
    skipped = 0
    for data in SEED_COURSES:
        existing = db.query(CourseCatalog).filter_by(external_id=data["external_id"]).first()
        if existing:
            skipped += 1
            continue
        course = CourseCatalog(**{k: v for k, v in data.items()})
        db.add(course)
        inserted += 1

    db.commit()
    logger.info(f"Seed complete: {inserted} inserted, {skipped} skipped")
    return {"inserted": inserted, "skipped": skipped}


# ── 2. Embed courses ───────────────────────────────────────────────

def run_embedding_pipeline(db: "Session", batch_size: int = 32) -> dict:
    """
    Compute SBERT embeddings for all un-embedded courses.
    Stores vector in course_catalog.embedding (float[]).
    """
    courses = (
        db.query(CourseCatalog)
        .filter(CourseCatalog.is_embedded == False)
        .all()
    )
    if not courses:
        return {"embedded": 0, "total": 0}

    total = len(courses)
    embedded = 0

    for i in range(0, total, batch_size):
        batch = courses[i: i + batch_size]
        texts = [f"{c.title}. {c.description or ''}" for c in batch]
        vectors = embed_batch(texts)

        for course, vec in zip(batch, vectors):
            if vec:
                course.embedding = vec
                course.is_embedded = True
                embedded += 1

        db.commit()
        logger.info(f"  Embedded {min(i + batch_size, total)}/{total}")

    logger.info(f"Embedding pipeline done: {embedded}/{total}")
    return {"embedded": embedded, "total": total}


# ── 3. Map Skill ↔ Course ──────────────────────────────────────────

def build_skill_course_map(db: "Session", skills: list[str] | None = None) -> dict:
    """
    For each skill, find courses whose embedding is similar (cosine ≥ MIN_SIMILARITY).
    Saves results into course_skill_map table.
    """
    # Which skills to process
    if skills is None:
        # Use all unique skill names that already exist in the map as starting point
        # + the explicit default skill list
        skills = _default_skills()

    # Get all embedded courses
    courses = (
        db.query(CourseCatalog)
        .filter(CourseCatalog.is_embedded == True, CourseCatalog.embedding != None)
        .all()
    )
    if not courses:
        return {"mapped": 0, "skills_processed": 0}

    skill_embeddings = embed_batch(skills)
    mapped = 0

    for skill, skill_vec in zip(skills, skill_embeddings):
        if not skill_vec:
            continue

        for course in courses:
            if not course.embedding:
                continue
            score = cosine_similarity(skill_vec, course.embedding)
            if score < MIN_SIMILARITY:
                continue

            # Upsert into course_skill_map
            existing = (
                db.query(CourseSkillMap)
                .filter_by(course_id=course.id, skill_name=skill)
                .first()
            )
            if existing:
                existing.similarity_score = score
            else:
                db.add(CourseSkillMap(
                    course_id=course.id,
                    skill_name=skill,
                    similarity_score=score,
                ))
            mapped += 1

    db.commit()
    logger.info(f"Skill-course map built: {mapped} pairs for {len(skills)} skills")
    return {"mapped": mapped, "skills_processed": len(skills)}


# ── 4. Recommend ──────────────────────────────────────────────────

def recommend_courses_for_skills(
    db: "Session",
    missing_skills: list[str],
    top_k_per_skill: int = 3,
) -> CourseRecommendationsResponse:
    """
    Main recommendation function.
    Flow: Neo4j → PostgreSQL fallback → on-the-fly embedding fallback
    """
    if not missing_skills:
        return CourseRecommendationsResponse(
            missing_skills=[], recommendations=[], total=0, source="empty"
        )

    # 1️⃣  Try Neo4j first
    from .neo4j_sync import query_courses_for_skills
    neo_results = query_courses_for_skills(missing_skills, top_k=top_k_per_skill)
    if neo_results:
        recs = _build_recs_from_neo4j(db, neo_results)
        if recs:
            return CourseRecommendationsResponse(
                missing_skills=missing_skills,
                recommendations=recs,
                total=len(recs),
                source="neo4j",
            )

    # 2️⃣  Fallback: PostgreSQL course_skill_map
    recs = _query_from_pg(db, missing_skills, top_k_per_skill)
    if recs:
        return CourseRecommendationsResponse(
            missing_skills=missing_skills,
            recommendations=recs,
            total=len(recs),
            source="postgresql",
        )

    # 3️⃣  Fallback: on-the-fly embedding similarity (no pre-computed map)
    recs = _on_the_fly(db, missing_skills, top_k_per_skill)
    if recs:
        return CourseRecommendationsResponse(
            missing_skills=missing_skills,
            recommendations=recs,
            total=len(recs),
            source="fallback",
        )

    # 4️⃣  Online search links — when no local courses found, generate search URLs
    recs = _build_online_search_recs(missing_skills, top_k_per_skill)
    return CourseRecommendationsResponse(
        missing_skills=missing_skills,
        recommendations=recs,
        total=len(recs),
        source="online_search",
    )


# ── Online search fallback ────────────────────────────────────────

def _build_online_search_recs(skills: list[str], top_k: int) -> list[CourseRecommendation]:
    """
    Generate search URL cards for major course platforms.
    Used when no local courses are found — lets users search online directly.
    """
    import urllib.parse

    PLATFORMS = [
        {
            "name": "Coursera",
            "url_tpl": "https://www.coursera.org/search?query={q}",
            "platform": "coursera",
            "is_free": False,
            "score": 0.90,
        },
        {
            "name": "Udemy",
            "url_tpl": "https://www.udemy.com/courses/search/?q={q}",
            "platform": "udemy",
            "is_free": False,
            "score": 0.87,
        },
        {
            "name": "YouTube",
            "url_tpl": "https://www.youtube.com/results?search_query={q}+tutorial",
            "platform": "youtube",
            "is_free": True,
            "score": 0.80,
        },
    ]

    recs: list[CourseRecommendation] = []
    for skill in skills[:top_k * 2]:  # limit skills
        for p in PLATFORMS[:top_k]:
            q = urllib.parse.quote_plus(f"{skill} course")
            url = p["url_tpl"].format(q=q)
            recs.append(CourseRecommendation(
                course=CourseOut(
                    id=0,
                    external_id=f"online_{p['platform']}_{skill}",
                    title=f"{skill} — Tìm khóa học trên {p['name']}",
                    description=f"Tìm kiếm khóa học về {skill} trực tiếp trên {p['name']}",
                    url=url,
                    platform=p["platform"],
                    instructor=None,
                    rating=4.5,
                    num_reviews=0,
                    price=0.0,
                    is_free=p["is_free"],
                    level="beginner",
                    duration_hrs=None,
                    thumbnail=None,
                    language="vi",
                    tags=[skill],
                ),
                skill_name=skill,
                similarity_score=p["score"],
                relevance_label="Highly Relevant",
            ))
    return recs


# ── Internal helpers ──────────────────────────────────────────────

def _build_recs_from_neo4j(db: "Session", neo_results: list[dict]) -> list[CourseRecommendation]:
    seen: set[int] = set()
    recs: list[CourseRecommendation] = []
    for r in neo_results:
        db_id = r.get("db_id")
        if db_id in seen:
            continue
        seen.add(db_id)
        course = db.query(CourseCatalog).filter_by(id=db_id).first() if db_id else None
        if not course:
            # Build a lightweight CourseOut from Neo4j data
            recs.append(CourseRecommendation(
                course=CourseOut(
                    id=0,
                    external_id="",
                    title=r.get("title", ""),
                    description=None,
                    url=r.get("url"),
                    platform=r.get("platform", ""),
                    instructor=None,
                    rating=float(r.get("rating") or 0),
                    num_reviews=0,
                    price=0.0,
                    is_free=bool(r.get("is_free")),
                    level=r.get("level"),
                    duration_hrs=None,
                    thumbnail=None,
                    language="en",
                    tags=[],
                ),
                skill_name=r.get("skill_name", ""),
                similarity_score=float(r.get("score") or 0),
                relevance_label=relevance_label(float(r.get("score") or 0)),
            ))
        else:
            recs.append(_to_rec(course, r.get("skill_name", ""), float(r.get("score") or 0)))
    return recs


def _query_from_pg(db: "Session", skills: list[str], top_k: int) -> list[CourseRecommendation]:
    recs: list[CourseRecommendation] = []
    seen: set[int] = set()
    for skill in skills:
        rows = (
            db.query(CourseSkillMap, CourseCatalog)
            .join(CourseCatalog, CourseSkillMap.course_id == CourseCatalog.id)
            .filter(CourseSkillMap.skill_name == skill)
            .order_by(CourseSkillMap.similarity_score.desc())
            .limit(top_k)
            .all()
        )
        for mapping, course in rows:
            if course.id in seen:
                continue
            seen.add(course.id)
            recs.append(_to_rec(course, skill, mapping.similarity_score))
    return recs


def _on_the_fly(db: "Session", skills: list[str], top_k: int) -> list[CourseRecommendation]:
    """Embed skills on-the-fly, compare against embedded courses."""
    courses = (
        db.query(CourseCatalog)
        .filter(CourseCatalog.is_embedded == True)
        .limit(500)  # cap to avoid timeout
        .all()
    )
    if not courses:
        return []

    skill_vecs = embed_batch(skills)
    seen: set[int] = set()
    recs: list[CourseRecommendation] = []

    for skill, skill_vec in zip(skills, skill_vecs):
        if not skill_vec:
            continue
        scored = []
        for course in courses:
            if not course.embedding or course.id in seen:
                continue
            score = cosine_similarity(skill_vec, course.embedding)
            if score >= MIN_SIMILARITY:
                scored.append((score, course))
        scored.sort(key=lambda x: x[0], reverse=True)
        for score, course in scored[:top_k]:
            seen.add(course.id)
            recs.append(_to_rec(course, skill, score))

    return recs


def _to_rec(course: CourseCatalog, skill: str, score: float) -> CourseRecommendation:
    return CourseRecommendation(
        course=CourseOut.model_validate(course),
        skill_name=skill,
        similarity_score=round(score, 4),
        relevance_label=relevance_label(score),
    )


def _default_skills() -> list[str]:
    return [
        "Python", "SQL", "Machine Learning", "Data Science", "Deep Learning",
        "NLP", "Statistics", "Data Visualization", "Tableau", "Power BI",
        "Excel", "JavaScript", "TypeScript", "React", "Node.js", "Java",
        "Docker", "Kubernetes", "AWS", "Azure", "GCP", "Linux", "Git",
        "CI/CD", "DevOps", "Cybersecurity", "Networking", "Algorithms",
        "Data Structures", "FastAPI", "REST API", "GraphQL", "MongoDB",
        "PostgreSQL", "Spring Boot", "Microservices", "Agile", "Scrum",
        "Project Management", "Leadership", "Communication", "TensorFlow",
        "PyTorch", "Computer Vision", "R", "Linear Algebra", "UX Design",
    ]


def get_status(db: "Session") -> dict:
    total = db.query(CourseCatalog).count()
    embedded = db.query(CourseCatalog).filter(CourseCatalog.is_embedded == True).count()
    mappings = db.query(CourseSkillMap).count()

    from app.modules.graph.neo4j_client import get_driver
    neo4j_ok = get_driver() is not None
    return {
        "total_courses": total,
        "embedded_courses": embedded,
        "total_mappings": mappings,
        "neo4j_synced": neo4j_ok,
    }
