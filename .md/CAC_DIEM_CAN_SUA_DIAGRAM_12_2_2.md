# Các điểm cần sửa & bổ sung — Diagram 12.2.2 AI Data Flow

> **Mức độ:** 🔴 Sai (cần sửa ngay) | 🟡 Thiếu (cần bổ sung) | 🟢 Cải thiện (nên thêm)

---

## 🔴 SỬA NGAY — 7 điểm sai so với code thực tế

---

### SỬA 1: Di chuyển NeuMF ra khỏi Neo4j box

**Vấn đề:**  
Diagram vẽ NeuMF Ranking Layer **bên trong** box Neo4j Graph Knowledge Base với các chức năng `skill_relationships`, `mentor_network`, `traverse_graph` — đây là chức năng của Neo4j, không phải NeuMF.

**Thực tế:**  
NeuMF là module Python độc lập tại `app/modules/skill_gap/neumf_ranking.py`, chạy hoàn toàn trong backend Python, không liên quan đến Neo4j.

**Cách sửa:**  
- Tách NeuMF thành box riêng biệt
- Đặt NeuMF trong luồng CV Pipeline: `vi-SBERT → NeuMF → Thompson Sampling`
- Cập nhật mô tả NeuMF:
  ```
  NeuMF Ranking (Python)
  - score = sigmoid(GMF + MLP + importance_bias)
  - GMF: user_vec ⊙ item_vec (LATENT_DIM=32)
  - MLP: concat → ReLU → scalar
  - Input: CV embedding + job skill embeddings
  ```
- Neo4j box giữ nguyên với: `Mentor nodes`, `Career nodes`, `Skill nodes`, `GDS Jaccard`, `GDS PageRank`

---

### SỬA 2: Đổi `title_vn` → `title_vi` trong Job Embeddings

**Vấn đề:**  
Box "Job Embeddings (vi-SBERT, Catalog VN)" liệt kê cột `title_vn`.

**Thực tế:**  
Bảng `ai.retrieval_jobs_visbert` có cột `title_vi` (không phải `title_vn`). Toàn bộ codebase đã migrate sang `_vi` suffix cho bảng `careers` và các bảng liên quan.

**Cách sửa:**  
```
Job Embeddings (ai.retrieval_jobs_visbert)
- job_id
- embedding (vector 768D)
- title_vi          ← đổi từ title_vn
- tags_vi           ← thêm mới
- riasec_centroid   ← thêm mới
- onet_code
```

---

### SỬA 3: Sửa chức năng Voice Analysis

**Vấn đề:**  
Box "Voice Analysis" liệt kê `extract_skills` — đây là sai.

**Thực tế:**  
`voice_analyzer.py` trích xuất **personality traits** (RIASEC + Big5), không phải skills. Skills được trích xuất bởi CV Parser.

**Cách sửa:**  
```
Voice Analysis (Gemini Multimodal)
- transcribe_audio       ← giữ nguyên
- predict_RIASEC (6D)    ← đổi từ extract_skills
- predict_Big5 (5D)      ← thêm mới
- analyze_prosodic       ← đổi từ extract_prosodic
- confidence_score       ← thêm mới
```

---

### SỴA 4: Thể hiện PhoBERT/vi-SBERT là Remote Service

**Vấn đề:**  
Diagram vẽ vi-SBERT và PhoBERT như các component local trong backend, với mũi tên trực tiếp.

**Thực tế:**  
Cả hai đều là **remote microservice** tại `AI_CORE_URL=http://localhost:9000`:
- `POST /ai/encode` → SBERT embedding
- `POST /ai/infer_user_traits` → PhoBERT RIASEC + Big5

**Cách sửa:**  
- Thêm box "AI-Core Microservice (localhost:9000)" bao quanh vi-SBERT và PhoBERT
- Thêm mũi tên HTTP request/response
- Thêm "Gemini Fallback" khi AI-Core offline:
  ```
  AI-Core (localhost:9000)
  ├── vi-SBERT: POST /ai/encode
  └── PhoBERT: POST /ai/infer_user_traits
  
  Fallback (khi AI-Core offline):
  └── Gemini text-embedding-004
  ```

---

### SỬA 5: Tách pgvector thành 3 bảng riêng biệt

**Vấn đề:**  
Diagram vẽ pgvector như 1 component duy nhất.

**Thực tế:**  
Có 3 bảng vector độc lập với mục đích khác nhau:

| Bảng | Index | Mục đích |
|------|-------|---------|
| `ai.retrieval_jobs_visbert` | IVFFlat (probes=32) | Job retrieval (AI-core) |
| `ai.career_embeddings` | **HNSW** (m=16, ef=64) | Career semantic search |
| `core.skill_vectors` | IVFFlat (lists=100) | Skill similarity |

**Cách sửa:**  
Tách pgvector thành 3 sub-components hoặc thêm label cho từng bảng. Đặc biệt ghi rõ `ai.career_embeddings` dùng **HNSW index** (không phải IVFFlat).

---

### SỬA 6: Tách Roadmap ra khỏi Final Output

**Vấn đề:**  
Box "Final Output" liệt kê `learning_roadmap` như một phần của response `/api/recommendations`.

**Thực tế:**  
`/api/recommendations` **không trả về roadmap**. Roadmap là endpoint riêng biệt:
- `GET /api/roadmap/{career_id}` — lấy roadmap cho 1 nghề
- `GET /api/learning-path/` — lấy learning path của user

**Cách sửa:**  
```
Final Output (/api/recommendations)
- career_recommendations[]
- match_score (raw)
- display_match (70-95%, normalized)
- ts_boost (Thompson Sampling bonus)
- position (rank)
- tags (RIASEC codes)

[Tách riêng] Learning Roadmap (/api/roadmap/{id})
- milestones[]
- skill_path[]
- progress_percentage
```

---

### SỬA 7: Cập nhật Feedback Logs thành 3 bảng

**Vấn đề:**  
Diagram vẽ 1 box "Feedback Logs" với `user_id`, `job_id`, `action_type`, `timestamp`.

**Thực tế:**  
Có 3 bảng feedback với mục đích khác nhau:

**Cách sửa:**  
```
Feedback System
├── analytics.career_feedback (Thompson Sampling)
│   - user_id, job_onet, alpha, beta
│
├── analytics.career_events (ML Training Data)
│   - user_id, job_id, event_type
│   - rank_pos, score_shown, dwell_ms
│
└── core.feedback_events (Skill-level TS)
    - user_id, item_type, item_name
    - event_type: impression/click/like/dislike
```

---

## 🟡 BỔ SUNG — 5 điểm thiếu quan trọng

---

### BỔ SUNG 1: Thêm `fuse_user_traits()` Pipeline

**Thiếu gì:**  
Diagram không thể hiện quá trình **fusion** 3 nguồn personality traits.

**Thực tế:**  
`assessments/service.py::fuse_user_traits()` blend:
- Test RIASEC (70%) + Essay RIASEC (30%)
- Test Big5 (60%) + Essay Big5 (40%)
- Voice traits (fused vào essay slot)

**Cần thêm vào diagram:**  
```
Trait Fusion Layer
├── Input 1: Test scores (core.assessments) — weight 70%/60%
├── Input 2: Essay traits (ai.user_trait_preds) — weight 30%/40%
├── Input 3: Voice traits (ai.user_trait_preds, source='voice')
└── Output: ai.user_trait_fused → core.users (denormalized)
```

---

### BỔ SUNG 2: Thêm Gemini Multi-Stream Architecture

**Thiếu gì:**  
Diagram vẽ Gemini như 1 component duy nhất.

**Thực tế:**  
`MultiStreamGeminiManager` có 4 streams với 4 API keys riêng biệt để quản lý quota:

**Cần thêm vào diagram:**  
```
Gemini Pro API (Multi-Stream)
├── Stream 1: CHATBOT (GEMINI_CHATBOT_API_KEY)
│   └── Chatbot responses
├── Stream 2: ASSESSMENT (GEMINI_ASSESSMENT_API_KEY)
│   └── Essay analysis, Voice personality
├── Stream 3: CV_ANALYSIS (GEMINI_CV_API_KEY)
│   └── CV NER, skill extraction, name extraction
└── Stream 4: INTERVIEW (GEMINI_INTERVIEW_API_KEY)
    └── Interview questions, feedback
```

---

### BỔ SUNG 3: Thêm GDS Algorithms trong Neo4j

**Thiếu gì:**  
Diagram không thể hiện Graph Data Science algorithms.

**Thực tế:**  
`app/modules/mentor_matching/graph_gds.py` sử dụng:
- `gds.nodeSimilarity.stream` → Jaccard similarity giữa Mentor nodes
- `gds.pageRank.stream` → PageRank score cho mentor influence
- `find_mentors_via_career_path()` → Career path traversal

**Cần thêm vào diagram:**  
```
Neo4j Graph (Knowledge Base)
├── Nodes: Mentor, Mentee, User, Career, Skill
├── Relationships: HAS_SKILL, WANTS_SKILL, REQUIRES, CAN_GUIDE_FOR
├── GDS: Jaccard Similarity (skill overlap)
├── GDS: PageRank (mentor influence)
└── Traversal: Career path (1-2 hops)
```

---

### BỔ SUNG 4: Thêm Fallback Chain

**Thiếu gì:**  
Diagram không thể hiện cơ chế fallback khi các AI services không khả dụng.

**Thực tế:**  
Có 3 tầng fallback:

**Cần thêm vào diagram:**  
```
AI Service Fallback Chain:
1. PhoBERT (AI-Core) → SBERT (AI-Core) → Gemini text-embedding-004
2. AI-Core /recs/top_careers → Saved DB recommendations → Catalog fallback
3. Gemini primary model → gemini-flash-latest → gemini-2.5-flash → gemini-2.0-flash
```

---

### BỔ SUNG 5: Thêm Caching Layer

**Thiếu gì:**  
Diagram không thể hiện caching.

**Thực tế:**  
Có 3 tầng cache:
- **Redis**: Career catalog cache (TTL 12h), `career:v11:{code}:{plan}:vi`
- **In-memory**: `_memory_cache` dict (max 512 items, TTL 12h) trong `bff_career.py`
- **Essay cache**: `_essay_cache` dict (max 200 items, SHA-256 key) trong `service_nlp.py`

**Cần thêm vào diagram:**  
```
Caching Layer
├── Redis (TTL 12h): Career BFF responses
├── In-memory (512 items): Career detail pages
└── Essay cache (200 items): PhoBERT/Gemini analysis results
```

---

## 🟢 CẢI THIỆN — 3 điểm nên thêm để diagram hoàn chỉnh hơn

---

### CẢI THIỆN 1: Thêm SLA Monitoring

Code có TC18 (essay analysis SLA 1000ms) và TC19 (pgvector search SLA 5000ms). Nên thêm vào diagram để thể hiện production readiness.

---

### CẢI THIỆN 2: Thêm WebSocket STT (Whisper)

`app/api/ws_stt.py` + `interview/faster_stt_service.py` — Whisper model cho Speech-to-Text trong voice interview. Đây là component riêng biệt với Voice Analysis (Gemini).

```
Voice Pipeline
├── WebSocket STT (Whisper/faster-whisper) → transcript text
└── Voice Personality (Gemini multimodal) → RIASEC + Big5
```

---

### CẢI THIỆN 3: Thêm `display_match` Normalization

`RecService._apply_display_match()` normalize `match_score` về range 70-95% để hiển thị cho user. Nên thể hiện trong diagram để giải thích tại sao % match luôn trong khoảng 70-95%.

```
display_match = 70.0 + (score - min_score) / (max_score - min_score) × 25.0
```

---

## Tóm tắt ưu tiên sửa

| Ưu tiên | Điểm cần sửa | Mức độ ảnh hưởng |
|---------|-------------|-----------------|
| 🔴 P1 | NeuMF ra khỏi Neo4j box | Sai kiến trúc nghiêm trọng |
| 🔴 P1 | PhoBERT/SBERT là remote service | Sai kiến trúc nghiêm trọng |
| 🔴 P2 | `title_vn` → `title_vi` | Sai tên cột DB |
| 🔴 P2 | Voice Analysis: `extract_skills` → `predict_personality` | Sai chức năng |
| 🔴 P3 | Tách Roadmap ra khỏi Final Output | Sai API response |
| 🟡 P3 | Thêm `fuse_user_traits()` | Thiếu component quan trọng |
| 🟡 P3 | Thêm Gemini multi-stream | Thiếu chi tiết kiến trúc |
| 🟡 P4 | Tách pgvector thành 3 bảng | Thiếu chi tiết |
| 🟡 P4 | Thêm GDS algorithms | Thiếu chi tiết Neo4j |
| 🟢 P5 | Thêm Fallback Chain | Cải thiện |
| 🟢 P5 | Thêm Caching Layer | Cải thiện |
