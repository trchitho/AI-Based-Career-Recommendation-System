import argparse
import json
from pathlib import Path

from app.core.db import engine
from app.modules.assessments.models import AssessmentForm, AssessmentQuestion
from app.modules.content.models import Career, CareerKSA
from sqlalchemy.orm import sessionmaker


def seed_careers(session, careers_file: Path):
    data = json.loads(careers_file.read_text(encoding="utf-8"))
    for c in data:
        slug = c.get("slug")
        if not slug:
            continue
        exists = session.query(Career).filter(Career.slug == slug).first()
        if exists:
            continue
        obj = Career(
            slug=slug,
            title_vi=c.get("title") or slug.replace("-", " ").title(),
            short_desc_vn=c.get("short_desc_vn") or c.get("short_desc") or None,
            short_desc_en=c.get("short_desc_en") or None,
            onet_code=c.get("onet_code"),
        )
        session.add(obj)
    session.commit()


def seed_ksas(session, ksas_file: Path):
    data = json.loads(ksas_file.read_text(encoding="utf-8"))
    for k in data:
        obj = CareerKSA(
            onet_code=k.get("onet_code") or "custom",
            ksa_type=k.get("ksa_type") or "skill",
            name=k.get("name"),
            category=k.get("category"),
            level=k.get("level"),
            importance=k.get("importance"),
            source=k.get("source") or "custom",
        )
        session.add(obj)
    session.commit()


def seed_form(session, form_file: Path):
    data = json.loads(form_file.read_text(encoding="utf-8"))
    code = data["code"]
    form = session.query(AssessmentForm).filter(AssessmentForm.code == code).first()
    if not form:
        form = AssessmentForm(
            code=code,
            title=data.get("title"),
            form_type=data.get("form_type"),
            lang=data.get("lang", "vi"),
            version=data.get("version", "v1"),
        )
        session.add(form)
        session.flush()
    # add questions
    for q in data.get("questions", []):
        session.add(
            AssessmentQuestion(
                form_id=form.id,
                question_no=q.get("question_no"),
                question_key=q.get("question_key"),
                prompt=q.get("prompt"),
                options_json=q.get("options_json"),
                reverse_score=bool(q.get("reverse_score")),
            )
        )
    session.commit()


def main():
    ap = argparse.ArgumentParser(description="Seed bulk data into DB from JSON files")
    ap.add_argument("--careers", type=Path, help="JSON file list of careers")
    ap.add_argument("--ksas", type=Path, help="JSON file list of KSAs")
    ap.add_argument("--form", type=Path, help="JSON file of an assessment form + questions")
    args = ap.parse_args()

    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    session = Session()
    try:
        if args.careers and args.careers.exists():
            seed_careers(session, args.careers)
        if args.ksas and args.ksas.exists():
            seed_ksas(session, args.ksas)
        if args.form and args.form.exists():
            seed_form(session, args.form)
        print("Seed completed")
    finally:
        session.close()


if __name__ == "__main__":
    main()
