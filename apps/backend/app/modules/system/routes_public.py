from fastapi import APIRouter, Request
from sqlalchemy.orm import Session
from sqlalchemy import text

from .models import AppSettings

router = APIRouter()


def _db(req: Request) -> Session:
    return req.state.db


@router.get("/settings")
def public_settings(request: Request):
    session = _db(request)
    s = session.get(AppSettings, 1)
    if not s:
        # Not found yet; return minimal defaults so FE can render
        return {
            "id": 1,
            "logo_url": None,
            "app_title": "CareerBridge AI",
            "app_name": "CareerBridge",
            "footer_html": "© 2025 CareerBridge AI",
            "updated_at": None,
            "updated_by": None,
        }
    return s.to_dict()


@router.get("/stats")
def public_stats(request: Request):
    """
    Public statistics for homepage display.
    Returns aggregated counts without requiring authentication.
    """
    session = _db(request)
    
    try:
        # Total assessments completed (from assessment_sessions)
        total_assessments = session.execute(
            text("SELECT COUNT(*) FROM core.assessment_sessions")
        ).scalar() or 0
        
        # Total career paths created by users (roadmap_milestones + goal_milestones)
        roadmap_milestones = session.execute(
            text("SELECT COUNT(*) FROM core.roadmap_milestones")
        ).scalar() or 0
        
        goal_milestones = session.execute(
            text("SELECT COUNT(*) FROM core.goal_milestones")
        ).scalar() or 0
        
        total_career_paths = roadmap_milestones + goal_milestones
        
        # Total careers in database (for career info count)
        total_careers = session.execute(
            text("SELECT COUNT(*) FROM core.careers")
        ).scalar() or 0
        
        # Total career-related data (skills, interests, overview, etc.)
        total_career_skills = session.execute(
            text("SELECT COUNT(*) FROM core.career_ksas")
        ).scalar() or 0
        
        total_career_interests = session.execute(
            text("SELECT COUNT(*) FROM core.career_interests")
        ).scalar() or 0
        
        # Approximate total career info (careers + skills + interests + other data)
        total_career_info = total_careers + total_career_skills + total_career_interests
        
        return {
            "totalAssessments": total_assessments,
            "totalCareerPaths": total_career_paths,
            "totalCareerInfo": total_career_info,
            "satisfactionRate": 98
        }
    except Exception as e:
        print(f"Error fetching public stats: {e}")
        return {
            "totalAssessments": 0,
            "totalCareerPaths": 0,
            "totalCareerInfo": 20000,
            "satisfactionRate": 98
        }


from pydantic import BaseModel, EmailStr
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os


class ContactFormRequest(BaseModel):
    name: str
    email: EmailStr
    phone: str = ""
    message: str


@router.post("/contact")
def send_contact_form(request: Request, form: ContactFormRequest):
    """
    Send contact form message via SMTP email.
    """
    try:
        # SMTP Configuration from environment
        smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", "465"))
        smtp_user = os.getenv("SMTP_USER", "careersystemai@gmail.com")
        smtp_password = os.getenv("SMTP_PASSWORD", "cwuwiltijobzevuy")
        email_from = os.getenv("EMAIL_FROM", "careersystemai@gmail.com")
        smtp_ssl = os.getenv("SMTP_SSL", "true").lower() == "true"
        
        # Create email message
        msg = MIMEMultipart()
        msg['From'] = email_from
        msg['To'] = email_from  # Send to ourselves
        msg['Subject'] = f"CareerBridge Contact Form - {form.name}"
        msg['Reply-To'] = form.email  # Allow reply to user's email
        
        # Email body
        body = f"""
New Contact Form Submission from CareerBridge AI
================================================

Name: {form.name}
Email: {form.email}
Phone: {form.phone or 'Not provided'}

Message:
--------
{form.message}

================================================
This message was sent from the CareerBridge AI contact form.
Reply directly to this email to respond to {form.name}.
        """
        
        msg.attach(MIMEText(body, 'plain'))
        
        # Send email
        if smtp_ssl:
            server = smtplib.SMTP_SSL(smtp_host, smtp_port)
        else:
            server = smtplib.SMTP(smtp_host, smtp_port)
            server.starttls()
        
        server.login(smtp_user, smtp_password)
        server.sendmail(email_from, email_from, msg.as_string())
        server.quit()
        
        return {
            "success": True,
            "message": "Your message has been sent successfully! We'll get back to you soon."
        }
        
    except Exception as e:
        print(f"Error sending contact form: {e}")
        return {
            "success": False,
            "message": f"Failed to send message. Please try again or email us directly at careersystemai@gmail.com"
        }
