import { useState, useEffect } from 'react';
import {
  Target, ClipboardList, Users, Calendar, Star, MessageCircle,
  Info, Check, X, Pin, BookOpen, CheckCheck
} from 'lucide-react';
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
  const colors = ['#6366f1','8b5cf6','ec4899','10b981','3b82f6','f59e0b','14b8a6'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color, color: 'fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: size * 0.35, flexShrink: 0 }}>
      {init}
    </div>
  );
}

/* ── StatusBadge ──────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    pending:   { label: 'Đang chờ',     bg: 'fef3c7', color: '#92400e' },
    accepted:  { label: 'Đã chấp nhận', bg: 'd1fae5', color: '#065f46' },
    rejected:  { label: 'Đã từ chối',   bg: 'fee2e2', color: '#991b1b' },
    confirmed: { label: 'Đã xác nhận',  bg: 'dbeafe', color: '#1e40af' },
    cancelled: { label: 'Đã huỷ',       bg: 'f3f4f6', color: '#6b7280' },
    completed: { label: 'Hoàn thành',   bg: 'd1fae5', color: '#065f46' },
  };
  const s = map[status] ?? { label: status, bg: 'f3f4f6', color: '#6b7280' };
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
  const [showMenteeForm, setShowMenteeForm] = useState(false);
  const [menteeForm, setMenteeForm] = useState<MenteeProfileCreate>({
    full_name: user?.email?.split('@')[0] || '',
    target_career: '', current_skills: [], desired_skills: [],
    learning_style: 'flexible', preferred_mentor_experience: 'senior',
  });
  const [menteeSaving, setMenteeSaving] = useState(false);
  const [menteeErr, setMenteeErr] = useState('');

  /* ── mentors ── */
  const [mentors, setMentors] = useState<MentorMatch[]>([]);
  const [mentorsLoading, setMentorsLoading] = useState(false);
  const [sentIds, setSentIds] = useState<Set<number>>(new Set());

  /* ── request modal ── */
  const [modalMentor, setModalMentor] = useState<MentorMatch | null>(null);
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
      // Check mentee profile
      try { await mentorMatchingService.getMenteeProfile(); setHasProfile(true); loadMentors(); return; } catch {}
      try {
        const auto = await mentorMatchingService.createMenteeFromProfile();
        if (auto.target_career || auto.desired_skills.length > 0) { setHasProfile(true); loadMentors(); return; }
      } catch {}
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
    try { setMentors(await mentorMatchingService.findMentors()); } catch {} finally { setMentorsLoading(false); }
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
    } catch {} finally { setReqLoading(false); }
  };

  const loadSessions = async () => {
    setSessionsLoading(true);
    try { setSessions(await scheduleService.mySessions()); } catch {} finally { setSessionsLoading(false); }
  };

  /* ── create mentee profile ── */
  const saveMenteeProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!menteeForm.full_name.trim() || !menteeForm.target_career.trim()) { setMenteeErr('Vui lòng điền đầy đủ thông tin bắt buộc.'); return; }
    if (menteeForm.desired_skills.length === 0) { setMenteeErr('Vui lòng nhập ít nhất 1 kỹ năng muốn học.'); return; }
    setMenteeSaving(true); setMenteeErr('');
    try {
      await mentorMatchingService.createOrUpdateMenteeProfile(menteeForm);
      setHasProfile(true); setShowMenteeForm(false); loadMentors();
    } catch (err: any) { setMenteeErr(err?.response?.data?.detail || 'Lưu thất bại.'); }
    finally { setMenteeSaving(false); }
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
      <div className="mm-page">

        {/* Hero */}
        <div className="mm-hero">
          <span className="mm-hero-badge">AI-Powered Matching</span>
          <h1>Tìm <span>Mentor</span> Phù Hợp</h1>
          <p>Kết nối với chuyên gia hàng đầu — được xếp hạng bởi AI dựa trên kỹ năng, nghề nghiệp và tính cách của bạn.</p>
        </div>

        <div className="mm-content">

          {/* Notice */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.85rem 1.1rem', marginBottom: '1.5rem', background: 'var(--neu-bg-card)', borderRadius: 12, boxShadow: 'var(--neu-raised-sm)', borderLeft: '3px solid f59e0b' }}>
            <Info size={18} className="flex-shrink-0 text-amber-500 mt-0.5" />
            <div style={{ fontSize: '0.83rem', color: 'var(--neu-text-muted)' }}>
              <strong style={{ color: 'var(--neu-text)' }}>Tính năng hỗ trợ:&nbsp;</strong>
              Gửi yêu cầu kết nối, nhắn tin và đặt lịch gặp với mentor. Hệ thống <strong>không</strong> bao gồm gọi video trực tuyến.
            </div>
          </div>

          {/* Tabs */}
          <div className="mm-tabs">
            <button className={`mm-tab${tab === 'find' ? ' active' : ''}`} onClick={() => setTab('find')}><Target size={14} className="inline mr-1.5" />Tìm Mentor</button>
            <button className={`mm-tab${tab === 'requests' ? ' active' : ''}`} onClick={() => setTab('requests')}>
              <ClipboardList size={14} className="inline mr-1.5" />Yêu cầu
              {(pendingMyReq + pendingIncoming) > 0 && <span className="mm-tab-count">{pendingMyReq + pendingIncoming}</span>}
            </button>
            <button className={`mm-tab${tab === 'mentees' ? ' active' : ''}`} onClick={() => setTab('mentees')}>
              <Users size={14} className="inline mr-1.5" />Mentee của tôi
              {mentees.length > 0 && <span className="mm-tab-count">{mentees.length}</span>}
            </button>
            <button className={`mm-tab${tab === 'schedule' ? ' active' : ''}`} onClick={() => setTab('schedule')}><Calendar size={14} className="inline mr-1.5" />Lịch hẹn</button>
            <button className={`mm-tab${tab === 'become' ? ' active' : ''}`} onClick={() => setTab('become')}>
              <Star size={14} className="inline mr-1.5" />{isMentor ? 'Hồ sơ Mentor' : 'Trở thành Mentor'}
            </button>
          </div>

          {/* ══════════ TAB: FIND MENTORS ══════════ */}
          {tab === 'find' && (
            <>
              {/* No profile */}
              {hasProfile === false && !showMenteeForm && (
                <div className="mm-setup-card">
                  <div className="mm-setup-icon">‍</div>
                  <h2>Hoàn thiện hồ sơ để tìm mentor</h2>
                  <p>Hệ thống cần dữ liệu từ kết quả <strong>bài đánh giá</strong> và <strong>CV đã upload</strong> để tự động tìm mentor phù hợp.</p>
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button className="mm-btn-secondary" onClick={() => setShowMenteeForm(true)}> Điền thủ công</button>
                    <button className="mm-btn-primary" onClick={() => window.location.href = '/assessment'}><Target size={14} className="inline mr-1" />Làm bài đánh giá</button>
                  </div>
                </div>
              )}

              {/* Mentee form */}
              {hasProfile === false && showMenteeForm && (
                <div className="mm-setup-card" style={{ maxWidth: 680, textAlign: 'left' }}>
                  <h2 style={{ marginBottom: '0.4rem' }}>Hồ sơ Mentee</h2>
                  <p style={{ marginBottom: '1.5rem', color: 'var(--neu-text-muted)', fontSize: '0.86rem' }}>Điền thông tin để AI ghép đôi với mentor phù hợp nhất</p>
                  {menteeErr && <div className="mm-error-banner">{menteeErr}</div>}
                  <form className="mm-form" onSubmit={saveMenteeProfile}>
                    <div className="mm-form-grid">
                      <div className="mm-form-group">
                        <label>Họ và tên *</label>
                        <input className="mm-input" value={menteeForm.full_name} onChange={e => setMenteeForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Nguyễn Văn A" required />
                      </div>
                      <div className="mm-form-group">
                        <label>Nghề nghiệp mục tiêu *</label>
                        <input className="mm-input" value={menteeForm.target_career} onChange={e => setMenteeForm(p => ({ ...p, target_career: e.target.value }))} placeholder="Software Engineer..." required />
                      </div>
                      <div className="mm-form-group">
                        <label>Phong cách học tập</label>
                        <select className="mm-select" value={menteeForm.learning_style} onChange={e => setMenteeForm(p => ({ ...p, learning_style: e.target.value }))}>
                          <option value="flexible">Linh hoạt</option>
                          <option value="structured">Có cấu trúc</option>
                          <option value="project-based">Dựa trên dự án</option>
                        </select>
                      </div>
                      <div className="mm-form-group">
                        <label>Kinh nghiệm mentor mong muốn</label>
                        <select className="mm-select" value={menteeForm.preferred_mentor_experience} onChange={e => setMenteeForm(p => ({ ...p, preferred_mentor_experience: e.target.value }))}>
                          <option value="junior">Junior (1-3 năm)</option>
                          <option value="senior">Senior (5+ năm)</option>
                          <option value="executive">Executive (10+ năm)</option>
                        </select>
                      </div>
                    </div>
                    <div className="mm-form-group">
                      <label>Kỹ năng hiện có</label>
                      <TagInput tags={menteeForm.current_skills} onChange={t => setMenteeForm(p => ({ ...p, current_skills: t }))} placeholder="Python, React… Enter để thêm" />
                    </div>
                    <div className="mm-form-group">
                      <label>Kỹ năng muốn học *</label>
                      <TagInput tags={menteeForm.desired_skills} onChange={t => setMenteeForm(p => ({ ...p, desired_skills: t }))} placeholder="Machine Learning, Docker… Enter để thêm" />
                      <span className="mm-hint">AI dùng danh sách này để tìm mentor phù hợp</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                      <button type="button" className="mm-btn-secondary" onClick={() => setShowMenteeForm(false)}>Huỷ</button>
                      <button type="submit" className="mm-btn-primary" disabled={menteeSaving}>{menteeSaving ? 'Đang lưu...' : 'Lưu & Tìm Mentor'}</button>
                    </div>
                  </form>
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
                              <ScoreBar label="Kỹ năng"   value={m.skill_match_score}  color="#8b5cf6" />
                              <ScoreBar label="Nghề nghiệp" value={m.career_match_score} color="#3b82f6" />
                              <ScoreBar label="Tính cách"  value={m.personality_score}  color="#10b981" />
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
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                            <button className={`mm-request-btn${isSent ? ' sent' : ''}`} disabled={isFull || isSent} onClick={() => { setModalMentor(m); setModalMsg('Xin chào! Tôi rất muốn học hỏi kinh nghiệm từ bạn. Bạn có thể trở thành mentor của tôi không?'); }} style={{ flex: 1 }}>
                              {isSent ? <><Check size={12} className="inline mr-1" />Đã gửi</> : isFull ? 'Đã đầy slot' : 'Gửi yêu cầu'}
                            </button>
                            <button title="Nhắn tin" onClick={() => setChatTarget({ userId: m.user_id, name: m.mentor_name })}
                              style={{ padding: '0 0.75rem', borderRadius: 10, border: '1.5px solid 3b82f6', background: 'rgba(59,130,246,0.08)', color: '#2563eb', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', flexShrink: 0, display:'flex', alignItems:'center' }}>
                              <MessageCircle size={16} />
                            </button>
                            <button title="Đặt lịch" onClick={() => setBookingTarget({ userId: m.user_id, name: m.mentor_name })}
                              style={{ padding: '0 0.75rem', borderRadius: 10, border: '1.5px solid 8b5cf6', background: 'rgba(139,92,246,0.08)', color: '#7c3aed', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', flexShrink: 0, display:'flex', alignItems:'center' }}>
                              <Calendar size={16} />
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
                  <div className="mm-empty-icon"></div>
                  <h3>Chưa tìm thấy mentor phù hợp</h3>
                  <p>Hãy cập nhật kỹ năng muốn học để AI tìm được mentor tốt hơn cho bạn.</p>
                  <button className="mm-btn-secondary" style={{ marginTop: '1rem' }} onClick={() => setShowMenteeForm(true)}> Cập nhật hồ sơ</button>
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
                              {r.response_message && <div className="mm-req-msg" style={{ color: r.status === 'accepted' ? '065f46' : '991b1b' }}>Phản hồi của bạn: "{r.response_message}"</div>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <StatusBadge status={r.status} />
                              {r.status === 'pending' && (
                                <>
                                  <button onClick={() => { setRespondModal({ req: r, action: 'accepted' }); setRespondMsg(''); }}
                                    style={{ padding: '0.35rem 0.85rem', borderRadius: 8, border: 'none', background: 'var(--color-success)', color: 'fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                                    <Check size={12} className="inline mr-1" />Chấp nhận
                                  </button>
                                  <button onClick={() => { setRespondModal({ req: r, action: 'rejected' }); setRespondMsg(''); }}
                                    style={{ padding: '0.35rem 0.85rem', borderRadius: 8, border: 'none', background: '#ef4444', color: 'fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                                    <X size={12} className="inline mr-1" />Từ chối
                                  </button>
                                </>
                              )}
                              {r.status === 'accepted' && (
                                <button onClick={() => setChatTarget({ userId: r.mentee_user_id || r.mentee_id, name: r.mentee_name || 'Mentee' })}
                                  style={{ padding: '0.35rem 0.85rem', borderRadius: 8, border: '1.5px solid 3b82f6', background: 'rgba(59,130,246,0.08)', color: '#2563eb', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
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
                        <div className="mm-empty-icon"><ClipboardList size={28} style={{ color:'var(--neu-accent)' }} /></div>
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
                                <div className="mm-req-msg" style={{ color: r.status === 'accepted' ? '065f46' : '991b1b' }}>
                                  Phản hồi: "{r.response_message}"
                                </div>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <StatusBadge status={r.status} />
                              {r.status === 'accepted' && (
                                <>
                                  <button onClick={() => setChatTarget({ userId: r.mentor_user_id || r.mentor_id, name: r.mentor_name || 'Mentor' })}
                                    style={{ padding: '0.35rem 0.85rem', borderRadius: 8, border: '1.5px solid 3b82f6', background: 'rgba(59,130,246,0.08)', color: '#2563eb', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                                    <MessageCircle size={14} className="inline mr-1" />Nhắn tin
                                  </button>
                                  <button onClick={() => setBookingTarget({ userId: r.mentor_id, name: r.mentor_name || 'Mentor' })}
                                    style={{ padding: '0.35rem 0.85rem', borderRadius: 8, border: '1.5px solid 8b5cf6', background: 'rgba(139,92,246,0.08)', color: '#7c3aed', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
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
                  <div className="mm-empty-icon"><Users size={28} style={{ color:'var(--neu-accent)' }} /></div>
                  <h3>Chưa có mentee nào</h3>
                  <p>Khi bạn chấp nhận yêu cầu từ mentee, họ sẽ hiển thị tại đây.</p>
                </div>
              )}
              {!reqLoading && mentees.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {mentees.map(r => (
                    <div key={r.id} style={{ background: 'var(--neu-bg-card)', borderRadius: 14, padding: '1.1rem 1.25rem', boxShadow: 'var(--neu-raised-sm)', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
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
                          style={{ padding: '0.45rem 1rem', borderRadius: 9, border: '1.5px solid 3b82f6', background: 'rgba(59,130,246,0.08)', color: '#2563eb', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <MessageCircle size={14} className="inline mr-1" />Nhắn tin
                        </button>
                        <button onClick={() => setBookingTarget({ userId: r.mentee_id, name: r.mentee_name || 'Mentee' })}
                          style={{ padding: '0.45rem 1rem', borderRadius: 9, border: '1.5px solid 8b5cf6', background: 'rgba(139,92,246,0.08)', color: '#7c3aed', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
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
                  <div className="mm-empty-icon"><Calendar size={28} style={{ color:'var(--neu-accent)' }} /></div>
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
                      <div key={s.id} style={{ background: 'var(--neu-bg-card)', borderRadius: 14, boxShadow: 'var(--neu-raised-sm)', padding: '1rem 1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        {/* Date block */}
                        <div style={{ minWidth: 56, textAlign: 'center', background: 'var(--neu-bg)', borderRadius: 10, padding: '0.5rem 0.25rem', boxShadow: 'var(--neu-pressed-sm)' }}>
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
                          {s.topic && <div style={{ fontSize: '0.85rem', color: 'var(--neu-text)', display:'flex', alignItems:'center', gap:4 }}><Pin size={12} />{s.topic}</div>}
                          {s.notes && <div style={{ fontSize: '0.8rem', color: 'var(--neu-text-muted)' }}>{s.notes}</div>}
                          {s.mentor_note && <div style={{ fontSize: '0.8rem', color: '#065f46', marginTop: '0.2rem', display:'flex', alignItems:'center', gap:4 }}><MessageCircle size={11} />{s.mentor_note}</div>}
                        </div>
                        {/* Actions */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flexShrink: 0 }}>
                          <button onClick={() => setChatTarget({ userId: isMentorRole ? s.mentee_id : s.mentor_id, name: isMentorRole ? s.mentee_name : s.mentor_name })}
                            style={{ padding: '0.35rem 0.75rem', borderRadius: 8, border: '1.5px solid 3b82f6', background: 'rgba(59,130,246,0.08)', color: '#2563eb', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>
                            <MessageCircle size={13} className="inline mr-1" />Chat
                          </button>
                          {isMentorRole && s.status === 'pending' && (
                            <>
                              <button disabled={sessionRespondingId === s.id} onClick={async () => { setSessionRespondingId(s.id); try { await scheduleService.respond(s.id, 'confirmed'); await loadSessions(); } catch {} finally { setSessionRespondingId(null); } }}
                                style={{ padding: '0.35rem 0.75rem', borderRadius: 8, border: 'none', background: 'var(--color-success)', color: 'fff', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display:'flex', alignItems:'center', gap:4 }}><Check size={12} />Xác nhận</button>
                              <button disabled={sessionRespondingId === s.id} onClick={async () => { setSessionRespondingId(s.id); try { await scheduleService.respond(s.id, 'cancelled'); await loadSessions(); } catch {} finally { setSessionRespondingId(null); } }}
                                style={{ padding: '0.35rem 0.75rem', borderRadius: 8, border: 'none', background: '#ef4444', color: 'fff', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display:'flex', alignItems:'center', gap:4 }}><X size={12} />Từ chối</button>
                            </>
                          )}
                          {(s.status === 'pending' || s.status === 'confirmed') && (
                            <button onClick={async () => { try { await scheduleService.cancel(s.id); await loadSessions(); } catch {} }}
                              style={{ padding: '0.35rem 0.75rem', borderRadius: 8, border: '1px solid d1d5db', background: '#f9fafb', color: '#374151', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }}>Huỷ</button>
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
              <div className="mm-mentor-card">
                <h2>{isMentor ? ' Chỉnh sửa hồ sơ Mentor' : ' Đăng ký trở thành Mentor'}</h2>
                <p>Hệ thống sẽ tự động lấy kỹ năng từ CV và ngành nghề từ kết quả đánh giá của bạn. Bạn chỉ cần bổ sung thêm nếu muốn.</p>

                {/* Auto-fill */}
                {!mentorSuccess && (
                  <div style={{ padding: '1rem', marginBottom: '1.5rem', background: 'var(--neu-bg)', borderRadius: 12, boxShadow: 'var(--neu-pressed-sm)', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
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
                {mentorErr    && <div className="mm-error-banner"> {mentorErr}</div>}

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
                style={{ padding: '0.55rem 1.25rem', borderRadius: 10, border: 'none', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', background: respondModal.action === 'accepted' ? '10b981' : 'ef4444', color: 'fff' }}>
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
