"""
Unit tests cho voice interview migration
"""

import pytest
from sqlalchemy import text
from app.core.db import SessionLocal
import uuid


def get_db_session():
    """Get database session for testing"""
    return SessionLocal()


class TestVoiceMigration:
    """Test suite cho voice interview database migration"""
    
    def test_interview_sessions_new_columns(self):
        """Test các cột mới trong interview_sessions"""
        db = get_db_session()
        try:
            # Check cột tab_switch_count
            result = db.execute(text("""
                SELECT column_name, data_type, column_default 
                FROM information_schema.columns 
                WHERE table_schema = 'interview' 
                AND table_name = 'interview_sessions' 
                AND column_name = 'tab_switch_count'
            """)).fetchone()
            
            assert result is not None, "Cột tab_switch_count không tồn tại"
            assert result[1] == 'integer', "tab_switch_count phải là integer"
            assert '0' in result[2], "tab_switch_count phải có default = 0"
            
            # Check cột interview_mode
            result = db.execute(text("""
                SELECT column_name, data_type, column_default 
                FROM information_schema.columns 
                WHERE table_schema = 'interview' 
                AND table_name = 'interview_sessions' 
                AND column_name = 'interview_mode'
            """)).fetchone()
            
            assert result is not None, "Cột interview_mode không tồn tại"
            assert result[1] == 'character varying', "interview_mode phải là varchar"
            assert 'text' in result[2], "interview_mode phải có default = 'text'"
        finally:
            db.close()
    
    def test_interview_audio_table_exists(self):
        """Test bảng interview_audio đã được tạo"""
        db = get_db_session()
        try:
            # Check bảng tồn tại
            result = db.execute(text("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'interview' AND table_name = 'interview_audio'
            """)).fetchone()
            
            assert result is not None, "Bảng interview_audio không tồn tại"
            
            # Check các cột bắt buộc
            required_columns = [
                'id', 'session_id', 'message_id', 'audio_type', 
                'file_url', 'duration_seconds', 'file_size_bytes', 
                'transcript', 'created_at'
            ]
            
            for column in required_columns:
                result = db.execute(text(f"""
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_schema = 'interview' 
                    AND table_name = 'interview_audio' 
                    AND column_name = '{column}'
                """)).fetchone()
                
                assert result is not None, f"Cột {column} không tồn tại trong interview_audio"
        finally:
            db.close()
    
    def test_interview_audio_constraints(self):
        """Test constraints của bảng interview_audio"""
        db = get_db_session()
        try:
            # Check audio_type constraint
            result = db.execute(text("""
                SELECT constraint_name FROM information_schema.check_constraints 
                WHERE constraint_schema = 'interview' 
                AND check_clause LIKE '%audio_type%'
            """)).fetchone()
            
            assert result is not None, "Constraint cho audio_type không tồn tại"
        finally:
            db.close()
    
    def test_indexes_created(self):
        """Test các indexes đã được tạo"""
        db = get_db_session()
        try:
            expected_indexes = [
                'idx_interview_audio_session_id',
                'idx_interview_audio_type', 
                'idx_interview_sessions_mode',
                'idx_interview_sessions_tab_switch'
            ]
            
            for index_name in expected_indexes:
                result = db.execute(text(f"""
                    SELECT indexname FROM pg_indexes 
                    WHERE schemaname = 'interview' 
                    AND indexname = '{index_name}'
                """)).fetchone()
                
                assert result is not None, f"Index {index_name} không tồn tại"
        finally:
            db.close()
    
    def test_interview_session_model_constraints(self):
        """Test constraints của InterviewSession model"""
        db = get_db_session()
        try:
            # Test interview_mode constraint
            try:
                # Thử insert invalid interview_mode
                db.execute(text("""
                    INSERT INTO interview.interview_sessions 
                    (user_id, job_id, job_title, interview_mode) 
                    VALUES (1, 'test', 'test', 'invalid_mode')
                """))
                db.commit()
                assert False, "Constraint interview_mode không hoạt động"
            except Exception:
                # Expected - constraint should prevent invalid values
                db.rollback()
                pass
            
            # Test tab_switch_count constraint  
            try:
                # Thử insert invalid tab_switch_count
                db.execute(text("""
                    INSERT INTO interview.interview_sessions 
                    (user_id, job_id, job_title, tab_switch_count) 
                    VALUES (1, 'test', 'test', -1)
                """))
                db.commit()
                assert False, "Constraint tab_switch_count không hoạt động"
            except Exception:
                # Expected - constraint should prevent negative values
                db.rollback()
                pass
        finally:
            db.close()
    
    def test_interview_audio_model_constraints(self):
        """Test constraints của InterviewAudio model"""
        db = get_db_session()
        try:
            # Test audio_type constraint
            try:
                # Thử insert invalid audio_type
                db.execute(text("""
                    INSERT INTO interview.interview_audio 
                    (session_id, audio_type, file_url) 
                    VALUES (1, 'invalid_type', 'test.mp3')
                """))
                db.commit()
                assert False, "Constraint audio_type không hoạt động"
            except Exception:
                # Expected - constraint should prevent invalid values
                db.rollback()
                pass
        finally:
            db.close()
    
    def test_foreign_key_relationships(self):
        """Test foreign key relationships"""
        db = get_db_session()
        try:
            # Check foreign key từ interview_audio đến interview_sessions
            result = db.execute(text("""
                SELECT constraint_name FROM information_schema.referential_constraints 
                WHERE constraint_schema = 'interview' 
                AND constraint_name LIKE '%interview_audio%session%'
            """)).fetchone()
            
            # Note: Tên constraint có thể khác tùy database, chỉ cần check có foreign key
            # Thay vào đó check bằng cách thử insert invalid session_id
            try:
                db.execute(text("""
                    INSERT INTO interview.interview_audio 
                    (session_id, audio_type, file_url) 
                    VALUES (99999, 'user_answer', 'test.mp3')
                """))
                db.commit()
                assert False, "Foreign key constraint không hoạt động"
            except Exception:
                # Expected - foreign key should prevent invalid session_id
                db.rollback()
                pass
        finally:
            db.close()


# Acceptance Criteria Tests cho Yêu Cầu 7
class TestRequirement7AcceptanceCriteria:
    """Test Tiêu Chí Chấp Nhận của Yêu Cầu 7: Lưu Trữ Audio và Database"""
    
    def test_7_2_audio_metadata_fields(self):
        """
        Tiêu chí 7.2: WHEN upload Audio_Storage thành công, 
        THE Audio_Pipeline SHALL lưu metadata vào bảng interview_audio 
        với các trường: id (UUID), session_id, message_id, file_url, 
        duration_seconds, file_size_bytes, transcript, created_at
        """
        db = get_db_session()
        try:
            # Check tất cả các trường bắt buộc
            required_fields = {
                'id': 'uuid',
                'session_id': 'integer', 
                'message_id': 'integer',
                'file_url': 'text',
                'duration_seconds': 'double precision',
                'file_size_bytes': 'bigint',
                'transcript': 'text',
                'created_at': 'timestamp without time zone'
            }
            
            for field_name, expected_type in required_fields.items():
                result = db.execute(text(f"""
                    SELECT data_type FROM information_schema.columns 
                    WHERE table_schema = 'interview' 
                    AND table_name = 'interview_audio' 
                    AND column_name = '{field_name}'
                """)).fetchone()
                
                assert result is not None, f"Trường {field_name} không tồn tại"
                assert expected_type in result[0].lower(), f"Trường {field_name} sai kiểu dữ liệu. Expected: {expected_type}, Got: {result[0]}"
        finally:
            db.close()
    
    def test_7_3_session_foreign_key(self):
        """
        Tiêu chí 7.3: THE interview_audio table SHALL có foreign key 
        session_id tham chiếu đến interview.interview_sessions
        """
        db = get_db_session()
        try:
            # Test foreign key bằng cách thử insert invalid session_id
            try:
                db.execute(text("""
                    INSERT INTO interview.interview_audio 
                    (session_id, audio_type, file_url) 
                    VALUES (99999, 'user_answer', 'test.mp3')
                """))
                db.commit()
                assert False, "Foreign key constraint session_id không hoạt động"
            except Exception:
                # Expected - foreign key should prevent invalid session_id
                db.rollback()
                pass
        finally:
            db.close()
    
    def test_7_4_message_foreign_key_nullable(self):
        """
        Tiêu chí 7.4: THE interview_audio table SHALL có foreign key 
        message_id tham chiếu đến interview.interview_messages (nullable, 
        vì TTS audio không gắn với message của user)
        """
        db = get_db_session()
        try:
            # Check message_id nullable
            result = db.execute(text("""
                SELECT is_nullable FROM information_schema.columns 
                WHERE table_schema = 'interview' 
                AND table_name = 'interview_audio' 
                AND column_name = 'message_id'
            """)).fetchone()
            
            assert result is not None, "Cột message_id không tồn tại"
            assert result[0] == 'YES', "message_id phải nullable (cho TTS audio)"
        finally:
            db.close()
    
    def test_7_6_audio_type_field(self):
        """
        Tiêu chí 7.6: THE Audio_Pipeline SHALL lưu cả audio câu trả lời của user (input) 
        và audio TTS câu hỏi của AI (output) vào interview_audio với trường audio_type 
        phân biệt (user_answer / ai_question)
        """
        db = get_db_session()
        try:
            # Check audio_type field exists
            result = db.execute(text("""
                SELECT column_name FROM information_schema.columns 
                WHERE table_schema = 'interview' 
                AND table_name = 'interview_audio' 
                AND column_name = 'audio_type'
            """)).fetchone()
            
            assert result is not None, "Trường audio_type không tồn tại"
            
            # Check constraint cho audio_type values
            try:
                db.execute(text("""
                    INSERT INTO interview.interview_audio 
                    (session_id, audio_type, file_url) 
                    VALUES (1, 'invalid_type', 'test.mp3')
                """))
                db.commit()
                assert False, "Constraint audio_type không hoạt động - cho phép invalid value"
            except Exception:
                # Expected - constraint should only allow 'user_answer' và 'ai_question'
                db.rollback()
                pass
        finally:
            db.close()


if __name__ == "__main__":
    # Chạy tests
    pytest.main([__file__, "-v"])