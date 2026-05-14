from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path
from urllib.parse import quote, unquote


EXPECTED_COLUMNS = [
    "roadmap_id",
    "order_no",
    "skill_name",
    "description",
    "estimated_duration",
    "resources_json",
]

OUTPUT_COLUMNS = [*EXPECTED_COLUMNS, "level"]


def _first_plain_url(value: str) -> str:
    text = str(value or "").strip()
    match = re.search(r"https?://[^\s\]\)\"']+", text)
    if not match:
        return text.strip("[]() ")
    return match.group(0).rstrip(".,;")


def _strip_markdown_artifacts(value: str) -> str:
    text = unquote(str(value or ""))
    text = re.sub(r"\]\(https?://[^)]*\)", "", text)
    text = re.sub(r"\[(https?://[^\]]+)\]", r"\1", text)
    text = text.replace("[", "").replace("]", "")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _clean_resource(resource: dict) -> dict:
    cleaned = dict(resource)
    cleaned["url"] = _first_plain_url(cleaned.get("url", ""))
    cleaned["title"] = _strip_markdown_artifacts(cleaned.get("title", ""))
    cleaned["provider"] = _strip_markdown_artifacts(cleaned.get("provider", ""))
    cleaned["cost_note_vi"] = _strip_markdown_artifacts(cleaned.get("cost_note_vi", ""))
    if "online.hbs.edu" in cleaned["url"]:
        query = quote(cleaned["title"] or "business management")
        cleaned.update(
            {
                "url": f"https://www.edx.org/search?q={query}",
                "type": "course_search",
                "provider": "edX",
                "level": "mixed",
                "pricing": "mixed",
                "is_free": None,
                "is_paid": None,
                "cost_note_vi": "Trang kết quả có cả khóa miễn phí/audit và khóa trả phí; kiểm tra từng khóa trước khi học.",
            }
        )
    return cleaned


def _clean_resources_json(value: str, line_no: int) -> str:
    try:
        resources = json.loads(value)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Line {line_no}: resources_json is not valid JSON: {exc}") from exc

    if not isinstance(resources, list):
        raise ValueError(f"Line {line_no}: resources_json must be a JSON array")

    cleaned = [_clean_resource(item) for item in resources]
    for idx, item in enumerate(cleaned, 1):
        url = item.get("url", "")
        if not isinstance(item, dict) or not url.startswith(("http://", "https://")):
            raise ValueError(f"Line {line_no}: resource {idx} has invalid url: {url!r}")
        if any(token in url for token in ["%22", "[", "]", "(", ")"]):
            raise ValueError(f"Line {line_no}: resource {idx} still has dirty url: {url!r}")

    return json.dumps(cleaned, ensure_ascii=False, separators=(",", ":"))


def prepare(input_path: Path, output_path: Path, default_level: int) -> dict[str, int]:
    stats = {
        "rows": 0,
        "resources": 0,
        "dirty_urls_before": 0,
        "dirty_urls_after": 0,
    }

    with input_path.open("r", encoding="utf-8-sig", newline="") as src:
        reader = csv.DictReader(src)
        if reader.fieldnames != EXPECTED_COLUMNS:
            raise ValueError(
                f"Unexpected CSV header: {reader.fieldnames!r}. Expected: {EXPECTED_COLUMNS!r}"
            )

        output_path.parent.mkdir(parents=True, exist_ok=True)
        with output_path.open("w", encoding="utf-8", newline="") as dst:
            writer = csv.DictWriter(dst, fieldnames=OUTPUT_COLUMNS, quoting=csv.QUOTE_MINIMAL)
            writer.writeheader()

            for line_no, row in enumerate(reader, start=2):
                raw_resources = row["resources_json"]
                stats["dirty_urls_before"] += raw_resources.count("%22")
                stats["dirty_urls_before"] += raw_resources.count("[https://")
                stats["dirty_urls_before"] += raw_resources.count("](")

                row["resources_json"] = _clean_resources_json(raw_resources, line_no)
                row["level"] = str(default_level)

                stats["dirty_urls_after"] += row["resources_json"].count("%22")
                stats["dirty_urls_after"] += row["resources_json"].count("[https://")
                stats["dirty_urls_after"] += row["resources_json"].count("](")
                stats["resources"] += len(json.loads(row["resources_json"]))
                stats["rows"] += 1

                writer.writerow(row)

    return stats


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Add level column and clean markdown-corrupted resources_json for core.roadmap_milestones imports."
    )
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--level", default=1, type=int)
    args = parser.parse_args()

    stats = prepare(args.input, args.output, args.level)
    print(json.dumps({"output": str(args.output), **stats}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
