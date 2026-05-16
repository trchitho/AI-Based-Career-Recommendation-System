"""
Service layer for Skill Gap Analysis
"""
import os
import re
from typing import Dict, List

from app.core.r2_storage import r2_storage
from fastapi import UploadFile
from sqlalchemy.orm import Session

from .cv_parser import CVParser
from .cv_parser_v2 import CVParserV2
from .graph_analyzer import SkillGraphAnalyzer
from .models import SkillGapAnalysis


class SkillGapService:
    """Service để xử lý skill gap analysis"""
    
    def __init__(self, db: Session, neo4j_driver=None):
        """
        Initialize service
        
        Args:
            db: Database session
            neo4j_driver: Neo4j driver (optional)
        """
        self.db = db
        self.cv_parser = CVParser(db_session=db)
        self.cv_parser_v2 = CVParserV2(db_session=db)  # New AI-first parser
        self.graph_analyzer = SkillGraphAnalyzer(neo4j_driver, db_session=db)

    @staticmethod
    def _bool_env(name: str, default: bool = False) -> bool:
        value = os.getenv(name)
        if value is None:
            return default
        return value.strip().lower() in {"1", "true", "yes", "y", "on"}

    def _extract_common_tech_skills_fast(self, text: str) -> List[Dict]:
        """Fast deterministic extraction for common CV technology terms."""
        catalog = {
            "React.js": ("react.js", "Frontend"),
            "React": ("react", "Frontend"),
            "TypeScript": ("typescript", "Frontend"),
            "JavaScript": ("javascript", "Frontend"),
            "Tailwind CSS": ("tailwind", "Frontend"),
            "DaisyUI": ("daisyui", "Frontend"),
            "Node.js": ("node.js", "Backend"),
            "Express.js": ("express.js", "Backend"),
            "RESTful APIs": ("restful api", "Backend"),
            "MongoDB": ("mongodb", "Database"),
            "Mongoose": ("mongoose", "Database"),
            "PostgreSQL": ("postgresql", "Database"),
            "SQL": ("sql", "Database"),
            "JWT Authentication": ("jwt", "Security"),
            "bcrypt": ("bcrypt", "Security"),
            "Cloudinary": ("cloudinary", "Services"),
            "Socket.IO": ("socket.io", "Backend"),
            "Python": ("python", "Programming"),
            "Java": ("java", "Programming"),
            "FastAPI": ("fastapi", "Backend"),
            "Spring Boot": ("spring boot", "Backend"),
            "NLP": ("nlp", "AI / NLP / Data"),
            "Vector Search": ("vector search", "AI / NLP / Data"),
            "Recommendation Systems": ("recommendation", "AI / ML"),
            "PhoBERT": ("phobert", "AI / NLP / Data"),
            "vi-SBERT": ("vi-sbert", "AI / NLP / Data"),
            "NeuMF": ("neumf", "AI / ML"),
            "FAISS": ("faiss", "AI / NLP / Data"),
            "Pandas": ("pandas", "AI / NLP / Data"),
            "NumPy": ("numpy", "AI / NLP / Data"),
            "Postman": ("postman", "Tools & Workflow"),
            "Git": ("git", "Tools & Workflow"),
        }
        lower = text.lower()
        found = []
        seen = set()
        for name, (needle, category) in catalog.items():
            pattern = rf"(?<![\w]){re.escape(needle)}(?![\w])"
            if re.search(pattern, lower) and name.lower() not in seen:
                if name == "React" and "react.js" in seen:
                    continue
                found.append({"name": name, "category": category, "source": "fast_cv"})
                seen.add(name.lower())
        return found

    def _merge_skills(self, *groups: List[Dict]) -> List[Dict]:
        merged: Dict[str, Dict] = {}
        for group in groups:
            for skill in group or []:
                name = str(skill.get("name") or "").strip()
                if not name:
                    continue
                key = name.lower()
                if key not in merged:
                    merged[key] = skill
        return list(merged.values())

    def _extract_phone_fast(self, text: str) -> str:
        for match in re.findall(r'(?:\+84|84|0)[\d\s().-]{8,16}', text or ''):
            digits = re.sub(r'\D', '', match)
            if digits.startswith('84') and len(digits) in (11, 12):
                digits = '0' + digits[2:]
            if 10 <= len(digits) <= 11 and digits.isdigit():
                return digits
        return ''

    def _looks_like_english_cv(self, text: str) -> bool:
        lower = (text or '').lower()
        markers = [
            'profile', 'education', 'experience', 'technical skills',
            'projects', 'developer', 'software engineering', 'frontend',
            'backend', 'fullstack'
        ]
        return sum(1 for marker in markers if marker in lower) >= 3

    def _parse_cv_fast(self, file_content: bytes, file_type: str, career_id: str) -> Dict | None:
        if not self._bool_env("SKILL_GAP_FAST_CV_PARSE", default=True):
            return None
        if file_type != "pdf":
            return None

        text = self.cv_parser_v2.extract_text_from_pdf(file_content)
        if not text or len(text.strip()) < 200:
            return None

        personal_info = self.cv_parser.extract_personal_info(text)
        if not personal_info.get("phone"):
            personal_info["phone"] = self._extract_phone_fast(text)
        keyword_skills = self.cv_parser.extract_skills(text)
        tech_skills = self._extract_common_tech_skills_fast(text)
        language_skills = []
        if "english" in text.lower() or self._looks_like_english_cv(text):
            language_skills.append({"name": "English Language", "category": "Language", "source": "fast_cv_language"})
        skills = self._merge_skills(keyword_skills, tech_skills, language_skills)

        if len(skills) < 5:
            return None

        print(f"  [FAST] Parsed CV locally: {len(skills)} skills, skipped Gemini extraction")
        return {
            "text": text,
            "personal_info": personal_info,
            "skills": skills,
            "parse_mode": "fast_local",
            "target_career": career_id,
        }
    
    async def analyze_cv(
        self, 
        user_id: int, 
        cv_file: UploadFile, 
        career_id: str
    ) -> Dict:
        """
        Phân tích CV và so sánh với yêu cầu công việc
        
        Args:
            user_id: ID người dùng
            cv_file: File CV upload
            career_id: ID nghề nghiệp mục tiêu
            
        Returns:
            Dict: Kết quả phân tích
        """
        import time
        start_time = time.time()
        
        # Read file content
        print(f"[1/4] Reading file: {cv_file.filename}")
        file_content = await cv_file.read()
        
        # Detect file type
        file_ext = cv_file.filename.split('.')[-1].lower() if '.' in cv_file.filename else 'pdf'
        if file_ext in ['jpg', 'jpeg', 'png']:
            file_type = 'image'
        else:
            file_type = 'pdf'
        
        print(f"  File size: {len(file_content)} bytes, Type: {file_type}")
        
        # Parse CV
        print("[2/4] Parsing CV...")
        parse_start = time.time()

        try:
            cv_data = self._parse_cv_fast(file_content, file_type, career_id)
            if cv_data is None:
                print("  [AI] Fast parser not available; using Gemini full extraction")
                cv_data = self.cv_parser_v2.parse_cv_complete(file_content, file_type, target_career=career_id)
        except ValueError as e:
            # CV content validation failed (not a real CV / no personal info)
            from fastapi import HTTPException
            raise HTTPException(status_code=422, detail=str(e))
        
        # Extract results
        personal_info = cv_data.get('personal_info', {})
        text_for_contact = cv_data.get('text', '')
        if not personal_info.get('phone'):
            personal_info['phone'] = self._extract_phone_fast(text_for_contact)
        cv_skills = cv_data.get('skills', [])
        if text_for_contact and ("english" in text_for_contact.lower() or self._looks_like_english_cv(text_for_contact)):
            cv_skills = self._merge_skills(
                cv_skills,
                [{"name": "English Language", "category": "Language", "source": "fast_cv_language"}],
            )
        
        # If AI didn't find skills, fallback to hybrid method
        if not cv_skills or len(cv_skills) == 0:
            print("  [WARN] AI found no skills, using hybrid fallback...")
            text = cv_data.get('text', '')
            if file_type == 'image':
                text = self.cv_parser.extract_text_from_image(file_content)
            else:
                text = self.cv_parser.extract_text_from_pdf(file_content)
            
            cv_skills = self.cv_parser.extract_skills_hybrid(text, target_career=career_id)
            
            # Also try to extract personal info with fallback
            if not personal_info.get('name'):
                personal_info = self.cv_parser.extract_personal_info(text)
            if not personal_info.get('phone'):
                personal_info['phone'] = self._extract_phone_fast(text)
            if ("english" in text.lower() or self._looks_like_english_cv(text)):
                cv_skills = self._merge_skills(
                    cv_skills,
                    [{"name": "English Language", "category": "Language", "source": "fast_cv_language"}],
                )
        
        print(f"  Extracted {len(cv_skills)} skills in {time.time() - parse_start:.2f}s")
        
        # Analyze skill gap + Upload CV in PARALLEL (tiết kiệm ~30-60% thời gian bước này)
        print("[3/4] Analyzing skill gap + uploading CV in parallel...")
        import asyncio
        loop = asyncio.get_event_loop()

        analyze_start = time.time()
        analysis_result, cv_file_url = await asyncio.gather(
            loop.run_in_executor(None, lambda: self.graph_analyzer.analyze_skill_gap(cv_skills, career_id)),
            loop.run_in_executor(None, lambda: r2_storage.upload_cv(
                file_content=file_content,
                original_filename=cv_file.filename,
                user_id=user_id,
            )),
        )
        print(f"  Parallel done in {time.time() - analyze_start:.2f}s")
        if cv_file_url:
            print(f"  Uploaded: {cv_file_url}")
        else:
            print("  R2 upload skipped (not configured or failed)")

        # Save to database
        print("[5/5] Saving to database...")
        db_start = time.time()

        # Reset any aborted transaction from earlier queries before saving
        try:
            self.db.rollback()
        except Exception:
            pass

        # Extract personal info
        personal_info = cv_data.get('personal_info', {})

        # Get text preview safely
        text_preview = cv_data.get('text', '')
        if not text_preview and file_type == 'image':
            text_preview = 'Image CV - OCR not available'

        job_skills_for_record = analysis_result.get('job_skills') or self.graph_analyzer.get_job_required_skills(career_id)

        skill_gap_record = SkillGapAnalysis(
            user_id=user_id,
            career_id=career_id,
            cv_filename=cv_file.filename,
            cv_file_url=cv_file_url,
            cv_text_preview=text_preview[:500] if text_preview else '',
            cv_name=personal_info.get('name') or None,
            cv_email=personal_info.get('email') or None,
            cv_phone=personal_info.get('phone') or None,
            cv_skills=cv_skills,
            job_skills=job_skills_for_record,
            matched_skills=analysis_result.get('matched_skills', []),
            skill_gaps=analysis_result.get('skill_gaps', {}),
            extra_skills=analysis_result.get('extra_skills', []),
            match_percentage=analysis_result.get('match_percentage', 0),
            total_required_skills=analysis_result.get('total_required_skills', 0),
            matched_skills_count=analysis_result.get('matched_skills_count', 0),
            missing_skills_count=analysis_result.get('missing_skills_count', 0)
        )
        
        self.db.add(skill_gap_record)
        self.db.commit()
        self.db.refresh(skill_gap_record)
        print(f"  Saved in {time.time() - db_start:.2f}s")

        # ── Stage 4/5: NeuMF + Thompson Sampling (background, non-blocking) ──
        import asyncio as _aio
        _aio.ensure_future(
            self._run_ai_ranking_pipeline(
                skill_gap_record.id, cv_skills, job_skills_for_record, user_id
            )
        )

        total_time = time.time() - start_time
        print(f"Total analysis time: {total_time:.2f}s")

        response_result = dict(analysis_result)
        response_result.pop('job_skills', None)

        return {
            'analysis_id': skill_gap_record.id,
            'career_id': career_id,
            'cv_filename': cv_file.filename,
            'cv_skills_count': len(cv_skills),
            'personal_info': personal_info,
            'processing_time': round(total_time, 2),
            **response_result
        }

    async def _run_ai_ranking_pipeline(
        self,
        analysis_id: int,
        cv_skills: list,
        job_skills: list,
        user_id: int,
    ) -> None:
        """Background: NeuMF rank + Thompson Sampling adjustment."""
        bg_db = None
        try:
            from app.core.db import SessionLocal
            from .cv_worker import run_cv_pipeline

            bg_db = SessionLocal()
            await run_cv_pipeline(
                db=bg_db,
                analysis_id=analysis_id,
                cv_text="",
                cv_skills=cv_skills,
                job_skills=job_skills,
                user_id=user_id,
            )
            print(f"[cv-worker] Pipeline done for analysis_id={analysis_id}")
        except Exception as e:
            print(f"[cv-worker] Pipeline error: {e}")
        finally:
            if bg_db is not None:
                bg_db.close()
    
    def get_user_analyses(self, user_id: int, limit: int = 10) -> List[SkillGapAnalysis]:
        """
        Lấy danh sách phân tích của user
        
        Args:
            user_id: ID người dùng
            limit: Số lượng kết quả
            
        Returns:
            List[SkillGapAnalysis]: Danh sách phân tích
        """
        analyses = self.db.query(SkillGapAnalysis)\
            .filter(SkillGapAnalysis.user_id == user_id)\
            .order_by(SkillGapAnalysis.created_at.desc())\
            .limit(limit)\
            .all()
        for analysis in analyses:
            # READ-ONLY mode: do NOT regenerate extra_skills (avoid Gemini calls on every list view)
            self._sanitize_analysis_record(analysis, regenerate_extras=False)
        return analyses
    
    def get_analysis_by_id(self, analysis_id: int, user_id: int) -> SkillGapAnalysis:
        """
        Lấy chi tiết một phân tích
        
        Args:
            analysis_id: ID phân tích
            user_id: ID người dùng
            
        Returns:
            SkillGapAnalysis: Chi tiết phân tích
        """
        analysis = self.db.query(SkillGapAnalysis)\
            .filter(
                SkillGapAnalysis.id == analysis_id,
                SkillGapAnalysis.user_id == user_id
            )\
            .first()
        # READ-ONLY mode: only regenerate extras if record has none persisted yet.
        return self._sanitize_analysis_record(analysis, regenerate_extras=False)

    def _sanitize_analysis_record(self, analysis: SkillGapAnalysis, regenerate_extras: bool = True) -> SkillGapAnalysis:
        """Normalize legacy records before returning them to the UI.

        Args:
            analysis: The analysis record to sanitize.
            regenerate_extras: When True, may call Gemini to fill empty `extra_skills`.
                When False (read-only views like list/detail GETs), only filter persisted
                values without making expensive AI calls.
        """
        if not analysis:
            return analysis

        text_preview = analysis.cv_text_preview or ""
        if not analysis.cv_phone:
            analysis.cv_phone = self._extract_phone_fast(text_preview)

        cv_skills = analysis.cv_skills if isinstance(analysis.cv_skills, list) else []
        if text_preview and ("english" in text_preview.lower() or self._looks_like_english_cv(text_preview)):
            cv_skills = self._merge_skills(
                cv_skills,
                [{"name": "English Language", "category": "Language", "source": "fast_cv_language"}],
            )
            analysis.cv_skills = cv_skills

        cv_keys = {
            alias
            for skill in cv_skills
            if isinstance(skill, dict)
            for alias in self.graph_analyzer._equivalent_skill_keys(str(skill.get("name") or ""))
        }

        def is_missing_skill(skill: dict) -> bool:
            if not isinstance(skill, dict):
                return False
            if self.graph_analyzer._equivalent_skill_keys(str(skill.get("name") or "")) & cv_keys:
                return False
            return self.graph_analyzer._should_surface_job_ksa(skill, analysis.career_id or "")

        skill_gaps = analysis.skill_gaps if isinstance(analysis.skill_gaps, dict) else {}
        job_skills = analysis.job_skills if isinstance(analysis.job_skills, list) else []
        job_by_name = {
            self.graph_analyzer._norm(skill.get("name")): skill
            for skill in job_skills
            if isinstance(skill, dict) and skill.get("name")
        }

        matched = analysis.matched_skills if isinstance(analysis.matched_skills, list) else []
        filtered_matched = []
        restored_gaps = []
        for skill in matched:
            if not isinstance(skill, dict):
                continue
            matched_job_name = (
                skill.get("onet_skill")
                or skill.get("job_skill")
                or skill.get("matched_job_skill")
                or ""
            )
            job_skill = job_by_name.get(self.graph_analyzer._norm(matched_job_name))
            cv_skill = {
                "name": skill.get("name"),
                "category": skill.get("category"),
            }
            incompatible = False
            if job_skill:
                incompatible = self.graph_analyzer._is_domain_incompatible_match(
                    cv_skill,
                    job_skill,
                    analysis.career_id or "",
                )
            else:
                # Legacy AI records sometimes stored only the CV-side skill. If it is an
                # IT skill in a non-software target career, do not surface it as a strength.
                incompatible = (
                    self.graph_analyzer._is_tech_extra_skill(cv_skill)
                    and not self.graph_analyzer._is_software_like_career(analysis.career_id or "")
                )
            if incompatible:
                if job_skill and is_missing_skill(job_skill):
                    restored_gaps.append(self.graph_analyzer._build_gap_info(job_skill))
                continue
            filtered_matched.append(skill)

        analysis.matched_skills = filtered_matched

        def add_unique_gaps(items: list[dict], extra: list[dict], bucket: str) -> list[dict]:
            seen = {self.graph_analyzer._norm(skill.get("name")) for skill in items if isinstance(skill, dict)}
            out = list(items)
            for skill in extra:
                if not isinstance(skill, dict) or not is_missing_skill(skill):
                    continue
                if self.graph_analyzer._gap_bucket(skill) != bucket:
                    continue
                key = self.graph_analyzer._norm(skill.get("name"))
                if key and key not in seen:
                    out.append(skill)
                    seen.add(key)
            return out

        critical = [
            skill for skill in (skill_gaps.get('critical') or [])
            if is_missing_skill(skill)
        ]
        critical = add_unique_gaps(critical, restored_gaps, "critical")
        important = [
            skill for skill in (skill_gaps.get('important') or [])
            if is_missing_skill(skill)
        ]
        important = add_unique_gaps(important, restored_gaps, "important")
        important = sorted(
            important,
            key=lambda skill: (
                self.graph_analyzer._gap_rank_score(skill),
                float(skill.get('importance') or 0),
                float(skill.get('level') or 0),
                str(skill.get('name') or ''),
            ),
            reverse=True,
        )[:self.graph_analyzer.MAX_IMPORTANT_GAPS]
        nice_to_have = [
            skill for skill in (skill_gaps.get('nice_to_have') or [])
            if is_missing_skill(skill)
        ]
        nice_to_have = add_unique_gaps(nice_to_have, restored_gaps, "nice_to_have")
        analysis.skill_gaps = {
            'critical': critical,
            'important': important,
            'nice_to_have': nice_to_have,
        }
        unique_matched_names = {
            str(skill.get('name') or '').strip().lower()
            for skill in filtered_matched
            if isinstance(skill, dict) and skill.get('name')
        }

        analysis.matched_skills_count = len(unique_matched_names)
        analysis.missing_skills_count = len(critical) + len(important)
        analysis.total_required_skills = analysis.matched_skills_count + analysis.missing_skills_count
        existing_extra = analysis.extra_skills if isinstance(analysis.extra_skills, list) else []
        valid_existing_extra = []
        for skill in existing_extra:
            if not isinstance(skill, dict):
                continue
            name = str(skill.get("name") or "")
            has_overlap = bool(self.graph_analyzer._equivalent_skill_keys(name) & cv_keys)
            # Accept skills that have at least a name and don't overlap with CV skills
            if name and not has_overlap:
                valid_existing_extra.append(skill)
        # If we have persisted extras, always use them (avoid regenerating on every read).
        # Only fall back to AI/catalog generation when extras are missing AND caller opted-in.
        if valid_existing_extra:
            analysis.extra_skills = valid_existing_extra[:self.graph_analyzer.CURRENT_CAREER_SUGGESTION_LIMIT]
        elif regenerate_extras:
            analysis.extra_skills = self.graph_analyzer._build_current_career_skill_suggestions(
                analysis.cv_skills if isinstance(analysis.cv_skills, list) else [],
                analysis.career_id or "",
            )
        else:
            # Read-only path: keep whatever was persisted (possibly empty) but never call Gemini.
            analysis.extra_skills = valid_existing_extra
        return analysis
    
    def generate_heatmap_data(self, analysis_id: int, user_id: int) -> Dict:
        """
        Tạo dữ liệu cho heatmap visualization
        
        Args:
            analysis_id: ID phân tích
            user_id: ID người dùng
            
        Returns:
            Dict: Dữ liệu heatmap
        """
        analysis = self.get_analysis_by_id(analysis_id, user_id)
        if not analysis:
            return None
        
        nodes = []
        links = []
        
        # Add career node (center)
        nodes.append({
            'id': f'career_{analysis.career_id}',
            'name': analysis.career_id,
            'type': 'career',
            'color': '#667eea'
        })
        
        # Ensure skill_gaps is a dict with default structure
        skill_gaps = analysis.skill_gaps if isinstance(analysis.skill_gaps, dict) else {}
        if not skill_gaps:
            skill_gaps = {'critical': [], 'important': [], 'nice_to_have': []}
        
        # Ensure matched_skills is a list
        matched_skills = analysis.matched_skills if isinstance(analysis.matched_skills, list) else []
        
        # Add matched skills (green)
        for skill in matched_skills:
            nodes.append({
                'id': f'skill_{skill["name"]}',
                'name': skill['name'],
                'type': 'matched',
                'category': skill.get('category', 'Other'),
                'color': '#10b981',  # Green
                'importance': skill.get('importance', 0.5)
            })
            links.append({
                'source': f'career_{analysis.career_id}',
                'target': f'skill_{skill["name"]}',
                'strength': skill.get('importance', 0.5)
            })
        
        # Add critical gaps (red)
        for skill in skill_gaps.get('critical', []):
            nodes.append({
                'id': f'skill_{skill["name"]}',
                'name': skill['name'],
                'type': 'critical_gap',
                'category': skill.get('category', 'Other'),
                'color': '#ef4444',  # Red
                'importance': skill.get('importance', 0.8)
            })
            links.append({
                'source': f'career_{analysis.career_id}',
                'target': f'skill_{skill["name"]}',
                'strength': skill.get('importance', 0.8),
                'style': 'dashed'
            })
        
        # Add important gaps (orange)
        for skill in skill_gaps.get('important', []):
            nodes.append({
                'id': f'skill_{skill["name"]}',
                'name': skill['name'],
                'type': 'important_gap',
                'category': skill.get('category', 'Other'),
                'color': '#f59e0b',  # Orange
                'importance': skill.get('importance', 0.5)
            })
            links.append({
                'source': f'career_{analysis.career_id}',
                'target': f'skill_{skill["name"]}',
                'strength': skill.get('importance', 0.5),
                'style': 'dashed'
            })
        
        # Add nice-to-have gaps (yellow)
        for skill in skill_gaps.get('nice_to_have', []):
            nodes.append({
                'id': f'skill_{skill["name"]}',
                'name': skill['name'],
                'type': 'nice_to_have_gap',
                'category': skill.get('category', 'Other'),
                'color': '#eab308',  # Yellow
                'importance': skill.get('importance', 0.3)
            })
            links.append({
                'source': f'career_{analysis.career_id}',
                'target': f'skill_{skill["name"]}',
                'strength': skill.get('importance', 0.3),
                'style': 'dotted'
            })
        
        return {
            'nodes': nodes,
            'links': links,
            'match_percentage': analysis.match_percentage,
            'career_name': analysis.career_id,
            'legend': {
                'matched': {'color': '#10b981', 'label': 'Kỹ năng đã có'},
                'critical_gap': {'color': '#ef4444', 'label': 'Lỗ hổng quan trọng'},
                'important_gap': {'color': '#f59e0b', 'label': 'Lỗ hổng cần bổ sung'},
                'nice_to_have_gap': {'color': '#eab308', 'label': 'Kỹ năng khuyến nghị'}
            }
        }
