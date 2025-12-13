import React, { useState, useEffect } from 'react';
import { History, MessageSquare, Trash2, Edit3, Plus, Clock } from 'lucide-react';

interface ChatSession {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  message_count: number;
  last_message?: string;
}

interface ChatHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSession: (sessionId: number) => void;
  onNewSession: () => void;
  currentSessionId?: number | null;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({
  isOpen,
  onClose,
  onSelectSession,
  onNewSession,
  currentSessionId
}) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchSessions();
    }
  }, [isOpen]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        console.warn('No access token found');
        setSessions([]);
        return;
      }

      const response = await fetch('/api/chatbot/sessions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      } else {
        console.error('Failed to fetch sessions:', response.status, response.statusText);
        setSessions([]);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (sessionId: number) => {
    if (!confirm('Bạn có chắc muốn xóa cuộc trò chuyện này?')) return;
    
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        console.warn('No access token found');
        return;
      }

      const response = await fetch(`/api/chatbot/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        setSessions(sessions.filter(s => s.id !== sessionId));
      } else {
        console.error('Failed to delete session:', response.status, response.statusText);
        alert('Không thể xóa cuộc trò chuyện. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Có lỗi xảy ra khi xóa cuộc trò chuyện.');
    }
  };

  const updateSessionTitle = async (sessionId: number, newTitle: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        console.warn('No access token found');
        setEditingId(null);
        return;
      }

      const response = await fetch(`/api/chatbot/sessions/${sessionId}/title`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: newTitle })
      });
      
      if (response.ok) {
        setSessions(sessions.map(s => 
          s.id === sessionId ? { ...s, title: newTitle } : s
        ));
        setEditingId(null);
      } else {
        console.error('Failed to update session title:', response.status, response.statusText);
        setEditingId(null);
      }
    } catch (error) {
      console.error('Error updating session title:', error);
      setEditingId(null);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    try {
      // Xử lý các trường hợp null/undefined/empty
      if (!dateString || dateString === 'null' || dateString === 'undefined') {
        return 'Vừa xong';
      }
      
      // Thử parse date với nhiều format
      let date: Date;
      
      // Nếu là ISO string
      if (typeof dateString === 'string' && dateString.includes('T')) {
        date = new Date(dateString);
      }
      // Nếu là timestamp
      else if (!isNaN(Number(dateString))) {
        date = new Date(Number(dateString));
      }
      // Thử parse trực tiếp
      else {
        date = new Date(dateString);
      }
      
      // Kiểm tra date hợp lệ
      if (isNaN(date.getTime())) {
        console.warn('Invalid date:', dateString);
        return 'Thời gian không xác định';
      }
      
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      
      // Hiển thị thời gian tương đối
      if (diffMinutes < 1) {
        return 'Vừa xong';
      } else if (diffMinutes < 60) {
        return `${diffMinutes} phút trước`;
      } else if (diffHours < 24) {
        return `${diffHours} giờ trước`;
      } else if (diffDays === 1) {
        return 'Hôm qua';
      } else if (diffDays < 7) {
        return `${diffDays} ngày trước`;
      } else {
        return date.toLocaleDateString('vi-VN', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric' 
        });
      }
    } catch (error) {
      console.error('Error formatting date:', error, 'input:', dateString);
      return 'Lỗi thời gian';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <History size={20} className="text-blue-600" />
            <h2 className="text-lg font-semibold">Lịch sử trò chuyện</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onNewSession}
              className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              <Plus size={16} />
              Mới
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
              <p>Chưa có cuộc trò chuyện nào</p>
              <button
                onClick={onNewSession}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Bắt đầu trò chuyện đầu tiên
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => {
                // Đảm bảo session có đủ dữ liệu
                const safeSession = {
                  id: session.id || 0,
                  title: session.title || 'Cuộc trò chuyện',
                  created_at: session.created_at || new Date().toISOString(),
                  updated_at: session.updated_at || new Date().toISOString(),
                  is_active: session.is_active || false,
                  message_count: session.message_count || 0,
                  last_message: session.last_message || ''
                };

                return (
                  <div
                    key={safeSession.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      safeSession.id === currentSessionId
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                    onClick={() => onSelectSession(safeSession.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        {editingId === safeSession.id ? (
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onBlur={() => updateSessionTitle(safeSession.id, editTitle)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                updateSessionTitle(safeSession.id, editTitle);
                              }
                            }}
                            className="w-full p-1 border rounded text-sm font-medium"
                            autoFocus
                          />
                        ) : (
                          <h3 className="font-medium text-gray-900 truncate">
                            {safeSession.title}
                          </h3>
                        )}
                        
                        {safeSession.last_message && (
                          <p className="text-sm text-gray-600 truncate mt-1">
                            {safeSession.last_message}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <MessageSquare size={12} />
                            {safeSession.message_count} tin nhắn
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {formatDate(safeSession.updated_at)}
                          </span>
                          {safeSession.is_active && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                              Đang hoạt động
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(safeSession.id);
                            setEditTitle(safeSession.title);
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Đổi tên"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSession(safeSession.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Xóa"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};