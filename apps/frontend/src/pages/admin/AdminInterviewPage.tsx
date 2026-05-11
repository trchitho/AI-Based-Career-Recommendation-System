import { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare, Users, BarChart2, FileText, Mic, Trash2, Eye,
  RefreshCw, Download, Search, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, Clock, TrendingUp, Database, Star,
  Calendar, Volume2, Zap, AlertCircle, X, Activity
} from 'lucide-react';
import api from '../../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface InterviewStats {
  total_sessions: number;
  completed_sessions: number;
  active_sessions: number;
  abandoned_sessions: number;
  avg_score: number;
  voice_sessions: number;
  text_sessions: number;
  pass_count: number;
  fail_count: number;
  conditional_count: number;
  avg_question_count: number;
  total_templates: number;
  total_jd: number;
  audio_cache_count: number;
  audio_cache_size_mb: number;
}

interface InterviewSession {
  id: number;
  user_id: number;
  job_id: string;
  job_title: string;
  status: 'active' | 'completed' | 'abandoned';
  started_at: string;
  completed_at?: string;
  overall_score?: number;
  technical_score?: number;
  communication_score?: number;
  logic_score?: number;
  experience_score?: number;
  attitude_score?: number;
  recommendation?: 'PASS' | 'CONDITIONAL_PASS' | 'FAIL';
  summary?: string;
  question_count: number;
  interview_mode: 'text' | 'voice';
  voice_type?: string;
  tab_switch_count: number;
  evaluation_status: string;
}

interface InterviewMessage {
  id: number;
  role: string;
  content: string;
  timestamp: string;
  question_type?: string;
  question_number?: number;
  score?: number;
  feedback?: string;
  has_audio: boolean;
}

interface InterviewTemplate {
  id: number;
  job_id: string;
  job_title: string;
  question_type: string;
  skill_category: string;
  difficulty_level: string;
  question_template: string;
  usage_count: number;
  avg_score?: number;
  created_at: string;
}

interface JDEntry {
  id: number;
  user_id: number;
  career_id?: string;
  raw_text: string;
  extracted_data?: any;
  source: string;
  created_at: string;
}

interface VoiceMetric {
  stage: string;
  avg_time: number;
  min_time: number;
  max_time: number;
  success_rate: number;
  total_count: number;
}

interface AudioCacheEntry {
  id: string;
  voice_type: string;
  audio_url: string;
  file_size_bytes?: number;
  duration_seconds?: number;
  access_count: number;
  created_at: string;
  last_accessed: string;
}

interface FeedbackEntry {
  id: number;
  session_id: number;
  user_id: number;
  question_quality?: number;
  ai_accuracy?: number;
  overall_experience?: number;
  comments?: string;
  suggestions?: string;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (d?: string) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const formatScore = (s?: number) => (s != null ? `${s.toFixed(1)}/10` : '—');

const formatDuration = (start: string, end?: string) => {
  if (!end) return '—';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return m > 0 ? `${m}p ${s}s` : `${s}s`;
};

const formatBytes = (bytes?: number) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const PAGE_SIZE = 20;

// ─── Badge Components ─────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    abandoned: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  };
  const label: Record<string, string> = {
    completed: 'Hoàn thành', active: 'Đang diễn ra', abandoned: 'Đã hủy',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {label[status] || status}
    </span>
  );
};

const RecommendBadge = ({ rec }: { rec?: string }) => {
  if (!rec) return <span className="text-gray-400 text-xs">—</span>;
  const map: Record<string, string> = {
    PASS: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
    CONDITIONAL_PASS: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    FAIL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  const label: Record<string, string> = {
    PASS: 'Đạt', CONDITIONAL_PASS: 'Có điều kiện', FAIL: 'Chưa đạt',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${map[rec] || 'bg-gray-100 text-gray-600'}`}>
      {label[rec] || rec}
    </span>
  );
};

const ModeBadge = ({ mode }: { mode: string }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
    mode === 'voice'
      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
      : 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'
  }`}>
    {mode === 'voice' ? <Mic size={10} /> : <MessageSquare size={10} />}
    {mode === 'voice' ? 'Voice' : 'Text'}
  </span>
);

const DifficultyBadge = ({ level }: { level: string }) => {
  const map: Record<string, string> = {
    easy: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    hard: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[level] || 'bg-gray-100 text-gray-600'}`}>
      {level === 'easy' ? 'Dễ' : level === 'medium' ? 'Trung bình' : level === 'hard' ? 'Khó' : level}
    </span>
  );
};

const StarRating = ({ value }: { value?: number }) => {
  if (!value) return <span className="text-gray-400 text-xs">—</span>;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={12} className={i <= value ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
      ))}
      <span className="text-xs text-gray-500 ml-1">{value}/5</span>
    </div>
  );
};

// ─── Stats Overview ───────────────────────────────────────────────────────────

const StatsOverview = ({ stats, loading }: { stats: InterviewStats | null; loading: boolean }) => {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-3" />
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  const completionRate = stats.total_sessions > 0
    ? ((stats.completed_sessions / stats.total_sessions) * 100).toFixed(1)
    : '0';
  const voiceRate = stats.total_sessions > 0
    ? ((stats.voice_sessions / stats.total_sessions) * 100).toFixed(1)
    : '0';

  const cards = [
    {
      label: 'Tổng phỏng vấn',
      value: stats.total_sessions.toLocaleString(),
      sub: `${stats.active_sessions} đang diễn ra`,
      gradient: 'from-blue-500 to-cyan-500',
      icon: <Users size={20} className="text-blue-500" />,
    },
    {
      label: 'Hoàn thành',
      value: stats.completed_sessions.toLocaleString(),
      sub: `${completionRate}% tỷ lệ hoàn thành`,
      gradient: 'from-green-500 to-emerald-500',
      icon: <CheckCircle size={20} className="text-green-500" />,
    },
    {
      label: 'Điểm trung bình',
      value: stats.avg_score > 0 ? `${stats.avg_score.toFixed(1)}/10` : '—',
      sub: `${stats.pass_count} đạt / ${stats.fail_count} chưa đạt`,
      gradient: 'from-indigo-500 to-purple-500',
      icon: <BarChart2 size={20} className="text-indigo-500" />,
    },
    {
      label: 'Voice Interviews',
      value: stats.voice_sessions.toLocaleString(),
      sub: `${voiceRate}% tổng phỏng vấn`,
      gradient: 'from-purple-500 to-pink-500',
      icon: <Mic size={20} className="text-purple-500" />,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {cards.map((c, i) => (
        <div key={i} className="relative bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${c.gradient}`} />
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">{c.label}</p>
            {c.icon}
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{c.value}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{c.sub}</p>
        </div>
      ))}
    </div>
  );
};

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

interface DeleteConfirm { type: string; id: number | string; label: string }

const DeleteModal = ({
  confirm, onCancel, onConfirm, deleting,
}: {
  confirm: DeleteConfirm;
  onCancel: () => void;
  onConfirm: () => void;
  deleting: boolean;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onCancel}>
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-gray-200 dark:border-gray-700 text-center" onClick={e => e.stopPropagation()}>
      <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
        <Trash2 size={22} className="text-red-500" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Xác nhận xóa</h3>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Bạn sắp xóa:</p>
      <p className="text-gray-800 dark:text-gray-200 text-sm font-semibold mb-4 break-all">{confirm.label}</p>
      <p className="text-red-500 text-xs mb-5">Hành động này không thể hoàn tác.</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 font-semibold text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          Huỷ
        </button>
        <button onClick={onConfirm} disabled={deleting} className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors disabled:opacity-50">
          {deleting ? 'Đang xóa...' : 'Xóa'}
        </button>
      </div>
    </div>
  </div>
);

// ─── Session Detail Modal ─────────────────────────────────────────────────────

const SessionDetailModal = ({ session, onClose }: { session: InterviewSession; onClose: () => void }) => {
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/api/admin/interview/sessions/${session.id}`);
        setMessages(res.data.messages || []);
      } catch {
        setMessages([]);
      } finally {
        setLoadingMsgs(false);
      }
    };
    load();
  }, [session.id]);

  const scores = [
    { label: 'Kỹ thuật', value: session.technical_score, color: 'bg-blue-500' },
    { label: 'Giao tiếp', value: session.communication_score, color: 'bg-green-500' },
    { label: 'Tư duy logic', value: session.logic_score, color: 'bg-purple-500' },
    { label: 'Kinh nghiệm', value: session.experience_score, color: 'bg-orange-500' },
    { label: 'Thái độ', value: session.attitude_score, color: 'bg-pink-500' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Chi tiết phỏng vấn #{session.id}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{session.job_title}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'User ID', value: `#${session.user_id}` },
              { label: 'Job ID', value: session.job_id },
              { label: 'Chế độ', value: <ModeBadge mode={session.interview_mode} /> },
              { label: 'Trạng thái', value: <StatusBadge status={session.status} /> },
              { label: 'Đánh giá', value: <RecommendBadge rec={session.recommendation} /> },
              { label: 'Số câu hỏi', value: session.question_count },
              { label: 'Bắt đầu', value: formatDate(session.started_at) },
              { label: 'Kết thúc', value: formatDate(session.completed_at) },
              { label: 'Thời lượng', value: formatDuration(session.started_at, session.completed_at) },
              { label: 'Chuyển tab', value: `${session.tab_switch_count} lần` },
              { label: 'Giọng nói', value: session.voice_type || '—' },
              { label: 'Trạng thái chấm', value: session.evaluation_status },
            ].map((item, i) => (
              <div key={i} className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{item.label}</p>
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{item.value}</div>
              </div>
            ))}
          </div>

          {/* Overall Score */}
          {session.overall_score != null && (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 border border-indigo-100 dark:border-indigo-800">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-indigo-800 dark:text-indigo-300">Điểm tổng thể</p>
                <span className="text-2xl font-black text-indigo-700 dark:text-indigo-400">{formatScore(session.overall_score)}</span>
              </div>
              <div className="space-y-2">
                {scores.map(s => s.value != null && (
                  <div key={s.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600 dark:text-gray-400">{s.label}</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{s.value.toFixed(1)}/10</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full ${s.color} rounded-full`} style={{ width: `${(s.value / 10) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {session.summary && (
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Tóm tắt đánh giá</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{session.summary}</p>
            </div>
          )}

          {/* Messages */}
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <MessageSquare size={16} />
              Lịch sử hội thoại ({messages.length} tin nhắn)
            </p>
            {loadingMsgs ? (
              <div className="flex items-center justify-center py-8 text-gray-400">
                <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mr-2" />
                Đang tải...
              </div>
            ) : messages.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Không có tin nhắn</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex gap-3 ${msg.role === 'interviewer' ? '' : 'flex-row-reverse'}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                      msg.role === 'interviewer' ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {msg.role === 'interviewer' ? 'AI' : 'U'}
                    </div>
                    <div className={`flex-1 max-w-[80%] ${msg.role === 'interviewer' ? '' : 'items-end flex flex-col'}`}>
                      <div className={`rounded-xl px-3 py-2 text-sm ${
                        msg.role === 'interviewer'
                          ? 'bg-indigo-50 dark:bg-indigo-900/20 text-gray-800 dark:text-gray-200'
                          : 'bg-green-50 dark:bg-green-900/20 text-gray-800 dark:text-gray-200'
                      }`}>
                        {msg.content}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400">{formatDate(msg.timestamp)}</span>
                        {msg.score != null && (
                          <span className="text-xs font-semibold text-indigo-600">Điểm: {msg.score.toFixed(1)}</span>
                        )}
                        {msg.has_audio && <Volume2 size={11} className="text-purple-400" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Tab: Sessions ────────────────────────────────────────────────────────────

const SessionsTab = () => {
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [detailSession, setDetailSession] = useState<InterviewSession | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { page, page_size: PAGE_SIZE };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (modeFilter) params.mode = modeFilter;
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;
      const res = await api.get('/api/admin/interview/sessions', { params });
      setSessions(res.data.items || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.total_pages || 1);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, modeFilter, fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = () => { setSearch(searchInput); setPage(1); };
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSearch(); };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await api.delete(`/api/admin/interview/sessions/${deleteConfirm.id}`);
      setDeleteConfirm(null);
      load();
    } catch {
      alert('Xóa thất bại');
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (modeFilter) params.mode = modeFilter;
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;
      const res = await api.get('/api/admin/interview/export/sessions', { responseType: 'blob', params });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `interview_sessions_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Export thất bại');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tìm theo nghề nghiệp, user ID..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>
          {/* Status */}
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="py-2 px-3 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="completed">Hoàn thành</option>
            <option value="active">Đang diễn ra</option>
            <option value="abandoned">Đã hủy</option>
          </select>
          {/* Mode */}
          <select
            value={modeFilter}
            onChange={e => { setModeFilter(e.target.value); setPage(1); }}
            className="py-2 px-3 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="">Tất cả chế độ</option>
            <option value="text">Text</option>
            <option value="voice">Voice</option>
          </select>
          {/* Date range */}
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-gray-400 flex-shrink-0" />
            <input
              type="date"
              value={fromDate}
              onChange={e => { setFromDate(e.target.value); setPage(1); }}
              className="py-2 px-3 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
            <span className="text-gray-400 text-sm">—</span>
            <input
              type="date"
              value={toDate}
              onChange={e => { setToDate(e.target.value); setPage(1); }}
              className="py-2 px-3 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>
          {/* Buttons */}
          <button onClick={handleSearch} className="px-4 py-2 bg-indigo-800 hover:bg-indigo-900 text-white text-sm font-semibold rounded-lg transition-colors">
            Tìm
          </button>
          {(search || statusFilter || modeFilter || fromDate || toDate) && (
            <button
              onClick={() => { setSearch(''); setSearchInput(''); setStatusFilter(''); setModeFilter(''); setFromDate(''); setToDate(''); setPage(1); }}
              className="px-3 py-2 border border-gray-200 dark:border-gray-600 text-sm rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Xóa lọc
            </button>
          )}
          <button onClick={load} className="p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Làm mới">
            <RefreshCw size={15} />
          </button>
          <button onClick={handleExport} disabled={exporting} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 dark:border-gray-600 text-sm rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50">
            <Download size={14} />
            {exporting ? 'Đang xuất...' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-500 dark:text-gray-400">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            Đang tải...
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <MessageSquare size={40} className="mb-3 opacity-40" />
            <p className="text-sm">Chưa có phỏng vấn nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 w-8">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">User</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Nghề nghiệp</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Chế độ</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Trạng thái</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Điểm</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Đánh giá</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Câu hỏi</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Thời gian</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {sessions.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs">
                      {(page - 1) * PAGE_SIZE + idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">#{s.user_id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-[180px]">
                        <p className="font-medium text-gray-800 dark:text-gray-200 truncate text-xs" title={s.job_title}>{s.job_title}</p>
                        <p className="text-xs text-gray-400">{s.job_id}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3"><ModeBadge mode={s.interview_mode} /></td>
                    <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                    <td className="px-4 py-3">
                      <span className={`font-bold text-sm ${
                        s.overall_score == null ? 'text-gray-400' :
                        s.overall_score >= 7 ? 'text-green-600 dark:text-green-400' :
                        s.overall_score >= 5 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-red-600 dark:text-red-400'
                      }`}>
                        {formatScore(s.overall_score)}
                      </span>
                    </td>
                    <td className="px-4 py-3"><RecommendBadge rec={s.recommendation} /></td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{s.question_count}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      <div>{formatDate(s.started_at)}</div>
                      {s.completed_at && (
                        <div className="text-gray-400 text-xs">{formatDuration(s.started_at, s.completed_at)}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setDetailSession(s)}
                          className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ type: 'session', id: s.id, label: `Session #${s.id} — ${s.job_title}` })}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Xóa"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Trang {page} / {totalPages} — {total} bản ghi</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <ChevronLeft size={15} /> Trước
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              Sau <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {deleteConfirm && (
        <DeleteModal confirm={deleteConfirm} onCancel={() => setDeleteConfirm(null)} onConfirm={handleDelete} deleting={deleting} />
      )}
      {detailSession && (
        <SessionDetailModal session={detailSession} onClose={() => setDetailSession(null)} />
      )}
    </div>
  );
};

// ─── Tab: Templates ───────────────────────────────────────────────────────────

const TemplatesTab = () => {
  const [templates, setTemplates] = useState<InterviewTemplate[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { page, page_size: PAGE_SIZE };
      if (search) params.search = search;
      const res = await api.get('/api/admin/interview/templates', { params });
      setTemplates(res.data.items || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.total_pages || 1);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await api.delete(`/api/admin/interview/templates/${deleteConfirm.id}`);
      setDeleteConfirm(null);
      load();
    } catch {
      alert('Xóa thất bại');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1); } }}
            placeholder="Tìm theo job title, loại câu hỏi..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
        </div>
        <button onClick={() => { setSearch(searchInput); setPage(1); }} className="px-4 py-2 bg-indigo-800 hover:bg-indigo-900 text-white text-sm font-semibold rounded-lg transition-colors">Tìm</button>
        <button onClick={load} className="p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><RefreshCw size={15} /></button>
        <span className="text-sm text-gray-500 dark:text-gray-400 ml-auto">{total} template</span>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-500 dark:text-gray-400">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            Đang tải...
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <FileText size={40} className="mb-3 opacity-40" />
            <p className="text-sm">Chưa có template nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 w-8">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Job</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Loại câu hỏi</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Danh mục kỹ năng</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Độ khó</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Số lần dùng</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Điểm TB</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Ngày tạo</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {templates.map((t, idx) => (
                  <>
                    <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3 text-gray-400 text-xs">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800 dark:text-gray-200 text-xs max-w-[140px] truncate" title={t.job_title}>{t.job_title}</p>
                        <p className="text-xs text-gray-400">{t.job_id}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded text-xs font-medium">{t.question_type}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{t.skill_category}</td>
                      <td className="px-4 py-3"><DifficultyBadge level={t.difficulty_level} /></td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm">{t.usage_count}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold text-sm ${t.avg_score == null ? 'text-gray-400' : t.avg_score >= 7 ? 'text-green-600' : t.avg_score >= 5 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {t.avg_score != null ? `${t.avg_score.toFixed(1)}/10` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(t.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                            title="Xem nội dung"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ type: 'template', id: t.id, label: `Template #${t.id} — ${t.job_title}` })}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Xóa"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === t.id && (
                      <tr key={`${t.id}-expand`} className="bg-indigo-50/50 dark:bg-indigo-900/10">
                        <td colSpan={9} className="px-6 py-4">
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Nội dung câu hỏi mẫu:</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-white dark:bg-gray-800 rounded-lg p-3 border border-indigo-100 dark:border-indigo-800">
                            {t.question_template}
                          </p>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Trang {page} / {totalPages} — {total} bản ghi</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <ChevronLeft size={15} /> Trước
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              Sau <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <DeleteModal confirm={deleteConfirm} onCancel={() => setDeleteConfirm(null)} onConfirm={handleDelete} deleting={deleting} />
      )}
    </div>
  );
};

// ─── Tab: JD Library ──────────────────────────────────────────────────────────

const JDLibraryTab = () => {
  const [jdList, setJdList] = useState<JDEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { page, page_size: PAGE_SIZE };
      if (search) params.search = search;
      const res = await api.get('/api/admin/interview/jd-library', { params });
      setJdList(res.data.items || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.total_pages || 1);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await api.delete(`/api/admin/interview/jd/${deleteConfirm.id}`);
      setDeleteConfirm(null);
      load();
    } catch {
      alert('Xóa thất bại');
    } finally {
      setDeleting(false);
    }
  };

  const getSourceBadge = (source: string) => {
    const map: Record<string, string> = {
      manual: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      file: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      upload: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    };
    return map[source] || 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1); } }}
            placeholder="Tìm theo career ID, user ID..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
        </div>
        <button onClick={() => { setSearch(searchInput); setPage(1); }} className="px-4 py-2 bg-indigo-800 hover:bg-indigo-900 text-white text-sm font-semibold rounded-lg transition-colors">Tìm</button>
        <button onClick={load} className="p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><RefreshCw size={15} /></button>
        <span className="text-sm text-gray-500 dark:text-gray-400 ml-auto">{total} JD</span>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-500 dark:text-gray-400">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            Đang tải...
          </div>
        ) : jdList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <FileText size={40} className="mb-3 opacity-40" />
            <p className="text-sm">Chưa có JD nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 w-8">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">User ID</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Career ID</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Nguồn</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Kỹ năng trích xuất</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Ngày tạo</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {jdList.map((jd, idx) => (
                  <>
                    <tr key={jd.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3 text-gray-400 text-xs">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                      <td className="px-4 py-3 text-xs font-medium text-gray-700 dark:text-gray-300">#{jd.user_id}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{jd.career_id || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getSourceBadge(jd.source)}`}>
                          {jd.source === 'manual' ? 'Nhập tay' : jd.source === 'file' || jd.source === 'upload' ? 'Upload file' : jd.source}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {jd.extracted_data?.required_skills?.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {jd.extracted_data.required_skills.slice(0, 3).map((s: string, i: number) => (
                              <span key={i} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">{s}</span>
                            ))}
                            {jd.extracted_data.required_skills.length > 3 && (
                              <span className="text-xs text-gray-400">+{jd.extracted_data.required_skills.length - 3}</span>
                            )}
                          </div>
                        ) : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(jd.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setExpandedId(expandedId === jd.id ? null : jd.id)}
                            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                            title="Xem nội dung JD"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ type: 'jd', id: jd.id, label: `JD #${jd.id} — User #${jd.user_id}` })}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Xóa"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === jd.id && (
                      <tr key={`${jd.id}-expand`} className="bg-gray-50/80 dark:bg-gray-900/30">
                        <td colSpan={7} className="px-6 py-4">
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Nội dung JD gốc:</p>
                          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 max-h-48 overflow-y-auto">
                            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{jd.raw_text}</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Trang {page} / {totalPages} — {total} bản ghi</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <ChevronLeft size={15} /> Trước
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              Sau <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <DeleteModal confirm={deleteConfirm} onCancel={() => setDeleteConfirm(null)} onConfirm={handleDelete} deleting={deleting} />
      )}
    </div>
  );
};

// ─── Tab: Voice Metrics ───────────────────────────────────────────────────────

const VoiceMetricsTab = () => {
  const [metrics, setMetrics] = useState<VoiceMetric[]>([]);
  const [cacheList, setCacheList] = useState<AudioCacheEntry[]>([]);
  const [cacheTotal, setCacheTotal] = useState(0);
  const [cacheTotalPages, setCacheTotalPages] = useState(1);
  const [cachePage, setCachePage] = useState(1);
  const [feedbackList, setFeedbackList] = useState<FeedbackEntry[]>([]);
  const [feedbackTotal, setFeedbackTotal] = useState(0);
  const [feedbackTotalPages, setFeedbackTotalPages] = useState(1);
  const [feedbackPage, setFeedbackPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [cacheLoading, setCacheLoading] = useState(true);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clearingCache, setClearingCache] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;
      const res = await api.get('/api/admin/interview/voice-metrics', { params });
      setMetrics(res.data.metrics || []);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  const loadCache = useCallback(async () => {
    setCacheLoading(true);
    try {
      const res = await api.get('/api/admin/interview/audio-cache', { params: { page: cachePage, page_size: PAGE_SIZE } });
      setCacheList(res.data.items || []);
      setCacheTotal(res.data.total || 0);
      setCacheTotalPages(res.data.total_pages || 1);
    } catch {
      setCacheList([]);
    } finally {
      setCacheLoading(false);
    }
  }, [cachePage]);

  const loadFeedback = useCallback(async () => {
    setFeedbackLoading(true);
    try {
      const res = await api.get('/api/admin/interview/feedback', { params: { page: feedbackPage, page_size: PAGE_SIZE } });
      setFeedbackList(res.data.items || []);
      setFeedbackTotal(res.data.total || 0);
      setFeedbackTotalPages(res.data.total_pages || 1);
    } catch {
      setFeedbackList([]);
    } finally {
      setFeedbackLoading(false);
    }
  }, [feedbackPage]);

  useEffect(() => { loadMetrics(); }, [loadMetrics]);
  useEffect(() => { loadCache(); }, [loadCache]);
  useEffect(() => { loadFeedback(); }, [loadFeedback]);

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      await api.delete('/api/admin/interview/audio-cache');
      setShowClearConfirm(false);
      loadCache();
    } catch {
      alert('Xóa cache thất bại');
    } finally {
      setClearingCache(false);
    }
  };

  const stageLabel: Record<string, string> = {
    stt: 'Speech-to-Text (STT)',
    ai: 'AI Processing',
    tts: 'Text-to-Speech (TTS)',
    total: 'Tổng thời gian',
  };

  const stageColor: Record<string, string> = {
    stt: 'from-blue-500 to-cyan-500',
    ai: 'from-purple-500 to-indigo-500',
    tts: 'from-green-500 to-emerald-500',
    total: 'from-orange-500 to-amber-500',
  };

  const stageIcon: Record<string, JSX.Element> = {
    stt: <Mic size={18} className="text-blue-500" />,
    ai: <Zap size={18} className="text-purple-500" />,
    tts: <Volume2 size={18} className="text-green-500" />,
    total: <Activity size={18} className="text-orange-500" />,
  };

  return (
    <div className="space-y-6">
      {/* Date filter */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-wrap gap-3 items-center">
        <Calendar size={15} className="text-gray-400" />
        <span className="text-sm text-gray-600 dark:text-gray-400">Lọc theo thời gian:</span>
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
          className="py-2 px-3 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600" />
        <span className="text-gray-400">—</span>
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
          className="py-2 px-3 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600" />
        <button onClick={loadMetrics} className="px-4 py-2 bg-indigo-800 hover:bg-indigo-900 text-white text-sm font-semibold rounded-lg transition-colors">Áp dụng</button>
        <button onClick={loadMetrics} className="p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><RefreshCw size={15} /></button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Voice Performance Cards */}
      <div>
        <h3 className="text-base font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
          <Activity size={18} className="text-indigo-600" />
          Hiệu suất xử lý Voice
        </h3>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-3" />
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : metrics.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-100 dark:border-gray-700">
            <Activity size={32} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-400">Chưa có dữ liệu voice metrics</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map(m => (
              <div key={m.stage} className="relative bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${stageColor[m.stage] || 'from-gray-400 to-gray-500'}`} />
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{stageLabel[m.stage] || m.stage}</p>
                  {stageIcon[m.stage] || <Activity size={18} className="text-gray-400" />}
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{m.avg_time.toFixed(0)}ms</p>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Min: {m.min_time.toFixed(0)}ms</span>
                    <span>Max: {m.max_time.toFixed(0)}ms</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${stageColor[m.stage] || 'from-gray-400 to-gray-500'} rounded-full`}
                        style={{ width: `${Math.min(m.success_rate, 100)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-bold ${m.success_rate >= 95 ? 'text-green-600' : m.success_rate >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {m.success_rate.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{m.total_count.toLocaleString()} lần xử lý</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Audio Cache */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Database size={18} className="text-indigo-600" />
            Audio Cache ({cacheTotal} files)
          </h3>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg text-sm font-semibold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            <Trash2 size={14} />
            Xóa toàn bộ cache
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
          {cacheLoading ? (
            <div className="flex items-center justify-center py-10 gap-3 text-gray-500 dark:text-gray-400">
              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              Đang tải...
            </div>
          ) : cacheList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <Database size={32} className="mb-2 opacity-40" />
              <p className="text-sm">Cache trống</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">ID</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Giọng nói</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Kích thước</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Thời lượng</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Lần truy cập</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Truy cập gần nhất</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Ngày tạo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {cacheList.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono">{c.id.slice(0, 8)}...</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          c.voice_type === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {c.voice_type === 'female' ? '👩 Nữ' : '👨 Nam'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{formatBytes(c.file_size_bytes)}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                        {c.duration_seconds != null ? `${c.duration_seconds.toFixed(1)}s` : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400 text-sm">{c.access_count}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(c.last_accessed)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(c.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {cacheTotalPages > 1 && (
          <div className="mt-3 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Trang {cachePage} / {cacheTotalPages} — {cacheTotal} files</span>
            <div className="flex gap-2">
              <button onClick={() => setCachePage(p => Math.max(1, p - 1))} disabled={cachePage <= 1}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <ChevronLeft size={15} /> Trước
              </button>
              <button onClick={() => setCachePage(p => Math.min(cacheTotalPages, p + 1))} disabled={cachePage >= cacheTotalPages}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                Sau <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Feedback */}
      <div>
        <h3 className="text-base font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
          <Star size={18} className="text-yellow-500" />
          Phản hồi người dùng ({feedbackTotal})
        </h3>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
          {feedbackLoading ? (
            <div className="flex items-center justify-center py-10 gap-3 text-gray-500 dark:text-gray-400">
              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              Đang tải...
            </div>
          ) : feedbackList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <Star size={32} className="mb-2 opacity-40" />
              <p className="text-sm">Chưa có phản hồi nào</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Session</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">User</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Chất lượng câu hỏi</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Độ chính xác AI</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Trải nghiệm tổng thể</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Nhận xét</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Ngày</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {feedbackList.map(f => (
                    <tr key={f.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3 text-xs font-medium text-indigo-600 dark:text-indigo-400">#{f.session_id}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">#{f.user_id}</td>
                      <td className="px-4 py-3"><StarRating value={f.question_quality} /></td>
                      <td className="px-4 py-3"><StarRating value={f.ai_accuracy} /></td>
                      <td className="px-4 py-3"><StarRating value={f.overall_experience} /></td>
                      <td className="px-4 py-3">
                        <div className="max-w-[200px]">
                          {f.comments ? (
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate" title={f.comments}>{f.comments}</p>
                          ) : <span className="text-gray-400 text-xs">—</span>}
                          {f.suggestions && (
                            <p className="text-xs text-blue-500 truncate mt-0.5" title={f.suggestions}>💡 {f.suggestions}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(f.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {feedbackTotalPages > 1 && (
          <div className="mt-3 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Trang {feedbackPage} / {feedbackTotalPages} — {feedbackTotal} phản hồi</span>
            <div className="flex gap-2">
              <button onClick={() => setFeedbackPage(p => Math.max(1, p - 1))} disabled={feedbackPage <= 1}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <ChevronLeft size={15} /> Trước
              </button>
              <button onClick={() => setFeedbackPage(p => Math.min(feedbackTotalPages, p + 1))} disabled={feedbackPage >= feedbackTotalPages}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                Sau <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Clear Cache Confirm */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowClearConfirm(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-gray-200 dark:border-gray-700 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Database size={22} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Xóa toàn bộ Audio Cache?</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Sẽ xóa <strong>{cacheTotal}</strong> file audio cache.</p>
            <p className="text-red-500 text-xs mb-5">Hành động này không thể hoàn tác. TTS sẽ cần tạo lại audio từ đầu.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 font-semibold text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Huỷ</button>
              <button onClick={handleClearCache} disabled={clearingCache} className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors disabled:opacity-50">
                {clearingCache ? 'Đang xóa...' : 'Xóa tất cả'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

type TabKey = 'sessions' | 'templates' | 'jd-library' | 'voice-metrics';

const TABS: { key: TabKey; label: string; icon: JSX.Element }[] = [
  { key: 'sessions',      label: 'Phiên phỏng vấn', icon: <MessageSquare size={16} /> },
  { key: 'templates',     label: 'Câu hỏi mẫu',     icon: <FileText size={16} /> },
  { key: 'jd-library',   label: 'Thư viện JD',      icon: <Database size={16} /> },
  { key: 'voice-metrics', label: 'Voice & Metrics',  icon: <Activity size={16} /> },
];

const AdminInterviewPage = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('sessions');
  const [stats, setStats] = useState<InterviewStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      setStatsLoading(true);
      try {
        const res = await api.get('/api/admin/interview/stats');
        setStats(res.data);
      } catch {
        // Stats không bắt buộc — fail silently
        setStats(null);
      } finally {
        setStatsLoading(false);
      }
    };
    loadStats();
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-gray-900 p-6">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
            <MessageSquare size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Quản lý Phỏng vấn AI</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Giám sát và quản lý toàn bộ hệ thống phỏng vấn AI
            </p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <StatsOverview stats={stats} loading={statsLoading} />

      {/* Quick Stats Row */}
      {stats && !statsLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Templates', value: stats.total_templates, icon: <FileText size={14} className="text-blue-500" />, color: 'text-blue-600 dark:text-blue-400' },
            { label: 'JD Library', value: stats.total_jd, icon: <Database size={14} className="text-purple-500" />, color: 'text-purple-600 dark:text-purple-400' },
            { label: 'Audio Cache', value: stats.audio_cache_count, icon: <Volume2 size={14} className="text-green-500" />, color: 'text-green-600 dark:text-green-400' },
            { label: 'Cache Size', value: `${stats.audio_cache_size_mb.toFixed(1)} MB`, icon: <TrendingUp size={14} className="text-orange-500" />, color: 'text-orange-600 dark:text-orange-400' },
          ].map((item, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl px-4 py-3 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                {item.icon}
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
                <p className={`text-base font-bold ${item.color}`}>{typeof item.value === 'number' ? item.value.toLocaleString() : item.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Tab Header */}
        <div className="border-b border-gray-100 dark:border-gray-700 px-2">
          <div className="flex overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-4 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px ${
                  activeTab === tab.key
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'sessions'      && <SessionsTab />}
          {activeTab === 'templates'     && <TemplatesTab />}
          {activeTab === 'jd-library'    && <JDLibraryTab />}
          {activeTab === 'voice-metrics' && <VoiceMetricsTab />}
        </div>
      </div>
    </div>
  );
};

export default AdminInterviewPage;
