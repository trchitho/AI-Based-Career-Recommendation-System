from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class CVPersonalInfo(BaseModel):
    fullName: str
    email: EmailStr
    phone: str
    address: Optional[str] = None
    dateOfBirth: Optional[str] = None
    website: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    summary: Optional[str] = None


class CVEducation(BaseModel):
    id: Optional[str] = None
    school: str
    degree: str
    field: str
    startDate: str
    endDate: Optional[str] = None
    gpa: Optional[str] = None
    description: Optional[str] = None


class CVExperience(BaseModel):
    id: Optional[str] = None
    company: str
    position: str
    startDate: str
    endDate: Optional[str] = None
    current: Optional[bool] = False
    description: str
    achievements: Optional[List[str]] = None


class CVSkill(BaseModel):
    id: Optional[str] = None
    name: str
    level: str
    category: Optional[str] = None


class CVProject(BaseModel):
    id: Optional[str] = None
    name: str
    description: str
    technologies: Optional[List[str]] = None
    url: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None


class CVCertification(BaseModel):
    id: Optional[str] = None
    name: str
    issuer: str
    date: str
    url: Optional[str] = None


class CVLanguage(BaseModel):
    id: Optional[str] = None
    name: str
    proficiency: str


class CVCreate(BaseModel):
    title: str
    template: str = "modern"
    personalInfo: CVPersonalInfo
    education: List[CVEducation] = []
    experience: List[CVExperience] = []
    skills: List[CVSkill] = []
    projects: Optional[List[CVProject]] = []
    certifications: Optional[List[CVCertification]] = []
    languages: Optional[List[CVLanguage]] = []


class CVUpdate(BaseModel):
    title: Optional[str] = None
    template: Optional[str] = None
    personalInfo: Optional[CVPersonalInfo] = None
    education: Optional[List[CVEducation]] = None
    experience: Optional[List[CVExperience]] = None
    skills: Optional[List[CVSkill]] = None
    projects: Optional[List[CVProject]] = None
    certifications: Optional[List[CVCertification]] = None
    languages: Optional[List[CVLanguage]] = None


class CVResponse(BaseModel):
    id: int
    userId: int
    title: str
    template: str
    personalInfo: dict
    education: List[dict]
    experience: List[dict]
    skills: List[dict]
    projects: List[dict]
    certifications: List[dict]
    languages: List[dict]
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True


class CVListItem(BaseModel):
    id: int
    title: str
    template: str
    updatedAt: datetime

    class Config:
        from_attributes = True
