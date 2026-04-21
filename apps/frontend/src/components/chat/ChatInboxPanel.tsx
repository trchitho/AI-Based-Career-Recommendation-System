import { useEffect, useState } from 'react';
import { chatService, ChatRoom } from '../../services/chatService';
import ChatModal from './ChatModal';
import './ChatInboxPanel.css';

interface Props {
  onNewChat?: () => void;
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
}

function formatRelative(iso: string) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'vừa xong';
  if (m < 60) return `${m} phút`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ`;
  return `${Math.floor(h / 24)} ngày`;
}

const AVATAR_COLORS = [
  '#16a34a','#6366f1','#f59e0b','#ef4444','#06b6d4','#8b5cf6','#ec4899',
];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

const ChatInboxPanel: React.FC<Props> = ({ onNewChat }) => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [search, setSearch] = useState('');
  const [chatTarget, setChatTarget] = useState<{ userId: number; name: string } | null>(null);

  useEffect(() => {
    chatService.getRooms()
      .then(setRooms)
      .catch(() => setRooms([]))
      .finally(() => setLoading(false));
  }, []);

  // Re-fetch when a chat is closed to refresh last message
  const handleCloseChat = () => {
    setChatTarget(null);
    chatService.getRooms().then(setRooms).catch(() => {});
  };

  const filtered = rooms.filter(r => {
    if (tab === 'unread' && r.unread === 0) return false;
    if (search && !r.other_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="cip-wrap">
      {/* Header */}
      <div className="cip-header">
        <span className="cip-title">Đoạn chat</span>
        <div className="cip-header-icons">
          {onNewChat && (
            <button className="cip-icon-btn" title="Tin nhắn mới" onClick={onNewChat}>✏️</button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="cip-search-wrap">
        <span className="cip-search-icon">🔍</span>
        <input
          className="cip-search"
          placeholder="Tìm kiếm trên Messenger"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <div className="cip-tabs">
        <button className={`cip-tab${tab === 'all' ? ' active' : ''}`} onClick={() => setTab('all')}>Tất cả</button>
        <button className={`cip-tab${tab === 'unread' ? ' active' : ''}`} onClick={() => setTab('unread')}>
          Chưa đọc{rooms.filter(r => r.unread > 0).length > 0 && ` (${rooms.filter(r => r.unread > 0).length})`}
        </button>
      </div>

      {/* List */}
      {loading && (
        <div className="cip-loading"><div className="cip-spinner" /> Đang tải...</div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="cip-empty">
          <div className="cip-empty-icon">💬</div>
          <span>{tab === 'unread' ? 'Không có tin nhắn chưa đọc' : 'Chưa có cuộc trò chuyện nào'}</span>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="cip-list">
          {filtered.map(r => (
            <div key={r.room_id} className="cip-row" onClick={() => setChatTarget({ userId: r.other_user_id, name: r.other_name })}>
              <div className="cip-avatar" style={{ background: avatarColor(r.other_name) }}>
                {initials(r.other_name)}
                <div className="cip-avatar-online" />
              </div>
              <div className="cip-info">
                <div className={`cip-name${r.unread > 0 ? ' unread' : ''}`}>{r.other_name}</div>
                <div className={`cip-preview${r.unread > 0 ? ' unread' : ''}`}>{r.last_message}</div>
              </div>
              <div className="cip-meta">
                <span className="cip-time">{formatRelative(r.last_at)}</span>
                {r.unread > 0 && <span className="cip-unread-badge">{r.unread > 9 ? '9+' : r.unread}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Open ChatModal */}
      {chatTarget && (
        <ChatModal
          otherUserId={chatTarget.userId}
          otherName={chatTarget.name}
          onClose={handleCloseChat}
        />
      )}
    </div>
  );
};

export default ChatInboxPanel;
