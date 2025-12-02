# 🤖 AI-Core — Mô-đun Trí Tuệ Nhân Tạo cho Hệ thống Gợi ý Nghề nghiệp Cá nhân hóa

### (AI-Based Career Recommendation System)

---

## 📘 Tổng quan

**AI-Core** là mô-đun trung tâm xử lý **Trí tuệ nhân tạo (AI)** cho dự án
🧠 *AI-Based Career Recommendation System* (Hệ thống gợi ý nghề nghiệp cá nhân hóa).

Mục tiêu chính của mô-đun:

* Phân tích **văn bản tự luận (essay)** bằng **PhoBERT / vi-SBERT** để rút ra đặc điểm tâm lý, hành vi.
* Gợi ý **nghề nghiệp phù hợp** dựa trên đặc điểm tính cách **Big Five** + **sở thích RIASEC**.
* Xây dựng **bộ tìm kiếm nghề tương tự** bằng **Vector Retrieval (pgvector)**.
* Xếp hạng & tối ưu gợi ý bằng **NeuMF (Neural Matrix Factorization)** và **Reinforcement Learning (Contextual Bandit)**.

---

## ⚙️ Kiến trúc thư mục

```
ai-core/
├─ src/                         # Source code chính
│  ├─ nlp/                      # NLP: PhoBERT / vi-SBERT cho embedding, inference
│  │  ├─ encode_texts.py
│  │  ├─ infer_traits.py
│  │  └─ tokenizer_utils.py
│  │
│  ├─ retrieval/                # Truy vấn nghề bằng FAISS hoặc pgvector
│  │  ├─ search_pgvector.py
│  │  └─ build_index.py
│  │
│  ├─ recommend/                # Gợi ý nghề nghiệp (NeuMF, RL bandit)
│  │  ├─ rank_neumf.py
│  │  ├─ rl_bandit.py
│  │  └─ utils.py
│  │
│  ├─ utils/                    # Tiện ích chung (log, config, vector ops,…)
│  │  ├─ io_utils.py
│  │  └─ metrics.py
│  │
│  └─ __init__.py
│
├─ configs/                     # Cấu hình mô hình & pipeline
│  ├─ encode.yaml
│  ├─ nlp.yaml
│  └─ schema.yaml
│
├─ models/                      # Mô hình đã huấn luyện (PhoBERT, NeuMF, RL)
│  └─ (bỏ trống / .gitkeep)
│
├─ notebooks/                   # Notebook thử nghiệm & huấn luyện
│  ├─ training_phobert.ipynb
│  ├─ retrieval_indexing.ipynb
│  └─ neumf_experiments.ipynb
│
├─ data/                        # Dữ liệu mẫu hoặc embedding nén
│  ├─ embeddings/
│  ├─ jobs_catalog/
│  └─ ...
│
├─ tests/                       # Unit test cho từng module
│  ├─ test_infer_traits.py
│  ├─ test_search_pgvector.py
│  └─ test_neumf.py
│
├─ pyproject.toml               # Định nghĩa package (PEP 621)
├─ requirements.txt             # Thư viện Python
└─ README.md                    # Tài liệu này
```

---

## 📦 Cài đặt

### Cách 1 — Cài trong nhánh main (được backend import)

```bash
pip install -e ./packages/ai-core
```

### Cách 2 — Chạy độc lập (khi phát triển mô hình)

```bash
python -m venv .venv
source .venv/bin/activate    # hoặc .\.venv\Scripts\activate trên Windows
pip install -r requirements.txt
```

> ⚠️ Gợi ý: giữ mô hình `.pt` / `.bin` trong thư mục riêng và **đừng commit lên Git**
> → Đã có sẵn `.gitignore` cho `models/` và `data/`

---

## 🧠 Chức năng chính

| Module                        | Mục tiêu                                                | Mô tả                                                  |
| ----------------------------- | ------------------------------------------------------- | ------------------------------------------------------ |
| **nlp.encode_texts**          | Trích xuất embedding văn bản bằng **PhoBERT/vi-SBERT**  | Dùng cho retrieval & phân tích bài luận                |
| **nlp.infer_traits**          | Suy luận điểm RIASEC + Big Five từ bài luận             | Model fine-tuned PhoBERT                               |
| **retrieval.search_pgvector** | Tìm nghề tương tự trong **Postgres+pgvector**           | So khớp embedding nghề với người dùng                  |
| **recommend.rank_neumf**      | Xếp hạng nghề bằng **NeuMF**                            | Dựa trên vector nghề và người dùng                     |
| **recommend.rl_bandit**       | Cập nhật & tối ưu gợi ý bằng **Reinforcement Learning** | Contextual Bandit (epsilon-greedy / Thompson sampling) |

---

## 🧪 Ví dụ chạy thử

### 1️⃣ Tạo embedding văn bản

```bash
python -m src.nlp.encode_texts --input data/raw/essays.csv --output data/embeddings/essays.npy
```

### 2️⃣ Gọi PhoBERT infer

```bash
python -m src.nlp.infer_traits --essay "Tôi thích nghiên cứu và giải quyết các vấn đề logic."
```

### 3️⃣ Tìm kiếm nghề tương tự bằng pgvector

```bash
python -m src.retrieval.search_pgvector \
  --db_url "postgresql://postgres:123456@localhost:5433/career_ai" \
  --query_text "phân tích dữ liệu, trực quan hóa BI" \
  --topk 10
```

### 4️⃣ Xếp hạng gợi ý bằng NeuMF

```bash
python -m src.recommend.rank_neumf --user_id 42 --topk 5
```

---

## 🧰 Thư viện sử dụng

| Nhóm           | Thư viện                                         | Mục đích                    |
| -------------- | ------------------------------------------------ | --------------------------- |
| NLP            | `transformers`, `torch`, `sentence-transformers` | PhoBERT, vi-SBERT           |
| ML             | `numpy`, `scikit-learn`, `pandas`                | Tiền xử lý & tính điểm      |
| DB             | `psycopg2`, `sqlalchemy`                         | Kết nối Postgres / pgvector |
| Recommendation | `implicit`, `surprise`                           | NeuMF & CF baseline         |
| RL             | `gymnasium`, `banditpylib`                       | Contextual Bandit           |
| Utility        | `yaml`, `tqdm`, `typer`                          | Cấu hình, CLI, progress     |

---

## 🔬 Môi trường & Cấu hình

File `.env.example`:

```env
DATABASE_URL=postgresql://postgres:123456@localhost:5433/career_ai
AI_MODELS_DIR=./models
DEVICE=cuda
LOG_LEVEL=info
```

File `configs/nlp.yaml` (ví dụ):

```yaml
model_name: vinai/phobert-base
embedding_dim: 768
max_length: 256
batch_size: 16
```

---

## 🧩 Tích hợp với Backend (FastAPI)

Backend có thể gọi trực tiếp:

```python
from ai_core.src.nlp.infer_traits import infer_essay_traits

traits = infer_essay_traits("Tôi thích làm việc nhóm và giao tiếp với mọi người.")
print(traits)
```

> Trong `.env` của backend:
>
> ```
> AI_MODELS_DIR=packages/ai-core/models
> ```

---

## 🧱 Chuẩn hoá & CI

### Lint & Format

```bash
ruff check .
black .
```

### Test

```bash
pytest -q
```

### Cấu hình CI (GitHub Actions)

Tự động kiểm tra:

* Cài dependencies (`pip install -r requirements.txt`)
* Kiểm tra `ruff`, `black`, `pytest`

---

## 🧭 Định hướng phát triển

| Giai đoạn          | Mục tiêu                                        | Mô tả                                           |
| ------------------ | ----------------------------------------------- | ----------------------------------------------- |
| **MVP (hiện tại)** | PhoBERT + NeuMF + pgvector                      | Kết hợp trong nhánh main cùng backend             |
| **Phase 2**        | Tách ai-core thành service riêng (FastAPI/gRPC) | Cho phép scale độc lập inference                |
| **Phase 3**        | RL Online Learning                              | Thu thập feedback người dùng & tối ưu dần gợi ý |
| **Phase 4**        | Fine-tune PhoBERT + NeuMF domain Việt Nam       | Dùng dữ liệu nghề nghiệp mở rộng                |

---

## 📎 Giấy phép

Dự án phát hành theo **Apache License 2.0**
© 2025 - Nhóm Nghiên cứu Khoa học Kỹ sư Phần mềm - Đại học Duy Tân.


---

> 📌 *Mọi thay đổi ở nhánh `AI` sẽ được đồng bộ về nhánh main qua lệnh:*
>
> ```bash
> git subtree pull --prefix=packages/ai-core origin AI --squash
> ```
