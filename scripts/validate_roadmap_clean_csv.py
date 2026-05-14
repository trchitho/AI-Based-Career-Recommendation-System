from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from collections.abc import Sequence
from pathlib import Path
from typing import Any
from urllib.parse import quote, unquote, urlparse

try:
    import requests  # pyright: ignore[reportMissingModuleSource]
except Exception:  # pragma: no cover - requests may be absent in some envs
    requests = None


INPUT_COLUMNS = [
    "roadmap_id",
    "order_no",
    "skill_name",
    "description",
    "estimated_duration",
    "resources_json",
]

OUTPUT_COLUMNS = [
    "roadmap_id",
    "order_no",
    "skill_name",
    "description",
    "estimated_duration",
    "resources_json",
    "level",
]

REJECTED_COLUMNS = [
    "line_no",
    "reason",
    *INPUT_COLUMNS,
]

ALLOWED_DURATIONS = {
    "1 week",
    "2 weeks",
    "2-3 weeks",
    "3 weeks",
    "3-4 weeks",
    "4 weeks",
    "1 month",
}

ALLOWED_TYPES = {
    "course",
    "specialization",
    "professional_certificate",
    "program",
    "course_catalog",
    "learning_path",
    "learning_path_search",
    "course_search",
    "article",
    "documentation",
    "open_courseware",
    "career_resource",
}

ALLOWED_LEVELS = {"beginner", "intermediate", "advanced", "mixed"}
ALLOWED_PRICING = {"free", "paid", "free_trial", "audit_free", "mixed", "unknown"}

REQUIRED_RESOURCE_KEYS = {
    "url",
    "type",
    "title",
    "provider",
    "lang",
    "level",
    "pricing",
    "is_free",
    "is_paid",
    "cost_note_vi",
}

PROVIDER_BY_DOMAIN = {
    "coursera.org": "Coursera",
    "edx.org": "edX",
    "learn.microsoft.com": "Microsoft Learn",
    "khanacademy.org": "Khan Academy",
    "linkedin.com": "LinkedIn Learning",
    "online.hbs.edu": "Harvard Business School Online",
    "skillshop.withgoogle.com": "Google Skillshop",
    "skillbuilder.aws": "AWS Skill Builder",
    "skillsbuild.org": "IBM SkillsBuild",
    "open.edu": "OpenLearn",
    "ocw.mit.edu": "MIT OpenCourseWare",
}

SEARCH_URL_TEMPLATES = {
    "Coursera": "https://www.coursera.org/courses?query={query}",
    "edX": "https://www.edx.org/search?q={query}",
    "Microsoft Learn": "https://learn.microsoft.com/en-us/training/browse/?terms={query}",
    "LinkedIn Learning": "https://www.linkedin.com/learning/search?keywords={query}",
}

DEFAULT_COST_NOTES = {
    "Coursera": "Trang kết quả có cả khóa miễn phí dùng thử/audit và khóa trả phí; kiểm tra từng khóa trước khi học.",
    "edX": "Trang kết quả có cả khóa miễn phí/audit và khóa trả phí; kiểm tra từng khóa trước khi học.",
    "Microsoft Learn": "Microsoft Learn thường miễn phí cho nội dung học; một số chứng chỉ/thi lấy chứng nhận có thể mất phí.",
    "Khan Academy": "Khan Academy cung cấp nội dung học miễn phí.",
    "LinkedIn Learning": "LinkedIn Learning thường cần gói trả phí hoặc dùng thử; kiểm tra quyền truy cập trước khi học.",
    "Harvard Business School Online": "Harvard Business School Online thường là khóa trả phí; kiểm tra học phí tại trang khóa học trước khi đăng ký.",
}

FREE_PROVIDERS = {"Microsoft Learn", "Khan Academy", "Google Skillshop", "OpenLearn", "MIT OpenCourseWare"}
MIXED_PROVIDERS = {"Coursera", "edX", "AWS Skill Builder", "IBM SkillsBuild"}
PAID_OR_TRIAL_PROVIDERS = {"LinkedIn Learning", "Harvard Business School Online"}


@dataclass
class Issue:
    severity: str
    code: str
    message: str
    line_no: int | None = None
    row_key: str | None = None


@dataclass
class Stats:
    input_rows: int = 0
    output_rows: int = 0
    rejected_rows: int = 0
    resources: int = 0
    dirty_url_tokens_before: int = 0
    dirty_url_tokens_after: int = 0
    repaired_resources: int = 0
    provider_counts: dict[str, int] = field(default_factory=dict)
    live_checked: int = 0
    live_ok: int = 0
    live_failed: int = 0
    duplicate_header_rows_skipped: int = 0
    raw_rows_with_dirty_tokens: int = 0
    accepted_roadmaps: int = 0
    rejected_roadmaps: int = 0
    malformed_csv_rows: int = 0
    repaired_malformed_csv_rows: int = 0


@dataclass
class CleanRow:
    line_no: int
    roadmap_id: int
    order_no: int
    skill_name: str
    description: str
    estimated_duration: str
    resources: list[dict[str, Any]]
    level: int

    @property
    def key(self) -> str:
        return f"{self.roadmap_id}:{self.order_no}"

    def to_output_dict(self) -> dict[str, str]:
        return {
            "roadmap_id": str(self.roadmap_id),
            "order_no": str(self.order_no),
            "skill_name": self.skill_name,
            "description": self.description,
            "estimated_duration": self.estimated_duration,
            "resources_json": json.dumps(self.resources, ensure_ascii=False, separators=(",", ":")),
            "level": str(self.level),
        }


class ValidationError(Exception):
    pass


def normalize_header(fieldnames: Sequence[str] | None) -> list[str]:
    if not fieldnames:
        return []
    return [normalize_space(name).strip().lstrip("\ufeff") for name in fieldnames]


def normalize_space(value: Any) -> str:
    text = "" if value is None else str(value)
    text = text.replace("\r", " ").replace("\n", " ").replace("\t", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def clean_plain_text_field(value: Any) -> str:
    text = normalize_space(value)
    text = text.strip('"').strip()
    # GPT/CSV preview glitches often leave fragments such as:
    # Sales analytics,"forecasting... or "Analyze sales...
    text = text.replace(',"', ", ")
    text = text.replace('",', ", ")
    text = text.replace('"', "")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def count_dirty_tokens(text: str) -> int:
    return (
        text.count("%22")
        + text.count("[https://")
        + text.count("[http://")
        + text.count("](")
        + text.count("`")
    )


def strip_markdown_artifacts(value: Any) -> str:
    text = unquote(normalize_space(value))
    text = re.sub(r"\]\(https?://[^)]*\)", "", text)
    text = re.sub(r"\[(https?://[^\]]+)\]", r"\1", text)
    text = text.replace("[", "").replace("]", "")
    text = text.replace("`", "")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def first_plain_url(value: Any) -> str:
    text = normalize_space(value)
    match = re.search(r"https?://[^\s\]\)\"'`]+", text)
    if not match:
        return text.strip("[]() ")
    return match.group(0).rstrip(".,;")


def host_matches(host: str, domain: str) -> bool:
    return host == domain or host.endswith("." + domain)


def provider_from_url(url: str, fallback: str = "") -> str:
    host = urlparse(url).netloc.lower()
    for domain, provider in PROVIDER_BY_DOMAIN.items():
        if host_matches(host, domain):
            return provider
    return normalize_space(fallback) or "Unknown"


def search_url(provider: str, title: str, skill_name: str) -> str:
    query_source = title or skill_name or "career skills"
    query = quote(re.sub(r"\s+", " ", query_source).strip())
    template = SEARCH_URL_TEMPLATES.get(provider) or SEARCH_URL_TEMPLATES["edX"]
    return template.format(query=query)


def infer_type(url: str, provider: str, current_type: str) -> str:
    parsed = urlparse(url)
    lower_url = url.lower()
    if "courses?query=" in lower_url or "/search?" in lower_url:
        return "course_search"
    if "training/browse" in lower_url:
        return "learning_path_search"
    if provider == "Khan Academy":
        return "career_resource"
    if provider in {"MIT OpenCourseWare", "OpenLearn"}:
        return "open_courseware"
    if parsed.path.rstrip("/") in {"", "/courses", "/learn", "/training"}:
        return "course_catalog"
    if current_type in ALLOWED_TYPES:
        return current_type
    return "course"


def infer_pricing(provider: str, current: str) -> tuple[str, bool | None, bool | None, str]:
    pricing = current if current in ALLOWED_PRICING else ""
    if provider in FREE_PROVIDERS:
        return "free", True, False, DEFAULT_COST_NOTES.get(provider, "Nội dung học thường miễn phí; kiểm tra điều kiện sử dụng trên trang nguồn.")
    if provider == "LinkedIn Learning":
        return "free_trial", False, True, DEFAULT_COST_NOTES[provider]
    if provider == "Harvard Business School Online":
        return "paid", False, True, DEFAULT_COST_NOTES[provider]
    if provider in MIXED_PROVIDERS:
        return "mixed", None, None, DEFAULT_COST_NOTES.get(provider, "Trang kết quả có cả lựa chọn miễn phí và trả phí; kiểm tra từng khóa trước khi học.")
    if pricing:
        if pricing == "free":
            return pricing, True, False, "Tài nguyên được ghi nhận là miễn phí; kiểm tra lại điều kiện trên trang nguồn."
        if pricing in {"paid", "free_trial"}:
            return pricing, False, True, "Tài nguyên có thể yêu cầu trả phí hoặc dùng thử; kiểm tra điều kiện trên trang nguồn."
        if pricing == "audit_free":
            return pricing, True, True, "Có thể học/audit miễn phí nhưng chứng chỉ hoặc bài thi có thể mất phí."
        return pricing, None, None, "Chưa xác định chắc chắn chi phí; kiểm tra trên trang nguồn trước khi học."
    return "unknown", None, None, "Chưa xác định chắc chắn chi phí; kiểm tra trên trang nguồn trước khi học."


def clean_resource(raw: Any, line_no: int, resource_index: int, skill_name: str) -> tuple[dict[str, Any], bool]:
    if not isinstance(raw, dict):
        raise ValidationError(f"Line {line_no}: resource {resource_index} is not an object")

    before = json.dumps(raw, ensure_ascii=False, sort_keys=True)

    original_url = normalize_space(raw.get("url"))
    title = strip_markdown_artifacts(raw.get("title")) or f"{skill_name} course search"
    url = first_plain_url(original_url)
    provider = provider_from_url(url, normalize_space(raw.get("provider")))

    # HBS often blocks automated checks and has repeatedly appeared as 403 in local validation.
    # For import data, fallback to edX search unless the URL is explicitly kept by a future script flag.
    provider_changed = False
    if provider in {"Harvard Business School Online", "OpenLearn", "IBM SkillsBuild"}:
        provider = "edX"
        url = search_url(provider, title, skill_name)
        provider_changed = True

    resource_type = infer_type(url, provider, normalize_space(raw.get("type")))
    pricing, is_free, is_paid, cost_note_vi = infer_pricing(provider, normalize_space(raw.get("pricing")))

    cleaned = {
        "url": url,
        "type": resource_type,
        "title": title,
        "provider": provider,
        "lang": normalize_space(raw.get("lang")) or "en",
        "level": normalize_space(raw.get("level")) if normalize_space(raw.get("level")) in ALLOWED_LEVELS else "mixed",
        "pricing": pricing,
        "is_free": is_free,
        "is_paid": is_paid,
        "cost_note_vi": cost_note_vi if provider_changed else (strip_markdown_artifacts(raw.get("cost_note_vi")) or cost_note_vi),
    }

    validate_clean_resource(cleaned, line_no, resource_index)
    after = json.dumps(cleaned, ensure_ascii=False, sort_keys=True)
    return cleaned, before != after


def validate_clean_resource(resource: dict[str, Any], line_no: int, resource_index: int) -> None:
    missing = REQUIRED_RESOURCE_KEYS - set(resource)
    if missing:
        raise ValidationError(f"Line {line_no}: resource {resource_index} missing keys: {sorted(missing)}")

    url = resource["url"]
    if not isinstance(url, str) or not url.startswith(("https://", "http://")):
        raise ValidationError(f"Line {line_no}: resource {resource_index} has invalid URL: {url!r}")
    forbidden = ["%22", "[", "]", "(", ")", "`", "\n", "\r", "\t"]
    bad_tokens = [token for token in forbidden if token in url]
    if bad_tokens:
        raise ValidationError(f"Line {line_no}: resource {resource_index} URL has forbidden tokens {bad_tokens}: {url!r}")

    if resource["type"] not in ALLOWED_TYPES:
        raise ValidationError(f"Line {line_no}: resource {resource_index} has invalid type: {resource['type']!r}")
    if resource["level"] not in ALLOWED_LEVELS:
        raise ValidationError(f"Line {line_no}: resource {resource_index} has invalid level: {resource['level']!r}")
    if resource["pricing"] not in ALLOWED_PRICING:
        raise ValidationError(f"Line {line_no}: resource {resource_index} has invalid pricing: {resource['pricing']!r}")
    if not isinstance(resource["title"], str) or not resource["title"].strip():
        raise ValidationError(f"Line {line_no}: resource {resource_index} has empty title")
    if any(mark in resource["title"] for mark in ["[", "](", "%22", "\n", "\r"]):
        raise ValidationError(f"Line {line_no}: resource {resource_index} title still has markdown/corrupt tokens")
    if not isinstance(resource["provider"], str) or not resource["provider"].strip():
        raise ValidationError(f"Line {line_no}: resource {resource_index} has empty provider")
    if resource["is_free"] is not None and not isinstance(resource["is_free"], bool):
        raise ValidationError(f"Line {line_no}: resource {resource_index} is_free must be bool or null")
    if resource["is_paid"] is not None and not isinstance(resource["is_paid"], bool):
        raise ValidationError(f"Line {line_no}: resource {resource_index} is_paid must be bool or null")


def parse_resources(raw_json: str, line_no: int, skill_name: str) -> tuple[list[dict[str, Any]], int, int]:
    raw_json = normalize_space(raw_json)
    dirty_before = count_dirty_tokens(raw_json)
    try:
        parsed = json.loads(raw_json)
    except json.JSONDecodeError as exc:
        raise ValidationError(f"Line {line_no}: resources_json is not valid JSON after CSV parse: {exc}") from exc

    if not isinstance(parsed, list):
        raise ValidationError(f"Line {line_no}: resources_json must be a JSON array")
    if len(parsed) != 2:
        raise ValidationError(f"Line {line_no}: resources_json must contain exactly 2 resources, got {len(parsed)}")

    cleaned: list[dict[str, Any]] = []
    repaired = 0
    for idx, resource in enumerate(parsed, 1):
        clean, was_repaired = clean_resource(resource, line_no, idx, skill_name)
        cleaned.append(clean)
        repaired += int(was_repaired)

    dirty_after = count_dirty_tokens(json.dumps(cleaned, ensure_ascii=False))
    if dirty_after:
        raise ValidationError(f"Line {line_no}: resources_json still has dirty tokens after cleaning")

    return cleaned, dirty_before, repaired


def parse_positive_int(value: str, field_name: str, line_no: int) -> int:
    text = normalize_space(value)
    if not re.fullmatch(r"\d+", text):
        raise ValidationError(f"Line {line_no}: {field_name} must be a positive integer, got {value!r}")
    number = int(text)
    if number <= 0:
        raise ValidationError(f"Line {line_no}: {field_name} must be > 0, got {number}")
    return number


def clean_row(
    raw: dict[str, Any],
    line_no: int,
    default_level: int,
    min_roadmap_id: int | None,
    max_roadmap_id: int | None,
) -> tuple[CleanRow, int, int]:
    roadmap_id = parse_positive_int(raw["roadmap_id"], "roadmap_id", line_no)
    order_no = parse_positive_int(raw["order_no"], "order_no", line_no)
    if min_roadmap_id is not None and roadmap_id < min_roadmap_id:
        raise ValidationError(f"Line {line_no}: roadmap_id={roadmap_id} is below minimum {min_roadmap_id}")
    if max_roadmap_id is not None and roadmap_id > max_roadmap_id:
        raise ValidationError(f"Line {line_no}: roadmap_id={roadmap_id} is above maximum {max_roadmap_id}")
    skill_name = clean_plain_text_field(raw["skill_name"])
    description = clean_plain_text_field(raw["description"])
    duration = normalize_space(raw["estimated_duration"]).strip('"')
    if not skill_name:
        raise ValidationError(f"Line {line_no}: skill_name is empty")
    if not description:
        raise ValidationError(f"Line {line_no}: description is empty")
    if duration not in ALLOWED_DURATIONS:
        raise ValidationError(f"Line {line_no}: estimated_duration is not allowed: {duration!r}")

    resources, dirty_before, repaired = parse_resources(raw["resources_json"], line_no, skill_name)
    return (
        CleanRow(
            line_no=line_no,
            roadmap_id=roadmap_id,
            order_no=order_no,
            skill_name=skill_name,
            description=description,
            estimated_duration=duration,
            resources=resources,
            level=default_level,
        ),
        dirty_before,
        repaired,
    )


def repair_extra_column_row(raw: dict[str, Any], fieldnames: list[str], line_no: int) -> dict[str, Any] | None:
    """Repair rows where an unquoted comma split the description field.

    Expected broken shape:
    roadmap_id,order_no,skill_name,<description parts...>,estimated_duration,resources_json
    """
    values = [raw.get(name, "") for name in fieldnames]
    values.extend(raw.get(None) or [])
    values = ["" if value is None else str(value) for value in values]

    if len(values) <= len(INPUT_COLUMNS):
        return None

    duration_index: int | None = None
    for idx in range(3, len(values)):
        if normalize_space(values[idx]).strip('"') in ALLOWED_DURATIONS:
            duration_index = idx
            break
    if duration_index is None or duration_index <= 3 or duration_index >= len(values) - 1:
        return None

    description = ", ".join(normalize_space(part) for part in values[3:duration_index] if normalize_space(part))
    resources_json = ",".join(values[duration_index + 1 :]).strip()
    if not description or not resources_json:
        return None

    repaired = {
        "roadmap_id": values[0],
        "order_no": values[1],
        "skill_name": values[2],
        "description": description,
        "estimated_duration": values[duration_index],
        "resources_json": resources_json,
        "_line_no": line_no,
        "_csv_repaired": True,
    }
    return repaired


def read_input(path: Path) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[Issue], int, int]:
    issues: list[Issue] = []
    rows: list[dict[str, Any]] = []
    malformed_rows: list[dict[str, Any]] = []
    duplicate_header_rows = 0
    repaired_malformed_rows = 0
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle, skipinitialspace=True)
        normalized = normalize_header(reader.fieldnames)
        if normalized != INPUT_COLUMNS:
            issues.append(
                Issue(
                    "warning",
                    "HEADER_NORMALIZED",
                    f"Header normalized from {reader.fieldnames!r} to {normalized!r}",
                    line_no=1,
                )
            )
        if normalized != INPUT_COLUMNS:
            raise ValidationError(f"Unexpected header after normalization: {normalized!r}. Expected {INPUT_COLUMNS!r}")

        for line_no, raw in enumerate(reader, start=2):
            if raw.get(None):
                repaired = repair_extra_column_row(raw, reader.fieldnames or [], line_no)
                if repaired is not None:
                    repaired_malformed_rows += 1
                    rows.append(repaired)
                    issues.append(
                        Issue(
                            "warning",
                            "CSV_EXTRA_COLUMNS_REPAIRED",
                            "CSV extra columns repaired by joining split description fields",
                            line_no,
                        )
                    )
                    continue
                row = {canonical: raw.get(source, "") for canonical, source in zip(INPUT_COLUMNS, reader.fieldnames or [])}
                row["_line_no"] = line_no
                row["_extra_columns"] = raw.get(None)
                malformed_rows.append(row)
                issues.append(
                    Issue(
                        "error",
                        "CSV_EXTRA_COLUMNS",
                        "CSV has extra columns; quote escaping is broken, usually because a comma field was not quoted",
                        line_no,
                    )
                )
                continue
            row = {canonical: raw[source] for canonical, source in zip(INPUT_COLUMNS, reader.fieldnames or [])}
            if [normalize_space(row[column]) for column in INPUT_COLUMNS] == INPUT_COLUMNS:
                duplicate_header_rows += 1
                issues.append(
                    Issue(
                        "warning",
                        "DUPLICATE_HEADER_ROW_SKIPPED",
                        "Duplicate CSV header row skipped",
                        line_no=line_no,
                    )
                )
                continue
            row["_line_no"] = line_no
            rows.append(row)
    return rows, malformed_rows, issues, duplicate_header_rows, repaired_malformed_rows


def enforce_sequence(
    rows: list[CleanRow],
    start_order: int,
    min_milestones_per_roadmap: int,
) -> tuple[list[CleanRow], list[tuple[CleanRow, str]], list[Issue]]:
    accepted: list[CleanRow] = []
    rejected: list[tuple[CleanRow, str]] = []
    issues: list[Issue] = []
    seen_keys: set[tuple[int, int]] = set()
    current_roadmap_id: int | None = None
    expected_order = start_order
    closed_roadmaps: set[int] = set()

    for row in rows:
        key = (row.roadmap_id, row.order_no)
        if key in seen_keys:
            reason = f"Duplicate roadmap_id/order_no pair {row.key}"
            rejected.append((row, reason))
            issues.append(Issue("error", "DUPLICATE_ROW_KEY", reason, row.line_no, row.key))
            continue

        if current_roadmap_id is None:
            if row.order_no != start_order:
                reason = f"First roadmap {row.roadmap_id} must start at order_no={start_order}, got {row.order_no}"
                rejected.append((row, reason))
                issues.append(Issue("error", "FIRST_ORDER_NOT_EXPECTED", reason, row.line_no, row.key))
                continue
            current_roadmap_id = row.roadmap_id
            expected_order = start_order

        if row.roadmap_id == current_roadmap_id:
            if row.order_no != expected_order:
                reason = f"Expected order_no={expected_order} for roadmap_id={row.roadmap_id}, got {row.order_no}"
                rejected.append((row, reason))
                issues.append(Issue("error", "ORDER_SEQUENCE_BREAK", reason, row.line_no, row.key))
                continue
        elif row.roadmap_id > current_roadmap_id:
            if row.order_no != start_order:
                reason = (
                    f"New roadmap_id={row.roadmap_id} appears with order_no={row.order_no}; "
                    f"new roadmap blocks must start at order_no={start_order}. This is likely a row from another batch."
                )
                rejected.append((row, reason))
                issues.append(Issue("error", "FOREIGN_ROADMAP_ROW", reason, row.line_no, row.key))
                continue
            current_count = sum(1 for accepted_row in accepted if accepted_row.roadmap_id == current_roadmap_id)
            if current_count < min_milestones_per_roadmap:
                reason = (
                    f"roadmap_id={current_roadmap_id} has only {current_count} accepted milestones; "
                    f"minimum required is {min_milestones_per_roadmap}"
                )
                issues.append(Issue("error", "ROADMAP_TOO_FEW_MILESTONES", reason, row.line_no, str(current_roadmap_id)))
            closed_roadmaps.add(current_roadmap_id)
            current_roadmap_id = row.roadmap_id
            expected_order = start_order
        else:
            reason = f"roadmap_id decreased from {current_roadmap_id} to {row.roadmap_id}; input order is not production-stable"
            rejected.append((row, reason))
            issues.append(Issue("error", "ROADMAP_ID_DECREASED", reason, row.line_no, row.key))
            continue

        if row.roadmap_id in closed_roadmaps:
            reason = f"roadmap_id={row.roadmap_id} appears again after being closed"
            rejected.append((row, reason))
            issues.append(Issue("error", "ROADMAP_REOPENED", reason, row.line_no, row.key))
            continue

        accepted.append(row)
        seen_keys.add(key)
        expected_order = row.order_no + 1

    if current_roadmap_id is not None:
        current_count = sum(1 for accepted_row in accepted if accepted_row.roadmap_id == current_roadmap_id)
        if current_count < min_milestones_per_roadmap:
            reason = (
                f"roadmap_id={current_roadmap_id} has only {current_count} accepted milestones; "
                f"minimum required is {min_milestones_per_roadmap}"
            )
            issues.append(Issue("error", "ROADMAP_TOO_FEW_MILESTONES", reason, None, str(current_roadmap_id)))

    too_short_roadmaps = {
        roadmap_id
        for roadmap_id in {row.roadmap_id for row in accepted}
        if sum(1 for row in accepted if row.roadmap_id == roadmap_id) < min_milestones_per_roadmap
    }
    if too_short_roadmaps:
        kept: list[CleanRow] = []
        for row in accepted:
            if row.roadmap_id in too_short_roadmaps:
                count = sum(1 for candidate in accepted if candidate.roadmap_id == row.roadmap_id)
                reason = (
                    f"roadmap_id={row.roadmap_id} has only {count} accepted milestones; "
                    f"minimum required is {min_milestones_per_roadmap}"
                )
                rejected.append((row, reason))
            else:
                kept.append(row)
        accepted = kept

    return accepted, rejected, issues


def write_csv(path: Path, fieldnames: list[str], rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, lineterminator="\n", quoting=csv.QUOTE_MINIMAL)
        writer.writeheader()
        writer.writerows(rows)


def write_rejected(path: Path, rejected: list[tuple[CleanRow | dict[str, Any], str]]) -> None:
    serialised: list[dict[str, Any]] = []
    for row, reason in rejected:
        if isinstance(row, CleanRow):
            serialised.append(
                {
                    "line_no": row.line_no,
                    "reason": reason,
                    "roadmap_id": row.roadmap_id,
                    "order_no": row.order_no,
                    "skill_name": row.skill_name,
                    "description": row.description,
                    "estimated_duration": row.estimated_duration,
                    "resources_json": json.dumps(row.resources, ensure_ascii=False, separators=(",", ":")),
                }
            )
        else:
            serialised.append(
                {
                    "line_no": row.get("_line_no", ""),
                    "reason": reason,
                    **{column: row.get(column, "") for column in INPUT_COLUMNS},
                }
            )
    write_csv(path, REJECTED_COLUMNS, serialised)


def build_roadmap_block_summary(rows: list[CleanRow], start_order: int = 1) -> list[dict[str, Any]]:
    grouped: dict[int, list[int]] = {}
    for row in rows:
        grouped.setdefault(row.roadmap_id, []).append(row.order_no)
    summary: list[dict[str, Any]] = []
    for roadmap_id in sorted(grouped):
        orders = sorted(grouped[roadmap_id])
        expected = list(range(start_order, max(orders) + 1)) if orders else []
        missing = [order for order in expected if order not in set(orders)]
        summary.append(
            {
                "roadmap_id": roadmap_id,
                "orders": orders,
                "count": len(orders),
                "starts_at_expected_order": bool(orders and orders[0] == start_order),
                "expected_start_order": start_order,
                "missing_orders": missing,
            }
        )
    return summary


def maybe_live_check(
    rows: list[CleanRow],
    mode: str,
    timeout: float,
    workers: int,
    issues: list[Issue],
    stats: Stats,
) -> None:
    if mode == "none":
        return
    requests_client = requests
    if requests_client is None:
        issues.append(Issue("warning", "REQUESTS_UNAVAILABLE", "requests is not installed; live URL checks skipped"))
        return

    resources: list[tuple[CleanRow, dict[str, Any]]] = [(row, resource) for row in rows for resource in row.resources]
    if mode == "sample":
        resources = resources[: min(20, len(resources))]

    headers = {"User-Agent": "Mozilla/5.0 RoadmapValidator/1.0"}

    def check_one(row: CleanRow, resource: dict[str, Any]) -> tuple[CleanRow, str, int | None, str | None]:
        url = resource["url"]
        try:
            response = requests_client.get(url, headers=headers, timeout=timeout, allow_redirects=True)
            return row, url, response.status_code, None
        except Exception as exc:
            return row, url, None, str(exc)

    with ThreadPoolExecutor(max_workers=max(1, workers)) as executor:
        futures = [executor.submit(check_one, row, resource) for row, resource in resources]
        for future in as_completed(futures):
            row, url, status_code, error = future.result()
            stats.live_checked += 1
            if error is not None:
                stats.live_failed += 1
                issues.append(
                    Issue(
                        "error",
                        "URL_LIVE_CHECK_ERROR",
                        f"URL check error for {url}: {error}",
                        row.line_no,
                        row.key,
                    )
                )
            elif status_code is not None and 200 <= status_code < 400:
                stats.live_ok += 1
            else:
                stats.live_failed += 1
                issues.append(
                    Issue(
                        "error",
                        "URL_LIVE_CHECK_FAILED",
                        f"URL returned HTTP {status_code}: {url}",
                        row.line_no,
                        row.key,
                    )
                )


def validate_output_file(path: Path) -> tuple[int, int]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames != OUTPUT_COLUMNS:
            raise ValidationError(f"Output header is invalid: {reader.fieldnames!r}")
        rows = 0
        resources = 0
        for line_no, row in enumerate(reader, start=2):
            if row.get(None):
                raise ValidationError(f"Output line {line_no}: has extra columns")
            parsed = json.loads(row["resources_json"])
            if not isinstance(parsed, list) or len(parsed) != 2:
                raise ValidationError(f"Output line {line_no}: resources_json is invalid")
            rows += 1
            resources += len(parsed)
    return rows, resources


def run(args: argparse.Namespace) -> int:
    input_path = Path(args.input)
    output_path = Path(args.output)
    report_path = Path(args.report) if args.report else output_path.with_suffix(".report.json")
    rejected_path = Path(args.rejected) if args.rejected else output_path.with_suffix(".rejected.csv")

    issues: list[Issue] = []
    stats = Stats()
    rejected_raw: list[tuple[dict[str, Any], str]] = []

    raw_rows, malformed_rows, header_issues, duplicate_header_rows, repaired_malformed_rows = read_input(input_path)
    issues.extend(header_issues)
    stats.input_rows = len(raw_rows) + len(malformed_rows)
    stats.malformed_csv_rows = len(malformed_rows)
    stats.repaired_malformed_csv_rows = repaired_malformed_rows
    stats.duplicate_header_rows_skipped = duplicate_header_rows
    for malformed in malformed_rows:
        rejected_raw.append(
            (
                malformed,
                "CSV has extra columns; quote escaping is broken, usually because a comma field was not quoted",
            )
        )

    clean_rows: list[CleanRow] = []
    for raw in raw_rows:
        line_no = int(raw["_line_no"])
        raw_resource_text = normalize_space(raw.get("resources_json", ""))
        if count_dirty_tokens(raw_resource_text):
            stats.raw_rows_with_dirty_tokens += 1
        try:
            clean, dirty_before, repaired = clean_row(raw, line_no, args.level, args.min_roadmap_id, args.max_roadmap_id)
            stats.dirty_url_tokens_before += dirty_before
            stats.repaired_resources += repaired
            clean_rows.append(clean)
        except ValidationError as exc:
            rejected_raw.append((raw, str(exc)))
            issues.append(Issue("error", "ROW_VALIDATION_FAILED", str(exc), line_no))

    accepted, rejected_sequence, sequence_issues = enforce_sequence(clean_rows, args.start_order, args.min_milestones_per_roadmap)
    issues.extend(sequence_issues)
    stats.accepted_roadmaps = len({row.roadmap_id for row in accepted})
    stats.rejected_roadmaps = len({row.roadmap_id for row, _ in rejected_sequence if isinstance(row, CleanRow)})

    if stats.accepted_roadmaps > args.max_roadmaps:
        issues.append(
            Issue(
                "error",
                "TOO_MANY_ROADMAPS_FOR_BATCH",
                f"Accepted roadmap count {stats.accepted_roadmaps} exceeds max batch size {args.max_roadmaps}",
            )
        )

    maybe_live_check(accepted, args.live_check, args.timeout, args.live_workers, issues, stats)
    if args.live_check == "all" and stats.live_failed and not args.allow_live_failures:
        for row in accepted:
            pass

    write_rejected(rejected_path, [*rejected_raw, *rejected_sequence])

    output_rows = [row.to_output_dict() for row in accepted]
    if output_rows or args.allow_empty_output:
        write_csv(output_path, OUTPUT_COLUMNS, output_rows)
        rows_after, resources_after = validate_output_file(output_path)
    else:
        issues.append(
            Issue(
                "warning",
                "OUTPUT_NOT_WRITTEN_EMPTY_ACCEPTED_SET",
                f"No accepted rows; existing output file was left unchanged: {output_path}",
            )
        )
        rows_after, resources_after = 0, 0

    stats.output_rows = rows_after
    stats.rejected_rows = len(rejected_raw) + len(rejected_sequence)
    stats.resources = resources_after

    for row in accepted:
        for resource in row.resources:
            provider = resource["provider"]
            stats.provider_counts[provider] = stats.provider_counts.get(provider, 0) + 1
            stats.dirty_url_tokens_after += count_dirty_tokens(json.dumps(resource, ensure_ascii=False))

    report = {
        "input": str(input_path),
        "output": str(output_path),
        "rejected": str(rejected_path),
        "stats": {
            "input_rows": stats.input_rows,
            "output_rows": stats.output_rows,
            "rejected_rows": stats.rejected_rows,
            "resources": stats.resources,
            "dirty_url_tokens_before": stats.dirty_url_tokens_before,
            "dirty_url_tokens_after": stats.dirty_url_tokens_after,
            "repaired_resources": stats.repaired_resources,
            "provider_counts": dict(sorted(stats.provider_counts.items())),
            "live_checked": stats.live_checked,
            "live_ok": stats.live_ok,
            "live_failed": stats.live_failed,
            "duplicate_header_rows_skipped": stats.duplicate_header_rows_skipped,
            "raw_rows_with_dirty_tokens": stats.raw_rows_with_dirty_tokens,
            "accepted_roadmaps": stats.accepted_roadmaps,
            "rejected_roadmaps": stats.rejected_roadmaps,
            "malformed_csv_rows": stats.malformed_csv_rows,
            "repaired_malformed_csv_rows": stats.repaired_malformed_csv_rows,
            "start_order": args.start_order,
            "min_roadmap_id": args.min_roadmap_id,
            "max_roadmap_id": args.max_roadmap_id,
            "min_milestones_per_roadmap": args.min_milestones_per_roadmap,
        },
        "accepted_roadmap_blocks": build_roadmap_block_summary(accepted, args.start_order),
        "rejected_roadmap_blocks": build_roadmap_block_summary([row for row, _ in rejected_sequence if isinstance(row, CleanRow)], args.start_order),
        "issues": [issue.__dict__ for issue in issues],
    }
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print(json.dumps(report["stats"] | {"output": str(output_path), "report": str(report_path), "rejected": str(rejected_path)}, ensure_ascii=False, indent=2))

    fatal_issues = [
        issue
        for issue in issues
        if issue.severity == "error" and not (issue.code == "URL_LIVE_CHECK_FAILED" and args.allow_live_failures)
    ]
    return 1 if fatal_issues and args.fail_on_rejected else 0


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Strictly validate and normalize Roadmap-clean.csv into an import-ready "
            "Roadmap-Final.csv for core.roadmap_milestones."
        )
    )
    parser.add_argument("--input", default=r"E:\OneDrive\Desktop\test1\AI-Based-Career-Recommendation-System\Roadmap-clean.csv")
    parser.add_argument("--output", default=r"E:\OneDrive\Desktop\test1\AI-Based-Career-Recommendation-System\Roadmap-Final.csv")
    parser.add_argument("--report", default=None)
    parser.add_argument("--rejected", default=None)
    parser.add_argument("--level", type=int, default=1)
    parser.add_argument(
        "--start-order",
        type=int,
        default=1,
        help="Required first order_no for each roadmap block. Default is 1.",
    )
    parser.add_argument("--min-roadmap-id", type=int, default=501)
    parser.add_argument("--max-roadmap-id", type=int, default=959)
    parser.add_argument("--min-milestones-per-roadmap", type=int, default=4)
    parser.add_argument("--live-check", choices=["none", "sample", "all"], default="sample")
    parser.add_argument("--live-workers", type=int, default=12)
    parser.add_argument("--max-roadmaps", type=int, default=100)
    parser.add_argument("--timeout", type=float, default=12.0)
    parser.add_argument("--allow-live-failures", action="store_true")
    parser.add_argument(
        "--allow-empty-output",
        action="store_true",
        help="Allow overwriting the output CSV with only the header when every input row is rejected.",
    )
    parser.add_argument(
        "--fail-on-rejected",
        action="store_true",
        help="Exit non-zero when rows are rejected. The output and report are still written.",
    )
    return parser


def main() -> None:
    parser = build_arg_parser()
    args = parser.parse_args()
    try:
        raise SystemExit(run(args))
    except ValidationError as exc:
        print(json.dumps({"fatal": str(exc)}, ensure_ascii=False, indent=2), file=sys.stderr)
        raise SystemExit(2)


if __name__ == "__main__":
    main()
