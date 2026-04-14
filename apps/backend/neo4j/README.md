# Neo4j Scripts và Tools

Folder này chứa tất cả các scripts và tools liên quan đến Neo4j database cho Career Recommendation System.

## 📁 Cấu trúc Files

### 🔧 Setup và Configuration
- `test_connections.py` - Test kết nối Neo4j và PostgreSQL
- `verify_neo4j.py` - Xác minh Neo4j deployment
- `check_plugins.py` - Kiểm tra Neo4j plugins (APOC, GDS)

### 🗑️ Data Cleanup
- `clean_neo4j_data.py` - Xóa Person và Movie demo nodes
- `clean_demo_nodes_complete.py` - Cleanup hoàn toàn demo data
- `final_schema_cleanup.py` - Cleanup schema artifacts
- `remove_movie_index.py` - Xóa Movie indexes còn sót lại
- `verify_clean_schema.py` - Xác minh schema đã sạch

### 🔄 Data Fixes
- `fix_job_titles.py` - Fix job titles hiển thị "UNKNOWN"
- `fix_technology_data.py` - Fix Technology Skills diversity
- `fix_skills_data_complete.py` - Rebuild toàn bộ Skills data

### 🧪 Testing và Debug
- `debug_technology_skills.py` - Debug Technology Skills issues
- `debug_skills_importance.py` - Debug Skills importance issues
- `test_neo4j_browser.py` - Test Neo4j Browser interface
- `test_schema_final.py` - Test schema cuối cùng
- `test_skills_query.py` - Test Skills queries
- `test_technology_query.py` - Test Technology queries
- `test_fixed_skills_query.py` - Test Skills sau khi fix

### 📊 Data Generation
- `generate_new_6_1_csv.py` - Tạo CSV với diverse Technology Skills
- `generate_diverse_6_2_csv.py` - Tạo CSV với diverse Skills

### 📄 Documentation
- `QUERY_EXPLANATION.md` - Giải thích vấn đề query và giải pháp

### 📈 Data Files
- `6.1_fixed.csv` - Technology Skills data (fixed)
- `6.1_new.csv` - Technology Skills data (new)
- `6.2_diverse.csv` - Skills data (diverse)
- `6.2_new.csv` - Skills data (new)

## 🚀 Cách sử dụng

### 1. Setup Neo4j
```bash
python test_connections.py
python verify_neo4j.py
```

### 2. Clean Demo Data
```bash
python clean_demo_nodes_complete.py
python verify_clean_schema.py
```

### 3. Fix Data Issues
```bash
python fix_technology_data.py
python fix_skills_data_complete.py
```

### 4. Test Results
```bash
python test_technology_query.py
python test_fixed_skills_query.py
```

## 📊 Database Status

- **Jobs:** 959 nodes
- **Skills:** 268 nodes (172 Technology + 96 KSA)
- **Relationships:** 103,680 REQUIRES relationships
- **Schema:** Clean (chỉ Job và Skill nodes)

## 🔗 Neo4j Access

- **URL:** http://localhost:7474
- **Username:** neo4j
- **Password:** password123456

## 📝 Notes

- Tất cả scripts đã được test và hoạt động ổn định
- Data đã được fix hoàn toàn (Technology Skills và Skills diversity)
- Schema đã được cleanup (không còn Movie/Person demo data)
- Sử dụng scripts theo thứ tự để tránh conflicts