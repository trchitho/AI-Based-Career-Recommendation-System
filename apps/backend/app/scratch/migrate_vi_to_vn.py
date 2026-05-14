
from sqlalchemy import text
from app.core.db import SessionLocal

def run_migration():
    db = SessionLocal()
    try:
        print("Starting DB migration to standardize _vn suffix...")
        
        # 1. core.careers
        print("Migrating core.careers...")
        db.execute(text("ALTER TABLE core.careers RENAME COLUMN title_vi TO title_vn"))
        db.execute(text("ALTER TABLE core.careers RENAME COLUMN short_desc_vi TO short_desc_vn"))
        db.execute(text("ALTER TABLE core.careers RENAME COLUMN description_vi TO description_vn"))
        db.execute(text("ALTER TABLE core.careers RENAME COLUMN alternative_titles_vi TO alternative_titles_vn"))
        
        # 2. core.essay_prompts
        print("Migrating core.essay_prompts...")
        db.execute(text("ALTER TABLE core.essay_prompts RENAME COLUMN title_vi TO title_vn"))
        db.execute(text("ALTER TABLE core.essay_prompts RENAME COLUMN prompt_text_vi TO prompt_text_vn"))
        
        # 3. core.career_tasks
        print("Migrating core.career_tasks...")
        db.execute(text("ALTER TABLE core.career_tasks RENAME COLUMN task_vi TO task_vn"))
        
        db.commit()
        print("Migration successful!")
    except Exception as e:
        db.rollback()
        print(f"Migration failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
