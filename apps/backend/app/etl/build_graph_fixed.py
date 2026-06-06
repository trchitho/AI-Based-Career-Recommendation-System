import os

import psycopg2
from neo4j import GraphDatabase
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8",
)
NEO_URI = os.getenv("NEO4J_URI") or os.getenv("NEO4J_URL", "bolt://localhost:7687")
NEO_USER = os.getenv("NEO4J_USER", "neo4j")
NEO_PASS = os.getenv("NEO4J_PASSWORD") or os.getenv("NEO4J_PASS", "password123456")
NEO4J_DATABASE = os.getenv("NEO4J_DATABASE", "neo4j")
GRAPH_CLEAR_BEFORE_IMPORT = os.getenv("GRAPH_CLEAR_BEFORE_IMPORT", "false").lower() in {"1", "true", "yes"}


class CareerGraphETL:
    def __init__(self):
        """Khởi tạo kết nối đến PostgreSQL và Neo4j"""
        try:
            self.pg_conn = psycopg2.connect(DATABASE_URL)
            print("[OK] Kết nối PostgreSQL thành công")
        except Exception as e:
            print(f"[ERR] Lỗi kết nối PostgreSQL: {e}")
            raise

        try:
            self.neo_driver = GraphDatabase.driver(NEO_URI, auth=(NEO_USER, NEO_PASS))
            # Test connection
            with self.neo_driver.session(database=NEO4J_DATABASE) as session:
                session.run("RETURN 1")
            print("[OK] Kết nối Neo4j thành công")
        except Exception as e:
            print(f"[ERR] Lỗi kết nối Neo4j: {e}")
            raise

    def close(self):
        """Đóng kết nối"""
        if hasattr(self, "pg_conn"):
            self.pg_conn.close()
        if hasattr(self, "neo_driver"):
            self.neo_driver.close()

    def setup_schema(self):
        """Bước 1: Tạo Constraint để đảm bảo dữ liệu duy nhất và index nhanh"""
        print("🔄 Đang cấu hình Schema Neo4j...")
        with self.neo_driver.session(database=NEO4J_DATABASE) as session:
            # Tạo constraint cho Job ID (O*NET Code)
            session.run("CREATE CONSTRAINT job_id_unique IF NOT EXISTS FOR (j:Job) REQUIRE j.id IS UNIQUE")
            # Tạo constraint cho Skill ID
            session.run("CREATE CONSTRAINT skill_id_unique IF NOT EXISTS FOR (s:Skill) REQUIRE s.id IS UNIQUE")
            # Tạo index tìm kiếm cho tên nghề (Fulltext search sau này dùng cũng được)
            session.run("CREATE INDEX job_title_index IF NOT EXISTS FOR (j:Job) ON (j.title)")
        print("[OK] Schema đã sẵn sàng.")

    def clear_database(self):
        """(Tùy chọn) Xóa sạch database để nạp lại từ đầu"""
        print("[WARN] Đang xóa toàn bộ dữ liệu Neo4j cũ...")
        with self.neo_driver.session(database=NEO4J_DATABASE) as session:
            session.run("MATCH (n) DETACH DELETE n")
        print("[OK] Đã xóa sạch.")

    def fetch_work_activities_from_postgres(self):
        """Bước 2: Lấy dữ liệu Job-specific Work Activities từ Postgres"""
        print("📥 Đang lấy dữ liệu Work Activities từ PostgreSQL...")
        cur = self.pg_conn.cursor(cursor_factory=RealDictCursor)

        # Query: Lấy Job + Work Activities (Join với career_work_activity_summary)
        # Sử dụng work activities thay vì generic KSAs để có job-specific skills
        query = """
            SELECT 
                c.onet_code AS job_id,
                COALESCE(c.title_vi, c.title_en) AS job_title,
                s.element_id AS skill_id,
                COALESCE(m.element_name_vi, m.element_name) AS skill_name,
                s.importance_score as importance,
                s.level_score as level,
                'Work Activity' as type,
                s.activity_rank,
                s.combined_score
            FROM core.careers c
            JOIN core.career_work_activity_summary s ON c.onet_code = s.onet_code
            JOIN core.career_work_activities_master m ON s.element_id = m.element_id
            WHERE s.combined_score >= 4.0  -- Threshold cao hơn cho activities quan trọng
            ORDER BY c.onet_code, s.activity_rank
        """
        cur.execute(query)
        rows = cur.fetchall()

        # Convert Decimal to float for Neo4j compatibility
        processed_rows = []
        for row in rows:
            processed_row = dict(row)
            processed_row["importance"] = float(processed_row["importance"]) if processed_row["importance"] else 0.0
            processed_row["level"] = float(processed_row["level"]) if processed_row["level"] else 0.0
            processed_row["combined_score"] = float(processed_row["combined_score"]) if processed_row["combined_score"] else 0.0
            processed_row["activity_rank"] = int(processed_row["activity_rank"]) if processed_row["activity_rank"] else 999
            processed_rows.append(processed_row)

        print(f"[OK] Đã tải {len(processed_rows)} dòng dữ liệu Work Activities.")
        return processed_rows

    def fetch_top_skills_from_postgres(self):
        """Bước 2b: Lấy top skills từ career_ksas (chỉ lấy skills quan trọng nhất)"""
        print("📥 Đang lấy Top Skills từ PostgreSQL...")
        cur = self.pg_conn.cursor(cursor_factory=RealDictCursor)

        # Query: Chỉ lấy top skills có importance >= 4.5 để bổ sung cho work activities
        query = """
            SELECT 
                c.onet_code AS job_id,
                COALESCE(c.title_vi, c.title_en) AS job_title,
                'KSA_' || k.id::text AS skill_id,
                COALESCE(k.name_vn, k.name_en, k.description_vn, k.description_en) AS skill_name,
                k.importance,
                k.level,
                k.ksa_type as type
            FROM core.careers c
            JOIN core.career_ksas k ON c.onet_code = k.onet_code
            WHERE k.importance >= 45 AND k.ksa_type = 'skill'
            ORDER BY c.onet_code, k.importance DESC
        """
        cur.execute(query)
        rows = cur.fetchall()

        # Convert Decimal to float for Neo4j compatibility
        processed_rows = []
        for row in rows:
            processed_row = dict(row)
            processed_row["importance"] = float(processed_row["importance"]) if processed_row["importance"] else 0.0
            processed_row["level"] = float(processed_row["level"]) if processed_row["level"] else 0.0
            processed_row["activity_rank"] = 999  # Lower priority than work activities
            processed_row["combined_score"] = processed_row["importance"]  # Use importance as combined score
            processed_rows.append(processed_row)

        print(f"[OK] Đã tải {len(processed_rows)} dòng dữ liệu Top Skills.")
        return processed_rows

    def load_technology_skills(self):
        """Bước 2c: Lấy thêm dữ liệu Technology (Tools) - chỉ hot tech"""
        print("📥 Đang lấy dữ liệu Hot Technology/Tools...")
        cur = self.pg_conn.cursor(cursor_factory=RealDictCursor)
        query = """
            SELECT 
                c.onet_code AS job_id,
                COALESCE(c.title_vi, c.title_en) AS job_title,
                COALESCE(t.example_vi, t.example_en) AS skill_name,
                'Technology' as type
            FROM core.careers c
            JOIN core.career_technology t ON c.onet_code = t.onet_code
            WHERE t.hot_flag IS TRUE OR t.in_demand_flag IS TRUE
        """
        cur.execute(query)
        rows = cur.fetchall()

        # Tạo ID cho Tech skill
        processed_rows = []
        for r in rows:
            if r["skill_name"]:  # Kiểm tra skill_name không null
                tech_id = "TECH_" + r["skill_name"].replace(" ", "_").replace("-", "_").upper()[:50]
                processed_rows.append(
                    {
                        "job_id": r["job_id"],
                        "job_title": r["job_title"],
                        "skill_id": tech_id,
                        "skill_name": r["skill_name"],
                        "importance": 4.5,  # Tech hot có importance cao
                        "level": 0,
                        "type": "Technology",
                        "activity_rank": 998,  # Lower priority than work activities
                        "combined_score": 4.5,
                    }
                )
        print(f"[OK] Đã tải {len(processed_rows)} dòng dữ liệu Technology.")
        return processed_rows

    def batch_insert_neo4j(self, data_rows, batch_size=1000):
        """Bước 3: Nạp vào Neo4j bằng UNWIND (Batch Processing)"""
        print(f"🚀 Bắt đầu nạp {len(data_rows)} dòng vào Neo4j...")

        # Câu lệnh Cypher: "Upsert" với thêm activity_rank và combined_score
        cypher_query = """
        UNWIND $batch AS row
        
        // 1. Create Job Node (if not exists)
        MERGE (j:Job {id: row.job_id})
        ON CREATE SET j.title = row.job_title
        SET j.title = row.job_title 
        
        // 2. Create Skill Node (if not exists)
        MERGE (s:Skill {id: row.skill_id})
        ON CREATE SET s.name = row.skill_name, s.type = row.type
        SET s.name = row.skill_name, s.type = row.type
        
        // 3. Create REQUIRES relationship with enhanced properties
        MERGE (j)-[r:REQUIRES]->(s)
        SET r.importance = row.importance, 
            r.level = row.level,
            r.activity_rank = row.activity_rank,
            r.combined_score = row.combined_score
        """

        with self.neo_driver.session(database=NEO4J_DATABASE) as session:
            total = len(data_rows)
            for i in range(0, total, batch_size):
                batch = data_rows[i : i + batch_size]
                session.run(cypher_query, batch=batch)
                print(f"   ... Đã xử lý {min(i + batch_size, total)} / {total}")

        print("[OK] Hoàn tất nạp dữ liệu!")

    def create_summary_stats(self):
        """Bước 4: Tạo thống kê tổng quan"""
        print("📊 Đang tạo thống kê tổng quan...")
        with self.neo_driver.session(database=NEO4J_DATABASE) as session:
            # Đếm số lượng nodes và relationships
            job_count = session.run("MATCH (j:Job) RETURN count(j) as count").single()["count"]
            skill_count = session.run("MATCH (s:Skill) RETURN count(s) as count").single()["count"]
            rel_count = session.run("MATCH ()-[r:REQUIRES]->() RETURN count(r) as count").single()["count"]

            # Thống kê theo loại skill
            skill_types = session.run(
                """
                MATCH (s:Skill) 
                RETURN s.type as type, count(s) as count 
                ORDER BY count DESC
            """
            ).data()

            print("\n📈 THỐNG KÊ TỔNG QUAN:")
            print(f"   🏢 Jobs: {job_count:,}")
            print(f"   🎯 Skills: {skill_count:,}")
            print(f"   🔗 Relationships: {rel_count:,}")
            print("\n📊 PHÂN LOẠI SKILLS:")
            for stat in skill_types:
                print(f"   - {stat['type']}: {stat['count']:,}")

    def test_job_specific_skills(self):
        """Bước 5: Test để verify skills thực sự job-specific"""
        print("\n🧪 TESTING: Kiểm tra skills có job-specific không...")
        with self.neo_driver.session(database=NEO4J_DATABASE) as session:
            # Test Software Developer
            sw_dev_result = session.run(
                """
                MATCH (j:Job {id: '15-1252.00'})-[r:REQUIRES]->(s:Skill)
                RETURN s.name as skill_name, s.type as skill_type, 
                       r.importance as importance, r.activity_rank as rank
                ORDER BY r.activity_rank ASC, r.combined_score DESC
                LIMIT 8
            """
            ).data()

            # Test Civil Engineer
            civil_eng_result = session.run(
                """
                MATCH (j:Job {id: '17-2051.00'})-[r:REQUIRES]->(s:Skill)
                RETURN s.name as skill_name, s.type as skill_type,
                       r.importance as importance, r.activity_rank as rank
                ORDER BY r.activity_rank ASC, r.combined_score DESC
                LIMIT 8
            """
            ).data()

            print("\n👨‍💻 SOFTWARE DEVELOPER (15-1252.00) - Top 8 Skills:")
            for i, skill in enumerate(sw_dev_result, 1):
                print(f"   {i}. {skill['skill_name']} ({skill['skill_type']}) - Rank: {skill['rank']}")

            print("\n👷‍♂️ CIVIL ENGINEER (17-2051.00) - Top 8 Skills:")
            for i, skill in enumerate(civil_eng_result, 1):
                print(f"   {i}. {skill['skill_name']} ({skill['skill_type']}) - Rank: {skill['rank']}")

            # Check if skills are different
            sw_skills = {s["skill_name"] for s in sw_dev_result}
            civil_skills = {s["skill_name"] for s in civil_eng_result}
            overlap = sw_skills.intersection(civil_skills)

            print("\n📊 OVERLAP ANALYSIS:")
            print(f"   - Software Dev skills: {len(sw_skills)}")
            print(f"   - Civil Engineer skills: {len(civil_skills)}")
            print(f"   - Overlapping skills: {len(overlap)}")
            print(
                f"   - Uniqueness: {((len(sw_skills) + len(civil_skills) - 2 * len(overlap)) / (len(sw_skills) + len(civil_skills)) * 100):.1f}%"
            )

            if len(overlap) < 4:  # Less than 50% overlap is good
                print("   [OK] GOOD: Skills are job-specific!")
            else:
                print("   [WARN] WARNING: Too much overlap, may need further tuning")

    def run(self):
        """Chạy toàn bộ quy trình ETL với Work Activities"""
        try:
            self.setup_schema()
            if GRAPH_CLEAR_BEFORE_IMPORT:
                self.clear_database()

            # 1. Load Work Activities (Primary source - job-specific)
            work_activities_data = self.fetch_work_activities_from_postgres()
            if work_activities_data:
                self.batch_insert_neo4j(work_activities_data)

            # 2. Load Top Skills (Secondary source - supplement)
            top_skills_data = self.fetch_top_skills_from_postgres()
            if top_skills_data:
                self.batch_insert_neo4j(top_skills_data)

            # 3. Load Hot Technology (Tertiary source - tools)
            tech_data = self.load_technology_skills()
            if tech_data:
                self.batch_insert_neo4j(tech_data)

            # 4. Create summary statistics
            self.create_summary_stats()

            # 5. Test job-specific skills
            self.test_job_specific_skills()

            print("\n🎉 ENHANCED ETL Pipeline hoàn thành thành công!")
            print("📊 Để kiểm tra kết quả:")
            print("   1. Truy cập: http://localhost:7474")
            print("   2. Đăng nhập: neo4j / password123456")
            print(
                "   3. Test query: MATCH (j:Job {id: '15-1252.00'})-[r:REQUIRES]->(s:Skill) RETURN j.title, s.name, r.activity_rank ORDER BY r.activity_rank LIMIT 10"
            )

        except Exception as e:
            print(f"[ERR] Lỗi trong quá trình ETL: {e}")
            raise
        finally:
            self.close()


if __name__ == "__main__":
    print("🚀 Bắt đầu ENHANCED ETL Pipeline: PostgreSQL -> Neo4j")
    print("🎯 Sử dụng Work Activities thay vì Generic KSAs")
    print("=" * 70)

    etl = CareerGraphETL()
    etl.run()
