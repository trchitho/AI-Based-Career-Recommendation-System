import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, BookMarked, Gamepad2, Puzzle, FileText } from 'lucide-react';
import { profileService } from '../services/profileService';
import { ProfileData, AssessmentHistoryItem } from '../types/profile';
import MainLayout from '../components/layout/MainLayout';
import AssessmentHistorySection from '../components/profile/AssessmentHistorySection';
import ChatInboxPanel from '../components/chat/ChatInboxPanel';

/* ── helpers ─────────────────────────────────────────── */
function initials(profile: ProfileData['profile']) {
  const f = profile.first_name?.[0] || '';
  const l = profile.last_name?.[0] || '';
  return (f + l).toUpperCase() || profile.email[0].toUpperCase();
}

function displayName(profile: ProfileData['profile']) {
  if (profile.first_name || profile.last_name)
    return `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
  return profile.email.split('@')[0];
}

const RIASEC_LABELS: Record<string, string> = {
  realistic: 'Kỹ Thuật (Realistic)', investigative: 'Nghiên Cứu (Investigative)',
  artistic: 'Nghệ Thuật (Artistic)', social: 'Xã Hội (Social)',
  enterprising: 'Kinh Doanh (Enterprising)', conventional: 'Nghiệp Vụ (Conventional)',
};

const RIASEC_COLORS: Record<string, string> = {
  realistic:    '#6366f1',
  investigative:'#3b82f6',
  artistic:     '#8b5cf6',
  social:       'var(--color-primary)',  /* use primary green for Social */
  enterprising: '#d97706',
  conventional: '#64748b',
};

const BIG5_LABELS: Record<string, string> = {
  openness: 'Cởi Mở (Openness)', conscientiousness: 'Tận Tâm (Conscientiousness)',
  extraversion: 'Hướng Ngoại (Extraversion)', agreeableness: 'Dễ Chịu (Agreeableness)', neuroticism: 'Nhạy Cảm (Neuroticism)',
};

function big5Level(score: number) {
  if (score >= 75) return 'Cao';
  if (score >= 55) return 'Trung Bình';
  if (score >= 40) return 'Cân Bằng';
  return 'Thấp';
}

function big5Color(score: number) {
  if (score >= 75) return 'var(--color-primary)';   /* green-600 — primary */
  if (score >= 55) return '#0284c7';   /* sky-600 */
  if (score >= 40) return '#d97706';   /* amber-600 */
  return '#ef4444';                    /* red-500 */
}

type ScoreMap = Record<string, number>;

function averageScores<T extends ScoreMap>(
  assessments: AssessmentHistoryItem[] | undefined,
  field: 'riasec_scores' | 'big_five_scores',
): { scores?: T; count: number } {
  const totals: ScoreMap = {};
  const counts: ScoreMap = {};
  let sourceCount = 0;

  for (const assessment of assessments || []) {
    const scores = assessment[field] as ScoreMap | undefined;
    if (!scores) continue;

    const entries = Object.entries(scores).filter(([, value]) => Number.isFinite(Number(value)));
    if (entries.length === 0) continue;
    sourceCount += 1;

    for (const [key, value] of entries) {
      totals[key] = (totals[key] || 0) + Number(value);
      counts[key] = (counts[key] || 0) + 1;
    }
  }

  const averaged = Object.keys(totals).reduce<ScoreMap>((acc, key) => {
    acc[key] = Math.round((totals[key] / counts[key]) * 10) / 10;
    return acc;
  }, {});

  return {
    scores: Object.keys(averaged).length > 0 ? averaged as T : undefined,
    count: sourceCount,
  };
}

/* ── Assessment card mini ─────────────────────────────── */
function AssessmentCard({ item }: { item: AssessmentHistoryItem }) {
  const navigate = useNavigate();
  const date = new Date(item.completed_at).toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' });
  const mode = item.test_mode || 'Tiêu Chuẩn';
  const topType = item.top_interest || (item.riasec_scores
    ? Object.entries(item.riasec_scores).sort((a, b) => b[1] - a[1])[0]?.[0]
    : '');
  const topScore = item.riasec_scores
    ? Math.round(Math.max(...Object.values(item.riasec_scores)))
    : item.big_five_scores
    ? Math.round(Math.max(...Object.values(item.big_five_scores)))
    : 0;

  const iconMap: Record<string, React.ReactNode> = {
    traditional: <BookOpen size={20} />,
    story:       <BookMarked size={20} />,
    enhanced:    <FileText size={20} />,
    puzzle:      <Puzzle size={20} />,
    game:        <Gamepad2 size={20} />,
  };
  const icon = iconMap[mode.toLowerCase()] ?? <FileText size={20} />;

  return (
    <div
      onClick={() => navigate(`/results/${item.id}`)}
      style={{
        background: 'var(--neu-bg-card, #fff)',
        border: '1px solid var(--neu-border, #e5e7eb)',
        borderRadius: 14, padding: '1rem 1.1rem',
        cursor: 'pointer', transition: 'box-shadow 0.15s, transform 0.15s',
        minWidth: 160, flex: '1 0 160px',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = '';
        (e.currentTarget as HTMLElement).style.transform = '';
      }}
    >
      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
        {date}
      </div>
      <div style={{ marginBottom: 6, color: 'var(--neu-accent)' }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--neu-text, #111)', marginBottom: 2 }}>
        {mode === 'traditional' ? 'Truyền Thống' : mode === 'story' ? 'Câu Chuyện' : mode.charAt(0).toUpperCase() + mode.slice(1)} Chế Độ
      </div>
      {topType && (
        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 8 }}>
          Hàng đầu: <strong style={{ color: 'var(--neu-text, #111)' }}>{RIASEC_LABELS[topType] || topType}</strong>
        </div>
      )}
      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 2 }}>Điểm</div>
      <div style={{ fontWeight: 900, fontSize: '1.3rem', color: 'var(--neu-accent)' }}>{topScore}/100</div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════ */
const ProfilePage = () => {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    profileService.getProfileData()
      .then(setProfileData)
      .catch(() => setError('Failed to load profile data.'))
      .finally(() => setLoading(false));
  }, []);

  const sortedAssessments = [...(profileData?.assessmentHistory || [])]
    .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());
  const latestAssessment = sortedAssessments[0];

  const riasecAverage = averageScores<NonNullable<AssessmentHistoryItem['riasec_scores']>>(profileData?.assessmentHistory, 'riasec_scores');
  const big5Average = averageScores<NonNullable<AssessmentHistoryItem['big_five_scores']>>(profileData?.assessmentHistory, 'big_five_scores');
  const riasec = riasecAverage.scores;
  const big5 = big5Average.scores;

  const riasecSorted = riasec
    ? Object.entries(riasec).sort((a, b) => b[1] - a[1])
    : [];

  const topRiasecCode = riasecSorted.slice(0, 2).map(([k]) => k[0].toUpperCase()).join('');
  const topRiasecKey = riasecSorted[0]?.[0];

  const assessmentCount = profileData?.assessmentHistory?.length || 0;
  const completedRoadmaps = profileData?.developmentProgress?.filter(r => r.progress_percentage >= 100).length || 0;

  return (
    <MainLayout>
      <div style={{ minHeight: '100vh', background: 'var(--neu-bg, #f1f5f1)', paddingBottom: '3rem' }}>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, gap: '0.75rem', color: '#9ca3af' }}>
            <div style={{ width: 20, height: 20, border: '3px solid #e5e7eb', borderTopColor: 'var(--neu-accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <span>Đang tải profile...</span>
          </div>
        )}

        {error && (
          <div style={{ maxWidth: 600, margin: '4rem auto', padding: '1.5rem', background: '#fef2f2', borderRadius: 12, color: '#dc2626', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {!loading && !error && profileData && (
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' }}>

            {/* ── HEADER CARD ── */}
            <div style={{
              background: 'linear-gradient(135deg, var(--neu-accent) 0%, var(--color-primary-hover) 60%, #0f766e 100%)',
              borderRadius: 20, padding: '2rem 2.5rem',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
              gap: '1.5rem', flexWrap: 'wrap',
              marginBottom: '1.5rem',
              boxShadow: '0 8px 32px rgba(26,35,126,0.3)',
            }}>
              {/* Left: avatar + name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.75rem', fontWeight: 900, color: '#fff',
                  border: '3px solid rgba(255,255,255,0.4)',
                  flexShrink: 0,
                }}>
                  {initials(profileData.profile)}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em',
                      textTransform: 'uppercase', color: 'rgba(255,255,255,0.9)',
                      background: 'rgba(165,243,252,0.15)', padding: '0.2rem 0.6rem',
                      borderRadius: 99, border: '1px solid rgba(165,243,252,0.3)',
                    }}>
                       DNA Nghề Nghiệp Đã Xác Minh
                    </span>
                  </div>
                  <h1 style={{ fontSize: '1.9rem', fontWeight: 900, color: '#fff', margin: 0, lineHeight: 1.1 }}>
                    {displayName(profileData.profile)}
                  </h1>
                  <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)', marginTop: '0.3rem' }}>
                    {profileData.profile.email}
                    {topRiasecKey && (
                      <span> · DNA trung bình nổi bật: <strong style={{ color: 'rgba(255,255,255,0.9)' }}>{RIASEC_LABELS[topRiasecKey] || topRiasecKey}</strong></span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: stats + action buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '0.5rem 0.9rem' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fff' }}>{assessmentCount}</div>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Bài Test</div>
                  </div>
                  <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '0.5rem 0.9rem' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fff' }}>{completedRoadmaps}</div>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Lộ Trình</div>
                  </div>
                  {topRiasecCode && (
                    <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '0.5rem 0.9rem' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#bbf7d0' }}>{topRiasecCode}</div>
                      <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Loại</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── HÀNG 1: RIASEC + Big Five ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px,100%), 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>

              {/* DNA Nghề Nghiệp (RIASEC) */}
              <div style={{ background: 'var(--neu-bg-card, #fff)', borderRadius: 16, padding: '1.5rem', border: '1px solid var(--neu-border, #e5e7eb)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--neu-text, #111)' }}>DNA Nghề Nghiệp (RIASEC)</div>
                  {latestAssessment && (
                    <div style={{ fontSize: '0.7rem', color: '#9ca3af', textAlign: 'right' }}>
                      Cập nhật gần nhất {new Date(latestAssessment.completed_at).toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' })}
                    </div>
                  )}
                </div>
                {riasecAverage.count > 0 && (
                  <div style={{ marginTop: '-0.65rem', marginBottom: '0.95rem', fontSize: '0.72rem', color: '#6b7280' }}>
                    Đang hiển thị điểm trung bình từ {riasecAverage.count} lần test có dữ liệu RIASEC của bạn.
                  </div>
                )}

                {riasec ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {riasecSorted.map(([key, val]) => {
                      const pct = Math.round(val);  // already 0-100
                      return (
                        <div key={key}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: RIASEC_COLORS[key], textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {RIASEC_LABELS[key]}
                            </span>
                            <span style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--neu-text, #111)' }}>{pct}%</span>
                          </div>
                          <div style={{ height: 6, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: RIASEC_COLORS[key], borderRadius: 99, transition: 'width 1s ease' }} />
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: 2 }}>
                            {key === 'artistic' ? 'Sáng tạo & biểu cảm' : key === 'investigative' ? 'Phân tích & nghiên cứu' : key === 'social' ? 'Hỗ trợ & xã hội' : key === 'realistic' ? 'Kỹ thuật & thực tế' : key === 'enterprising' ? 'Kinh doanh & lãnh đạo' : 'Dữ liệu & nghiệp vụ'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af', fontSize: '0.85rem' }}>
                    Chưa có kết quả assessment.<br />
                    <a href="/assessment" style={{ color: 'var(--neu-accent)', fontWeight: 600 }}>Làm bài test ngay →</a>
                  </div>
                )}
              </div>

              {/* Tính Cách Big Five */}
              <div style={{ background: 'var(--neu-bg-card, #fff)', borderRadius: 16, padding: '1.5rem', border: '1px solid var(--neu-border, #e5e7eb)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--neu-text, #111)', marginBottom: '1.1rem' }}>
                  Tính Cách Big Five
                </div>
                {big5Average.count > 0 && (
                  <div style={{ marginTop: '-0.65rem', marginBottom: '0.95rem', fontSize: '0.72rem', color: '#6b7280' }}>
                    Đang hiển thị điểm trung bình từ {big5Average.count} lần test có dữ liệu Big Five của bạn.
                  </div>
                )}

                {big5 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {Object.entries(big5).map(([key, val]) => {
                      const pct = Math.round(val);  // already 0-100
                      const level = big5Level(val);
                      const color = big5Color(val);
                      return (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: 120, fontSize: '0.78rem', fontWeight: 600, color: 'var(--neu-text, #374151)', flexShrink: 0 }}>
                            {BIG5_LABELS[key]}
                          </div>
                          <div style={{ flex: 1, height: 7, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99 }} />
                          </div>
                          <div style={{ width: 60, fontSize: '0.72rem', fontWeight: 700, color, textAlign: 'right', flexShrink: 0 }}>
                            {level}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af', fontSize: '0.85rem' }}>
                    Chưa có dữ liệu tính cách.
                  </div>
                )}
              </div>
            </div>

            {/* ── ROW 2: Account Info + Chat ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px,100%), 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>

              {/* Account Info */}
              <div style={{ background: 'var(--neu-bg-card, #fff)', borderRadius: 16, padding: '1.5rem', border: '1px solid var(--neu-border, #e5e7eb)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--neu-text, #111)', marginBottom: '1.1rem' }}>
                  Thông tin tài khoản
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {[
                    { label: 'Email', value: profileData.profile.email },
                    { label: 'Họ tên', value: displayName(profileData.profile) },
                    { label: 'Ngày sinh', value: profileData.profile.date_of_birth ? new Date(profileData.profile.date_of_birth).toLocaleDateString('vi-VN') : 'Chưa cập nhật' },
                    { label: 'Tham gia', value: new Date(profileData.profile.created_at).toLocaleDateString('vi-VN') },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--neu-border, #f3f4f6)' }}>
                      <span style={{ fontSize: '0.82rem', color: '#9ca3af', fontWeight: 500 }}>{label}</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--neu-text, #111)' }}>{value}</span>
                    </div>
                  ))}
                </div>
                <a href="/assessment" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  marginTop: '1.25rem', padding: '0.6rem',
                  background: 'linear-gradient(135deg, var(--neu-accent), var(--color-primary-hover))',
                  color: '#fff', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem',
                  textDecoration: 'none', transition: 'opacity 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                   Làm bài assessment mới
                </a>
              </div>

              {/* Chat Inbox */}
              <div style={{ background: 'var(--neu-bg-card, #fff)', borderRadius: 16, border: '1px solid var(--neu-border, #e5e7eb)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden', minHeight: 280 }}>
                <ChatInboxPanel />
              </div>
            </div>

            {/* ── ROW 3: Lịch Sử Đánh Giá ── */}
            <div style={{ background: 'var(--neu-bg-card, #fff)', borderRadius: 16, padding: '1.5rem', border: '1px solid var(--neu-border, #e5e7eb)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--neu-text, #111)', marginBottom: '1.1rem' }}>
                Lịch Sử Đánh Giá
              </div>
              {profileData.assessmentHistory.length > 0 ? (
                <div style={{ display: 'flex', gap: '0.85rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                  {sortedAssessments
                    .slice(0, 8)
                    .map(item => <AssessmentCard key={item.id} item={item} />)}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af', fontSize: '0.85rem' }}>
                  Chưa có lịch sử assessment.{' '}
                  <a href="/assessment" style={{ color: 'var(--neu-accent)', fontWeight: 600 }}>Làm bài ngay →</a>
                </div>
              )}
            </div>

            {/* ── ROW 4: Full Assessment Detail ── */}
            <div style={{ background: 'var(--neu-bg-card, #fff)', borderRadius: 16, border: '1px solid var(--neu-border, #e5e7eb)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
              <AssessmentHistorySection assessmentHistory={profileData.assessmentHistory} />
            </div>

          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ProfilePage;
