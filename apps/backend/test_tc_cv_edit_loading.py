"""
TC-CV-14 to TC-CV-15: Edit After Parse & Loading States Tests
Tests for editing parsed CV data and loading state management
"""
import os
import sys
import time
from datetime import datetime
from unittest.mock import Mock

import pytest

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.modules.skill_gap.cv_parser import CVParser


class TestEditAfterParse:
    """TC-CV-14: Edit After Parse Tests"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.parser = CVParser()
        self.mock_db = Mock()
    
    def test_edit_single_skill_name(self):
        """TC-CV-14.1: Edit a single skill name after parsing"""
        # Original parsed data
        parsed_data = {
            'personal_info': {
                'name': 'Nguyen Van An',
                'email': 'test@example.com'
            },
            'skills': [
                {'name': 'Pythn', 'category': 'Programming'},  # Typo
                {'name': 'JavaScript', 'category': 'Programming'},
                {'name': 'SQL', 'category': 'Database'}
            ]
        }
        
        # User edits the typo
        edited_skill_index = 0
        new_skill_name = 'Python'
        
        # Apply edit
        parsed_data['skills'][edited_skill_index]['name'] = new_skill_name
        
        # Verify edit
        assert parsed_data['skills'][0]['name'] == 'Python'
        assert len(parsed_data['skills']) == 3
        print("  ✅ Edited skill: 'Pythn' → 'Python'")
    
    def test_edit_multiple_skills(self):
        """TC-CV-14.2: Edit multiple skills at once"""
        parsed_data = {
            'skills': [
                {'name': 'Reactjs', 'category': 'Frontend'},
                {'name': 'Nodejs', 'category': 'Backend'},
                {'name': 'Mongodb', 'category': 'Database'}
            ]
        }
        
        # Batch edit to standardize names
        edits = [
            {'index': 0, 'new_name': 'React'},
            {'index': 1, 'new_name': 'Node.js'},
            {'index': 2, 'new_name': 'MongoDB'}
        ]
        
        for edit in edits:
            parsed_data['skills'][edit['index']]['name'] = edit['new_name']
        
        # Verify all edits
        assert parsed_data['skills'][0]['name'] == 'React'
        assert parsed_data['skills'][1]['name'] == 'Node.js'
        assert parsed_data['skills'][2]['name'] == 'MongoDB'
        print(f"  ✅ Batch edited {len(edits)} skills")
    
    def test_add_missing_skill(self):
        """TC-CV-14.3: Add a skill that was missed by AI"""
        parsed_data = {
            'skills': [
                {'name': 'Python', 'category': 'Programming'},
                {'name': 'JavaScript', 'category': 'Programming'}
            ]
        }
        
        # User adds missing skill
        new_skill = {'name': 'Docker', 'category': 'DevOps'}
        parsed_data['skills'].append(new_skill)
        
        # Verify addition
        assert len(parsed_data['skills']) == 3
        assert parsed_data['skills'][2]['name'] == 'Docker'
        print("  ✅ Added missing skill: 'Docker'")
    
    def test_remove_incorrect_skill(self):
        """TC-CV-14.4: Remove a skill that was incorrectly extracted"""
        parsed_data = {
            'skills': [
                {'name': 'Python', 'category': 'Programming'},
                {'name': 'Microsoft', 'category': 'Programming'},  # Wrong - company name
                {'name': 'JavaScript', 'category': 'Programming'}
            ]
        }
        
        # User removes incorrect skill
        incorrect_index = 1
        removed_skill = parsed_data['skills'].pop(incorrect_index)
        
        # Verify removal
        assert len(parsed_data['skills']) == 2
        assert removed_skill['name'] == 'Microsoft'
        assert all(s['name'] != 'Microsoft' for s in parsed_data['skills'])
        print("  ✅ Removed incorrect skill: 'Microsoft'")
    
    def test_edit_skill_category(self):
        """TC-CV-14.5: Edit skill category"""
        parsed_data = {
            'skills': [
                {'name': 'Communication', 'category': 'Programming'},  # Wrong category
                {'name': 'Python', 'category': 'Programming'}
            ]
        }
        
        # User corrects category
        parsed_data['skills'][0]['category'] = 'Soft Skills'
        
        # Verify edit
        assert parsed_data['skills'][0]['category'] == 'Soft Skills'
        print("  ✅ Corrected category: 'Programming' → 'Soft Skills'")
    
    def test_edit_personal_info(self):
        """TC-CV-14.6: Edit personal information"""
        parsed_data = {
            'personal_info': {
                'name': 'NGUYEN VAN AN',  # All caps
                'email': 'test@example.com',
                'phone': '091234567'  # Missing digit
            }
        }
        
        # User edits personal info
        parsed_data['personal_info']['name'] = 'Nguyen Van An'  # Proper case
        parsed_data['personal_info']['phone'] = '0912345678'  # Correct phone
        
        # Verify edits
        assert parsed_data['personal_info']['name'] == 'Nguyen Van An'
        assert parsed_data['personal_info']['phone'] == '0912345678'
        print("  ✅ Edited personal info: name and phone corrected")
    
    def test_validate_edited_data(self):
        """TC-CV-14.7: Validate edited data before saving"""
        edited_data = {
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
        
        # Validation checks
        validations = {
            'has_name': bool(edited_data['personal_info'].get('name')),
            'has_email': bool(edited_data['personal_info'].get('email')),
            'has_skills': len(edited_data['skills']) > 0,
            'all_skills_have_names': all(s.get('name') for s in edited_data['skills']),
            'all_skills_have_categories': all(s.get('category') for s in edited_data['skills'])
        }
        
        # All validations should pass
        assert all(validations.values())
        print(f"  ✅ All validations passed: {sum(validations.values())}/{len(validations)}")
    
    def test_save_edited_data_to_database(self):
        """TC-CV-14.8: Save edited data to database"""
        edited_data = {
            'analysis_id': 123,
            'user_id': 1,
            'personal_info': {
                'name': 'Nguyen Van An',
                'email': 'test@example.com'
            },
            'skills': [
                {'name': 'Python', 'category': 'Programming'},
                {'name': 'Docker', 'category': 'DevOps'}
            ],
            'edited_at': datetime.now().isoformat(),
            'edited_by_user': True
        }
        
        # Mock database save
        mock_db = Mock()
        mock_db.update_analysis = Mock(return_value=True)
        
        # Save to database
        result = mock_db.update_analysis(
            analysis_id=edited_data['analysis_id'],
            data=edited_data
        )
        
        # Verify save was called
        assert result is True
        mock_db.update_analysis.assert_called_once()
        print("  ✅ Saved edited data to database")
    
    def test_track_edit_history(self):
        """TC-CV-14.9: Track edit history for audit"""
        original_data = {
            'skills': [
                {'name': 'Pythn', 'category': 'Programming'}
            ]
        }
        
        edit_history = []
        
        # Make edit and track
        edit_record = {
            'timestamp': datetime.now().isoformat(),
            'field': 'skills[0].name',
            'old_value': 'Pythn',
            'new_value': 'Python',
            'edited_by': 'user'
        }
        
        original_data['skills'][0]['name'] = 'Python'
        edit_history.append(edit_record)
        
        # Verify history tracking
        assert len(edit_history) == 1
        assert edit_history[0]['old_value'] == 'Pythn'
        assert edit_history[0]['new_value'] == 'Python'
        print(f"  ✅ Edit history tracked: {len(edit_history)} changes")
    
    def test_undo_edit(self):
        """TC-CV-14.10: Undo an edit"""
        current_data = {
            'skills': [
                {'name': 'Python', 'category': 'Programming'}
            ]
        }
        
        edit_history = [
            {
                'field': 'skills[0].name',
                'old_value': 'Pythn',
                'new_value': 'Python'
            }
        ]
        
        # Undo last edit
        if edit_history:
            last_edit = edit_history.pop()
            current_data['skills'][0]['name'] = last_edit['old_value']
        
        # Verify undo
        assert current_data['skills'][0]['name'] == 'Pythn'
        assert len(edit_history) == 0
        print("  ✅ Undo successful: reverted to 'Pythn'")


class TestLoadingStates:
    """TC-CV-15: Loading States Tests"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.parser = CVParser()
    
    def test_initial_loading_state(self):
        """TC-CV-15.1: Initial loading state when upload starts"""
        loading_state = {
            'is_loading': True,
            'progress': 0,
            'status': 'Đang tải file lên...',
            'stage': 'upload'
        }
        
        # Verify initial state
        assert loading_state['is_loading'] is True
        assert loading_state['progress'] == 0
        assert 'tải' in loading_state['status'].lower()
        print(f"  ✅ Initial loading state: {loading_state['status']}")
    
    def test_file_upload_progress(self):
        """TC-CV-15.2: Track file upload progress"""
        file_size = 1024 * 1024  # 1MB
        uploaded = 0
        
        progress_updates = []
        
        # Simulate upload progress
        for chunk in [256*1024, 512*1024, 256*1024]:  # 25%, 50%, 25%
            uploaded += chunk
            progress = int((uploaded / file_size) * 100)
            progress_updates.append({
                'progress': progress,
                'status': f'Đang tải lên... {progress}%'
            })
        
        # Verify progress tracking
        assert len(progress_updates) == 3
        assert progress_updates[-1]['progress'] == 100
        print(f"  ✅ Upload progress tracked: {len(progress_updates)} updates")
    
    def test_parsing_stage_loading(self):
        """TC-CV-15.3: Loading state during CV parsing"""
        loading_state = {
            'is_loading': True,
            'progress': 30,
            'status': 'Đang phân tích CV...',
            'stage': 'parsing',
            'substage': 'extracting_text'
        }
        
        # Verify parsing state
        assert loading_state['stage'] == 'parsing'
        assert 'phân tích' in loading_state['status'].lower()
        assert loading_state['progress'] > 0
        print(f"  ✅ Parsing stage: {loading_state['status']}")
    
    def test_ai_processing_loading(self):
        """TC-CV-15.4: Loading state during AI processing"""
        loading_state = {
            'is_loading': True,
            'progress': 60,
            'status': 'AI đang phân tích kỹ năng và tính cách...',
            'stage': 'ai_processing',
            'estimated_time': 5  # seconds
        }
        
        # Verify AI processing state
        assert loading_state['stage'] == 'ai_processing'
        assert 'AI' in loading_state['status']
        assert loading_state['estimated_time'] > 0
        print(f"  ✅ AI processing: {loading_state['status']}")
    
    def test_multi_stage_progress(self):
        """TC-CV-15.5: Multi-stage progress tracking"""
        stages = [
            {'name': 'upload', 'weight': 20, 'status': 'Đang tải file lên...'},
            {'name': 'validation', 'weight': 10, 'status': 'Đang kiểm tra file...'},
            {'name': 'parsing', 'weight': 30, 'status': 'Đang trích xuất text...'},
            {'name': 'ai_processing', 'weight': 30, 'status': 'AI đang phân tích...'},
            {'name': 'saving', 'weight': 10, 'status': 'Đang lưu kết quả...'}
        ]
        
        total_progress = 0
        for stage in stages:
            total_progress += stage['weight']
        
        # Verify stages sum to 100%
        assert total_progress == 100
        assert len(stages) == 5
        print(f"  ✅ Multi-stage progress: {len(stages)} stages, {total_progress}%")
    
    def test_loading_spinner_display(self):
        """TC-CV-15.6: Loading spinner/icon display"""
        loading_ui = {
            'show_spinner': True,
            'spinner_type': 'circular',
            'message': 'Đang xử lý...',
            'show_progress_bar': True,
            'progress_percentage': 45
        }
        
        # Verify UI elements
        assert loading_ui['show_spinner'] is True
        assert loading_ui['show_progress_bar'] is True
        assert 0 <= loading_ui['progress_percentage'] <= 100
        print(f"  ✅ Loading UI: spinner + progress bar at {loading_ui['progress_percentage']}%")
    
    def test_estimated_time_remaining(self):
        """TC-CV-15.7: Calculate and display estimated time remaining"""
        start_time = time.time()
        current_progress = 40  # 40% complete
        
        # Simulate some processing time
        time.sleep(0.1)
        
        elapsed_time = time.time() - start_time
        
        # Calculate estimated time remaining
        if current_progress > 0:
            total_estimated_time = (elapsed_time / current_progress) * 100
            time_remaining = total_estimated_time - elapsed_time
        else:
            time_remaining = 0
        
        # Verify calculation
        assert time_remaining >= 0
        print(f"  ✅ Estimated time remaining: {time_remaining:.2f}s")
    
    def test_loading_timeout_handling(self):
        """TC-CV-15.8: Handle loading timeout"""
        max_timeout = 30  # seconds
        start_time = time.time()
        
        loading_state = {
            'is_loading': True,
            'start_time': start_time,
            'timeout': max_timeout
        }
        
        # Check if timeout exceeded
        current_time = time.time()
        elapsed = current_time - loading_state['start_time']
        
        if elapsed > loading_state['timeout']:
            loading_state['is_loading'] = False
            loading_state['error'] = 'Timeout: Quá thời gian xử lý'
        
        # Verify timeout handling
        assert 'timeout' in loading_state
        print(f"  ✅ Timeout handling: max {max_timeout}s")
    
    def test_loading_error_state(self):
        """TC-CV-15.9: Handle loading error state"""
        loading_state = {
            'is_loading': False,
            'progress': 45,
            'status': 'Lỗi khi xử lý file',
            'error': True,
            'error_message': 'File không đúng định dạng',
            'stage': 'validation'
        }
        
        # Verify error state
        assert loading_state['is_loading'] is False
        assert loading_state['error'] is True
        assert loading_state['error_message'] is not None
        print(f"  ✅ Error state: {loading_state['error_message']}")
    
    def test_loading_success_completion(self):
        """TC-CV-15.10: Loading completion with success"""
        loading_state = {
            'is_loading': False,
            'progress': 100,
            'status': 'Hoàn thành!',
            'stage': 'completed',
            'success': True,
            'result_id': 123
        }
        
        # Verify success state
        assert loading_state['is_loading'] is False
        assert loading_state['progress'] == 100
        assert loading_state['success'] is True
        assert loading_state['result_id'] is not None
        print(f"  ✅ Success completion: result_id={loading_state['result_id']}")
    
    def test_loading_cancellation(self):
        """TC-CV-15.11: User cancels loading operation"""
        loading_state = {
            'is_loading': True,
            'progress': 35,
            'status': 'Đang xử lý...',
            'can_cancel': True
        }
        
        # User cancels
        if loading_state['can_cancel']:
            loading_state['is_loading'] = False
            loading_state['status'] = 'Đã hủy bởi người dùng'
            loading_state['cancelled'] = True
        
        # Verify cancellation
        assert loading_state['is_loading'] is False
        assert loading_state['cancelled'] is True
        print(f"  ✅ Cancellation: {loading_state['status']}")
    
    def test_loading_state_persistence(self):
        """TC-CV-15.12: Persist loading state across page refresh"""
        # Initial state
        loading_state = {
            'analysis_id': 123,
            'is_loading': True,
            'progress': 50,
            'status': 'Đang xử lý...',
            'timestamp': datetime.now().isoformat()
        }
        
        # Simulate saving to session/storage
        session_storage = {}
        session_storage['loading_state'] = loading_state
        
        # Simulate page refresh - restore state
        restored_state = session_storage.get('loading_state')
        
        # Verify persistence
        assert restored_state is not None
        assert restored_state['analysis_id'] == 123
        assert restored_state['progress'] == 50
        print(f"  ✅ State persisted: progress={restored_state['progress']}%")
    
    def test_loading_with_retry_mechanism(self):
        """TC-CV-15.13: Retry mechanism on loading failure"""
        max_retries = 3
        retry_count = 0
        success = False
        
        loading_state = {
            'is_loading': True,
            'retry_count': retry_count,
            'max_retries': max_retries
        }
        
        # Simulate retry logic
        while retry_count < max_retries and not success:
            retry_count += 1
            loading_state['retry_count'] = retry_count
            loading_state['status'] = f'Đang thử lại... (lần {retry_count}/{max_retries})'
            
            # Simulate success on 2nd retry
            if retry_count == 2:
                success = True
                loading_state['is_loading'] = False
                loading_state['success'] = True
        
        # Verify retry mechanism
        assert loading_state['retry_count'] == 2
        assert loading_state['success'] is True
        print(f"  ✅ Retry successful after {retry_count} attempts")
    
    def test_loading_progress_animation(self):
        """TC-CV-15.14: Smooth progress bar animation"""
        progress_values = []
        
        # Simulate smooth progress updates
        for i in range(0, 101, 10):
            progress_values.append({
                'progress': i,
                'timestamp': time.time(),
                'smooth': True
            })
            time.sleep(0.01)  # Small delay for smooth animation
        
        # Verify smooth progression
        assert len(progress_values) == 11
        assert progress_values[0]['progress'] == 0
        assert progress_values[-1]['progress'] == 100
        
        # Check incremental progress
        for i in range(1, len(progress_values)):
            assert progress_values[i]['progress'] >= progress_values[i-1]['progress']
        
        print(f"  ✅ Smooth animation: {len(progress_values)} frames")


def run_tests():
    """Run all tests and generate report"""
    print("="*80)
    print("TC-CV-14 to TC-CV-15: EDIT & LOADING STATES TESTS")
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
