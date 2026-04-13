"""
Test to verify the false positive fix for valid CVs containing the word "presentation"
in valid context (e.g., "prepared over 500 presentations")
"""
from app.modules.skill_gap.cv_parser_v2 import CVParserV2


def test_cv_with_presentation_in_valid_context():
    """
    Test that a valid CV containing "presentation" in work context is accepted.
    
    This was the false positive case reported by the user:
    - CV contains "prepared over 500 presentations" in work experience
    - System incorrectly rejected it with "Nội dung có vẻ là 'presentation'"
    
    After fix: Should accept because we now check for specific phrases like
    "powerpoint presentation", "slide deck", "presentation slides" instead of
    just the word "presentation" alone.
    """
    parser = CVParserV2()
    
    # Simulate the user's Administrative Assistant CV
    cv_text = """
ADMINISTRATIVE ASSISTANT

Contact Information:
Name: Jane Smith
Email: jane.smith@email.com
Phone: 0901234567

PROFESSIONAL SUMMARY
Experienced Administrative Assistant with 5+ years supporting executive teams.
Skilled in office management, scheduling, and document preparation.

WORK EXPERIENCE

Administrative Assistant | ABC Corporation | 2019 - Present
- Managed executive calendars and scheduled meetings for C-level executives
- Prepared over 500 presentations, reports, and correspondence documents
- Coordinated travel arrangements and expense reporting
- Maintained filing systems and office supplies inventory
- Handled confidential information with discretion

Office Coordinator | XYZ Company | 2017 - 2019
- Supported team of 15 staff members with administrative tasks
- Created and delivered presentations for monthly team meetings
- Organized company events and meetings
- Processed invoices and purchase orders

EDUCATION
Bachelor of Business Administration
State University | 2013 - 2017

SKILLS
- Microsoft Office Suite (Word, Excel, PowerPoint)
- Calendar Management
- Document Preparation
- Communication
- Organization
- Time Management
- Customer Service
"""
    
    # Test the _is_cv_content validation
    is_cv, reason = parser._is_cv_content(cv_text)
    
    print(f"\n{'='*80}")
    print("TEST RESULT:")
    print(f"{'='*80}")
    print(f"Is CV: {is_cv}")
    print(f"Reason: {reason if reason else 'Valid CV'}")
    print(f"{'='*80}\n")
    
    # This should pass - the CV is valid
    assert is_cv, f"Valid CV was incorrectly rejected! Reason: {reason}"
    print("✅ TEST PASSED: Valid CV with 'presentation' in work context is accepted")


def test_actual_presentation_document_rejected():
    """
    Test that an actual PowerPoint presentation document is still rejected.
    
    This ensures our fix doesn't create false negatives.
    """
    parser = CVParserV2()
    
    presentation_text = """
POWERPOINT PRESENTATION

Title: Company Overview 2024

Slide 1: Introduction
Welcome to our company presentation

Slide 2: Our Mission
To provide excellent service to our customers

Slide 3: Our Products
- Product A
- Product B
- Product C

Slide 4: Market Analysis
Current market trends and opportunities

Slide 5: Financial Overview
Revenue and growth projections

Slide 6: Thank You
Questions and Answers
"""
    
    is_cv, reason = parser._is_cv_content(presentation_text)
    
    print(f"\n{'='*80}")
    print("TEST RESULT:")
    print(f"{'='*80}")
    print(f"Is CV: {is_cv}")
    print(f"Reason: {reason if reason else 'Valid CV'}")
    print(f"{'='*80}\n")
    
    # This should be rejected
    assert not is_cv, "Presentation document was incorrectly accepted as CV!"
    assert "presentation" in reason.lower(), f"Expected 'presentation' in reason, got: {reason}"
    print("✅ TEST PASSED: Actual presentation document is correctly rejected")


def test_cv_with_delivered_presentations():
    """
    Test another valid context: "delivered presentations to clients"
    """
    parser = CVParserV2()
    
    cv_text = """
SALES MANAGER

Contact: john.doe@email.com | 0912345678

EXPERIENCE
Sales Manager at Tech Solutions (2018-2024)
- Delivered presentations to clients and stakeholders
- Managed sales team of 10 people
- Achieved 150% of sales targets

EDUCATION
MBA in Marketing
Business School (2016-2018)

SKILLS
Sales, Marketing, Leadership, Communication
"""
    
    is_cv, reason = parser._is_cv_content(cv_text)
    
    print(f"\n{'='*80}")
    print("TEST RESULT:")
    print(f"{'='*80}")
    print(f"Is CV: {is_cv}")
    print(f"Reason: {reason if reason else 'Valid CV'}")
    print(f"{'='*80}\n")
    
    assert is_cv, f"Valid CV was incorrectly rejected! Reason: {reason}"
    print("✅ TEST PASSED: CV with 'delivered presentations' is accepted")


def test_cv_with_presentation_skills():
    """
    Test valid context: "presentation skills" in skills section
    """
    parser = CVParserV2()
    
    cv_text = """
MARKETING SPECIALIST

Email: marketing@email.com
Phone: 0923456789

WORK EXPERIENCE
Marketing Specialist | Digital Agency | 2020-2024
- Developed marketing campaigns
- Analyzed market trends
- Collaborated with design team

EDUCATION
Bachelor of Marketing
University (2016-2020)

SKILLS
- Digital Marketing
- Content Creation
- Presentation Skills
- Data Analysis
- Project Management
"""
    
    is_cv, reason = parser._is_cv_content(cv_text)
    
    print(f"\n{'='*80}")
    print("TEST RESULT:")
    print(f"{'='*80}")
    print(f"Is CV: {is_cv}")
    print(f"Reason: {reason if reason else 'Valid CV'}")
    print(f"{'='*80}\n")
    
    assert is_cv, f"Valid CV was incorrectly rejected! Reason: {reason}"
    print("✅ TEST PASSED: CV with 'presentation skills' is accepted")


if __name__ == "__main__":
    print("\n" + "="*80)
    print("TESTING FALSE POSITIVE FIX")
    print("="*80)
    print("\nVerifying that valid CVs containing 'presentation' are now accepted...")
    print("="*80 + "\n")
    
    try:
        # Test 1: The original false positive case
        test_cv_with_presentation_in_valid_context()
        
        # Test 2: Ensure we still reject actual presentations
        test_actual_presentation_document_rejected()
        
        # Test 3: Other valid contexts
        test_cv_with_delivered_presentations()
        
        # Test 4: Presentation in skills section
        test_cv_with_presentation_skills()
        
        print("\n" + "="*80)
        print("✅ ALL TESTS PASSED!")
        print("="*80)
        print("\nSummary:")
        print("- Valid CVs with 'presentation' in work context: ✅ ACCEPTED")
        print("- Valid CVs with 'delivered presentations': ✅ ACCEPTED")
        print("- Valid CVs with 'presentation skills': ✅ ACCEPTED")
        print("- Actual presentation documents: ✅ REJECTED")
        print("\nThe false positive issue has been fixed!")
        print("="*80 + "\n")
        
    except AssertionError as e:
        print("\n" + "="*80)
        print("❌ TEST FAILED!")
        print("="*80)
        print(f"\nError: {e}")
        print("\nThe fix may need further refinement.")
        print("="*80 + "\n")
        raise
