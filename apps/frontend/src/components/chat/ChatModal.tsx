import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Send, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { chatService, ChatMessage, ChatPresence } from '../../services/chatService';
import BookingModal from './BookingModal';

interface Props {
  otherUserId: number;
  otherName: string;
  otherRole?: 'mentor' | 'mentee';
  onClose: () => void;
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}
function formatDateDivider(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((today - day) / 86400000);
  if (diffDays === 0) return 'Hôm nay';
  if (diffDays === 1) return 'Hôm qua';
  if (diffDays > 1 && diffDays < 7) {
    return date.toLocaleDateString('vi-VN', { weekday: 'long' });
  }
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function isSameDay(a?: string, b?: string) {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}
function minutesBetween(a?: string, b?: string) {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 60000;
}
function formatOfflineSince(iso?: string | null) {
  if (!iso) return 'Đã offline';
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `Đã offline ${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Đã offline ${hours} giờ`;
  return `Đã offline ${Math.floor(hours / 24)} ngày`;
}
function roleLabel(role?: string) {
  return role === 'mentor' ? 'Mentor' : role === 'mentee' ? 'Mentee' : 'Đối tác';
}
function makeRoomId(a: number, b: number) {
  return [a, b].sort((x, y) => x - y).join('_');
}

const ChatModal: React.FC<Props> = ({ otherUserId, otherName, otherRole, onClose }) => {
  const { user } = useAuth();
  const myId = (user as any)?.id as number;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading]   = useState(true);
  const [input, setInput]       = useState('');
  const [sending, setSending]   = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [presence, setPresence] = useState<ChatPresence | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const wsRef     = useRef<WebSocket | null>(null);
  const roomId    = makeRoomId(myId, otherUserId);

  useEffect(() => {
    chatService.getMessages(otherUserId)
      .then(setMessages).catch(() => setMessages([]))
      .finally(() => setLoading(false));
    chatService.getPresence(otherUserId)
      .then(setPresence)
      .catch(() => setPresence(null));
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
        className="fixed inset-0 bg-slate-950/35 backdrop-blur-[2px] z-[1000] flex items-end justify-end p-4 pb-24 sm:pb-28"
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        {/* Modal panel */}
        <div
          className="flex flex-col overflow-hidden rounded-2xl shadow-2xl"
          style={{
            width: 'min(360px, calc(100vw - 24px))',
            height: 'min(520px, calc(100vh - 160px))',
            background: '#fff',
            animation: 'chatSlideIn .25s ease',
          }}
        >
          <style>{`@keyframes chatSlideIn{from{opacity:0;transform:translateY(30px) scale(.96)}to{opacity:1;transform:none}}`}</style>

          {/* ── Header ── */}
          <div className="flex items-center gap-2.5 px-4 py-3.5 flex-shrink-0" style={{ background: 'var(--neu-accent, #16a34a)', color: '#fff' }}>
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: 'rgba(255,255,255,0.25)' }}>
                {initials(otherName)}
              </div>
              <span
                className="absolute -right-0.5 bottom-0 w-3 h-3 rounded-full border-2 border-white"
                style={{ background: presence?.is_online ? '#22c55e' : '#64748b' }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="font-bold text-sm truncate">{otherName}</div>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 font-bold">
                  {roleLabel(presence?.role || otherRole)}
                </span>
              </div>
              <div className="text-[11px] opacity-85">
                {presence?.is_online ? 'Đang hoạt động' : formatOfflineSince(presence?.offline_since || presence?.last_status_at)}
              </div>
            </div>
            <button
              title="Đặt lịch hẹn"
              onClick={() => setShowBooking(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer mr-1 transition-colors hover:bg-white/30"
              style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)' }}
            >
              <CalendarDays size={16} />
            </button>
            <button
              title="Đóng"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors hover:bg-white/30"
              style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)' }}
            >
              <X size={16} />
            </button>
          </div>

          {/* ── Messages ── */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 p-3" style={{ background: 'linear-gradient(180deg,#f8fafc 0%,#eef2f7 100%)' }}>
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
              const index = messages.indexOf(msg);
              const prev = messages[index - 1];
              const showDate = !prev || !isSameDay(prev.created_at, msg.created_at);
              const startsGroup = !prev || prev.sender_id !== msg.sender_id || minutesBetween(prev.created_at, msg.created_at) > 5 || showDate;
              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex justify-center my-2">
                      <span className="text-[11px] px-2.5 py-1 rounded-full bg-white/90 text-slate-500 font-semibold shadow-sm border border-slate-200">
                        {formatDateDivider(msg.created_at)}
                      </span>
                    </div>
                  )}
                  {startsGroup && (
                    <div className={`mb-1 text-[10px] font-bold ${mine ? 'text-right pr-2 text-green-700' : 'pl-8 text-gray-500'}`}>
                      {mine ? 'Bạn' : roleLabel(presence?.role || otherRole)}
                    </div>
                  )}
                  <div className={`flex items-end gap-1.5 ${mine ? 'flex-row-reverse' : ''}`}>
                    {!mine && (
                      startsGroup ? (
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ background: 'var(--neu-accent)' }}>
                          {initials(otherName)}
                        </div>
                      ) : <div className="w-6 flex-shrink-0" />
                    )}
                    <div
                      className="max-w-[74%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words shadow-sm"
                      style={mine
                        ? { background: 'linear-gradient(135deg,#16a34a,#059669)', color: '#fff', borderBottomRightRadius: 5 }
                        : { background: '#fff', color: '#1f2937', borderBottomLeftRadius: 5, border: '1px solid #e2e8f0' }
                      }
                    >
                      <div>{msg.content}</div>
                      <div className={`text-[10px] mt-1 ${mine ? 'text-white/75' : 'text-gray-400'}`}>
                        {formatTime(msg.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* ── Input ── */}
          <div className="flex items-center gap-2 px-3 py-2.5 flex-shrink-0 border-t border-slate-200" style={{ background: '#fff' }}>
            <input
              className="flex-1 rounded-full px-3.5 py-2 text-sm outline-none text-slate-800 border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition"
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
              style={{ background: 'var(--neu-accent)', border: 'none', color: '#fff', cursor: 'pointer' }}
              title="Gửi"
            >
              <Send size={15} />
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
