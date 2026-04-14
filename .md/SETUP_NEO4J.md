# Hướng dẫn cài đặt Neo4j

## Bước 1: Cài đặt Neo4j

### Windows:
1. Download Neo4j Desktop: https://neo4j.com/download/
2. Cài đặt và mở Neo4j Desktop
3. Tạo một database mới:
   - Click "New" -> "Create a Local DBMS"
   - Name: career_ai
   - Password: pass
   - Version: 5.x (latest)
4. Start database

### Hoặc dùng Docker:
```bash
docker run -d \
  --name neo4j \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/pass \
  neo4j:latest
```

## Bước 2: Kiểm tra kết nối

Mở browser: http://localhost:7474
- Username: neo4j
- Password: pass

## Bước 3: Import dữ liệu Career

Bạn cần import career data từ ONET vào Neo4j. Có 2 cách:

### Cách 1: Dùng script Python (Nếu có)
```bash
cd apps/backend
python import_careers_to_neo4j.py
```

### Cách 2: Tạo dữ liệu mẫu thủ công

Chạy các Cypher queries sau trong Neo4j Browser (http://localhost:7474):

```cypher
// Tạo Career nodes
CREATE (c1:Career {
  id: 'software-engineer',
  title: 'Software Engineer',
  onet_code: '15-1252.00'
});

CREATE (c2:Career {
  id: 'data-scientist',
  title: 'Data Scientist',
  onet_code: '15-2051.00'
});

// Tạo Skill nodes
CREATE (s1:Skill {name: 'Python', category: 'Programming'});
CREATE (s2:Skill {name: 'JavaScript', category: 'Programming'});
CREATE (s3:Skill {name: 'SQL', category: 'Database'});
CREATE (s4:Skill {name: 'Git', category: 'DevOps'});
CREATE (s5:Skill {name: 'React', category: 'Web Development'});

// Tạo relationships
MATCH (c:Career {id: 'software-engineer'}), (s:Skill {name: 'Python'})
CREATE (c)-[:REQUIRES_SKILL {importance: 0.9, proficiency_level: 'advanced'}]->(s);

MATCH (c:Career {id: 'software-engineer'}), (s:Skill {name: 'JavaScript'})
CREATE (c)-[:REQUIRES_SKILL {importance: 0.85, proficiency_level: 'advanced'}]->(s);

MATCH (c:Career {id: 'software-engineer'}), (s:Skill {name: 'SQL'})
CREATE (c)-[:REQUIRES_SKILL {importance: 0.85, proficiency_level: 'intermediate'}]->(s);

MATCH (c:Career {id: 'software-engineer'}), (s:Skill {name: 'Git'})
CREATE (c)-[:REQUIRES_SKILL {importance: 0.9, proficiency_level: 'intermediate'}]->(s);

MATCH (c:Career {id: 'software-engineer'}), (s:Skill {name: 'React'})
CREATE (c)-[:REQUIRES_SKILL {importance: 0.75, proficiency_level: 'intermediate'}]->(s);
```

## Bước 4: Kiểm tra dữ liệu

```bash
cd ../../
python check_neo4j_data.py
```

## LƯU Ý QUAN TRỌNG

**Bạn KHÔNG BẮT BUỘC phải cài Neo4j!**

Hệ thống đã có fallback mock data. Khi Neo4j không có dữ liệu, hệ thống tự động dùng mock data để phân tích CV.

Mock data bao gồm:
- software-engineer: 12 skills
- data-scientist: 9 skills  
- product-manager: 7 skills
- ux-designer: 7 skills
- devops-engineer: 8 skills

Chỉ cần restart backend và upload CV là được!
