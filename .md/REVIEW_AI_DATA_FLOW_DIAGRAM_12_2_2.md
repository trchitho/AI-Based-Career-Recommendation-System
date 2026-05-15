# Báo cáo Review: 12.2.2 AI Data Flow Diagram

> **Phiên bản review:** Dựa trên codebase thực tế tại `apps/backend/`  
> **Ngày:** 15/05/2026  
> **Kết luận tổng quan:** Diagram phản ánh đúng kiến trúc tổng thể, nhưng có **7 điểm sai/thiếu** và **5 điểm cần bổ sung** so với code thực tế.

---

## 1. CV Parser (NER Engine)

### Diagram mô tả
- `extract_skills`, `parse_experience`, `normalize_entities`

### Code thực tế
**File:** `app/modules/skill_gap/cv_parser.py`, `cv_parser_v2.py`, `cv_parser_advanced.py`

| Chức năng trong diagram | Trạng thái trong code |
|------------------------|----------------------|
| `extract_skills` | ✅ Đúng — `extract_skills_hybrid()` = keyword matching + Gemini NER |
| `parse_experience` | ✅ Đúng — trích xuất kinh nghiệm từ text |
| `normalize_entities` | ✅ Đúng — normalize về chuẩn O*NET |

**Bổ sung thực tế chưa có trong diagram:**
- `cv_parser_advanced.py` xử lý ảnh CV (OCR, rotation correction, perspective correction, handwriting filter) — **không có trong diagram**
- Có 3 phiên bản parser: basic, v2 (AI-first), advanced (image preprocessing)
- Gemini NER (`extract_skills_with_ai`) là bước chính, keyword matching là fallback

**Đánh giá:** ✅ Đúng về chức năng, ⚠️ Thiếu chi tiết về image preprocessing pipeline

---

## 2. vi-SBERT (Semantic Encoder)

### Diagram mô tả
- `encode_essay`, `generate_embedding`, `mean_pooling`

### Code thực tế
**File:** `app/modules/skill_gap/vector_service.py`, `app/modules/nlp/service_nlp.py`

| Chức năng trong diagram | Trạng thái trong code |
|------------------------|----------------------|
| `encode_essay` | ✅ Đúng — `analyze_and_store()` trong `service_nlp.py` |
| `generate_embedding` | ✅ Đúng — `embed()` trong `vector_service.py` |
| `mean_pooling` | ✅ Đúng — `embed(texts).mean(axis=0)` |

**Model thực tế:**
- Primary: `paraphrase-multilingual-mpnet-base-v2` (768-dim, hỗ trợ tiếng Việt)
- Gọi qua AI-core microservice: `POST {AI_CORE_URL}/ai/encode`
- Fallback: Gemini `text-embedding-004`

**Điểm sai trong diagram:**
- ❌ Diagram vẽ vi-SBERT như một component độc lập, nhưng thực tế nó là **remote service** (AI-core tại `localhost:9000`), không phải local Python module
- ❌ Diagram không thể hiện fallback sang Gemini embedding khi AI-core không khả dụng

**Đánh giá:** ✅ Đúng về chức năng, ❌ Sai về kiến trúc triển khai

---

## 3. pgvector (PostgreSQL Extension)

### Diagram mô tả
- `cosine_similarity`, `l2_distance`, `ivf_index_search`, `top_n_retrieval`

### Code thực tế
**File:** `app/modules/nlp/service_nlp.py`, `app/modules/skill_gap/vector_service.py`

| Chức năng trong diagram | Trạng thái trong code |
|------------------------|----------------------|
| `cosine_similarity` | ✅ Đúng — `1 - (embedding <=> :vec::vector)` |
| `l2_distance` | ⚠️ Có trong pgvector nhưng code dùng cosine, không dùng L2 |
| `ivf_index_search` | ✅ Đúng — IVFFlat index trên `core.skill_vectors` |
| `top_n_retrieval` | ✅ Đúng — `LIMIT :top_k` |

**Thực tế có 3 bảng vector riêng biệt (diagram chỉ vẽ 1):**

| Bảng | Mục đích | Index |
|------|---------|-------|
| `ai.retrieval_jobs_visbert` | Job retrieval (AI-core) | IVFFlat, probes=32 |
| `ai.career_embeddings` | Career semantic search (backend) | **HNSW** (m=16, ef=64) |
| `core.skill_vectors` | Skill similarity (CV pipeline) | IVFFlat, lists=100 |

**Điểm sai trong diagram:**
- ❌ Diagram chỉ vẽ 1 pgvector component, thực tế có **3 bảng vector độc lập**
- ❌ Diagram không thể hiện HNSW index (chỉ đề cập IVF) — thực tế `ai.career_embeddings` dùng HNSW
- ❌ `l2_distance` không được dùng trong code thực tế

**Đánh giá:** ⚠️ Đúng về khái niệm, ❌ Thiếu chi tiết về 3 bảng và HNSW index

---

## 4. Job Embeddings (vi-SBERT, Catalog VN)

### Diagram mô tả
- Bảng: `job_id`, `embedding`, `title_vi`, `title_vn`, `onet_code`

### Code thực tế
**Bảng chính: `ai.retrieval_jobs_visbert`** (AI-core package)

| Cột trong diagram | Trạng thái |
|------------------|-----------|
| `job_id` | ✅ Đúng |
| `embedding` | ✅ Đúng — vector(768) |
| `title_vi` | ✅ Đúng |
| `title_vn` | ❌ Sai — cột thực tế là `title_vi` (không phải `title_vn`) |
| `onet_code` | ✅ Đúng |

**Cột thực tế còn có nhưng diagram thiếu:**
- `tags_vi` — pipe-separated Vietnamese tags
- `tag_tokens` — slug-tokenized tags cho text search
- `riasec_centroid` — 6-element RIASEC vector

**Điểm sai trong diagram:**
- ❌ `title_vn` → thực tế là `title_vi`
- ❌ Thiếu `tags_vi`, `tag_tokens`, `riasec_centroid`

**Đánh giá:** ⚠️ Đúng về cấu trúc, ❌ Sai tên cột `title_vn`

---

## 5. Essay Embedding (768D Vector)

### Diagram mô tả
- `embedding_vector`, `user_id`, `source`, `built_at`

### Code thực tế
**Bảng: `ai.user_embeddings`**

| Cột trong diagram | Trạng thái |
|------------------|-----------|
| `embedding_vector` | ✅ Đúng — cột `emb vector(768)` |
| `user_id` | ✅ Đúng |
| `source` | ✅ Đúng — `'essay'` hoặc `'profile'` |
| `built_at` | ✅ Đúng |

**Luồng tạo embedding:**
1. Essay text → AI-core `POST /ai/infer_user_traits` (PhoBERT) → embedding[768]
2. Fallback: `get_embedding()` → AI-core `POST /ai/encode` → Gemini `text-embedding-004`
3. Lưu vào `ai.user_embeddings` qua `save_essay_traits()` hoặc `store_user_embedding()`

**Điểm sai trong diagram:**
- ❌ Diagram vẽ mũi tên "Extract essay embedding (-768D) from backbone" trực tiếp từ vi-SBERT → Job Embeddings, nhưng thực tế essay embedding được lưu vào `ai.user_embeddings` (bảng riêng), **không phải** vào `ai.retrieval_jobs_visbert`

**Đánh giá:** ✅ Đúng về bảng lưu trữ, ❌ Sai về luồng mũi tên

---

## 6. PhoNLP/PhoBERT NLP Encoder

### Diagram mô tả
- `predict_RIASEC (6D)`, `predict Big Five (5D)`, `tokenize_vietnamese`

### Code thực tế
**File:** `app/modules/nlp/service_nlp.py` (hàm `_analyze_via_aicore()`)

| Chức năng trong diagram | Trạng thái trong code |
|------------------------|----------------------|
| `predict_RIASEC (6D)` | ✅ Đúng — trả về `riasec: [6 floats]` |
| `predict Big Five (5D)` | ✅ Đúng — trả về `big5: [5 floats]` |
| `tokenize_vietnamese` | ✅ Đúng — PhoBERT tokenizer trong AI-core |

**Điểm quan trọng diagram không thể hiện:**
- ❌ PhoBERT **không chạy trong backend Python** — nó là **remote microservice** tại `AI_CORE_URL=http://localhost:9000`
- ❌ Diagram không thể hiện fallback sang Gemini khi AI-core offline
- ❌ Diagram không thể hiện caching (`_essay_cache` với SHA-256 key, max 200 entries)
- ❌ Diagram không thể hiện SLA monitoring: cảnh báo nếu > 1000ms (TC18)

**Đánh giá:** ✅ Đúng về chức năng, ❌ Sai về kiến trúc (local vs remote service)

---

## 7. User Profile Scores (RIASEC 6D + Big Five 5D)

### Diagram mô tả
- `RIASEC scores (6D)`, `Big Five scores (5D)`, `assessment_id`, `created_at`

### Code thực tế
**Bảng:** `core.assessments` (raw), `ai.user_trait_preds` (essay), `ai.user_trait_fused` (fused)

**Luồng tính điểm thực tế (3 nguồn):**

| Nguồn | Trọng số | Lưu tại |
|-------|---------|---------|
| Test RIASEC/Big5 | 70% RIASEC, 60% Big5 | `core.assessments.processed_riasec_scores` |
| Essay (PhoBERT) | 30% RIASEC, 40% Big5 | `ai.user_trait_preds` |
| Voice (Gemini) | Fused vào trait_preds | `ai.user_trait_preds` (source='voice') |
| **Fused** | Kết hợp tất cả | `ai.user_trait_fused` |

**Điểm sai trong diagram:**
- ❌ Diagram chỉ vẽ 1 box "User Profile Scores" — thực tế có **4 bảng** lưu trữ khác nhau
- ❌ Diagram không thể hiện **Voice Analysis** là nguồn thứ 3 cho personality scores
- ❌ Diagram không thể hiện `fuse_user_traits()` — hàm quan trọng blend 3 nguồn

**Đánh giá:** ⚠️ Đúng về khái niệm, ❌ Thiếu chi tiết về fusion pipeline

---

## 8. NeuMF Ranking Layer

### Diagram mô tả
- `skill_relationships`, `mentor_network`, `traverse_graph`

### Code thực tế
**File:** `app/modules/skill_gap/neumf_ranking.py`

> ⚠️ **Lưu ý:** Diagram vẽ NeuMF trong box "Neo4j Graph" — đây là **sai hoàn toàn**. NeuMF là một module Python độc lập, không liên quan đến Neo4j.

**Kiến trúc NeuMF thực tế:**
```
score = sigmoid(GMF_out + MLP_out * 0.5 + importance * 2.0 + feedback_bonus)
GMF: user_vec[:32] ⊙ item_vec[:32] → weighted sum (w_gmf)
MLP: concat(user_vec[:32], item_vec[:32])[:64] → ReLU → dot product
```
- `LATENT_DIM = 32`, `MLP_HIDDEN = 64`
- Weights khởi tạo ngẫu nhiên (chưa có trained model)
- Dùng trong `cv_worker.py` Stage 2 (CV pipeline), **không phải** trong career recommendation pipeline chính

**Điểm sai trong diagram:**
- ❌ NeuMF được vẽ trong box "Neo4j Graph" — **sai hoàn toàn**
- ❌ Diagram mô tả NeuMF với `skill_relationships`, `mentor_network`, `traverse_graph` — đây là chức năng của Neo4j, không phải NeuMF
- ❌ NeuMF thực tế chỉ dùng trong **CV skill gap pipeline**, không phải career recommendation pipeline chính

**Đánh giá:** ❌ Sai vị trí, ❌ Sai chức năng mô tả

---

## 9. Neo4j Graph (Knowledge Base)

### Diagram mô tả
- `career_skill_graph`, `mentor_network`, `traverse_graph`

### Code thực tế
**File:** `app/modules/graph/graph_queries.py`, `app/modules/mentor_matching/graph_gds.py`

**Node types thực tế:**

| Node | Relationships | Mục đích |
|------|--------------|---------|
| `Mentor` | `HAS_SKILL → Skill`, `CAN_GUIDE_FOR → Career` | Mentor matching |
| `Mentee` | `WANTS_SKILL → Skill` | Mentor matching |
| `User` | `INTERESTED_IN → Career`, `COMPLETED_ROADMAP → Career` | Career recommendation |
| `Career` | `REQUIRES → Skill` | Skill gap |
| `Skill` | — | Shared entity |

**Chức năng thực tế:**
- `find_mentors_by_skill_overlap()` — Mentor matching qua graph
- `compute_jaccard_skill_similarity()` — GDS Jaccard similarity
- `compute_mentor_pagerank()` — GDS PageRank cho mentor ranking
- `find_mentors_via_career_path()` — Career path traversal
- `recommend_careers_for_user()` — Collaborative filtering

**Điểm sai trong diagram:**
- ❌ Diagram vẽ Neo4j chứa NeuMF — **sai**
- ❌ Diagram không thể hiện GDS (Graph Data Science) algorithms: Jaccard, PageRank
- ❌ Diagram không thể hiện `learning_roadmap_paths` là relationship type thực tế

**Đánh giá:** ✅ Đúng về vai trò, ❌ Sai về nội dung chi tiết

---

## 10. Thompson Sampling (Beta-Bernoulli)

### Diagram mô tả
- `alpha_params`, `beta_params`, `sample_beta`, `update_feedback`

### Code thực tế
**Có 2 implementations riêng biệt:**

**Implementation 1** — `recommendation/thompson_sampling.py`:
- Bảng: `analytics.career_feedback` (`user_id`, `job_onet`, `alpha`, `beta`)
- `TS_BOOST_WEIGHT = 0.15`
- `apply_boost()` → `match_score + 0.15 × E[θ]`
- Gọi trong `RecService.get_main_recommendations()` Step 7

**Implementation 2** — `skill_gap/thompson_sampling.py`:
- Bảng: `core.feedback_events` (`user_id`, `item_type`, `item_name`, `event_type`)
- `compute_thompson_bonus()` → `(sampled_CTR - 0.5) × 0.3`
- Gọi trong `cv_worker.py` Stage 3

**Đánh giá:** ✅ Đúng về thuật toán, ⚠️ Diagram không thể hiện có 2 implementations

---

## 11. Feedback Logs

### Diagram mô tả
- `user_id`, `job_id`, `action_type`, `timestamp`

### Code thực tế
**3 bảng feedback:**

| Bảng | Mục đích | Cột chính |
|------|---------|----------|
| `analytics.career_feedback` | TS Beta params | `user_id`, `job_onet`, `alpha`, `beta` |
| `analytics.career_events` | ML training data | `user_id`, `job_id`, `event_type`, `rank_pos`, `score_shown`, `dwell_ms` |
| `core.feedback_events` | Skill-level TS | `user_id`, `item_type`, `item_name`, `event_type` |

**Điểm sai trong diagram:**
- ❌ Diagram chỉ vẽ 1 bảng feedback — thực tế có **3 bảng** với mục đích khác nhau
- ❌ `action_type` → thực tế là `event_type` với values: `impression`, `click`, `like`, `dislike`, `save`
- ❌ Thiếu `rank_pos`, `score_shown`, `dwell_ms` — các cột quan trọng cho ML training

**Đánh giá:** ⚠️ Đúng về khái niệm, ❌ Thiếu chi tiết

---

## 12. Final Output (Top-K Jobs + Roadmap)

### Diagram mô tả
- `career_recommendations`, `match_score`, `learning_roadmap`, `explanation`

### Code thực tế
**API endpoint:** `GET /api/recommendations?assessment_id={id}&top_k={k}`  
**Handler:** `recommendation/service.py::RecService.get_main_recommendations()`

**Response thực tế:**
```json
{
  "request_id": "uuid",
  "items": [{
    "career_id": "slug",
    "slug": "software-developer",
    "job_onet": "15-1252.00",
    "title_vi": "...",
    "title_en": "...",
    "description": "...",
    "tags": ["I", "R"],
    "match_score": 0.87,
    "display_match": 82.5,
    "position": 1,
    "ts_boost": 0.023,
    "ts_expected_reward": 0.15,
    "match_score_boosted": 0.893
  }]
}
```

**Điểm sai trong diagram:**
- ❌ `learning_roadmap` — không có trong response của `/api/recommendations`. Roadmap là endpoint riêng: `GET /api/roadmap/{career_id}`
- ❌ `explanation` — không có trong response thực tế (chỉ có `matching_reasons` trong mentor matching)
- ❌ Diagram không thể hiện `display_match` (normalized 70-95%), `ts_boost`, `position`

**Đánh giá:** ⚠️ Đúng về khái niệm, ❌ Sai về cấu trúc response

---

## 13. Gemini Pro API

### Diagram mô tả
- `generate_questions`, `provide_feedback`, `create_explanations`

### Code thực tế
**File:** `app/core/gemini_manager.py` — `MultiStreamGeminiManager` với **4 streams độc lập**

| Stream | API Key | Mục đích thực tế |
|--------|---------|-----------------|
| `CHATBOT` | `GEMINI_CHATBOT_API_KEY` | Chatbot responses |
| `ASSESSMENT` | `GEMINI_ASSESSMENT_API_KEY` | Essay analysis, voice personality |
| `CV_ANALYSIS` | `GEMINI_CV_API_KEY` | CV NER, skill extraction |
| `INTERVIEW` | `GEMINI_INTERVIEW_API_KEY` | Interview questions, feedback |

**Chức năng thực tế:**
1. CV NER: `cv_parser.py::extract_skills_with_ai()`
2. Essay analysis: `service_nlp.py::_analyze_via_gemini()` → RIASEC + Big5
3. Text embedding: `get_embedding()` → `text-embedding-004`
4. Voice analysis: `voice_analyzer.py::analyse_voice()` → multimodal audio
5. Interview: `ai_pipeline_service.py` → câu hỏi phỏng vấn

**Điểm sai trong diagram:**
- ❌ Diagram chỉ vẽ 3 chức năng (`generate_questions`, `provide_feedback`, `create_explanations`) — thực tế có **5 chức năng** khác nhau
- ❌ Diagram không thể hiện 4 streams với 4 API keys riêng biệt
- ❌ Diagram không thể hiện Gemini là **fallback** cho PhoBERT/SBERT, không phải primary

**Đánh giá:** ⚠️ Đúng về vai trò, ❌ Thiếu chi tiết về multi-stream architecture

---

## 14. Voice Analysis

### Diagram mô tả
- `transcribe_audio`, `extract_skills`, `extract_prosodic`, `analyze_sentiment`

### Code thực tế
**File:** `app/modules/assessments/voice_analyzer.py`

| Chức năng trong diagram | Trạng thái trong code |
|------------------------|----------------------|
| `transcribe_audio` | ✅ Đúng — `transcript` trong response |
| `extract_skills` | ❌ Sai — Voice analyzer trích xuất **personality traits** (RIASEC + Big5), không phải skills |
| `extract_prosodic` | ⚠️ Gián tiếp — Gemini phân tích tone, pace, energy |
| `analyze_sentiment` | ⚠️ Gián tiếp — `voice_summary` + `confidence` |

**Luồng thực tế:**
```
Audio bytes → base64 → Gemini multimodal
→ {transcript, big5[5], riasec[6], voice_summary, confidence}
→ save_voice_traits():
    - Assessment.essay_analysis (JSONB)
    - ai.user_trait_preds (source='voice')
    - fuse_user_traits() re-blend
```

**Điểm sai trong diagram:**
- ❌ `extract_skills` — Voice analyzer **không** extract skills, nó extract personality traits
- ❌ Diagram không thể hiện output của Voice Analysis được fuse vào `ai.user_trait_fused`
- ❌ Diagram không thể hiện WebSocket STT (Whisper) là component riêng biệt

**Đánh giá:** ⚠️ Đúng về sự tồn tại, ❌ Sai về chức năng `extract_skills`

---

## Tổng kết đánh giá

### Điểm đúng ✅
1. Kiến trúc tổng thể: CV → Embedding → pgvector → Ranking → Output
2. Sự tồn tại của tất cả các component chính
3. Luồng dữ liệu từ User Input → Assessment → Recommendation
4. Thompson Sampling được tích hợp vào pipeline
5. Neo4j được dùng cho Knowledge Base

### Điểm sai ❌
1. **NeuMF vẽ trong Neo4j box** — NeuMF là Python module độc lập
2. **`title_vn`** trong Job Embeddings — thực tế là `title_vi`
3. **Voice Analysis `extract_skills`** — thực tế là `extract_personality_traits`
4. **PhoBERT/vi-SBERT là local** — thực tế là remote microservice (AI-core)
5. **1 pgvector component** — thực tế có 3 bảng vector riêng biệt
6. **`learning_roadmap` trong Final Output** — Roadmap là endpoint riêng
7. **1 Feedback table** — thực tế có 3 bảng feedback

### Điểm thiếu ⚠️
1. **Gemini multi-stream** (4 API keys, 4 streams)
2. **`fuse_user_traits()`** — hàm blend 3 nguồn personality
3. **GDS algorithms** (Jaccard, PageRank) trong Neo4j
4. **HNSW index** trên `ai.career_embeddings`
5. **Fallback chain**: PhoBERT → SBERT → Gemini
