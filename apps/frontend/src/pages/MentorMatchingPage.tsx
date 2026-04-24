import { useState, useEffect, useRef } from 'react';
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
import './MentorMatchingPage.css';

type Tab = 'find' | 'requests' | 'become' | 'schedule';

/* ── tag-input helper ── */
function TagInput({
  tags, onChange, placeholder,
}: { tags: string[]; onChange: (t: string[]) => void; placeholder: string }) {
  const [inp, setInp] = useState('');
  const add = () => {
    const v = inp.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setInp('');
  };
  const remove = (t: string) => onChange(tags.filter(x => x !== t));
  return (
    <div className="mm-tag-input-wrap">
      {tags.map(t => (
        <span key={t} className="mm-tag">
          {t}
          <button type="button" onClick={() => remove(t)}>×</button>
        </span>
      ))}
      <input
        value={inp}
        onChange={e => setInp(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }}
        onBlur={add}
        placeholder={placeholder}
      />
    </div>
  );
}

/* ── score bar ── */
function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="mm-bar-row">
      <span className="mm-bar-label">{label}</span>
      <div className="mm-bar-track">
        <div className="mm-bar-fill" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="mm-bar-val">{Math.round(value)}%</span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════ */
const MentorMatchingPage = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('find');

  /* ── mentee profile state ── */
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [showForm, setShowForm]     = useState(false);
  const [formSaving, setFormSaving] = useState(false);
  const [formErr, setFormErr]       = useState('');
  const [menteeForm, setMenteeForm] = useState<MenteeProfileCreate>({
    full_name: user?.email?.split('@')[0] || '',
    target_career: '',
    current_skills: [],
    desired_skills: [],
    learning_style: 'flexible',
    preferred_mentor_experience: 'senior',
  });

  /* ── mentors ── */
  const [mentors, setMentors]       = useState<MentorMatch[]>([]);
  const [mentorsLoading, setMentorsLoading] = useState(false);
  const [sentIds, setSentIds]       = useState<Set<number>>(new Set());

  /* ── request modal ── */
  const [modalMentor, setModalMentor] = useState<MentorMatch | null>(null);
  const [modalMsg, setModalMsg]       = useState('');
  const [modalSending, setModalSending] = useState(false);

  /* ── my requests ── */
  const [myRequests, setMyRequests] = useState<MentorshipRequest[]>([]);
  const [reqLoading, setReqLoading] = useState(false);

  /* ── schedule ── */
  const [sessions, setSessions] = useState<MentorSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [bookingTarget, setBookingTarget] = useState<{ userId: number; name: string } | null>(null);
  const [respondingId, setRespondingId] = useState<number | null>(null);

  /* ── become mentor form ── */
  const [mentorProfile, setMentorProfile] = useState<MentorProfileCreate>({
    full_name: user?.email?.split('@')[0] || '',
    current_position: '',
    company: '',
    bio: '',
    expertise_areas: [],
    experience_years: 0,
    available_hours_per_week: 2,
    preferred_communication: ['video', 'chat'],
    max_mentees: 5,
  });
  const [mentorSaving, setMentorSaving] = useState(false);
  const [mentorSuccess, setMentorSuccess] = useState('');
  const [mentorErr, setMentorErr]       = useState('');

  /* ── init ── */
  useEffect(() => {
    (async () => {
      // 1. Try to get existing mentee profile
      try {
        await mentorMatchingService.getMenteeProfile();
        setHasProfile(true);
        loadMentors();
        return;
      } catch { /* no profile yet */ }

      // 2. Auto-create from user's assessment + skill gap data (silent)
      try {
        const auto = await mentorMatchingService.createMenteeFromProfile();
        if (auto.target_career || auto.desired_skills.length > 0) {
          setHasProfile(true);
          loadMentors();
          return;
        }
      } catch { /* user has no assessment/CV data yet */ }

      // 3. Need manual setup
      setHasProfile(false);
    })();

    // Mentor profile is loaded lazily when user opens the "Become Mentor" tab
  }, []);

  useEffect(() => {
    if (tab === 'requests') loadRequests();
    if (tab === 'schedule') loadSessions();
    if (tab === 'become') {
      mentorMatchingService.getMentorProfile()
        .then(mp => setMentorProfile(prev => ({ ...prev, ...mp })))
        .catch(() => { /* no mentor profile yet */ });
    }
  }, [tab]);

  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const data = await scheduleService.mySessions();
      setSessions(data);
    } catch { /* ignore */ } finally {
      setSessionsLoading(false);
    }
  };

  const loadMentors = async () => {
    setMentorsLoading(true);
    try {
      const data = await mentorMatchingService.findMentors();
      setMentors(data);
    } catch { /* ignore */ } finally {
      setMentorsLoading(false);
    }
  };

  const loadRequests = async () => {
    setReqLoading(true);
    try {
      const data = await mentorMatchingService.getMenteeRequests();
      setMyRequests(data);
    } catch { /* ignore */ } finally {
      setReqLoading(false);
    }
  };

  /* ── create mentee profile ── */
  const handleSaveMenteeProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!menteeForm.full_name.trim() || !menteeForm.target_career.trim()) {
      setFormErr('Vui lòng điền đầy đủ thông tin bắt buộc.');
      return;
    }
    if (menteeForm.desired_skills.length === 0) {
      setFormErr('Vui lòng nhập ít nhất 1 kỹ năng muốn học.');
      return;
    }
    setFormSaving(true);
    setFormErr('');
    try {
      await mentorMatchingService.createOrUpdateMenteeProfile(menteeForm);
      setHasProfile(true);
      setShowForm(false);
      loadMentors();
    } catch (err: any) {
      setFormErr(err?.response?.data?.detail || 'Lưu thất bại, thử lại.');
    } finally {
      setFormSaving(false);
    }
  };

  /* ── send request ── */
  const openModal = (mentor: MentorMatch) => {
    setModalMentor(mentor);
    setModalMsg('Xin chào! Tôi rất muốn học hỏi kinh nghiệm từ bạn. Bạn có thể trở thành mentor của tôi không?');
  };

  const handleSendRequest = async () => {
    if (!modalMentor) return;
    setModalSending(true);
    try {
      await mentorMatchingService.sendMentorshipRequest(modalMentor.mentor_id, modalMsg);
      setSentIds(prev => new Set([...prev, modalMentor.mentor_id]));
      setModalMentor(null);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Gửi yêu cầu thất bại.');
    } finally {
      setModalSending(false);
    }
  };

  /* ── save mentor profile ── */
  const handleSaveMentorProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mentorProfile.full_name.trim() || !mentorProfile.current_position.trim()) {
      setMentorErr('Vui lòng điền đầy đủ thông tin bắt buộc.');
      return;
    }
    setMentorSaving(true);
    setMentorErr('');
    setMentorSuccess('');
    try {
      await mentorMatchingService.createOrUpdateMentorProfile(mentorProfile);
      setMentorSuccess('Hồ sơ mentor đã được lưu thành công!');
    } catch (err: any) {
      setMentorErr(err?.response?.data?.detail || 'Lưu thất bại, thử lại.');
    } finally {
      setMentorSaving(false);
    }
  };

  const pendingCount = myRequests.filter(r => r.status === 'pending').length;

  /* ════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════ */
  return (
    <MainLayout>
      <div className="mm-page">

        {/* ── Hero ── */}
        <div className="mm-hero">
          <span className="mm-hero-badge">AI-Powered Matching</span>
          <h1>Tìm <span>Mentor</span> Phù Hợp</h1>
          <p>Kết nối với chuyên gia hàng đầu — được xếp hạng bởi AI dựa trên kỹ năng, nghề nghiệp và tính cách của bạn.</p>
          <div className="mm-stats">
            <div className="mm-stat">
              <span className="mm-stat-num">{mentors.length || '—'}</span>
              <span className="mm-stat-label">Mentors phù hợp</span>
            </div>
            <div className="mm-stat">
              <span className="mm-stat-num">3</span>
              <span className="mm-stat-label">Tiêu chí matching</span>
            </div>
            <div className="mm-stat">
              <span className="mm-stat-num">AI</span>
              <span className="mm-stat-label">Thuật toán phân tích</span>
            </div>
          </div>
        </div>

        <div className="mm-content">

          {/* ── Feature scope notice ── */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
            padding: '0.85rem 1.1rem', marginBottom: '1.5rem',
            background: 'var(--neu-bg-card)',
            borderRadius: 12,
            boxShadow: 'var(--neu-raised-sm)',
            borderLeft: '3px solid #f59e0b',
          }}>
            <span style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: '0.05rem' }}>ℹ️</span>
            <div>
              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--neu-text)' }}>
                Tính năng được hỗ trợ:&nbsp;
              </span>
              <span style={{ fontSize: '0.83rem', color: 'var(--neu-text-muted)' }}>
                Gửi yêu cầu kết nối, nhắn tin và đặt lịch gặp với mentor.
                Hệ thống <strong style={{ color: 'var(--neu-text)' }}>không</strong> bao gồm gọi video trực tuyến (real-time video call).
              </span>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="mm-tabs">
            <button className={`mm-tab${tab === 'find' ? ' active' : ''}`} onClick={() => setTab('find')}>
              🎯 Tìm Mentor
            </button>
            <button className={`mm-tab${tab === 'requests' ? ' active' : ''}`} onClick={() => setTab('requests')}>
              📋 Yêu cầu của tôi
              {pendingCount > 0 && <span className="mm-tab-count">{pendingCount}</span>}
            </button>
            <button className={`mm-tab${tab === 'schedule' ? ' active' : ''}`} onClick={() => setTab('schedule')}>
              📅 Lịch hẹn
            </button>
            <button className={`mm-tab${tab === 'become' ? ' active' : ''}`} onClick={() => setTab('become')}>
              🌟 Trở thành Mentor
            </button>
          </div>

          {/* ══════════════════════════════════
              TAB 1 — Find Mentors
              ══════════════════════════════════ */}
          {tab === 'find' && (
            <>
              {/* No profile yet */}
              {hasProfile === false && !showForm && (
                <div className="mm-setup-card">
                  <div className="mm-setup-icon">🧑‍💼</div>
                  <h2>Hoàn thành assessment trước</h2>
                  <p>
                    Hệ thống cần dữ liệu từ kết quả <strong>bài đánh giá</strong> và <strong>CV đã upload</strong> để tự động tìm mentor phù hợp.
                    Nếu chưa có, bạn có thể điền thủ công.
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button className="mm-btn-secondary" onClick={() => setShowForm(true)}>
                      ✏️ Điền thủ công
                    </button>
                    <button className="mm-btn-primary" onClick={() => window.location.href = '/assessment'}>
                      🎯 Làm bài đánh giá
                    </button>
                  </div>
                </div>
              )}

              {/* Mentee profile form */}
              {hasProfile === false && showForm && (
                <div className="mm-setup-card" style={{ maxWidth: 680, textAlign: 'left' }}>
                  <h2 style={{ marginBottom: '0.4rem' }}>Hồ sơ Mentee</h2>
                  <p style={{ marginBottom: '1.5rem', color: 'var(--neu-text-muted)', fontSize: '0.86rem' }}>
                    Điền thông tin để AI ghép đôi với mentor phù hợp nhất
                  </p>
                  {formErr && <div className="mm-error-banner">{formErr}</div>}
                  <form className="mm-form" onSubmit={handleSaveMenteeProfile}>
                    <div className="mm-form-grid">
                      <div className="mm-form-group">
                        <label>Họ và tên *</label>
                        <input className="mm-input" value={menteeForm.full_name}
                          onChange={e => setMenteeForm(p => ({ ...p, full_name: e.target.value }))}
                          placeholder="Nguyễn Văn A" required />
                      </div>
                      <div className="mm-form-group">
                        <label>Nghề nghiệp mục tiêu *</label>
                        <input className="mm-input" value={menteeForm.target_career}
                          onChange={e => setMenteeForm(p => ({ ...p, target_career: e.target.value }))}
                          placeholder="Software Engineer, Data Scientist..." required />
                      </div>
                      <div className="mm-form-group">
                        <label>Phong cách học tập</label>
                        <select className="mm-select" value={menteeForm.learning_style}
                          onChange={e => setMenteeForm(p => ({ ...p, learning_style: e.target.value }))}>
                          <option value="flexible">Linh hoạt</option>
                          <option value="structured">Có cấu trúc</option>
                          <option value="project-based">Dựa trên dự án</option>
                        </select>
                      </div>
                      <div className="mm-form-group">
                        <label>Kinh nghiệm mentor mong muốn</label>
                        <select className="mm-select" value={menteeForm.preferred_mentor_experience}
                          onChange={e => setMenteeForm(p => ({ ...p, preferred_mentor_experience: e.target.value }))}>
                          <option value="junior">Junior (1-3 năm)</option>
                          <option value="senior">Senior (5+ năm)</option>
                          <option value="executive">Executive (10+ năm)</option>
                        </select>
                      </div>
                    </div>
                    <div className="mm-form-group">
                      <label>Kỹ năng hiện có</label>
                      <TagInput tags={menteeForm.current_skills}
                        onChange={t => setMenteeForm(p => ({ ...p, current_skills: t }))}
                        placeholder="Nhập kỹ năng, Enter để thêm..." />
                      <span className="mm-hint">Ví dụ: Python, React, SQL…</span>
                    </div>
                    <div className="mm-form-group">
                      <label>Kỹ năng muốn học * </label>
                      <TagInput tags={menteeForm.desired_skills}
                        onChange={t => setMenteeForm(p => ({ ...p, desired_skills: t }))}
                        placeholder="Nhập kỹ năng, Enter để thêm..." />
                      <span className="mm-hint">AI sẽ dùng danh sách này để tìm mentor phù hợp</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                      <button type="button" className="mm-btn-secondary" onClick={() => setShowForm(false)}>Huỷ</button>
                      <button type="submit" className="mm-btn-primary" disabled={formSaving}>
                        {formSaving ? 'Đang lưu...' : 'Lưu & Tìm Mentor'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Loading mentors */}
              {hasProfile === true && mentorsLoading && (
                <div className="mm-loading">
                  <div className="mm-spinner" />
                  <span>AI đang phân tích và tìm mentor phù hợp...</span>
                </div>
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
                          <div className="mm-card-company">
                            {m.company}{m.experience_years ? ` • ${m.experience_years} năm kinh nghiệm` : ''}
                          </div>
                        </div>

                        <div className="mm-card-body">
                          {m.bio && <p className="mm-card-bio">{m.bio}</p>}

                          {/* Expertise tags */}
                          {m.expertise_areas.length > 0 && (
                            <div>
                              <div className="mm-section-label">Chuyên môn</div>
                              <div className="mm-tags">
                                {m.expertise_areas.slice(0, 4).map(s => (
                                  <span key={s} className="mm-skill-tag">{s}</span>
                                ))}
                                {m.expertise_areas.length > 4 && (
                                  <span className="mm-more-tag">+{m.expertise_areas.length - 4}</span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Score bars */}
                          <div>
                            <div className="mm-section-label">Độ phù hợp</div>
                            <div className="mm-score-bars">
                              <ScoreBar label="Kỹ năng" value={m.skill_match_score} color="#8b5cf6" />
                              <ScoreBar label="Nghề nghiệp" value={m.career_match_score} color="#3b82f6" />
                              <ScoreBar label="Tính cách" value={m.personality_score} color="#10b981" />
                            </div>
                          </div>

                          {/* Matching reasons */}
                          {m.matching_reasons.length > 0 && (
                            <div>
                              <div className="mm-section-label">Lý do phù hợp</div>
                              <ul className="mm-reasons">
                                {m.matching_reasons.slice(0, 2).map((r, j) => (
                                  <li key={j} className="mm-reason">
                                    <span className="mm-reason-dot" />
                                    {r}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Availability */}
                          <div className="mm-avail">
                            <span>⏱ {m.available_hours_per_week}h/tuần</span>
                            <span>👥 {m.current_mentees_count}/{m.max_mentees} mentees</span>
                          </div>

                          {/* Actions */}
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              className={`mm-request-btn${isSent ? ' sent' : ''}`}
                              disabled={isFull || isSent}
                              onClick={() => openModal(m)}
                              style={{ flex: 1 }}
                            >
                              {isSent ? '✓ Đã gửi yêu cầu' : isFull ? 'Đã đầy slot' : 'Gửi yêu cầu'}
                            </button>
                            <button
                              onClick={() => setBookingTarget({ userId: m.mentor_id, name: m.mentor_name })}
                              title="Đặt lịch hẹn"
                              style={{
                                padding: '0 0.9rem',
                                borderRadius: 10, border: '1.5px solid #8b5cf6',
                                background: 'rgba(139,92,246,0.08)', color: '#7c3aed',
                                cursor: 'pointer', fontSize: '1rem', fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >📅</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Empty */}
              {hasProfile === true && !mentorsLoading && mentors.length === 0 && (
                <div className="mm-empty">
                  <div className="mm-empty-icon">🔍</div>
                  <h3>Chưa tìm thấy mentor phù hợp</h3>
                  <p>Hãy cập nhật kỹ năng muốn học để AI tìm được mentor tốt hơn cho bạn.</p>
                </div>
              )}
            </>
          )}

          {/* ══════════════════════════════════
              TAB 2 — My Requests
              ══════════════════════════════════ */}
          {tab === 'requests' && (
            <>
              {reqLoading && (
                <div className="mm-loading">
                  <div className="mm-spinner" />
                  <span>Đang tải...</span>
                </div>
              )}

              {!reqLoading && myRequests.length === 0 && (
                <div className="mm-empty">
                  <div className="mm-empty-icon">📋</div>
                  <h3>Chưa có yêu cầu nào</h3>
                  <p>Tìm và gửi yêu cầu đến mentor phù hợp từ tab "Tìm Mentor".</p>
                </div>
              )}

              {!reqLoading && myRequests.length > 0 && (
                <div className="mm-req-list">
                  {myRequests.map(r => {
                    const initials = (r.mentor_name || 'M').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
                    const status = r.status as 'pending' | 'accepted' | 'rejected';
                    const statusLabel = { pending: 'Đang chờ', accepted: 'Đã chấp nhận', rejected: 'Đã từ chối' }[status] ?? r.status;
                    return (
                      <div key={r.id} className="mm-req-item">
                        <div className="mm-req-avatar">{initials}</div>
                        <div className="mm-req-info">
                          <div className="mm-req-name">{r.mentor_name || `Mentor #${r.mentor_id}`}</div>
                          <div className="mm-req-meta">
                            {r.mentor_position && `${r.mentor_position} · `}
                            {r.mentor_company && `${r.mentor_company} · `}
                            {new Date(r.requested_at).toLocaleDateString('vi-VN')}
                          </div>
                          {r.message && <div className="mm-req-msg">"{r.message}"</div>}
                          {r.response_message && (
                            <div className="mm-req-msg" style={{ color: status === 'accepted' ? '#065f46' : '#991b1b' }}>
                              Phản hồi: "{r.response_message}"
                            </div>
                          )}
                        </div>
                        <span className={`mm-status-badge ${status}`}>{statusLabel}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ══════════════════════════════════
              TAB 3 — Schedule
              ══════════════════════════════════ */}
          {tab === 'schedule' && (
            <>
              {sessionsLoading && (
                <div className="mm-loading">
                  <div className="mm-spinner" />
                  <span>Đang tải lịch hẹn...</span>
                </div>
              )}

              {!sessionsLoading && sessions.length === 0 && (
                <div className="mm-empty">
                  <div className="mm-empty-icon">📅</div>
                  <h3>Chưa có lịch hẹn nào</h3>
                  <p>Nhấn nút 📅 trong cửa sổ chat để đặt lịch hẹn với mentor.</p>
                </div>
              )}

              {!sessionsLoading && sessions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {sessions.map(s => {
                    const dt = new Date(s.scheduled_at);
                    const isMentor = s.role === 'mentor';
                    const statusColor: Record<string, string> = {
                      pending: '#f59e0b',
                      confirmed: '#10b981',
                      cancelled: '#ef4444',
                      completed: '#6b7280',
                    };
                    const statusLabel: Record<string, string> = {
                      pending: 'Chờ xác nhận',
                      confirmed: 'Đã xác nhận',
                      cancelled: 'Đã huỷ',
                      completed: 'Hoàn thành',
                    };
                    return (
                      <div key={s.id} style={{
                        background: 'var(--neu-bg-card)',
                        borderRadius: 14,
                        boxShadow: 'var(--neu-raised-sm)',
                        padding: '1rem 1.25rem',
                        display: 'flex', gap: '1rem', alignItems: 'flex-start',
                      }}>
                        {/* Date block */}
                        <div style={{
                          minWidth: 56, textAlign: 'center',
                          background: 'var(--neu-bg)', borderRadius: 10,
                          padding: '0.5rem 0.25rem',
                          boxShadow: 'var(--neu-pressed-sm)',
                        }}>
                          <div style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1, color: '#8b5cf6' }}>
                            {dt.getDate()}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--neu-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                            {dt.toLocaleString('vi-VN', { month: 'short' })}
                          </div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--neu-text)', marginTop: 2 }}>
                            {dt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--neu-text)' }}>
                              {isMentor ? s.mentee_name : s.mentor_name}
                            </span>
                            <span style={{
                              fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.55rem',
                              borderRadius: 20, background: statusColor[s.status] + '22',
                              color: statusColor[s.status],
                            }}>
                              {statusLabel[s.status] || s.status}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--neu-text-muted)' }}>
                              · {s.duration_minutes} phút · {isMentor ? 'Bạn là mentor' : 'Bạn là mentee'}
                            </span>
                          </div>
                          {s.topic && (
                            <div style={{ fontSize: '0.85rem', color: 'var(--neu-text)', marginBottom: '0.15rem' }}>
                              📌 {s.topic}
                            </div>
                          )}
                          {s.notes && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--neu-text-muted)' }}>
                              {s.notes}
                            </div>
                          )}
                          {s.mentor_note && (
                            <div style={{ fontSize: '0.8rem', color: '#065f46', marginTop: '0.2rem' }}>
                              💬 Phản hồi: {s.mentor_note}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flexShrink: 0 }}>
                          {/* Mentor: confirm/cancel pending sessions */}
                          {isMentor && s.status === 'pending' && (
                            <>
                              <button
                                disabled={respondingId === s.id}
                                onClick={async () => {
                                  setRespondingId(s.id);
                                  try {
                                    await scheduleService.respond(s.id, 'confirmed');
                                    await loadSessions();
                                  } catch { /* ignore */ } finally { setRespondingId(null); }
                                }}
                                style={{
                                  padding: '0.4rem 0.9rem', borderRadius: 8, border: 'none',
                                  background: '#10b981', color: '#fff', fontWeight: 600,
                                  fontSize: '0.8rem', cursor: 'pointer',
                                }}
                              >✓ Xác nhận</button>
                              <button
                                disabled={respondingId === s.id}
                                onClick={async () => {
                                  setRespondingId(s.id);
                                  try {
                                    await scheduleService.respond(s.id, 'cancelled');
                                    await loadSessions();
                                  } catch { /* ignore */ } finally { setRespondingId(null); }
                                }}
                                style={{
                                  padding: '0.4rem 0.9rem', borderRadius: 8, border: 'none',
                                  background: '#ef4444', color: '#fff', fontWeight: 600,
                                  fontSize: '0.8rem', cursor: 'pointer',
                                }}
                              >✕ Từ chối</button>
                            </>
                          )}
                          {/* Both sides: cancel active sessions */}
                          {s.status === 'pending' && !isMentor && (
                            <button
                              onClick={async () => {
                                try {
                                  await scheduleService.cancel(s.id);
                                  await loadSessions();
                                } catch { /* ignore */ }
                              }}
                              style={{
                                padding: '0.4rem 0.9rem', borderRadius: 8, border: 'none',
                                background: '#f3f4f6', color: '#374151', fontWeight: 600,
                                fontSize: '0.8rem', cursor: 'pointer',
                              }}
                            >Huỷ</button>
                          )}
                          {s.status === 'confirmed' && (
                            <button
                              onClick={async () => {
                                try {
                                  await scheduleService.cancel(s.id);
                                  await loadSessions();
                                } catch { /* ignore */ }
                              }}
                              style={{
                                padding: '0.4rem 0.9rem', borderRadius: 8, border: 'none',
                                background: '#f3f4f6', color: '#374151', fontWeight: 600,
                                fontSize: '0.8rem', cursor: 'pointer',
                              }}
                            >Huỷ lịch</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ══════════════════════════════════
              TAB 4 — Become a Mentor
              ══════════════════════════════════ */}
          {tab === 'become' && (
            <div className="mm-mentor-section">
              <div className="mm-mentor-card">
                <h2>🌟 Đăng ký trở thành Mentor</h2>
                <p>
                  Hệ thống sẽ tự động lấy kỹ năng từ CV và ngành nghề từ kết quả đánh giá của bạn để ghép đôi với mentee phù hợp.
                  Bạn chỉ cần bổ sung thêm thông tin nếu muốn.
                </p>

                {/* One-click auto-fill button */}
                {!mentorSuccess && (
                  <div style={{
                    padding: '1rem', marginBottom: '1.5rem',
                    background: 'var(--neu-bg)', borderRadius: 12,
                    boxShadow: 'var(--neu-pressed-sm)',
                    display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--neu-text)', marginBottom: '0.2rem' }}>
                        📋 Tự động điền từ profile của bạn
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--neu-text-muted)' }}>
                        Lấy kỹ năng từ CV đã upload + ngành nghề từ kết quả assessment
                      </div>
                    </div>
                    <button
                      type="button"
                      className="mm-btn-secondary"
                      disabled={mentorSaving}
                      onClick={async () => {
                        setMentorSaving(true);
                        setMentorErr('');
                        try {
                          const data = await mentorMatchingService.createMentorFromProfile();
                          setMentorProfile(prev => ({
                            ...prev,
                            full_name: data.full_name || prev.full_name,
                            current_position: data.current_position || prev.current_position,
                            expertise_areas: data.expertise_areas.length > 0 ? data.expertise_areas : prev.expertise_areas,
                          }));
                          setMentorSuccess('Đã tự động điền từ profile! Kiểm tra và lưu lại bên dưới.');
                        } catch {
                          setMentorErr('Bạn chưa upload CV hoặc chưa hoàn thành assessment. Điền tay bên dưới.');
                        } finally {
                          setMentorSaving(false);
                        }
                      }}
                    >
                      {mentorSaving ? 'Đang lấy dữ liệu...' : '✨ Tự động điền'}
                    </button>
                  </div>
                )}

                {mentorSuccess && <div className="mm-success-banner">✅ {mentorSuccess}</div>}
                {mentorErr    && <div className="mm-error-banner">⚠️ {mentorErr}</div>}

                <form className="mm-form" onSubmit={handleSaveMentorProfile}>
                  <div className="mm-form-grid">
                    <div className="mm-form-group">
                      <label>Họ và tên *</label>
                      <input className="mm-input" value={mentorProfile.full_name}
                        onChange={e => setMentorProfile(p => ({ ...p, full_name: e.target.value }))} required />
                    </div>
                    <div className="mm-form-group">
                      <label>Vị trí hiện tại *</label>
                      <input className="mm-input" value={mentorProfile.current_position}
                        onChange={e => setMentorProfile(p => ({ ...p, current_position: e.target.value }))}
                        placeholder="Senior Software Engineer" required />
                    </div>
                    <div className="mm-form-group">
                      <label>Công ty</label>
                      <input className="mm-input" value={mentorProfile.company}
                        onChange={e => setMentorProfile(p => ({ ...p, company: e.target.value }))}
                        placeholder="Google, FPT Software..." />
                    </div>
                    <div className="mm-form-group">
                      <label>Số năm kinh nghiệm</label>
                      <input className="mm-input" type="number" min={0} max={50}
                        value={mentorProfile.experience_years}
                        onChange={e => setMentorProfile(p => ({ ...p, experience_years: +e.target.value }))} />
                    </div>
                    <div className="mm-form-group">
                      <label>Giờ/tuần có thể mentor</label>
                      <input className="mm-input" type="number" min={1} max={40}
                        value={mentorProfile.available_hours_per_week}
                        onChange={e => setMentorProfile(p => ({ ...p, available_hours_per_week: +e.target.value }))} />
                    </div>
                    <div className="mm-form-group">
                      <label>Số mentee tối đa</label>
                      <input className="mm-input" type="number" min={1} max={20}
                        value={mentorProfile.max_mentees}
                        onChange={e => setMentorProfile(p => ({ ...p, max_mentees: +e.target.value }))} />
                    </div>
                  </div>

                  <div className="mm-form-group">
                    <label>Giới thiệu bản thân</label>
                    <textarea className="mm-textarea" value={mentorProfile.bio}
                      onChange={e => setMentorProfile(p => ({ ...p, bio: e.target.value }))}
                      placeholder="Mô tả kinh nghiệm, chuyên môn và những gì bạn có thể chia sẻ..."
                      rows={3} />
                  </div>

                  <div className="mm-form-group">
                    <label>Lĩnh vực chuyên môn</label>
                    <TagInput tags={mentorProfile.expertise_areas}
                      onChange={t => setMentorProfile(p => ({ ...p, expertise_areas: t }))}
                      placeholder="Python, React, Machine Learning… Enter để thêm" />
                    <span className="mm-hint">AI dùng danh sách này để match với mentee</span>
                  </div>

                  <div className="mm-form-group">
                    <label>Hình thức liên lạc ưa thích</label>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      {['video', 'chat', 'email', 'phone'].map(opt => (
                        <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.88rem', color: 'var(--neu-text)' }}>
                          <input type="checkbox"
                            checked={mentorProfile.preferred_communication.includes(opt)}
                            onChange={e => setMentorProfile(p => ({
                              ...p,
                              preferred_communication: e.target.checked
                                ? [...p.preferred_communication, opt]
                                : p.preferred_communication.filter(x => x !== opt),
                            }))} />
                          {opt.charAt(0).toUpperCase() + opt.slice(1)}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button type="submit" className="mm-btn-primary" disabled={mentorSaving} style={{ width: '100%' }}>
                      {mentorSaving ? 'Đang lưu...' : '🚀 Lưu hồ sơ Mentor'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Booking Modal ── */}
      {bookingTarget && (
        <BookingModal
          mentorUserId={bookingTarget.userId}
          mentorName={bookingTarget.name}
          onClose={() => setBookingTarget(null)}
          onBooked={() => { setBookingTarget(null); if (tab === 'schedule') loadSessions(); }}
        />
      )}

      {/* ── Send Request Modal ── */}
      {modalMentor && (
        <div className="mm-modal-overlay" onClick={() => setModalMentor(null)}>
          <div className="mm-modal" onClick={e => e.stopPropagation()}>
            <h3>Gửi yêu cầu đến {modalMentor.mentor_name}</h3>
            <p className="mm-modal-sub">
              {modalMentor.current_position} · {modalMentor.company}
            </p>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--neu-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Lời nhắn
            </label>
            <textarea
              className="mm-textarea"
              value={modalMsg}
              onChange={e => setModalMsg(e.target.value)}
              rows={4}
              style={{ marginTop: '0.4rem', marginBottom: 0 }}
              placeholder="Giới thiệu bản thân và nêu lý do bạn muốn được mentor này hỗ trợ..."
            />
            <div className="mm-modal-actions">
              <button className="mm-btn-secondary" onClick={() => setModalMentor(null)}>Huỷ</button>
              <button className="mm-btn-primary" disabled={modalSending} onClick={handleSendRequest}>
                {modalSending ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default MentorMatchingPage;
