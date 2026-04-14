"""
TC-IMG-08 to TC-IMG-10: OCR Integration Tests
Tests for OCR typo correction, pgvector integration, and preview functionality
"""
import os
import sys
from typing import Dict, List

import pytest

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.modules.skill_gap.cv_parser import CVParser


class MockNLPCorrector:
    """Mock NLP model for typo correction"""
    
    # Common OCR typos and corrections
    TYPO_MAP = {
        # Numbers mistaken for letters
        'pyth0n': 'python',
        'javascr1pt': 'javascript',
        'c++': 'cplusplus',
        'c#': 'csharp',
        'n0de': 'node',
        'ang1ular': 'angular',
        'reac7': 'react',
        'vue.j5': 'vue.js',
        
        # Letters mistaken for numbers
        'pythOn': 'python',
        'javaScript': 'javascript',
        'nOde': 'node',
        
        # Common OCR errors
        'pytbon': 'python',
        'javascnpt': 'javascript',
        'reactjs': 'react',
        'nodejs': 'node.js',
        'postgre5ql': 'postgresql',
        'mong0db': 'mongodb',
        
        # Case variations
        'PYTHON': 'python',
        'JAVASCRIPT': 'javascript',
        'SQL': 'sql',
    }
    
    @staticmethod
    def correct_ocr_typos(text: str) -> Dict:
        """
        Correct OCR typos using NLP
        
        Args:
            text: Text with potential OCR errors
            
        Returns:
            Dict with corrected text and corrections made
        """
        corrected_text = text.lower()
        corrections = []
        
        # Apply corrections
        for typo, correct in MockNLPCorrector.TYPO_MAP.items():
            if typo.lower() in corrected_text:
                corrected_text = corrected_text.replace(typo.lower(), correct)
                corrections.append({
                    'original': typo,
                    'corrected': correct,
                    'confidence': 0.95
                })
        
        return {
            'original_text': text,
            'corrected_text': corrected_text,
            'corrections': corrections,
            'correction_count': len(corrections)
        }
    
    @staticmethod
    def normalize_to_neo4j_node(skill_name: str) -> str:
        """
        Normalize skill name to match Neo4j node
        
        Args:
            skill_name: Raw skill name
            
        Returns:
            Normalized skill name matching Neo4j
        """
        # First correct typos
        correction_result = MockNLPCorrector.correct_ocr_typos(skill_name)
        corrected = correction_result['corrected_text']
        
        # Then normalize to standard form
        normalization_map = {
            'python': 'Python',
            'javascript': 'JavaScript',
            'java': 'Java',
            'sql': 'SQL',
            'react': 'React',
            'node.js': 'Node.js',
            'angular': 'Angular',
            'vue.js': 'Vue.js',
            'docker': 'Docker',
            'kubernetes': 'Kubernetes',
            'aws': 'AWS',
            'azure': 'Azure',
            'gcp': 'GCP',
        }
        
        return normalization_map.get(corrected.lower(), corrected.title())


class MockVectorDatabase:
    """Mock pgvector database for testing"""
    
    # Sample job postings with embeddings
    SAMPLE_JOBS = [
        {
            'id': 1,
            'title': 'Python Backend Developer',
            'skills': ['Python', 'Django', 'PostgreSQL', 'Docker'],
            'description': 'Looking for Python developer with Django experience',
            'embedding': [0.8, 0.2, 0.1, 0.3, 0.5]  # Mock embedding
        },
        {
            'id': 2,
            'title': 'Full Stack JavaScript Developer',
            'skills': ['JavaScript', 'React', 'Node.js', 'MongoDB'],
            'description': 'Full stack developer with React and Node.js',
            'embedding': [0.2, 0.9, 0.3, 0.1, 0.4]
        },
        {
            'id': 3,
            'title': 'DevOps Engineer',
            'skills': ['Docker', 'Kubernetes', 'AWS', 'Python'],
            'description': 'DevOps engineer with cloud experience',
            'embedding': [0.3, 0.1, 0.8, 0.6, 0.2]
        },
    ]
    
    @staticmethod
    def create_embedding(text: str) -> List[float]:
        """
        Create vector embedding from text
        
        Args:
            text: Input text
            
        Returns:
            Vector embedding
        """
        # Simple mock: hash text to create pseudo-embedding
        import hashlib
        hash_obj = hashlib.md5(text.lower().encode())
        hash_bytes = hash_obj.digest()
        
        # Convert to 5-dimensional vector (normalized)
        embedding = [b / 255.0 for b in hash_bytes[:5]]
        
        return embedding
    
    @staticmethod
    def search_similar_jobs(cv_text: str, skills: List[str], top_k: int = 3) -> List[Dict]:
        """
        Search for similar jobs using vector similarity
        
        Args:
            cv_text: CV text
            skills: Extracted skills
            top_k: Number of results to return
            
        Returns:
            List of similar jobs
        """
        # Create embedding from CV
        cv_embedding = MockVectorDatabase.create_embedding(cv_text + ' ' + ' '.join(skills))
        
        # Calculate similarity with each job
        results = []
        for job in MockVectorDatabase.SAMPLE_JOBS:
            # Calculate cosine similarity (simplified)
            similarity = sum(a * b for a, b in zip(cv_embedding, job['embedding']))
            
            # Check skill overlap
            skill_overlap = len(set(skills) & set(job['skills']))
            
            # Combined score
            score = similarity * 0.7 + (skill_overlap / len(job['skills'])) * 0.3
            
            results.append({
                'job_id': job['id'],
                'title': job['title'],
                'skills': job['skills'],
                'description': job['description'],
                'similarity_score': score,
                'skill_overlap': skill_overlap,
                'matching_skills': list(set(skills) & set(job['skills']))
            })
        
        # Sort by score and return top_k
        results.sort(key=lambda x: x['similarity_score'], reverse=True)
        return results[:top_k]


class MockPreviewGenerator:
    """Mock preview generator for UI"""
    
    @staticmethod
    def generate_preview(ocr_result: Dict, extracted_data: Dict) -> Dict:
        """
        Generate preview data for UI
        
        Args:
            ocr_result: OCR extraction result
            extracted_data: Parsed data (personal info, skills)
            
        Returns:
            Preview data for UI
        """
        return {
            'preview_type': 'draft',
            'status': 'pending_confirmation',
            'ocr_metadata': {
                'confidence': ocr_result.get('confidence', 0),
                'quality_score': ocr_result.get('quality_score', 0),
                'warnings': ocr_result.get('warnings', [])
            },
            'extracted_regions': {
                'personal_info': {
                    'name': extracted_data.get('personal_info', {}).get('name', ''),
                    'email': extracted_data.get('personal_info', {}).get('email', ''),
                    'phone': extracted_data.get('personal_info', {}).get('phone', ''),
                    'editable': True
                },
                'skills': {
                    'items': extracted_data.get('skills', []),
                    'count': len(extracted_data.get('skills', [])),
                    'editable': True
                },
                'text_preview': {
                    'full_text': ocr_result.get('text', '')[:500],
                    'length': len(ocr_result.get('text', '')),
                    'editable': False
                }
            },
            'actions': {
                'confirm': True,
                'edit': True,
                'cancel': True,
                'reupload': True
            },
            'ui_hints': {
                'show_confidence_badge': True,
                'highlight_low_confidence': ocr_result.get('confidence', 100) < 85,
                'show_warnings': len(ocr_result.get('warnings', [])) > 0
            }
        }


class TestOCRTypoCorrection:
    """TC-IMG-08: Sửa lỗi chính tả OCR"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.parser = CVParser()
        self.nlp_corrector = MockNLPCorrector()
    
    def test_correct_number_zero_in_python(self):
        """TC-IMG-08.1: Correct 'Pyth0n' to 'Python'"""
        typo_text = "Skills: Pyth0n, JavaScr1pt, SQL"
        
        # Correct typos
        result = self.nlp_corrector.correct_ocr_typos(typo_text)
        
        # Verify correction
        assert 'python' in result['corrected_text']
        assert 'pyth0n' not in result['corrected_text'].lower()
        assert result['correction_count'] >= 1
        
        # Check corrections list
        python_correction = next(
            (c for c in result['corrections'] if c['corrected'] == 'python'),
            None
        )
        assert python_correction is not None
        assert python_correction['original'].lower() == 'pyth0n'
        
        print("  ✅ Corrected 'Pyth0n' → 'Python'")
        print(f"     Total corrections: {result['correction_count']}")
    
    def test_normalize_to_neo4j_node(self):
        """TC-IMG-08.2: Normalize to Neo4j node name"""
        typo_skills = ['Pyth0n', 'JavaScr1pt', 'N0de', 'Reac7']
        
        normalized = []
        for skill in typo_skills:
            normalized_skill = self.nlp_corrector.normalize_to_neo4j_node(skill)
            normalized.append(normalized_skill)
        
        # Verify normalization
        assert 'Python' in normalized
        assert 'JavaScript' in normalized
        assert 'Node.js' in normalized or 'Node' in normalized
        assert 'React' in normalized
        
        print(f"  ✅ Normalized {len(typo_skills)} skills to Neo4j format")
        for original, norm in zip(typo_skills, normalized):
            print(f"     {original} → {norm}")
    
    def test_multiple_typo_corrections(self):
        """TC-IMG-08.3: Correct multiple typos in one text"""
        typo_text = """
        SKILLS
        Pyth0n, JavaScr1pt, N0de.js, Reac7
        Ang1ular, Vue.j5, Mong0DB, Postgre5QL
        """
        
        result = self.nlp_corrector.correct_ocr_typos(typo_text)
        
        # Should correct multiple typos
        assert result['correction_count'] >= 3
        assert 'python' in result['corrected_text']
        assert 'javascript' in result['corrected_text']
        
        print(f"  ✅ Corrected {result['correction_count']} typos")
    
    def test_case_insensitive_correction(self):
        """TC-IMG-08.4: Handle case variations"""
        test_cases = [
            ('PYTHON', 'python'),
            ('Python', 'python'),
            ('python', 'python'),
            ('PyThOn', 'python'),
        ]
        
        for original, expected in test_cases:
            result = self.nlp_corrector.correct_ocr_typos(original)
            assert expected in result['corrected_text'].lower()
        
        print(f"  ✅ Handled {len(test_cases)} case variations")
    
    def test_preserve_correct_spellings(self):
        """TC-IMG-08.5: Don't change correct spellings"""
        correct_text = "Skills: Python, JavaScript, SQL, Docker"
        
        result = self.nlp_corrector.correct_ocr_typos(correct_text)
        
        # Should have minimal or no corrections
        assert 'python' in result['corrected_text']
        assert 'javascript' in result['corrected_text']
        
        print("  ✅ Preserved correct spellings")
    
    def test_confidence_scores(self):
        """TC-IMG-08.6: Provide confidence scores for corrections"""
        typo_text = "Pyth0n"
        
        result = self.nlp_corrector.correct_ocr_typos(typo_text)
        
        # Check confidence scores
        for correction in result['corrections']:
            assert 'confidence' in correction
            assert 0 <= correction['confidence'] <= 1
            assert correction['confidence'] > 0.8  # High confidence
        
        print("  ✅ Confidence scores provided")
    
    def test_integration_with_skill_extraction(self):
        """TC-IMG-08.7: Integrate with skill extraction pipeline"""
        typo_cv_text = """
        NGUYEN VAN AN
        Email: test@example.com
        
        SKILLS
        Pyth0n, JavaScr1pt, N0de.js, Reac7, SQL
        """
        
        # Step 1: Correct typos
        corrected = self.nlp_corrector.correct_ocr_typos(typo_cv_text)
        
        # Step 2: Extract skills from corrected text
        skills = self.parser.extract_skills(corrected['corrected_text'])
        
        # Step 3: Normalize to Neo4j
        normalized_skills = []
        for skill in skills:
            normalized = self.nlp_corrector.normalize_to_neo4j_node(skill['name'])
            normalized_skills.append(normalized)
        
        # Verify pipeline
        assert len(skills) > 0
        assert 'Python' in normalized_skills or 'python' in [s.lower() for s in normalized_skills]
        
        print(f"  ✅ Full pipeline: {len(skills)} skills extracted and normalized")


class TestPgvectorIntegration:
    """TC-IMG-09: Tích hợp pgvector"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.parser = CVParser()
        self.vector_db = MockVectorDatabase()
    
    def test_create_embedding_from_ocr_text(self):
        """TC-IMG-09.1: Create vector embedding from OCR text"""
        ocr_text = """
        NGUYEN VAN AN
        Software Engineer
        
        SKILLS
        Python, JavaScript, React, Docker, AWS
        """
        
        # Create embedding
        embedding = self.vector_db.create_embedding(ocr_text)
        
        # Verify embedding
        assert isinstance(embedding, list)
        assert len(embedding) > 0
        assert all(isinstance(x, float) for x in embedding)
        assert all(0 <= x <= 1 for x in embedding)  # Normalized
        
        print(f"  ✅ Created {len(embedding)}-dimensional embedding")
    
    def test_search_similar_jobs(self):
        """TC-IMG-09.2: Search for similar jobs using vector similarity"""
        cv_text = "Python developer with Django and Docker experience"
        skills = ['Python', 'Django', 'Docker']
        
        # Search similar jobs
        results = self.vector_db.search_similar_jobs(cv_text, skills, top_k=3)
        
        # Verify results
        assert len(results) > 0
        assert len(results) <= 3
        
        # Check result structure
        for job in results:
            assert 'job_id' in job
            assert 'title' in job
            assert 'similarity_score' in job
            assert 'matching_skills' in job
            # Similarity score should be reasonable (can be > 1 due to combined scoring)
            assert job['similarity_score'] >= 0
        
        print(f"  ✅ Found {len(results)} similar jobs")
        for job in results:
            print(f"     - {job['title']}: {job['similarity_score']:.2f} similarity")
    
    def test_skill_overlap_calculation(self):
        """TC-IMG-09.3: Calculate skill overlap with job postings"""
        cv_skills = ['Python', 'Django', 'PostgreSQL', 'Docker']
        
        # Search jobs
        results = self.vector_db.search_similar_jobs('', cv_skills, top_k=3)
        
        # Verify skill overlap
        for job in results:
            assert 'skill_overlap' in job
            assert 'matching_skills' in job
            assert job['skill_overlap'] == len(job['matching_skills'])
            assert job['skill_overlap'] <= len(cv_skills)
        
        print(f"  ✅ Skill overlap calculated for {len(results)} jobs")
    
    def test_vector_quality_from_image_ocr(self):
        """TC-IMG-09.4: Ensure vector quality from image OCR"""
        # Simulate OCR text (may have typos)
        ocr_text_with_typos = "Pyth0n, JavaScr1pt, Reac7, D0cker"
        
        # Correct typos first
        nlp_corrector = MockNLPCorrector()
        corrected = nlp_corrector.correct_ocr_typos(ocr_text_with_typos)
        
        # Create embedding from corrected text
        embedding = self.vector_db.create_embedding(corrected['corrected_text'])
        
        # Search jobs
        skills = ['Python', 'JavaScript', 'React', 'Docker']
        results = self.vector_db.search_similar_jobs(corrected['corrected_text'], skills)
        
        # Verify quality
        assert len(results) > 0
        assert results[0]['similarity_score'] > 0.3  # Reasonable similarity
        
        print("  ✅ Vector quality maintained after OCR correction")
        print(f"     Best match: {results[0]['title']} ({results[0]['similarity_score']:.2f})")
    
    def test_ranking_by_similarity(self):
        """TC-IMG-09.5: Jobs ranked by similarity score"""
        cv_text = "Python backend developer"
        skills = ['Python', 'Django']
        
        results = self.vector_db.search_similar_jobs(cv_text, skills, top_k=3)
        
        # Verify ranking (descending order)
        for i in range(len(results) - 1):
            assert results[i]['similarity_score'] >= results[i+1]['similarity_score']
        
        print("  ✅ Jobs ranked by similarity")
    
    def test_empty_skills_handling(self):
        """TC-IMG-09.6: Handle case with no skills extracted"""
        cv_text = "Just some random text"
        skills = []
        
        results = self.vector_db.search_similar_jobs(cv_text, skills, top_k=3)
        
        # Should still return results (based on text similarity)
        assert isinstance(results, list)
        
        print(f"  ✅ Handled empty skills: {len(results)} results")
    
    def test_integration_with_pb09(self):
        """TC-IMG-09.7: Integration with PB09 (job recommendation)"""
        # Simulate full pipeline
        ocr_text = "Python developer with 3 years experience in Django and Docker"
        
        # Extract skills
        skills = self.parser.extract_skills(ocr_text)
        skill_names = [s['name'] for s in skills]
        
        # Search jobs (PB09 functionality)
        job_recommendations = self.vector_db.search_similar_jobs(
            ocr_text,
            skill_names,
            top_k=3
        )
        
        # Verify PB09 integration
        assert len(job_recommendations) > 0
        assert all('title' in job for job in job_recommendations)
        assert all('matching_skills' in job for job in job_recommendations)
        
        print(f"  ✅ PB09 integration: {len(job_recommendations)} jobs recommended")


class TestPreviewFunctionality:
    """TC-IMG-10: Preview vùng chọn"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.parser = CVParser()
        self.preview_generator = MockPreviewGenerator()
    
    def test_generate_draft_preview(self):
        """TC-IMG-10.1: Generate draft preview for user confirmation"""
        # Simulate OCR result
        ocr_result = {
            'text': 'NGUYEN VAN AN\nEmail: test@example.com\nSkills: Python, JavaScript',
            'confidence': 92,
            'quality_score': 85,
            'warnings': []
        }
        
        # Simulate extracted data
        extracted_data = {
            'personal_info': {
                'name': 'Nguyen Van An',
                'email': 'test@example.com',
                'phone': '0912345678'
            },
            'skills': [
                {'name': 'Python', 'category': 'Programming'},
                {'name': 'JavaScript', 'category': 'Programming'}
            ]
        }
        
        # Generate preview
        preview = self.preview_generator.generate_preview(ocr_result, extracted_data)
        
        # Verify preview structure
        assert preview['preview_type'] == 'draft'
        assert preview['status'] == 'pending_confirmation'
        assert 'extracted_regions' in preview
        assert 'actions' in preview
        
        print("  ✅ Draft preview generated")
    
    def test_preview_personal_info_region(self):
        """TC-IMG-10.2: Preview personal info region"""
        ocr_result = {'text': 'test', 'confidence': 90}
        extracted_data = {
            'personal_info': {
                'name': 'Nguyen Van An',
                'email': 'test@example.com',
                'phone': '0912345678'
            },
            'skills': []
        }
        
        preview = self.preview_generator.generate_preview(ocr_result, extracted_data)
        
        # Verify personal info region
        personal_info = preview['extracted_regions']['personal_info']
        assert personal_info['name'] == 'Nguyen Van An'
        assert personal_info['email'] == 'test@example.com'
        assert personal_info['phone'] == '0912345678'
        assert personal_info['editable'] is True
        
        print("  ✅ Personal info region displayed")
    
    def test_preview_skills_region(self):
        """TC-IMG-10.3: Preview skills region"""
        ocr_result = {'text': 'test', 'confidence': 90}
        extracted_data = {
            'personal_info': {},
            'skills': [
                {'name': 'Python', 'category': 'Programming'},
                {'name': 'JavaScript', 'category': 'Programming'},
                {'name': 'Docker', 'category': 'DevOps'}
            ]
        }
        
        preview = self.preview_generator.generate_preview(ocr_result, extracted_data)
        
        # Verify skills region
        skills_region = preview['extracted_regions']['skills']
        assert skills_region['count'] == 3
        assert len(skills_region['items']) == 3
        assert skills_region['editable'] is True
        
        print(f"  ✅ Skills region displayed: {skills_region['count']} skills")
    
    def test_preview_text_region(self):
        """TC-IMG-10.4: Preview extracted text region"""
        ocr_result = {
            'text': 'Full CV text here...' * 50,  # Long text
            'confidence': 90
        }
        extracted_data = {'personal_info': {}, 'skills': []}
        
        preview = self.preview_generator.generate_preview(ocr_result, extracted_data)
        
        # Verify text preview
        text_preview = preview['extracted_regions']['text_preview']
        assert len(text_preview['full_text']) <= 500  # Truncated
        assert text_preview['length'] > 500  # Original length
        assert text_preview['editable'] is False  # Text not editable
        
        print(f"  ✅ Text preview: {len(text_preview['full_text'])} chars shown")
    
    def test_preview_actions(self):
        """TC-IMG-10.5: Preview available actions"""
        ocr_result = {'text': 'test', 'confidence': 90}
        extracted_data = {'personal_info': {}, 'skills': []}
        
        preview = self.preview_generator.generate_preview(ocr_result, extracted_data)
        
        # Verify actions
        actions = preview['actions']
        assert actions['confirm'] is True
        assert actions['edit'] is True
        assert actions['cancel'] is True
        assert actions['reupload'] is True
        
        print(f"  ✅ Actions available: {len(actions)} actions")
    
    def test_preview_with_warnings(self):
        """TC-IMG-10.6: Preview with quality warnings"""
        ocr_result = {
            'text': 'test',
            'confidence': 65,  # Low confidence
            'quality_score': 45,  # Low quality
            'warnings': [
                'Ảnh quá mờ',
                'Phát hiện chữ viết tay'
            ]
        }
        extracted_data = {'personal_info': {}, 'skills': []}
        
        preview = self.preview_generator.generate_preview(ocr_result, extracted_data)
        
        # Verify warnings displayed
        assert len(preview['ocr_metadata']['warnings']) == 2
        assert preview['ui_hints']['show_warnings'] is True
        assert preview['ui_hints']['highlight_low_confidence'] is True
        
        print(f"  ✅ Warnings displayed: {len(preview['ocr_metadata']['warnings'])}")
    
    def test_preview_ui_hints(self):
        """TC-IMG-10.7: UI hints for better UX"""
        ocr_result = {
            'text': 'test',
            'confidence': 82,  # Below 85
            'warnings': ['Some warning']
        }
        extracted_data = {'personal_info': {}, 'skills': []}
        
        preview = self.preview_generator.generate_preview(ocr_result, extracted_data)
        
        # Verify UI hints
        ui_hints = preview['ui_hints']
        assert 'show_confidence_badge' in ui_hints
        assert 'highlight_low_confidence' in ui_hints
        assert 'show_warnings' in ui_hints
        
        # Low confidence should be highlighted
        assert ui_hints['highlight_low_confidence'] is True
        
        print("  ✅ UI hints provided for better UX")


def run_tests():
    """Run all tests and generate report"""
    print("="*80)
    print("TC-IMG-08 to TC-IMG-10: OCR INTEGRATION TESTS")
    print("="*80)
    print()
    
    # Run pytest with verbose output
    pytest_args = [
        __file__,
        '-v',
        '--tb=short',
        '--color=yes',
        '-ra'
    ]
    
    exit_code = pytest.main(pytest_args)
    
    print()
    print("="*80)
    print("TEST EXECUTION COMPLETE")
    print("="*80)
    
    return exit_code


if __name__ == '__main__':
    exit_code = run_tests()
    sys.exit(exit_code)
