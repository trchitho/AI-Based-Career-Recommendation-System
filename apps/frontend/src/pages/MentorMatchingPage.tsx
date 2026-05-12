import { useState, useEffect } from 'react';
import {
  Target, ClipboardList, Users, Calendar, Star, MessageCircle,
  Info, Check, X, Pin, BookOpen, CheckCheck, Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';
import MainLayout from '../components/layout/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import {
  mentorMatchingService,
  MentorMatch,
  MentorshipRequest,
  MenteeProfileCreate,
  MentorProfileCreate,
} from '../services/mentorMatchingService';
import { scheduleService, MentorSession } from '../services/scheduleService';
import BookingModal from '../components/chat/BookingModal';
import ChatModal from '../components/chat/ChatModal';
import './MentorMatchingPage.css';
import './MentorMatchingPage-decorations.css';
import './MentorMatchingPage-hero.css';

type Tab = 'find' | 'requests' | 'mentees' | 'schedule' | 'become';

/* ── TagInput ─────────────────────────────────────────────────── */
function TagInput({ tags, onChange, placeholder }: { tags: string[]; onChange: (t: string[]) => void; placeholder: string }) {
  const [inp, setInp] = useState('');
  const add = () => { const v = inp.trim(); if (v && !tags.includes(v)) onChange([...tags, v]); setInp(''); };
  return (
    <div className="mm-tag-input-wrap">
      {tags.map(t => (
        <span key={t} className="mm-tag">{t}<button type="button" onClick={() => onChange(tags.filter(x => x !== t))}>×</button></span>
      ))}
      <input value={inp} onChange={e => setInp(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }}
        onBlur={add} placeholder={placeholder} />
    </div>
  );
}

/* ── ScoreBar ─────────────────────────────────────────────────── */
function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="mm-bar-row">
      <span className="mm-bar-label">{label}</span>
      <div className="mm-bar-track"><div className="mm-bar-fill" style={{ width: `${value}%`, background: color }} /></div>
      <span className="mm-bar-val">{Math.round(value)}%</span>
    </div>
  );
}

/* ── Avatar ───────────────────────────────────────────────────── */
function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const init = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  const colors = ['#6366f1', '8b5cf6', 'ec4899', '10b981', '3b82f6', 'f59e0b', '14b8a6'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: size * 0.35, flexShrink: 0 }}>
      {init}
    </div>
  );
}

/* ── StatusBadge ──────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    pending:   { label: 'Đang chờ',     bg: '#fef3c7', color: '#92400e' },
    accepted:  { label: 'Đã chấp nhận', bg: '#d1fae5', color: '#065f46' },
    rejected:  { label: 'Đã từ chối',   bg: '#fee2e2', color: '#991b1b' },
    confirmed: { label: 'Đã xác nhận',  bg: '#dbeafe', color: '#1e40af' },
    cancelled: { label: 'Đã huỷ',       bg: '#f3f4f6', color: '#6b7280' },
    completed: { label: 'Hoàn thành',   bg: '#d1fae5', color: '#065f46' },
  };
  const s = map[status] ?? { label: status, bg: '#f3f4f6', color: '#6b7280' };
  return (
    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 99, background: s.bg, color: s.color }}>{s.label}</span>
  );
}

/* ════════════════════════════════════════════════════════════════ */
const MentorMatchingPage = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('find');

  /* ── mentee profile ── */
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  /* ── mentors ── */
  const [mentors, setMentors] = useState<MentorMatch[]>([]);
  const [mentorsLoading, setMentorsLoading] = useState(false);
  const [sentIds, setSentIds] = useState<Set<number>>(new Set());

  /* ── request modal ── */
  const [modalMentor, setModalMentor] = useState<MentorMatch | null>(null);
  const [viewProfileMentor, setViewProfileMentor] = useState<MentorMatch | null>(null);
  const [modalMsg, setModalMsg] = useState('');
  const [modalSending, setModalSending] = useState(false);

  /* ── requests (both sides) ── */
  const [myRequests, setMyRequests] = useState<MentorshipRequest[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<MentorshipRequest[]>([]);
  const [reqLoading, setReqLoading] = useState(false);
  const [respondingId, setRespondingId] = useState<number | null>(null);
  const [respondModal, setRespondModal] = useState<{ req: MentorshipRequest; action: 'accepted' | 'rejected' } | null>(null);
  const [respondMsg, setRespondMsg] = useState('');

  /* ── mentees (accepted requests) ── */
  const [mentees, setMentees] = useState<MentorshipRequest[]>([]);

  /* ── schedule ── */
  const [sessions, setSessions] = useState<MentorSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [bookingTarget, setBookingTarget] = useState<{ userId: number; name: string } | null>(null);
  const [sessionRespondingId, setSessionRespondingId] = useState<number | null>(null);

  /* ── chat ── */
  const [chatTarget, setChatTarget] = useState<{ userId: number; name: string } | null>(null);

  /* ── mentor profile ── */
  const [mentorProfile, setMentorProfile] = useState<MentorProfileCreate>({
    full_name: user?.email?.split('@')[0] || '',
    current_position: '', company: '', bio: '', expertise_areas: [],
    experience_years: 0, available_hours_per_week: 2,
    preferred_communication: ['video', 'chat'], max_mentees: 5,
  });
  const [mentorSaving, setMentorSaving] = useState(false);
  const [mentorSuccess, setMentorSuccess] = useState('');
  const [mentorErr, setMentorErr] = useState('');
  const [isMentor, setIsMentor] = useState(false);

  /* ── init ── */
  useEffect(() => {
    (async () => {
      // Try existing mentee profile
      try { 
        await mentorMatchingService.getMenteeProfile(); 
        setHasProfile(true); 
        loadMentors(); 
        return; 
      } catch {}
      
      // Auto-create from user data (assessment + CV)
      try { 
        await mentorMatchingService.createMenteeFromProfile(); 
        setHasProfile(true);
        loadMentors();
        return;
      } catch {}
      
      // If we reach here, user has no profile and no CV/Assessment data
      setHasProfile(false);
    })();
  }, []);

  useEffect(() => {
    if (tab === 'requests' || tab === 'mentees') loadRequests();
    if (tab === 'schedule') loadSessions();
    if (tab === 'become') {
      mentorMatchingService.getMentorProfile()
        .then(mp => { setMentorProfile(prev => ({ ...prev, ...mp })); setIsMentor(true); })
        .catch(() => setIsMentor(false));
    }
  }, [tab]);

  const loadMentors = async () => {
    setMentorsLoading(true);
    try { setMentors(await mentorMatchingService.findMentors()); } catch { } finally { setMentorsLoading(false); }
  };

  const loadRequests = async () => {
    setReqLoading(true);
    try {
      const [mine, incoming] = await Promise.allSettled([
        mentorMatchingService.getMenteeRequests(),
        mentorMatchingService.getMentorRequests(),
      ]);
      if (mine.status === 'fulfilled') setMyRequests(mine.value);
      if (incoming.status === 'fulfilled') {
        setIncomingRequests(incoming.value);
        setMentees(incoming.value.filter(r => r.status === 'accepted'));
      }
    } catch { } finally { setReqLoading(false); }
  };

  const loadSessions = async () => {
    setSessionsLoading(true);
    try { setSessions(await scheduleService.mySessions()); } catch { } finally { setSessionsLoading(false); }
  };

  /* ── send request ── */
  const sendRequest = async () => {
    if (!modalMentor) return;
    setModalSending(true);
    try {
      await mentorMatchingService.sendMentorshipRequest(modalMentor.mentor_id, modalMsg);
      setSentIds(prev => new Set([...prev, modalMentor.mentor_id]));
      setModalMentor(null);
    } catch (err: any) { alert(err?.response?.data?.detail || 'Gửi thất bại.'); }
    finally { setModalSending(false); }
  };

  /* ── respond to incoming request ── */
  const respondRequest = async () => {
    if (!respondModal) return;
    setRespondingId(respondModal.req.id);
    try {
      await mentorMatchingService.respondToRequest(respondModal.req.id, respondModal.action, respondMsg);
      setRespondModal(null); setRespondMsg('');
      await loadRequests();
    } catch (err: any) { alert(err?.response?.data?.detail || 'Phản hồi thất bại.'); }
    finally { setRespondingId(null); }
  };

  /* ── save mentor profile ── */
  const saveMentorProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mentorProfile.full_name.trim() || !mentorProfile.current_position.trim()) { setMentorErr('Vui lòng điền đầy đủ thông tin bắt buộc.'); return; }
    setMentorSaving(true); setMentorErr(''); setMentorSuccess('');
    try {
      await mentorMatchingService.createOrUpdateMentorProfile(mentorProfile);
      setMentorSuccess('Hồ sơ mentor đã được lưu!'); setIsMentor(true);
    } catch (err: any) { setMentorErr(err?.response?.data?.detail || 'Lưu thất bại.'); }
    finally { setMentorSaving(false); }
  };

  const pendingIncoming = incomingRequests.filter(r => r.status === 'pending').length;
  const pendingMyReq = myRequests.filter(r => r.status === 'pending').length;

  /* ════════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════════ */
  return (
    <MainLayout>
      <div className="mm-page min-h-[calc(100vh-64px)] bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white relative overflow-x-hidden pb-20">
        
        <div className="absolute inset-0 bg-dot-pattern pointer-events-none z-0 opacity-60" />
        <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-indigo-400/5 rounded-full blur-[120px] pointer-events-none z-0" />
        <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-purple-400/5 rounded-full blur-[120px] pointer-events-none z-0" />
        {/* Decorative background elements */}
        <div className="mm-page-decorations">
          <div className="mm-decoration circle-1"></div>
          <div className="mm-decoration circle-2"></div>
          <div className="mm-decoration circle-3"></div>
          <div className="mm-decoration circle-4"></div>
          <div className="mm-decoration circle-5"></div>
          <div className="mm-decoration star-1">✦</div>
          <div className="mm-decoration star-2">✦</div>
          <div className="mm-decoration star-3">✦</div>
          <div className="mm-decoration curve-1"></div>
          <div className="mm-decoration curve-2"></div>
        </div>

        {/* Hero */}
        <div className="relative max-w-[1200px] mx-auto mb-8 py-20 px-5">
          {/* Decorative elements for hero */}
          <div className="absolute top-[10%] left-[8%] w-[150px] h-[150px] rounded-full opacity-20 pointer-events-none z-0" style={{ background: 'linear-gradient(135deg, #c4b5fd 0%, #ddd6fe 100%)' }}></div>
          <div className="absolute top-[15%] right-[12%] w-[100px] h-[100px] rounded-full opacity-15 pointer-events-none z-0" style={{ background: 'linear-gradient(135deg, #bfdbfe 0%, #dbeafe 100%)' }}></div>
          <div className="absolute bottom-[20%] left-[15%] w-[80px] h-[80px] rounded-full opacity-18 pointer-events-none z-0" style={{ background: 'linear-gradient(135deg, #e9d5ff 0%, #f3e8ff 100%)' }}></div>

          {/* Curved lines */}
          <div className="absolute top-[5%] left-[-5%] w-[400px] h-[400px] border-2 border-purple-200/30 rounded-full pointer-events-none z-0"></div>
          <div className="absolute bottom-[10%] right-[-8%] w-[350px] h-[350px] border-2 border-blue-200/25 rounded-full pointer-events-none z-0"></div>

          {/* Stars */}
          <div className="absolute top-[20%] right-[18%] text-purple-300/40 text-2xl pointer-events-none z-0">✦</div>
          <div className="absolute top-[60%] left-[12%] text-blue-300/35 text-xl pointer-events-none z-0">✦</div>
          <div className="absolute bottom-[25%] right-[10%] text-purple-200/40 text-lg pointer-events-none z-0">✦</div>

          <div className="absolute left-[25%] top-[50%] w-[600px] h-[600px] pointer-events-none z-0 opacity-100" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.12), transparent 30%)', filter: 'blur(100px)' }}>
            <motion.div animate={{ y: [0, -20, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="w-full h-full" />
          </div>
          <div className="absolute right-[20%] top-[70%] w-[500px] h-[500px] pointer-events-none z-0 opacity-100" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.10), transparent 30%)', filter: 'blur(120px)' }}>
            <motion.div animate={{ y: [0, 20, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="w-full h-full" />
          </div>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] border border-indigo-400/10 rounded-full pointer-events-none z-0" />
          <motion.div className="absolute left-[15%] top-[30%] w-2 h-2 bg-purple-400/40 rounded-full pointer-events-none z-0" style={{ filter: 'blur(2px)' }} animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.2, 1] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
          <motion.div className="absolute right-[18%] top-[40%] w-1.5 h-1.5 bg-blue-400/40 rounded-full pointer-events-none z-0" style={{ filter: 'blur(2px)' }} animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.2, 1] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.5 }} />
          <motion.div className="absolute left-[20%] top-[20%] text-purple-400/20 pointer-events-none z-0" animate={{ opacity: [0.2, 0.4, 0.2], y: [0, -10, 0], rotate: [0, 180, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}><Sparkles size={14} /></motion.div>
          <motion.div className="absolute right-[25%] top-[25%] text-purple-400/20 pointer-events-none z-0" animate={{ opacity: [0.2, 0.4, 0.2], y: [0, -10, 0], rotate: [0, 180, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}><Sparkles size={12} /></motion.div>
          <motion.div className="absolute left-1/2 bottom-[15%] text-purple-400/20 pointer-events-none z-0" animate={{ opacity: [0.2, 0.4, 0.2], y: [0, -10, 0], rotate: [0, 180, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 3 }}><Sparkles size={10} /></motion.div>

          <motion.div
            className="mm-hero-content relative z-10 text-center max-w-[1000px] mx-auto px-10 py-16"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.span
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-indigo-500 text-xs font-bold tracking-[0.08em] uppercase mb-6"
              style={{ boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <Sparkles size={12} />
              AI-POWERED MATCHING
            </motion.span>

            <motion.h1
              className="font-extrabold text-center tracking-tight mb-5"
              style={{
                fontSize: 'clamp(48px, 6vw, 78px)',
                lineHeight: '1.05',
                color: '#0F172A'
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              Tìm <motion.span
                className="inline-block bg-clip-text text-transparent"
                style={{
                  background: 'linear-gradient(90deg, #7C3AED 0%, #8B5CF6 50%, #6366F1 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 8px 25px rgba(124,58,237,0.15)',
                  backgroundSize: '200% 100%'
                }}
                animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >Mentor</motion.span> Phù Hợp
            </motion.h1>

            <motion.p
              className="text-lg text-center max-w-[760px] mx-auto"
              style={{
                color: '#64748B',
                lineHeight: '1.8'
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              Kết nối với chuyên gia hàng đầu — được xếp hạng bởi AI dựa trên kỹ năng, kinh nghiệm và tính cách của bạn.
            </motion.p>
          </motion.div>
        </div>

        <div className="mm-content">

          {/* Notice */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.85rem 1.1rem', marginBottom: '1.5rem', background: 'var(--neu-bg-card)', borderRadius: 12, boxShadow: 'var(--neu-raised-sm)', borderLeft: '3px solid #f59e0b' }}>
            <Info size={18} className="flex-shrink-0 text-amber-500 mt-0.5" />
            <div style={{ fontSize: '0.83rem', color: 'var(--neu-text-muted)' }}>
              <strong style={{ color: 'var(--neu-text)' }}>Tính năng hỗ trợ:&nbsp;</strong>
              Gửi yêu cầu kết nối, nhắn tin và đặt lịch gặp với mentor. Hệ thống <strong>không</strong> bao gồm gọi video trực tuyến.
            </div>
            <a href="/mentor-matching/learn-more" className="cta-link">Tìm hiểu thêm →</a>
          </div>

          {/* Tabs */}
          <div className="mm-tabs">
            <button className={`mm-tab${tab === 'find' ? ' active' : ''}`} onClick={() => setTab('find')}>
              <Target size={15} />Tìm Mentor
            </button>
            <button className={`mm-tab${tab === 'requests' ? ' active' : ''}`} onClick={() => setTab('requests')}>
              <ClipboardList size={15} />Yêu cầu
              {(pendingMyReq + pendingIncoming) > 0 && <span className="mm-tab-count">{pendingMyReq + pendingIncoming}</span>}
            </button>
            <button className={`mm-tab${tab === 'mentees' ? ' active' : ''}`} onClick={() => setTab('mentees')}>
              <Users size={15} />Mentee của tôi
              {mentees.length > 0 && <span className="mm-tab-count">{mentees.length}</span>}
            </button>
            <button className={`mm-tab${tab === 'schedule' ? ' active' : ''}`} onClick={() => setTab('schedule')}>
              <Calendar size={15} />Lịch hẹn
            </button>
            <button className={`mm-tab${tab === 'become' ? ' active' : ''}`} onClick={() => setTab('become')}>
              <Star size={15} />{isMentor ? 'Hồ sơ Mentor' : 'Trở thành Mentor'}
            </button>
          </div>

          {/* ══════════ TAB: FIND MENTORS ══════════ */}
          {tab === 'find' && (
            <>
              {/* No profile */}
              {hasProfile === false && (
                <div className="mm-setup-card">
                  <div className="mm-setup-icon">
                    <Users size={36} />
                  </div>
                  <h2>Hoàn thiện hồ sơ để tìm mentor</h2>
                  <p>Hệ thống AI yêu cầu kết quả từ <strong>Bài đánh giá tính cách</strong> và <strong>CV</strong> của bạn để có thể ghép đôi bạn với Mentor phù hợp nhất dựa trên điểm số RIASEC, Big Five và kỹ năng chuyên môn.</p>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '16px' }}>
                    <button className="mm-btn-secondary" onClick={() => window.location.href = '/cv-analysis'}>
                      <ClipboardList size={18} />
                      Cập nhật CV
                    </button>
                    <button className="mm-btn-gradient" onClick={() => window.location.href = '/assessment'}>
                      <Target size={18} />
                      Làm bài đánh giá
                    </button>
                  </div>
                </div>
              )}

              {/* Loading */}
              {hasProfile === true && mentorsLoading && (
                <div className="mm-loading"><div className="mm-spinner" /><span>AI đang phân tích và tìm mentor phù hợp...</span></div>
              )}

              {/* Mentor grid */}
              {hasProfile === true && !mentorsLoading && mentors.length > 0 && (
                <div className="mm-grid">
                  {mentors.map((m, i) => {
                    const initials = m.mentor_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
                    const isSent = sentIds.has(m.mentor_id);
                    const isFull = m.current_mentees_count >= m.max_mentees;
                    return (
                      <div key={m.mentor_id} className="mm-card" style={{ animationDelay: `${i * 0.06}s` }}>
                        <div className="mm-card-top">
                          <div className="mm-card-row1">
                            <div className="mm-avatar">{initials}</div>
                            <div className="mm-score-wrap">
                              <div className="mm-score-num">{Math.round(m.compatibility_score)}%</div>
                              <div className="mm-score-label">Match</div>
                            </div>
                          </div>
                          <div className="mm-card-name">{m.mentor_name}</div>
                          <div className="mm-card-sub">{m.current_position}</div>
                          <div className="mm-card-company">{m.company}{m.experience_years ? ` • ${m.experience_years} năm KN` : ''}</div>
                        </div>
                        <div className="mm-card-body">
                          {m.bio && <p className="mm-card-bio">{m.bio}</p>}
                          {m.expertise_areas.length > 0 && (
                            <div>
                              <div className="mm-section-label">Chuyên môn</div>
                              <div className="mm-tags">
                                {m.expertise_areas.slice(0, 4).map(s => <span key={s} className="mm-skill-tag">{s}</span>)}
                                {m.expertise_areas.length > 4 && <span className="mm-more-tag">+{m.expertise_areas.length - 4}</span>}
                              </div>
                            </div>
                          )}
                          <div>
                            <div className="mm-section-label">Độ phù hợp</div>
                            <div className="mm-score-bars">
                              <ScoreBar label="Kỹ năng" value={m.skill_match_score} color="#8b5cf6" />
                              <ScoreBar label="Nghề nghiệp" value={m.career_match_score} color="#3b82f6" />
                              <ScoreBar label="Tính cách" value={m.personality_score} color="#10b981" />
                            </div>
                          </div>
                          {m.matching_reasons.length > 0 && (
                            <div>
                              <div className="mm-section-label">Lý do phù hợp</div>
                              <ul className="mm-reasons">
                                {m.matching_reasons.slice(0, 2).map((r, j) => (
                                  <li key={j} className="mm-reason"><span className="mm-reason-dot" />{r}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div className="mm-avail">
                            <span>⏱ {m.available_hours_per_week}h/tuần</span>
                            <span><Users size={12} className="inline mr-1" />{m.current_mentees_count}/{m.max_mentees} mentees</span>
                          </div>
                          {/* Actions */}
                          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem' }}>
                            <button className={`mm-request-btn${isSent ? ' sent' : ''}`} disabled={isFull || isSent} onClick={() => { setModalMentor(m); setModalMsg('Xin chào! Tôi rất muốn học hỏi kinh nghiệm từ bạn. Bạn có thể trở thành mentor của tôi không?'); }} style={{ flex: 1, padding: '0.4rem' }}>
                              {isSent ? <><Check size={12} className="inline mr-1" />Đã gửi</> : isFull ? 'Đã đầy slot' : 'Gửi yêu cầu'}
                            </button>
                            <button title="Xem hồ sơ chi tiết" onClick={() => setViewProfileMentor(m)}
                              style={{ padding: '0 0.6rem', borderRadius: 10, border: '1.5px solid #10b981', background: 'rgba(16,185,129,0.08)', color: '#059669', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0, display:'flex', alignItems:'center', gap: '0.2rem' }}>
                              Hồ sơ
                            </button>
                            <button title="Nhắn tin" onClick={() => setChatTarget({ userId: m.user_id, name: m.mentor_name })}
                              style={{ padding: '0 0.5rem', borderRadius: 10, border: '1.5px solid #3b82f6', background: 'rgba(59,130,246,0.08)', color: '#2563eb', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0, display:'flex', alignItems:'center' }}>
                              <MessageCircle size={15} />
                            </button>
                            <button title="Đặt lịch" onClick={() => setBookingTarget({ userId: m.user_id, name: m.mentor_name })}
                              style={{ padding: '0 0.5rem', borderRadius: 10, border: '1.5px solid #8b5cf6', background: 'rgba(139,92,246,0.08)', color: '#7c3aed', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0, display:'flex', alignItems:'center' }}>
                              <Calendar size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {hasProfile === true && !mentorsLoading && mentors.length === 0 && (
                <div className="mm-empty">
                  <div className="mm-empty-icon">
                    <Users size={32} />
                  </div>
                  <h3>Chưa tìm thấy mentor phù hợp</h3>
                  <p>Hệ thống AI cần thêm thông tin để tìm kiếm tốt hơn. Hãy cập nhật CV và làm bài đánh giá tính cách.</p>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '24px' }}>
                    <button className="mm-btn-secondary" onClick={() => window.location.href = '/cv-analysis'}>
                      <ClipboardList size={18} />
                      Cập nhật CV
                    </button>
                    <button className="mm-btn-gradient" onClick={() => window.location.href = '/assessment'}>
                      <Target size={18} />
                      Làm bài đánh giá
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ══════════ TAB: REQUESTS ══════════ */}
          {tab === 'requests' && (
            <>
              {reqLoading && <div className="mm-loading"><div className="mm-spinner" /><span>Đang tải...</span></div>}

              {!reqLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  {/* Incoming requests (mentor view) */}
                  {incomingRequests.length > 0 && (
                    <div>
                      <h3 style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--neu-text)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        Yêu cầu nhận được
                        {pendingIncoming > 0 && <span className="mm-tab-count">{pendingIncoming}</span>}
                      </h3>
                      <div className="mm-req-list">
                        {incomingRequests.map(r => (
                          <div key={r.id} className="mm-req-item" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
                            <Avatar name={r.mentee_name || 'M'} />
                            <div className="mm-req-info" style={{ flex: 1, minWidth: 0 }}>
                              <div className="mm-req-name">{r.mentee_name || `Mentee ${r.mentee_id}`}</div>
                              <div className="mm-req-meta">{new Date(r.requested_at).toLocaleDateString('vi-VN')}</div>
                              {r.message && <div className="mm-req-msg">"{r.message}"</div>}
                              {r.response_message && <div className="mm-req-msg" style={{ color: r.status === 'accepted' ? '#065f46' : '#991b1b' }}>Phản hồi của bạn: "{r.response_message}"</div>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <StatusBadge status={r.status} />
                              {r.status === 'pending' && (
                                <>
                                  <button onClick={() => { setRespondModal({ req: r, action: 'accepted' }); setRespondMsg(''); }}
                                    style={{ padding: '0.35rem 0.85rem', borderRadius: 8, border: 'none', background: 'var(--color-success)', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                                    <Check size={12} className="inline mr-1" />Chấp nhận
                                  </button>
                                  <button onClick={() => { setRespondModal({ req: r, action: 'rejected' }); setRespondMsg(''); }}
                                    style={{ padding: '0.35rem 0.85rem', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                                    <X size={12} className="inline mr-1" />Từ chối
                                  </button>
                                </>
                              )}
                              {r.status === 'accepted' && (
                                <button onClick={() => setChatTarget({ userId: r.mentee_user_id || r.mentee_id, name: r.mentee_name || 'Mentee' })}
                                  style={{ padding: '0.35rem 0.85rem', borderRadius: 8, border: '1.5px solid #3b82f6', background: 'rgba(59,130,246,0.08)', color: '#2563eb', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                                  <MessageCircle size={14} className="inline mr-1" />Nhắn tin
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* My sent requests (mentee view) */}
                  <div>
                    <h3 style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--neu-text)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      Yêu cầu đã gửi
                      {pendingMyReq > 0 && <span className="mm-tab-count">{pendingMyReq}</span>}
                    </h3>
                    {myRequests.length === 0 ? (
                      <div className="mm-empty" style={{ padding: '2rem' }}>
                        <div className="mm-empty-icon"><ClipboardList size={28} style={{ color: 'var(--neu-accent)' }} /></div>
                        <h3>Chưa gửi yêu cầu nào</h3>
                        <p>Tìm và gửi yêu cầu đến mentor phù hợp từ tab "Tìm Mentor".</p>
                      </div>
                    ) : (
                      <div className="mm-req-list">
                        {myRequests.map(r => (
                          <div key={r.id} className="mm-req-item" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
                            <Avatar name={r.mentor_name || 'M'} />
                            <div className="mm-req-info" style={{ flex: 1, minWidth: 0 }}>
                              <div className="mm-req-name">{r.mentor_name || `Mentor ${r.mentor_id}`}</div>
                              <div className="mm-req-meta">
                                {r.mentor_position && `${r.mentor_position} · `}
                                {r.mentor_company && `${r.mentor_company} · `}
                                {new Date(r.requested_at).toLocaleDateString('vi-VN')}
                              </div>
                              {r.message && <div className="mm-req-msg">"{r.message}"</div>}
                              {r.response_message && (
                                <div className="mm-req-msg" style={{ color: r.status === 'accepted' ? '#065f46' : '#991b1b' }}>
                                  Phản hồi: "{r.response_message}"
                                </div>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <StatusBadge status={r.status} />
                              {r.status === 'accepted' && (
                                <>
                                  <button onClick={() => setChatTarget({ userId: r.mentor_user_id || r.mentor_id, name: r.mentor_name || 'Mentor' })}
                                    style={{ padding: '0.35rem 0.85rem', borderRadius: 8, border: '1.5px solid #3b82f6', background: 'rgba(59,130,246,0.08)', color: '#2563eb', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                                    <MessageCircle size={14} className="inline mr-1" />Nhắn tin
                                  </button>
                                  <button onClick={() => setBookingTarget({ userId: r.mentor_id, name: r.mentor_name || 'Mentor' })}
                                    style={{ padding: '0.35rem 0.85rem', borderRadius: 8, border: '1.5px solid #8b5cf6', background: 'rgba(139,92,246,0.08)', color: '#7c3aed', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                                    <Calendar size={14} className="inline mr-1" />Đặt lịch
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ══════════ TAB: MY MENTEES ══════════ */}
          {tab === 'mentees' && (
            <>
              {reqLoading && <div className="mm-loading"><div className="mm-spinner" /><span>Đang tải...</span></div>}
              {!reqLoading && mentees.length === 0 && (
                <div className="mm-empty">
                  <div className="mm-empty-icon"><Users size={28} style={{ color: 'var(--neu-accent)' }} /></div>
                  <h3>Chưa có mentee nào</h3>
                  <p>Khi bạn chấp nhận yêu cầu từ mentee, họ sẽ hiển thị tại đây.</p>
                </div>
              )}
              {!reqLoading && mentees.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {mentees.map(r => (
                    <div key={r.id} className="glass" style={{ borderRadius: 16, padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', border: '1px solid rgba(255,255,255,0.4)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                      <Avatar name={r.mentee_name || 'M'} size={44} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--neu-text)' }}>{r.mentee_name || `Mentee ${r.mentee_id}`}</div>
                        <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: 2 }}>
                          Kết nối từ {new Date(r.responded_at || r.requested_at).toLocaleDateString('vi-VN')}
                        </div>
                        {r.message && <div style={{ fontSize: '0.82rem', color: 'var(--neu-text-muted)', marginTop: '0.25rem', fontStyle: 'italic' }}>"{r.message}"</div>}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                        <button onClick={() => setChatTarget({ userId: r.mentee_user_id || r.mentee_id, name: r.mentee_name || 'Mentee' })}
                          style={{ padding: '0.45rem 1rem', borderRadius: 9, border: '1.5px solid #3b82f6', background: 'rgba(59,130,246,0.08)', color: '#2563eb', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <MessageCircle size={14} className="inline mr-1" />Nhắn tin
                        </button>
                        <button onClick={() => setBookingTarget({ userId: r.mentee_id, name: r.mentee_name || 'Mentee' })}
                          style={{ padding: '0.45rem 1rem', borderRadius: 9, border: '1.5px solid #8b5cf6', background: 'rgba(139,92,246,0.08)', color: '#7c3aed', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Calendar size={14} className="inline mr-1" />Đặt lịch
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ══════════ TAB: SCHEDULE ══════════ */}
          {tab === 'schedule' && (
            <>
              {sessionsLoading && <div className="mm-loading"><div className="mm-spinner" /><span>Đang tải lịch hẹn...</span></div>}
              {!sessionsLoading && sessions.length === 0 && (
                <div className="mm-empty">
                  <div className="mm-empty-icon"><Calendar size={28} style={{ color: 'var(--neu-accent)' }} /></div>
                  <h3>Chưa có lịch hẹn nào</h3>
                  <p>Nhấn nút <Calendar size={13} className="inline" /> trong danh sách mentor hoặc mentee để đặt lịch hẹn.</p>
                </div>
              )}
              {!sessionsLoading && sessions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {sessions.map(s => {
                    const dt = new Date(s.scheduled_at);
                    const isMentorRole = s.role === 'mentor';
                    const statusColors: Record<string, string> = { pending: 'f59e0b', confirmed: '10b981', cancelled: 'ef4444', completed: '6b7280' };
                    return (
                      <div key={s.id} className="glass" style={{ borderRadius: 16, padding: '1.25rem 1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap', border: '1px solid rgba(255,255,255,0.4)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                        {/* Date block */}
                        <div style={{ minWidth: 56, textAlign: 'center', background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(10px)', borderRadius: 12, padding: '0.5rem 0.25rem', border: '1px solid rgba(255,255,255,0.5)' }}>
                          <div style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1, color: '#8b5cf6' }}>{dt.getDate()}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--neu-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{dt.toLocaleString('vi-VN', { month: 'short' })}</div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--neu-text)', marginTop: 2 }}>{dt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--neu-text)' }}>
                              {isMentorRole ? s.mentee_name : s.mentor_name}
                            </span>
                            <StatusBadge status={s.status} />
                            <span style={{ fontSize: '0.75rem', color: 'var(--neu-text-muted)' }}>· {s.duration_minutes} phút · {isMentorRole ? 'Bạn là mentor' : 'Bạn là mentee'}</span>
                          </div>
                          {s.topic && <div style={{ fontSize: '0.85rem', color: 'var(--neu-text)', display: 'flex', alignItems: 'center', gap: 4 }}><Pin size={12} />{s.topic}</div>}
                          {s.notes && <div style={{ fontSize: '0.8rem', color: 'var(--neu-text-muted)' }}>{s.notes}</div>}
                          {s.mentor_note && <div style={{ fontSize: '0.8rem', color: '#065f46', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: 4 }}><MessageCircle size={11} />{s.mentor_note}</div>}
                        </div>
                        {/* Actions */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flexShrink: 0 }}>
                          <button onClick={() => setChatTarget({ userId: isMentorRole ? s.mentee_id : s.mentor_id, name: isMentorRole ? s.mentee_name : s.mentor_name })}
                            style={{ padding: '0.35rem 0.75rem', borderRadius: 8, border: '1.5px solid #3b82f6', background: 'rgba(59,130,246,0.08)', color: '#2563eb', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>
                            <MessageCircle size={13} className="inline mr-1" />Chat
                          </button>
                          {isMentorRole && s.status === 'pending' && (
                            <>
                              <button disabled={sessionRespondingId === s.id} onClick={async () => { setSessionRespondingId(s.id); try { await scheduleService.respond(s.id, 'confirmed'); await loadSessions(); } catch {} finally { setSessionRespondingId(null); } }}
                                style={{ padding: '0.35rem 0.75rem', borderRadius: 8, border: 'none', background: 'var(--color-success)', color: '#fff', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display:'flex', alignItems:'center', gap:4 }}><Check size={12} />Xác nhận</button>
                              <button disabled={sessionRespondingId === s.id} onClick={async () => { setSessionRespondingId(s.id); try { await scheduleService.respond(s.id, 'cancelled'); await loadSessions(); } catch {} finally { setSessionRespondingId(null); } }}
                                style={{ padding: '0.35rem 0.75rem', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display:'flex', alignItems:'center', gap:4 }}><X size={12} />Từ chối</button>
                            </>
                          )}
                          {(s.status === 'pending' || s.status === 'confirmed') && (
                            <button onClick={async () => { try { await scheduleService.cancel(s.id); await loadSessions(); } catch {} }}
                              style={{ padding: '0.35rem 0.75rem', borderRadius: 8, border: '1px solid #d1d5db', background: '#f9fafb', color: '#374151', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }}>Huỷ</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ══════════ TAB: BECOME MENTOR ══════════ */}
          {tab === 'become' && (
            <div className="mm-mentor-section">
              <div className="glass" style={{ borderRadius: 24, padding: '2rem', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 8px 32px rgba(0,0,0,0.04)' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>{isMentor ? ' Chỉnh sửa hồ sơ Mentor' : ' Đăng ký trở thành Mentor'}</h2>
                <p style={{ color: 'var(--neu-text-muted)', marginBottom: '1.5rem' }}>Hệ thống sẽ tự động lấy kỹ năng từ CV và ngành nghề từ kết quả đánh giá của bạn. Bạn chỉ cần bổ sung thêm nếu muốn.</p>

                {/* Auto-fill */}
                {!mentorSuccess && (
                  <div className="glass" style={{ padding: '1rem', marginBottom: '1.5rem', borderRadius: 12, display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', border: '1px solid rgba(255,255,255,0.3)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--neu-text)', marginBottom: '0.2rem' }}><BookOpen size={14} className="inline mr-1.5" />Tự động điền từ profile của bạn</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--neu-text-muted)' }}>Lấy kỹ năng từ CV đã upload + ngành nghề từ kết quả assessment</div>
                    </div>
                    <button type="button" className="mm-btn-secondary" disabled={mentorSaving}
                      onClick={async () => {
                        setMentorSaving(true); setMentorErr('');
                        try {
                          const data = await mentorMatchingService.createMentorFromProfile();
                          setMentorProfile(prev => ({ ...prev, full_name: data.full_name || prev.full_name, current_position: data.current_position || prev.current_position, expertise_areas: data.expertise_areas.length > 0 ? data.expertise_areas : prev.expertise_areas }));
                          setMentorSuccess('Đã tự động điền từ profile! Kiểm tra và lưu lại bên dưới.');
                        } catch { setMentorErr('Bạn chưa upload CV hoặc chưa hoàn thành assessment. Điền tay bên dưới.'); }
                        finally { setMentorSaving(false); }
                      }}>
                      {mentorSaving ? 'Đang lấy dữ liệu...' : ' Tự động điền'}
                    </button>
                  </div>
                )}

                {mentorSuccess && <div className="mm-success-banner"> {mentorSuccess}</div>}
                {mentorErr && <div className="mm-error-banner"> {mentorErr}</div>}

                <form className="mm-form" onSubmit={saveMentorProfile}>
                  <div className="mm-form-grid">
                    <div className="mm-form-group"><label>Họ và tên *</label><input className="mm-input" value={mentorProfile.full_name} onChange={e => setMentorProfile(p => ({ ...p, full_name: e.target.value }))} required /></div>
                    <div className="mm-form-group"><label>Vị trí hiện tại *</label><input className="mm-input" value={mentorProfile.current_position} onChange={e => setMentorProfile(p => ({ ...p, current_position: e.target.value }))} placeholder="Senior Software Engineer" required /></div>
                    <div className="mm-form-group"><label>Công ty</label><input className="mm-input" value={mentorProfile.company} onChange={e => setMentorProfile(p => ({ ...p, company: e.target.value }))} placeholder="Google, FPT Software..." /></div>
                    <div className="mm-form-group"><label>Số năm kinh nghiệm</label><input className="mm-input" type="number" min={0} max={50} value={mentorProfile.experience_years} onChange={e => setMentorProfile(p => ({ ...p, experience_years: +e.target.value }))} /></div>
                    <div className="mm-form-group"><label>Giờ/tuần có thể mentor</label><input className="mm-input" type="number" min={1} max={40} value={mentorProfile.available_hours_per_week} onChange={e => setMentorProfile(p => ({ ...p, available_hours_per_week: +e.target.value }))} /></div>
                    <div className="mm-form-group"><label>Số mentee tối đa</label><input className="mm-input" type="number" min={1} max={20} value={mentorProfile.max_mentees} onChange={e => setMentorProfile(p => ({ ...p, max_mentees: +e.target.value }))} /></div>
                  </div>
                  <div className="mm-form-group"><label>Giới thiệu bản thân</label><textarea className="mm-textarea" value={mentorProfile.bio} onChange={e => setMentorProfile(p => ({ ...p, bio: e.target.value }))} placeholder="Mô tả kinh nghiệm, chuyên môn và những gì bạn có thể chia sẻ..." rows={3} /></div>
                  <div className="mm-form-group">
                    <label>Lĩnh vực chuyên môn</label>
                    <TagInput tags={mentorProfile.expertise_areas} onChange={t => setMentorProfile(p => ({ ...p, expertise_areas: t }))} placeholder="Python, React, Machine Learning… Enter để thêm" />
                    <span className="mm-hint">AI dùng danh sách này để match với mentee</span>
                  </div>
                  <div className="mm-form-group">
                    <label>Hình thức liên lạc ưa thích</label>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      {['video', 'chat', 'email', 'phone'].map(opt => (
                        <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.88rem', color: 'var(--neu-text)' }}>
                          <input type="checkbox" checked={mentorProfile.preferred_communication.includes(opt)}
                            onChange={e => setMentorProfile(p => ({ ...p, preferred_communication: e.target.checked ? [...p.preferred_communication, opt] : p.preferred_communication.filter(x => x !== opt) }))} />
                          {opt.charAt(0).toUpperCase() + opt.slice(1)}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button type="submit" className="mm-btn-primary" disabled={mentorSaving} style={{ width: '100%' }}>
                      {mentorSaving ? 'Đang lưu...' : isMentor ? ' Cập nhật hồ sơ Mentor' : ' Đăng ký làm Mentor'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}

      {/* Send request modal */}
      {modalMentor && (
        <div className="mm-modal-overlay" onClick={() => setModalMentor(null)}>
          <div className="mm-modal" onClick={e => e.stopPropagation()}>
            <h3>Gửi yêu cầu đến {modalMentor.mentor_name}</h3>
            <p className="mm-modal-sub">{modalMentor.current_position} · {modalMentor.company}</p>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--neu-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Lời nhắn</label>
            <textarea className="mm-textarea" value={modalMsg} onChange={e => setModalMsg(e.target.value)} rows={4} style={{ marginTop: '0.4rem', marginBottom: 0 }} placeholder="Giới thiệu bản thân và lý do bạn muốn được mentor này hỗ trợ..." />
            <div className="mm-modal-actions">
              <button className="mm-btn-secondary" onClick={() => setModalMentor(null)}>Huỷ</button>
              <button className="mm-btn-primary" disabled={modalSending} onClick={sendRequest}>{modalSending ? 'Đang gửi...' : 'Gửi yêu cầu'}</button>
            </div>
          </div>
        </div>
      )}

      {/* View Mentor Profile modal */}
      {viewProfileMentor && (
        <div className="mm-modal-overlay" onClick={() => setViewProfileMentor(null)}>
          <div className="mm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 650 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <Avatar name={viewProfileMentor.mentor_name} size={60} />
                <div>
                  <h3 style={{ fontSize: '1.35rem', margin: 0, fontWeight: 800 }}>{viewProfileMentor.mentor_name}</h3>
                  <div style={{ color: 'var(--neu-text-muted)', fontWeight: 600, fontSize: '0.9rem' }}>{viewProfileMentor.current_position} {viewProfileMentor.company && `tại ${viewProfileMentor.company}`}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--neu-text-muted)', marginTop: '4px' }}>
                    {viewProfileMentor.experience_years ? `${viewProfileMentor.experience_years} năm kinh nghiệm` : ''} 
                    {viewProfileMentor.experience_years ? ' · ' : ''} 
                    {viewProfileMentor.available_hours_per_week}h/tuần
                  </div>
                </div>
              </div>
              <button className="mm-btn-icon" onClick={() => setViewProfileMentor(null)}><X size={20} /></button>
            </div>
            
            {viewProfileMentor.bio && (
              <div style={{ marginTop: '1.25rem' }}>
                <div className="mm-section-label">Giới thiệu bản thân</div>
                <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--neu-text)', padding: '0.75rem', background: 'var(--neu-bg-card)', borderRadius: 10, border: '1px solid rgba(0,0,0,0.05)' }}>{viewProfileMentor.bio}</p>
              </div>
            )}

            <div style={{ marginTop: '1.25rem' }}>
              <div className="mm-section-label">Lĩnh vực chuyên môn</div>
              <div className="mm-tags">
                {viewProfileMentor.expertise_areas.length > 0 
                  ? viewProfileMentor.expertise_areas.map(s => <span key={s} className="mm-skill-tag">{s}</span>) 
                  : <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '0.85rem' }}>Chưa cập nhật kỹ năng chi tiết</span>}
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', background: 'rgba(59,130,246,0.04)', padding: '1.25rem', borderRadius: 14, border: '1px solid rgba(59,130,246,0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div className="mm-section-label" style={{ margin: 0, color: '#2563eb', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Star size={16} /> Phân tích mức độ phù hợp bởi AI
                </div>
                <div style={{ background: '#3b82f6', color: '#fff', padding: '0.2rem 0.6rem', borderRadius: 20, fontWeight: 800, fontSize: '0.85rem' }}>Match {Math.round(viewProfileMentor.compatibility_score)}%</div>
              </div>
              
              <ul className="mm-reasons" style={{ marginTop: '0.8rem', marginBottom: '1.25rem' }}>
                {viewProfileMentor.matching_reasons.length > 0 
                  ? viewProfileMentor.matching_reasons.map((r, i) => <li key={i} className="mm-reason"><span className="mm-reason-dot" style={{ background: '#3b82f6' }} />{r}</li>)
                  : <li className="mm-reason"><span className="mm-reason-dot" style={{ background: '#9ca3af' }} />Hệ thống chưa tìm thấy lý do nổi bật</li>
                }
              </ul>

              <div className="mm-score-bars" style={{ borderTop: '1px dashed rgba(59,130,246,0.2)', paddingTop: '1.25rem' }}>
                <ScoreBar label="Kỹ năng" value={viewProfileMentor.skill_match_score} color="#8b5cf6" />
                <ScoreBar label="Nghề nghiệp" value={viewProfileMentor.career_match_score} color="#3b82f6" />
                <ScoreBar label="Tính cách" value={viewProfileMentor.personality_score} color="#10b981" />
              </div>
            </div>

            <div className="mm-modal-actions" style={{ marginTop: '1.5rem' }}>
              <button className="mm-btn-secondary" onClick={() => setViewProfileMentor(null)}>Đóng</button>
              <button className={`mm-request-btn${sentIds.has(viewProfileMentor.mentor_id) ? ' sent' : ''}`} disabled={viewProfileMentor.current_mentees_count >= viewProfileMentor.max_mentees || sentIds.has(viewProfileMentor.mentor_id)} onClick={() => { setViewProfileMentor(null); setModalMentor(viewProfileMentor); setModalMsg('Xin chào! Tôi rất muốn học hỏi kinh nghiệm từ bạn. Bạn có thể trở thành mentor của tôi không?'); }} style={{ minWidth: 160 }}>
                {sentIds.has(viewProfileMentor.mentor_id) ? 'Đã gửi yêu cầu' : viewProfileMentor.current_mentees_count >= viewProfileMentor.max_mentees ? 'Đã đầy slot' : 'Gửi yêu cầu kết nối'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Respond to request modal */}
      {respondModal && (
        <div className="mm-modal-overlay" onClick={() => setRespondModal(null)}>
          <div className="mm-modal" onClick={e => e.stopPropagation()}>
            <h3>{respondModal.action === 'accepted' ? 'Chấp nhận yêu cầu' : 'Từ chối yêu cầu'}</h3>
            <p className="mm-modal-sub">Từ: {respondModal.req.mentee_name}</p>
            {respondModal.req.message && <div className="mm-req-msg" style={{ marginBottom: '1rem' }}>"{respondModal.req.message}"</div>}
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--neu-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Lời nhắn phản hồi (tuỳ chọn)</label>
            <textarea className="mm-textarea" value={respondMsg} onChange={e => setRespondMsg(e.target.value)} rows={3} style={{ marginTop: '0.4rem', marginBottom: 0 }} placeholder={respondModal.action === 'accepted' ? 'Chào mừng! Tôi rất vui được hỗ trợ bạn...' : 'Cảm ơn bạn đã quan tâm, tuy nhiên...'} />
            <div className="mm-modal-actions">
              <button className="mm-btn-secondary" onClick={() => setRespondModal(null)}>Huỷ</button>
              <button disabled={respondingId === respondModal.req.id} onClick={respondRequest}
                style={{ padding: '0.55rem 1.25rem', borderRadius: 10, border: 'none', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', background: respondModal.action === 'accepted' ? '#10b981' : '#ef4444', color: '#fff' }}>
                {respondingId === respondModal.req.id ? 'Đang xử lý...' : respondModal.action === 'accepted' ? 'Xác nhận chấp nhận' : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking modal */}
      {bookingTarget && (
        <BookingModal mentorUserId={bookingTarget.userId} mentorName={bookingTarget.name}
          onClose={() => setBookingTarget(null)}
          onBooked={() => { setBookingTarget(null); if (tab === 'schedule') loadSessions(); }} />
      )}

      {/* Chat modal */}
      {chatTarget && (
        <ChatModal otherUserId={chatTarget.userId} otherName={chatTarget.name} onClose={() => setChatTarget(null)} />
      )}
    </MainLayout>
  );
};

export default MentorMatchingPage;
