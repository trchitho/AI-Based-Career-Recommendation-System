"""
Graph Analyzer - Giai đoạn 2
Truy vấn database để lấy yêu cầu kỹ năng và so sánh với CV
"""
from typing import List, Dict, Set
from sqlalchemy.orm import Session
from sqlalchemy import select


class SkillGraphAnalyzer:
    """Analyzer để so sánh kỹ năng CV với yêu cầu từ database"""
    
    def __init__(self, neo4j_driver=None, db_session: Session = None):
        """
        Initialize analyzer
        
        Args:
            neo4j_driver: Neo4j driver instance (optional, deprecated)
            db_session: SQLAlchemy session for PostgreSQL (preferred)
        """
        self.driver = neo4j_driver
        self.db = db_session
    
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
            print(f"  ⚠️ AI semantic matching failed: {e}")
            import traceback
            traceback.print_exc()
            return None
    
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
            from app.modules.content.models import CareerKSA, Career
            
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
            
            # Try to map the career name
            search_slug = career_mapping.get(onet_code, onet_code)
            
            # First, try to find the career by slug or ONET code
            career_stmt = select(Career).where(
                (Career.slug == search_slug) | 
                (Career.onet_code == onet_code) |
                (Career.slug == onet_code)
            )
            career_result = self.db.execute(career_stmt)
            career = career_result.scalar_one_or_none()
            
            if career:
                actual_onet_code = career.onet_code
                print(f"  ✅ Found career: {career.title_en} (ONET: {actual_onet_code})")
            else:
                # Try fuzzy search by title
                career_stmt = select(Career).where(
                    Career.title_en.ilike(f'%{onet_code}%')
                ).limit(1)
                career_result = self.db.execute(career_stmt)
                career = career_result.scalar_one_or_none()
                
                if career:
                    actual_onet_code = career.onet_code
                    print(f"  ✅ Found career by fuzzy search: {career.title_en} (ONET: {actual_onet_code})")
                else:
                    actual_onet_code = onet_code
                    print(f"  ⚠️ Career not found, using provided code: {actual_onet_code}")
            
            # Query skills from database
            stmt = select(CareerKSA).where(
                CareerKSA.onet_code == actual_onet_code,
                CareerKSA.ksa_type == 'skill'
            ).order_by(CareerKSA.importance.desc())
            
            result = self.db.execute(stmt)
            ksa_rows = result.scalars().all()
            
            skills = []
            for ksa in ksa_rows:
                # Normalize importance to 0-1 scale
                importance = float(ksa.importance) / 100.0 if ksa.importance else 0.5
                
                skills.append({
                    'name': ksa.name,
                    'category': ksa.category or 'Other',
                    'importance': importance,
                    'proficiency_level': 'intermediate',  # Default
                    'source': 'onet_database'
                })
            
            print(f"  ✅ Loaded {len(skills)} ONET skills from database")
            return skills
            
        except Exception as e:
            print(f"  ⚠️ Error querying database for skills: {e}")
            import traceback
            traceback.print_exc()
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
                print(f"✅ Using skills from PostgreSQL database for {career_id}")
                return skills
        
        # Try 2: Get from Neo4j (if available)
        query = """
        MATCH (c:Career {id: $career_id})-[r:REQUIRES_SKILL]->(s:Skill)
        RETURN s.name as skill_name, 
               s.category as category,
               r.importance as importance,
               r.proficiency_level as proficiency_level
        ORDER BY r.importance DESC
        """
        
        try:
            result = self.execute_query(query, {'career_id': career_id})
            
            for record in result:
                skills.append({
                    'name': record['skill_name'],
                    'category': record.get('category', 'Other'),
                    'importance': record.get('importance', 0.5),
                    'proficiency_level': record.get('proficiency_level', 'intermediate'),
                    'source': 'neo4j'
                })
            
            if skills:
                print(f"✅ Using skills from Neo4j for {career_id}")
                return skills
        except Exception as e:
            print(f"Neo4j query failed: {e}")
        
        # Try 3: Fallback to mock data
        print(f"⚠️ No database/Neo4j data for {career_id}, using fallback mock data")
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
    
    def calculate_skill_match(self, cv_skills: List[Dict], job_skills: List[Dict]) -> Dict:
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
        print("  🔍 [Gap Analysis] Starting skill comparison...")
        
        # Convert CV skills to lowercase dict for matching
        cv_skill_names = {skill['name'].lower() for skill in cv_skills}
        cv_skill_dict = {skill['name'].lower(): skill for skill in cv_skills}
        
        # For ONET skills, we need smarter matching
        job_skill_dict = {skill['name'].lower(): skill for skill in job_skills}
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
                if cv_skill in job_skill_name or job_skill_name in cv_skill:
                    if job_skill_name not in matched_skills:
                        matched_skills.add(job_skill_name)
                        matched_details.append({
                            'name': cv_skill_dict[cv_skill]['name'],
                            'onet_skill': job_skill_dict[job_skill_name]['name'],
                            'category': cv_skill_dict[cv_skill].get('category', 'Other'),
                            'importance': job_skill_dict[job_skill_name].get('importance', 0.5),
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
                    matched_skills.add(job_skill_name)
                    matched_details.append({
                        'name': cv_skill_dict[cv_skill]['name'],
                        'onet_skill': job_skill_dict[job_skill_name]['name'],
                        'category': cv_skill_dict[cv_skill].get('category', 'Other'),
                        'importance': job_skill_dict[job_skill_name].get('importance', 0.5),
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
            importance = skill.get('importance', 0.5)
            
            gap_info = {
                'name': skill_name,
                'category': skill.get('category', 'Other'),
                'importance': importance,
                'proficiency_level': skill.get('proficiency_level', 'intermediate'),
                'market_demand': 'high' if importance >= 0.8 else 'medium' if importance >= 0.5 else 'low'
            }
            
            if importance >= 0.8:
                critical_gaps.append(gap_info)
            elif importance >= 0.5:
                important_gaps.append(gap_info)
            else:
                nice_to_have_gaps.append(gap_info)
        
        # Step 6: Identify extra skills (not required but good to have)
        matched_cv_skills = {detail['name'].lower() for detail in matched_details}
        extra_skills = cv_skill_names - matched_cv_skills
        
        print(f"  ✅ [Gap Analysis] Complete:")
        print(f"     - Match percentage: {match_percentage:.1f}%")
        print(f"     - Critical gaps: {len(critical_gaps)}")
        print(f"     - Important gaps: {len(important_gaps)}")
        print(f"     - Nice-to-have gaps: {len(nice_to_have_gaps)}")
        print(f"     - Extra skills: {len(extra_skills)}")
        
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
            'extra_skills': [
                {
                    'name': cv_skill_dict[skill]['name'], 
                    'category': cv_skill_dict[skill].get('category', 'Other'),
                    'source': cv_skill_dict[skill].get('source', 'unknown')
                }
                for skill in sorted(extra_skills)
            ],
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
        print(f"\n🎯 [Gap Analysis Pipeline] Analyzing for career: {career_id}")
        
        # Step 1: Get job requirements
        print(f"  [1/3] Querying job requirements...")
        job_skills = self.get_job_required_skills(career_id)
        
        if not job_skills:
            return {
                'error': 'No skill requirements found for this career',
                'career_id': career_id,
                'suggestion': 'Try selecting a different career or check if the career exists in database'
            }
        
        # Step 2: Try AI semantic matching first
        print(f"  [2/4] Attempting AI semantic skill matching...")
        
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
                print(f"  ⚠️ Could not get career name: {e}")
        
        ai_result = self.ai_semantic_skill_matching(cv_skills, job_skills, career_name)
        
        # Step 3: Perform gap analysis (use AI results if available)
        print(f"  [3/4] Performing gap analysis...")
        if ai_result:
            # Use AI semantic matching results
            analysis = self._build_analysis_from_ai(ai_result, cv_skills, job_skills)
        else:
            # Fallback to traditional matching
            print(f"  ⚠️ AI matching unavailable, using traditional matching")
            analysis = self.calculate_skill_match(cv_skills, job_skills)
        
        analysis['career_id'] = career_id
        
        # Step 4: Generate insights
        print(f"  [4/4] Generating insights...")
        insights = self._generate_insights(analysis)
        analysis['insights'] = insights
        
        print(f"✅ [Gap Analysis Pipeline] Complete!\n")
        
        return analysis
    
    def _build_analysis_from_ai(self, ai_result: Dict, cv_skills: List[Dict], job_skills: List[Dict]) -> Dict:
        """
        Build analysis result from AI semantic matching
        
        Args:
            ai_result: Result from ai_semantic_skill_matching()
            cv_skills: Original CV skills
            job_skills: Original job skills
            
        Returns:
            Dict: Analysis in standard format
        """
        print(f"  🤖 Building analysis from AI semantic matching...")
        
        # Get matched pairs from AI
        matched_pairs = ai_result.get('matched_pairs', [])
        unmatched_cv = set(ai_result.get('unmatched_cv_skills', []))
        unmatched_job = set(ai_result.get('unmatched_job_skills', []))
        match_percentage = ai_result.get('overall_match_percentage', 0)
        
        # Build matched skills list
        matched_skills = []
        cv_skill_dict = {s['name'].lower(): s for s in cv_skills}
        job_skill_dict = {s['name'].lower(): s for s in job_skills}
        
        for pair in matched_pairs:
            cv_skill_name = pair['cv_skill']
            job_skill_name = pair['job_skill']
            confidence = pair.get('confidence', 0.8)
            
            # Get original skill data
            cv_skill = cv_skill_dict.get(cv_skill_name.lower(), {'name': cv_skill_name, 'category': 'Other'})
            job_skill = job_skill_dict.get(job_skill_name.lower(), {'name': job_skill_name, 'importance': 0.5})
            
            matched_skills.append({
                'name': cv_skill['name'],
                'onet_skill': job_skill['name'],
                'category': cv_skill.get('category', 'Other'),
                'importance': job_skill.get('importance', 0.5),
                'match_type': 'ai_semantic',
                'confidence': confidence,
                'reason': pair.get('reason', '')
            })
        
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
            
            importance = job_skill.get('importance', 0.5)
            gap_info = {
                'name': job_skill['name'],
                'category': job_skill.get('category', 'Other'),
                'importance': importance,
                'proficiency_level': job_skill.get('proficiency_level', 'intermediate'),
                'market_demand': 'high' if importance >= 0.8 else 'medium' if importance >= 0.5 else 'low'
            }
            
            if importance >= 0.8:
                critical_gaps.append(gap_info)
            elif importance >= 0.5:
                important_gaps.append(gap_info)
            else:
                nice_to_have_gaps.append(gap_info)
        
        # Build extra skills
        extra_skills = []
        for skill_name in unmatched_cv:
            cv_skill = cv_skill_dict.get(skill_name.lower())
            if cv_skill:
                extra_skills.append({
                    'name': cv_skill['name'],
                    'category': cv_skill.get('category', 'Other'),
                    'source': cv_skill.get('source', 'unknown')
                })
        
        print(f"  ✅ AI Analysis built:")
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
