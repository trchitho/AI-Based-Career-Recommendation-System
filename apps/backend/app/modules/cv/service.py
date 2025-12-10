from sqlalchemy.orm import Session
from typing import List, Optional
from app.modules.cv.models import CV
from app.modules.cv.schemas import CVCreate, CVUpdate


class CVService:
    @staticmethod
    def get_user_cvs(db: Session, user_id: int) -> List[CV]:
        """Get all CVs for a user"""
        return db.query(CV).filter(CV.user_id == user_id).order_by(CV.updated_at.desc()).all()

    @staticmethod
    def get_cv_by_id(db: Session, cv_id: int, user_id: int) -> Optional[CV]:
        """Get a specific CV by ID (only if it belongs to the user)"""
        return db.query(CV).filter(CV.id == cv_id, CV.user_id == user_id).first()

    @staticmethod
    def create_cv(db: Session, user_id: int, cv_data: CVCreate) -> CV:
        """Create a new CV"""
        cv = CV(
            user_id=user_id,
            title=cv_data.title,
            template=cv_data.template,
            personal_info=cv_data.personalInfo.model_dump(),
            education=[edu.model_dump() for edu in cv_data.education],
            experience=[exp.model_dump() for exp in cv_data.experience],
            skills=[skill.model_dump() for skill in cv_data.skills],
            projects=[proj.model_dump() for proj in (cv_data.projects or [])],
            certifications=[cert.model_dump() for cert in (cv_data.certifications or [])],
            languages=[lang.model_dump() for lang in (cv_data.languages or [])],
        )
        db.add(cv)
        db.commit()
        db.refresh(cv)
        return cv

    @staticmethod
    def update_cv(db: Session, cv_id: int, user_id: int, cv_data: CVUpdate) -> Optional[CV]:
        """Update an existing CV"""
        cv = CVService.get_cv_by_id(db, cv_id, user_id)
        if not cv:
            return None

        update_data = cv_data.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            if field == "personalInfo" and value:
                setattr(cv, "personal_info", value)
            elif field in ["education", "experience", "skills", "projects", "certifications", "languages"]:
                if value is not None:
                    # Convert Pydantic models to dicts
                    if isinstance(value, list) and len(value) > 0:
                        setattr(cv, field, [item.model_dump() if hasattr(item, 'model_dump') else item for item in value])
                    else:
                        setattr(cv, field, value)
            else:
                setattr(cv, field, value)

        db.commit()
        db.refresh(cv)
        return cv

    @staticmethod
    def delete_cv(db: Session, cv_id: int, user_id: int) -> bool:
        """Delete a CV"""
        cv = CVService.get_cv_by_id(db, cv_id, user_id)
        if not cv:
            return False

        db.delete(cv)
        db.commit()
        return True
