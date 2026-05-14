"""
Course Recommendation Service
Pipeline: seed → embed → map → query
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import re
from typing import TYPE_CHECKING
from urllib.parse import quote_plus, urlparse

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

from .embedder import cosine_similarity, embed_batch, embed_text, relevance_label
from .models import CourseCatalog, CourseSkillMap, SkillGapCourseRecommendationCache
from .schemas import CourseOut, CourseRecommendation, CourseRecommendationsResponse

logger = logging.getLogger(__name__)

# Minimum cosine similarity to consider a course relevant
MIN_SIMILARITY = 0.40

PRIORITY_LABELS = {
    "critical": "Thiếu nghiêm trọng",
    "important": "Quan trọng",
    "nice_to_have": "Nên có",
}

PRIORITY_ORDER = {"critical": 0, "important": 1, "nice_to_have": 2}
DEFAULT_GEMINI_COURSE_MODEL = "gemini-flash-latest"
CACHEABLE_SKILL_LIMITS = {"critical": 6, "important": 6, "nice_to_have": 5}
DEPRECATED_GEMINI_COURSE_MODELS = {"gemini-1.5-flash", "models/gemini-1.5-flash"}

TRUSTED_COURSE_SOURCES = {
    "coursera": {
        "domains": ("coursera.org", "www.coursera.org"),
        "search": "https://www.coursera.org/search?query={q}",
    },
    "edx": {
        "domains": ("edx.org", "www.edx.org"),
        "search": "https://www.edx.org/search?q={q}",
    },
    "udemy": {
        "domains": ("udemy.com", "www.udemy.com"),
        "search": "https://www.udemy.com/courses/search/?q={q}",
    },
    "freecodecamp": {
        "domains": ("freecodecamp.org", "www.freecodecamp.org"),
        "search": "https://www.freecodecamp.org/news/search/?query={q}",
    },
    "linkedin learning": {
        "domains": ("linkedin.com", "www.linkedin.com", "learning.linkedin.com"),
        "search": "https://www.linkedin.com/learning/search?keywords={q}",
    },
}


def _skill_name(skill) -> str:
    if isinstance(skill, str):
        return skill.strip()
    if isinstance(skill, dict):
        return str(skill.get("name") or skill.get("skill") or "").strip()
    return ""


def _norm_key(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").strip().lower())


def _dedupe_skills(skills: list[str], owned: set[str] | None = None, limit: int | None = None) -> list[str]:
    owned = owned or set()
    out: list[str] = []
    seen: set[str] = set()
    for raw in skills:
        name = _skill_name(raw)
        key = _norm_key(name)
        if not name or key in seen or key in owned:
            continue
        seen.add(key)
        out.append(name)
        if limit and len(out) >= limit:
            break
    return out


def _grouped_counts(recs: list[CourseRecommendation]) -> dict[str, int]:
    counts = {key: 0 for key in PRIORITY_LABELS}
    for rec in recs:
        if rec.priority_group in counts:
            counts[rec.priority_group] += 1
    return counts


def _cache_key(
    analysis_id: int | None,
    grouped: dict[str, list[str]],
    owned_skills: list[str] | None,
    top_k_per_skill: int,
) -> str:
    payload = {
        "analysis_id": analysis_id,
        "skill_groups": {
            group: [_norm_key(skill) for skill in grouped.get(group, [])]
            for group in ("critical", "important", "nice_to_have")
        },
        "owned_skills": sorted({_norm_key(skill) for skill in (owned_skills or []) if _skill_name(skill)}),
        "top_k_per_skill": int(top_k_per_skill),
        "version": 2,
    }
    raw = json.dumps(payload, ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _course_to_dict(course: CourseOut) -> dict:
    return course.model_dump() if hasattr(course, "model_dump") else course.dict()


def _rec_to_dict(rec: CourseRecommendation) -> dict:
    return {
        "course": _course_to_dict(rec.course),
        "skill_name": rec.skill_name,
        "similarity_score": rec.similarity_score,
        "relevance_label": rec.relevance_label,
        "priority_group": rec.priority_group,
        "priority_label": rec.priority_label,
        "reason": rec.reason,
        "source_quality": rec.source_quality,
    }


def _rec_from_dict(data: dict) -> CourseRecommendation | None:
    try:
        return CourseRecommendation(
            course=CourseOut(**data["course"]),
            skill_name=data["skill_name"],
            similarity_score=float(data.get("similarity_score") or 0),
            relevance_label=data.get("relevance_label") or "Relevant",
            priority_group=data.get("priority_group"),
            priority_label=data.get("priority_label"),
            reason=data.get("reason"),
            source_quality=data.get("source_quality"),
        )
    except Exception:
        return None


def _load_skill_gap_cache(db: "Session" | None, cache_key: str) -> list[CourseRecommendation] | None:
    if db is None:
        return None
    try:
        row = (
            db.query(SkillGapCourseRecommendationCache)
            .filter(
                SkillGapCourseRecommendationCache.cache_key == cache_key,
                SkillGapCourseRecommendationCache.status == "ready",
            )
            .first()
        )
    except Exception as exc:
        logger.warning(f"Skill-gap course cache read failed: {exc}")
        return None
    if not row:
        return None

    recs = [_rec_from_dict(item) for item in (row.recommendations or [])]
    return [rec for rec in recs if rec is not None]


def _save_skill_gap_cache(
    db: "Session" | None,
    cache_key: str,
    analysis_id: int | None,
    career_name: str | None,
    grouped: dict[str, list[str]],
    owned_skills: list[str] | None,
    source: str,
    recs: list[CourseRecommendation],
    error_message: str | None = None,
) -> None:
    if db is None or not recs:
        return
    try:
        row = (
            db.query(SkillGapCourseRecommendationCache)
            .filter(SkillGapCourseRecommendationCache.cache_key == cache_key)
            .first()
        )
        payload = [_rec_to_dict(rec) for rec in recs]
        if row is None:
            row = SkillGapCourseRecommendationCache(cache_key=cache_key)
            db.add(row)
        row.analysis_id = analysis_id
        row.career_name = career_name
        row.model_name = _course_gemini_model_name()
        row.source = source
        row.status = "ready"
        row.skill_groups = grouped
        row.owned_skills = owned_skills or []
        row.recommendations = payload
        row.error_message = error_message
        db.commit()
    except Exception as exc:
        logger.warning(f"Skill-gap course cache write failed: {exc}")
        try:
            db.rollback()
        except Exception:
            pass


def _is_trusted_url(url: str, platform: str) -> bool:
    try:
        host = urlparse(url).netloc.lower()
    except Exception:
        return False
    allowed = TRUSTED_COURSE_SOURCES.get(platform.lower(), {}).get("domains", ())
    return bool(host) and any(host == d or host.endswith("." + d) for d in allowed)


def _search_url(platform: str, skill: str, title: str = "") -> str:
    platform_key = platform.lower()
    source = TRUSTED_COURSE_SOURCES.get(platform_key) or TRUSTED_COURSE_SOURCES["coursera"]
    q = quote_plus(f"{skill} {title} course".strip())
    return source["search"].format(q=q)


def _clean_platform(platform: str) -> str:
    p = _norm_key(platform)
    aliases = {
        "linkedin": "linkedin learning",
        "linkedinlearning": "linkedin learning",
        "free code camp": "freecodecamp",
        "freecodecamp": "freecodecamp",
        "edx": "edx",
        "coursera": "coursera",
        "udemy": "udemy",
    }
    return aliases.get(p, "coursera")


def _course_gemini_model_name() -> str:
    configured = (os.getenv("GEMINI_COURSE_MODEL") or DEFAULT_GEMINI_COURSE_MODEL).strip()
    if configured in DEPRECATED_GEMINI_COURSE_MODELS:
        logger.warning(
            "GEMINI_COURSE_MODEL=%s is deprecated or unavailable; using %s",
            configured,
            DEFAULT_GEMINI_COURSE_MODEL,
        )
        return DEFAULT_GEMINI_COURSE_MODEL
    return configured


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
        grouped_counts=_grouped_counts(recs),
    )


def recommend_courses_for_skill_groups(
    db: "Session",
    critical: list[str] | None = None,
    important: list[str] | None = None,
    nice_to_have: list[str] | None = None,
    owned_skills: list[str] | None = None,
    career_name: str | None = None,
    analysis_id: int | None = None,
    top_k_per_skill: int = 3,
) -> CourseRecommendationsResponse:
    """
    Course recommendations for skill-gap result pages.

    Primary path: Gemini returns real-looking, platform-constrained course
    candidates for missing skills only. DB and deterministic search links stay
    as fallback until core.course_catalog/core.course_skill_map are rebuilt.
    """
    owned = {_norm_key(s) for s in (owned_skills or []) if _skill_name(s)}
    grouped = {
        "critical": _dedupe_skills(critical or [], owned, limit=CACHEABLE_SKILL_LIMITS["critical"]),
        "important": _dedupe_skills(important or [], owned, limit=CACHEABLE_SKILL_LIMITS["important"]),
        "nice_to_have": _dedupe_skills(nice_to_have or [], owned, limit=CACHEABLE_SKILL_LIMITS["nice_to_have"]),
    }
    ordered_skills = [
        skill
        for group in ("critical", "important", "nice_to_have")
        for skill in grouped[group]
    ]

    if not ordered_skills:
        return CourseRecommendationsResponse(
            missing_skills=[],
            recommendations=[],
            total=0,
            source="empty",
            grouped_counts={key: 0 for key in PRIORITY_LABELS},
        )

    key = _cache_key(analysis_id, grouped, owned_skills, top_k_per_skill)
    cached_recs = _load_skill_gap_cache(db, key)
    if cached_recs:
        return CourseRecommendationsResponse(
            missing_skills=ordered_skills,
            recommendations=cached_recs,
            total=len(cached_recs),
            source="cache",
            grouped_counts=_grouped_counts(cached_recs),
        )

    ai_recs = _recommend_with_gemini(grouped, career_name, top_k_per_skill)
    if ai_recs:
        _save_skill_gap_cache(db, key, analysis_id, career_name, grouped, owned_skills, "gemini", ai_recs)
        return CourseRecommendationsResponse(
            missing_skills=ordered_skills,
            recommendations=ai_recs,
            total=len(ai_recs),
            source="gemini",
            grouped_counts=_grouped_counts(ai_recs),
        )

    fallback_recs: list[CourseRecommendation] = []
    for group, skills in grouped.items():
        for rec in recommend_courses_for_skills(db, skills, top_k_per_skill).recommendations:
            rec.priority_group = group
            rec.priority_label = PRIORITY_LABELS[group]
            rec.reason = rec.reason or f"Đề xuất fallback theo kỹ năng còn thiếu: {rec.skill_name}"
            fallback_recs.append(rec)

    fallback_recs.sort(key=lambda r: (
        PRIORITY_ORDER.get(r.priority_group or "", 99),
        r.skill_name.lower(),
        -r.similarity_score,
    ))
    _save_skill_gap_cache(db, key, analysis_id, career_name, grouped, owned_skills, "fallback_db_search", fallback_recs)
    return CourseRecommendationsResponse(
        missing_skills=ordered_skills,
        recommendations=fallback_recs,
        total=len(fallback_recs),
        source="fallback_db_search",
        grouped_counts=_grouped_counts(fallback_recs),
    )


def _recommend_with_gemini(
    grouped_skills: dict[str, list[str]],
    career_name: str | None,
    top_k_per_skill: int,
) -> list[CourseRecommendation]:
    api_key = (
        os.getenv("GEMINI_COURSE_API_KEY")
        or os.getenv("GEMINI_API_KEY")
        or os.getenv("GOOGLE_API_KEY")
    )
    if not api_key:
        return []

    prompt = _build_course_discovery_prompt(grouped_skills, career_name, top_k_per_skill)
    try:
        import google.generativeai as genai  # type: ignore
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(_course_gemini_model_name())
        response = model.generate_content(
            prompt,
            generation_config={
                "temperature": 0.15,
                "top_p": 0.6,
                "max_output_tokens": 6000,
            },
        )
        text = getattr(response, "text", "") or ""
    except Exception as exc:
        logger.warning(f"Gemini course discovery failed: {exc}")
        return []

    try:
        payload = _extract_json_object(text)
        raw_courses = payload.get("courses", [])
        if not isinstance(raw_courses, list):
            return []
    except Exception as exc:
        logger.warning(f"Gemini course JSON parse failed: {exc}")
        return []

    valid_skills = {
        _norm_key(skill): (group, skill)
        for group, skills in grouped_skills.items()
        for skill in skills
    }
    recs: list[CourseRecommendation] = []
    seen: set[str] = set()
    per_skill_count: dict[str, int] = {}

    for item in raw_courses:
        if not isinstance(item, dict):
            continue
        skill_raw = _skill_name(item.get("skill_name"))
        skill_key = _norm_key(skill_raw)
        if skill_key not in valid_skills:
            continue
        group, canonical_skill = valid_skills[skill_key]
        if per_skill_count.get(skill_key, 0) >= top_k_per_skill:
            continue

        platform = _clean_platform(str(item.get("platform") or "coursera"))
        title = str(item.get("title") or "").strip()
        if not title or len(title) < 6:
            continue
        url = str(item.get("url") or "").strip()
        if not url.startswith("http") or not _is_trusted_url(url, platform):
            url = _search_url(platform, canonical_skill, title)

        dedupe_key = _norm_key(url or title)
        if dedupe_key in seen:
            continue
        seen.add(dedupe_key)
        per_skill_count[skill_key] = per_skill_count.get(skill_key, 0) + 1

        rating = _safe_float(item.get("rating"), default=0.0, min_value=0.0, max_value=5.0)
        duration = _safe_float(item.get("duration_hrs"), default=None, min_value=0.0, max_value=500.0)
        is_free = bool(item.get("is_free", False))
        price = 0.0 if is_free else _safe_float(item.get("price"), default=0.0, min_value=0.0, max_value=5000.0)
        level = str(item.get("level") or "intermediate").lower()
        if level not in {"beginner", "intermediate", "advanced"}:
            level = "intermediate"

        score = _safe_float(item.get("fit_score"), default=0.86, min_value=0.0, max_value=1.0)
        recs.append(CourseRecommendation(
            course=CourseOut(
                id=0,
                external_id=f"gemini_{platform}_{hashlib.sha1((url + title).encode('utf-8')).hexdigest()[:12]}",
                title=title,
                description=str(item.get("description") or "").strip()[:700] or None,
                url=url,
                platform=platform,
                instructor=str(item.get("provider") or item.get("instructor") or "").strip() or None,
                rating=rating,
                num_reviews=int(_safe_float(item.get("num_reviews"), default=0, min_value=0, max_value=10_000_000) or 0),
                price=price,
                is_free=is_free,
                level=level,
                duration_hrs=duration,
                thumbnail=None,
                language=str(item.get("language") or "en").strip()[:20] or "en",
                tags=[canonical_skill, group, platform],
            ),
            skill_name=canonical_skill,
            similarity_score=round(score, 4),
            relevance_label=relevance_label(score),
            priority_group=group,
            priority_label=PRIORITY_LABELS[group],
            reason=str(item.get("reason") or "").strip()[:350] or f"Phù hợp để bù kỹ năng {canonical_skill}",
            source_quality=str(item.get("source_quality") or "trusted_platform").strip()[:80],
        ))

    recs.sort(key=lambda r: (
        PRIORITY_ORDER.get(r.priority_group or "", 99),
        r.skill_name.lower(),
        -r.similarity_score,
        -(r.course.rating or 0),
    ))
    return recs


def _build_course_discovery_prompt(
    grouped_skills: dict[str, list[str]],
    career_name: str | None,
    top_k_per_skill: int,
) -> str:
    payload = {
        "career_name": career_name or "",
        "top_k_per_skill": top_k_per_skill,
        "skill_groups": grouped_skills,
        "allowed_sources": list(TRUSTED_COURSE_SOURCES.keys()),
    }
    return f"""
You are a strict course recommendation engine for a Vietnamese career skill-gap product.
Return ONLY valid JSON. No markdown, no comments.

Objective:
- Recommend real, useful courses for missing skills from a CV skill-gap analysis.
- Prioritize critical skills first, then important skills, then nice-to-have skills.
- Do NOT recommend anything for skills already owned by the user; input skill_groups already excludes owned skills.
- Use only these 5 trusted sources: Coursera, edX, Udemy, freeCodeCamp, LinkedIn Learning.

Hard validation rules:
1. Each course must directly teach the exact skill_name or a tightly equivalent topic.
2. Do not use blogs, random websites, bootleg mirrors, forums, ads, short social videos, or unsupported platforms.
3. Prefer official professional certificates, specializations, university courses, vendor courses, or widely reviewed courses.
4. For critical skills: prefer structured beginner/intermediate courses with projects or assessments.
5. For important skills: prefer applied courses that produce portfolio evidence.
6. For nice_to_have skills: prefer concise free or low-cost resources when possible.
7. Avoid duplicate URLs and duplicate course titles.
8. If unsure about an exact course URL, provide the platform search URL for that skill on the allowed platform, but keep the title honest as a search/research item.
9. Rating must be 0-5. Use 0 only if unavailable. Do not invent exact ratings when unknown; use conservative estimates.
10. duration_hrs must be numeric hours or null.
11. price must be numeric USD estimate; is_free true implies price 0.
12. fit_score must be 0.70-0.99 and reflect skill relevance, platform quality, rating, project depth, cost, and level fit.
13. reason must be Vietnamese, practical, and explain why this course fixes the gap.

JSON schema:
{{
  "courses": [
    {{
      "skill_name": "exact skill from input",
      "priority_group": "critical|important|nice_to_have",
      "title": "course title",
      "platform": "coursera|edx|udemy|freecodecamp|linkedin learning",
      "provider": "institution/instructor/provider or null",
      "url": "https://...",
      "description": "short factual description",
      "rating": 4.8,
      "num_reviews": 12000,
      "duration_hrs": 90,
      "is_free": false,
      "price": 49,
      "level": "beginner|intermediate|advanced",
      "language": "en|vi|multi",
      "fit_score": 0.92,
      "source_quality": "official|university|vendor|high_review_count|free_practice",
      "reason": "Vietnamese reason"
    }}
  ]
}}

Input:
{json.dumps(payload, ensure_ascii=False)}
"""


def _extract_json_object(text: str) -> dict:
    cleaned = (text or "").strip()
    cleaned = re.sub(r"^```(?:json)?", "", cleaned).strip()
    cleaned = re.sub(r"```$", "", cleaned).strip()
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start < 0 or end < start:
        raise ValueError("No JSON object found")
    return json.loads(cleaned[start:end + 1])


def _safe_float(value, default=None, min_value=None, max_value=None):
    try:
        if value is None or value == "":
            return default
        out = float(value)
        if min_value is not None:
            out = max(min_value, out)
        if max_value is not None:
            out = min(max_value, out)
        return out
    except Exception:
        return default


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
            "url_tpl": TRUSTED_COURSE_SOURCES["coursera"]["search"],
            "platform": "coursera",
            "is_free": False,
            "score": 0.90,
        },
        {
            "name": "edX",
            "url_tpl": TRUSTED_COURSE_SOURCES["edx"]["search"],
            "platform": "edx",
            "is_free": True,
            "score": 0.88,
        },
        {
            "name": "Udemy",
            "url_tpl": TRUSTED_COURSE_SOURCES["udemy"]["search"],
            "platform": "udemy",
            "is_free": False,
            "score": 0.87,
        },
        {
            "name": "freeCodeCamp",
            "url_tpl": TRUSTED_COURSE_SOURCES["freecodecamp"]["search"],
            "platform": "freecodecamp",
            "is_free": True,
            "score": 0.84,
        },
        {
            "name": "LinkedIn Learning",
            "url_tpl": TRUSTED_COURSE_SOURCES["linkedin learning"]["search"],
            "platform": "linkedin learning",
            "is_free": False,
            "score": 0.83,
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
