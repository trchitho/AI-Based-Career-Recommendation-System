"""
Service layer for Skill Gap Analysis
"""
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

    def _get_target_career_title(self, career_id: str) -> str:
        if not self.db:
            return career_id
        try:
            from app.modules.content.models import Career
            career = self.db.query(Career).filter(
                (Career.slug == career_id) | (Career.onet_code == career_id)
            ).first()
            if career:
                return career.title_vi or career.title_en or career.slug or career_id
        except Exception as e:
            print(f"  [WARN] Could not resolve target career title: {e}")
        return career_id

    def _assess_career_relationship(self, cv_skills: List[Dict], target_title: str) -> Dict:
        try:
            from .gemini_utils import gemini_manager
            result = gemini_manager.assess_career_relationship(cv_skills, target_title) or {}
        except Exception as e:
            print(f"  [WARN] Career relationship assessment failed: {e}")
            result = {}
        return {
            'current_career': result.get('current_career') or 'Nghề trong CV',
            'target_career': target_title,
            'same_career': bool(result.get('same_career')),
            'confidence': float(result.get('confidence') or 0),
            'reason': result.get('reason') or ''
        }

    @staticmethod
    def _gap_from_job_skill(skill: Dict) -> Dict:
        importance = skill.get('importance', 0.5)
        return {
            'name': skill.get('name'),
            'category': skill.get('category', 'Other'),
            'importance': importance,
            'proficiency_level': skill.get('proficiency_level', 'intermediate'),
            'market_demand': 'high' if importance >= 0.8 else 'medium' if importance >= 0.5 else 'low'
        }

    def _normalize_groups_by_career_relation(
        self,
        analysis: Dict,
        cv_skills: List[Dict],
        job_skills: List[Dict],
        relation: Dict,
    ) -> Dict:
        gaps = analysis.setdefault('skill_gaps', {})
        gaps.setdefault('critical', [])
        gaps.setdefault('important', [])
        gaps.setdefault('nice_to_have', [])

        cv_names = {str(s.get('name', '')).strip().lower() for s in cv_skills}
        matched_jobs = {
            str(s.get('onet_skill') or s.get('name') or '').strip().lower()
            for s in analysis.get('matched_skills', [])
        }
        is_same = bool(relation.get('same_career')) and float(relation.get('confidence') or 0) >= 0.6

        if is_same:
            analysis['extra_skills'] = []
        else:
            missing_target = [
                s for s in job_skills
                if str(s.get('name', '')).strip().lower() not in cv_names
                and str(s.get('name', '')).strip().lower() not in matched_jobs
            ] or [s for s in job_skills if str(s.get('name', '')).strip().lower() not in cv_names] or job_skills

            if not (gaps['critical'] or gaps['important'] or gaps['nice_to_have']):
                for skill in sorted(missing_target, key=lambda item: item.get('importance', 0), reverse=True):
                    target = gaps['important'] if skill.get('importance', 0.5) >= 0.5 else gaps['nice_to_have']
                    target.append(self._gap_from_job_skill(skill))

            current = relation.get('current_career') or 'Nghề trong CV'
            target = relation.get('target_career') or ''
            for skill in analysis.get('extra_skills', []):
                skill['current_career'] = current
                skill['target_career'] = target

        analysis['career_relation'] = relation
        return analysis
    
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
        print("[2/4] Parsing CV with AI (reading full content)...")
        parse_start = time.time()
        
        # Use V2 parser - AI reads entire CV
        try:
            cv_data = self.cv_parser_v2.parse_cv_complete(file_content, file_type, target_career=career_id)
        except ValueError as e:
            # CV content validation failed (not a real CV / no personal info)
            from fastapi import HTTPException
            raise HTTPException(status_code=422, detail=str(e))
        
        # Extract results
        personal_info = cv_data.get('personal_info', {})
        cv_skills = cv_data.get('skills', [])
        
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

        target_title = self._get_target_career_title(career_id)
        job_skills = self.graph_analyzer.get_job_required_skills(career_id)
        relation = self._assess_career_relationship(cv_skills, target_title)
        analysis_result = self._normalize_groups_by_career_relation(
            analysis_result, cv_skills, job_skills, relation
        )

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
            job_skills=job_skills,
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
                skill_gap_record.id, cv_skills, job_skills, user_id
            )
        )

        total_time = time.time() - start_time
        print(f"Total analysis time: {total_time:.2f}s")

        return {
            'analysis_id': skill_gap_record.id,
            'career_id': career_id,
            'cv_filename': cv_file.filename,
            'cv_skills_count': len(cv_skills),
            'personal_info': personal_info,
            'processing_time': round(total_time, 2),
            **analysis_result
        }

    async def _run_ai_ranking_pipeline(
        self,
        analysis_id: int,
        cv_skills: list,
        job_skills: list,
        user_id: int,
    ) -> None:
        """Background: NeuMF rank + Thompson Sampling adjustment."""
        try:
            from .cv_worker import run_cv_pipeline
            await run_cv_pipeline(
                db=self.db,
                analysis_id=analysis_id,
                cv_text="",
                cv_skills=cv_skills,
                job_skills=job_skills,
                user_id=user_id,
            )
            print(f"[cv-worker] Pipeline done for analysis_id={analysis_id}")
        except Exception as e:
            print(f"[cv-worker] Pipeline error: {e}")
    
    def get_user_analyses(self, user_id: int, limit: int = 10) -> List[SkillGapAnalysis]:
        """
        Lấy danh sách phân tích của user
        
        Args:
            user_id: ID người dùng
            limit: Số lượng kết quả
            
        Returns:
            List[SkillGapAnalysis]: Danh sách phân tích
        """
        return self.db.query(SkillGapAnalysis)\
            .filter(SkillGapAnalysis.user_id == user_id)\
            .order_by(SkillGapAnalysis.created_at.desc())\
            .limit(limit)\
            .all()
    
    def get_analysis_by_id(self, analysis_id: int, user_id: int) -> SkillGapAnalysis:
        """
        Lấy chi tiết một phân tích
        
        Args:
            analysis_id: ID phân tích
            user_id: ID người dùng
            
        Returns:
            SkillGapAnalysis: Chi tiết phân tích
        """
        return self.db.query(SkillGapAnalysis)\
            .filter(
                SkillGapAnalysis.id == analysis_id,
                SkillGapAnalysis.user_id == user_id
            )\
            .first()
    
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
