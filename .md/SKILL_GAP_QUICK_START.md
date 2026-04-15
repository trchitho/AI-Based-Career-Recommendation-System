# 🚀 Skill Gap Analysis - Quick Start Guide

## Vị trí trên giao diện

Chức năng **Skill Gap Analysis** đã được thêm vào navigation menu chính:

```
Dashboard → Assessment → Skill Gap → Blog → Careers → Pricing
                           ↑
                    Ở đây! (vị trí thứ 3)
```

## Cách truy cập

### 1. Từ Navigation Menu
- Đăng nhập vào hệ thống
- Nhìn lên thanh navigation phía trên
- Click vào **"Skill Gap"** (giữa Assessment và Blog)

### 2. Trực tiếp qua URL
```
http://localhost:3000/skill-gap
```

### 3. Xem kết quả cũ
```
http://localhost:3000/skill-gap/{analysisId}
```

## Giao diện

### Trang chính (/skill-gap)
```
┌─────────────────────────────────────────┐
│  🎯 Skill Gap Analysis                  │
│  Discover your skill gaps and get       │
│  personalized learning recommendations  │
├─────────────────────────────────────────┤
│                                         │
│  📊 Skill Gap Analysis                  │
│  Upload your CV to discover skill gaps  │
│                                         │
│  Target Career: [Dropdown ▼]           │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │     📤                            │ │
│  │  Drag and drop your CV here      │ │
│  │         or                        │ │
│  │    [Browse Files]                 │ │
│  └───────────────────────────────────┘ │
│                                         │
│  [🔍 Analyze My Skills]                │
│                                         │
│  What happens next?                     │
│  🤖 AI extracts skills from your CV    │
│  📊 Compares with job requirements     │
│  🎯 Identifies skill gaps              │
│  💡 Provides learning recommendations  │
└─────────────────────────────────────────┘
```

### Trang kết quả (/skill-gap/{id})
```
┌─────────────────────────────────────────┐
│  [← New Analysis]    Analyzed: 2024... │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────┐  ┌──────┐ ┌──────┐ ┌────┐│
│  │  75.5%  │  │  ✅  │ │  ❌  │ │ 📊 ││
│  │Excellent│  │  12  │ │   5  │ │ 17 ││
│  │  Match  │  │Matched│ │Missing│ │Total││
│  └─────────┘  └──────┘ └──────┘ └────┘│
│                                         │
│  ✅ Your Strengths (12)                │
│  [Python] [JavaScript] [React]...      │
│                                         │
│  🔴 Critical Skill Gaps (3)            │
│  [Docker] [Kubernetes] [AWS]           │
│                                         │
│  🗺️ Skill Gap Heatmap                 │
│  [Interactive Network Diagram]         │
│                                         │
│  📚 Recommended Learning Path          │
│  Phase 1: Critical Skills...           │
│                                         │
│  [🎤 Start AI Interview]               │
│  [📚 Get Learning Resources]           │
│  [💾 Download Report]                  │
└─────────────────────────────────────────┘
```

## Flow sử dụng

### Bước 1: Upload CV
1. Click vào **"Skill Gap"** trong menu
2. Chọn **Target Career** từ dropdown
3. Upload CV (PDF) bằng cách:
   - Drag & drop file vào vùng upload
   - Hoặc click **"Browse Files"**
4. Click **"🔍 Analyze My Skills"**

### Bước 2: Xem kết quả
Sau khi phân tích xong, bạn sẽ thấy:
- **Match Score**: Phần trăm phù hợp (0-100%)
- **Statistics**: Số kỹ năng matched/missing/total
- **Your Strengths**: Kỹ năng bạn đã có (màu xanh)
- **Skill Gaps**: Kỹ năng còn thiếu
  - 🔴 Critical: Quan trọng nhất
  - 🟠 Important: Cần bổ sung
  - 🟡 Nice-to-have: Khuyến nghị
- **Heatmap**: Visualization trực quan
- **Learning Path**: Lộ trình học tập đề xuất

### Bước 3: Hành động tiếp theo
- **Start AI Interview**: Phỏng vấn AI dựa trên skill gaps
- **Get Learning Resources**: Khóa học đề xuất
- **Download Report**: Tải báo cáo PDF

## Màu sắc

- 🟢 **Xanh lá**: Kỹ năng đã có (Matched)
- 🔴 **Đỏ**: Lỗ hổng quan trọng (Critical Gap)
- 🟠 **Cam**: Lỗ hổng cần bổ sung (Important Gap)
- 🟡 **Vàng**: Kỹ năng khuyến nghị (Nice-to-have)
- 🟣 **Tím**: Kỹ năng bổ sung (Extra Skills)

## Kỹ năng được hỗ trợ

### Programming Languages (10+)
Python, Java, JavaScript, TypeScript, C++, C#, Go, Rust, Ruby, PHP

### Web Technologies (15+)
React, Angular, Vue, Node.js, Express, Django, Flask, FastAPI, Spring, Laravel

### Databases (10+)
MySQL, PostgreSQL, MongoDB, Redis, Elasticsearch, Oracle, Neo4j

### Cloud & DevOps (10+)
AWS, Azure, GCP, Docker, Kubernetes, Jenkins, GitLab, Terraform, Ansible

### Data Science & AI (10+)
Machine Learning, Deep Learning, TensorFlow, PyTorch, Scikit-learn, Pandas, NumPy

### Soft Skills (10+)
Leadership, Communication, Teamwork, Problem Solving, Project Management, Agile, Scrum

## Tips

### 1. Chuẩn bị CV tốt
- Sử dụng file PDF
- Liệt kê rõ ràng các kỹ năng
- Sử dụng tên kỹ năng chuẩn (Python thay vì Py)

### 2. Chọn career phù hợp
- Software Engineer: Full-stack, backend, frontend
- Data Scientist: ML, AI, data analysis
- DevOps Engineer: Cloud, CI/CD, infrastructure

### 3. Xem kỹ kết quả
- Tập trung vào Critical Gaps trước
- Học theo Learning Path đề xuất
- Sử dụng AI Interview để verify skills

## Troubleshooting

### Không thấy menu "Skill Gap"?
- Đảm bảo đã đăng nhập
- Refresh trang (Ctrl + R)
- Clear cache và reload (Ctrl + Shift + R)

### Upload CV bị lỗi?
- Kiểm tra file là PDF
- File size < 10MB
- Đảm bảo backend đang chạy

### Không có kết quả?
- Kiểm tra CV có liệt kê skills không
- Thử với career khác
- Xem console log (F12) để debug

## Demo Data

Nếu muốn test nhanh, tạo file `sample_cv.txt`:
```
John Doe
Software Engineer

Skills:
- Python, JavaScript, React, Node.js
- MySQL, PostgreSQL, MongoDB
- Docker, AWS
- Git, Agile

Experience:
- Built web apps with React and Node.js
- Worked with databases and APIs
```

Convert sang PDF và upload!

## Next Steps

Sau khi xem kết quả:
1. ✅ Lưu analysis ID để xem lại sau
2. ✅ Follow learning path đề xuất
3. ✅ Start AI Interview để verify
4. ✅ Download report để tham khảo
5. ✅ Upload CV mới sau khi học thêm skills

---

**Vị trí**: Navigation Menu → **Skill Gap** (giữa Assessment và Blog)
**URL**: http://localhost:3000/skill-gap
**Status**: ✅ Ready to use!
