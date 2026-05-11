import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Bot, User, Star, MessageSquare,
  Clock, ChevronDown, ChevronUp, Volume2, Award
} from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import { interviewService } from '../services/interviewService';

interface Message {
  id: number;
  role: 'ai' | 'user';
  content: string;
  audio_url: string | null;
  duration_seconds: number | null;
  transcript: string | null;
  question_type: string | null;
  question_number: number | null;
  score: number | null;
  feedback: string | null;
}

const Q_TYPE_LABEL: Record<string, string> = {
  greeting: 'Chào hỏi',
  warm_up: 'Khởi động',
  technical: 'Kỹ thuật',
  behavioral: 'Hành vi',
  situational: 'Tình huống',
  jd_specific: 'Theo JD',
  closing: 'Kết thúc',
};

const Q_TYPE_COLOR: Record<string, string> = {
  greeting: '#6366f1',
  warm_up: '#06b6d4',
  technical: '#f59e0b',
  behavioral: '#10b981',
  situational: '#8b5cf6',
  jd_specific: '#ec4899',
  closing: '#64748b',
};

const ScoreBadge = ({ score }: { score: number }) => {
  const color = score >= 4 ? '#10b981' : score >= 3 ? '#f59e0b' : '#ef4444';
  const label = score >= 4 ? 'Tốt' : score >= 3 ? 'Khá' : 'Cần cải thiện';
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
      style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
      <Star size={10} fill={color} />
      {score.toFixed(1)} — {label}
    </span>
  );
};

const InterviewConversationPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);
  const [expandedFeedback, setExpandedFeedback] = useState<Set<number>>(new Set());
  const [playingId, setPlayingId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      try {
        const res = await interviewService.getConversation(parseInt(sessionId));
        setData(res);
      } catch (e: any) {
        setError(e.message || 'Không thể tải cuộc trò chuyện');
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  const toggleFeedback = (id: number) => {
    setExpandedFeedback(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const playAudio = (id: number, url: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (playingId === id) {
      setPlayingId(null);
      return;
    }
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.play().catch(() => {});
    audio.onended = () => setPlayingId(null);
    setPlayingId(id);
  };

  const userMessages = data?.conversation?.filter((m: Message) => m.role === 'user') || [];
  const avgScore = userMessages.length > 0
    ? userMessages.filter((m: Message) => m.score != null).reduce((s: number, m: Message) => s + (m.score || 0), 0)
      / (userMessages.filter((m: Message) => m.score != null).length || 1)
    : null;

  if (loading) return (
    <MainLayout>
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-gray-500">Đang tải lịch sử...</p>
        </div>
      </div>
    </MainLayout>
  );

  if (error) return (
    <MainLayout>
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={() => navigate(-1)} className="text-indigo-600 hover:underline">← Quay lại</button>
        </div>
      </div>
    </MainLayout>
  );

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900 dark:text-white truncate">
              Lịch sử phỏng vấn #{sessionId}
            </h1>
            <p className="text-xs text-gray-500 flex items-center gap-2">
              <MessageSquare size={12} />
              {data?.total_messages || 0} tin nhắn
              <span className="text-gray-300">·</span>
              {data?.interview_mode === 'voice' ? '🎤 Giọng nói' : '⌨️ Text'}
              {data?.status === 'completed' && <span className="text-green-500">· Hoàn thành</span>}
            </p>
          </div>

          {/* Score summary */}
          {avgScore != null && (
            <div className={`flex-shrink-0 text-center px-3 py-1.5 rounded-xl border ${
              avgScore >= 4
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : avgScore >= 3
                  ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
              <div className={`text-lg font-black ${
                avgScore >= 4 ? 'text-green-700 dark:text-green-400'
                : avgScore >= 3 ? 'text-amber-600 dark:text-amber-400'
                : 'text-red-600 dark:text-red-400'
              }`}>
                {avgScore.toFixed(1)}
              </div>
              <div className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">Điểm TB</div>
            </div>
          )}
        </div>

        {/* Conversation */}
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {(data?.conversation || []).map((msg: Message) => (
            <div key={msg.id}>
              {/* AI message */}
              {msg.role === 'ai' && (
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                    <Bot size={18} className="text-white" />
                  </div>
                  <div className="flex-1 max-w-[85%]">
                    {/* Question type badge */}
                    {msg.question_type && msg.question_type !== 'greeting' && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="w-2 h-2 rounded-full"
                          style={{ background: Q_TYPE_COLOR[msg.question_type] || '#6366f1' }} />
                        <span className="text-[11px] font-bold uppercase tracking-wide"
                          style={{ color: Q_TYPE_COLOR[msg.question_type] || '#6366f1' }}>
                          {Q_TYPE_LABEL[msg.question_type] || msg.question_type}
                          {msg.question_number ? ` · Câu ${msg.question_number}` : ''}
                        </span>
                      </div>
                    )}
                    {/* Bubble */}
                    <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                      <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{msg.content}</p>
                    </div>
                    {/* Audio */}
                    {msg.audio_url && (
                      <button
                        onClick={() => playAudio(msg.id, msg.audio_url!)}
                        className="mt-1.5 flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                        <Volume2 size={12} />
                        {playingId === msg.id ? 'Đang phát...' : 'Nghe lại'}
                        {msg.duration_seconds && <span className="text-gray-400">({msg.duration_seconds.toFixed(1)}s)</span>}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* User message */}
              {msg.role === 'user' && (
                <div className="flex gap-3 justify-end">
                  <div className="flex-1 max-w-[85%] flex flex-col items-end">
                    {/* Score */}
                    {msg.score != null && (
                      <div className="mb-1.5">
                        <ScoreBadge score={msg.score} />
                      </div>
                    )}
                    {/* Bubble */}
                    <div className="rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-white leading-relaxed"
                      style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                      {msg.content || <span className="italic opacity-60">Không có nội dung</span>}
                    </div>
                    {/* Audio duration */}
                    {msg.duration_seconds && (
                      <span className="mt-1 text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={10} /> {msg.duration_seconds.toFixed(1)}s
                      </span>
                    )}
                    {/* Feedback */}
                    {msg.feedback && (
                      <div className="mt-2 w-full">
                        <button
                          onClick={() => toggleFeedback(msg.id)}
                          className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold hover:text-indigo-800">
                          <Award size={12} />
                          Phản hồi AI
                          {expandedFeedback.has(msg.id) ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                        {expandedFeedback.has(msg.id) && (
                          <div className="mt-1.5 p-3 rounded-xl text-xs text-gray-700 dark:text-gray-300 leading-relaxed"
                            style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
                            {msg.feedback}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <User size={18} className="text-gray-500 dark:text-gray-400" />
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Empty state */}
          {(!data?.conversation || data.conversation.length === 0) && (
            <div className="text-center py-16">
              <MessageSquare size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">Chưa có tin nhắn nào</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default InterviewConversationPage;
