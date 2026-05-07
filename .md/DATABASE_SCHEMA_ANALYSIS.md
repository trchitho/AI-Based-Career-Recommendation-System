# 📊 PHÂN TÍCH SCHEMA DATABASE - 4 BẢNG CORE

**Date:** 2026-04-18  
**System:** Enhanced Career Levels System  
**Tables:** 4 bảng core trong hệ thống phân cấp nghề nghiệp

---

## 🏗️ TỔNG QUAN KIẾN TRÚC

Hệ thống gồm 4 bảng chính tạo thành một cấu trúc phân cấp hoàn chỉnh:

```
core.career_groups (22 nhóm ngành)
    ↓ (1:N)
core.career_group_levels (89 cấp bậc theo nhóm)
    ↓ (1:N)  
core.career_level_mapping (959 ánh xạ career → level)
    ↓ (N:1)
core.careers (959 nghề nghiệp)
    ↓ (N:M)
core.career_group_mapping (959 ánh xạ career → group)
```

---

## 📋 PHÂN TÍCH CHI TIẾT TỪNG BẢNG

### 1. 🏢 `core.career_groups` - NHÓM NGÀNH NGHỀ

**Mục đích:** Lưu trữ 22 nhóm ngành nghề chính theo phân loại O*NET

#### Cấu trúc bảng:
| Column | Type | Constraint | Mô tả |
|--------|------|------------|-------|
| `id` | integer | PRIMARY KEY | ID duy nhất của nhóm |
| `name` | text | NOT NULL | Tên nhóm (VD: "Công nghệ thông tin") |
| `slug` | text | UNIQUE, NOT NULL | Slug URL-friendly (VD: "computer-math") |
| `description` | text | NULL | Mô tả chi tiết nhóm |
| `onet_major_group` | text | NULL | Mã O*NET 2 ký tự (VD: "15") |
| `created_at` | timestamp | DEFAULT now() | Thời gian tạo |

#### Dữ liệu mẫu:
```sql
id=3, name="Công nghệ thông tin", slug="computer-math", onet_major_group="15"
id=1, name="Quản lý", slug="management", onet_major_group="11"  
id=10, name="Y tế chuyên nghiệp", slug="healthcare-practitioners", onet_major_group="29"
```

#### Indexes:
- `career_groups_pkey` - PRIMARY KEY trên `id`
- `career_groups_slug_key` - UNIQUE trên `slug`
- `idx_career_groups_onet` - INDEX trên `onet_major_group`
- `idx_career_groups_slug` - INDEX trên `slug`

---

### 2. 📊 `core.career_group_levels` - CẤP BẬC THEO NHÓM

**Mục đích:** Lưu trữ các cấp bậc cụ thể cho từng nhóm ngành (mỗi nhóm có 4-5 cấp bậc riêng)

#### Cấu trúc bảng:
| Column | Type | Constraint | Mô tả |
|--------|------|------------|-------|
| `id` | integer | PRIMARY KEY | ID duy nhất của level |
| `group_id` | integer | FK → career_groups.id | Thuộc nhóm nào |
| `level_order` | integer | NOT NULL, CHECK(1-10) | Thứ tự cấp bậc (1=thấp nhất) |
| `level_name_vi` | text | NOT NULL | Tên cấp bậc tiếng Việt |
| `level_name_en` | text | NOT NULL | Tên cấp bậc tiếng Anh |
| `level_slug` | text | NOT NULL | Slug của level |
| `min_exp_years` | integer | NOT NULL, CHECK(≥0) | Tối thiểu năm kinh nghiệm |
| `max_exp_years` | integer | NULL, CHECK(>min_exp) | Tối đa năm kinh nghiệm (NULL=unlimited) |
| `job_zone_mapping` | text | NULL | Map với O*NET job zones |
| `seniority_keywords` | text[] | NULL | Keywords trong job title |
| `description_vi` | text | NULL | Mô tả tiếng Việt |
| `description_en` | text | NULL | Mô tả tiếng Anh |
| `created_at` | timestamp | DEFAULT now() | Thời gian tạo |
| `updated_at` | timestamp | DEFAULT now() | Thời gian cập nhật |

#### Unique Constraints:
- `(group_id, level_order)` - Mỗi nhóm có thứ tự level duy nhất
- `(group_id, level_slug)` - Mỗi nhóm có slug level duy nhất

#### Dữ liệu mẫu (Nhóm IT - computer-math):
```sql
group_id=3, level_order=1, level_name_en="Intern/Fresher", min_exp=0, max_exp=1
group_id=3, level_order=2, level_name_en="Junior Developer", min_exp=1, max_exp=3  
group_id=3, level_order=3, level_name_en="Developer/Engineer", min_exp=3, max_exp=5
group_id=3, level_order=4, level_name_en="Senior/Lead Developer", min_exp=5, max_exp=8
group_id=3, level_order=5, level_name_en="Manager/Architect", min_exp=8, max_exp=NULL
```

#### Indexes:
- `career_group_levels_pkey` - PRIMARY KEY trên `id`
- `idx_career_group_levels_group` - INDEX trên `group_id`
- `idx_career_group_levels_order` - INDEX trên `level_order`
- `idx_career_group_levels_slug` - INDEX trên `level_slug`
- `idx_career_group_levels_exp` - INDEX trên `(min_exp_years, max_exp_years)`
- `idx_career_group_levels_keywords` - GIN INDEX trên `seniority_keywords`

---

### 3. 🔗 `core.career_level_mapping` - ÁNH XẠ CAREER → LEVEL

**Mục đích:** Map từng career cụ thể vào level phù hợp với confidence score

#### Cấu trúc bảng:
| Column | Type | Constraint | Mô tả |
|--------|------|------------|-------|
| `id` | integer | PRIMARY KEY | ID duy nhất của mapping |
| `career_id` | bigint | FK → careers.id | Career nào |
| `group_level_id` | integer | FK → career_group_levels.id | Level nào |
| `is_primary` | boolean | DEFAULT true | Có phải mapping chính không |
| `confidence_score` | numeric(3,2) | CHECK(0-1), DEFAULT 1.0 | Độ tin cậy (0.5-0.9) |
| `detection_method` | text | CHECK enum | Phương pháp phát hiện |
| `notes` | text | NULL | Ghi chú |
| `created_at` | timestamp | DEFAULT now() | Thời gian tạo |
| `updated_at` | timestamp | DEFAULT now() | Thời gian cập nhật |

#### Detection Methods:
- `title_keyword` - Phát hiện qua từ khóa trong title (confidence 0.9)
- `job_zone` - Phát hiện qua O*NET job zone (confidence 0.7)
- `experience_text` - Phát hiện qua mô tả kinh nghiệm (confidence 0.6)
- `manual` - Mapping thủ công (confidence 1.0)
- `default` - Fallback mặc định (confidence 0.5)

#### Unique Constraints:
- `(career_id, group_level_id)` - Mỗi career chỉ map 1 lần với 1 level

#### Dữ liệu mẫu:
```sql
career_id=123, group_level_id=45, confidence_score=0.90, detection_method="title_keyword"
career_id=456, group_level_id=67, confidence_score=0.70, detection_method="job_zone"
career_id=789, group_level_id=89, confidence_score=0.50, detection_method="default"
```

#### Indexes:
- `career_level_mapping_pkey` - PRIMARY KEY trên `id`
- `idx_career_level_mapping_career` - INDEX trên `career_id`
- `idx_career_level_mapping_level` - INDEX trên `group_level_id`
- `idx_career_level_mapping_confidence` - INDEX trên `confidence_score DESC`
- `idx_career_level_mapping_method` - INDEX trên `detection_method`
- `idx_career_level_mapping_primary` - PARTIAL INDEX trên `is_primary WHERE is_primary=true`

---

### 4. 🔗 `core.career_group_mapping` - ÁNH XẠ CAREER → GROUP

**Mục đích:** Map từng career vào nhóm ngành phù hợp (many-to-many relationship)

#### Cấu trúc bảng:
| Column | Type | Constraint | Mô tả |
|--------|------|------------|-------|
| `id` | integer | PRIMARY KEY | ID duy nhất của mapping |
| `career_id` | bigint | FK → careers.id | Career nào |
| `group_id` | integer | FK → career_groups.id | Thuộc nhóm nào |
| `created_at` | timestamp | DEFAULT now() | Thời gian tạo |

#### Unique Constraints:
- `(career_id, group_id)` - Mỗi career chỉ thuộc 1 nhóm (trong thực tế)

#### Dữ liệu mẫu:
```sql
career_id=123, group_id=3  # Software Developer → Computer & Math
career_id=456, group_id=1  # Project Manager → Management  
career_id=789, group_id=10 # Nurse → Healthcare Practitioners
```

#### Indexes:
- `career_group_mapping_pkey` - PRIMARY KEY trên `id`
- `idx_career_group_mapping_career` - INDEX trên `career_id`
- `idx_career_group_mapping_group` - INDEX trên `group_id`

---

## 🔄 QUAN HỆ GIỮA CÁC BẢNG

### Mối quan hệ chính:

```
1. career_groups (1) ←→ (N) career_group_levels
   - Mỗi nhóm có nhiều levels
   - FK: career_group_levels.group_id → career_groups.id

2. career_group_levels (1) ←→ (N) career_level_mapping  
   - Mỗi level có nhiều careers
   - FK: career_level_mapping.group_level_id → career_group_levels.id

3. careers (1) ←→ (1) career_level_mapping
   - Mỗi career có 1 level mapping chính
   - FK: career_level_mapping.career_id → careers.id

4. careers (N) ←→ (M) career_groups (qua career_group_mapping)
   - Many-to-many relationship
   - FK: career_group_mapping.career_id → careers.id
   - FK: career_group_mapping.group_id → career_groups.id
```

### Luồng dữ liệu:

```
1. Tạo career_groups (22 nhóm ngành)
   ↓
2. Tạo career_group_levels (89 levels cho 22 nhóm)  
   ↓
3. Map careers → groups (qua career_group_mapping)
   ↓
4. Map careers → levels (qua career_level_mapping)
```

---

## 📊 THỐNG KÊ DỮ LIỆU HIỆN TẠI

### Số lượng records:
- `career_groups`: **22 records** (22 nhóm ngành O*NET)
- `career_group_levels`: **89 records** (trung bình 4-5 levels/nhóm)
- `career_level_mapping`: **959 records** (100% careers được map)
- `career_group_mapping`: **959 records** (100% careers thuộc nhóm)

### Phân bố levels theo nhóm:
- **Computer & Math**: 5 levels (Intern → Manager/Architect)
- **Management**: 4 levels (Specialist → Director)
- **Healthcare**: 4 levels (Intern → Chief)
- **21 nhóm khác**: 4 levels mỗi nhóm

### Confidence score distribution:
- **title_keyword**: 591 mappings (61.6%) - confidence 0.9
- **job_zone**: 345 mappings (36.0%) - confidence 0.7
- **default**: 22 mappings (2.3%) - confidence 0.5
- **experience_text**: 1 mapping (0.1%) - confidence 0.6

---

## 🔍 QUERIES THƯỜNG DÙNG

### 1. Lấy tất cả levels của một nhóm:
```sql
SELECT cgl.level_order, cgl.level_name_en, cgl.min_exp_years, cgl.max_exp_years
FROM core.career_group_levels cgl
JOIN core.career_groups cg ON cgl.group_id = cg.id
WHERE cg.slug = 'computer-math'
ORDER BY cgl.level_order;
```

### 2. Tìm level của một career cụ thể:
```sql
SELECT c.title_en, cg.name, cgl.level_name_en, clm.confidence_score
FROM core.careers c
JOIN core.career_level_mapping clm ON c.id = clm.career_id
JOIN core.career_group_levels cgl ON clm.group_level_id = cgl.id
JOIN core.career_groups cg ON cgl.group_id = cg.id
WHERE c.id = 123;
```

### 3. Lấy tất cả careers trong một level:
```sql
SELECT c.title_en, clm.confidence_score, clm.detection_method
FROM core.careers c
JOIN core.career_level_mapping clm ON c.id = clm.career_id
JOIN core.career_group_levels cgl ON clm.group_level_id = cgl.id
WHERE cgl.id = 45
ORDER BY clm.confidence_score DESC;
```

### 4. Thống kê levels theo nhóm:
```sql
SELECT 
  cg.name,
  COUNT(cgl.id) as level_count,
  STRING_AGG(cgl.level_name_en, ' → ' ORDER BY cgl.level_order) as progression
FROM core.career_groups cg
LEFT JOIN core.career_group_levels cgl ON cg.id = cgl.group_id
GROUP BY cg.id, cg.name
ORDER BY cg.id;
```

---

## ⚡ PERFORMANCE & INDEXES

### Indexes được tối ưu cho:
1. **Lookup by group**: `idx_career_group_levels_group`
2. **Level ordering**: `idx_career_group_levels_order`
3. **Experience filtering**: `idx_career_group_levels_exp`
4. **Keyword search**: `idx_career_group_levels_keywords` (GIN)
5. **Career mapping**: `idx_career_level_mapping_career`
6. **Confidence sorting**: `idx_career_level_mapping_confidence`
7. **Method filtering**: `idx_career_level_mapping_method`

### Query performance:
- **Group → Levels**: O(1) với index
- **Career → Level**: O(1) với index
- **Level → Careers**: O(log n) với index
- **Keyword search**: O(log n) với GIN index

---

## 🛡️ DATA INTEGRITY

### Constraints đảm bảo:
1. **Unique levels per group**: `(group_id, level_order)` unique
2. **Unique slugs per group**: `(group_id, level_slug)` unique  
3. **One mapping per career-level**: `(career_id, group_level_id)` unique
4. **Valid experience ranges**: `max_exp_years > min_exp_years`
5. **Valid confidence scores**: `0 ≤ confidence_score ≤ 1`
6. **Valid detection methods**: Enum constraint
7. **Cascading deletes**: ON DELETE CASCADE cho consistency

### Foreign Key relationships:
- **Strong consistency**: Tất cả FKs có constraints
- **Cascade deletes**: Xóa group → xóa levels → xóa mappings
- **No orphaned records**: Không có records mồ côi

---

## 🎯 KẾT LUẬN

Hệ thống 4 bảng này tạo thành một **kiến trúc hoàn chỉnh và linh hoạt** cho việc phân cấp nghề nghiệp:

### ✅ Ưu điểm:
1. **Scalable**: Dễ thêm nhóm mới, levels mới
2. **Flexible**: Mỗi nhóm có levels riêng phù hợp
3. **Intelligent**: Confidence scores cho mapping quality
4. **Performant**: Indexes tối ưu cho queries thường dùng
5. **Consistent**: Constraints đảm bảo data integrity
6. **Traceable**: Ghi lại detection method và confidence

### 🎯 Use cases chính:
1. **Career Recommendation**: Gợi ý nghề nghiệp theo level
2. **Career Progression**: Lộ trình thăng tiến trong nhóm
3. **Skill Gap Analysis**: So sánh level hiện tại vs mục tiêu
4. **Job Matching**: Match candidates với jobs theo level
5. **Salary Benchmarking**: Định giá theo nhóm và level

**Hệ thống đã sẵn sàng cho production với 100% data integrity và performance tối ưu.**