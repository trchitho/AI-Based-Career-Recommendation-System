"""Add soft skills to relevant mentors so they match users with communication/writing desired skills."""
import sys; sys.path.insert(0, '.')
from dotenv import load_dotenv; load_dotenv('.env')
from app.core.db import SessionLocal
from app.modules.mentor_matching.models import MentorProfile

SOFT_SKILLS_TO_ADD = ["Writing", "Reading Comprehension", "Persuasion", "Communication", "Negotiation"]
TEACHING_SKILLS = ["Teaching", "Curriculum Design", "Academic Research", "Writing", "Reading Comprehension"]
SALES_SKILLS = ["Persuasion", "Negotiation", "Communication", "Writing", "Sales Strategy"]
SOCIAL_SKILLS = ["Communication", "Writing", "Reading Comprehension", "Counseling", "Persuasion"]

# Groups that naturally have these soft skills
SKILL_ADDITIONS = {
    "education": TEACHING_SKILLS,
    "community-social": SOCIAL_SKILLS,
    "legal": ["Writing", "Reading Comprehension", "Persuasion", "Negotiation", "Analytical Thinking"],
    "sales": SALES_SKILLS,
    "arts-media": ["Writing", "Communication", "Persuasion", "Copywriting", "Content Strategy"],
    "management": ["Writing", "Communication", "Persuasion", "Negotiation", "Leadership"],
    "business-finance": ["Writing", "Reading Comprehension", "Analytical Thinking", "Communication"],
}

db = SessionLocal()
updated = 0
try:
    for group, extra_skills in SKILL_ADDITIONS.items():
        # Find mentors from this group by email pattern
        from app.modules.auth.models import User
        users = db.query(User).filter(User.email.like(f"mentor.{group.replace('-','_')}%")).all()
        for user in users:
            mentor = db.query(MentorProfile).filter(MentorProfile.user_id == user.id).first()
            if mentor and mentor.expertise_areas:
                new_skills = list(mentor.expertise_areas)
                for skill in extra_skills:
                    if skill not in new_skills:
                        new_skills.append(skill)
                mentor.expertise_areas = new_skills
                updated += 1

    db.commit()
    print(f"Updated {updated} mentor profiles with soft skills")
finally:
    db.close()
