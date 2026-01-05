# CÔNG THỨC TÍNH % MATCH CHO MỖI NGHỀ NGHIỆP

## Tổng quan

% Match hiển thị trên UI (ví dụ: 95% Match, 87% Match) được tính qua **4 giai đoạn** xử lý:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         PIPELINE TÍNH % MATCH                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   STAGE 1    │    │   STAGE 2    │    │   STAGE 3    │    │   STAGE 4    │  │
│  │  Retrieval   │───▶│   Ranking    │───▶│   Bandit     │───▶│  Display     │  │
│  │   (B3)       │    │    (B4)      │    │    (B5)      │    │  Transform   │  │
│  └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘  │
│        │                   │                   │                   │           │
│        ▼                   ▼                   ▼                   ▼           │
│   sim_score           rank_score          final_score        display_match    │
│    (0-1)               (0-1)               (0-1)              (70-95%)        │
│                                                                                │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Stage 1: Retrieval (B3) - Tính `sim_score`

### Mục đích
Tìm các nghề nghiệp có **semantic similarity** cao với essay của user.

### Công thức

```
sim_score = 1 - cosine_distance(user_embedding, career_embedding)
```

Trong đó:
- `user_embedding`: Vector 768D từ vi-SBERT encode essay của user
- `career_embedding`: Vector 768D từ vi-SBERT encode mô tả nghề nghiệp

### Code thực tế

```python
# File: ai_core/retrieval/service_pgvector.py

SELECT job_id,
       1 - (embedding <=> %s::vector(768)) AS score_sim
FROM ai.retrieval_jobs_visbert
ORDER BY embedding <-> %s::vector(768)
LIMIT %s
```

### Giải thích
- `<=>` là toán tử **cosine distance** trong pgvector
- `<->` là toán tử **L2 distance** (dùng cho ORDER BY vì nhanh hơn)
- `sim_score` nằm trong khoảng **[0, 1]**, càng cao càng tương đồng

---

## Stage 2: Ranking (B4) - Tính `rank_score`

### Mục đích
Kết hợp **Content-based** (similarity) và **Collaborative Filtering** (MLP model) để tính điểm xếp hạng.

### Công thức

```
rank_score = α × cf_score + β × sim_score
```

Với:
- **α = 0.7** (trọng số Collaborative Filtering)
- **β = 0.3** (trọng số Similarity)

### Chi tiết từng thành phần

#### 1. `cf_score` - Collaborative Filtering Score

```python
# File: ai_core/ranker/service_neumf.py

# Input features cho MLP model:
user_feats = [essay_embedding_768D, riasec_6D, big5_5D]  # 779D total
item_feats = [career_embedding_768D, riasec_centroid_6D]  # 774D total

# Concatenate và đưa qua MLP
X = concat(user_feats, item_feats)  # ~1553D
logits = MLP(X)
cf_score = sigmoid(logits)  # 0-1
```

#### 2. `sim_score` - Similarity Score
Lấy từ Stage 1 (B3 Retrieval)

### Code thực tế

```python
# File: ai_core/ranker/service_neumf.py

alpha = 0.7  # trọng số CF
beta = 0.3   # trọng số similarity

for cand, cf in zip(valid_cands, cf_scores):
    sim = float(cand.score_sim)
    cf_f = float(cf)
    rank = alpha * cf_f + beta * sim  # CÔNG THỨC CHÍNH
    
    scored.append(ScoredItem(
        job_id=cand.job_id,
        rank_score=rank,
        sim_score=sim,
        cf_score=cf_f,
    ))
```

---

## Stage 3: Bandit (B5) - Tính `final_score`

### Mục đích
Exploration/Exploitation để cân bằng giữa recommend nghề phổ biến vs nghề mới.

### Hiện tại (STUB)
Chưa implement Thompson Sampling, chỉ đơn giản:

```python
final_score = rank_score
```

### Code thực tế

```python
# File: ai_core/recsys/bandit.py

# Bản stub: chưa dùng bandit, chỉ:
# - sort theo rank_score giảm dần
# - final_score = rank_score

for it in items_sorted[:top_k]:
    cid = _get_career_id(it)
    rs = _get_field_float(it, "rank_score") or 0.0
    
    final_items.append(FinalItem(
        career_id=cid,
        final_score=rs,  # bandit stub = rank_score
        rank_score=rs,
    ))
```

---

## Stage 4: Display Transform - Tính `display_match`

### Mục đích
Chuyển đổi `final_score` (0-1) thành **% Match** hiển thị trên UI (70-95%).

### Công thức

```
normalized = (score - min_score) / (max_score - min_score)
display_match = 70.0 + normalized × 25.0
```

### Giải thích
- **Min-Max Normalization**: Chuẩn hóa scores về [0, 1]
- **Scale to 70-95%**: Map về khoảng hiển thị đẹp cho user
- Nghề có score cao nhất → **95%**
- Nghề có score thấp nhất → **70%**

### Code thực tế

```python
# File: apps/backend/app/modules/recommendation/service.py

def _apply_display_match(self, items: List[Dict[str, Any]]) -> None:
    scores = [float(it.get("match_score", 0.0)) for it in items]
    min_s = min(scores)
    max_s = max(scores)

    if max_s <= min_s:
        # Nếu tất cả score bằng nhau → 95%
        for it in items:
            it["display_match"] = 95.0
    else:
        for it in items:
            s = float(it.get("match_score", 0.0))
            normalized = (s - min_s) / (max_s - min_s)
            display = 70.0 + normalized * 25.0
            it["display_match"] = round(display, 1)
```

---

## Tóm tắt Công thức Tổng hợp

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         CÔNG THỨC TÍNH % MATCH                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  1. sim_score = 1 - cosine_distance(user_emb, career_emb)                       │
│                                                                                  │
│  2. cf_score = sigmoid(MLP(concat(user_feats, item_feats)))                     │
│                                                                                  │
│  3. rank_score = 0.7 × cf_score + 0.3 × sim_score                               │
│                                                                                  │
│  4. final_score = rank_score  (bandit stub)                                     │
│                                                                                  │
│  5. display_match = 70 + ((score - min) / (max - min)) × 25                     │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Ví dụ Tính Toán

### Input
- User essay embedding: `[0.1, 0.2, ..., 0.5]` (768D)
- Career "Software Developer" embedding: `[0.15, 0.18, ..., 0.48]` (768D)

### Tính toán

```
Step 1: sim_score
  cosine_distance = 0.15
  sim_score = 1 - 0.15 = 0.85

Step 2: cf_score (từ MLP)
  user_feats = [768D essay_emb, 6D riasec, 5D big5] = 779D
  item_feats = [768D career_emb, 6D riasec_centroid] = 774D
  cf_score = sigmoid(MLP(concat)) = 0.72

Step 3: rank_score
  rank_score = 0.7 × 0.72 + 0.3 × 0.85
             = 0.504 + 0.255
             = 0.759

Step 4: final_score
  final_score = 0.759 (bandit stub)

Step 5: display_match (giả sử min=0.5, max=0.8)
  normalized = (0.759 - 0.5) / (0.8 - 0.5) = 0.863
  display_match = 70 + 0.863 × 25 = 91.6%
```

### Kết quả hiển thị
```
Software Developer - 92% Match
```

---

## Các Yếu tố Ảnh hưởng % Match

| Yếu tố | Trọng số | Nguồn dữ liệu |
|--------|----------|---------------|
| **Collaborative Filtering** | 70% | MLP model học từ user-career interactions |
| **Semantic Similarity** | 30% | Cosine similarity giữa essay và career description |

### Chi tiết User Features (779D)
| Feature | Dimension | Nguồn |
|---------|-----------|-------|
| Essay Embedding | 768D | vi-SBERT encode essay |
| RIASEC Scores | 6D | PhoBERT predict từ essay |
| Big5 Scores | 5D | PhoBERT predict từ essay |

### Chi tiết Item Features (774D)
| Feature | Dimension | Nguồn |
|---------|-----------|-------|
| Career Embedding | 768D | vi-SBERT encode career description |
| RIASEC Centroid | 6D | Trung bình RIASEC của nghề từ O*NET |

---

## Lưu ý Quan trọng

1. **% Match là RELATIVE**: Nghề #1 luôn có ~95%, nghề cuối ~70%
2. **Không phải absolute score**: 95% không có nghĩa là "phù hợp 95%"
3. **Phụ thuộc vào batch**: Cùng 1 nghề có thể có % khác nhau tùy vào các nghề khác trong list
4. **Thompson Sampling chưa implement**: Hiện tại chỉ dùng rank_score trực tiếp
