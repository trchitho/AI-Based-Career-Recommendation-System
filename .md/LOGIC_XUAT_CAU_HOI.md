# Logic Xuất Câu Hỏi Trắc Nghiệm & Tự Luận

> Tài liệu mô tả toàn bộ luồng xuất câu hỏi từ DB đến client,  
> bao gồm trắc nghiệm (RIASEC / BIG FIVE) và tự luận (Essay Prompt).

---

## 1. Tổng quan kiến trúc

```
Client (FE)
    │
    │  GET /api/assessments/questions/{test_type}?shuffle=true&seed=X&per_dim=4
    │  GET /api/assessments/essay-prompt?lang=vi
    ▼
Router  (routes_assessments.py)
    │
    ▼
Service (service.py → get_questions / essay-prompt)
    │
    ▼
Database
    ├── core.assessment_forms      (metadata form)
    ├── core.assessment_questions  (câu hỏi trắc nghiệm)
    └── core.essay_prompts         (câu hỏi tự luận)
```

---

## 2. Câu hỏi trắc nghiệm

### 2.1 Endpoint

```
GET /api/assessments/questions/{test_type}
```

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `test_type` | path | ✓ | `RIASEC` hoặc `BIGFIVE` / `BIG_FIVE` / `BIG5` |
| `shuffle` | query bool | — | `true` = xáo trộn ngẫu nhiên |
| `seed` | query int | — | Seed cố định để shuffle tái lập được |
| `per_dim` | query int | — | Số câu tối đa mỗi nhãn (dimension) |
| `lang` | query str | — | Lọc theo ngôn ngữ form (`vi`, `en`) |
| `limit` | query int | — | Giới hạn tổng số câu trả về |

**Ví dụ thực tế** (quan sát từ Network tab):
```
GET /api/assessments/questions/RIASEC?shuffle=true&seed=1778220298017&per_dim=4
GET /api/assessments/questions/BIGFIVE?shuffle=true&seed=1778220298018&per_dim=4
```

---

### 2.2 Luồng xử lý chi tiết

```
Bước 1 — Chuẩn hóa test_type
─────────────────────────────
  RIASEC / HOLLAND          → "RIASEC"
  BIGFIVE / BIG_FIVE / BIG5 → "BigFive"

Bước 2 — Tìm form_id
─────────────────────
  SELECT id FROM core.assessment_forms
  WHERE form_type = <db_type>
    AND lang = <lang>  -- nếu có truyền lang

  Hiện tại DB có:
    id=1  code=RIASEC288  form_type=RIASEC   → 288 câu
    id=2  code=BIG5_240   form_type=BigFive  → 240 câu

Bước 3 — Lấy câu hỏi
──────────────────────
  SELECT * FROM core.assessment_questions
  WHERE form_id IN (<form_ids>)
  ORDER BY form_id ASC, question_no ASC

  Kết quả mặc định (không shuffle):
    RIASEC: R1→R48, I1→I48, A1→A48, S1→S48, E1→E48, C1→C48
    BIG5:   O1→O48, C1→C48, E1→E48, A1→A48, N1→N48

Bước 4 — Chuyển đổi sang client format
────────────────────────────────────────
  Mỗi AssessmentQuestion.to_client() trả về:
  {
    "id":            "123",
    "test_type":     "RIASEC",
    "question_text": "Build kitchen cabinets.",
    "question_type": "MULTIPLE_CHOICE",   -- nếu có options
    "options":       ["Strongly Dislike", "Dislike", "Unsure", "Like", "Strongly Like"],
    "dimension":     "R1",                -- = question_key
    "order_index":   1
  }

Bước 5 — Shuffle (nếu shuffle=true)
─────────────────────────────────────
  rng = random.Random(seed)
  rng.shuffle(out)
  → Gán lại order_index = 1, 2, 3, ...

  Lưu ý: seed cố định → cùng seed luôn ra cùng thứ tự
  → Đảm bảo FE và BE đồng bộ khi cần replay

Bước 6 — per_dim sampling (nếu per_dim > 0)
─────────────────────────────────────────────
  Duyệt qua list (đã shuffle hoặc chưa):
    - Lấy ký tự đầu của dimension làm nhãn (R1 → "R", O3 → "O")
    - Đếm số câu đã chọn cho mỗi nhãn
    - Nếu nhãn đó chưa đủ per_dim → thêm vào kết quả
    - Dừng khi TẤT CẢ nhãn đều đủ per_dim

  Ví dụ per_dim=4, RIASEC:
    Kết quả = 4 câu × 6 nhãn = 24 câu tổng

  Ví dụ per_dim=4, BIG5:
    Kết quả = 4 câu × 5 nhãn = 20 câu tổng

Bước 7 — limit (nếu limit > 0)
────────────────────────────────
  out = out[:limit]
  → Cắt sau per_dim, ít dùng khi đã có per_dim

Bước 8 — Gán lại order_index cuối cùng
────────────────────────────────────────
  for idx, item in enumerate(out, start=1):
      item["order_index"] = idx
  → Đảm bảo order_index luôn liên tục từ 1
```

---

### 2.3 Cấu trúc dữ liệu DB

#### core.assessment_forms

| id | code | form_type | lang | total câu |
|----|------|-----------|------|-----------|
| 1 | RIASEC288 | RIASEC | vi | 288 |
| 2 | BIG5_240 | BigFive | vi | 240 |

#### core.assessment_questions

| Cột | Mô tả |
|-----|-------|
| `id` | PK, liên tục 1–528 |
| `form_id` | FK → assessment_forms.id |
| `question_no` | Số thứ tự trong form (1–288 hoặc 1–240) |
| `question_key` | Nhãn + số: R1, R2, ..., R48, I1, ..., N48 |
| `prompt` | Nội dung câu hỏi |
| `options_json` | `{"options": [...5 lựa chọn...], "scale": "RIASEC"/"BigFive"}` |
| `reverse_score` | `true` = câu đảo chiều (cần đảo điểm khi tính) |

#### Phân bổ câu hỏi

**RIASEC (form_id=1) — 288 câu:**

| Nhãn | Ý nghĩa | Câu | Reverse | question_no |
|------|---------|-----|---------|-------------|
| R | Realistic (Thực tế) | 48 | 8 | 1–48 |
| I | Investigative (Nghiên cứu) | 48 | 8 | 49–96 |
| A | Artistic (Nghệ thuật) | 48 | 8 | 97–144 |
| S | Social (Xã hội) | 48 | 8 | 145–192 |
| E | Enterprising (Kinh doanh) | 48 | 8 | 193–240 |
| C | Conventional (Quy củ) | 48 | 8 | 241–288 |

**BIG FIVE (form_id=2) — 240 câu:**

| Nhãn | Ý nghĩa | Câu | Reverse | question_no |
|------|---------|-----|---------|-------------|
| O | Openness (Cởi mở) | 48 | 10 | 1–48 |
| C | Conscientiousness (Tận tâm) | 48 | 10 | 49–96 |
| E | Extraversion (Hướng ngoại) | 48 | 14 | 97–144 |
| A | Agreeableness (Dễ chịu) | 48 | 14 | 145–192 |
| N | Neuroticism (Bất ổn cảm xúc) | 48 | 24 | 193–240 |

---

### 2.4 Cơ chế reverse_score

Câu đảo chiều (`reverse_score = true`) được thiết kế để chống:

| Bias | Mô tả |
|------|-------|
| Acquiescence bias | Người dùng luôn chọn "Đồng ý" |
| Lazy answering | Click hàng loạt không đọc |
| Social desirability | Trả lời theo hướng "đẹp" |

**Ví dụ:**
- Câu thường: *"Build kitchen cabinets."* → chọn "Like" = điểm cao cho R
- Câu đảo: *"Avoid working with tools or machinery."* → chọn "Like" = điểm **thấp** cho R

**Công thức đảo điểm** (thang 5 mức):
```
điểm_thực = (max_scale + 1) - điểm_chọn
           = 6 - điểm_chọn

Ví dụ: chọn 4 (Like) → điểm_thực = 6 - 4 = 2
```

---

### 2.5 Tỷ lệ reverse theo nhãn

| Form | Nhãn | Tổng | Reverse | Tỷ lệ |
|------|------|------|---------|-------|
| RIASEC | Mỗi nhãn | 48 | 8 | 16.7% |
| BIG5 | O | 48 | 10 | 20.8% |
| BIG5 | C | 48 | 10 | 20.8% |
| BIG5 | E | 48 | 14 | 29.2% |
| BIG5 | A | 48 | 14 | 29.2% |
| BIG5 | N | 48 | 24 | 50.0% |

> N có tỷ lệ reverse cao nhất (50%) vì câu "bình thường" đo mức độ lo âu,  
> còn câu reverse đo sự ổn định cảm xúc — cả hai đều cần thiết để đo chính xác.

---

## 3. Câu hỏi tự luận (Essay Prompt)

### 3.1 Endpoint

```
GET /api/assessments/essay-prompt?lang=vi
```

| Tham số | Kiểu | Mô tả |
|---------|------|-------|
| `lang` | query str | Lọc theo ngôn ngữ. Mặc định random toàn bảng |

### 3.2 Luồng xử lý

```
Bước 1 — Query ngẫu nhiên
──────────────────────────
  Nếu có lang:
    SELECT * FROM core.essay_prompts
    WHERE lang = 'vi'
    ORDER BY RANDOM()
    LIMIT 1

    Nếu không tìm thấy → fallback: random toàn bảng

  Nếu không có lang:
    SELECT * FROM core.essay_prompts
    ORDER BY RANDOM()
    LIMIT 1

Bước 2 — Trả về
─────────────────
  {
    "id":          1,
    "title":       "Nghề nghiệp lý tưởng",
    "prompt_text": "Hãy mô tả nghề nghiệp lý tưởng...",
    "lang":        "vi"
  }
```

### 3.3 Cấu trúc DB — core.essay_prompts

| Cột | Mô tả |
|-----|-------|
| `id` | PK, 1–50 |
| `title` | Tiêu đề ngắn |
| `prompt_text` | Nội dung câu hỏi đầy đủ |
| `lang` | Ngôn ngữ (`vi`) |

**50 prompts phân bổ theo 6 nhóm tâm lý:**

| Nhóm | Số lượng | Mục tiêu đo |
|------|----------|-------------|
| Aspirations & Goals | 10 | Openness, Conscientiousness, Enterprising |
| Challenges & Resilience | 10 | Neuroticism, Conscientiousness |
| Creativity & Openness | 8 | Openness, Artistic |
| Teamwork & Leadership | 8 | Extraversion, Agreeableness, Enterprising |
| Future Planning | 8 | Conscientiousness, Openness |
| Values & Ethics | 6 | Agreeableness, Openness |

---

## 4. So sánh hai loại câu hỏi

| Tiêu chí | Trắc nghiệm | Tự luận |
|----------|-------------|---------|
| Số lượng | 288 (RIASEC) + 240 (BIG5) | 50 |
| Cách chọn | Stratified sampling (per_dim) | Random 1 câu |
| Đầu ra | Điểm số từng nhãn | Văn bản → NLP inference |
| Mục đích AI | Input trực tiếp cho NeuMF | PhoBERT / SBERT embedding |
| Thời gian | ~15–30 phút (full) / ~5 phút (per_dim=4) | ~5–10 phút |

---

## 5. Kịch bản sử dụng thực tế

### Kịch bản 1: Bài test nhanh (per_dim=4)
```
GET /api/assessments/questions/RIASEC?shuffle=true&seed=1778&per_dim=4
→ 4 câu × 6 nhãn = 24 câu RIASEC

GET /api/assessments/questions/BIGFIVE?shuffle=true&seed=1779&per_dim=4
→ 4 câu × 5 nhãn = 20 câu BIG5

GET /api/assessments/essay-prompt?lang=vi
→ 1 câu tự luận ngẫu nhiên

Tổng: 24 + 20 + 1 = 45 items
```

### Kịch bản 2: Bài test đầy đủ
```
GET /api/assessments/questions/RIASEC
→ 288 câu RIASEC (không shuffle, không per_dim)

GET /api/assessments/questions/BIGFIVE
→ 240 câu BIG5

Tổng: 528 câu trắc nghiệm
```

### Kịch bản 3: Seed cố định (replay)
```
seed = Date.now()  // FE tạo 1 lần, lưu lại
GET /api/assessments/questions/RIASEC?shuffle=true&seed=<seed>&per_dim=4
→ Cùng seed → cùng thứ tự câu hỏi → có thể tái tạo bài test
```

---

## 6. Constraint DB đảm bảo tính toàn vẹn

| Constraint | Bảng | Mô tả |
|------------|------|-------|
| `assessment_questions_pkey` | assessment_questions | PK trên id |
| `uq_assessment_questions_form_no` | assessment_questions | UNIQUE (form_id, question_no) |
| `assessment_questions_form_id_fkey` | assessment_questions | FK → assessment_forms(id) ON DELETE CASCADE |
| `assessment_responses_question_id_fkey` | assessment_responses | FK → assessment_questions(id) ON DELETE CASCADE |

---

*Tài liệu được tạo tự động từ source code và DB schema thực tế.*  
*Cập nhật lần cuối: 2026-05-08*
