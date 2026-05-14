# Backend - AI Career Recommendation System

Backend API cho hệ thống AI Career Recommendation System được xây dựng với FastAPI và tích hợp Neo4j + PostgreSQL.

## 📁 Cấu trúc Project

```
backend/
├── app/                    # Main application code
│   ├── api/               # API routes
│   ├── core/              # Core configurations
│   ├── modules/           # Feature modules
│   ├── services/          # Business logic services
│   └── main.py           # FastAPI application entry point
├── neo4j/                 # Neo4j scripts và tools
│   ├── setup/            # Setup và configuration scripts
│   ├── cleanup/          # Data cleanup scripts  
│   ├── fixes/            # Data fix scripts
│   ├── testing/          # Testing scripts
│   └── README.md         # Neo4j documentation
├── interview/             # AI Mock Interviewer scripts
│   ├── setup/            # Database setup
│   ├── testing/          # API testing
│   └── README.md         # Interview documentation
├── .env                   # Environment variables
├── .env.example          # Environment template
├── requirements.txt      # Python dependencies
└── README.md            # This file
```

## 🚀 Quick Start

### 1. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
# DATABASE_URL, NEO4J_URI, GEMINI_API_KEY, etc.
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Setup Databases
```bash
# Setup Neo4j
cd neo4j/
python test_connections.py
python verify_neo4j.py

# Setup Interview tables
cd ../interview/
python create_interview_tables.py
```

### 4. Run Application
```bash
# From backend root
uvicorn app.main:app --reload --reload-dir app --host 0.0.0.0 --port 8000
```

## 🗄️ Database Architecture

### PostgreSQL (Primary Database)
- **Users & Authentication**
- **Career Data (O*NET)**
- **Assessment Results**
- **Interview Sessions**
- **Subscription Management**

### Neo4j (Graph Database)  
- **Jobs:** 959 career nodes
- **Skills:** 268 skill nodes (172 Technology + 96 KSA)
- **Relationships:** 103,680 REQUIRES relationships
- **Use Cases:** Career matching, skill gap analysis, recommendation engine

## 🎯 Core Features

### 1. Career Assessment
- **RIASEC Personality Test**
- **Big Five Personality Analysis**
- **Skills Assessment**
- **AI-powered Career Matching**

### 2. AI Mock Interviewer
- **Dynamic Question Generation**
- **Real-time AI Evaluation**
- **Personalized Feedback**
- **Performance Analytics**

### 3. Career Recommendations
- **Graph-based Matching**
- **Skill Gap Analysis**
- **Learning Path Suggestions**
- **Market Trend Integration**

### 4. Subscription System
- **Tiered Access Control**
- **Usage Tracking**
- **Payment Integration**
- **Feature Gating**

## 🔧 Development Tools

### Neo4j Management
```bash
cd neo4j/
python debug_technology_skills.py    # Debug Technology Skills
python fix_skills_data_complete.py   # Fix Skills data
python verify_clean_schema.py        # Verify schema
```

### Interview Testing
```bash
cd interview/
python test_interview_api.py         # Test Interview APIs
```

### Database Connections
```bash
python neo4j/test_connections.py     # Test all database connections
```

## 📊 API Documentation

### Base URL
- **Development:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

### Key Endpoints
- `POST /auth/login` - User authentication
- `POST /assessment/submit` - Submit assessment
- `GET /recommendations` - Get career recommendations
- `POST /interview/start` - Start mock interview
- `GET /careers/search` - Search careers
- `POST /subscription/upgrade` - Upgrade subscription

## 🔐 Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5433/career_ai
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password123456

# AI Services
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key

# Security
SECRET_KEY=your_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# External Services
STRIPE_SECRET_KEY=your_stripe_key
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
```

## 🧪 Testing

### Unit Tests
```bash
pytest app/tests/
```

### Integration Tests
```bash
python neo4j/test_neo4j_browser.py
python interview/test_interview_api.py
```

### Load Testing
```bash
# Use tools like locust or artillery for load testing
```

## 📈 Performance Metrics

### Database Performance
- **Neo4j Query Time:** < 100ms average
- **PostgreSQL Query Time:** < 50ms average
- **Concurrent Users:** 100+ supported

### API Performance
- **Response Time:** < 200ms average
- **Throughput:** 1000+ requests/minute
- **Uptime:** 99.9% target

## 🔍 Monitoring & Logging

### Logging
- **Level:** INFO in production, DEBUG in development
- **Format:** JSON structured logging
- **Storage:** File rotation + centralized logging

### Health Checks
- `GET /health` - Application health
- `GET /health/db` - Database connectivity
- `GET /health/neo4j` - Neo4j connectivity

## 🚀 Deployment

### Docker
```bash
docker build -t career-backend .
docker run -p 8000:8000 career-backend
```

### Production Considerations
- Use PostgreSQL connection pooling
- Configure Neo4j cluster for high availability
- Set up Redis for caching
- Use nginx for reverse proxy
- Configure SSL/TLS certificates

## 📝 Contributing

1. Follow PEP 8 style guidelines
2. Write unit tests for new features
3. Update documentation
4. Use type hints
5. Follow conventional commits

## 🔗 Related Documentation

- [Neo4j Scripts Documentation](./neo4j/README.md)
- [Interview System Documentation](./interview/README.md)
- [API Documentation](http://localhost:8000/docs)
- [Frontend Integration Guide](../frontend/README.md)
