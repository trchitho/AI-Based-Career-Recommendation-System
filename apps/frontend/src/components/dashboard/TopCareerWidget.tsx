import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CareerSuggestion } from '../../types/dashboard';
import { careerService, CareerDetailDTO } from '../../services/careerService';

interface Props {
  career: CareerSuggestion;
}

function fmtVnd(n?: number | null) {
  if (!n) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}.000.000 ₫`;
  return `${n.toLocaleString('vi-VN')} ₫`;
}

const TopCareerWidget: React.FC<Props> = ({ career }) => {
  const navigate = useNavigate();
  const careerId = (career as any).slug || career.id;
  const careerTitle = career.title || careerId;

  const [detail, setDetail] = useState<CareerDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    careerService.getDetail(careerId, 'free', 'vi')
      .then(d => { if (!cancelled) setDetail(d); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [careerId]);

  const wages = detail?.sections?.wages;
  const monthlyMedian = wages?.monthly_median_vnd;
  const monthlyMin = wages?.monthly_min_vnd;
  const monthlyMax = wages?.monthly_max_vnd;
  const regionHcm = wages?.region_hcm_monthly;
  const regionHanoi = wages?.region_hanoi_monthly;
  const regionDanang = wages?.region_danang_monthly;
  const demand = wages?.market_demand ?? detail?.sections?.outlook?.growth_label;

  const topSkills = (detail?.sections?.skills ?? [])
    .filter(s => s.importance && s.importance > 3)
    .slice(0, 5)
    .map(s => s.name);

  const topTech = (detail?.sections?.technology ?? [])
    .filter(t => t.hot_flag || t.in_demand_flag)
    .slice(0, 4)
    .map(t => t.name);

  const trendingTags = [...new Set([...topTech, ...topSkills])].slice(0, 5);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px,100%), 1fr))',
      gap: 0,
      background: '#fff',
      borderRadius: 20,
      border: '1px solid #e5e7eb',
      overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
    }}>

      {/* ── LEFT: Career name + CTA ── */}
      <div style={{
        padding: '2rem 2rem',
        borderRight: '1px solid #f3f4f6',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* decorative circle */}
        <div style={{
          position: 'absolute', top: -40, right: -40,
          width: 160, height: 160,
          background: 'rgba(139,92,246,0.12)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -30, left: -30,
          width: 100, height: 100,
          background: 'rgba(99,102,241,0.1)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: '#7c3aed', marginBottom: '0.6rem',
            display: 'flex', alignItems: 'center', gap: '0.4rem',
          }}>
            <span style={{
              display: 'inline-block', width: 8, height: 8,
              background: '#7c3aed', borderRadius: '50%',
              boxShadow: '0 0 0 3px rgba(124,58,237,0.2)',
            }} />
            Nghề phù hợp nhất
          </div>

          <h2 style={{
            fontSize: '1.55rem',
            fontWeight: 900,
            color: '#1e1b4b',
            lineHeight: 1.25,
            marginBottom: '1.25rem',
            letterSpacing: '-0.02em',
          }}>
            {careerTitle}
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
            <span style={{
              fontSize: '2rem', fontWeight: 900, color: '#4f46e5', lineHeight: 1,
            }}>
              {career.matchPercentage}%
            </span>
            <span style={{
              fontSize: '0.75rem', fontWeight: 600, color: '#7c3aed',
              background: 'rgba(124,58,237,0.1)',
              padding: '0.2rem 0.6rem', borderRadius: 99,
            }}>
              AI Match Score
            </span>
          </div>

          <button
            className="bg-indigo-600"
            onClick={() => navigate(`/careers/${careerId}`)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.7rem 1.4rem',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              color: '#fff', border: 'none', borderRadius: 12,
              fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(79,70,229,0.35)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(79,70,229,0.45)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = '';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(79,70,229,0.35)';
            }}
          >
            Xem nghề này
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── RIGHT: Market Snapshot ── */}
      <div style={{ padding: '1.75rem 2rem', background: '#fafafa' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.6rem', color: '#9ca3af' }}>
            <div style={{ width: 18, height: 18, border: '3px solid #e5e7eb', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: '0.85rem' }}>Đang tải...</span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#111', marginBottom: '1.1rem', letterSpacing: '-0.01em' }}>
              💰 Thông tin thị trường
            </div>

            {/* Demand */}
            {demand && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>Nhu cầu tuyển dụng</span>
                <span style={{
                  fontSize: '0.82rem', fontWeight: 700,
                  color: demand.toLowerCase().includes('high') || demand.toLowerCase().includes('tăng') || demand.toLowerCase().includes('cao') ? '#10b981' : '#f59e0b',
                  display: 'flex', alignItems: 'center', gap: 3,
                }}>
                  {(demand.toLowerCase().includes('high') || demand.toLowerCase().includes('tăng') || demand.toLowerCase().includes('cao')) ? '↗' : '→'} {demand}
                </span>
              </div>
            )}

            {/* Salary */}
            {(monthlyMedian || monthlyMin) && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.67rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>
                  Lương trung bình / tháng (VN)
                </div>
                <div style={{ fontWeight: 900, fontSize: '1.6rem', color: '#10b981', lineHeight: 1 }}>
                  {fmtVnd(monthlyMedian)}
                </div>
                {(monthlyMin || monthlyMax) && (
                  <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    {monthlyMin && monthlyMax
                      ? `${fmtVnd(monthlyMin)} – ${fmtVnd(monthlyMax)}`
                      : monthlyMin ? `Từ ${fmtVnd(monthlyMin)}` : `Đến ${fmtVnd(monthlyMax)}`}
                  </div>
                )}

                {(regionHcm || regionHanoi || regionDanang) && (
                  <div style={{ marginTop: '0.6rem', padding: '0.6rem 0.75rem', background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb' }}>
                    <div style={{ fontSize: '0.67rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.4rem' }}>
                      Theo khu vực
                    </div>
                    {regionHcm && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#374151', marginBottom: '0.2rem' }}>
                        <span>Hồ Chí Minh</span><span style={{ fontWeight: 600 }}>{fmtVnd(regionHcm)}</span>
                      </div>
                    )}
                    {regionHanoi && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#374151', marginBottom: '0.2rem' }}>
                        <span>Hà Nội</span><span style={{ fontWeight: 600 }}>{fmtVnd(regionHanoi)}</span>
                      </div>
                    )}
                    {regionDanang && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#374151' }}>
                        <span>Đà Nẵng</span><span style={{ fontWeight: 600 }}>{fmtVnd(regionDanang)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Trending skills */}
            {trendingTags.length > 0 && (
              <div>
                <div style={{ fontSize: '0.67rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.45rem' }}>
                  Kỹ năng nổi bật
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {trendingTags.map(tag => (
                    <span key={tag} style={{
                      fontSize: '0.75rem', padding: '0.25rem 0.65rem',
                      background: '#f3f4f6', color: '#374151',
                      borderRadius: 99, fontWeight: 500, border: '1px solid #e5e7eb',
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* No data fallback */}
            {!monthlyMedian && !monthlyMin && trendingTags.length === 0 && !demand && (
              <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem', paddingTop: '1rem' }}>
                Chưa có dữ liệu thị trường cho nghề này.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TopCareerWidget;
