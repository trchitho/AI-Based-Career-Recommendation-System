"""
Enhanced CV Extractor - Improved extraction for TC-CV-04 to TC-CV-07
Provides better personal info, skills, and experience extraction
"""
import re
from datetime import datetime
from typing import Dict, List, Optional, Tuple

from dateutil import parser as date_parser


class EnhancedCVExtractor:
    """Enhanced extractor for CV information"""
    
    # Skill normalization mapping
    SKILL_NORMALIZATION_MAP = {
        # JavaScript variants
        'js': 'javascript',
        'javascript': 'javascript',
        'typescript': 'typescript',
        'ts': 'typescript',
        
        # React variants
        'reactjs': 'react',
        'react.js': 'react',
        'react': 'react',
        'react native': 'react native',
        
        # Vue variants
        'vuejs': 'vue',
        'vue.js': 'vue',
        'vue': 'vue',
        
        # Angular variants
        'angularjs': 'angular',
        'angular.js': 'angular',
        'angular': 'angular',
        
        # Node variants
        'nodejs': 'node.js',
        'node.js': 'node.js',
        'node': 'node.js',
        
        # Python variants
        'python': 'python',
        'py': 'python',
        
        # Java variants
        'java': 'java',
        'golang': 'go',
        'go': 'go',
        
        # C variants
        'c#': 'csharp',
        'csharp': 'csharp',
        'c++': 'cplusplus',
        'cplusplus': 'cplusplus',
        
        # Database variants
        'postgres': 'postgresql',
        'postgresql': 'postgresql',
        'mysql': 'mysql',
        'mongo': 'mongodb',
        'mongodb': 'mongodb',
        'redis': 'redis',
        
        # Cloud variants
        'amazon web services': 'aws',
        'aws': 'aws',
        'google cloud': 'gcp',
        'gcp': 'gcp',
        'azure': 'microsoft azure',
        'microsoft azure': 'microsoft azure',
        
        # Soft skills
        'communicate': 'communication',
        'communication': 'communication',
        'lead': 'leadership',
        'leadership': 'leadership',
        'manage': 'management',
        'management': 'management',
        'analyze': 'analysis',
        'analysis': 'analysis',
    }
    
    @staticmethod
    def extract_personal_info_enhanced(text: str) -> Dict[str, str]:
        """
        TC-CV-04: Enhanced personal information extraction
        
        Args:
            text: CV text
            
        Returns:
            Dict with name, email, phone, linkedin
        """
        info = {
            'name': '',
            'email': '',
            'phone': '',
            'linkedin': ''
        }
        
        # Extract email (most reliable)
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        email_match = re.search(email_pattern, text, re.IGNORECASE)
        if email_match:
            info['email'] = email_match.group(0)
        
        # Extract phone (Vietnamese formats)
        phone_patterns = [
            r'(?:\+84|84|0)[\s.-]?(?:\d[\s.-]?){9,10}',  # Vietnamese format
            r'\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}',  # US format
        ]
        
        for pattern in phone_patterns:
            phone_matches = re.findall(pattern, text)
            if phone_matches:
                # Clean first valid phone
                for phone in phone_matches:
                    phone_clean = re.sub(r'[\s.\-()]', '', phone)
                    if 10 <= len(phone_clean) <= 12 and phone_clean.replace('+', '').isdigit():
                        info['phone'] = phone_clean
                        break
                if info['phone']:
                    break
        
        # Extract LinkedIn
        linkedin_patterns = [
            r'linkedin\.com/in/[\w\-]+',
            r'linkedin\.com/[\w\-]+',
        ]
        
        for pattern in linkedin_patterns:
            linkedin_match = re.search(pattern, text, re.IGNORECASE)
            if linkedin_match:
                info['linkedin'] = linkedin_match.group(0)
                break
        
        # Extract name - look for patterns
        name_patterns = [
            # Pattern 1: "Name: John Doe"
            r'(?:name|họ tên|full name|tên)[\s:]+([A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+(?:\s+[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+){1,3})',
            # Pattern 2: Name at start (2-4 capitalized words)
            r'^([A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+(?:\s+[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+){1,3})',
            # Pattern 3: All caps name at start
            r'^([A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ\s]{10,50})',
        ]
        
        for pattern in name_patterns:
            name_match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if name_match:
                potential_name = name_match.group(1).strip()
                
                # Validate name
                if EnhancedCVExtractor._is_valid_name(potential_name):
                    info['name'] = potential_name.title()
                    break
        
        return info
    
    @staticmethod
    def _is_valid_name(name: str) -> bool:
        """Validate if extracted text is a valid name"""
        if not name or len(name) < 5 or len(name) > 50:
            return False
        
        # Check word count (2-4 words for name)
        words = name.split()
        if len(words) < 2 or len(words) > 4:
            return False
        
        # Check for invalid keywords (job titles, skills)
        invalid_keywords = [
            'engineer', 'developer', 'designer', 'manager', 'analyst',
            'specialist', 'consultant', 'architect', 'administrator',
            'laravel', 'php', 'python', 'java', 'react', 'backend',
            'frontend', 'fullstack', 'senior', 'junior', 'lead',
            'experience', 'education', 'skills', 'summary', 'objective'
        ]
        
        name_lower = name.lower()
        if any(keyword in name_lower for keyword in invalid_keywords):
            return False
        
        return True
    
    @staticmethod
    def normalize_skill(skill_name: str) -> str:
        """
        TC-CV-06: Normalize skill name to standard form
        
        Args:
            skill_name: Raw skill name
            
        Returns:
            Normalized skill name
        """
        skill_lower = skill_name.lower().strip()
        
        # Apply normalization map
        normalized = EnhancedCVExtractor.SKILL_NORMALIZATION_MAP.get(
            skill_lower, 
            skill_lower
        )
        
        return normalized
    
    @staticmethod
    def normalize_skills_list(skills: List[Dict]) -> List[Dict]:
        """
        TC-CV-06: Normalize a list of skills
        
        Args:
            skills: List of skill dicts
            
        Returns:
            List of normalized skills (deduplicated)
        """
        normalized_dict = {}
        
        for skill in skills:
            skill_name = skill.get('name', '').strip()
            if not skill_name:
                continue
            
            # Normalize
            normalized_name = EnhancedCVExtractor.normalize_skill(skill_name)
            
            # Deduplicate
            if normalized_name not in normalized_dict:
                normalized_dict[normalized_name] = {
                    'name': normalized_name.title(),
                    'category': skill.get('category', 'Other'),
                    'source': skill.get('source', 'cv'),
                    'context': skill.get('context', '')
                }
            else:
                # Merge sources if duplicate
                existing = normalized_dict[normalized_name]
                if existing['source'] != skill.get('source'):
                    existing['source'] = 'multiple'
        
        return list(normalized_dict.values())
    
    @staticmethod
    def extract_experience_info(text: str) -> List[Dict]:
        """
        TC-CV-07: Extract work experience information
        
        Args:
            text: CV text
            
        Returns:
            List of experience entries with dates, titles, companies
        """
        experiences = []
        
        # Find experience section
        experience_section = EnhancedCVExtractor._extract_section(
            text, 
            ['experience', 'work experience', 'employment', 'work history']
        )
        
        if not experience_section:
            return experiences
        
        # Split into individual job entries
        # Look for patterns like "Job Title\nCompany | Date"
        job_pattern = r'([A-Z][A-Za-z\s]+(?:Engineer|Developer|Designer|Manager|Analyst|Specialist|Consultant|Architect|Lead|Director))\s*\n?\s*([A-Z][A-Za-z\s&.,]+)\s*[|\-]\s*([A-Za-z0-9\s,\-/]+(?:Present|Current|Now)?)'
        
        matches = re.finditer(job_pattern, experience_section, re.MULTILINE)
        
        for match in matches:
            title = match.group(1).strip()
            company = match.group(2).strip()
            date_range = match.group(3).strip()
            
            # Parse dates
            start_date, end_date = EnhancedCVExtractor._parse_date_range(date_range)
            
            # Calculate duration
            duration_months = EnhancedCVExtractor._calculate_duration(start_date, end_date)
            
            experiences.append({
                'title': title,
                'company': company,
                'date_range': date_range,
                'start_date': start_date,
                'end_date': end_date,
                'duration_months': duration_months,
                'duration_years': round(duration_months / 12, 1) if duration_months else 0
            })
        
        return experiences
    
    @staticmethod
    def calculate_total_experience(experiences: List[Dict]) -> float:
        """
        TC-CV-07: Calculate total years of experience
        
        Args:
            experiences: List of experience entries
            
        Returns:
            Total years of experience
        """
        total_months = sum(exp.get('duration_months', 0) for exp in experiences)
        return round(total_months / 12, 1)
    
    @staticmethod
    def _extract_section(text: str, section_keywords: List[str]) -> str:
        """Extract a specific section from CV"""
        text_lower = text.lower()
        
        for keyword in section_keywords:
            # Find section start
            pattern = rf'\b{keyword}\b'
            match = re.search(pattern, text_lower)
            
            if match:
                start_pos = match.start()
                
                # Find next section (or end of text)
                next_section_keywords = [
                    'education', 'skills', 'projects', 'certifications',
                    'awards', 'publications', 'references'
                ]
                
                end_pos = len(text)
                for next_keyword in next_section_keywords:
                    next_pattern = rf'\b{next_keyword}\b'
                    next_match = re.search(next_pattern, text_lower[start_pos + 50:])
                    if next_match:
                        potential_end = start_pos + 50 + next_match.start()
                        if potential_end < end_pos:
                            end_pos = potential_end
                
                return text[start_pos:end_pos]
        
        return ''
    
    @staticmethod
    def _parse_date_range(date_str: str) -> Tuple[Optional[str], Optional[str]]:
        """Parse date range string into start and end dates"""
        # Handle "Present", "Current", "Now"
        date_str_clean = date_str.replace('Present', '2024').replace('Current', '2024').replace('Now', '2024')
        
        # Split by common separators
        separators = [' - ', ' to ', ' – ', '–', '-']
        parts = None
        
        for sep in separators:
            if sep in date_str_clean:
                parts = date_str_clean.split(sep, 1)
                break
        
        if not parts or len(parts) != 2:
            return None, None
        
        start_str, end_str = parts
        
        # Parse dates
        start_date = EnhancedCVExtractor._parse_single_date(start_str.strip())
        end_date = EnhancedCVExtractor._parse_single_date(end_str.strip())
        
        return start_date, end_date
    
    @staticmethod
    def _parse_single_date(date_str: str) -> Optional[str]:
        """Parse a single date string"""
        try:
            # Try various formats
            formats = [
                '%B %Y',  # January 2020
                '%b %Y',  # Jan 2020
                '%m/%Y',  # 01/2020
                '%Y-%m',  # 2020-01
                '%Y',     # 2020
            ]
            
            for fmt in formats:
                try:
                    dt = datetime.strptime(date_str.strip(), fmt)
                    return dt.strftime('%Y-%m')
                except ValueError:
                    continue
            
            # Try dateutil parser as fallback
            dt = date_parser.parse(date_str, fuzzy=True)
            return dt.strftime('%Y-%m')
            
        except Exception:
            return None
    
    @staticmethod
    def _calculate_duration(start_date: Optional[str], end_date: Optional[str]) -> int:
        """Calculate duration in months between two dates"""
        if not start_date or not end_date:
            return 0
        
        try:
            start = datetime.strptime(start_date, '%Y-%m')
            end = datetime.strptime(end_date, '%Y-%m')
            
            months = (end.year - start.year) * 12 + (end.month - start.month)
            return max(0, months)
        except Exception:
            return 0
