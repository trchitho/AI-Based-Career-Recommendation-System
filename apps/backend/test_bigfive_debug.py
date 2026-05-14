"""
Debug script to check Big Five data in database
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create database connection
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not found in environment")
    sys.exit(1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
session = SessionLocal()

print("=" * 80)
print("BIG FIVE DEBUG REPORT")
print("=" * 80)

# 1. Check assessment forms
print("\n1. ASSESSMENT FORMS:")
print("-" * 80)
forms = session.execute(text("""
    SELECT id, code, title, form_type, lang
    FROM core.assessment_forms
    ORDER BY form_type, id
""")).fetchall()

for form in forms:
    print(f"  ID: {form[0]}, Code: {form[1]}, Title: {form[2]}, Type: {form[3]}, Lang: {form[4]}")

# 2. Check question counts by form type
print("\n2. QUESTION COUNTS BY FORM TYPE:")
print("-" * 80)
counts = session.execute(text("""
    SELECT af.form_type, COUNT(aq.id) as question_count
    FROM core.assessment_forms af
    LEFT JOIN core.assessment_questions aq ON aq.form_id = af.id
    GROUP BY af.form_type
    ORDER BY af.form_type
""")).fetchall()

for count in counts:
    print(f"  {count[0]}: {count[1]} questions")

# 3. Check sample BigFive questions
print("\n3. SAMPLE BIG FIVE QUESTIONS:")
print("-" * 80)
bigfive_questions = session.execute(text("""
    SELECT aq.id, aq.question_key, aq.question_no, af.form_type, af.lang
    FROM core.assessment_questions aq
    JOIN core.assessment_forms af ON aq.form_id = af.id
    WHERE af.form_type = 'BigFive'
    ORDER BY aq.question_no
    LIMIT 5
""")).fetchall()

if bigfive_questions:
    for q in bigfive_questions:
        print(f"  ID: {q[0]}, Key: {q[1]}, No: {q[2]}, Type: {q[3]}, Lang: {q[4]}")
else:
    print("  ⚠️  NO BIG FIVE QUESTIONS FOUND!")

# 4. Check recent assessments
print("\n4. RECENT ASSESSMENTS (Last 5):")
print("-" * 80)
assessments = session.execute(text("""
    SELECT id, user_id, a_type, scores, created_at
    FROM core.assessments
    ORDER BY created_at DESC
    LIMIT 5
""")).fetchall()

for assess in assessments:
    print(f"  ID: {assess[0]}, User: {assess[1]}, Type: {assess[2]}, Scores: {assess[3]}, Created: {assess[4]}")

# 5. Check if user 74 has Big Five assessment
print("\n5. USER 74 ASSESSMENTS:")
print("-" * 80)
user_assessments = session.execute(text("""
    SELECT id, a_type, scores, created_at
    FROM core.assessments
    WHERE user_id = 74
    ORDER BY created_at DESC
    LIMIT 10
""")).fetchall()

if user_assessments:
    for assess in user_assessments:
        print(f"  ID: {assess[0]}, Type: {assess[1]}, Scores: {assess[2]}, Created: {assess[3]}")
else:
    print("  ⚠️  NO ASSESSMENTS FOUND FOR USER 74")

# 6. Check assessment responses for latest assessment
print("\n6. LATEST ASSESSMENT RESPONSES:")
print("-" * 80)
if assessments:
    latest_id = assessments[0][0]
    responses = session.execute(text(f"""
        SELECT ar.question_id, ar.question_key, ar.answer_raw, ar.score_value
        FROM core.assessment_responses ar
        WHERE ar.assessment_id = {latest_id}
        ORDER BY ar.question_id
        LIMIT 10
    """)).fetchall()
    
    print(f"  Assessment ID: {latest_id}")
    for resp in responses:
        print(f"    Q{resp[0]} ({resp[1]}): {resp[2]} -> Score: {resp[3]}")

print("\n" + "=" * 80)
print("END OF REPORT")
print("=" * 80)

session.close()
