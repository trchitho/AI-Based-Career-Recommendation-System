import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, GraduationCap, X } from 'lucide-react';
import { Chatbot } from './Chatbot';
import ChatInboxPanel from '../chat/ChatInboxPanel';
import { chatService } from '../../services/chatService';
import { useAuth } from '../../contexts/AuthContext';

/* ── Toast notification ── */
interface Toast { id: number; msg: string; type: 'chat' | 'schedule' | 'reminder' }
let _toastId = 0;

const ToastBar: React.FC<{ toasts: Toast[]; onClose: (id: number) => void }> = ({ toasts, onClose }) => (
  <div style={{ position: 'fixed', top: 72, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 320 }}>
    {toasts.map(t => (
      <div key={t.id}
        style={{
          background: t.type === 'reminder' ? '#7c3aed' : t.type === 'schedule' ? '#0ea5e9' : '#16a34a',
          color: '#fff', borderRadius: 12, padding: '10px 14px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.85rem',
          animation: 'slideIn .25s ease',
        }}>
        <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:none}}`}</style>
        <span style={{ flex: 1, lineHeight: 1.45 }}>{t.msg}</span>
        <button onClick={() => onClose(t.id)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.7, lineHeight: 1, padding: 0, flexShrink: 0, display:'flex', alignItems:'center' }}><X size={14} /></button>
      </div>
    ))}
  </div>
);

export const ChatbotButton: React.FC = () => {
  const { user } = useAuth();
  const [isChatbotOpen, setIsChatbotOpen]   = useState(false);
  const [showWelcome, setShowWelcome]         = useState(false);
  const [isMessengerOpen, setIsMessengerOpen] = useState(false);
  const [isMessengerMinimized, setIsMessengerMinimized] = useState(false);
  const [isMentorChatOpen, setIsMentorChatOpen] = useState(false);
  const [unreadCount, setUnreadCount]         = useState(0);
  const [toasts, setToasts]                   = useState<Toast[]>([]);
  const wsRef   = useRef<WebSocket | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addToast = useCallback((msg: string, type: Toast['type'] = 'chat', duration = 7000) => {
    const id = ++_toastId;
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);
  const removeToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  /* ── Fetch unread count ── */
  const fetchUnread = useCallback(async () => {
    if (!user) return;
    try {
      const count = await chatService.getTotalUnread();
      setUnreadCount(count);
    } catch { /* ignore */ }
  }, [user]);

  /* ── WebSocket notifications + polling fallback ── */
  useEffect(() => {
    if (!user) return;

    // Initial fetch
    fetchUnread();

    // WS: xử lý tất cả event types
    const ws = chatService.openNotificationSocket((type, data) => {
      switch (type) {
        // ── Chat ──────────────────────────────────────────────
        case 'new_message':
        case 'chat_message':
        case 'message':
          setUnreadCount(c => c + 1);
          fetchUnread();
          if (data?.from_name) {
            addToast(`Tin nhắn mới từ ${data.from_name}`, 'chat');
          }
          break;

        // ── Lịch hẹn ──────────────────────────────────────────
        case 'new_session_request': {
          const time = data?.scheduled_at
            ? new Date(data.scheduled_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
            : '';
          addToast(
            `${data?.from_name || 'Mentee'} muốn đặt lịch hẹn${data?.topic ? ` — ${data.topic}` : ''}${time ? ` lúc ${time}` : ''}. Vào tab Lịch hẹn để xác nhận.`,
            'schedule', 10000
          );
          break;
        }
        case 'session_responded': {
          const label = data?.action === 'confirmed' ? ' đã xác nhận' : ' đã từ chối';
          addToast(
            `${data?.from_name || 'Mentor'} ${label} lịch hẹn của bạn${data?.mentor_note ? ` — "${data.mentor_note}"` : ''}.`,
            'schedule', 10000
          );
          break;
        }
        case 'session_cancelled':
          addToast(
            `${data?.from_name || 'Đối tác'} đã huỷ lịch hẹn.`,
            'schedule', 8000
          );
          break;

        // ── Reminder trước 30 phút ─────────────────────────────
        case 'session_reminder': {
          const mins = data?.minutes_until ?? 30;
          const topic = data?.topic ? ` "${data.topic}"` : '';
          addToast(
            `Lịch hẹn${topic} với ${data?.other_name || 'đối tác'} sẽ bắt đầu sau ${mins} phút!`,
            'reminder', 15000
          );
          break;
        }
        default:
          break;
      }
    });
    wsRef.current = ws;

    // Polling fallback: every 15s if WS down
    pollRef.current = setInterval(() => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        fetchUnread();
      }
    }, 15_000);

    return () => {
      ws?.close();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [user, fetchUnread]);

  /* ── Welcome popup ── */
  useEffect(() => {
    const seen = sessionStorage.getItem('chatbot-welcome-shown');
    if (!seen) {
      const t = setTimeout(() => {
        setShowWelcome(true);
        sessionStorage.setItem('chatbot-welcome-shown', 'true');
      }, 3000);
      return () => clearTimeout(t);
    }
  }, []);

  /* ── When messenger opened: mark as read + refresh ── */
  const handleToggleMessenger = () => {
    const next = !isMessengerOpen;
    setIsMessengerOpen(next);
    setIsMessengerMinimized(false);
    setIsMentorChatOpen(false);
    if (next) {
      setIsChatbotOpen(false);
    }
    setShowWelcome(false);
    if (next) {
      // Reset badge when user opens inbox
      setUnreadCount(0);
    }
  };

  return (
    <>
      {/* Toast notifications */}
      <ToastBar toasts={toasts} onClose={removeToast} />

      {/* Messenger popup */}
      {isMessengerOpen && (
        <div className={`fixed z-50 ${isMessengerMinimized ? 'h-14' : 'h-[min(70vh,520px)]'} rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700 transition-all duration-300`}
          style={{
            width: 'min(calc(100vw - 24px), 420px)',
            right: 'calc(12px + env(safe-area-inset-right))',
            bottom: 'calc(84px + env(safe-area-inset-bottom))',
            background: 'var(--neu-bg-card,#f0f0f3)',
          }}
        >
          <ChatInboxPanel
            onUnreadChange={fetchUnread}
            onClose={() => {
              setIsMessengerOpen(false);
              setIsMessengerMinimized(false);
              setIsMentorChatOpen(false);
              fetchUnread();
            }}
            isMinimized={isMessengerMinimized}
            onToggleMinimized={() => setIsMessengerMinimized(value => !value)}
            onChatModalOpenChange={setIsMentorChatOpen}
          />
        </div>
      )}

      {/* Floating Messenger Button */}
      {!isMessengerOpen && !isMentorChatOpen && (
      <div
        className="fixed z-50 transition-all duration-300"
        style={{
          right: 'calc(16px + env(safe-area-inset-right))',
          bottom: isChatbotOpen
            ? 'calc(16px + env(safe-area-inset-bottom))'
            : 'calc(76px + env(safe-area-inset-bottom))',
        }}
      >
        <button
          onClick={handleToggleMessenger}
          className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl sm:h-14 sm:w-14 lg:h-16 lg:w-16"
          title="Tin nhắn Mentor"
        >
          <GraduationCap size={20} />

          {/* Unread badge — đỏ, hiện số thực */}
          {unreadCount > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-white font-bold border-2 border-white"
              style={{ fontSize: '0.65rem', background: '#ef4444', lineHeight: 1 }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}

          {/* Chấm xanh khi không có tin chưa đọc */}
          {unreadCount === 0 && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-300 rounded-full border-2 border-white" />
          )}
        </button>
      </div>
      )}

      {/* Floating Chatbot Button */}
      {!isChatbotOpen && (
      <div
        className="fixed z-50"
        style={{
          right: 'calc(16px + env(safe-area-inset-right))',
          bottom: 'calc(16px + env(safe-area-inset-bottom))',
        }}
      >
        <button
          onClick={() => {
            setIsChatbotOpen(o => {
              const next = !o;
              if (next) {
                setIsMessengerOpen(false);
                setIsMessengerMinimized(false);
                setIsMentorChatOpen(false);
              }
              return next;
            });
            setShowWelcome(false);
          }}
          className={`group relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl sm:h-14 sm:w-14 lg:h-16 lg:w-16 ${isChatbotOpen ? 'bg-gray-500' : ''}`}
          title="Chatbot tư vấn nghề nghiệp"
        >
          <div className="relative">
            <Bot size={20} className="transition-transform duration-200" />
          </div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-400 rounded-full border-2 border-white animate-pulse" />
          {!isChatbotOpen && (
            <div className="absolute inset-0 rounded-full bg-blue-400 opacity-20 animate-ping" />
          )}
        </button>
        <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            Chatbot tư vấn nghề nghiệp
          </div>
        </div>
      </div>
      )}

      {/* Welcome popup */}
      {showWelcome && !isChatbotOpen && (
        <div className="fixed z-40 animate-bounce-in" style={{ right: 'calc(16px + env(safe-area-inset-right))', bottom: 'calc(76px + env(safe-area-inset-bottom))' }}>
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-3 max-w-[calc(100vw-32px)] sm:max-w-xs relative">
            <button onClick={() => setShowWelcome(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 w-4 h-4 flex items-center justify-center">
              <X size={12} />
            </button>
            <div className="flex items-start gap-2 pr-4">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot size={12} className="text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-sm text-gray-800 mb-1">Xin chào!</div>
                <div className="text-xs text-gray-600 leading-relaxed">
                  Tôi có thể hỗ trợ bạn tư vấn nghề nghiệp. Nhấn để bắt đầu trò chuyện!
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Chatbot isOpen={isChatbotOpen} onClose={() => setIsChatbotOpen(false)} />
    </>
  );
};
