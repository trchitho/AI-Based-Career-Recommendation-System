import React, { useState } from 'react';
import { LearningPlan as LearningPlanType, LearningPhase } from '../../types/skillGap';
import { useTheme } from '../../contexts/ThemeContext';

interface Props {
  plan: LearningPlanType;
  careerName: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  Coursera: '#0056D2',
  Udemy: '#a435f0',
  YouTube: '#ff0000',
  freeCodeCamp: '#0a0a23',
  docs: '#475569',
  practice: '#059669',
};

const TYPE_ICONS: Record<string, string> = {
  course: '🎓',
  video: '▶️',
  docs: '📄',
  practice: '💻',
};

const PHASE_COLORS = ['#16a34a', '#0d9488', '#0891b2', '#d97706'];

const LearningPlan: React.FC<Props> = ({ plan, careerName }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [openPhase, setOpenPhase] = useState<number>(0);

  return (
    <div style={{ background: isDark ? '#1e293b' : 'white', borderRadius: 16, padding: '1.5rem', boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.08)' }}>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.25rem', color: isDark ? '#f1f5f9' : '#1e293b' }}>
        🗺️ Lộ trình học tập
      </h2>
      <p style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        {plan.summary || `Lộ trình ${plan.total_weeks} tuần để trở thành ${careerName}`}
      </p>

      {/* Timeline overview */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {plan.milestones?.map((m, i) => (
          <React.Fragment key={i}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 100 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', background: '#16a34a', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem',
              }}>
                W{m.week}
              </div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#1e293b', marginTop: 4, textAlign: 'center', maxWidth: 90 }}>
                {m.title}
              </div>
            </div>
            {i < (plan.milestones.length - 1) && (
              <div style={{ flex: 1, height: 2, background: '#e2e8f0', minWidth: 30 }} />
            )}
          </React.Fragment>
        ))}
        {!plan.milestones?.length && (
          <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Chưa có milestone</div>
        )}
      </div>

      {/* Phases */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {plan.phases?.map((phase, idx) => {
          const color = PHASE_COLORS[idx % PHASE_COLORS.length];
          const isOpen = openPhase === idx;
          return (
            <div key={idx} style={{ border: `1.5px solid ${isOpen ? color : isDark ? '#334155' : '#e2e8f0'}`, borderRadius: 12, overflow: 'hidden', transition: 'border-color 0.2s' }}>
              {/* Phase header */}
              <button
                onClick={() => setOpenPhase(isOpen ? -1 : idx)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.85rem 1.1rem', background: isOpen ? `${color}10` : isDark ? '#0f172a' : 'white',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', background: color,
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '0.85rem', flexShrink: 0,
                }}>
                  {phase.phase}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: isDark ? '#f1f5f9' : '#1e293b', fontSize: '0.95rem' }}>{phase.title}</div>
                  <div style={{ fontSize: '0.78rem', color: isDark ? '#94a3b8' : '#64748b' }}>{phase.weeks} · {phase.focus}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', maxWidth: 200 }}>
                  {phase.skills?.slice(0, 3).map((s, i) => (
                    <span key={i} style={{ padding: '0.15rem 0.5rem', background: `${color}20`, color, borderRadius: 12, fontSize: '0.72rem', fontWeight: 600 }}>
                      {s}
                    </span>
                  ))}
                  {phase.skills?.length > 3 && (
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>+{phase.skills.length - 3}</span>
                  )}
                </div>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8', marginLeft: '0.5rem' }}>{isOpen ? '▲' : '▼'}</span>
              </button>

              {/* Phase detail */}
              {isOpen && (
                <div style={{ padding: '1rem 1.1rem', borderTop: `1px solid ${color}30`, background: isDark ? '#1e293b' : '#fafafa' }}>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: isDark ? '#94a3b8' : '#475569', marginBottom: '0.4rem' }}>KỸ NĂNG TRONG GIAI ĐOẠN</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {phase.skills?.map((s, i) => (
                        <span key={i} style={{ padding: '0.2rem 0.6rem', background: `${color}15`, color, border: `1px solid ${color}40`, borderRadius: 6, fontSize: '0.8rem', fontWeight: 600 }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
                    📚 TÀI NGUYÊN HỌC TẬP
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {phase.resources?.map((r, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.6rem 0.75rem', background: isDark ? '#0f172a' : 'white', borderRadius: 8,
                        border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                      }}>
                        <span style={{ fontSize: '1.1rem' }}>{TYPE_ICONS[r.type] || '📖'}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: isDark ? '#f1f5f9' : '#1e293b' }}>{r.name}</div>
                          <div style={{ fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#64748b' }}>{r.level}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                          <span style={{
                            padding: '0.15rem 0.5rem', borderRadius: 4, fontSize: '0.72rem', fontWeight: 700,
                            background: PLATFORM_COLORS[r.platform] || '#16a34a', color: 'white',
                          }}>
                            {r.platform}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: r.free ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                            {r.free ? '🆓 Miễn phí' : '💳 Trả phí'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {(!phase.resources || phase.resources.length === 0) && (
                      <div style={{ color: '#94a3b8', fontSize: '0.82rem' }}>Tìm kiếm trên Coursera, YouTube, Udemy</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Total time */}
      <div style={{ marginTop: '1.25rem', padding: '0.75rem 1rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '1.2rem' }}>⏱️</span>
        <span style={{ fontSize: '0.88rem', color: '#166534', fontWeight: 600 }}>
          Tổng thời gian ước tính: <strong>{plan.total_weeks} tuần</strong>
        </span>
      </div>
    </div>
  );
};

export default LearningPlan;
