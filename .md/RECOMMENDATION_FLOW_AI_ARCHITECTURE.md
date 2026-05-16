# Phân Tích Kiến Trúc Recommendation AI

> Tài liệu giải thích các bảng `ai.*`, luồng dữ liệu, ý nghĩa của warning `NeuMF cold-start`, và đề xuất tối ưu.

---

## 1. Ý nghĩa các bảng AI

| Bảng | Mục đích | Số dòng / user | Khi nào ghi |
|------|----------|----------------|-------------|
| `ai.user_embeddings` | Vector 768-d biểu diễn ngữ nghĩa của user (từ essay) | **1 dòng / user** (latest) | Sau khi user submit essay → AI-core encode bằng PhoBERT/SBERT |
| `ai.user_trait_preds` | Dự đoán trait theo **từng nguồn** riêng biệt | **N dòng / user** (1 per source) | Sau mỗi lần test/voice/essay |
| `ai.user_trait_fused` | Trait **tổng hợp** từ tất cả nguồn | **1 dòng / user** | Sau khi `fuse_user_traits` chạy |
| `ai.retrieval_jobs_visbert` | Vector 768-d biểu diễn từng nghề nghiệp (career) | 1 dòng / career | Build offline khi seed nghề |
| `ai.career_embeddings` | Bản dự phòng career vectors (model khác) | 1 dòng / career | Build offline |

### So sánh `user_trait_preds` vs `user_trait_fused`

Bạn hiểu **đúng**: đây là **hai phase khác nhau**.

#### PHASE 1: `ai.user_trait_preds` (Per-source predictions)

- Lưu **dự đoán thô** từ **từng nguồn riêng**
- Mỗi user có thể có **nhiều dòng**, mỗi dòng là 1 source:
  - `source = 'riasec'` — từ test RIASEC truyền thống
  - `source = 'big5'` — từ test Big Five
  - `source = 'essay'` — từ AI phân tích bài luận
  - `source = 'voice'` — từ AI phân tích giọng nói

Ví dụ user_id=31:
```
user_id | source  | riasec_pred              | big5_pred                     | model_name
--------|---------|--------------------------|-------------------------------|------------------
31      | riasec  | [0.41, 0.58, 0.25, ...]  | NULL                          | rule_based
31      | big5    | NULL                     | [0.50, 0.25, 0.66, 0.16, 0.75]| rule_based
31      | essay   | [0.45, 0.62, 0.30, ...]  | [0.55, 0.30, 0.70, 0.20, 0.72]| phobert_768
31      | voice   | [0.40, 0.55, 0.28, ...]  | [0.48, 0.28, 0.68, 0.18, 0.74]| gemini_audio
```

#### PHASE 2: `ai.user_trait_fused` (Fused predictions)

- Lưu **kết quả blend** từ tất cả các source ở Phase 1
- Mỗi user **chỉ có 1 dòng**
- Áp dụng trọng số (weights) để tổng hợp:
  - `essay` thường có weight cao (0.4) vì AI semantic
  - `riasec`/`big5` test có weight 0.3
  - `voice` weight 0.3 nếu có

Ví dụ user_id=31 sau khi fuse:
```
user_id | riasec_fused             | big5_fused                    | confidence | sources
--------|--------------------------|-------------------------------|------------|------------------
31      | [0.43, 0.59, 0.27, ...]  | [0.51, 0.26, 0.68, 0.18, 0.73]| 0.85       | riasec,essay,voice
```

**Ý nghĩa thực tế**:
- Phase 1 (`user_trait_preds`) = "Raw signals" — giữ lại evidence từng nguồn để debug, retrain, audit.
- Phase 2 (`user_trait_fused`) = "Final ground truth" — kết quả dùng để recommend, hiển thị trên UI.

---

## 2. Sơ đồ Liên Kết

```
┌─────────────────────────────────────────────────────────────────────┐
│                         WRITE PIPELINE                               │
│                                                                      │
│  User submit test/essay/voice                                        │
│        │                                                             │
│        ▼                                                             │
│  ┌──────────────────────────────┐                                    │
│  │ 1. PhoBERT/SBERT encode      │ → ai.user_embeddings (vector 768d) │
│  │    (chỉ cho essay)            │                                    │
│  └──────────────────────────────┘                                    │
│        │                                                             │
│        ▼                                                             │
│  ┌──────────────────────────────┐                                    │
│  │ 2. Predict traits per source │ → ai.user_trait_preds              │
│  │    - RIASEC rule-based        │   (1 row per source)               │
│  │    - BigFive rule-based       │                                    │
│  │    - Essay AI inference       │                                    │
│  │    - Voice AI inference       │                                    │
│  └──────────────────────────────┘                                    │
│        │                                                             │
│        ▼                                                             │
│  ┌──────────────────────────────┐                                    │
│  │ 3. fuse_user_traits()        │ → ai.user_trait_fused              │
│  │    Weighted blend tất cả      │   (1 row per user)                 │
│  │    sources hiện có            │                                    │
│  └──────────────────────────────┘                                    │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      RECOMMENDATION PIPELINE                         │
│                                                                      │
│  POST /recs/top_careers (user_id=31)                                 │
│        │                                                             │
│        ▼                                                             │
│  ┌──────────────────────────────────────────────────┐                │
│  │ Step 1: Retrieval (pgvector cosine)              │                │
│  │   ai.user_embeddings (1 vector)                  │                │
│  │   ⨯  ai.retrieval_jobs_visbert (N vectors)       │                │
│  │   = top 50 candidate careers                     │                │
│  └──────────────────────────────────────────────────┘                │
│        │                                                             │
│        ▼                                                             │
│  ┌──────────────────────────────────────────────────┐                │
│  │ Step 2: NeuMF Re-rank (deep learning)            │                │
│  │   Input: user_feats[user_id] + item_feats[job]   │                │
│  │   Output: refined scores                         │                │
│  │                                                  │                │
│  │   ⚠️ COLD-START: user chưa có trong user_feats   │                │
│  │   → fallback dùng retrieval scores               │                │
│  └──────────────────────────────────────────────────┘                │
│        │                                                             │
│        ▼                                                             │
│  ┌──────────────────────────────────────────────────┐                │
│  │ Step 3: Bandit re-rank (stub, chưa active)       │                │
│  └──────────────────────────────────────────────────┘                │
│        │                                                             │
│        ▼                                                             │
│   Top 20 careers → BFF → FE                                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Giải thích Warning `NeuMF cold-start for user_id=31`

### Lỗi bạn thấy

```
[WARN] NeuMF cold-start for user_id=31: user_id=31 không có trong user_feats (len=4)
[INFO] Using retrieval scores for cold-start (deterministic)
```

### Nguyên nhân

NeuMF (Neural Matrix Factorization) là model deep learning được **train offline** với dataset cố định:
- File `data/processed/user_feats.json` — chứa features của các user **lúc training**
- File `data/processed/item_feats.json` — chứa features của các career

**Hiện tại file `user_feats.json` chỉ có 4 user** (`len=4`). Khi user_id=31 (user mới đăng ký gần đây) gọi recommend:
1. NeuMF lookup `user_feats[31]` → **không tìm thấy** → throw `ValueError`
2. System fallback: dùng cosine similarity từ Step 1 (retrieval) làm score cuối

### Tại sao "lần test 2 trở đi" vẫn cold-start?

Ngay cả khi user_id=31 đã có trong 3 bảng:
- `ai.user_embeddings` ✅
- `ai.user_trait_preds` ✅
- `ai.user_trait_fused` ✅

→ **NeuMF vẫn cold-start** vì file `user_feats.json` **không tự update** khi DB thay đổi. File này được build offline bằng script:

```bash
python -m ai_core.recsys.neumf.build_feats_from_db
```

Script này đọc `ai.user_embeddings` → tạo `user_feats.json`. Nhưng nếu không chạy lại, file vẫn giữ nguyên 4 user cũ.

### Kết quả: cold-start KHÔNG sai logic

- Recommendation vẫn hoạt động bình thường (dùng retrieval scores)
- Chất lượng vẫn ổn vì retrieval_jobs_visbert là PhoBERT-based, hiểu ngữ nghĩa Việt
- Chỉ thiếu phần "personalization deep learning" của NeuMF

---

## 4. Đề Xuất Tối Ưu

### A. Auto-rebuild `user_feats.json` định kỳ

Tạo background job chạy mỗi 6 giờ rebuild file features:

```python
# packages/ai-core/scripts/rebuild_features.py
from ai_core.recsys.neumf.build_feats_from_db import build_features

def scheduled_rebuild():
    """Chạy mỗi 6h hoặc trigger sau N user mới."""
    build_features(
        user_path="data/processed/user_feats.json",
        item_path="data/processed/item_feats.json",
    )
```

Tích hợp vào APScheduler (đã có trong backend).

### B. Hot-rebuild khi có user mới

Khi user submit assessment lần đầu → trigger rebuild bất đồng bộ:

```python
# apps/backend/app/modules/assessments/service.py
from threading import Thread

def save_results(...):
    # ... existing code ...
    
    # Trigger NeuMF feature rebuild in background
    if is_first_assessment(user_id):
        Thread(target=trigger_ai_core_rebuild, daemon=True).start()
```

### C. NeuMF online learning (advanced)

Thay vì rebuild toàn bộ, support **incremental update**:
- Lưu user features trực tiếp vào Redis cache
- NeuMF infer.py đọc cache → fallback sang file
- Cập nhật cache mỗi khi user submit data mới

### D. Retrieval cải thiện

Hiện tại `retrieval_jobs_visbert` chỉ dùng PhoBERT 768d. Có thể nâng cấp:

1. **Hybrid retrieval**:
   - PhoBERT semantic (đã có)
   - + BM25 keyword (cho exact match skill)
   - Reranking bằng cross-encoder

2. **Trait-aware retrieval**:
   - Hiện tại chỉ dùng `user_embeddings.emb`
   - Thêm filter/boost theo `user_trait_fused.riasec_fused` để tăng độ phù hợp

3. **Career embedding versioning**:
   - Thêm cột `model_version` vào `retrieval_jobs_visbert`
   - Khi đổi model PhoBERT → tự re-embed all careers

### E. Cache layer

Trên log thấy nhiều `POST /recs/top_careers HTTP/1.1 200 OK` cho cùng 1 user → cache 5-10 phút:

```python
# routes_recs.py
@router.post("/top_careers")
@cache(expire=600)  # 10 min
def top_careers(req: TopCareersRequest):
    ...
```

---

## 5. Tại sao luồng cần `user_embeddings` + `user_trait_*`?

Bạn hỏi: "nạp vào 3 bảng đều embedding vector người dùng ra để làm gì?"

Thực ra **3 bảng phục vụ 3 mục đích khác nhau**:

| Bảng | Format | Phục vụ |
|------|--------|---------|
| `user_embeddings.emb` | `vector(768)` — semantic | **Retrieval**: tìm career có ngữ nghĩa gần — pgvector cosine search |
| `user_trait_preds.riasec_pred` | `real[6]` — 6 chiều RIASEC | **Audit & retrain**: giữ raw signals từng source |
| `user_trait_fused.riasec_fused` | `real[6]` — 6 chiều RIASEC | **UI display & filter**: hiển thị "Top RIASEC: Investigative 58%", filter career theo RIASEC |

**Lý do tách 3 bảng**:
1. **Granularity khác nhau**:
   - 1 user = 1 vector embedding (essay mới nhất)
   - 1 user = N predictions (mỗi source 1 dòng)
   - 1 user = 1 fused trait (final)

2. **Update frequency khác nhau**:
   - `user_embeddings`: chỉ update khi viết essay mới
   - `user_trait_preds`: append mỗi lần test
   - `user_trait_fused`: update mỗi khi có source mới

3. **Use case khác nhau**:
   - Retrieval (vector search) cần dimensionality cao
   - Trait display cần dimensionality thấp + interpretable

---

## 6. Có cần sửa code không?

### Cần sửa NGAY (high priority)

1. **Auto-rebuild `user_feats.json`** — bug khiến NeuMF không bao giờ active cho user mới
   - File: `packages/ai-core/src/ai_core/recsys/neumf/build_feats_from_db.py`
   - Thêm scheduled job hoặc trigger khi có user mới

2. **Cache `/recs/top_careers`** — log cho thấy nhiều request lặp lại
   - File: `packages/ai-core/src/api/routes_recs.py`
   - Thêm Redis cache key=`(user_id, top_k)`, TTL 10 min

### Nên sửa (medium priority)

3. **Đổi "warning" thành "info"** cho cold-start — đây là behavior chấp nhận được, không phải lỗi
   - File: `packages/ai-core/src/api/routes_recs.py:77`
   - Đổi `print(f"[WARN] NeuMF cold-start...")` → `logger.info(...)`

4. **Track cold-start metric** — theo dõi % user đang phải cold-start để biết khi nào cần rebuild
   - Thêm Prometheus counter `neumf_cold_start_total`

### Không cần sửa (low priority)

5. Retrieval pipeline hiện tại ổn — fallback đã đảm bảo recommend không bao giờ fail.

---

## 7. Tóm tắt

- ✅ Logic 3 bảng AI là **đúng và khoa học**
- ✅ Phase 1 (`user_trait_preds`) vs Phase 2 (`user_trait_fused`) — bạn hiểu đúng
- ⚠️ Cần auto-rebuild `user_feats.json` để NeuMF active được cho user mới
- ⚠️ Nên thêm cache cho `/recs/top_careers`
- ✅ Cold-start fallback hiện tại an toàn — không gây lỗi cho user
