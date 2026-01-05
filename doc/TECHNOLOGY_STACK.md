# 04. TECHNOLOGY STACK - Chi tiết Công nghệ Sử dụng

## Tổng quan Kiến trúc

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    FRONTEND                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   React     │  │ TypeScript  │  │ Tailwind    │  │    Vite     │  │  React      │   │
│  │   18.2      │  │    5.3      │  │  CSS 3.3    │  │    5.0      │  │  Query 5    │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          │ REST API / WebSocket
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    BACKEND                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │  FastAPI    │  │  SQLAlchemy │  │   Pydantic  │  │   Uvicorn   │  │   PyJWT     │   │
│  │   0.104     │  │    2.0      │  │    2.5      │  │   0.23      │  │    2.9      │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          │ Internal API (Port 9000)
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    AI-CORE                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   PyTorch   │  │Transformers │  │  PhoBERT    │  │  vi-SBERT   │  │  pgvector   │   │
│  │    2.2+     │  │    4.44     │  │  (NLP)      │  │  (Embed)    │  │  (Search)   │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          │ SQL + Vector Search
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    DATABASE                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                    PostgreSQL 15 + pgvector extension                            │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │   │
│  │  │ core schema │  │  ai schema  │  │  analytics  │  │   chatbot   │             │   │
│  │  │ (business)  │  │  (vectors)  │  │  (events)   │  │  (history)  │             │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘             │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          │ Container Orchestration
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    DEVOPS                                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                    │
│  │   Docker    │  │   Docker    │  │   GitHub    │  │    Redis    │                    │
│  │  Compose    │  │  (Images)   │  │   Actions   │  │   (Cache)   │                    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘                    │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. FRONTEND TECHNOLOGIES

### 1.1 React 18.2

| Aspect | Detail |
|--------|--------|
| **Công nghệ** | React 18.2 |
| **Vai trò** | UI Library chính |
| **Lý do chọn** | - Component-based architecture<br>- Virtual DOM cho performance<br>- Huge ecosystem & community<br>- React 18 có Concurrent Features |

**Tại sao không chọn:**
- **Vue.js**: Ecosystem nhỏ hơn, ít thư viện UI
- **Angular**: Quá nặng cho project này, learning curve cao
- **Svelte**: Community nhỏ, ít resources

### 1.2 TypeScript 5.3

| Aspect | Detail |
|--------|--------|
| **Công nghệ** | TypeScript 5.3 |
| **Vai trò** | Type-safe JavaScript |
| **Lý do chọn** | - Catch errors at compile time<br>- Better IDE support (autocomplete)<br>- Self-documenting code<br>- Easier refactoring |

**Tại sao không chọn JavaScript thuần:**
- Không có type checking → bugs khó phát hiện
- Khó maintain khi project lớn
- IDE support kém hơn

### 1.3 Tailwind CSS 3.3

| Aspect | Detail |
|--------|--------|
| **Công nghệ** | Tailwind CSS 3.3 |
| **Vai trò** | Utility-first CSS framework |
| **Lý do chọn** | - Rapid prototyping<br>- No CSS file switching<br>- Consistent design system<br>- Small bundle size (purge unused) |

**Tại sao không chọn:**
- **Bootstrap**: Opinionated design, khó customize
- **Material UI**: Bundle size lớn, design cố định
- **CSS thuần**: Tốn thời gian, không consistent

### 1.4 Vite 5.0

| Aspect | Detail |
|--------|--------|
| **Công nghệ** | Vite 5.0 |
| **Vai trò** | Build tool & Dev server |
| **Lý do chọn** | - Instant HMR (Hot Module Replacement)<br>- Native ES modules<br>- 10-100x faster than Webpack<br>- Zero config |

**Tại sao không chọn:**
- **Webpack**: Chậm, config phức tạp
- **Create React App**: Deprecated, chậm
- **Parcel**: Ít features hơn Vite

### 1.5 React Query (TanStack Query) 5

| Aspect | Detail |
|--------|--------|
| **Công nghệ** | @tanstack/react-query 5.12 |
| **Vai trò** | Server state management |
| **Lý do chọn** | - Automatic caching<br>- Background refetching<br>- Optimistic updates<br>- Pagination/infinite scroll built-in |

**Tại sao không chọn:**
- **Redux**: Boilerplate nhiều, không tối ưu cho server state
- **SWR**: Ít features hơn React Query
- **Apollo Client**: Chỉ cho GraphQL

### 1.6 Các thư viện Frontend khác

| Library | Version | Vai trò |
|---------|---------|---------|
| `react-router-dom` | 6.20 | Client-side routing |
| `axios` | 1.6 | HTTP client |
| `recharts` | 2.15 | Charts (Spider, Bar) |
| `i18next` | 25.6 | Internationalization (VI/EN) |
| `lucide-react` | 0.546 | Icons |
| `@headlessui/react` | 2.2 | Accessible UI components |
| `socket.io-client` | 4.6 | Real-time communication |

---

## 2. BACKEND TECHNOLOGIES

### 2.1 Python 3.11

| Aspect | Detail |
|--------|--------|
| **Công nghệ** | Python 3.11 |
| **Vai trò** | Backend programming language |
| **Lý do chọn** | - Best for AI/ML integration<br>- Rich ecosystem (PyTorch, Transformers)<br>- Fast development<br>- 3.11 có performance improvements |

**Tại sao không chọn:**
- **Node.js**: Khó integrate với PyTorch/Transformers
- **Java**: Verbose, slow development
- **Go**: Ít thư viện ML

### 2.2 FastAPI 0.104

| Aspect | Detail |
|--------|--------|
| **Công nghệ** | FastAPI 0.104 |
| **Vai trò** | Web framework |
| **Lý do chọn** | - Async support native<br>- Auto-generated OpenAPI docs<br>- Type hints với Pydantic<br>- Performance cao (Starlette-based) |

**Tại sao không chọn:**
- **Django**: Quá nặng, không async native
- **Flask**: Không có type validation built-in
- **Express.js**: Không phải Python

**Benchmark:**
```
FastAPI:  ~15,000 requests/sec
Flask:    ~4,000 requests/sec
Django:   ~2,000 requests/sec
```

### 2.3 SQLAlchemy 2.0

| Aspect | Detail |
|--------|--------|
| **Công nghệ** | SQLAlchemy 2.0 |
| **Vai trò** | ORM (Object-Relational Mapping) |
| **Lý do chọn** | - Mature & stable<br>- Async support (2.0)<br>- Flexible (ORM + Core)<br>- Database agnostic |

**Tại sao không chọn:**
- **Django ORM**: Tied to Django
- **Peewee**: Ít features
- **Raw SQL**: Khó maintain, SQL injection risk

### 2.4 Pydantic 2.5

| Aspect | Detail |
|--------|--------|
| **Công nghệ** | Pydantic 2.5 |
| **Vai trò** | Data validation & serialization |
| **Lý do chọn** | - Type-safe request/response<br>- Auto validation<br>- JSON Schema generation<br>- FastAPI integration |

### 2.5 Uvicorn 0.23

| Aspect | Detail |
|--------|--------|
| **Công nghệ** | Uvicorn 0.23 |
| **Vai trò** | ASGI server |
| **Lý do chọn** | - Lightning fast<br>- Async support<br>- Production ready<br>- Hot reload for dev |

### 2.6 Các thư viện Backend khác

| Library | Version | Vai trò |
|---------|---------|---------|
| `PyJWT` | 2.9 | JWT authentication |
| `passlib[bcrypt]` | 1.7 | Password hashing |
| `httpx` | - | Async HTTP client |
| `python-multipart` | 0.0.12 | File upload handling |
| `loguru` | - | Logging |
| `google-generativeai` | 0.3.2 | Gemini AI chatbot |
| `redis` | 5.0 | Caching |

---

## 3. AI/ML TECHNOLOGIES

### 3.1 PyTorch 2.2+

| Aspect | Detail |
|--------|--------|
| **Công nghệ** | PyTorch 2.2+ |
| **Vai trò** | Deep Learning framework |
| **Lý do chọn** | - Dynamic computation graph<br>- Pythonic API<br>- Strong NLP ecosystem<br>- Easy debugging |

**Tại sao không chọn:**
- **TensorFlow**: Static graph (khó debug), API phức tạp
- **JAX**: Learning curve cao
- **Keras**: Ít flexible

### 3.2 Transformers 4.44 (Hugging Face)

| Aspect | Detail |
|--------|--------|
| **Công nghệ** | Transformers 4.44 |
| **Vai trò** | Pre-trained model hub |
| **Lý do chọn** | - 100,000+ pre-trained models<br>- Easy fine-tuning<br>- PhoBERT, vi-SBERT available<br>- Active community |

### 3.3 PhoBERT (VinAI)

| Aspect | Detail |
|--------|--------|
| **Công nghệ** | PhoBERT (vinai/phobert-base) |
| **Vai trò** | Vietnamese BERT model |
| **Lý do chọn** | - SOTA cho tiếng Việt<br>- Pre-trained on 20GB Vietnamese text<br>- Fine-tuned cho RIASEC/Big5 prediction |

**Tại sao không chọn:**
- **mBERT**: Performance kém hơn cho tiếng Việt
- **XLM-RoBERTa**: Không tối ưu cho Vietnamese
- **GPT**: Quá lớn, không cần generative

### 3.4 vi-SBERT (Sentence-BERT Vietnamese)

| Aspect | Detail |
|--------|--------|
| **Công nghệ** | Vietnamese Sentence-BERT |
| **Vai trò** | Sentence embedding model |
| **Lý do chọn** | - Semantic similarity<br>- 768D dense vectors<br>- Fast inference<br>- Tối ưu cho tiếng Việt |

**Tại sao không chọn:**
- **OpenAI Embeddings**: Tốn tiền, latency cao
- **Word2Vec**: Không capture sentence meaning
- **TF-IDF**: Sparse vectors, kém semantic

### 3.5 NeuMF/MLP (Neural Collaborative Filtering)

| Aspect | Detail |
|--------|--------|
| **Công nghệ** | Custom MLP model |
| **Vai trò** | Ranking/Re-ranking |
| **Lý do chọn** | - Combine content + collaborative filtering<br>- Handle cold-start<br>- Personalized ranking |

### 3.6 pgvector

| Aspect | Detail |
|--------|--------|
| **Công nghệ** | pgvector (PostgreSQL extension) |
| **Vai trò** | Vector similarity search |
| **Lý do chọn** | - Native PostgreSQL integration<br>- IVFFlat index cho ANN search<br>- No separate vector DB needed<br>- ACID compliant |

**Tại sao không chọn:**
- **FAISS**: Separate service, không ACID
- **Pinecone**: Tốn tiền, vendor lock-in
- **Milvus**: Overkill cho scale này
- **Elasticsearch**: Không tối ưu cho dense vectors

---

## 4. DATABASE TECHNOLOGIES

### 4.1 PostgreSQL 15

| Aspect | Detail |
|--------|--------|
| **Công nghệ** | PostgreSQL 15 |
| **Vai trò** | Primary database |
| **Lý do chọn** | - ACID compliant<br>- pgvector extension<br>- JSON/JSONB support<br>- Mature & reliable |

**Tại sao không chọn:**
- **MySQL**: Không có pgvector, JSON support kém
- **MongoDB**: Không ACID, không vector search native
- **SQLite**: Không scale, single-user

### 4.2 pgvector Extension

| Aspect | Detail |
|--------|--------|
| **Công nghệ** | pgvector |
| **Vai trò** | Vector data type & similarity search |
| **Features** | - `vector(768)` data type<br>- Cosine distance (`<=>`)<br>- L2 distance (`<->`)<br>- IVFFlat index |

### 4.3 Redis 5.0

| Aspect | Detail |
|--------|--------|
| **Công nghệ** | Redis 5.0 |
| **Vai trò** | Caching & session storage |
| **Lý do chọn** | - In-memory (fast)<br>- TTL support<br>- Pub/Sub for real-time |

---

## 5. DEVOPS TECHNOLOGIES

### 5.1 Docker & Docker Compose

| Aspect | Detail |
|--------|--------|
| **Công nghệ** | Docker + Docker Compose |
| **Vai trò** | Containerization |
| **Lý do chọn** | - Consistent environments<br>- Easy deployment<br>- Microservices architecture<br>- One-command setup |

**Docker services:**
```yaml
services:
  frontend:    # React app (port 3000)
  backend:     # FastAPI (port 8000)
  ai-core:     # AI service (port 9000)
  postgres:    # Database (port 5432)
  redis:       # Cache (port 6379)
```

### 5.2 GitHub Actions

| Aspect | Detail |
|--------|--------|
| **Công nghệ** | GitHub Actions |
| **Vai trò** | CI/CD pipeline |
| **Lý do chọn** | - Free for public repos<br>- Native GitHub integration<br>- YAML-based config |

---

## 6. SO SÁNH TỔNG HỢP

### Frontend Framework Comparison

| Criteria | React | Vue | Angular | Svelte |
|----------|-------|-----|---------|--------|
| Learning Curve | Medium | Easy | Hard | Easy |
| Performance | High | High | Medium | Very High |
| Ecosystem | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Job Market | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **Chọn** | ✅ | | | |

### Backend Framework Comparison

| Criteria | FastAPI | Django | Flask | Express |
|----------|---------|--------|-------|---------|
| Performance | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Async Native | ✅ | ❌ | ❌ | ✅ |
| Auto Docs | ✅ | ❌ | ❌ | ❌ |
| Type Safety | ✅ | ❌ | ❌ | ❌ |
| ML Integration | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **Chọn** | ✅ | | | |

### Database Comparison

| Criteria | PostgreSQL | MySQL | MongoDB | SQLite |
|----------|------------|-------|---------|--------|
| Vector Search | ✅ pgvector | ❌ | ❌ | ❌ |
| ACID | ✅ | ✅ | ❌ | ✅ |
| JSON Support | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| Scalability | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ |
| **Chọn** | ✅ | | | |

### ML Framework Comparison

| Criteria | PyTorch | TensorFlow | JAX |
|----------|---------|------------|-----|
| Ease of Use | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| Debugging | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| NLP Ecosystem | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Production | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Chọn** | ✅ | | |

---

## 7. TÓM TẮT LÝ DO CHỌN

| Layer | Technology | Lý do chính |
|-------|------------|-------------|
| **Frontend** | React + TypeScript | Ecosystem lớn, type-safe |
| **Styling** | Tailwind CSS | Rapid development, consistent |
| **Build** | Vite | Fastest build tool |
| **Backend** | FastAPI | Async, auto-docs, type-safe |
| **ORM** | SQLAlchemy 2.0 | Mature, async support |
| **AI/ML** | PyTorch + Transformers | Best NLP ecosystem |
| **NLP** | PhoBERT | SOTA cho tiếng Việt |
| **Embedding** | vi-SBERT | Semantic search tiếng Việt |
| **Vector Search** | pgvector | Native PostgreSQL, no extra service |
| **Database** | PostgreSQL | ACID + pgvector |
| **Container** | Docker | Consistent deployment |
