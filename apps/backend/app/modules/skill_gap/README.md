# Skill Gap Analysis Module

## Tổng quan
Module phân tích lỗ hổng kỹ năng (Skill Gap Analysis) giúp người dùng:
- Upload CV và trích xuất kỹ năng tự động
- So sánh với yêu cầu công việc từ Neo4j
- Hiển thị heatmap trực quan
- Chuẩn bị dữ liệu cho AI phỏng vấn

## Kiến trúc

### Backend (Python/FastAPI)
```
skill_gap/
├── __init__.py
├── cv_parser.py          # Trích xuất kỹ năng từ CV (PDF/DOCX)
├── graph_analyzer.py     # So sánh với Neo4j
├── models.py             # Database models
├── schemas.py            # Pydantic schemas
├── service.py            # Business logic
└── routes.py             # API endpoints
```

### Frontend (React/TypeScript)
```
components/skillgap/
├── CVUploadForm.tsx      # Form upload CV
├── SkillGapResult.tsx    # Hiển thị kết quả
└── SkillHeatmap.tsx      # Visualization heatmap

pages/
└── SkillGapPage.tsx      # Trang chính
```

## Cài đặt

### 1. Backend Dependencies
```bash
cd apps/backend
pip install -r requirements_skill_gap.txt
```

### 2. Database Migration
```bash
psql -U postgres -d career_ai -f migrations/create_skill_gap_table.sql
```

### 3. Khởi động Backend
```bash
uvicorn app.main:app --reload
```

### 4. Frontend
```bash
cd apps/frontend
npm install
npm run dev
```

## API Endpoints

### 1. Upload CV và Phân tích
```http
POST /api/skill-gap/analyze
Content-Type: multipart/form-data

Form Data:
- career_id: string (ID nghề nghiệp)
- cv_file: file (PDF hoặc DOCX)

Response:
{
  "success": true,
  "data": {
    "analysis_id": 123,
    "match_percentage": 75.5,
    "matched_skills": [...],
    "skill_gaps": {
      "critical": [...],
      "important": [...],
      "nice_to_have": [...]
    }
  }
}
```

### 2. Lấy danh sách phân tích
```http
GET /api/skill-gap/my-analyses?limit=10

Response: SkillGapAnalysis[]
```

### 3. Chi tiết phân tích
```http
GET /api/skill-gap/analysis/{analysis_id}

Response: SkillGapAnalysis
```

### 4. Dữ liệu Heatmap
```http
GET /api/skill-gap/heatmap/{analysis_id}

Response: {
  "nodes": [...],
  "links": [...],
  "match_percentage": 75.5,
  "legend": {...}
}
```

### 5. Dữ liệu cho AI Phỏng vấn
```http
GET /api/skill-gap/interview-prep/{analysis_id}

Response: {
  "focus_areas": {
    "critical_gaps": [...],
    "matched_skills": [...]
  },
  "suggested_questions": [...],
  "interview_strategy": {...}
}
```

## Sử dụng

### 1. Upload CV
```typescript
import { skillGapService } from '@/services/skillGapService';

const file = document.getElementById('cv-input').files[0];
const result = await skillGapService.analyzeCV('software-engineer', file);
console.log('Match:', result.data.match_percentage);
```

### 2. Hiển thị Heatmap
```tsx
import SkillHeatmap from '@/components/skillgap/SkillHeatmap';

const heatmapData = await skillGapService.getHeatmapData(analysisId);
<SkillHeatmap data={heatmapData} />
```

### 3. Chuẩn bị Phỏng vấn
```typescript
const prepData = await skillGapService.getInterviewPrepData(analysisId);
// Sử dụng prepData.focus_areas.critical_gaps để tạo câu hỏi phỏng vấn
```

## Màu sắc Heatmap

- 🟢 **Xanh (#10b981)**: Kỹ năng đã có (Matched)
- 🔴 **Đỏ (#ef4444)**: Lỗ hổng quan trọng (Critical Gap)
- 🟠 **Cam (#f59e0b)**: Lỗ hổng cần bổ sung (Important Gap)
- 🟡 **Vàng (#eab308)**: Kỹ năng khuyến nghị (Nice-to-have)

## Tích hợp với AI Phỏng vấn

Dữ liệu từ `/interview-prep/{analysis_id}` được chuẩn bị sẵn để đưa vào AI:

```json
{
  "focus_areas": {
    "critical_gaps": [
      {
        "name": "Python",
        "category": "Programming Language",
        "importance": 0.9
      }
    ]
  },
  "suggested_questions": [
    {
      "skill": "Python",
      "question_type": "deep_dive",
      "sample_question": "Can you explain your experience with Python?"
    }
  ]
}
```

AI sẽ sử dụng `critical_gaps` để tạo câu hỏi xoáy sâu vào các kỹ năng còn thiếu.

## Mở rộng

### 1. Thêm kỹ năng mới
Cập nhật `STANDARD_SKILLS` trong `cv_parser.py`:
```python
STANDARD_SKILLS = {
    'python', 'java', 'javascript',
    # Thêm kỹ năng mới
    'rust', 'elixir', 'haskell'
}
```

### 2. Tích hợp PhoBERT (NER)
Thay thế regex matching bằng PhoBERT để trích xuất kỹ năng chính xác hơn:
```python
from transformers import AutoTokenizer, AutoModel

tokenizer = AutoTokenizer.from_pretrained("vinai/phobert-base")
model = AutoModel.from_pretrained("vinai/phobert-base")
```

### 3. Tích hợp vi-SBERT
Sử dụng vi-SBERT để tính độ tương đồng giữa kỹ năng:
```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('keepitreal/vietnamese-sbert')
similarity = model.similarity(skill1, skill2)
```

## Testing

### Backend
```bash
pytest apps/backend/tests/test_skill_gap.py
```

### Frontend
```bash
npm test -- SkillGapPage
```

## Troubleshooting

### Lỗi: "No skill requirements found"
- Kiểm tra Neo4j có dữ liệu kỹ năng cho career_id không
- Chạy query test: `MATCH (c:Career {id: 'software-engineer'})-[:REQUIRES_SKILL]->(s) RETURN s`

### Lỗi: "Failed to extract PDF"
- Kiểm tra file PDF có bị mã hóa không
- Thử convert PDF sang text trước: `pdftotext file.pdf`

### Heatmap không hiển thị
- Kiểm tra console log có lỗi SVG không
- Đảm bảo `nodes` và `links` có dữ liệu

## Roadmap

- [ ] Tích hợp PhoBERT cho NER
- [ ] Tích hợp vi-SBERT cho similarity
- [ ] Hỗ trợ DOCX parsing
- [ ] Export PDF report
- [ ] Learning resource recommendations
- [ ] Skill trend analysis
- [ ] Multi-language support

## License
MIT
