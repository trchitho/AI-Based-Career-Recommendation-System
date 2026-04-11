import React, { useState } from 'react';
import { SkillGapAnalysis } from '../../types/skillGap';

interface Props {
  analysis: SkillGapAnalysis;
}

type Status = 'matched' | 'critical' | 'important' | 'nice_to_have';

interface SkillCell {
  name: string;
  status: Status;
  category: string;
}

const STATUS_CONFIG: Record<Status, { label: string; bg: string; border: string; text: string; dot: string }> = {
  matched:     { label: '✅ Đã có',         bg: '#dcfce7', border: '#16a34a', text: '#15803d', dot: '#16a34a' },
  critical:    { label: '🔴 Critical',      bg: '#fee2e2', border: '#dc2626', text: '#991b1b', dot: '#dc2626' },
  important:   { label: '🟠 Quan trọng',    bg: '#ffedd5', border: '#ea580c', text: '#9a3412', dot: '#ea580c' },
  nice_to_have:{ label: '🟡 Nên có',        bg: '#fef9c3', border: '#ca8a04', text: '#854d0e', dot: '#ca8a04' },
};

const SkillHeatmapGrid: React.FC<Props> = ({ analysis }) => {
  const [activeFilter, setActiveFilter] = useState<Status | 'all'>('all');
  const [tooltip, setTooltip] = useState<{ skill: SkillCell; x: number; y: number } | null>(null);

  // Build unified skill list
  const allSkills: SkillCell[] = [
    ...(analysis.matched_skills || []).map(s => ({ name: s.name, status: 'matched' as Status, category: s.category || 'Kỹ năng' })),
    ...(analysis.skill_gaps?.critical || []).map(s => ({ name: s.name, status: 'critical' as Status, category: s.category || 'Kỹ năng' })),
    ...(analysis.skill_gaps?.important || []).map(s => ({ name: s.name, status: 'important' as Status, category: s.category || 'Kỹ năng' })),
    ...(analysis.skill_gaps?.nice_to_have || []).map(s => ({ name: s.name, status: 'nice_to_have' as Status, category: s.category || 'Kỹ năng' })),
  ];

  // Group by category
  const grouped: Record<string, SkillCell[]> = {};
  allSkills.forEach(skill => {
    const cat = skill.category || 'Khác';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(skill);
  });

  const filtered = (skills: SkillCell[]) =>
    activeFilter === 'all' ? skills : skills.filter(s => s.status === activeFilter);

  const counts = {
    matched:      allSkills.filter(s => s.status === 'matched').length,
    critical:     allSkills.filter(s => s.status === 'critical').length,
    important:    allSkills.filter(s => s.status === 'important').length,
    nice_to_have: allSkills.filter(s => s.status === 'nice_to_have').length,
  };

  return (
    <div style={{ background: 'white', borderRadius: 16, padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.25rem', color: '#1e293b' }}>
        🗺️ Bản đồ kỹ năng
      </h2>
      <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
        Tổng quan {allSkills.length} kỹ năng — mức độ phù hợp {analysis.match_percentage?.toFixed(0)}%
      </p>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {([['all', '🔍 Tất cả', allSkills.length], ['matched', '✅ Đã có', counts.matched], ['critical', '🔴 Critical', counts.critical], ['important', '🟠 Quan trọng', counts.important], ['nice_to_have', '🟡 Nên có', counts.nice_to_have]] as [Status | 'all', string, number][]).map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key)}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: 20,
              border: `2px solid ${activeFilter === key ? '#6366f1' : '#e2e8f0'}`,
              background: activeFilter === key ? '#6366f1' : 'white',
              color: activeFilter === key ? 'white' : '#64748b',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {/* Heatmap grid by category */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {Object.entries(grouped).map(([category, skills]) => {
          const visibleSkills = filtered(skills);
          if (visibleSkills.length === 0) return null;
          return (
            <div key={category}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                {category}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {visibleSkills.map((skill, i) => {
                  const cfg = STATUS_CONFIG[skill.status];
                  return (
                    <div
                      key={i}
                      onMouseEnter={(e) => setTooltip({ skill, x: e.clientX, y: e.clientY })}
                      onMouseLeave={() => setTooltip(null)}
                      style={{
                        padding: '0.3rem 0.75rem',
                        borderRadius: 8,
                        background: cfg.bg,
                        border: `1.5px solid ${cfg.border}`,
                        color: cfg.text,
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'default',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        transition: 'transform 0.15s',
                      }}
                      onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                      onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
                      {skill.name}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
        {(Object.entries(STATUS_CONFIG) as [Status, typeof STATUS_CONFIG[Status]][]).map(([key, cfg]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: '#475569' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: cfg.bg, border: `1.5px solid ${cfg.border}`, display: 'inline-block' }} />
            {cfg.label}
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed',
          left: tooltip.x + 12,
          top: tooltip.y - 10,
          background: '#1e293b',
          color: 'white',
          padding: '0.5rem 0.75rem',
          borderRadius: 8,
          fontSize: '0.8rem',
          pointerEvents: 'none',
          zIndex: 9999,
          maxWidth: 200,
        }}>
          <strong>{tooltip.skill.name}</strong>
          <br />
          {STATUS_CONFIG[tooltip.skill.status].label}
          <br />
          <span style={{ color: '#94a3b8' }}>{tooltip.skill.category}</span>
        </div>
      )}
    </div>
  );
};

export default SkillHeatmapGrid;
