"""
Graph Analyzer - Giai đoạn 2
Truy vấn database để lấy yêu cầu kỹ năng và so sánh với CV
"""
import hashlib
import os
import time
from typing import Dict, List

from sqlalchemy import select
from sqlalchemy.orm import Session


# Module-level cache for Gemini current-career skill suggestions.
# Keyed by (current_career, target_career, hash(cv_skill_names)) — stable across requests.
# Cuts down on quota usage and gives instant response when the same combination is requested.
_CURRENT_CAREER_SUGG_CACHE: Dict[str, tuple[float, List[Dict]]] = {}
_CURRENT_CAREER_SUGG_TTL: float = 24 * 3600.0  # 24 hours


def _make_suggestion_cache_key(current_career: str, target_career: str, cv_skill_names: List[str]) -> str:
    skills_norm = sorted({(name or "").strip().lower() for name in cv_skill_names if name})
    payload = f"{current_career}|{target_career}|{','.join(skills_norm)}"
    return hashlib.sha1(payload.encode("utf-8")).hexdigest()


class SkillGraphAnalyzer:
    """Analyzer để so sánh kỹ năng CV với yêu cầu từ database"""

    SOFTWARE_CAREER_MARKERS = (
        "software", "developer", "programmer", "web", "data", "computer",
        "information technology", "ai", "machine learning", "frontend",
        "backend", "devops", "systems analyst"
    )
    TECH_EXTRA_SKILLS = {
        "vi-sbert", "phobert", "ai", "express.js", "backend", "typescript",
        "frontend", "react.js", "react", "axios", "vector search", "postgresql",
        "jwt authentication", "spring boot", "pgvector", "spring security",
        "bcrypt", "daisyui", "tailwind css", "tailwindcss", "spring mvc",
        "fastapi", "restful apis", "oop", "zustand", "nlp", "mongodb",
        "mongoose", "cloudinary", "faiss", "sql", "recommendation systems",
        "neumf", "node.js", "javascript", "docker", "redis", "sqlite",
        "pytorch", "machine learning", "web development"
    }
    TECH_EXTRA_CATEGORIES = {
        "ai", "backend", "frontend", "database", "security", "services",
        "programming", "web development", "devops", "lập trình"
    }
    SOFTWARE_SECURITY_SKILLS = {
        "jwt", "jwt authentication", "bcrypt", "oauth2", "spring security",
        "csrf", "xss", "web security", "authentication", "authorization"
    }
    MAX_IMPORTANT_GAPS = 20
    CURRENT_CAREER_SUGGESTION_LIMIT = 10
    
    def __init__(self, neo4j_driver=None, db_session: Session = None):
        """
        Initialize analyzer
        
        Args:
            neo4j_driver: Neo4j driver instance (optional, deprecated)
            db_session: SQLAlchemy session for PostgreSQL (preferred)
        """
        self.driver = neo4j_driver
        self.db = db_session

    @staticmethod
    def _norm(value: str) -> str:
        return str(value or "").strip().lower()

    def _is_software_like_career(self, career_name: str) -> bool:
        career_text = self._norm(career_name)
        return any(marker in career_text for marker in self.SOFTWARE_CAREER_MARKERS)

    def _is_tech_extra_skill(self, skill: Dict) -> bool:
        name = self._norm(skill.get("name"))
        category = self._norm(skill.get("category"))
        return name in self.TECH_EXTRA_SKILLS or category in self.TECH_EXTRA_CATEGORIES

    def _is_domain_incompatible_match(self, cv_skill: Dict | str, job_skill: Dict | str, career_name: str = "") -> bool:
        """Block cross-domain false positives, especially IT security vs protective-service security."""
        if isinstance(cv_skill, dict):
            cv_name = str(cv_skill.get("name") or "")
            cv_category = str(cv_skill.get("category") or "")
        else:
            cv_name = str(cv_skill or "")
            cv_category = ""
        if isinstance(job_skill, dict):
            job_name = str(job_skill.get("name") or "")
            job_category = str(job_skill.get("category") or "")
        else:
            job_name = str(job_skill or "")
            job_category = ""

        cv_key = self._skill_key(cv_name)
        job_key = self._skill_key(job_name)
        if not cv_key or not job_key:
            return False

        if self._equivalent_skill_keys(cv_name) & self._equivalent_skill_keys(job_name):
            return False

        if self._is_software_like_career(career_name):
            return False

        cv_is_tech = self._is_tech_extra_skill({"name": cv_name, "category": cv_category})
        cv_is_software_security = cv_key in self.SOFTWARE_SECURITY_SKILLS or self._skill_key(cv_category) == "security"
        job_text = self._skill_key(f"{job_name} {job_category}")
        protective_security_terms = {
            "security", "public safety", "law", "protective", "guard",
            "patrol", "surveillance", "emergency", "protection"
        }

        if cv_is_tech and (job_key not in self.TECH_EXTRA_SKILLS):
            return True
        if cv_is_software_security and any(term in job_text for term in protective_security_terms):
            return True
        return False

    def _filter_contextual_extra_skills(self, extra_skills: List[Dict], career_name: str) -> List[Dict]:
        return extra_skills

    def _skill_key(self, value: str) -> str:
        import re as _re
        return _re.sub(r"[^a-z0-9]+", " ", str(value or "").lower()).strip()

    def _equivalent_skill_keys(self, name: str) -> set[str]:
        key = self._skill_key(name)
        aliases = {
            "english language": {"english", "english language", "tiếng anh", "ngoại ngữ tiếng anh"},
            "english": {"english", "english language", "tiếng anh", "ngoại ngữ tiếng anh"},
            "react js": {"react", "react js", "react.js"},
            "node js": {"node", "node js", "node.js"},
            "express js": {"express", "express js", "express.js"},
            "restful apis": {"rest api", "restful api", "restful apis", "api"},
            "javascript": {"javascript", "js", "es6"},
            "typescript": {"typescript", "ts"},
            "cloudinary": {"cloudinary"},
            "bcrypt": {"bcrypt"},
        }
        for alias_set in aliases.values():
            normalized = {self._skill_key(item) for item in alias_set}
            if key in normalized:
                return normalized
        return {key}

    def _has_cv_skill(self, cv_skill_keys: set[str], candidate_name: str) -> bool:
        return bool(self._equivalent_skill_keys(candidate_name) & cv_skill_keys)

    def _infer_cv_career_label(self, cv_skills: List[Dict]) -> str:
        text = " ".join(f"{s.get('name', '')} {s.get('category', '')}" for s in (cv_skills or [])).lower()
        
        # IT / Developer careers
        if any(token in text for token in ["react", "node", "express", "spring boot", "mongodb", "postgresql", "typescript", "javascript", "fastapi"]):
            if any(token in text for token in ["react", "frontend", "typescript", "javascript"]) and any(token in text for token in ["node", "express", "backend", "spring boot", "fastapi", "mongodb", "postgresql"]):
                return "Fullstack Web Developer"
            if any(token in text for token in ["node", "express", "backend", "spring boot", "fastapi", "mongodb", "postgresql"]):
                return "Backend Developer"
            return "Frontend Developer"
        
        # AI / Data careers
        if any(token in text for token in ["pandas", "numpy", "faiss", "nlp", "machine learning", "phobert", "sbert", "data analysis", "data science"]):
            return "AI/Data Developer"
        
        # Sales / Business Development careers
        if any(token in text for token in ["sales", "kinh doanh", "bán hàng", "business development", "account manager", "crm", "khách hàng", "doanh số", "chốt sale", "tư vấn bán hàng"]):
            return "Sales/Kinh doanh"
        
        # Marketing careers
        if any(token in text for token in ["marketing", "seo", "content", "digital marketing", "quảng cáo", "social media", "brand", "copywriting"]):
            return "Marketing"
        
        # Office / Admin careers
        if any(token in text for token in ["admin", "hành chính", "văn phòng", "office", "thư ký", "secretary", "assistant"]):
            return "Office/Hành chính"
        
        return "Nghề hiện tại theo CV"

    def _current_career_catalog(self, career_label: str) -> List[Dict]:
        """Return baseline skill suggestions for the inferred CV career when Gemini is unavailable."""
        label_lower = career_label.lower()

        # IT / Developer careers
        if any(kw in label_lower for kw in ["fullstack", "backend", "frontend", "developer", "lập trình"]):
            return [
                {"name": "Docker", "category": "DevOps", "description_vn": "Docker giúp đóng gói ứng dụng và toàn bộ môi trường chạy vào container, giúp triển khai nhất quán giữa máy local, staging và production."},
                {"name": "CI/CD", "category": "DevOps", "description_vn": "CI/CD là quy trình tự động kiểm thử, build và triển khai mã nguồn, giúp giảm lỗi thủ công và tăng tốc phát hành phần mềm."},
                {"name": "Unit Testing", "category": "Testing", "description_vn": "Unit Testing kiểm thử từng hàm, component hoặc module nhỏ để phát hiện lỗi sớm và bảo vệ logic quan trọng khi refactor."},
                {"name": "Integration Testing", "category": "Testing", "description_vn": "Integration Testing kiểm tra cách API, database, service và frontend phối hợp với nhau trong luồng nghiệp vụ thực tế."},
                {"name": "Redis", "category": "Backend", "description_vn": "Redis là kho dữ liệu in-memory thường dùng cho cache, session, rate limiting và hàng đợi nhẹ để tăng tốc hệ thống web."},
                {"name": "Docker Compose", "category": "DevOps", "description_vn": "Docker Compose giúp định nghĩa và chạy nhiều service như backend, frontend, database, cache trong một môi trường phát triển thống nhất."},
                {"name": "Web Security", "category": "Security", "description_vn": "Web Security bao gồm các kỹ thuật phòng chống XSS, CSRF, SQL/NoSQL injection, lộ token và cấu hình phân quyền sai trong ứng dụng web."},
                {"name": "OAuth2", "category": "Security", "description_vn": "OAuth2 là chuẩn ủy quyền phổ biến để đăng nhập và cấp quyền an toàn qua các nhà cung cấp như Google, GitHub hoặc hệ thống SSO."},
                {"name": "System Design", "category": "Architecture", "description_vn": "System Design là năng lực thiết kế kiến trúc hệ thống có khả năng mở rộng, chịu tải, chia module rõ ràng và kiểm soát rủi ro vận hành."},
                {"name": "Observability", "category": "DevOps", "description_vn": "Observability gồm logging, metrics và tracing để theo dõi sức khỏe hệ thống, phát hiện lỗi và điều tra nguyên nhân khi production gặp sự cố."},
                {"name": "API Documentation", "category": "Backend", "description_vn": "API Documentation mô tả endpoint, request, response và lỗi có thể xảy ra, giúp frontend/backend và bên thứ ba tích hợp chính xác hơn."},
                {"name": "Accessibility", "category": "Frontend", "description_vn": "Accessibility giúp giao diện web dễ dùng với nhiều nhóm người dùng hơn thông qua semantic HTML, keyboard navigation, contrast và ARIA hợp lý."},
            ]

        # AI / Data careers
        if any(kw in label_lower for kw in ["ai", "data", "machine learning", "ml", "analyst"]):
            return [
                {"name": "SQL nâng cao", "category": "Database", "description_vn": "Viết truy vấn phức tạp với JOIN, subquery, window function để phân tích dữ liệu lớn hiệu quả."},
                {"name": "Python cho Data", "category": "Programming", "description_vn": "Sử dụng pandas, numpy, matplotlib để xử lý, phân tích và trực quan hóa dữ liệu."},
                {"name": "Thống kê ứng dụng", "category": "Analysis", "description_vn": "Hiểu và áp dụng các khái niệm thống kê như phân phối, kiểm định giả thuyết, hồi quy vào phân tích thực tế."},
                {"name": "Data Visualization", "category": "Analysis", "description_vn": "Tạo biểu đồ và dashboard trực quan giúp stakeholder hiểu insight từ dữ liệu."},
                {"name": "ETL Pipeline", "category": "Data Engineering", "description_vn": "Xây dựng quy trình trích xuất, chuyển đổi và nạp dữ liệu từ nhiều nguồn vào data warehouse."},
                {"name": "Machine Learning cơ bản", "category": "AI", "description_vn": "Hiểu và áp dụng các thuật toán ML phổ biến như regression, classification, clustering."},
                {"name": "Feature Engineering", "category": "AI", "description_vn": "Tạo và chọn lọc đặc trưng từ dữ liệu thô để cải thiện hiệu suất mô hình."},
                {"name": "Model Evaluation", "category": "AI", "description_vn": "Đánh giá mô hình bằng các metrics phù hợp và tránh overfitting/underfitting."},
                {"name": "Git cho Data Science", "category": "Tools", "description_vn": "Quản lý phiên bản code và notebook, cộng tác với team qua Git."},
                {"name": "Storytelling với dữ liệu", "category": "Communication", "description_vn": "Trình bày kết quả phân tích một cách thuyết phục cho đối tượng không chuyên kỹ thuật."},
            ]

        # Sales / Business Development careers
        if any(kw in label_lower for kw in ["sales", "kinh doanh", "bán hàng", "business development"]):
            return [
                {"name": "CRM Software", "category": "Tools", "description_vn": "Sử dụng thành thạo phần mềm quản lý khách hàng như Salesforce, HubSpot hoặc Zoho để theo dõi pipeline và chăm sóc khách hàng."},
                {"name": "Kỹ năng đàm phán", "category": "Soft Skills", "description_vn": "Thương lượng giá cả, điều khoản hợp đồng và xử lý phản đối của khách hàng một cách chuyên nghiệp."},
                {"name": "Phân tích thị trường", "category": "Analysis", "description_vn": "Nghiên cứu đối thủ cạnh tranh, xu hướng ngành và nhu cầu khách hàng để xây dựng chiến lược bán hàng hiệu quả."},
                {"name": "Kỹ năng thuyết trình", "category": "Communication", "description_vn": "Trình bày sản phẩm/dịch vụ một cách thuyết phục, tạo ấn tượng tốt với khách hàng tiềm năng."},
                {"name": "Email Marketing", "category": "Marketing", "description_vn": "Viết email chào hàng, follow-up và nurturing hiệu quả để chuyển đổi lead thành khách hàng."},
                {"name": "Social Selling", "category": "Sales", "description_vn": "Sử dụng LinkedIn và mạng xã hội để tìm kiếm, kết nối và xây dựng quan hệ với khách hàng tiềm năng."},
                {"name": "Quản lý thời gian", "category": "Soft Skills", "description_vn": "Ưu tiên công việc, quản lý lịch hẹn và đảm bảo follow-up đúng hạn với nhiều khách hàng cùng lúc."},
                {"name": "Xử lý từ chối", "category": "Sales", "description_vn": "Kỹ thuật vượt qua sự từ chối của khách hàng và chuyển đổi 'không' thành cơ hội."},
                {"name": "Báo cáo doanh số", "category": "Analysis", "description_vn": "Tổng hợp và phân tích số liệu bán hàng, dự báo doanh thu và báo cáo cho quản lý."},
                {"name": "Kỹ năng lắng nghe", "category": "Soft Skills", "description_vn": "Lắng nghe chủ động để hiểu nhu cầu thực sự của khách hàng và đề xuất giải pháp phù hợp."},
            ]

        # Marketing careers
        if any(kw in label_lower for kw in ["marketing", "digital", "content", "seo", "quảng cáo"]):
            return [
                {"name": "Google Analytics", "category": "Tools", "description_vn": "Phân tích traffic website, hành vi người dùng và đo lường hiệu quả chiến dịch marketing."},
                {"name": "SEO", "category": "Marketing", "description_vn": "Tối ưu hóa website để tăng thứ hạng trên công cụ tìm kiếm và thu hút traffic tự nhiên."},
                {"name": "Content Marketing", "category": "Marketing", "description_vn": "Tạo nội dung giá trị để thu hút, giữ chân và chuyển đổi khách hàng mục tiêu."},
                {"name": "Facebook/Google Ads", "category": "Advertising", "description_vn": "Chạy và tối ưu quảng cáo trả phí trên các nền tảng để đạt ROI cao nhất."},
                {"name": "Email Automation", "category": "Marketing", "description_vn": "Thiết lập chuỗi email tự động để nurturing lead và tăng tỷ lệ chuyển đổi."},
                {"name": "Copywriting", "category": "Content", "description_vn": "Viết nội dung quảng cáo, landing page và email thuyết phục để tăng conversion."},
                {"name": "A/B Testing", "category": "Analysis", "description_vn": "Thử nghiệm các phiên bản khác nhau của nội dung/quảng cáo để tìm ra phương án hiệu quả nhất."},
                {"name": "Social Media Management", "category": "Marketing", "description_vn": "Quản lý và phát triển các kênh mạng xã hội của thương hiệu."},
                {"name": "Marketing Analytics", "category": "Analysis", "description_vn": "Đo lường và phân tích hiệu quả các chiến dịch marketing để tối ưu ngân sách."},
                {"name": "Brand Strategy", "category": "Marketing", "description_vn": "Xây dựng và duy trì hình ảnh thương hiệu nhất quán trên các kênh."},
            ]

        # Office / Admin / General careers (fallback)
        return [
            {"name": "Microsoft Excel nâng cao", "category": "Office", "description_vn": "Sử dụng công thức phức tạp, pivot table, VLOOKUP/XLOOKUP và macro để xử lý dữ liệu hiệu quả."},
            {"name": "Kỹ năng giao tiếp", "category": "Soft Skills", "description_vn": "Truyền đạt thông tin rõ ràng, lắng nghe chủ động và xây dựng mối quan hệ tốt với đồng nghiệp và khách hàng."},
            {"name": "Quản lý thời gian", "category": "Soft Skills", "description_vn": "Ưu tiên công việc, lập kế hoạch và hoàn thành deadline một cách hiệu quả."},
            {"name": "Làm việc nhóm", "category": "Soft Skills", "description_vn": "Hợp tác hiệu quả với các thành viên trong team để đạt mục tiêu chung."},
            {"name": "Giải quyết vấn đề", "category": "Soft Skills", "description_vn": "Phân tích tình huống, xác định nguyên nhân gốc rễ và đề xuất giải pháp phù hợp."},
            {"name": "Viết báo cáo", "category": "Communication", "description_vn": "Tổng hợp thông tin và trình bày báo cáo rõ ràng, chuyên nghiệp cho các bên liên quan."},
            {"name": "Thuyết trình", "category": "Communication", "description_vn": "Trình bày ý tưởng và thông tin một cách tự tin, thuyết phục trước nhóm hoặc khách hàng."},
            {"name": "Tư duy phản biện", "category": "Soft Skills", "description_vn": "Đánh giá thông tin một cách khách quan, nhận diện thiên kiến và đưa ra quyết định hợp lý."},
            {"name": "Tiếng Anh giao tiếp", "category": "Language", "description_vn": "Giao tiếp cơ bản bằng tiếng Anh trong môi trường công việc, đọc hiểu tài liệu và email."},
            {"name": "Kỹ năng tổ chức", "category": "Soft Skills", "description_vn": "Sắp xếp công việc, tài liệu và không gian làm việc một cách khoa học để tăng năng suất."},
        ]

    def _gemini_current_career_suggestions(self, cv_skills: List[Dict], current_career: str, target_career: str) -> List[Dict]:
        api_key = os.getenv("GEMINI_COURSE_API_KEY") or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not api_key:
            return []

        # Check module-level cache first to dodge Gemini quota
        cv_skill_names = [str(s.get("name") or "") for s in (cv_skills or []) if s.get("name")]
        cache_key = _make_suggestion_cache_key(current_career, target_career, cv_skill_names)
        cached = _CURRENT_CAREER_SUGG_CACHE.get(cache_key)
        now = time.time()
        if cached and (now - cached[0]) < _CURRENT_CAREER_SUGG_TTL:
            return cached[1]

        try:
            import json as _json
            import google.generativeai as genai  # type: ignore
            prompt = f"""
Return ONLY valid JSON. No markdown.

Task: suggest missing skills for the user's CURRENT CV career, not for the target comparison career.

Current CV career: {current_career}
Target comparison career: {target_career}
Skills already present in CV:
{_json.dumps(cv_skill_names, ensure_ascii=False)}

STRICT RULES:
1. Return max {self.CURRENT_CAREER_SUGGESTION_LIMIT} skills.
2. Every returned skill MUST be useful for the current CV career.
3. Every returned skill MUST NOT already appear in the CV skill list, including aliases.
4. Do NOT return tools already listed in CV.
5. Do NOT return generic filler like Communication unless it is a concrete missing skill for the current career.
6. description_vn must define the skill/tool accurately and specifically, not a template sentence.
7. category must be specific: Frontend, Backend, DevOps, Testing, Security, Database, Architecture, Cloud, Tools.
8. Return JSON shape:
{{"skills":[{{"name":"Docker","category":"DevOps","description_vn":"..."}}]}}
"""
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(os.getenv("GEMINI_COURSE_MODEL", "gemini-flash-latest"))
            response = model.generate_content(
                prompt,
                generation_config={"temperature": 0.1, "top_p": 0.5, "max_output_tokens": 2500},
            )
            text = getattr(response, "text", "") or ""
            if "```json" in text:
                text = text.split("```json", 1)[1].split("```", 1)[0].strip()
            elif "```" in text:
                text = text.split("```", 1)[1].split("```", 1)[0].strip()
            payload = _json.loads(text)
            raw = payload.get("skills") if isinstance(payload, dict) else []
            if not isinstance(raw, list):
                return []
            out = []
            for item in raw:
                if not isinstance(item, dict):
                    continue
                name = str(item.get("name") or "").strip()
                desc = str(item.get("description_vn") or "").strip()
                if name and desc:
                    out.append({
                        "name": name,
                        "category": str(item.get("category") or "Other").strip() or "Other",
                        "description_vn": desc,
                        "source": "gemini_current_career",
                        "current_career": current_career,
                        "target_career": target_career,
                    })
            # Cache successful result for 24h to dodge quota on identical (career, skills) combos
            if out:
                _CURRENT_CAREER_SUGG_CACHE[cache_key] = (now, out)
            return out
        except Exception as exc:
            err_text = str(exc)
            print(f"  [WARN] Gemini current-career suggestions failed: {err_text[:200]}")
            # On quota/429, cache empty for 5 minutes to stop hammering the API
            if "429" in err_text or "quota" in err_text.lower() or "exceeded" in err_text.lower():
                _CURRENT_CAREER_SUGG_CACHE[cache_key] = (now - (_CURRENT_CAREER_SUGG_TTL - 300), [])
            return []

    def _build_current_career_skill_suggestions(self, cv_skills: List[Dict], target_career_name: str) -> List[Dict]:
        current_career = self._infer_cv_career_label(cv_skills)
        
        # If cv_skills is empty or career not detected, try to infer from target_career_name
        if current_career == "Nghề hiện tại theo CV" and target_career_name:
            target_lower = target_career_name.lower()
            if any(kw in target_lower for kw in ["sales", "kinh doanh", "bán hàng", "business"]):
                current_career = "Sales/Kinh doanh"
            elif any(kw in target_lower for kw in ["marketing", "seo", "content", "digital"]):
                current_career = "Marketing"
            elif any(kw in target_lower for kw in ["developer", "software", "engineer", "lập trình"]):
                current_career = "Backend Developer"
            elif any(kw in target_lower for kw in ["data", "analyst", "ai", "machine learning"]):
                current_career = "AI/Data Developer"
        
        cv_keys = set()
        for skill in cv_skills or []:
            for key in self._equivalent_skill_keys(str(skill.get("name") or "")):
                if key:
                    cv_keys.add(key)

        suggestions = self._gemini_current_career_suggestions(cv_skills, current_career, target_career_name)
        if not suggestions:
            suggestions = self._current_career_catalog(current_career)

        out = []
        seen = set()
        for skill in suggestions:
            name = str(skill.get("name") or "").strip()
            key = self._skill_key(name)
            if not name or key in seen or self._has_cv_skill(cv_keys, name):
                continue
            seen.add(key)
            out.append({
                **skill,
                "source": skill.get("source") or "current_career_catalog",
                "current_career": skill.get("current_career") or current_career,
                "target_career": skill.get("target_career") or target_career_name,
            })
            if len(out) >= self.CURRENT_CAREER_SUGGESTION_LIMIT:
                break
        return out

    def _normalize_onet_score(self, value, default: float = 0.0) -> float:
        try:
            score = float(value if value is not None else default)
        except (TypeError, ValueError):
            score = default
        return score / 100.0 if score > 1 else score

    @staticmethod
    def _bool_env(name: str, default: bool = False) -> bool:
        value = os.getenv(name)
        if value is None:
            return default
        return value.strip().lower() in {"1", "true", "yes", "y", "on"}

    def _should_surface_job_ksa(self, skill: Dict, career_name: str = "") -> bool:
        """Keep only KSA items strong enough to be useful on the user-facing gap UI."""
        importance = float(skill.get("importance") or 0)
        level = float(skill.get("level") or 0)
        combined = (importance * 0.7) + (level * 0.3)
        name = self._norm(skill.get("name"))
        generic_low_signal = {"mathematics", "science", "programming"}

        if name in generic_low_signal and not self._is_software_like_career(career_name):
            return importance >= 0.55 and combined >= 0.55
        return importance >= 0.50 or (importance >= 0.45 and level >= 0.60 and combined >= 0.52)

    def _gap_bucket(self, skill: Dict) -> str:
        importance = float(skill.get("importance") or 0)
        level = float(skill.get("level") or 0)
        combined = (importance * 0.7) + (level * 0.3)
        if importance >= 0.80 or combined >= 0.78:
            return "critical"
        if importance >= 0.55 or combined >= 0.58:
            return "important"
        return "nice_to_have"

    def _gap_rank_score(self, skill: Dict) -> float:
        importance = float(skill.get("importance") or 0)
        level = float(skill.get("level") or 0)
        return (importance * 0.72) + (level * 0.28)

    def _limit_important_gaps(self, analysis: Dict) -> Dict:
        gaps = analysis.get("skill_gaps") or {}
        important = gaps.get("important") or []
        if len(important) <= self.MAX_IMPORTANT_GAPS:
            return analysis
        gaps["important"] = sorted(
            important,
            key=lambda skill: (
                self._gap_rank_score(skill),
                float(skill.get("importance") or 0),
                float(skill.get("level") or 0),
                str(skill.get("name") or ""),
            ),
            reverse=True,
        )[:self.MAX_IMPORTANT_GAPS]
        analysis["skill_gaps"] = gaps
        return analysis

    def _build_gap_info(self, skill: Dict) -> Dict:
        importance = float(skill.get("importance") or 0.5)
        return {
            'name': skill.get('name_vn') or skill.get('name') or skill.get('name_en') or '',
            'name_vn': skill.get('name_vn') or '',
            'name_en': skill.get('name_en') or '',
            'category': skill.get('category', 'Other'),
            'importance': importance,
            'level': skill.get('level'),
            'ksa_type': skill.get('ksa_type', 'skill'),
            'description_en': skill.get('description_en'),
            'description_vn': skill.get('description_vn'),
            'proficiency_level': skill.get('proficiency_level', 'intermediate'),
            'market_demand': 'high' if importance >= 0.8 else 'medium' if importance >= 0.5 else 'low'
        }

    def _normalize_analysis_consistency(self, analysis: Dict, career_name: str) -> Dict:
        """Keep displayed metrics consistent with the actual matched and missing skill lists."""
        if not isinstance(analysis, dict) or "skill_gaps" not in analysis:
            return analysis

        gaps = analysis.get("skill_gaps") or {}
        critical = gaps.get("critical") or []
        important = gaps.get("important") or []
        nice_to_have = gaps.get("nice_to_have") or []
        matched = analysis.get("matched_skills") or []
        missing_count = len(critical) + len(important)
        matched_count = len({self._norm(skill.get("name")) for skill in matched if isinstance(skill, dict) and skill.get("name")})

        analysis["matched_skills_count"] = matched_count
        analysis["missing_skills_count"] = missing_count
        analysis["total_required_skills"] = matched_count + missing_count
        analysis["extra_skills"] = self._filter_contextual_extra_skills(
            analysis.get("extra_skills") or [],
            career_name,
        )
        return analysis
    
    def execute_query(self, query: str, params: dict = None):
        """Execute a Neo4j query (deprecated)"""
        if not self.driver:
            return []
        
        with self.driver.session() as session:
            result = session.run(query, params or {})
            return [record.data() for record in result]
    
    def ai_semantic_skill_matching(self, cv_skills: List[Dict], job_skills: List[Dict], career_name: str) -> Dict:
        """
        Dùng AI để match skills dựa trên semantic meaning
        AI sẽ hiểu nghề nghiệp và so sánh skills thông minh
        
        Args:
            cv_skills: Skills từ CV
            job_skills: Skills yêu cầu từ database
            career_name: Tên nghề nghiệp
            
        Returns:
            Dict: {matched_skills, missing_skills, match_scores}
        """
        try:
            from .gemini_utils import gemini_manager
            
            # Use the centralized Gemini manager
            result = gemini_manager.semantic_skill_matching(cv_skills, job_skills, career_name)
            return result
            
        except Exception as e:
            print(f"  [WARN] AI semantic matching failed: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def get_job_required_skills_from_graph(self, career_id: str) -> List[Dict]:
        """
        Lay ky nang yeu cau tu Neo4j graph (nhanh hon, co relationship weights).
        Fallback ve get_job_required_skills_from_db neu Neo4j khong kha dung.

        @param career_id: Career ID (PostgreSQL)
        @returns: List[{name, category, importance, level}]
        """
        if self.driver:
            try:
                from app.modules.graph.graph_queries import get_career_required_skills_from_graph
                results = get_career_required_skills_from_graph(self.driver, career_id)
                if results:
                    print(f"[graph] Got {len(results)} skills from Neo4j for career {career_id}")
                    return results
            except Exception as e:
                print(f"[graph] Neo4j skill query failed, falling back to DB: {e}")
        return []

    def get_job_required_skills_from_db(self, onet_code: str) -> List[Dict]:
        """
        Lấy danh sách kỹ năng yêu cầu cho một nghề nghiệp từ PostgreSQL
        
        Args:
            onet_code: ONET code của nghề nghiệp (có thể là slug hoặc ONET code)
            
        Returns:
            List[Dict]: Danh sách kỹ năng với trọng số
        """
        if not self.db:
            return []
        
        try:
            from app.modules.content.models import Career, CareerKSA
            
            # Map common career names to database slugs
            career_mapping = {
                'software-engineer': 'software-developers-15-1252-00',
                'data-scientist': 'data-scientists-15-2051-00',
                'web-developer': 'web-developers-15-1254-00',
                'database-administrator': 'database-administrators-15-1242-00',
                'network-administrator': 'network-and-computer-systems-administrators-15-1244-00',
                'systems-analyst': 'computer-systems-analysts-15-1211-00',
                'product-manager': 'general-and-operations-managers-11-1021-00',
                'ux-designer': 'graphic-designers-27-1024-00',
                'devops-engineer': 'software-developers-15-1252-00',  # Use software dev as fallback
            }
            
            # Normalize ONET code: handle both "25-2012-00" and "25-2012.00" formats
            # DB stores as "25-2012.00" but career_id may come as "25-2012-00"
            onet_normalized = onet_code
            if onet_code and onet_code.count('-') >= 2 and '.' not in onet_code:
                # Convert last "-" to "." e.g. "25-2012-00" → "25-2012.00"
                parts = onet_code.rsplit('-', 1)
                if len(parts) == 2 and parts[1].isdigit():
                    onet_normalized = f"{parts[0]}.{parts[1]}"

            search_slug = career_mapping.get(onet_code, onet_code)

            # Search by slug, original code, and normalized code
            career_stmt = select(Career).where(
                (Career.slug == search_slug) |
                (Career.onet_code == onet_code) |
                (Career.onet_code == onet_normalized) |
                (Career.slug == onet_code)
            )
            career_result = self.db.execute(career_stmt)
            career = career_result.scalar_one_or_none()
            
            if career:
                actual_onet_code = career.onet_code
                print(f"  [OK] Found career: {career.title_en} (ONET: {actual_onet_code})")
            else:
                # Try fuzzy search by title
                career_stmt = select(Career).where(
                    Career.title_en.ilike(f'%{onet_code}%')
                ).limit(1)
                career_result = self.db.execute(career_stmt)
                career = career_result.scalar_one_or_none()
                
                if career:
                    actual_onet_code = career.onet_code
                    print(f"  [OK] Found career by fuzzy search: {career.title_en} (ONET: {actual_onet_code})")
                else:
                    actual_onet_code = onet_code
                    print(f"  [WARN] Career not found, using provided code: {actual_onet_code}")
            
            # Query skills, abilities and knowledge from database.
            # Use raw SQL to avoid model column name mismatch (name_en vs name)
            from sqlalchemy import text as _text
            rows = self.db.execute(_text("""
                SELECT ksa_type, name_en, name_vn, category, level, importance, description_en, description_vn
                FROM core.career_ksas
                WHERE onet_code = :code
                  AND ksa_type IN ('skill', 'ability', 'knowledge')
                  AND (name_en IS NOT NULL OR name_vn IS NOT NULL)
                ORDER BY importance DESC, level DESC
            """), {"code": actual_onet_code}).fetchall()

            skills = []
            for row in rows:
                # Ưu tiên tiếng Việt nếu có
                skill_name_vn = (row.name_vn or '').strip()
                skill_name_en = (row.name_en or '').strip()
                # Display name: VN nếu có, fallback EN
                skill_name = skill_name_vn or skill_name_en
                if not skill_name:
                    continue
                importance = self._normalize_onet_score(row.importance)
                level = self._normalize_onet_score(row.level)

                skill = {
                    'name': skill_name,  # tên hiển thị (VN ưu tiên)
                    'name_en': skill_name_en,  # giữ EN để tham chiếu
                    'name_vn': skill_name_vn,  # VN explicit
                    'category': row.category or 'Other',
                    'importance': importance,
                    'level': level,
                    'ksa_type': row.ksa_type or 'skill',
                    'description_en': row.description_en,
                    'description_vn': row.description_vn,
                    'proficiency_level': 'advanced' if level >= 0.65 else 'intermediate' if level >= 0.35 else 'foundational',
                    'source': 'onet_database'
                }
                if self._should_surface_job_ksa(skill, career.title_en if career else onet_code):
                    skills.append(skill)
            
            print(f"  [OK] Loaded {len(skills)} surfaced ONET KSA items from database")
            return skills
            
        except Exception as e:
            print(f"  [WARN] Error querying database for skills: {e}")
            # Rollback aborted transaction so subsequent queries can proceed
            try:
                if self.db:
                    self.db.rollback()
            except Exception:
                pass
            return []
    
    def get_job_required_skills(self, career_id: str) -> List[Dict]:
        """
        Lấy danh sách kỹ năng yêu cầu cho một nghề nghiệp
        Ưu tiên: PostgreSQL (ONET data) > Neo4j > Mock data
        
        Args:
            career_id: ID hoặc ONET code của nghề nghiệp
            
        Returns:
            List[Dict]: Danh sách kỹ năng với trọng số
        """
        skills = []
        
        # Try 1: Get from PostgreSQL database (ONET data)
        if self.db:
            skills = self.get_job_required_skills_from_db(career_id)
            if skills:
                print(f"[OK] Using skills from PostgreSQL database for {career_id}")
                return skills
        
        # Try 2: Get from Neo4j (if available)
        # Relationship is REQUIRES (not REQUIRES_SKILL), property is level (not proficiency_level)
        query = """
        MATCH (c:Career {id: $career_id})-[r:REQUIRES]->(s:Skill)
        RETURN s.name AS skill_name,
               s.category AS category,
               r.importance AS importance,
               r.level AS level
        ORDER BY r.importance DESC
        """
        
        try:
            result = self.execute_query(query, {'career_id': career_id})
            
            for record in result:
                skills.append({
                    'name': record['skill_name'],
                    'category': record.get('category', 'Other'),
                    'importance': float(record.get('importance') or 0.5),
                    'proficiency_level': record.get('level', 'intermediate'),
                    'source': 'neo4j'
                })
            
            if skills:
                print(f"[OK] Using skills from Neo4j for {career_id}")
                return skills
        except Exception as e:
            print(f"Neo4j query failed: {e}")
        
        # Try 3: Fallback to mock data
        print(f"[WARN] No database/Neo4j data for {career_id}, using fallback mock data")
        return self._get_fallback_skills(career_id)
    
    def _get_fallback_skills(self, career_id: str) -> List[Dict]:
        """
        Fallback mock data when Neo4j is not available
        
        Args:
            career_id: ID của nghề nghiệp (có thể là slug hoặc simple ID)
            
        Returns:
            List[Dict]: Mock skill requirements
        """
        # Normalize career_id - handle both slugs and simple IDs
        career_key = career_id.lower()
        
        # Map common ONET slugs to simple IDs
        slug_mapping = {
            'surveying-and-mapping-technicians': 'surveying-mapping',
            'architectural-and-civil-drafters': 'architectural-civil',
            'rehabilitation-counselors': 'rehabilitation-counselor',
            'software-developers': 'software-engineer',
            'data-scientists': 'data-scientist',
            'computer-systems-analysts': 'systems-analyst',
        }
        
        # Try to find mapped key
        for slug, simple_id in slug_mapping.items():
            if slug in career_key or simple_id in career_key:
                career_key = simple_id
                break
        
        # Mock data for common careers
        mock_data = {
            'software-engineer': [
                {'name': 'Python', 'category': 'Programming', 'importance': 0.9, 'proficiency_level': 'advanced'},
                {'name': 'JavaScript', 'category': 'Programming', 'importance': 0.85, 'proficiency_level': 'advanced'},
                {'name': 'Java', 'category': 'Programming', 'importance': 0.8, 'proficiency_level': 'intermediate'},
                {'name': 'SQL', 'category': 'Database', 'importance': 0.85, 'proficiency_level': 'intermediate'},
                {'name': 'Git', 'category': 'DevOps', 'importance': 0.9, 'proficiency_level': 'intermediate'},
                {'name': 'React', 'category': 'Web Development', 'importance': 0.75, 'proficiency_level': 'intermediate'},
                {'name': 'Node.js', 'category': 'Web Development', 'importance': 0.7, 'proficiency_level': 'intermediate'},
                {'name': 'Docker', 'category': 'DevOps', 'importance': 0.65, 'proficiency_level': 'beginner'},
                {'name': 'REST API', 'category': 'Web Development', 'importance': 0.8, 'proficiency_level': 'intermediate'},
                {'name': 'Agile', 'category': 'Soft Skills', 'importance': 0.6, 'proficiency_level': 'beginner'},
                {'name': 'Problem Solving', 'category': 'Soft Skills', 'importance': 0.9, 'proficiency_level': 'advanced'},
                {'name': 'Communication', 'category': 'Soft Skills', 'importance': 0.75, 'proficiency_level': 'intermediate'},
            ],
            'surveying-mapping': [
                {'name': 'AutoCAD', 'category': 'Technical Software', 'importance': 0.95, 'proficiency_level': 'advanced'},
                {'name': 'GIS', 'category': 'Geospatial', 'importance': 0.9, 'proficiency_level': 'advanced'},
                {'name': 'GPS Technology', 'category': 'Surveying', 'importance': 0.9, 'proficiency_level': 'advanced'},
                {'name': 'Surveying Equipment', 'category': 'Surveying', 'importance': 0.95, 'proficiency_level': 'advanced'},
                {'name': 'Mathematics', 'category': 'Technical Skills', 'importance': 0.85, 'proficiency_level': 'intermediate'},
                {'name': 'Data Analysis', 'category': 'Analytics', 'importance': 0.75, 'proficiency_level': 'intermediate'},
                {'name': 'Technical Drawing', 'category': 'Design', 'importance': 0.8, 'proficiency_level': 'intermediate'},
                {'name': 'Attention to Detail', 'category': 'Soft Skills', 'importance': 0.9, 'proficiency_level': 'advanced'},
            ],
            'architectural-civil': [
                {'name': 'AutoCAD', 'category': 'Design Software', 'importance': 0.95, 'proficiency_level': 'advanced'},
                {'name': 'Revit', 'category': 'Design Software', 'importance': 0.9, 'proficiency_level': 'advanced'},
                {'name': 'Technical Drawing', 'category': 'Design', 'importance': 0.95, 'proficiency_level': 'advanced'},
                {'name': 'Building Codes', 'category': 'Technical Knowledge', 'importance': 0.85, 'proficiency_level': 'intermediate'},
                {'name': 'Civil Engineering', 'category': 'Engineering', 'importance': 0.8, 'proficiency_level': 'intermediate'},
                {'name': 'Mathematics', 'category': 'Technical Skills', 'importance': 0.75, 'proficiency_level': 'intermediate'},
                {'name': 'Attention to Detail', 'category': 'Soft Skills', 'importance': 0.9, 'proficiency_level': 'advanced'},
            ],
            'rehabilitation-counselor': [
                {'name': 'Counseling', 'category': 'Healthcare', 'importance': 0.95, 'proficiency_level': 'advanced'},
                {'name': 'Psychology', 'category': 'Healthcare', 'importance': 0.9, 'proficiency_level': 'advanced'},
                {'name': 'Case Management', 'category': 'Healthcare', 'importance': 0.85, 'proficiency_level': 'intermediate'},
                {'name': 'Communication', 'category': 'Soft Skills', 'importance': 0.95, 'proficiency_level': 'advanced'},
                {'name': 'Empathy', 'category': 'Soft Skills', 'importance': 0.9, 'proficiency_level': 'advanced'},
                {'name': 'Assessment Skills', 'category': 'Healthcare', 'importance': 0.85, 'proficiency_level': 'intermediate'},
                {'name': 'Problem Solving', 'category': 'Soft Skills', 'importance': 0.8, 'proficiency_level': 'intermediate'},
            ],
            'data-scientist': [
                {'name': 'Python', 'category': 'Programming', 'importance': 0.95, 'proficiency_level': 'advanced'},
                {'name': 'R', 'category': 'Programming', 'importance': 0.7, 'proficiency_level': 'intermediate'},
                {'name': 'SQL', 'category': 'Database', 'importance': 0.9, 'proficiency_level': 'advanced'},
                {'name': 'Machine Learning', 'category': 'Data Science', 'importance': 0.95, 'proficiency_level': 'advanced'},
                {'name': 'Statistics', 'category': 'Data Science', 'importance': 0.9, 'proficiency_level': 'advanced'},
                {'name': 'Pandas', 'category': 'Data Science', 'importance': 0.85, 'proficiency_level': 'intermediate'},
                {'name': 'NumPy', 'category': 'Data Science', 'importance': 0.8, 'proficiency_level': 'intermediate'},
                {'name': 'TensorFlow', 'category': 'Data Science', 'importance': 0.75, 'proficiency_level': 'intermediate'},
                {'name': 'Data Visualization', 'category': 'Data Science', 'importance': 0.7, 'proficiency_level': 'intermediate'},
            ],
            'product-manager': [
                {'name': 'Product Strategy', 'category': 'Product Management', 'importance': 0.95, 'proficiency_level': 'advanced'},
                {'name': 'Agile', 'category': 'Soft Skills', 'importance': 0.9, 'proficiency_level': 'advanced'},
                {'name': 'Communication', 'category': 'Soft Skills', 'importance': 0.95, 'proficiency_level': 'advanced'},
                {'name': 'Data Analysis', 'category': 'Analytics', 'importance': 0.8, 'proficiency_level': 'intermediate'},
                {'name': 'User Research', 'category': 'Product Management', 'importance': 0.85, 'proficiency_level': 'intermediate'},
                {'name': 'SQL', 'category': 'Database', 'importance': 0.6, 'proficiency_level': 'beginner'},
                {'name': 'Leadership', 'category': 'Soft Skills', 'importance': 0.85, 'proficiency_level': 'intermediate'},
            ],
            'ux-designer': [
                {'name': 'Figma', 'category': 'Design Tools', 'importance': 0.9, 'proficiency_level': 'advanced'},
                {'name': 'Adobe XD', 'category': 'Design Tools', 'importance': 0.75, 'proficiency_level': 'intermediate'},
                {'name': 'User Research', 'category': 'UX Design', 'importance': 0.9, 'proficiency_level': 'advanced'},
                {'name': 'Wireframing', 'category': 'UX Design', 'importance': 0.85, 'proficiency_level': 'intermediate'},
                {'name': 'Prototyping', 'category': 'UX Design', 'importance': 0.85, 'proficiency_level': 'intermediate'},
                {'name': 'HTML', 'category': 'Web Development', 'importance': 0.6, 'proficiency_level': 'beginner'},
                {'name': 'CSS', 'category': 'Web Development', 'importance': 0.6, 'proficiency_level': 'beginner'},
            ],
            'devops-engineer': [
                {'name': 'Docker', 'category': 'DevOps', 'importance': 0.95, 'proficiency_level': 'advanced'},
                {'name': 'Kubernetes', 'category': 'DevOps', 'importance': 0.9, 'proficiency_level': 'advanced'},
                {'name': 'AWS', 'category': 'Cloud', 'importance': 0.85, 'proficiency_level': 'intermediate'},
                {'name': 'CI/CD', 'category': 'DevOps', 'importance': 0.9, 'proficiency_level': 'advanced'},
                {'name': 'Linux', 'category': 'Operating Systems', 'importance': 0.9, 'proficiency_level': 'advanced'},
                {'name': 'Python', 'category': 'Programming', 'importance': 0.75, 'proficiency_level': 'intermediate'},
                {'name': 'Bash', 'category': 'Programming', 'importance': 0.8, 'proficiency_level': 'intermediate'},
                {'name': 'Terraform', 'category': 'DevOps', 'importance': 0.7, 'proficiency_level': 'intermediate'},
            ],
            'systems-analyst': [
                {'name': 'Systems Analysis', 'category': 'Technical Skills', 'importance': 0.95, 'proficiency_level': 'advanced'},
                {'name': 'SQL', 'category': 'Database', 'importance': 0.85, 'proficiency_level': 'intermediate'},
                {'name': 'Business Analysis', 'category': 'Business', 'importance': 0.9, 'proficiency_level': 'advanced'},
                {'name': 'Requirements Gathering', 'category': 'Technical Skills', 'importance': 0.9, 'proficiency_level': 'advanced'},
                {'name': 'UML', 'category': 'Technical Skills', 'importance': 0.7, 'proficiency_level': 'intermediate'},
                {'name': 'Communication', 'category': 'Soft Skills', 'importance': 0.85, 'proficiency_level': 'intermediate'},
            ]
        }
        
        # Try to find exact match or partial match
        if career_key in mock_data:
            return mock_data[career_key]
        
        # Try partial matching
        for key in mock_data.keys():
            if key in career_key or career_key in key:
                return mock_data[key]
        
        # Default fallback
        return [
            {'name': 'Communication', 'category': 'Soft Skills', 'importance': 0.8, 'proficiency_level': 'intermediate'},
            {'name': 'Problem Solving', 'category': 'Soft Skills', 'importance': 0.85, 'proficiency_level': 'intermediate'},
            {'name': 'Teamwork', 'category': 'Soft Skills', 'importance': 0.75, 'proficiency_level': 'intermediate'},
        ]
    
    def calculate_skill_match(self, cv_skills: List[Dict], job_skills: List[Dict], career_name: str = "") -> Dict:
        """
        Gap Analysis Engine - So sánh năng lực CV với yêu cầu công việc
        
        Process:
        1. Query job requirements from database/Neo4j
        2. Compare CV skills with job requirements
        3. Identify critical gaps
        4. Calculate match percentage
        
        Args:
            cv_skills: Danh sách kỹ năng từ CV (đã normalized)
            job_skills: Danh sách kỹ năng yêu cầu từ job (ONET/Neo4j)
            
        Returns:
            Dict: Kết quả phân tích chi tiết
        """
        print("  [Search] [Gap Analysis] Starting skill comparison...")
        
        # Convert CV skills to lowercase dict for matching
        cv_skill_names = {skill['name'].lower() for skill in cv_skills}
        cv_skill_dict = {skill['name'].lower(): skill for skill in cv_skills}
        # For ONET skills, MATCH theo name_en (vì CV skills là EN), nhưng OUTPUT name (VN)
        # Build dict với key là EN-lowercase để match được
        job_skill_dict: Dict[str, Dict[str, Any]] = {}
        for skill in job_skills:
            # Ưu tiên name_en để match (vì CV skills extract từ CV thường là English)
            match_key = (skill.get('name_en') or skill.get('name') or '').lower().strip()
            if match_key and match_key not in job_skill_dict:
                job_skill_dict[match_key] = skill
        job_skill_names = set(job_skill_dict.keys())
        
        print(f"     - CV skills: {len(cv_skill_names)}")
        print(f"     - Job requirements: {len(job_skill_names)}")
        
        # Keyword mapping for better matching between CV keywords and ONET descriptions
        skill_keyword_map = {
            # Programming
            'python': ['python', 'programming', 'code', 'software development'],
            'java': ['java', 'programming', 'code'],
            'javascript': ['javascript', 'js', 'web development', 'programming'],
            'sql': ['sql', 'database', 'query'],
            
            # Soft skills
            'communication': ['communicate', 'speaking', 'writing', 'listening', 'verbal'],
            'leadership': ['lead', 'manage', 'supervise', 'direct', 'leadership'],
            'teamwork': ['team', 'collaborate', 'cooperation', 'group work'],
            'problem solving': ['problem', 'solve', 'troubleshoot', 'debug', 'analytical'],
            'analysis': ['analyze', 'analytical', 'data analysis', 'critical thinking'],
            
            # Technical
            'programming': ['program', 'code', 'software', 'develop', 'coding'],
            'mathematics': ['math', 'calculation', 'algebra', 'statistics', 'quantitative'],
            'design': ['design', 'create', 'develop', 'visual'],
        }
        
        # Step 1: Direct matching (exact or substring)
        matched_skills = set()
        matched_details = []
        
        for cv_skill in cv_skill_names:
            for job_skill_name in job_skill_names:
                # Check if CV skill appears in ONET description or vice versa
                if (
                    cv_skill in job_skill_name
                    or job_skill_name in cv_skill
                    or bool(self._equivalent_skill_keys(job_skill_name) & self._equivalent_skill_keys(cv_skill))
                ):
                    if self._is_domain_incompatible_match(
                        cv_skill_dict[cv_skill],
                        job_skill_dict[job_skill_name],
                        career_name,
                    ):
                        continue
                    if job_skill_name not in matched_skills:
                        matched_skills.add(job_skill_name)
                        # Lấy ưu tiên tiếng Việt cho display
                        job_skill = job_skill_dict[job_skill_name]
                        display_name = job_skill.get('name_vn') or job_skill.get('name') or job_skill.get('name_en') or ''
                        matched_details.append({
                            'name': cv_skill_dict[cv_skill]['name'],
                            'onet_skill': display_name,
                            'onet_skill_vn': job_skill.get('name_vn') or '',
                            'onet_skill_en': job_skill.get('name_en') or '',
                            'category': cv_skill_dict[cv_skill].get('category', 'Other'),
                            'importance': job_skill.get('importance', 0.5),
                            'level': job_skill.get('level'),
                            'ksa_type': job_skill.get('ksa_type', 'skill'),
                            'description_en': job_skill.get('description_en'),
                            'description_vn': job_skill.get('description_vn'),
                            'match_type': 'direct'
                        })
                        break
        
        print(f"     - Direct matches: {len(matched_details)}")
        
        # Step 2: Keyword-based fuzzy matching
        for cv_skill in cv_skill_names:
            # Skip if already matched
            if any(d['name'].lower() == cv_skill for d in matched_details):
                continue
            
            # Get keywords for this CV skill
            keywords = skill_keyword_map.get(cv_skill, [cv_skill])
            
            for job_skill_name in job_skill_names:
                if job_skill_name in matched_skills:
                    continue
                
                # Check if any keyword matches the job skill
                if any(keyword in job_skill_name for keyword in keywords):
                    if self._is_domain_incompatible_match(
                        cv_skill_dict[cv_skill],
                        job_skill_dict[job_skill_name],
                        career_name,
                    ):
                        continue
                    matched_skills.add(job_skill_name)
                    job_skill = job_skill_dict[job_skill_name]
                    display_name = job_skill.get('name_vn') or job_skill.get('name') or job_skill.get('name_en') or ''
                    matched_details.append({
                        'name': cv_skill_dict[cv_skill]['name'],
                        'onet_skill': display_name,
                        'onet_skill_vn': job_skill.get('name_vn') or '',
                        'onet_skill_en': job_skill.get('name_en') or '',
                        'category': cv_skill_dict[cv_skill].get('category', 'Other'),
                        'importance': job_skill.get('importance', 0.5),
                        'level': job_skill.get('level'),
                        'ksa_type': job_skill.get('ksa_type', 'skill'),
                        'description_en': job_skill.get('description_en'),
                        'description_vn': job_skill.get('description_vn'),
                        'match_type': 'fuzzy'
                    })
                    break
        
        print(f"     - Total matches (direct + fuzzy): {len(matched_details)}")
        
        # Step 3: Calculate missing skills (gaps)
        missing_skills = job_skill_names - matched_skills
        print(f"     - Missing skills (gaps): {len(missing_skills)}")
        
        # Step 4: Calculate weighted match score
        total_importance = sum(skill.get('importance', 0.5) for skill in job_skills)
        matched_importance = sum(detail['importance'] for detail in matched_details)
        
        match_percentage = (matched_importance / total_importance * 100) if total_importance > 0 else 0
        
        # Step 5: Categorize gaps by importance (Critical/Important/Nice-to-have)
        critical_gaps = []
        important_gaps = []
        nice_to_have_gaps = []
        
        for skill_name in missing_skills:
            skill = job_skill_dict[skill_name]
            if not self._should_surface_job_ksa(skill):
                continue
            gap_info = self._build_gap_info(skill)
            bucket = self._gap_bucket(skill)
            if bucket == "critical":
                critical_gaps.append(gap_info)
            elif bucket == "important":
                important_gaps.append(gap_info)
            else:
                nice_to_have_gaps.append(gap_info)
        
        print("  [OK] [Gap Analysis] Complete:")
        print(f"     - Match percentage: {match_percentage:.1f}%")
        print(f"     - Critical gaps: {len(critical_gaps)}")
        print(f"     - Important gaps: {len(important_gaps)}")
        print(f"     - Nice-to-have gaps: {len(nice_to_have_gaps)}")
        
        return {
            'match_percentage': round(match_percentage, 2),
            'total_required_skills': len(job_skills),
            'matched_skills_count': len(matched_details),
            'missing_skills_count': len(missing_skills),
            'matched_skills': sorted(matched_details, key=lambda x: x['importance'], reverse=True),
            'skill_gaps': {
                'critical': sorted(critical_gaps, key=lambda x: x['importance'], reverse=True),
                'important': sorted(important_gaps, key=lambda x: x['importance'], reverse=True),
                'nice_to_have': sorted(nice_to_have_gaps, key=lambda x: x['importance'], reverse=True)
            },
            'extra_skills': [],
            'analysis_metadata': {
                'direct_matches': sum(1 for d in matched_details if d.get('match_type') == 'direct'),
                'fuzzy_matches': sum(1 for d in matched_details if d.get('match_type') == 'fuzzy'),
                'total_cv_skills': len(cv_skill_names),
                'total_job_skills': len(job_skill_names)
            }
        }
    
    def analyze_skill_gap(self, cv_skills: List[Dict], career_id: str) -> Dict:
        """
        Complete Gap Analysis Pipeline
        
        Process:
        1. Query target career requirements from database/Neo4j
        2. Use AI to perform semantic skill matching
        3. Compare CV skills with job requirements
        4. Identify critical gaps
        5. Generate actionable insights
        
        Args:
            cv_skills: Kỹ năng từ CV (đã normalized)
            career_id: ID nghề nghiệp mục tiêu
            
        Returns:
            Dict: Kết quả phân tích đầy đủ với insights
        """
        print(f"\n[Target] [Gap Analysis Pipeline] Analyzing for career: {career_id}")
        
        # Step 1: Get job requirements
        print("  [1/3] Querying job requirements...")
        job_skills = self.get_job_required_skills(career_id)
        
        if not job_skills:
            return {
                'error': 'No skill requirements found for this career',
                'career_id': career_id,
                'suggestion': 'Try selecting a different career or check if the career exists in database'
            }
        
        # Get career name for AI context
        career_name = career_id.replace('-', ' ').title()
        if self.db:
            try:
                from app.modules.content.models import Career
                career_stmt = select(Career).where(
                    (Career.slug == career_id) | (Career.onet_code == career_id)
                )
                career_result = self.db.execute(career_stmt)
                career = career_result.scalar_one_or_none()
                if career:
                    career_name = career.title_en
            except Exception as e:
                print(f"  [WARN] Could not get career name: {e}")

        ai_result = None
        if self._bool_env("SKILL_GAP_USE_AI_MATCHING", default=False):
            # Step 2: AI semantic matching is useful but slow, so keep it opt-in.
            print("  [2/4] Attempting AI semantic skill matching...")
            ai_result = self.ai_semantic_skill_matching(cv_skills, job_skills, career_name)
        else:
            print("  [2/4] AI semantic matching disabled; using local matching")
        
        # Step 3: Perform gap analysis (use AI results if available)
        print("  [3/4] Performing gap analysis...")
        if ai_result:
            # Use AI semantic matching results
            analysis = self._build_analysis_from_ai(ai_result, cv_skills, job_skills, career_name)
        else:
            # Fallback to traditional matching
            print("  [WARN] AI matching unavailable, using traditional matching")
            analysis = self.calculate_skill_match(cv_skills, job_skills, career_name)

        analysis["extra_skills"] = self._build_current_career_skill_suggestions(cv_skills, career_name)
        analysis = self._limit_important_gaps(analysis)
        analysis = self._normalize_analysis_consistency(analysis, career_name)
        
        analysis['career_id'] = career_id
        analysis['job_skills'] = job_skills
        
        # Step 4: Generate insights
        print("  [4/4] Generating insights...")
        insights = self._generate_insights(analysis)
        analysis['insights'] = insights
        
        print("[OK] [Gap Analysis Pipeline] Complete!\n")
        
        return analysis
    
    def _build_analysis_from_ai(self, ai_result: Dict, cv_skills: List[Dict], job_skills: List[Dict], career_name: str = "") -> Dict:
        """
        Build analysis result from AI semantic matching
        
        Args:
            ai_result: Result from ai_semantic_skill_matching()
            cv_skills: Original CV skills
            job_skills: Original job skills
            
        Returns:
            Dict: Analysis in standard format
        """
        print("  [AI] Building analysis from AI semantic matching...")

        # Get matched pairs from AI
        matched_pairs = ai_result.get('matched_pairs', [])
        unmatched_cv  = set(ai_result.get('unmatched_cv_skills',  []))
        unmatched_job = set(ai_result.get('unmatched_job_skills',  []))

        # Build job skill importance map
        job_skill_imp = {s['name'].lower(): float(s.get('importance', 0.5)) for s in job_skills}
        total_importance = sum(job_skill_imp.values()) or 1.0
        
        # Build matched skills list
        matched_skills = []
        cv_skill_dict = {s['name'].lower(): s for s in cv_skills}
        job_skill_dict = {s['name'].lower(): s for s in job_skills}
        is_software_like_career = self._is_software_like_career(career_name)
        generic_job_skills = {"programming", "science", "systems analysis"}
        
        seen_cv_skills = set()
        seen_job_skills = set()
        for pair in matched_pairs:
            cv_skill_name = pair['cv_skill']
            job_skill_name = pair['job_skill']
            cv_key = cv_skill_name.lower()
            job_key = job_skill_name.lower()

            # Skip if either side already matched
            if cv_key in seen_cv_skills or job_key in seen_job_skills:
                continue

            seen_cv_skills.add(cv_key)
            seen_job_skills.add(job_key)

            try:
                confidence = float(pair.get('confidence', 0.8))
            except (TypeError, ValueError):
                confidence = 0.0
            if confidence < 0.75:
                unmatched_cv.add(cv_skill_name)
                unmatched_job.add(job_skill_name)
                continue

            if (
                not is_software_like_career
                and self._is_tech_extra_skill({'name': cv_skill_name, 'category': cv_skill_dict.get(cv_key, {}).get('category')})
                and job_key in generic_job_skills
            ):
                unmatched_cv.add(cv_skill_name)
                unmatched_job.add(job_skill_name)
                continue

            # Get original skill data
            cv_skill = cv_skill_dict.get(cv_key, {'name': cv_skill_name, 'category': 'Other'})
            job_skill = job_skill_dict.get(job_key, {'name': job_skill_name, 'importance': 0.5})
            if self._is_domain_incompatible_match(cv_skill, job_skill, career_name):
                unmatched_cv.add(cv_skill_name)
                unmatched_job.add(job_skill_name)
                continue

            matched_skills.append({
                'name': cv_skill['name'],
                'onet_skill': job_skill['name'],
                'category': cv_skill.get('category', 'Other'),
                'importance': job_skill.get('importance', 0.5),
                'level': job_skill.get('level'),
                'ksa_type': job_skill.get('ksa_type', 'skill'),
                'description_en': job_skill.get('description_en'),
                'description_vn': job_skill.get('description_vn'),
                'match_type': 'ai_semantic',
                'confidence': confidence,
                'reason': pair.get('reason', '')
            })

        matched_job_keys = {self._norm(skill.get('onet_skill') or skill.get('job_skill') or skill.get('name')) for skill in matched_skills}
        unmatched_job = set(job_skill_dict.keys()) - matched_job_keys

        # Importance-weighted match% after confidence/domain filters.
        matched_importance = sum(job_skill_imp.get(j, 0.5) for j in matched_job_keys)
        match_percentage = round((matched_importance / total_importance) * 100, 2)
        
        # Build skill gaps
        critical_gaps = []
        important_gaps = []
        nice_to_have_gaps = []
        
        for skill_name in unmatched_job:
            # Find in original job_skills
            job_skill = None
            for s in job_skills:
                if s['name'].lower() == skill_name.lower():
                    job_skill = s
                    break
            
            if not job_skill:
                continue
            
            if not self._should_surface_job_ksa(job_skill, career_name):
                continue
            gap_info = self._build_gap_info(job_skill)
            bucket = self._gap_bucket(job_skill)
            if bucket == "critical":
                critical_gaps.append(gap_info)
            elif bucket == "important":
                important_gaps.append(gap_info)
            else:
                nice_to_have_gaps.append(gap_info)
        
        # Build extra skills
        extra_skills = []
        matched_cv_keys = {self._norm(skill.get('name')) for skill in matched_skills}
        for skill_name in unmatched_cv:
            cv_skill = cv_skill_dict.get(skill_name.lower())
            if cv_skill and self._norm(cv_skill.get('name')) not in matched_cv_keys:
                extra_skills.append({
                    'name': cv_skill['name'],
                    'category': cv_skill.get('category', 'Other'),
                    'source': cv_skill.get('source', 'unknown')
                })
        extra_skills = self._filter_contextual_extra_skills(extra_skills, career_name)
        
        print("  [OK] AI Analysis built:")
        print(f"     - Match percentage: {match_percentage:.1f}%")
        print(f"     - Matched skills: {len(matched_skills)}")
        print(f"     - Critical gaps: {len(critical_gaps)}")
        print(f"     - Important gaps: {len(important_gaps)}")
        print(f"     - Nice-to-have gaps: {len(nice_to_have_gaps)}")
        print(f"     - Extra skills: {len(extra_skills)}")
        
        return {
            'match_percentage': round(match_percentage, 2),
            'total_required_skills': len(job_skills),
            'matched_skills_count': len(matched_skills),
            'missing_skills_count': len(unmatched_job),
            'matched_skills': sorted(matched_skills, key=lambda x: x['importance'], reverse=True),
            'skill_gaps': {
                'critical': sorted(critical_gaps, key=lambda x: x['importance'], reverse=True),
                'important': sorted(important_gaps, key=lambda x: x['importance'], reverse=True),
                'nice_to_have': sorted(nice_to_have_gaps, key=lambda x: x['importance'], reverse=True)
            },
            'extra_skills': extra_skills,
            'analysis_metadata': {
                'method': 'ai_semantic',
                'ai_confidence': 'high',
                'total_cv_skills': len(cv_skills),
                'total_job_skills': len(job_skills)
            }
        }
    
    def _generate_insights(self, analysis: Dict) -> Dict:
        """
        Generate actionable insights from gap analysis
        
        Args:
            analysis: Gap analysis results
            
        Returns:
            Dict: Insights and recommendations
        """
        match_pct = analysis.get('match_percentage', 0)
        critical_gaps = analysis.get('skill_gaps', {}).get('critical', [])
        important_gaps = analysis.get('skill_gaps', {}).get('important', [])
        
        # Readiness level
        if match_pct >= 80:
            readiness = 'high'
            readiness_msg = 'You are well-prepared for this career!'
        elif match_pct >= 60:
            readiness = 'medium'
            readiness_msg = 'You have a good foundation, but need to develop some key skills.'
        elif match_pct >= 40:
            readiness = 'low'
            readiness_msg = 'You need significant skill development to be competitive.'
        else:
            readiness = 'very_low'
            readiness_msg = 'Consider starting with foundational courses before pursuing this career.'
        
        # Priority skills to learn
        priority_skills = []
        for gap in critical_gaps[:5]:  # Top 5 critical
            priority_skills.append({
                'name': gap['name'],
                'importance': gap['importance'],
                'reason': 'Critical for this career',
                'urgency': 'high'
            })
        
        for gap in important_gaps[:3]:  # Top 3 important
            priority_skills.append({
                'name': gap['name'],
                'importance': gap['importance'],
                'reason': 'Important for career advancement',
                'urgency': 'medium'
            })
        
        # Estimated learning time (rough estimate)
        total_gaps = len(critical_gaps) + len(important_gaps)
        estimated_months = min(total_gaps * 0.5, 12)  # Max 12 months
        
        return {
            'readiness_level': readiness,
            'readiness_message': readiness_msg,
            'priority_skills': priority_skills,
            'estimated_learning_time_months': round(estimated_months, 1),
            'next_steps': [
                'Focus on critical gaps first',
                'Consider online courses or bootcamps',
                'Build projects to demonstrate skills',
                'Update your CV as you learn new skills'
            ],
            'strengths': [
                f"You have {analysis.get('matched_skills_count', 0)} relevant skills"
            ] if analysis.get('matched_skills_count', 0) > 0 else []
        }
