import psycopg2
import csv
import os
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.getenv("DATABASE_URL", "postgresql://postgres:123456@localhost:5433/career_ai")
CSV_PATH = r"d:\test_capston\Capstone\AI-Based-Career-Recommendation-System\db\backup\technology.csv"

def setup():
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = True
    cur = conn.cursor()

    print("Checking for sequence and function...")
    cur.execute("CREATE SEQUENCE IF NOT EXISTS core.vietnamworks_categories_id_seq;")
    
    cur.execute("""
    CREATE OR REPLACE FUNCTION public.update_vietnamworks_categories_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = now();
        RETURN NEW;
    END;
    $$ language 'plpgsql';
    """)

    print("Creating table and indexes...")
    sql = """
    CREATE TABLE IF NOT EXISTS core.vietnamworks_categories
    (
        id integer NOT NULL DEFAULT nextval('core.vietnamworks_categories_id_seq'::regclass),
        name text NOT NULL,
        slug text NOT NULL,
        vietnamese_name text NOT NULL,
        category_group text NOT NULL,
        description text,
        vietnamworks_url text,
        is_active boolean DEFAULT true,
        sort_order integer DEFAULT 0,
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now(),
        CONSTRAINT vietnamworks_categories_pkey PRIMARY KEY (id),
        CONSTRAINT vietnamworks_categories_slug_key UNIQUE (slug)
    );

    ALTER TABLE IF EXISTS core.vietnamworks_categories OWNER to postgres;

    CREATE INDEX IF NOT EXISTS idx_vietnamworks_categories_active
        ON core.vietnamworks_categories USING btree (is_active ASC NULLS LAST);
    
    CREATE INDEX IF NOT EXISTS idx_vietnamworks_categories_group
        ON core.vietnamworks_categories USING btree (category_group ASC NULLS LAST);
    
    CREATE INDEX IF NOT EXISTS idx_vietnamworks_categories_slug
        ON core.vietnamworks_categories USING btree (slug ASC NULLS LAST);

    DROP TRIGGER IF EXISTS trigger_vietnamworks_categories_updated_at ON core.vietnamworks_categories;
    CREATE TRIGGER trigger_vietnamworks_categories_updated_at
        BEFORE UPDATE 
        ON core.vietnamworks_categories
        FOR EACH ROW
        EXECUTE FUNCTION public.update_vietnamworks_categories_updated_at();
    """
    cur.execute(sql)

    print(f"Importing data from {CSV_PATH}...")
    with open(CSV_PATH, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Handle boolean 't'/'f' or empty values
            is_active = True if row['is_active'] == 't' else False
            
            cur.execute("""
                INSERT INTO core.vietnamworks_categories 
                (name, slug, vietnamese_name, category_group, description, vietnamworks_url, is_active, sort_order, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (slug) DO UPDATE SET
                    name = EXCLUDED.name,
                    vietnamese_name = EXCLUDED.vietnamese_name,
                    category_group = EXCLUDED.category_group,
                    description = EXCLUDED.description,
                    vietnamworks_url = EXCLUDED.vietnamworks_url,
                    is_active = EXCLUDED.is_active,
                    sort_order = EXCLUDED.sort_order,
                    updated_at = now();
            """, (
                row['name'], row['slug'], row['vietnamese_name'], row['category_group'],
                row['description'], row['vietnamworks_url'], is_active, row['sort_order'],
                row['created_at'] or None, row['updated_at'] or None
            ))

    print("Done!")
    cur.close()
    conn.close()

if __name__ == "__main__":
    setup()
