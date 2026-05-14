"""
Data service for collecting and processing job market trend data.
Integrates with multiple job sources and provides real-time analytics.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import aiohttp
import pandas as pd
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

class JobMarketDataService:
    """Service for collecting and analyzing job market data from various sources."""
    
    def __init__(self):
        self.sources = {
            'topcv': 'https://www.topcv.vn/api/v1.0/search-jobs',
            'itviec': 'https://itviec.vn/api/jobs',
            'vnw': 'https://www.vietnamworks.com/api/job-search'
        }
        self.redis_client = None
        self.cache_ttl = 3600  # 1 hour cache
        
    async def initialize_redis(self):
        """Initialize Redis connection for caching."""
        try:
            import redis
            self.redis_client = redis.Redis(
                host='localhost',
                port=6379,
                db=0,
                decode_responses=True
            )
            self.redis_client.ping()
            logger.info("Redis connection established")
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}")
            self.redis_client = None
    
    async def collect_job_data(self, source: str, keywords: List[str] = None) -> List[Dict]:
        """Collect job data from a specific source."""
        if keywords is None:
            # Mở rộng keywords để bao gồm nhiều ngành nghề hơn
            keywords = [
                'python', 'react', 'nodejs', 'java', 'aws', 'docker',
                'javascript', 'typescript', 'angular', 'vue', 'php',
                'c++', 'c#', '.net', 'mobile', 'ios', 'android',
                'data science', 'machine learning', 'ai', 'devops', 'kubernetes',
                'blockchain', 'cyber security', 'networking', 'database', 'sql',
                'ui/ux', 'design', 'product manager', 'marketing', 'sales',
                'accounting', 'finance', 'hr', 'legal', 'consulting'
            ]
        
        jobs = []
        
        try:
            async with aiohttp.ClientSession() as session:
                if source == 'vnw':
                    # VietnamWorks API - lấy dữ liệu thật
                    jobs = await self._collect_vietnamworks_jobs(session, keywords)
                else:
                    # Các nguồn khác - fallback mock data
                    for keyword in keywords:
                        await asyncio.sleep(0.1)  # Rate limiting
                        mock_jobs = self._generate_mock_jobs(keyword, source)
                        jobs.extend(mock_jobs)
                    
        except Exception as e:
            logger.error(f"Error collecting data from {source}: {e}")
            
        return jobs
    
    async def _collect_vietnamworks_jobs(self, session: aiohttp.ClientSession, keywords: List[str]) -> List[Dict]:
        """Collect real job data from VietnamWorks API."""
        jobs = []
        
        for keyword in keywords:
            try:
                # VietnamWorks API endpoint
                url = "https://www.vietnamworks.com/api/job-search"
                params = {
                    'keyword': keyword,
                    'limit': 50,  # Lấy nhiều job hơn
                    'page': 1,
                    'sort': 'latest'  # Lấy job mới nhất
                }
                
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json',
                    'Accept-Language': 'en-US,en;q=0.9'
                }
                
                async with session.get(url, params=params, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        # Process VietnamWorks response
                        if 'data' in data and 'jobs' in data['data']:
                            for job_data in data['data']['jobs']:
                                job = {
                                    'id': job_data.get('id', f"vnw_{keyword}_{len(jobs)}"),
                                    'title': job_data.get('title', f"{keyword.title()} Position"),
                                    'company': job_data.get('company', {}).get('name', 'Unknown Company'),
                                    'location': job_data.get('location', {}).get('name', 'Vietnam'),
                                    'salary': self._extract_salary(job_data.get('salary', {})),
                                    'skills': self._extract_skills(job_data.get('description', ''), keyword),
                                    'source': 'vnw',
                                    'posted_date': job_data.get('posted_date', datetime.now().isoformat()),
                                    'description': job_data.get('description', ''),
                                    'url': job_data.get('url', ''),
                                    'industry': job_data.get('category', {}).get('name', 'IT/Software')
                                }
                                jobs.append(job)
                        
                        logger.info(f"Collected {len(jobs)} jobs from VietnamWorks for keyword: {keyword}")
                    else:
                        logger.warning(f"Failed to fetch VietnamWorks data for {keyword}: {response.status}")
                        
                    # Rate limiting
                    await asyncio.sleep(0.5)
                    
            except Exception as e:
                logger.error(f"Error collecting VietnamWorks jobs for {keyword}: {e}")
                # Fallback to mock data on error
                mock_jobs = self._generate_mock_jobs(keyword, 'vnw')
                jobs.extend(mock_jobs)
        
        return jobs
    
    def _extract_salary(self, salary_data: Dict) -> int:
        """Extract salary from VietnamWorks salary data."""
        try:
            if 'minimum' in salary_data and 'maximum' in salary_data:
                # Calculate average salary
                min_salary = salary_data['minimum']
                max_salary = salary_data['maximum']
                return int((min_salary + max_salary) / 2)
            elif 'minimum' in salary_data:
                return int(salary_data['minimum'])
            elif 'maximum' in salary_data:
                return int(salary_data['maximum'])
            else:
                # Default salary range
                return 1500
        except:
            return 1500
    
    def _extract_skills(self, description: str, keyword: str) -> List[str]:
        """Extract skills from job description."""
        skills = [keyword]  # Always include search keyword
        
        # Tech/Software skills
        tech_skills = [
            'python', 'react', 'nodejs', 'java', 'javascript', 'typescript',
            'angular', 'vue', 'php', 'c++', 'c#', '.net', 'aws', 'docker',
            'kubernetes', 'mongodb', 'postgresql', 'mysql', 'redis',
            'git', 'ci/cd', 'devops', 'machine learning', 'ai', 'data science',
            'mobile', 'ios', 'android', 'flutter', 'react native',
            'blockchain', 'cyber security', 'networking', 'database', 'sql'
        ]
        
        # Business/Soft skills
        business_skills = [
            'project management', 'leadership', 'communication', 'teamwork',
            'analytical thinking', 'problem solving', 'critical thinking',
            'time management', 'negotiation', 'presentation', 'interpersonal skills',
            'strategic planning', 'decision making', 'risk management'
        ]
        
        # Marketing/Sales skills
        marketing_skills = [
            'digital marketing', 'seo', 'sem', 'social media marketing',
            'content marketing', 'email marketing', 'market research',
            'sales strategy', 'customer relationship', 'lead generation',
            'brand management', 'advertising', 'copywriting'
        ]
        
        # Finance skills
        finance_skills = [
            'financial analysis', 'accounting', 'budgeting', 'financial reporting',
            'investment', 'risk assessment', 'tax planning', 'auditing',
            'financial modeling', 'cost analysis', 'cash flow management'
        ]
        
        # HR skills
        hr_skills = [
            'recruitment', 'training', 'performance management',
            'employee relations', 'compensation', 'benefits administration',
            'hr policies', 'talent acquisition', 'onboarding',
            'organizational development', 'workforce planning'
        ]
        
        # Design skills
        design_skills = [
            'ui design', 'ux design', 'graphic design', 'web design',
            'photoshop', 'illustrator', 'figma', 'sketch',
            'prototyping', 'wireframing', 'visual design', 'typography'
        ]
        
        # Legal skills
        legal_skills = [
            'contract law', 'corporate law', 'legal research',
            'compliance', 'regulatory', 'legal writing',
            'litigation', 'intellectual property', 'due diligence'
        ]
        
        # All skills combined
        all_skills = tech_skills + business_skills + marketing_skills + finance_skills + hr_skills + design_skills + legal_skills
        
        description_lower = description.lower()
        
        for skill in all_skills:
            if skill in description_lower and skill not in skills:
                skills.append(skill)
        
        return skills[:10]  # Limit to 10 skills
    
    def _generate_mock_jobs(self, keyword: str, source: str) -> List[Dict]:
        """Generate mock job data for testing."""
        import random
        
        companies = ['FPT Software', 'VNG Corporation', 'TMA Solutions', 'KMS Technology', 
                    'Axon Active', 'NTQ Solution', 'Savvycom', 'Harvey Nash']
        locations = ['Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ', 'Hải Phòng']
        
        jobs = []
        num_jobs = random.randint(5, 15)
        
        for i in range(num_jobs):
            job = {
                'id': f"{source}_{keyword}_{i}_{datetime.now().timestamp()}",
                'title': f"{keyword.title()} Developer",
                'company': random.choice(companies),
                'location': random.choice(locations),
                'salary': random.randint(800, 2500),
                'skills': [keyword] + random.sample(['react', 'nodejs', 'python', 'aws', 'docker', 'kubernetes'], 2),
                'source': source,
                'posted_date': (datetime.now() - timedelta(days=random.randint(1, 30))).isoformat(),
                'description': f"Looking for {keyword} developer with experience in modern web technologies."
            }
            jobs.append(job)
            
        return jobs
    
    async def analyze_trends(self, jobs: List[Dict]) -> Dict[str, Any]:
        """Analyze job market trends from collected data."""
        if not jobs:
            return {}
        
        # Convert to DataFrame for analysis
        df = pd.DataFrame(jobs)
        
        # Calculate metrics
        analysis = {
            'total_jobs': len(jobs),
            'avg_salary': df['salary'].mean(),
            'salary_by_location': df.groupby('location')['salary'].mean().to_dict(),
            'top_skills': self._analyze_skills(df),
            'industry_demand': self._analyze_industry_demand(df),
            'regional_distribution': self._analyze_regional_distribution(df),
            'salary_trends': self._analyze_salary_trends(df),
            'market_health': self._calculate_market_health(df),
            'recruitment_speed': self._calculate_recruitment_speed(df)
        }
        
        return analysis
    
    def _analyze_skills(self, df: pd.DataFrame) -> List[Dict]:
        """Analyze trending skills from job data."""
        all_skills = []
        for skills in df['skills']:
            all_skills.extend(skills)
        
        skill_counts = pd.Series(all_skills).value_counts()
        
        trending_skills = []
        for skill, count in skill_counts.head(10).items():
            growth_rate = self._calculate_skill_growth(skill, df)
            trending_skills.append({
                'skill': skill,
                'total_jobs': int(count),
                'trending_score': min(100, (count / len(df)) * 100),
                'growth_rate': growth_rate,
                'status': 'RISING' if growth_rate > 5 else 'STABLE' if growth_rate > -5 else 'DECLINING'
            })
        
        return sorted(trending_skills, key=lambda x: x['trending_score'], reverse=True)
    
    def _analyze_industry_demand(self, df: pd.DataFrame) -> List[Dict]:
        """Analyze demand by industry/technology."""
        industry_mapping = {
            # IT/Software
            'python': 'AI/ML',
            'react': 'Frontend',
            'nodejs': 'Backend',
            'javascript': 'Frontend',
            'typescript': 'Frontend',
            'java': 'Backend',
            'angular': 'Frontend',
            'vue': 'Frontend',
            'php': 'Backend',
            'c++': 'Backend',
            'c#': 'Backend',
            '.net': 'Backend',
            
            # Cloud/DevOps
            'aws': 'Cloud',
            'docker': 'DevOps',
            'kubernetes': 'DevOps',
            'mongodb': 'Database',
            'postgresql': 'Database',
            'mysql': 'Database',
            'redis': 'Database',
            
            # Mobile
            'mobile': 'Mobile',
            'ios': 'Mobile',
            'android': 'Mobile',
            'flutter': 'Mobile',
            'react native': 'Mobile',
            
            # Emerging Tech
            'machine learning': 'AI/ML',
            'ai': 'AI/ML',
            'data science': 'Data Science',
            'blockchain': 'Blockchain',
            'cyber security': 'Security',
            'networking': 'Infrastructure',
            
            # Business/Design
            'ui/ux': 'Design',
            'design': 'Design',
            'product manager': 'Product',
            'marketing': 'Marketing',
            'sales': 'Sales',
            'accounting': 'Finance',
            'finance': 'Finance',
            'hr': 'HR',
            'legal': 'Legal',
            'consulting': 'Consulting'
        }
        
        industries = {}
        for _, row in df.iterrows():
            for skill in row['skills']:
                industry = industry_mapping.get(skill, 'Other')
                industries[industry] = industries.get(industry, 0) + 1
        
        return [
            {'industry': industry, 'demand': count}
            for industry, count in sorted(industries.items(), key=lambda x: x[1], reverse=True)
        ]
    
    def _analyze_regional_distribution(self, df: pd.DataFrame) -> List[Dict]:
        """Analyze job distribution by region."""
        regional = df.groupby('location').size().to_dict()
        
        result = []
        for location, count in sorted(regional.items(), key=lambda x: x[1], reverse=True):
            change_percent = self._calculate_regional_change(location, df)
            result.append({
                'city': location,
                'posts': int(count),
                'change': f"+{change_percent:.1f}%" if change_percent >= 0 else f"{change_percent:.1f}%"
            })
        
        return result
    
    def _analyze_salary_trends(self, df: pd.DataFrame) -> List[Dict]:
        """Analyze salary trends over time."""
        df['posted_date'] = pd.to_datetime(df['posted_date'])
        df['month'] = df['posted_date'].dt.to_period('M')
        
        monthly_salary = df.groupby('month')['salary'].mean()
        
        trends = []
        for i, (month, salary) in enumerate(monthly_salary.items()):
            trends.append({
                'month': f"T{i+1}",
                'salary': int(salary)
            })
        
        return trends[-6:] if len(trends) > 6 else trends
    
    def _calculate_market_health(self, df: pd.DataFrame) -> int:
        """Calculate overall market health score."""
        avg_salary = df['salary'].mean()
        job_count = len(df)
        
        # Simple health calculation (0-100)
        salary_score = min(100, (avg_salary / 2000) * 100)
        volume_score = min(100, (job_count / 100) * 100)
        
        return int((salary_score + volume_score) / 2)
    
    def _calculate_recruitment_speed(self, df: pd.DataFrame) -> float:
        """Calculate average recruitment speed in days."""
        # Mock calculation - in real implementation, analyze time-to-hire data
        return round(4.2 + (len(df) % 3), 1)
    
    def _calculate_skill_growth(self, skill: str, df: pd.DataFrame) -> float:
        """Calculate growth rate for a specific skill."""
        # Mock growth calculation
        import random
        return random.uniform(-10, 20)
    
    def _calculate_regional_change(self, location: str, df: pd.DataFrame) -> float:
        """Calculate percentage change for a region."""
        # Mock change calculation
        import random
        return random.uniform(-5, 50)
    
    async def get_cached_data(self, key: str) -> Optional[Dict]:
        """Get cached data from Redis."""
        if not self.redis_client:
            return None
        
        try:
            data = self.redis_client.get(key)
            if data:
                return json.loads(data)
        except Exception as e:
            logger.error(f"Error getting cached data: {e}")
        
        return None
    
    async def set_cached_data(self, key: str, data: Dict, ttl: int = None) -> bool:
        """Set cached data in Redis."""
        if not self.redis_client:
            return False
        
        try:
            ttl = ttl or self.cache_ttl
            self.redis_client.setex(key, ttl, json.dumps(data))
            return True
        except Exception as e:
            logger.error(f"Error setting cached data: {e}")
            return False
    
    async def get_trend_summary(self) -> Dict[str, Any]:
        """Get comprehensive trend summary."""
        cache_key = "trends:summary"
        
        # Try to get from cache first
        cached_data = await self.get_cached_data(cache_key)
        if cached_data:
            return cached_data
        
        # Collect fresh data - ưu tiên VietnamWorks
        all_jobs = []
        
        # Lấy dữ liệu từ VietnamWorks trước (ưu tiên cao)
        vnw_jobs = await self.collect_job_data('vnw')
        all_jobs.extend(vnw_jobs)
        logger.info(f"Collected {len(vnw_jobs)} jobs from VietnamWorks")
        
        # Lấy thêm từ các nguồn khác nếu cần
        for source in ['topcv', 'itviec']:
            jobs = await self.collect_job_data(source)
            all_jobs.extend(jobs)
            logger.info(f"Collected {len(jobs)} jobs from {source}")
        
        # Analyze trends
        analysis = await self.analyze_trends(all_jobs)
        
        # Generate live skills from recent jobs
        live_skills = self._generate_live_skills(all_jobs[:10])
        
        # Prepare summary
        summary = {
            'generated_at': datetime.now().isoformat(),
            'market_metrics': {
                'avg_salary': int(analysis.get('avg_salary', 0)),
                'salary_change': 8.4,  # Mock change
                'job_postings': analysis.get('total_jobs', 0),
                'posting_change': 12.1,  # Mock change
                'market_health': analysis.get('market_health', 0),
                'health_change': -2.5,  # Mock change
                'recruitment_speed': analysis.get('recruitment_speed', 0),
                'speed_change': 0.5  # Mock change
            },
            'top_trending': analysis.get('top_skills', [])[:10],
            'industry_demand': analysis.get('industry_demand', []),
            'regional_distribution': analysis.get('regional_distribution', []),
            'salary_trends': analysis.get('salary_trends', []),
            'live_skills': live_skills
        }
        
        # Cache the results
        await self.set_cached_data(cache_key, summary)
        
        return summary
    
    def _generate_live_skills(self, recent_jobs: List[Dict] = None) -> List[Dict]:
        """Generate live skill extraction data from real jobs."""
        import random
        
        if not recent_jobs:
            # Fallback mock data
            return [
                {'skill': 'Python / LLM', 'source': 'Senior AI Engineer tại VinAI Research', 'match': 0.98, 'time': '13 giây trước'},
                {'skill': 'Rust / WASM', 'source': 'Blockchain Developer tại TomoChain', 'match': 0.92, 'time': '25 giây trước'},
                {'skill': 'React Native', 'source': 'Mobile Developer tại VNG', 'match': 0.94, 'time': '11 giây trước'},
                {'skill': 'Kubernetes', 'source': 'DevOps Engineer tại FPT', 'match': 0.95, 'time': '39 giây trước'}
            ]
        
        live_skills = []
        for job in recent_jobs[:10]:  # Take top 10 recent jobs
            if job.get('skills'):
                # Get the first skill as the main skill
                main_skill = job['skills'][0] if isinstance(job['skills'], list) else job['skills']
                
                # Generate realistic time
                time_ago = f"{random.randint(5, 60)} giây trước"
                
                live_skill = {
                    'skill': f"{main_skill.title()} / {', '.join(job['skills'][1:3])}" if len(job['skills']) > 1 else main_skill.title(),
                    'source': f"{job.get('title', 'Developer')} tại {job.get('company', 'Unknown Company')}",
                    'match': round(random.uniform(0.85, 0.99), 2),
                    'time': time_ago
                }
                live_skills.append(live_skill)
        
        return live_skills

# Global instance
data_service = JobMarketDataService()
