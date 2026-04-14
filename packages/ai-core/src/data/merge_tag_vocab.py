# src/data/merge_tag_vocab.py
import json
import re
from pathlib import Path

ONET_PATH = Path("data/catalog/onet_tags.json")
ESCO_PATH = Path("data/catalog/esco_tags.json")
OUT_PATH = Path("data/catalog/tag_vocab.json")


def normalize_skill(s: str) -> str:
    s = (s or "").strip().lower()
    return re.sub(r"\s+", " ", s)


def main():
    domains_vi, skills_en = set(), set()

    if ONET_PATH.exists():
        onet = json.loads(ONET_PATH.read_text(encoding="utf-8"))
        for _, info in onet.items():
            d = (info.get("domain_vi") or "").strip()
            if d:
                domains_vi.add(d)
            for sk in info.get("skills_en", []):
                skills_en.add(normalize_skill(sk))
    else:
        print(f"[WARN] Không thấy {ONET_PATH}, bỏ qua O*NET.")

    if ESCO_PATH.exists():
        esco = json.loads(ESCO_PATH.read_text(encoding="utf-8"))
        for _, info in esco.items():
            for sk in info.get("skills_en", []):
                skills_en.add(normalize_skill(sk))
    else:
        print(f"[INFO] Không thấy {ESCO_PATH}, bỏ qua ESCO (không bắt buộc).")

    tag_vocab = {"domains_vi": sorted(domains_vi), "skills_en": sorted(skills_en)}
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(tag_vocab, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[OK] wrote {OUT_PATH} | domains={len(domains_vi)} | skills={len(skills_en)}")


if __name__ == "__main__":
    main()
