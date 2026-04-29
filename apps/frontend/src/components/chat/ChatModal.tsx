import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { chatService, ChatMessage } from '../../services/chatService';
import BookingModal from './BookingModal';

interface Props {
  otherUserId: number;
  otherName: string;
  onClose: () => void;
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}
function makeRoomId(a: number, b: number) {
  return [a, b].sort((x, y) => x - y).join('_');
}

const ChatModal: React.FC<Props> = ({ otherUserId, otherName, onClose }) => {
  const { user } = useAuth();
  const myId = (user as any)?.id as number;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading]   = useState(true);
  const [input, setInput]       = useState('');
  const [sending, setSending]   = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const wsRef     = useRef<WebSocket | null>(null);
  const roomId    = makeRoomId(myId, otherUserId);

  useEffect(() => {
    chatService.getMessages(otherUserId)
      .then(setMessages).catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, [otherUserId]);

  useEffect(() => {
    let wsOk = false;
    let poll: ReturnType<typeof setInterval> | null = null;
    try {
      const ws = chatService.openSocket(roomId, msg => {
        wsOk = true;
        setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
      });
      ws.onopen  = () => { wsOk = true; };
      ws.onerror = () => { wsOk = false; };
      wsRef.current = ws;
    } catch { wsOk = false; }
    poll = setInterval(() => {
      if (!wsOk) chatService.getMessages(otherUserId).then(setMessages).catch(() => {});
    }, 3000);
    return () => { wsRef.current?.close(); if (poll) clearInterval(poll); };
  }, [roomId, otherUserId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true); setInput('');
    try {
      const msg = await chatService.sendMessage(otherUserId, text);
      setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
    } catch { setInput(text); } finally { setSending(false); }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/35 z-[1000] flex items-end justify-end p-4"
        onClick={e => e.target === e.currentTarget && onClose()}
        style={{ pointerEvents: 'none' }}
      >
        {/* Modal panel */}
        <div
          className="flex flex-col overflow-hidden rounded-2xl shadow-2xl"
          style={{
            pointerEvents: 'all',
            width: 'min(360px, calc(100vw - 24px))',
            height: 'min(520px, calc(100vh - 80px))',
            background: 'var(--neu-bg-card, f0f0f3)',
            animation: 'chatSlideIn .25s ease',
          }}
        >
          <style>{`@keyframes chatSlideIn{from{opacity:0;transform:translateY(30px) scale(.96)}to{opacity:1;transform:none}}`}</style>

          {/* ── Header ── */}
          <div className="flex items-center gap-2.5 px-4 py-3.5 flex-shrink-0" style={{ background: 'var(--neu-accent, 16a34a)', color: 'fff' }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0" style={{ background: 'rgba(255,255,255,0.25)' }}>
              {initials(otherName)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm truncate">{otherName}</div>
              <div className="text-[11px] opacity-80">Đang hoạt động</div>
            </div>
            <button
              title="Đặt lịch hẹn"
              onClick={() => setShowBooking(true)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-sm cursor-pointer mr-1 transition-colors hover:bg-white/30"
              style={{ background: 'rgba(139,92,246,0.25)', color: 'fff', border: 'none' }}
            ></button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center text-sm cursor-pointer transition-colors hover:bg-white/30"
              style={{ background: 'rgba(255,255,255,0.15)', color: 'fff', border: 'none', fontSize: 15 }}
            ></button>
          </div>

          {/* ── Messages ── */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 p-3" style={{ background: 'var(--neu-bg, e8e8eb)' }}>
            {loading && (
              <div className="flex items-center justify-center h-14 gap-2 text-gray-400 text-sm">
                <div className="w-4 h-4 border-2 border-gray-300 rounded-full animate-spin" style={{ borderTopColor: 'var(--neu-accent)' }} />
                Đang tải...
              </div>
            )}
            {!loading && messages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-sm text-center gap-1.5">
                <span className="text-3xl"></span>
                <span>Chưa có tin nhắn nào.<br />Hãy bắt đầu cuộc trò chuyện!</span>
              </div>
            )}
            {messages.map(msg => {
              const mine = msg.sender_id === myId;
              return (
                <div key={msg.id} className={`flex items-end gap-1.5 ${mine ? 'flex-row-reverse' : ''}`}>
                  {!mine && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ background: 'var(--neu-accent)' }}>
                      {initials(otherName)}
                    </div>
                  )}
                  <div
                    className="max-w-[70%] px-3 py-2 rounded-[18px] text-sm leading-snug break-words shadow-sm"
                    style={mine
                      ? { background: 'var(--neu-accent)', color: 'fff', borderBottomRightRadius: 4 }
                      : { background: 'fff', color: '#1f2937', borderBottomLeftRadius: 4 }
                    }
                  >
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-gray-400 px-1 whitespace-nowrap">{formatTime(msg.created_at)}</span>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* ── Input ── */}
          <div className="flex items-center gap-2 px-3 py-2.5 flex-shrink-0 border-t border-black/8" style={{ background: 'var(--neu-bg-card)' }}>
            <input
              className="flex-1 rounded-full px-3.5 py-2 text-sm outline-none text-gray-800"
              style={{ background: 'var(--neu-bg)', boxShadow: 'inset 2px 2px 5px var(--neu-shadow-dark), inset -2px -2px 5px var(--neu-shadow-light)' }}
              placeholder="Nhập tin nhắn..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              autoFocus
            />
            <button
              onClick={send}
              disabled={!input.trim() || sending}
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-opacity disabled:opacity-40"
              style={{ background: 'var(--neu-accent)', border: 'none', color: 'fff', cursor: 'pointer' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {showBooking && (
        <BookingModal mentorUserId={otherUserId} mentorName={otherName} onClose={() => setShowBooking(false)} />
      )}
    </>
  );
};

export default ChatModal;
