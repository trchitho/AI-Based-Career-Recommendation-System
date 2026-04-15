
# VẤN ĐỀ VỚI QUERY GỐC VÀ GIẢI PHÁP

## Query gốc có vấn đề:
```cypher
MATCH (j:Job)-[r:REQUIRES]->(s:Skill)
WHERE r.importance > 4.0
RETURN j.title, s.name, r.importance
ORDER BY r.importance DESC
LIMIT 200
```

**Vấn đề:** Query này ORDER BY importance trước, nên tất cả records có importance cao nhất (83.0) sẽ được trả về trước. Vì có 959 jobs đều có cùng 1 skill với importance 83.0, nên kết quả chỉ hiển thị 1 skill.

## Query đã fix (diverse):
```cypher
MATCH (j:Job)-[r:REQUIRES]->(s:Skill)
WHERE r.importance > 4.0
WITH s.name as skill_name, r.importance as importance, 
     collect(j.title) as jobs, count(j) as job_count
ORDER BY importance DESC, job_count DESC, skill_name
RETURN skill_name, importance, jobs[0] as sample_job, job_count
LIMIT 200
```

**Giải pháp:** 
1. GROUP BY skill trước (WITH clause)
2. Mỗi skill chỉ xuất hiện 1 lần
3. Hiển thị 1 job mẫu cho mỗi skill
4. Đảm bảo diversity trong kết quả

## Kết quả:
- **Trước:** 200 records, 1 unique skill
- **Sau:** 200 records, 200 unique skills
- **Data integrity:** 266 unique skills với importance > 4.0 trong database
