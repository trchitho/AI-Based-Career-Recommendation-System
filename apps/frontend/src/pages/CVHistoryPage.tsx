import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target, CheckCircle2, XCircle, FileText, ChevronRight, Search,
  AlertTriangle, FolderOpen, BarChart2, TrendingUp, History
} from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import { skillGapService } from '../services/skillGapService';
import { SkillGapAnalysis } from '../types/skillGap';
import { careerService } from '../services/careerService';

/* ── helpers ─────────────────────────────────────── */
function matchColor(pct: number) {
  if (pct >= 80) return { bg: 'd1fae5', text: '065f46', bar: '10b981' };
  if (pct >= 60) return { bg: 'fef3c7', text: '92400e', bar: 'f59e0b' };
  if (pct >= 40) return { bg: 'fee2e2', text: '991b1b', bar: 'ef4444' };
  return { bg: 'f3f4f6', text: '374151', bar: '9ca3af' };
}

function matchLabel(pct: number) {
  if (pct >= 80) return 'Xuất sắc';
  if (pct >= 60) return 'Tốt';
  if (pct >= 40) return 'Khá';
  return 'Cần cải thiện';
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/* ── AnalysisCard ─────────────────────────────────── */
const AnalysisCard = ({ item, careerName, onView }: {
  item: SkillGapAnalysis;
  careerName: string;
  onView: () => void;
}) => {
  const pct = Math.round(item.match_percentage ?? 0);
  const col = matchColor(pct);
  const matchedSkills = item.matched_skills?.slice(0, 4) ?? [];
  const gapSkills = [
    ...(item.skill_gaps?.critical ?? []),
    ...(item.skill_gaps?.important ?? []),
  ].slice(0, 3);

  return (
    <div
      onClick={onView}
      style={{
        background: 'var(--neu-bg-card, #fff)',
        border: '1px solid var(--neu-border, #e5e7eb)',
        borderRadius: 16,
        padding: '1.5rem',
        cursor: 'pointer',
        transition: 'box-shadow 0.2s, transform 0.15s',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = '';
        (e.currentTarget as HTMLElement).style.transform = '';
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{
              width: 36, height: 36, borderRadius: '50%', background: 'var(--neu-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.8rem', fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              {(item.cv_name || 'U').charAt(0).toUpperCase()}
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--neu-text, #111)', lineHeight: 1.2 }}>
                {item.cv_name || 'CV không có tên'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{fmtDate(item.created_at)}</div>
            </div>
          </div>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--neu-text, #374151)', padding: '4px 10px', background: 'var(--neu-bg, #f9fafb)', borderRadius: 8, display: 'inline-block', border: '1px solid var(--neu-border, #e5e7eb)', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <Target size={12} className="inline mr-1" />{careerName || item.career_id}
          </div>
        </div>

        {/* Match score badge */}
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            background: `conic-gradient(${col.bar} ${pct * 3.6}deg, #f3f4f6 0deg)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 0 3px fff, 0 0 0 4px ${col.bar}22`,
          }}>
            <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--neu-bg-card, #fff)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 900, color: col.bar, lineHeight: 1 }}>{pct}%</span>
            </div>
          </div>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: col.text, marginTop: 4 }}>{matchLabel(pct)}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#9ca3af', marginBottom: 4 }}>
          <span>{item.matched_skills_count ?? 0} kỹ năng khớp</span>
          <span>{item.missing_skills_count ?? 0} thiếu · {item.total_required_skills ?? 0} yêu cầu</span>
        </div>
        <div style={{ height: 6, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: col.bar, borderRadius: 99, transition: 'width 0.8s ease' }} />
        </div>
      </div>

      {/* Skills preview */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        {matchedSkills.length > 0 && (
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-success)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, display:'flex', alignItems:'center', gap:3 }}><CheckCircle2 size={10} />Đã có</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {matchedSkills.map(s => (
                <span key={s.name} style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 99, background: '#d1fae5', color: '#065f46', fontWeight: 500 }}>{s.name}</span>
              ))}
              {(item.matched_skills?.length ?? 0) > 4 && (
                <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 99, background: '#f3f4f6', color: '#6b7280' }}>+{(item.matched_skills?.length ?? 0) - 4}</span>
              )}
            </div>
          </div>
        )}
        {gapSkills.length > 0 && (
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, display:'flex', alignItems:'center', gap:3 }}><XCircle size={10} />Cần học</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {gapSkills.map(s => (
                <span key={s.name} style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 99, background: '#fee2e2', color: '#991b1b', fontWeight: 500 }}>{s.name}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--neu-border, #f3f4f6)', paddingTop: '0.75rem', marginTop: 'auto' }}>
        <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>
          {item.cv_filename && <span className="flex items-center gap-1"><FileText size={11} />{item.cv_filename}</span>}
        </div>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--neu-accent)', display: 'flex', alignItems: 'center', gap: 4 }}>
          Xem chi tiết
          <ChevronRight size={12} />
        </span>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════ */
const CVHistoryPage = () => {
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<SkillGapAnalysis[]>([]);
  const [careerNames, setCareerNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'match'>('date');
  const [filterMin, setFilterMin] = useState<number>(0);

  useEffect(() => {
    skillGapService.getMyAnalyses(50)
      .then(async data => {
        setAnalyses(data);
        // fetch career names in background
        const ids = [...new Set(data.map(d => d.career_id).filter(Boolean))];
        const map: Record<string, string> = {};
        await Promise.all(ids.map(id =>
          careerService.get(id).then(c => { map[id] = c.title || id; }).catch(() => { map[id] = id; })
        ));
        setCareerNames(map);
      })
      .catch(() => setError('Không thể tải lịch sử phân tích.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = analyses
    .filter(a => {
      const q = search.toLowerCase();
      const careerN = careerNames[a.career_id] || a.career_id || '';
      return (
        (a.cv_name?.toLowerCase().includes(q) || careerN.toLowerCase().includes(q) || q === '') &&
        Math.round(a.match_percentage ?? 0) >= filterMin
      );
    })
    .sort((a, b) => {
      if (sortBy === 'match') return (b.match_percentage ?? 0) - (a.match_percentage ?? 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  // Stats
  const avgMatch = analyses.length ? Math.round(analyses.reduce((s, a) => s + (a.match_percentage ?? 0), 0) / analyses.length) : 0;
  const best = analyses.reduce((mx, a) => (a.match_percentage ?? 0) > (mx?.match_percentage ?? 0) ? a : mx, analyses[0]);
  const totalSkillsGained = analyses.reduce((s, a) => s + (a.matched_skills_count ?? 0), 0);

  return (
    <MainLayout>
      <div style={{ minHeight: '100vh', background: 'var(--neu-bg)', padding: '0 0 4rem' }}>

        {/* ── Header banner ── */}
        <div style={{
          background: 'linear-gradient(135deg, var(--neu-accent, #16a34a) 0%, 0d9488 100%)',
          padding: '2.5rem 2rem 2rem',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, background: 'rgba(255,255,255,0.07)', borderRadius: '50%', pointerEvents: 'none' }} />
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fff', margin: '0 0 0.3rem', letterSpacing: '-0.02em' }}>
                  <History size={22} className="inline mr-2 mb-1" />Lịch sử phân tích CV
                </h1>
                <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.75)', margin: 0 }}>
                  Xem lại tất cả kết quả phân tích khoảng cách kỹ năng của bạn
                </p>
              </div>
              <button
                onClick={() => navigate('/skill-gap')}
                style={{
                  background: 'rgba(255,255,255,0.18)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.35)',
                  borderRadius: 10, padding: '0.55rem 1.25rem', fontWeight: 700, fontSize: '0.88rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                  backdropFilter: 'blur(8px)',
                }}
              >
                + Phân tích CV mới
              </button>
            </div>

            {/* Summary stats */}
            {!loading && analyses.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px,100%), 1fr))', gap: '0.75rem', marginTop: '1.5rem' }}>
                {[
                  { label: 'Tổng lượt phân tích', value: analyses.length, suffix: '' },
                  { label: 'Điểm match trung bình', value: avgMatch, suffix: '%' },
                  { label: 'Kỹ năng khớp (cộng dồn)', value: totalSkillsGained, suffix: '' },
                  { label: 'Match cao nhất', value: Math.round(best?.match_percentage ?? 0), suffix: '%' },
                ].map((s, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', borderRadius: 12, padding: '0.85rem 1rem' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>{s.value}{s.suffix}</div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)', marginTop: 3, fontWeight: 500 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.75rem 1.5rem 0' }}>

          {/* ── Filters ── */}
          {!loading && analyses.length > 0 && (
            <div style={{
              background: 'var(--neu-bg-card, #fff)',
              border: '1px solid var(--neu-border, #e5e7eb)',
              borderRadius: 14, padding: '1rem 1.25rem',
              display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
              marginBottom: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}>
              {/* Search */}
              <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Tìm theo tên CV hoặc nghề..."
                  style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2rem', border: '1px solid var(--neu-border, #e5e7eb)', borderRadius: 8, fontSize: '0.875rem', color: 'var(--neu-text, #111)', background: 'var(--neu-bg, #f9fafb)', boxSizing: 'border-box' }}
                />
              </div>

              {/* Sort */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 600 }}>Sắp xếp:</span>
                {[{ k: 'date', l: 'Mới nhất' }, { k: 'match', l: 'Điểm cao nhất' }].map(o => (
                  <button key={o.k} onClick={() => setSortBy(o.k as any)}
                    style={{ padding: '0.35rem 0.85rem', borderRadius: 8, border: `1.5px solid ${sortBy === o.k ? 'var(--neu-accent)' : 'var(--neu-border,#e5e7eb)'}`, background: sortBy === o.k ? 'rgba(34,197,94,0.08)' : 'transparent', color: sortBy === o.k ? 'var(--neu-accent)' : '#6b7280', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
                    {o.l}
                  </button>
                ))}
              </div>

              {/* Match filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 600 }}>Match ≥</span>
                {[0, 40, 60, 80].map(v => (
                  <button key={v} onClick={() => setFilterMin(v)}
                    style={{ padding: '0.35rem 0.7rem', borderRadius: 8, border: `1.5px solid ${filterMin === v ? 'var(--neu-accent)' : 'var(--neu-border,#e5e7eb)'}`, background: filterMin === v ? 'rgba(34,197,94,0.08)' : 'transparent', color: filterMin === v ? 'var(--neu-accent)' : '#6b7280', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
                    {v === 0 ? 'Tất cả' : `${v}%`}
                  </button>
                ))}
              </div>

              <div style={{ marginLeft: 'auto', fontSize: '0.82rem', color: '#9ca3af', fontWeight: 500 }}>
                {filtered.length} / {analyses.length} kết quả
              </div>
            </div>
          )}

          {/* ── Loading ── */}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 1rem', gap: '1rem', color: '#9ca3af' }}>
              <div style={{ width: 36, height: 36, border: '3px solid #e5e7eb', borderTopColor: 'var(--neu-accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <span style={{ fontSize: '0.9rem' }}>Đang tải lịch sử phân tích...</span>
            </div>
          )}

          {/* ── Error ── */}
          {error && (
            <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
              <AlertTriangle size={44} className="mx-auto mb-3 text-red-500" />
              <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: '0.5rem' }}>{error}</div>
              <button onClick={() => navigate('/skill-gap')} style={{ marginTop: '1rem', padding: '0.6rem 1.5rem', background: 'var(--neu-accent)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>
                Phân tích CV ngay
              </button>
            </div>
          )}

          {/* ── Empty ── */}
          {!loading && !error && analyses.length === 0 && (
            <div style={{ textAlign: 'center', padding: '5rem 1rem' }}>
              <FolderOpen size={56} className="mx-auto mb-4 text-gray-300" />
              <h3 style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--neu-text,#111)', margin: '0 0 0.5rem' }}>Chưa có lịch sử phân tích</h3>
              <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Upload CV và chọn nghề nghiệp mục tiêu để bắt đầu phân tích khoảng cách kỹ năng.</p>
              <button onClick={() => navigate('/skill-gap')}
                style={{ padding: '0.75rem 2rem', background: 'linear-gradient(135deg, var(--neu-accent), 0d9488)', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(34,197,94,0.3)' }}>
                + Phân tích CV đầu tiên
              </button>
            </div>
          )}

          {/* ── No filter results ── */}
          {!loading && !error && analyses.length > 0 && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#9ca3af' }}>
              <Search size={32} className="mx-auto mb-2 text-gray-300" />
              <p style={{ fontSize: '0.9rem' }}>Không tìm thấy kết quả phù hợp.</p>
              <button onClick={() => { setSearch(''); setFilterMin(0); }} style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--neu-accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                Xóa bộ lọc
              </button>
            </div>
          )}

          {/* ── Grid ── */}
          {!loading && !error && filtered.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
              {filtered.map(item => (
                <AnalysisCard
                  key={item.id}
                  item={item}
                  careerName={careerNames[item.career_id] || ''}
                  onView={() => navigate(`/skill-gap/${item.id}`)}
                />
              ))}
            </div>
          )}

          {/* ── Timeline view (most recent 5) ── */}
          {!loading && !error && analyses.length > 0 && search === '' && filterMin === 0 && (
            <div style={{ marginTop: '2.5rem' }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--neu-text,#111)', marginBottom: '1rem' }}>
                <TrendingUp size={16} className="inline mr-2" />Tiến trình cải thiện
              </h2>
              <div style={{ background: 'var(--neu-bg-card,#fff)', border: '1px solid var(--neu-border,#e5e7eb)', borderRadius: 14, padding: '1.25rem 1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                {/* bar chart of last 8 */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 80 }}>
                  {[...analyses].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).slice(-8).map((a, i) => {
                    const pct = Math.round(a.match_percentage ?? 0);
                    const col = matchColor(pct);
                    return (
                      <div key={i} title={`${fmtDateShort(a.created_at)}: ${pct}%`} onClick={() => navigate(`/skill-gap/${a.id}`)}
                        style={{ flex: 1, borderRadius: '4px 4px 0 0', height: `${Math.max(8, pct)}%`, background: col.bar, cursor: 'pointer', transition: 'opacity 0.15s', position: 'relative' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.75'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
                      />
                    );
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  {[...analyses].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).slice(-8).map((a, i) => (
                    <span key={i} style={{ flex: 1, textAlign: 'center', fontSize: '0.65rem', color: '#9ca3af' }}>
                      {new Date(a.created_at).toLocaleDateString('vi-VN', { month: 'numeric', day: 'numeric' })}
                    </span>
                  ))}
                </div>
                <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: '#9ca3af', textAlign: 'center' }}>
                  {analyses.length > 1
                    ? `Điểm match thay đổi từ ${Math.round(analyses[analyses.length - 1]?.match_percentage ?? 0)}% → ${Math.round(analyses[0]?.match_percentage ?? 0)}% qua ${analyses.length} lần phân tích`
                    : 'Phân tích thêm CV để xem tiến trình cải thiện'}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </MainLayout>
  );
};

export default CVHistoryPage;
