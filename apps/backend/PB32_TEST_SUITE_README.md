# PB32 - PhoBERT NLP Accuracy Test Suite

Bộ test toàn diện để kiểm tra độ chính xác của API NLP trong việc phân tích văn bản tiếng Việt và trả về vector tính cách 6 chiều (RIASEC) và 5 chiều (Big Five).

## 📋 Tổng quan

Bộ test này được thiết kế để đánh giá:
- **Độ chính xác** của PhoBERT trong việc phân tích tính cách từ văn bản tiếng Việt
- **Hiệu suất** so sánh giữa PhoBERT (AI-core) và Gemini API
- **Tích hợp end-to-end** từ assessment đến career recommendation
- **Chất lượng embedding** và vector tính cách

## 🗂️ Cấu trúc Test Suite

### 1. `test_pb32_phobert_nlp_accuracy.py`
**Kiểm tra độ chính xác phân tích tính cách**

- ✅ 9 test cases với profile tính cách đã biết
- ✅ Đo lường độ chính xác RIASEC (6 chiều) và Big Five (5 chiều)
- ✅ Validation dominant trait và embedding quality
- ✅ Kiểm tra SLA compliance (thời gian phản hồi)

**Test Cases:**
- Realistic Engineer (Kỹ sư thực tế)
- Investigative Researcher (Nhà nghiên cứu)
- Artistic Designer (Nhà thiết kế sáng tạo)
- Social Teacher (Giáo viên xã hội)
- Enterprising Manager (Quản lý doanh nghiệp)
- Conventional Accountant (Kế toán truyền thống)
- Mixed profiles và edge cases

### 2. `test_pb32_performance_benchmark.py`
**So sánh hiệu suất PhoBERT vs Gemini**

- ⚡ Sequential benchmark (tuần tự)
- 🚀 Concurrent benchmark (đồng thời)
- 💪 Stress test (tải cao)
- 📊 Memory usage analysis
- 📈 Response time statistics

### 3. `test_pb32_integration_e2e.py`
**Kiểm tra tích hợp end-to-end**

- 🔄 Complete assessment flow (RIASEC + Big Five)
- 📝 Essay analysis integration
- 🤝 Trait fusion (test + essay)
- 💼 Career recommendation pipeline
- 🗄️ Database consistency validation

### 4. `run_pb32_complete_test_suite.py`
**Master script chạy toàn bộ test suite**

- 🎯 Chạy tất cả test modules
- 📊 Tạo báo cáo tổng hợp
- 🎨 Generate recommendations
- 📄 Export JSON và text reports

## 🚀 Cách sử dụng

### Yêu cầu hệ thống

```bash
# Python packages
pip install requests sqlalchemy psutil

# Services cần chạy
- AI-core service (localhost:9000) - cho PhoBERT
- Backend API (localhost:8000) - cho E2E tests
- Database (PostgreSQL với pgvector)
```

### Chạy toàn bộ test suite

```bash
# Chạy full test suite
python run_pb32_complete_test_suite.py

# Chạy quick mode (subset of tests)
python run_pb32_complete_test_suite.py --quick

# Chỉ chạy accuracy tests
python run_pb32_complete_test_suite.py --accuracy-only

# Chỉ chạy performance tests
python run_pb32_complete_test_suite.py --performance-only

# Chỉ chạy E2E tests
python run_pb32_complete_test_suite.py --e2e-only
```

### Chạy từng module riêng lẻ

```bash
# Accuracy tests
python test_pb32_phobert_nlp_accuracy.py

# Performance benchmark
python test_pb32_performance_benchmark.py

# E2E integration tests
python test_pb32_integration_e2e.py
```

## 📊 Kết quả và Báo cáo

### Các file báo cáo được tạo:

1. **`accuracy_test_report.json`** - Kết quả chi tiết accuracy tests
2. **`performance_benchmark_report.json`** - Kết quả performance benchmark
3. **`e2e_integration_report.json`** - Kết quả E2E integration tests
4. **`pb32_comprehensive_report_YYYYMMDD_HHMMSS.json`** - Báo cáo tổng hợp
5. **`pb32_comprehensive_report_YYYYMMDD_HHMMSS_summary.txt`** - Tóm tắt dễ đọc

### Cấu trúc báo cáo tổng hợp:

```json
{
  "test_suite_info": {
    "name": "PB32 - PhoBERT NLP Accuracy Test Suite",
    "start_time": "2024-01-15T10:30:00",
    "total_duration_seconds": 120.5
  },
  "summary": {
    "overall_success": true,
    "total_test_count": 15,
    "successful_test_count": 14,
    "key_metrics": {
      "accuracy": {
        "overall_accuracy": 0.85,
        "performance_grade": "A (Very Good)"
      },
      "performance": {
        "phobert_avg_time": 1200.5,
        "gemini_avg_time": 2800.3
      }
    }
  },
  "recommendations": [
    "🟢 EXCELLENT: High accuracy achieved. Model is performing well.",
    "🟢 PERFORMANCE: PhoBERT is faster than Gemini fallback."
  ]
}
```

## 🎯 Tiêu chí đánh giá

### Accuracy Metrics
- **Overall Accuracy ≥ 80%**: Excellent (A+)
- **Overall Accuracy ≥ 70%**: Very Good (A)
- **Overall Accuracy ≥ 60%**: Good (B+)
- **Overall Accuracy < 60%**: Needs Improvement

### Performance Metrics
- **Response Time < 1000ms**: Excellent
- **Response Time < 2000ms**: Good
- **Response Time > 5000ms**: Poor

### SLA Compliance
- **Essay Analysis**: < 1000ms
- **Vector Search**: < 5000ms
- **E2E Flow**: < 10000ms

## 🔧 Cấu hình

### Environment Variables

```bash
# AI-core service URL
AI_CORE_URL=http://localhost:9000

# Gemini API keys (fallback)
GEMINI_API_KEY=your_gemini_api_key
GEMINI_API_KEY_1=backup_key_1
GEMINI_API_KEY_2=backup_key_2

# Database connection
DATABASE_URL=postgresql://user:pass@localhost/dbname
```

### Test Configuration

Có thể tùy chỉnh trong từng file test:

```python
# Accuracy test tolerance
ACCURACY_TOLERANCE = 0.2  # ±20%

# Performance SLA thresholds
ESSAY_ANALYSIS_SLA_MS = 1000
VECTOR_SEARCH_SLA_MS = 5000

# Concurrent test workers
MAX_WORKERS = 5

# Stress test duration
STRESS_TEST_DURATION = 30  # seconds
```

## 🐛 Troubleshooting

### Common Issues

1. **AI-core service unavailable**
   ```
   ❌ AI-core service (http://localhost:9000): Unavailable
   ```
   - Kiểm tra AI-core service đang chạy
   - Verify port 9000 accessible
   - Check firewall settings

2. **Gemini API quota exceeded**
   ```
   ❌ Gemini analysis failed: Quota exceeded
   ```
   - Sử dụng multiple API keys
   - Enable rate limiting
   - Switch to AI-core primary

3. **Database connection failed**
   ```
   ❌ E2E tests failed: Database connection error
   ```
   - Check PostgreSQL running
   - Verify pgvector extension installed
   - Check database credentials

4. **Low accuracy scores**
   ```
   🔴 CRITICAL: Overall accuracy below 60%
   ```
   - Review test case expectations
   - Check PhoBERT model version
   - Validate prompt engineering

### Debug Mode

Enable verbose logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## 📈 Monitoring và Optimization

### Key Performance Indicators (KPIs)

1. **Accuracy KPIs**
   - RIASEC accuracy > 75%
   - Big Five accuracy > 70%
   - Dominant trait prediction > 85%

2. **Performance KPIs**
   - PhoBERT response time < 1.5s
   - Gemini fallback < 3s
   - E2E completion < 8s

3. **Reliability KPIs**
   - Service availability > 99%
   - Error rate < 1%
   - SLA compliance > 95%

### Optimization Recommendations

1. **Improve Accuracy**
   - Fine-tune PhoBERT on domain-specific data
   - Enhance prompt engineering for Gemini
   - Increase training data diversity

2. **Improve Performance**
   - Implement caching for frequent requests
   - Optimize database queries
   - Use connection pooling

3. **Improve Reliability**
   - Implement circuit breaker pattern
   - Add retry mechanisms
   - Monitor service health

## 📞 Support

Nếu gặp vấn đề khi chạy test suite:

1. Check logs trong console output
2. Review generated error reports
3. Verify service dependencies
4. Check system requirements

---

**Tác giả**: AI Assistant  
**Phiên bản**: 1.0.0  
**Ngày tạo**: 2024-01-15  
**Mục đích**: Kiểm tra độ chính xác API NLP PhoBERT cho PB32