import psycopg2
from neo4j import GraphDatabase
from psycopg2.extras import RealDictCursor

# --- CẤU HÌNH KẾT NỐI ---
# Postgres (Đọc từ docker-compose cũ của bạn)
PG_HOST = "localhost"
PG_PORT = "5433"  # Port mapping ra máy host
PG_DB = "career_ai"
PG_USER = "postgres"
PG_PASS = "123456"

# Neo4j (Đọc từ docker-compose mới)
NEO_URI = "bolt://localhost:7687"
NEO_USER = "neo4j"
NEO_PASS = "password123456"


class CareerGraphETL:
    def __init__(self):
        """Khởi tạo kết nối đến PostgreSQL và Neo4j"""
        try:
            self.pg_conn = psycopg2.connect(host=PG_HOST, port=PG_PORT, dbname=PG_DB, user=PG_USER, password=PG_PASS)
            print("[OK] Kết nối PostgreSQL thành công")
        except Exception as e:
            print(f"[ERR] Lỗi kết nối PostgreSQL: {e}")
            raise

        try:
            self.neo_driver = GraphDatabase.driver(NEO_URI, auth=(NEO_USER, NEO_PASS))
            # Test connection
            with self.neo_driver.session() as session:
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
        with self.neo_driver.session() as session:
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
        with self.neo_driver.session() as session:
            session.run("MATCH (n) DETACH DELETE n")
        print("[OK] Đã xóa sạch.")

    def fetch_data_from_postgres(self):
        """Bước 2: Lấy dữ liệu Job và Skill từ Postgres"""
        print("📥 Đang lấy dữ liệu từ PostgreSQL...")
        cur = self.pg_conn.cursor(cursor_factory=RealDictCursor)

        # Query: Lấy Job + Skill (Join bảng careers và career_ksas)
        # Chỉ lấy những Skill có độ quan trọng >= 3.0 để đồ thị không bị rác
        query = """
            SELECT 
                c.onet_code AS job_id,
                COALESCE(c.title_vi, c.title_en) AS job_title, -- Ưu tiên tiếng Việt
                k.name AS skill_id,
                COALESCE(k.description_vi, k.description) AS skill_name, -- Ưu tiên tiếng Việt
                k.importance,
                k.level,
                k.ksa_type as type
            FROM core.careers c
            JOIN core.career_ksas k ON c.onet_code = k.onet_code
            WHERE k.importance >= 3.0
        """
        cur.execute(query)
        rows = cur.fetchall()

        # Convert Decimal to float for Neo4j compatibility
        processed_rows = []
        for row in rows:
            processed_row = dict(row)
            processed_row["importance"] = float(processed_row["importance"]) if processed_row["importance"] else 0.0
            processed_row["level"] = float(processed_row["level"]) if processed_row["level"] else 0.0
            processed_rows.append(processed_row)

        print(f"[OK] Đã tải {len(processed_rows)} dòng dữ liệu quan hệ Job-Skill.")
        return processed_rows

    def load_technology_skills(self):
        """Bước 2b: Lấy thêm dữ liệu Technology (Tools)"""
        print("📥 Đang lấy dữ liệu Technology/Tools...")
        cur = self.pg_conn.cursor(cursor_factory=RealDictCursor)
        query = """
            SELECT 
                c.onet_code AS job_id,
                COALESCE(t.example_vi, t.example_en) AS skill_name, -- Ưu tiên tiếng Việt
                'Technology' as type
            FROM core.careers c
            JOIN core.career_technology t ON c.onet_code = t.onet_code
            WHERE t.hot_flag = 'Y' -- Chỉ lấy Hot Tech
        """
        cur.execute(query)
        rows = cur.fetchall()
        # Tạo ID giả cho Tech skill vì bảng technology không có ID chuẩn như KSA
        # Format ID: TECH_<Tên viết liền>
        processed_rows = []
        for r in rows:
            if r["skill_name"]:  # Kiểm tra skill_name không null
                tech_id = "TECH_" + r["skill_name"].replace(" ", "_").upper()[:50]
                processed_rows.append(
                    {
                        "job_id": r["job_id"],
                        "job_title": "UNKNOWN",  # Sẽ được merge ở node Job có sẵn
                        "skill_id": tech_id,
                        "skill_name": r["skill_name"],
                        "importance": 5.0,  # Tech hot mặc định quan trọng cao
                        "level": 0,
                        "type": "Technology",
                    }
                )
        print(f"[OK] Đã tải {len(processed_rows)} dòng dữ liệu Technology.")
        return processed_rows

    def batch_insert_neo4j(self, data_rows, batch_size=1000):
        """Bước 3: Nạp vào Neo4j bằng UNWIND (Batch Processing)"""
        print(f"🚀 Bắt đầu nạp {len(data_rows)} dòng vào Neo4j...")

        # Câu lệnh Cypher: "Upsert" (Có thì update, chưa có thì tạo mới)
        cypher_query = """
        UNWIND $batch AS row
        
        // 1. Create Job Node (if not exists)
        MERGE (j:Job {id: row.job_id})
        ON CREATE SET j.title = row.job_title
        // Update job title if changed (e.g. newly translated to Vietnamese)
        SET j.title = row.job_title 
        
        // 2. Create Skill Node (if not exists)
        MERGE (s:Skill {id: row.skill_id})
        ON CREATE SET s.name = row.skill_name, s.type = row.type
        SET s.name = row.skill_name
        
        // 3. Create REQUIRES relationship
        MERGE (j)-[r:REQUIRES]->(s)
        SET r.importance = row.importance, 
            r.level = row.level
        """

        with self.neo_driver.session() as session:
            total = len(data_rows)
            for i in range(0, total, batch_size):
                batch = data_rows[i : i + batch_size]
                session.run(cypher_query, batch=batch)
                print(f"   ... Đã xử lý {min(i + batch_size, total)} / {total}")

        print("[OK] Hoàn tất nạp dữ liệu!")

    def run(self):
        """Chạy toàn bộ quy trình ETL"""
        try:
            self.setup_schema()
            self.clear_database()  # Comment dòng này nếu muốn giữ dữ liệu cũ

            # Load KSA (Knowledge, Skills, Abilities)
            ksa_data = self.fetch_data_from_postgres()
            if ksa_data:
                self.batch_insert_neo4j(ksa_data)

            # Load Technology (Tools, Software)
            tech_data = self.load_technology_skills()
            if tech_data:
                self.batch_insert_neo4j(tech_data)

            print("\n🎉 ETL Pipeline hoàn thành thành công!")
            print("📊 Để kiểm tra kết quả:")
            print("   1. Truy cập: http://localhost:7474")
            print("   2. Đăng nhập: neo4j / password123456")
            print("   3. Chạy query: MATCH (j:Job)-[r:REQUIRES]->(s:Skill) RETURN j, r, s LIMIT 50")

        except Exception as e:
            print(f"[ERR] Lỗi trong quá trình ETL: {e}")
            raise
        finally:
            self.close()


if __name__ == "__main__":
    print("🚀 Bắt đầu ETL Pipeline: PostgreSQL -> Neo4j")
    print("=" * 60)

    etl = CareerGraphETL()
    etl.run()
