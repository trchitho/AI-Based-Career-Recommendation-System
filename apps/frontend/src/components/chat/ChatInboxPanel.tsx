import { useCallback, useEffect, useRef, useState } from 'react';
import { chatService, ChatRoom } from '../../services/chatService';
import ChatModal from './ChatModal';

interface Props { onNewChat?: () => void; onUnreadChange?: () => void; }

const AVATAR_COLORS = ['16a34a','6366f1','f59e0b','ef4444','06b6d4','8b5cf6','ec4899'];

function initials(name: string) { return name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()||'?'; }
function avatarColor(name: string) { let h=0; for(let i=0;i<name.length;i++) h=name.charCodeAt(i)+((h<<5)-h); return AVATAR_COLORS[Math.abs(h)%AVATAR_COLORS.length]; }
function formatRelative(iso: string) {
  if (!iso) return '';
  const m = Math.floor((Date.now()-new Date(iso).getTime())/60000);
  if (m<1) return 'vừa xong';
  if (m<60) return `${m} phút`;
  const h = Math.floor(m/60);
  if (h<24) return `${h} giờ`;
  return `${Math.floor(h/24)} ngày`;
}

const ChatInboxPanel: React.FC<Props> = ({ onNewChat, onUnreadChange }) => {
  const [rooms, setRooms]     = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<'all'|'unread'>('all');
  const [search, setSearch]   = useState('');
  const [chatTarget, setChatTarget] = useState<{userId:number;name:string}|null>(null);
  const wsRef   = useRef<WebSocket|null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>|null>(null);

  const loadRooms = useCallback(async () => {
    try { const data = await chatService.getRooms(); setRooms(data); onUnreadChange?.(); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, [onUnreadChange]);

  useEffect(() => {
    loadRooms();
    const ws = chatService.openNotificationSocket(type => {
      if (['new_message','chat_message','message'].includes(type)) loadRooms();
    });
    wsRef.current = ws;
    pollRef.current = setInterval(() => { if (!ws || ws.readyState !== WebSocket.OPEN) loadRooms(); }, 10_000);
    return () => { ws?.close(); if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadRooms]);

  const filtered  = rooms.filter(r => (tab!=='unread'||r.unread>0) && (!search||r.other_name.toLowerCase().includes(search.toLowerCase())));
  const totalUnread = rooms.reduce((s,r)=>s+(r.unread||0),0);

  return (
    <div className="flex flex-col h-full rounded-2xl overflow-hidden" style={{ background: 'var(--neu-bg-card)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 pb-2.5 flex-shrink-0">
        <span className="text-xl font-extrabold" style={{ color: 'var(--neu-text)' }}>Đoạn chat</span>
        {onNewChat && (
          <button onClick={onNewChat} title="Tin nhắn mới"
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm cursor-pointer transition-all hover:opacity-80"
            style={{ background: 'var(--neu-bg)', boxShadow: 'var(--neu-raised-sm)', border: 'none' }}>
            
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative px-4 pb-2 flex-shrink-0">
        <span className="absolute left-7 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"></span>
        <input
          className="w-full rounded-full pl-8 pr-3 py-2 text-sm outline-none"
          style={{ background: 'var(--neu-bg)', boxShadow: 'inset 2px 2px 5px var(--neu-shadow-dark),inset -2px -2px 5px var(--neu-shadow-light)', color: 'var(--neu-text)' }}
          placeholder="Tìm kiếm..."
          value={search} onChange={e=>setSearch(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 px-4 pb-2.5 flex-shrink-0">
        {(['all','unread'] as const).map(t => (
          <button key={t} onClick={()=>setTab(t)}
            className="flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border-none"
            style={tab===t
              ? { background:'var(--neu-accent)', color:'fff' }
              : { background:'var(--neu-bg)', color:'var(--neu-text-muted)', boxShadow:'var(--neu-raised-sm)' }
            }>
            {t==='all' ? 'Tất cả' : <>Chưa đọc{totalUnread>0&&<span className="ml-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">{totalUnread>99?'99+':totalUnread}</span>}</>}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {loading && (
          <div className="flex items-center justify-center gap-2 text-gray-400 text-sm py-8">
            <div className="w-4 h-4 border-2 border-gray-300 rounded-full animate-spin" style={{ borderTopColor:'var(--neu-accent)' }} />
            Đang tải...
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400 text-sm gap-2">
            <span className="text-4xl"></span>
            <span>{tab==='unread' ? 'Không có tin nhắn chưa đọc' : 'Chưa có cuộc trò chuyện nào'}</span>
          </div>
        )}

        {!loading && filtered.map(r => (
          <div key={r.room_id} onClick={()=>setChatTarget({userId:r.other_user_id,name:r.other_name})}
            className="flex items-center gap-3 px-2 py-2.5 rounded-xl cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/5">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: avatarColor(r.other_name) }}>
                {initials(r.other_name)}
              </div>
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-indigo-400 rounded-full border-2 border-white" />
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className={`text-sm truncate ${r.unread>0 ? 'font-bold text-gray-900 dark:text-white' : 'font-semibold'}`} style={{ color:'var(--neu-text)' }}>
                {r.other_name}
              </div>
              <div className={`text-xs truncate mt-0.5 ${r.unread>0 ? 'font-semibold text-gray-700 dark:text-gray-200' : 'text-gray-500'}`}>
                {r.last_message}
              </div>
            </div>
            {/* Meta */}
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className="text-[11px] text-gray-400">{formatRelative(r.last_at)}</span>
              {r.unread>0 && (
                <span className="min-w-[18px] text-center bg-red-500 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {r.unread>9?'9+':r.unread}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {chatTarget && (
        <ChatModal otherUserId={chatTarget.userId} otherName={chatTarget.name} onClose={()=>{ setChatTarget(null); loadRooms(); }} />
      )}
    </div>
  );
};

export default ChatInboxPanel;
