"""Import trends.csv into core.crawled_jobs, handling raw_data column."""
import csv
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "postgresql://postgres:123456@localhost:5433/career_ai"
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)

CSV_PATH = r"E:\OneDrive\Desktop\test\AI-Based-Career-Recommendation-System\trends.csv"

def parse_bool(val):
    if val in ('t', 'true', 'True', '1', True):
        return True
    return False

def parse_float(val):
    if val is None or val == '':
        return None
    try:
        return float(val)
    except:
        return None

def parse_skills(val):
    """Parse PostgreSQL array format like {skill1,skill2} or empty {}"""
    if not val or val == '{}':
        return []
    val = val.strip('{}')
    if not val:
        return []
    return [s.strip('"') for s in val.split(',') if s.strip()]

def parse_raw_data(val):
    """Convert Python dict string to JSON or return null"""
    if not val or val.strip() in ('', '{}', 'None'):
        return None
    # Try to fix Python dict format to JSON
    try:
        # Replace single quotes with double quotes
        fixed = val.replace("'", '"')
        json.loads(fixed)
        return fixed
    except:
        return json.dumps({"source": "dom"})

def main():
    print(f"Reading: {CSV_PATH}")
    session = Session()
    
    with open(CSV_PATH, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        batch = []
        count = 0
        
        for row in reader:
            batch.append({
                "id": int(row["id"]),
                "industry_group_id": int(row["industry_group_id"]),
                "industry_group_slug": row["industry_group_slug"],
                "source_site": row["source_site"],
                "title": row["title"],
                "company": row["company"] or None,
                "location": row["location"] or None,
                "salary": row["salary"] or None,
                "salary_min": parse_float(row["salary_min"]),
                "salary_max": parse_float(row["salary_max"]),
                "skills": parse_skills(row["skills"]),
                "experience_level": row["experience_level"] or None,
                "employment_type": row["employment_type"] or None,
                "description": row["description"] or None,
                "requirements": row["requirements"] or None,
                "posted_date": row["posted_date"] or None,
                "application_deadline": row["application_deadline"] or None,
                "job_url": row["job_url"],
                "apply_url": row["apply_url"] or None,
                "content_hash": row["content_hash"],
                "is_active": parse_bool(row["is_active"]),
                "first_seen_at": row["first_seen_at"] or None,
                "last_seen_at": row["last_seen_at"] or None,
                "created_at": row["created_at"] or None,
                "updated_at": row["updated_at"] or None,
                "raw_data": parse_raw_data(row.get("raw_data", "")),
            })
            count += 1
            
            if len(batch) >= 200:
                _insert_batch(session, batch)
                batch = []
                print(f"  Inserted {count} rows...")
        
        if batch:
            _insert_batch(session, batch)
    
    session.commit()
    session.close()
    print(f"Done! Imported {count} rows into core.crawled_jobs")

def _insert_batch(session, batch):
    for row in batch:
        session.execute(text("""
            INSERT INTO core.crawled_jobs 
            (id, industry_group_id, industry_group_slug, source_site, title, company, 
             location, salary, salary_min, salary_max, skills, experience_level, 
             employment_type, description, requirements, posted_date, application_deadline,
             job_url, apply_url, content_hash, is_active, first_seen_at, last_seen_at, 
             created_at, updated_at, raw_data)
            VALUES 
            (:id, :industry_group_id, :industry_group_slug, :source_site, :title, :company,
             :location, :salary, :salary_min, :salary_max, :skills, :experience_level,
             :employment_type, :description, :requirements, :posted_date, :application_deadline,
             :job_url, :apply_url, :content_hash, :is_active, :first_seen_at, :last_seen_at,
             :created_at, :updated_at, CAST(:raw_data AS jsonb))
            ON CONFLICT (content_hash) DO NOTHING
        """), row)

if __name__ == "__main__":
    main()
