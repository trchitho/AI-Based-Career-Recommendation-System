import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { chatService, ChatMessage } from '../../services/chatService';
import BookingModal from './BookingModal';
import './ChatModal.css';

interface Props {
  otherUserId: number;
  otherName: string;
  onClose: () => void;
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function makeRoomId(a: number, b: number) {
  return [a, b].sort((x, y) => x - y).join('_');
}

const ChatModal: React.FC<Props> = ({ otherUserId, otherName, onClose }) => {
  const { user } = useAuth();
  const myId = (user as any)?.id as number;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const roomId = makeRoomId(myId, otherUserId);

  // Load history
  useEffect(() => {
    chatService.getMessages(otherUserId)
      .then(setMessages)
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, [otherUserId]);

  // WebSocket + fallback polling
  useEffect(() => {
    let ws: WebSocket | null = null;
    let wsOk = false;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    try {
      ws = chatService.openSocket(roomId, (msg) => {
        wsOk = true;
        setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
      });
      ws.onopen = () => { wsOk = true; };
      ws.onerror = () => { wsOk = false; };
      wsRef.current = ws;
    } catch { wsOk = false; }

    // Poll every 3s as fallback when WS isn't available
    pollInterval = setInterval(() => {
      if (!wsOk) {
        chatService.getMessages(otherUserId).then(msgs => {
          setMessages(msgs);
        }).catch(() => {});
      }
    }, 3000);

    return () => {
      ws?.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [roomId, otherUserId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');
    try {
      const msg = await chatService.sendMessage(otherUserId, text);
      // Add immediately so sender sees it without waiting for WS
      setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
    } catch {
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
    <div className="chat-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="chat-modal">
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-avatar">{initials(otherName)}</div>
          <div className="chat-header-info">
            <div className="chat-header-name">{otherName}</div>
            <div className="chat-header-sub">Đang hoạt động</div>
          </div>
          <button
            className="chat-close-btn"
            title="Đặt lịch hẹn"
            onClick={() => setShowBooking(true)}
            style={{ marginRight: 4, fontSize: '0.9rem', background: 'rgba(139,92,246,0.12)', color: '#7c3aed' }}
          >📅</button>
          <button className="chat-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Messages */}
        <div className="chat-messages">
          {loading && (
            <div className="chat-loading">
              <div className="chat-spinner" /> Đang tải...
            </div>
          )}
          {!loading && messages.length === 0 && (
            <div className="chat-empty">
              <div className="chat-empty-icon">💬</div>
              <span>Chưa có tin nhắn nào.<br />Hãy bắt đầu cuộc trò chuyện!</span>
            </div>
          )}
          {messages.map(msg => {
            const mine = msg.sender_id === myId;
            return (
              <div key={msg.id} className={`chat-bubble-row${mine ? ' mine' : ''}`}>
                {!mine && (
                  <div className="chat-bubble-avatar">{initials(otherName)}</div>
                )}
                <div className="chat-bubble">{msg.content}</div>
                <span className="chat-bubble-time">{formatTime(msg.created_at)}</span>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="chat-input-row">
          <input
            className="chat-input"
            placeholder="Nhập tin nhắn..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            autoFocus
          />
          <button className="chat-send-btn" onClick={send} disabled={!input.trim() || sending}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    {showBooking && (
      <BookingModal
        mentorUserId={otherUserId}
        mentorName={otherName}
        onClose={() => setShowBooking(false)}
      />
    )}
    </>
  );
};

export default ChatModal;
