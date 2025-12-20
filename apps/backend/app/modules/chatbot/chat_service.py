from sqlalchemy.orm import Session
from sqlalchemy import desc, func, text
from typing import List, Optional, Dict
from datetime import datetime, timezone
import logging

from .gemini_service import GeminiChatbotService
from .models import ChatSession, ChatMessage

logger = logging.getLogger(__name__)

class ChatHistoryService:
    def __init__(self, db: Session):
        self.db = db
        self.gemini_service = GeminiChatbotService()
    
    def get_or_create_active_session(self, user_id: int) -> Dict:
        """Lấy session active hiện tại hoặc tạo mới"""
        # Tìm session active gần nhất
        result = self.db.execute(text("""
            SELECT id, user_id, title, created_at, updated_at, is_active
            FROM chatbot.chat_sessions 
            WHERE user_id = :user_id AND is_active = true
            ORDER BY updated_at DESC 
            LIMIT 1
        """), {"user_id": user_id})
        
        active_session = result.fetchone()
        
        if active_session:
            return {
                "id": active_session[0],
                "user_id": active_session[1],
                "title": active_session[2],
                "created_at": active_session[3],
                "updated_at": active_session[4],
                "is_active": active_session[5]
            }
        
        # Tạo session mới
        result = self.db.execute(text("""
            INSERT INTO chatbot.chat_sessions (user_id, title, is_active)
            VALUES (:user_id, :title, :is_active)
            RETURNING id, user_id, title, created_at, updated_at, is_active
        """), {
            "user_id": user_id,
            "title": "Cuộc trò chuyện mới",
            "is_active": True
        })
        
        new_session = result.fetchone()
        self.db.commit()
        
        return {
            "id": new_session[0],
            "user_id": new_session[1],
            "title": new_session[2],
            "created_at": new_session[3],
            "updated_at": new_session[4],
            "is_active": new_session[5]
        }
    
    def create_new_session(self, user_id: int, title: str = None) -> Dict:
        """Tạo session mới và đánh dấu session cũ là inactive"""
        # Đánh dấu tất cả session cũ là inactive
        self.db.execute(text("""
            UPDATE chatbot.chat_sessions 
            SET is_active = false 
            WHERE user_id = :user_id AND is_active = true
        """), {"user_id": user_id})
        
        # Tạo session mới
        result = self.db.execute(text("""
            INSERT INTO chatbot.chat_sessions (user_id, title, is_active)
            VALUES (:user_id, :title, :is_active)
            RETURNING id, user_id, title, created_at, updated_at, is_active
        """), {
            "user_id": user_id,
            "title": title or "Cuộc trò chuyện mới",
            "is_active": True
        })
        
        new_session = result.fetchone()
        self.db.commit()
        
        return {
            "id": new_session[0],
            "user_id": new_session[1],
            "title": new_session[2],
            "created_at": new_session[3],
            "updated_at": new_session[4],
            "is_active": new_session[5]
        }
    
    def save_message_and_response(
        self, 
        user_id: int, 
        message: str, 
        response: str,
        message_type: str = "text",
        response_time_ms: int = None,
        session_id: int = None
    ) -> Dict:
        """Lưu tin nhắn và phản hồi vào database"""
        
        # Lấy hoặc tạo session
        if session_id:
            result = self.db.execute(text("""
                SELECT id, user_id, title, created_at, updated_at, is_active
                FROM chatbot.chat_sessions 
                WHERE id = :session_id
            """), {"session_id": session_id})
            session_row = result.fetchone()
            
            if session_row:
                session = {
                    "id": session_row[0],
                    "user_id": session_row[1],
                    "title": session_row[2],
                    "created_at": session_row[3],
                    "updated_at": session_row[4],
                    "is_active": session_row[5]
                }
            else:
                session = self.get_or_create_active_session(user_id)
        else:
            session = self.get_or_create_active_session(user_id)
        
        # Tự động tạo title từ tin nhắn đầu tiên
        if session["title"] == "Cuộc trò chuyện mới" and len(message) > 10:
            new_title = message[:50] + ("..." if len(message) > 50 else "")
            self.db.execute(text("""
                UPDATE chatbot.chat_sessions 
                SET title = :title, updated_at = NOW()
                WHERE id = :session_id
            """), {"title": new_title, "session_id": session["id"]})
        
        # Tạo message record
        result = self.db.execute(text("""
            INSERT INTO chatbot.chat_messages 
            (session_id, user_id, message, response, message_type, response_time_ms)
            VALUES (:session_id, :user_id, :message, :response, :message_type, :response_time_ms)
            RETURNING id, session_id, user_id, message, response, message_type, created_at, response_time_ms
        """), {
            "session_id": session["id"],
            "user_id": user_id,
            "message": message,
            "response": response,
            "message_type": message_type,
            "response_time_ms": response_time_ms
        })
        
        message_row = result.fetchone()
        self.db.commit()
        
        return {
            "id": message_row[0],
            "session_id": message_row[1],
            "user_id": message_row[2],
            "message": message_row[3],
            "response": message_row[4],
            "message_type": message_row[5],
            "created_at": message_row[6],
            "response_time_ms": message_row[7]
        }
    
    def get_user_sessions(self, user_id: int, limit: int = 20) -> List[Dict]:
        """Lấy danh sách session của user"""
        sessions_result = self.db.execute(text("""
            SELECT id, user_id, title, created_at, updated_at, is_active
            FROM chatbot.chat_sessions 
            WHERE user_id = :user_id
            ORDER BY updated_at DESC 
            LIMIT :limit
        """), {"user_id": user_id, "limit": limit})
        
        result = []
        for session_row in sessions_result:
            session_id = session_row[0]
            
            # Đếm số tin nhắn
            count_result = self.db.execute(text("""
                SELECT COUNT(*) FROM chatbot.chat_messages 
                WHERE session_id = :session_id
            """), {"session_id": session_id})
            message_count = count_result.scalar()
            
            # Lấy tin nhắn cuối
            last_msg_result = self.db.execute(text("""
                SELECT message FROM chatbot.chat_messages 
                WHERE session_id = :session_id
                ORDER BY created_at DESC 
                LIMIT 1
            """), {"session_id": session_id})
            last_msg_row = last_msg_result.fetchone()
            last_message = last_msg_row[0] if last_msg_row else None
            
            # Xử lý null safety cho dates
            created_at = session_row[3]
            updated_at = session_row[4]
            
            result.append({
                "id": session_row[0],
                "title": session_row[2] or "Cuộc trò chuyện",
                "created_at": created_at.isoformat() if created_at else datetime.now().isoformat(),
                "updated_at": updated_at.isoformat() if updated_at else datetime.now().isoformat(),
                "is_active": session_row[5] or False,
                "message_count": message_count or 0,
                "last_message": last_message[:100] + "..." if last_message and len(last_message) > 100 else last_message
            })
        
        return result
    
    def get_session_messages(self, session_id: int, user_id: int) -> List[Dict]:
        """Lấy tất cả tin nhắn trong một session"""
        # Kiểm tra quyền truy cập
        session_result = self.db.execute(text("""
            SELECT id FROM chatbot.chat_sessions 
            WHERE id = :session_id AND user_id = :user_id
        """), {"session_id": session_id, "user_id": user_id})
        
        if not session_result.fetchone():
            return []
        
        messages_result = self.db.execute(text("""
            SELECT id, message, response, message_type, created_at, response_time_ms
            FROM chatbot.chat_messages 
            WHERE session_id = :session_id
            ORDER BY created_at
        """), {"session_id": session_id})
        
        result = []
        for msg_row in messages_result:
            msg_id, message, response, message_type, created_at, response_time_ms = msg_row
            result.extend([
                {
                    "id": f"{msg_id}_user",
                    "text": message,
                    "sender": "user",
                    "timestamp": created_at.isoformat(),
                    "type": message_type
                },
                {
                    "id": f"{msg_id}_bot",
                    "text": response,
                    "sender": "bot", 
                    "timestamp": created_at.isoformat(),
                    "type": message_type,
                    "response_time_ms": response_time_ms
                }
            ])
        
        return result
    
    def delete_session(self, session_id: int, user_id: int) -> bool:
        """Xóa một session"""
        # Kiểm tra session tồn tại và thuộc về user
        check_result = self.db.execute(text("""
            SELECT id FROM chatbot.chat_sessions 
            WHERE id = :session_id AND user_id = :user_id
        """), {"session_id": session_id, "user_id": user_id})
        
        if not check_result.fetchone():
            return False
        
        # Xóa session (messages sẽ tự động xóa do CASCADE)
        self.db.execute(text("""
            DELETE FROM chatbot.chat_sessions 
            WHERE id = :session_id AND user_id = :user_id
        """), {"session_id": session_id, "user_id": user_id})
        
        self.db.commit()
        return True
    
    def update_session_title(self, session_id: int, user_id: int, new_title: str) -> bool:
        """Cập nhật title của session"""
        # Cập nhật title
        result = self.db.execute(text("""
            UPDATE chatbot.chat_sessions 
            SET title = :title, updated_at = NOW()
            WHERE id = :session_id AND user_id = :user_id
        """), {"title": new_title, "session_id": session_id, "user_id": user_id})
        
        self.db.commit()
        return result.rowcount > 0