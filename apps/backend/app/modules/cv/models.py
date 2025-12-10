from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.db import Base


class CV(Base):
    __tablename__ = "cvs"
    __table_args__ = {"schema": "core"}

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("core.users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    template = Column(String(50), default="modern")
    
    # JSON fields for flexible data storage
    personal_info = Column(JSON, nullable=False)
    education = Column(JSON, default=list)
    experience = Column(JSON, default=list)
    skills = Column(JSON, default=list)
    projects = Column(JSON, default=list)
    certifications = Column(JSON, default=list)
    languages = Column(JSON, default=list)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="cvs")
