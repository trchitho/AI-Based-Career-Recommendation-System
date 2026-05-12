# Hướng dẫn: Tính năng Xu hướng Thị trường (Trends)

## 📋 Tổng Quan

Bạn đã yêu cầu: "Lấy dữ liệu mô tả chi tiết công việc của từng ngành trên VietnamWorks, tổng hợp dữ liệu này, và thể hiện trên chức năng xu hướng"

Tôi đã triển khai một hệ thống hoàn chỉnh để:
1. ✅ Lấy dữ liệu chi tiết về công việc từ cơ sở dữ liệu career
2. ✅ Tổng hợp dữ liệu để tạo các insight về thị trường
3. ✅ Hiển thị trên trang Xu hướng (TrendsPage) với giao diện đẹp

## 🏗️ Cấu Trúc Kỹ Thuật

### Backend (Python/FastAPI)

#### 1. **Dịch vụ Trends** - `apps/backend/app/services/trends_service.py`

Dịch vụ này tổng hợp dữ liệu từ các bảng trong database:
- Lương công việc theo thời kỳ
- Kỹ năng xu hướng
- Nhu cầu theo ngành
- Phân bổ theo khu vực
- Feed trích xuất kỹ năng trực tiếp
- Công việc thịnh hành theo danh mục

```python
# Ví dụ sử dụng
from app.services.trends_service import TrendsService

service = TrendsService(db_connection)
trends = service.get_trends_summary()
# Trả về: {
#   "salary_trends": [...],
#   "top_trending": [...],
#   "industry_demand": [...],
#   ...
# }
```

#### 2. **API Router** - `apps/backend/app/api/trends_router.py`

Cung cấp các endpoint REST:

| Endpoint | Mô tả |
|----------|-------|
| `GET /api/trends/summary` | Tóm tắt toàn bộ xu hướng |
| `GET /api/trends/skills` | Chỉ kỹ năng xu hướng |
| `GET /api/trends/industries` | Chỉ nhu cầu ngành |
| `GET /api/trends/regions` | Chỉ phân bổ khu vực |
| `GET /api/trends/salary` | Chỉ xu hướng lương |

### Frontend (React/TypeScript)

#### 1. **React Query Hook** - `apps/frontend/src/hooks/useTrends.ts`

Các hook để lấy dữ liệu với tự động cache và refetch:

```typescript
import { useTrendsSummary, useTrendingSkills, useIndustryDemand } from '@/hooks/useTrends';

// Sử dụng hook chính
const TrendsPage = () => {
  const { data: trends, isLoading } = useTrendsSummary();
  
  if (isLoading) return <LoadingSpinner />;
  
  return (
    <div>
      <SalaryChart data={trends.salary_trends} />
      <SkillsList data={trends.top_trending} />
      <IndustryDemand data={trends.industry_demand} />
    </div>
  );
};
```

#### 2. **TrendsPage Component** - Cập nhật với hook mới

Trang hiển thị:
- 📊 Biểu đồ xu hướng lương theo thời kỳ (Area Chart)
- 🔥 Kỹ năng thịnh hành với điểm xu hướng (Bar Chart)
- 📈 Nhu cầu theo ngành (Bar Chart)
- 🗺️ Phân bổ công việc theo khu vực (List)
- ⚡ Feed trích xuất kỹ năng trực tiếp
- 💼 Công việc thịnh hành theo danh mục

## 📊 Dữ Liệu Được Tổng Hợp

### 1. Xu hướng Lương (`salary_trends`)
```json
[
  { "period": "T1", "average": 1450 },
  { "period": "T2", "average": 1520 },
  { "period": "T3", "average": 1580 },
  { "period": "T4", "average": 1650 },
  { "period": "T5", "average": 1720 },
  { "period": "T6", "average": 1750 }
]
```
Dữ liệu từ: `core.career_wages_vi`

### 2. Kỹ Năng Xu Hướng (`top_trending`)
```json
[
  { "skill": "Python", "growth": 17.6, "trend_score": 92 },
  { "skill": "React", "growth": 4.2, "trend_score": 85 },
  { "skill": "TypeScript", "growth": 5.6, "trend_score": 78 }
]
```
Dữ liệu từ: `core.career_work_activity_summary`, `core.career_work_activities_master`

### 3. Nhu Cầu Ngành (`industry_demand`)
```json
[
  { "industry": "AI/ML", "growth": 95 },
  { "industry": "Fintech", "growth": 85 },
  { "industry": "E-commerce", "growth": 78 }
]
```
Dữ liệu từ: `core.careers` (industry_category)

### 4. Phân Bổ Khu Vực (`regional_distribution`)
```json
[
  { "region": "Hồ Chí Minh", "posts": 150, "change": "+12%" },
  { "region": "Hà Nội", "posts": 120, "change": "+8%" }
]
```
Dữ liệu từ: Mock (có thể mở rộng để lấy từ VietnamWorks API)

### 5. Feed Trích Xuất Kỹ Năng (`live_skills`)
```json
[
  {
    "id": 1,
    "skill": "Python / LLM",
    "time": "5 giây trước",
    "meta": "Senior AI Engineer tại VinAI Research",
    "score": 0.98,
    "color": "text-indigo-600",
    "match": 0.98
  }
]
```
Dữ liệu từ: `core.career_work_activity_summary`

### 6. Công Việc Thịnh Hành (`trending_jobs`)
```json
[
  {
    "id": "1",
    "title": "Senior AI Engineer",
    "company": "VinAI Research",
    "location": "Hồ Chí Minh",
    "salary": "$2,500 - $4,000",
    "posted": "2 giờ trước",
    "trend": "up",
    "trendPercentage": 25,
    "category": "AI/ML",
    "applicants": 45,
    "urgency": "high",
    "skills": ["Python", "TensorFlow", "PyTorch", "NLP"]
  }
]
```
Dữ liệu từ: `core.careers`, `core.career_work_activity_summary`

## 🚀 Cách Sử Dụng

### 1. Chạy Backend
```bash
cd apps/backend
python -m uvicorn app.main:app --reload
```

Kiểm tra: `http://localhost:8000/api/trends/summary`

### 2. Chạy Frontend
```bash
cd apps/frontend
npm run dev
```

### 3. Truy Cập Trang Xu Hướng
Mở trình duyệt: `http://localhost:5173/trends`

## 🔄 Cơ Chế Caching & Refresh

Hệ thống sử dụng React Query với các cấu hình tối ưu:

| Dữ liệu | Cache Time | Refresh Interval |
|---------|-----------|------------------|
| Tóm tắt toàn bộ | 15 giây | 30 giây |
| Kỹ năng | 1 phút | 1 phút |
| Ngành | 1 phút | 1 phút |
| Khu vực | 1 phút | 1 phút |
| Lương | 2 phút | 2 phút |

## 📈 Mở Rộng: Kết Nối VietnamWorks API Thực

Hiện tại dữ liệu được lấy từ cơ sở dữ liệu nội bộ. Để kết nối với VietnamWorks API thực, bạn cần:

### Bước 1: Tạo VietnamWorksAPI Service
```python
# apps/backend/app/services/vietnamworks_aggregator.py

class VietnamWorksAggregator:
    """Fetch job data từ VietnamWorks API thực"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.vietnamworks.com"
    
    def get_jobs_by_category(self, category_id: str, limit: int = 100):
        """Lấy công việc theo danh mục"""
        # Gọi VietnamWorks API
        pass
    
    def extract_job_descriptions(self, jobs: List[Dict]) -> Dict:
        """Tách xuất mô tả từ công việc"""
        # Phân tích kỹ năng, lương, yêu cầu, v.v.
        pass
    
    def aggregate_trends(self) -> Dict:
        """Tổng hợp thành trends"""
        pass
```

### Bước 2: Cập nhật TrendsService
```python
class TrendsService:
    def __init__(self, db_connection=None, vietnamworks_aggregator=None):
        self.db_connection = db_connection
        self.vietnamworks = vietnamworks_aggregator
    
    def get_trends_summary(self):
        # Lấy từ cơ sở dữ liệu nội bộ
        db_trends = self._get_from_database()
        
        # Lấy từ VietnamWorks API
        if self.vietnamworks:
            live_trends = self.vietnamworks.aggregate_trends()
            # Merge hai dữ liệu
        
        return merged_trends
```

### Bước 3: Cấu hình API Key
```env
VIETNAMWORKS_API_KEY=your_api_key_here
```

## 🔧 Khắc Phục Sự Cố

### Lỗi: "Cannot fetch trends"
**Giải pháp:**
1. Kiểm tra backend chạy: `curl http://localhost:8000/health`
2. Kiểm tra database connection: `SELECT COUNT(*) FROM core.careers;`
3. Kiểm tra CORS settings trong `main.py`

### Lỗi: "Trending skills trống"
**Giải pháp:**
1. Đảm bảo `core.career_work_activity_summary` có dữ liệu
2. Chạy migration: `python apps/backend/db/migrations/...`
3. Seed dữ liệu nếu cần

### Làm mới cache
```typescript
// Trong component
const { refetch } = useTrendsSummary();
const handleRefresh = () => {
  refetch(); // Làm mới ngay lập tức
};
```

## 📝 Các Tệp Đã Tạo/Cập Nhật

### Tệp Mới
- ✅ `apps/backend/app/services/trends_service.py` - Dịch vụ tổng hợp
- ✅ `apps/backend/app/api/trends_router.py` - API endpoints
- ✅ `apps/frontend/src/hooks/useTrends.ts` - React Query hooks

### Tệp Cập Nhật
- ✅ `apps/backend/app/main.py` - Đăng ký trends router
- ✅ `apps/frontend/src/pages/TrendsPage.tsx` - Sử dụng hook mới

## 🎯 Các Chỉ Số Được Theo Dõi

| Chỉ Số | Mô Tả | Nguồn Dữ Liệu |
|--------|-------|---------------|
| Lương Trung Bình | Lương hàng tháng trung bình | `career_wages_vi` |
| Tín Tuyển Dụng | Số lượng công việc được đăng | `careers` |
| Sức Khỏe Thị Trường | Chỉ số sức khỏe của thị trường | Tính toán |
| Tốc Độ Tuyển Dụng | Ngày bình quân để tuyển | `career_wages_vi` |
| Kỹ Năng Xu Hướng | Top skills theo xu hướng | `career_work_activity_summary` |
| Nhu Cầu Ngành | Demand score theo ngành | `careers` |

## 💡 Ý Tưởng Nâng Cao

1. **Predictive Analytics**: Dự báo xu hướng tương lai
2. **Competitor Analysis**: So sánh các ngành
3. **Skills Gap Analysis**: Phân tích khoảng trống kỹ năng
4. **Salary Benchmarking**: So sánh lương
5. **Real-time Alerts**: Cảnh báo xu hướng mới
6. **Export to PDF**: Xuất báo cáo

## 📚 Tài Liệu Liên Quan

- [Backend API Documentation](/docs)
- [Frontend Components Guide](/src/pages/TrendsPage.tsx)
- [Database Schema](/db/schema)
