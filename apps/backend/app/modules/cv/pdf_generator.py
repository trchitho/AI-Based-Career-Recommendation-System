from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from io import BytesIO
from app.modules.cv.models import CV


def generate_cv_pdf(cv: CV) -> bytes:
    """Generate a PDF from CV data"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    
    # Container for the 'Flowable' objects
    elements = []
    
    # Define styles
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#059669'),
        spaceAfter=6,
        alignment=TA_CENTER
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#059669'),
        spaceAfter=6,
        spaceBefore=12,
        borderWidth=1,
        borderColor=colors.HexColor('#059669'),
        borderPadding=4,
    )
    
    normal_style = styles['Normal']
    
    # Personal Info
    personal_info = cv.personal_info
    elements.append(Paragraph(personal_info.get('fullName', ''), title_style))
    
    contact_info = []
    if personal_info.get('email'):
        contact_info.append(personal_info['email'])
    if personal_info.get('phone'):
        contact_info.append(personal_info['phone'])
    if personal_info.get('address'):
        contact_info.append(personal_info['address'])
    
    if contact_info:
        elements.append(Paragraph(' | '.join(contact_info), normal_style))
    
    # Links
    links = []
    if personal_info.get('linkedin'):
        links.append('LinkedIn')
    if personal_info.get('github'):
        links.append('GitHub')
    if personal_info.get('website'):
        links.append('Website')
    
    if links:
        elements.append(Paragraph(' | '.join(links), normal_style))
    
    elements.append(Spacer(1, 0.2*inch))
    
    # Summary
    if personal_info.get('summary'):
        elements.append(Paragraph(personal_info['summary'], normal_style))
        elements.append(Spacer(1, 0.2*inch))
    
    # Experience
    if cv.experience:
        elements.append(Paragraph('EXPERIENCE', heading_style))
        for exp in cv.experience:
            elements.append(Paragraph(f"<b>{exp.get('position', '')}</b>", normal_style))
            elements.append(Paragraph(f"{exp.get('company', '')}", normal_style))
            
            date_range = exp.get('startDate', '')
            if exp.get('current'):
                date_range += ' - Present'
            elif exp.get('endDate'):
                date_range += f" - {exp['endDate']}"
            
            elements.append(Paragraph(date_range, normal_style))
            elements.append(Paragraph(exp.get('description', ''), normal_style))
            
            if exp.get('achievements'):
                for achievement in exp['achievements']:
                    elements.append(Paragraph(f"• {achievement}", normal_style))
            
            elements.append(Spacer(1, 0.1*inch))
    
    # Education
    if cv.education:
        elements.append(Paragraph('EDUCATION', heading_style))
        for edu in cv.education:
            elements.append(Paragraph(
                f"<b>{edu.get('degree', '')} in {edu.get('field', '')}</b>",
                normal_style
            ))
            elements.append(Paragraph(edu.get('school', ''), normal_style))
            
            date_range = f"{edu.get('startDate', '')} - {edu.get('endDate', 'Present')}"
            if edu.get('gpa'):
                date_range += f" | GPA: {edu['gpa']}"
            
            elements.append(Paragraph(date_range, normal_style))
            
            if edu.get('description'):
                elements.append(Paragraph(edu['description'], normal_style))
            
            elements.append(Spacer(1, 0.1*inch))
    
    # Skills
    if cv.skills:
        elements.append(Paragraph('SKILLS', heading_style))
        skills_text = ' • '.join([f"{skill.get('name', '')} ({skill.get('level', '')})" for skill in cv.skills])
        elements.append(Paragraph(skills_text, normal_style))
        elements.append(Spacer(1, 0.1*inch))
    
    # Projects
    if cv.projects:
        elements.append(Paragraph('PROJECTS', heading_style))
        for project in cv.projects:
            elements.append(Paragraph(f"<b>{project.get('name', '')}</b>", normal_style))
            elements.append(Paragraph(project.get('description', ''), normal_style))
            
            if project.get('technologies'):
                tech_text = 'Technologies: ' + ', '.join(project['technologies'])
                elements.append(Paragraph(tech_text, normal_style))
            
            elements.append(Spacer(1, 0.1*inch))
    
    # Certifications
    if cv.certifications:
        elements.append(Paragraph('CERTIFICATIONS', heading_style))
        for cert in cv.certifications:
            cert_text = f"<b>{cert.get('name', '')}</b> - {cert.get('issuer', '')} ({cert.get('date', '')})"
            elements.append(Paragraph(cert_text, normal_style))
        elements.append(Spacer(1, 0.1*inch))
    
    # Languages
    if cv.languages:
        elements.append(Paragraph('LANGUAGES', heading_style))
        lang_text = ' • '.join([f"{lang.get('name', '')} ({lang.get('proficiency', '')})" for lang in cv.languages])
        elements.append(Paragraph(lang_text, normal_style))
    
    # Build PDF
    doc.build(elements)
    
    # Get the value of the BytesIO buffer
    pdf_bytes = buffer.getvalue()
    buffer.close()
    
    return pdf_bytes
