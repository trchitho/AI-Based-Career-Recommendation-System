"""
Database initialization script for Interview module
Chạy script này để tạo schema và tables cho AI Mock Interview
"""

import os
import sys

from sqlalchemy import create_engine, text

# Add parent directory to path để import được config
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from core.config import settings


def init_interview_database():
    """Tạo schema và tables cho Interview module"""

    # Tạo engine kết nối database
    engine = create_engine(settings.DATABASE_URL)

    # SQL để tạo schema và tables
    from .models import CREATE_SCHEMA_SQL

    try:
        with engine.connect() as conn:
            # Execute từng statement riêng biệt
            statements = CREATE_SCHEMA_SQL.split(";")

            for statement in statements:
                statement = statement.strip()
                if statement:  # Bỏ qua statement rỗng
                    print(f"Executing: {statement[:50]}...")
                    conn.execute(text(statement))

            conn.commit()
            print("[OK] Đã tạo thành công schema và tables cho Interview module!")

    except Exception as e:
        print(f"[ERR] Lỗi khi tạo database: {e}")
        raise


def check_interview_tables():
    """Kiểm tra xem các tables đã được tạo chưa"""
    engine = create_engine(settings.DATABASE_URL)

    check_queries = [
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'interview' AND table_name = 'interview_sessions'",
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'interview' AND table_name = 'interview_messages'",
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'interview' AND table_name = 'interview_templates'",
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'interview' AND table_name = 'interview_feedback'",
    ]

    table_names = ["interview_sessions", "interview_messages", "interview_templates", "interview_feedback"]

    try:
        with engine.connect() as conn:
            for i, query in enumerate(check_queries):
                result = conn.execute(text(query)).scalar()
                status = "[OK] Tồn tại" if result > 0 else "[ERR] Chưa tạo"
                print(f"{table_names[i]}: {status}")

    except Exception as e:
        print(f"[ERR] Lỗi khi kiểm tra tables: {e}")


def create_sample_templates():
    """Tạo một số template câu hỏi mẫu"""
    engine = create_engine(settings.DATABASE_URL)

    sample_templates = [
        {
            "job_id": "15-1252.00",  # Software Developer
            "job_title": "Software Developer",
            "question_type": "technical",
            "skill_category": "Python Programming",
            "question_template": "Bạn đã từng gặp tình huống nào khó khăn khi debug Python code? Hãy mô tả cách bạn giải quyết.",
            "expected_keywords": ["debug", "error", "traceback", "logging", "testing"],
            "difficulty_level": "medium",
        },
        {
            "job_id": "15-1252.00",
            "job_title": "Software Developer",
            "question_type": "behavioral",
            "skill_category": "Teamwork",
            "question_template": "Hãy kể về một lần bạn phải làm việc nhóm trong dự án phần mềm. Bạn đã xử lý conflict như thế nào?",
            "expected_keywords": ["team", "collaboration", "conflict", "communication", "solution"],
            "difficulty_level": "medium",
        },
        {
            "job_id": "11-3031.00",  # Data Analyst
            "job_title": "Data Analyst",
            "question_type": "technical",
            "skill_category": "SQL",
            "question_template": "Nếu bạn cần tối ưu một query SQL chạy chậm trên dataset lớn, bạn sẽ làm gì?",
            "expected_keywords": ["index", "optimization", "performance", "query plan", "database"],
            "difficulty_level": "hard",
        },
    ]

    try:
        with engine.connect() as conn:
            for template in sample_templates:
                insert_query = text(
                    """
                    INSERT INTO interview.interview_templates 
                    (job_id, job_title, question_type, skill_category, difficulty_level, 
                     question_template, expected_keywords, scoring_rubric)
                    VALUES 
                    (:job_id, :job_title, :question_type, :skill_category, :difficulty_level,
                     :question_template, :expected_keywords, :scoring_rubric)
                    ON CONFLICT DO NOTHING
                """
                )

                conn.execute(
                    insert_query,
                    {
                        **template,
                        "expected_keywords": json.dumps(template["expected_keywords"]),
                        "scoring_rubric": json.dumps(
                            {"technical": 0.3, "logic": 0.25, "communication": 0.2, "experience": 0.15, "attitude": 0.1}
                        ),
                    },
                )

            conn.commit()
            print("[OK] Đã tạo sample templates thành công!")

    except Exception as e:
        print(f"[ERR] Lỗi khi tạo sample templates: {e}")


if __name__ == "__main__":
    import json

    print("🚀 Khởi tạo Database cho AI Mock Interview")
    print("=" * 50)

    # Bước 1: Tạo schema và tables
    print("\n1. Tạo schema và tables...")
    init_interview_database()

    # Bước 2: Kiểm tra tables đã tạo
    print("\n2. Kiểm tra tables...")
    check_interview_tables()

    # Bước 3: Tạo sample data
    print("\n3. Tạo sample templates...")
    create_sample_templates()

    print("\n🎉 Hoàn thành khởi tạo Interview module!")
    print("\n📋 Các bước tiếp theo:")
    print("1. Cập nhật .env với GEMINI_API_KEY")
    print("2. Khởi động Neo4j container: docker-compose -f docker-compose.neo4j.yml up -d")
    print("3. Chạy ETL để nạp dữ liệu: python -m app.etl.build_graph")
    print("4. Khởi động backend: uvicorn app.main:app --reload")
    print("5. Test API tại: http://localhost:8000/docs")
