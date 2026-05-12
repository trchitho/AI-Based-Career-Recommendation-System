"""
Trends Service - Aggregates job market data from VietnamWorks categories
"""
import re
from collections import defaultdict, Counter
from typing import Any, Dict, List, Optional, Tuple
import psycopg
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class TrendsService:
    """Service to aggregate market trends from career data"""

    def __init__(self, db_connection: Optional[psycopg.Connection] = None):
        self.db_connection = db_connection

    def get_trends_summary(self) -> Dict[str, Any]:
        """
        Aggregate all market trends data:
        - Salary trends by period
        - Trending skills with growth rates
        - Industry demand
        - Regional job distribution
        - Live skill extraction feed
        - Trending jobs by category
        """
        
        trends_data = {
            "market_metrics": self._get_market_metrics(),
            "salary_trends": self._get_salary_trends(),
            "top_trending": self._get_trending_skills(),
            "industry_demand": self._get_industry_growth(),
            "regional_distribution": self._get_regional_demand(),
            "live_skills": self._get_live_skill_feed(),
            "trending_jobs": self._get_trending_jobs_by_category(),
        }
        
        return trends_data

    def _get_market_metrics(self) -> Dict[str, Any]:
        """
        Get high-level market metrics
        """
        try:
            if not self.db_connection:
                return self._mock_market_metrics()

            cur = self.db_connection.cursor()
            
            # Count job postings
            cur.execute("SELECT COUNT(*) FROM core.careers")
            job_postings = cur.fetchone()[0]
            
            # Get average salary in VND
            cur.execute("""
                SELECT AVG(monthly_median_vnd) 
                FROM core.career_wages_vi 
                WHERE monthly_median_vnd IS NOT NULL
            """)
            avg_salary_row = cur.fetchone()
            avg_salary = int(avg_salary_row[0]) if avg_salary_row and avg_salary_row[0] else 18500000
            
            return {
                "avg_salary": avg_salary,
                "salary_change": 8.4,
                "job_postings": job_postings,
                "posting_change": 12.1,
                "market_health": 85,
                "health_change": -2.5,
                "recruitment_speed": 14,
                "speed_change": 0.5
            }
        except Exception as e:
            logger.error(f"Error fetching market metrics: {e}")
            return self._mock_market_metrics()

    def _mock_market_metrics(self) -> Dict[str, Any]:
        return {
            "avg_salary": 18500000,
            "salary_change": 8.4,
            "job_postings": 12450,
            "posting_change": 12.1,
            "market_health": 85,
            "health_change": -2.5,
            "recruitment_speed": 14,
            "speed_change": 0.5
        }

    def _get_salary_trends(self) -> List[Dict[str, Any]]:
        """
        Get salary trends by period from career wages data
        Returns: [{ period: 'T1', average: 1450 }, ...]
        """
        try:
            if not self.db_connection:
                return self._mock_salary_trends()

            cur = self.db_connection.cursor()
            
            # Fetch wage data from Vietnam wages table
            cur.execute("""
                SELECT 
                    experience_level,
                    annual_median_vnd,
                    monthly_median_vnd,
                    COUNT(*) as job_count
                FROM core.career_wages_vi
                WHERE annual_median_vnd IS NOT NULL
                GROUP BY experience_level, annual_median_vnd
                ORDER BY experience_level
                LIMIT 6
            """)
            
            rows = cur.fetchall()
            periods = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6']
            trends = []
            
            for idx, row in enumerate(rows):
                if idx >= 6:
                    break
                monthly_salary = row[2] or row[1] / 12 if row[1] else 0
                trends.append({
                    "period": periods[idx],
                    "average": int(monthly_salary / 1_000_000) if monthly_salary else 1500
                })
            
            # Fill remaining periods with interpolated values if needed
            while len(trends) < 6:
                trends.append({
                    "period": periods[len(trends)],
                    "average": 1500 + (len(trends) * 50)
                })
            
            return trends
        except Exception as e:
            logger.error(f"Error fetching salary trends: {e}")
            return self._mock_salary_trends()

    def _get_trending_skills(self) -> List[Dict[str, Any]]:
        """
        Extract trending skills from job descriptions and work activities
        Returns: [{ skill: 'React', growth: 4.2, trend_score: 85 }, ...]
        """
        try:
            if not self.db_connection:
                return self._mock_trending_skills()

            cur = self.db_connection.cursor()
            
            # Get popular work activities/skills from career_work_activity_summary
            cur.execute("""
                SELECT 
                    COALESCE(m.element_name_vi, m.element_name) as skill_name,
                    COUNT(DISTINCT c.industry_category) as industry_count,
                    COUNT(*) as frequency,
                    AVG(s.combined_score) as avg_score
                FROM core.career_work_activity_summary s
                LEFT JOIN core.career_work_activities_master m ON s.element_id = m.element_id
                JOIN core.careers c ON s.onet_code = c.onet_code
                WHERE s.combined_score > 0.5 AND c.industry_category IS NOT NULL
                GROUP BY skill_name
                ORDER BY industry_count DESC, avg_score DESC
                LIMIT 10
            """)
            
            rows = cur.fetchall()
            skills = []
            base_growth = 3.5
            
            for idx, row in enumerate(rows):
                if row[0]:
                    growth_rate = base_growth + (idx * 1.5) + (row[3] * 5 if row[3] else 0)
                    trend_score = int((row[3] or 0.6) * 100) - (idx * 5)
                    skills.append({
                        "skill": row[0],
                        "growth": round(growth_rate, 1),
                        "trend_score": max(50, trend_score)
                    })
            
            # If not enough from DB, add common tech skills
            if len(skills) < 5:
                common_skills = [
                    ("Lập trình Python", 17.6, 92),
                    ("Digital Marketing", 14.2, 85),
                    ("Tư vấn & Chăm sóc khách hàng", 12.6, 82),
                    ("Quản lý dự án", 10.7, 78),
                    ("Thiết kế đồ họa", 8.3, 75),
                    ("Chăm sóc bệnh nhân", 9.5, 80),
                    ("Phân tích dữ liệu", 15.2, 88),
                    ("Kế toán tài chính", 7.4, 72)
                ]
                for skill, growth, score in common_skills:
                    if not any(s["skill"] == skill for s in skills):
                        skills.append({
                            "skill": skill,
                            "growth": growth,
                            "trend_score": score
                        })
            
            return skills[:5]
        except Exception as e:
            logger.error(f"Error fetching trending skills: {e}")
            return self._mock_trending_skills()

    def _get_industry_growth(self) -> List[Dict[str, Any]]:
        """
        Get industry demand metrics
        Returns: [{ industry: 'AI/ML', growth: 95 }, ...]
        """
        try:
            if not self.db_connection:
                return self._mock_industry_growth()

            cur = self.db_connection.cursor()
            
            # Count jobs by industry category
            cur.execute("""
                SELECT 
                    industry_category,
                    COUNT(*) as job_count
                FROM core.careers
                WHERE industry_category IS NOT NULL
                GROUP BY industry_category
                ORDER BY job_count DESC
            """)
            
            rows = cur.fetchall()
            total = sum(r[1] for r in rows)
            industries = []
            
            for row in rows:
                if row[0]:
                    # Map industry names to Vietnamese
                    industry_name = self._translate_industry(row[0])
                    demand = int((row[1] / total) * 100) + 15
                    industries.append({
                        "industry": industry_name,
                        "growth": min(95, demand)
                    })
            
            # If not enough, add default industries
            if len(industries) < 5:
                default_industries = [
                    ("IT & Phần mềm", 95),
                    ("Kinh doanh & Tiếp thị", 88),
                    ("Y tế & Chăm sóc sức khỏe", 85),
                    ("Giáo dục & Đào tạo", 78),
                    ("Kỹ thuật & Xây dựng", 72),
                ]
                for ind, growth in default_industries:
                    if not any(i["industry"] == ind for i in industries):
                        industries.append({"industry": ind, "growth": growth})
            return industries
        except Exception as e:
            logger.error(f"Error fetching industry growth: {e}")
            return self._mock_industry_growth()

    def _get_regional_demand(self) -> List[Dict[str, Any]]:
        """
        Get job distribution by region
        Returns: [{ region: 'Hồ Chí Minh', posts: 150, change: '+12%' }, ...]
        """
        try:
            if not self.db_connection:
                return self._mock_regional_demand()

            # For now, use mock data as regional info is not in our career table
            # In production, this would come from job posting aggregation
            return self._mock_regional_demand()
        except Exception as e:
            logger.error(f"Error fetching regional demand: {e}")
            return self._mock_regional_demand()

    def _get_live_skill_feed(self) -> List[Dict[str, Any]]:
        """
        Get live skill extraction feed from recently matched jobs
        Returns: [{ skill: 'Python / LLM', time: '5 giây trước', meta: '...', score: 0.98 }, ...]
        """
        try:
            if not self.db_connection:
                return self._mock_live_feed()

            cur = self.db_connection.cursor()
            
            # Get top work activities with their associated jobs
            cur.execute("""
                SELECT DISTINCT
                    COALESCE(m.element_name_vi, m.element_name) as skill,
                    COALESCE(c.title_vi, c.title_en) as job_title,
                    s.combined_score as score
                FROM core.career_work_activity_summary s
                LEFT JOIN core.career_work_activities_master m ON s.element_id = m.element_id
                LEFT JOIN core.careers c ON s.onet_code = c.onet_code
                WHERE s.combined_score > 0.7
                ORDER BY s.combined_score DESC
                LIMIT 4
            """)
            
            rows = cur.fetchall()
            feed = []
            colors = ['text-indigo-600', 'text-emerald-600', 'text-purple-600', 'text-rose-600']
            
            for idx, row in enumerate(rows):
                feed.append({
                    "id": idx + 1,
                    "skill": row[0] or "Kỹ năng không xác định",
                    "time": self._get_relative_time(idx),
                    "meta": f"Công việc: {row[1]}" if row[1] else "Công việc phổ biến",
                    "score": min(1.0, row[2] or 0.85),
                    "color": colors[idx % len(colors)],
                    "match": min(1.0, row[2] or 0.85)
                })
            
            return feed
        except Exception as e:
            logger.error(f"Error fetching live feed: {e}")
            return self._mock_live_feed()

    def _get_trending_jobs_by_category(self) -> List[Dict[str, Any]]:
        """
        Get trending jobs aggregated by category
        Returns: [{ id, title, company, location, salary, posted, trend, trendPercentage, ... }, ...]
        """
        try:
            if not self.db_connection:
                return self._mock_trending_jobs()

            cur = self.db_connection.cursor()
            
            # Get diverse job categories by selecting the top job from each industry
            # and extract top skills for each job using a subquery
            cur.execute("""
                WITH RankedJobs AS (
                    SELECT 
                        c.onet_code,
                        COALESCE(c.title_vi, c.title_en) as title,
                        c.industry_category,
                        COUNT(DISTINCT s.element_id) as skill_count,
                        ROW_NUMBER() OVER(PARTITION BY COALESCE(c.industry_category, 'Other') ORDER BY COUNT(DISTINCT s.element_id) DESC) as rn
                    FROM core.careers c
                    LEFT JOIN core.career_work_activity_summary s ON c.onet_code = s.onet_code
                    WHERE c.title_vi IS NOT NULL OR c.title_en IS NOT NULL
                    GROUP BY c.onet_code, title, c.industry_category
                )
                SELECT r.onet_code, r.title, r.industry_category, r.skill_count,
                       (SELECT ARRAY_AGG(COALESCE(m_inner.element_name_vi, m_inner.element_name))
                        FROM (
                            SELECT m.element_name_vi, m.element_name
                            FROM core.career_work_activity_summary s
                            JOIN core.career_work_activities_master m ON s.element_id = m.element_id
                            WHERE s.onet_code = r.onet_code
                            ORDER BY s.combined_score DESC
                            LIMIT 4
                        ) m_inner
                       ) as extracted_skills
                FROM RankedJobs r
                WHERE rn <= 4
                ORDER BY industry_category, rn ASC
                LIMIT 100
            """)
            
            rows = cur.fetchall()
            jobs = []
            companies = self._get_company_samples()
            locations = ["Hồ Chí Minh", "Hà Nội", "Đà Nẵng"]
            
            for idx, row in enumerate(rows):
                if row[1]:  # Has title
                    category = self._translate_industry(row[2] or "IT")
                    db_skills = row[4]
                    if db_skills and len(db_skills) > 0:
                        skills = db_skills
                    else:
                        skills = self._extract_skills_from_category(category, row[3])
                    
                    job = {
                        "id": str(idx + 1),
                        "title": row[1],
                        "company": companies[idx % len(companies)],
                        "location": locations[idx % len(locations)],
                        "salary": self._generate_salary_range(row[2] or "IT"),
                        "posted": self._get_relative_time(idx),
                        "trend": self._get_trend_direction(idx),
                        "trendPercentage": self._calculate_trend_percentage(idx),
                        "category": category,
                        "applicants": 20 + (idx * 15),
                        "urgency": ["high", "medium", "low"][idx % 3],
                        "skills": skills,
                        "description": f"Cơ hội việc làm hấp dẫn tại {companies[idx % len(companies)]} với vai trò {row[1]}. Chúng tôi đang tìm kiếm ứng viên tài năng có kinh nghiệm trong lĩnh vực {category} để tham gia phát triển các dự án trọng điểm..."
                    }
                    jobs.append(job)
            
            # Ensure we have 5 categories by merging with mock data if needed
            found_categories = set(job['category'] for job in jobs)
            if len(found_categories) < 5:
                mock_jobs = self._mock_trending_jobs()
                for m_job in mock_jobs:
                    if m_job['category'] not in found_categories:
                        jobs.append(m_job)
                        if len(set(j['category'] for j in jobs)) >= 5:
                            break
                # Since we broke early, we might not have all 15 jobs per newly added category.
                # Let's actually add all mock jobs for any missing category.
                
            # Better logic:
            found_categories = set(job['category'] for job in jobs)
            mock_jobs = self._mock_trending_jobs()
            for m_job in mock_jobs:
                if m_job['category'] not in found_categories:
                    jobs.append(m_job)
            
            return jobs
        except Exception as e:
            logger.error(f"Error fetching trending jobs: {e}")
            return self._mock_trending_jobs()

    # Helper methods
    
    def _mock_salary_trends(self) -> List[Dict[str, Any]]:
        return [
            {"period": "T1", "average": 1450},
            {"period": "T2", "average": 1520},
            {"period": "T3", "average": 1580},
            {"period": "T4", "average": 1650},
            {"period": "T5", "average": 1720},
            {"period": "T6", "average": 1750},
        ]

    def _mock_trending_skills(self) -> List[Dict[str, Any]]:
        return [
            {"skill": "Lập trình Python", "growth": 17.6, "trend_score": 92},
            {"skill": "Digital Marketing", "growth": 14.2, "trend_score": 85},
            {"skill": "Tư vấn & Chăm sóc khách hàng", "growth": 12.6, "trend_score": 82},
            {"skill": "Quản lý dự án", "growth": 10.7, "trend_score": 78},
            {"skill": "Thiết kế đồ họa", "growth": 8.3, "trend_score": 75},
            {"skill": "Phân tích dữ liệu", "growth": 15.2, "trend_score": 88},
            {"skill": "Giảng dạy & Đào tạo", "growth": 9.5, "trend_score": 80},
        ]

    def _mock_industry_growth(self) -> List[Dict[str, Any]]:
        return [
            {"industry": "IT & Phần mềm", "growth": 95},
            {"industry": "Kinh doanh & Tiếp thị", "growth": 88},
            {"industry": "Y tế & Chăm sóc sức khỏe", "growth": 85},
            {"industry": "Tài chính & Kế toán", "growth": 82},
            {"industry": "Giáo dục & Đào tạo", "growth": 78},
            {"industry": "Bán lẻ & Tiêu dùng", "growth": 75},
            {"industry": "Kỹ thuật & Xây dựng", "growth": 72},
            {"industry": "Thiết kế & Kiến trúc", "growth": 70},
            {"industry": "Sản xuất & Vận hành", "growth": 80},
            {"industry": "Nhân sự & HC", "growth": 65},
        ]

    def _mock_regional_demand(self) -> List[Dict[str, Any]]:
        return [
            {"region": "Hồ Chí Minh", "posts": 150, "change": "+12%"},
            {"region": "Hà Nội", "posts": 120, "change": "+8%"},
            {"region": "Đà Nẵng", "posts": 45, "change": "+5%"},
            {"region": "Cần Thơ", "posts": 28, "change": "+2%"},
            {"region": "Hải Phòng", "posts": 22, "change": "+1%"},
        ]

    def _mock_live_feed(self) -> List[Dict[str, Any]]:
        return [
            {"id": 1, "skill": "Phân tích dữ liệu", "time": "5 giây trước", "meta": "Data Analyst tại Shopee", "score": 0.98, "color": "text-indigo-600", "match": 0.98},
            {"id": 2, "skill": "Tư vấn y tế", "time": "14 giây trước", "meta": "Bác sĩ Đa khoa tại Vinmec", "score": 0.92, "color": "text-emerald-600", "match": 0.92},
            {"id": 3, "skill": "Quản lý tài chính", "time": "23 giây trước", "meta": "Chuyên viên Tài chính tại Vietcombank", "score": 0.89, "color": "text-purple-600", "match": 0.89},
            {"id": 4, "skill": "Thiết kế kết cấu", "time": "45 giây trước", "meta": "Kỹ sư Xây dựng tại Coteccons", "score": 0.95, "color": "text-rose-600", "match": 0.95},
        ]

    def _mock_trending_jobs(self) -> List[Dict[str, Any]]:
        base_jobs = [
            {
                "title_prefix": ["Bác sĩ Đa khoa", "Y tá trưởng", "Điều dưỡng viên", "Chuyên viên Y tế"],
                "category": "Y tế & Chăm sóc sức khỏe",
                "skills": ["Khám bệnh", "Tư vấn y tế", "Cấp cứu", "Chăm sóc bệnh nhân"],
                "desc": "Cơ hội làm việc tại bệnh viện tuyến đầu với trang thiết bị hiện đại. Yêu cầu có chứng chỉ hành nghề và ít nhất 3 năm kinh nghiệm làm việc tại khoa khám bệnh."
            },
            {
                "title_prefix": ["Chuyên viên Marketing", "Quản lý Kinh doanh", "Nhân viên Sales", "Giám đốc Truyền thông"],
                "category": "Kinh doanh & Tiếp thị",
                "skills": ["Digital Marketing", "Content Creation", "SEO", "Event Management"],
                "desc": "Lên ý tưởng và triển khai các chiến dịch marketing đa kênh. Đóng góp trực tiếp vào định vị thương hiệu công ty trên thị trường."
            },
            {
                "title_prefix": ["Kỹ sư Cầu đường", "Chuyên viên Giám sát", "Kiến trúc sư", "Kỹ sư Cơ điện"],
                "category": "Kỹ thuật & Xây dựng",
                "skills": ["AutoCAD", "Thiết kế kết cấu", "Giám sát thi công", "Bóc tách khối lượng"],
                "desc": "Tham gia thiết kế và giám sát các công trình hạ tầng giao thông trọng điểm quốc gia. Sẵn sàng đi công tác và làm việc tại hiện trường."
            },
            {
                "title_prefix": ["Giảng viên Tiếng Anh", "Giáo viên Kỹ năng mềm", "Chuyên gia Đào tạo", "Cố vấn Học tập"],
                "category": "Giáo dục & Đào tạo",
                "skills": ["Giảng dạy", "Giao tiếp", "Phát triển giáo trình", "Sư phạm"],
                "desc": "Giảng dạy các khóa học luyện thi và chuyên môn. Yêu cầu chứng chỉ và có đam mê với ngành giáo dục."
            },
            {
                "title_prefix": ["Senior Software Engineer", "Full Stack Developer", "Data Scientist", "DevOps Engineer"],
                "category": "IT & Phần mềm",
                "skills": ["Java", "React", "Python", "AWS"],
                "desc": "Phát triển các hệ thống backend quy mô lớn. Cơ hội thăng tiến lên vị trí Technical Lead và làm việc với khách hàng toàn cầu."
            }
        ]
        
        jobs = []
        companies = ["Bệnh viện Đa khoa Quốc tế", "Tập đoàn Vingroup", "Tập đoàn Đèo Cả", "Hệ thống Anh ngữ ILA", "FPT Software", "VNG Corporation", "Viettel", "Techcombank", "Shopee", "Tiki"]
        locations = ["Hồ Chí Minh", "Hà Nội", "Đà Nẵng", "Cần Thơ", "Hải Phòng"]
        
        for idx, base in enumerate(base_jobs):
            for i in range(15):
                senior_tag = " (Senior)" if i > 3 else ""
                title = f"{base['title_prefix'][i % len(base['title_prefix'])]}{senior_tag}"
                
                jobs.append({
                    "id": f"mock-job-{idx}-{i}",
                    "title": title.strip(),
                    "company": companies[(i + idx) % len(companies)],
                    "location": locations[i % len(locations)],
                    "salary": f"{15 + (i % 5) * 5},000,000 - {30 + (i % 5) * 10},000,000 VND",
                    "posted": f"{(i % 24) + 1} giờ trước",
                    "trend": ["up", "stable", "down"][i % 3],
                    "trendPercentage": 15 - (i % 5) + (i % 3) * 5,
                    "category": base["category"],
                    "applicants": 10 + i * 5,
                    "urgency": "high" if i % 4 == 0 else "medium" if i % 2 == 0 else "low",
                    "skills": base["skills"],
                    "description": base["desc"]
                })
        
        return jobs

    def _translate_industry(self, industry: str) -> str:
        """Translate industry category to Vietnamese friendly name"""
        mapping = {
            "Computer and Mathematical": "IT & Công nghệ",
            "Management": "Quản lý & Lãnh đạo",
            "Healthcare": "Y tế & Chăm sóc",
            "Engineering": "Kỹ thuật",
            "Education": "Giáo dục",
            "Business": "Kinh doanh",
            "Finance": "Tài chính",
            "Sales": "Bán hàng & Marketing",
            "IT": "IT & Công nghệ",
        }
        return mapping.get(industry, industry or "Công nghệ")

    def _get_company_samples(self) -> List[str]:
        return [
            "VinAI Research",
            "VNG Corporation",
            "TomoChain",
            "FPT Software",
            "Zalo Group",
            "Grab Vietnam",
            "Shopee Vietnam",
        ]

    def _generate_salary_range(self, category: str) -> str:
        """Generate salary range based on category"""
        ranges = {
            "IT": "$1,800 - $3,500",
            "AI/ML": "$2,500 - $5,000",
            "Management": "$2,000 - $4,000",
            "Healthcare": "$1,200 - $2,500",
            "Engineering": "$2,000 - $4,500",
        }
        return ranges.get(category, "$1,500 - $3,000")

    def _extract_skills_from_category(self, category: str, skill_count: int = 3) -> List[str]:
        """Extract top skills for a category"""
        category_skills = {
            "IT & Công nghệ": ["Python", "JavaScript", "React", "Docker", "AWS"],
            "AI/ML": ["Python", "TensorFlow", "PyTorch", "NLP", "Deep Learning"],
            "Kỹ thuật": ["CAD", "AutoCAD", "Engineering", "Project Management"],
            "Quản lý & Lãnh đạo": ["Leadership", "Strategic Planning", "Communication"],
            "Y tế & Chăm sóc": ["Clinical Skills", "Patient Care", "Communication"],
        }
        skills = category_skills.get(category, ["Communication", "Problem Solving", "Teamwork"])
        return skills[:min(4, max(1, skill_count))]

    def _get_trend_direction(self, index: int) -> str:
        """Get trend direction based on index"""
        directions = ["up", "up", "stable", "down"]
        return directions[index % len(directions)]

    def _calculate_trend_percentage(self, index: int) -> int:
        """Calculate trend percentage"""
        percentages = [25, 18, 5, -8, 12]
        return percentages[index % len(percentages)]

    def _get_relative_time(self, index: int) -> str:
        """Get relative time based on index"""
        times = [
            "2 giờ trước",
            "5 giờ trước",
            "1 ngày trước",
            "3 ngày trước",
            "5 ngày trước",
        ]
        return times[index % len(times)]
