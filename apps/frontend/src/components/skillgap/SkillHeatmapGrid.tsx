import React, { useEffect, useState } from 'react';
import { SkillGapAnalysis } from '../../types/skillGap';
import { useTheme } from '../../contexts/ThemeContext';
import { translateSkillCategory, translateSkillName } from '../../utils/skillTranslation';

interface Props {
  analysis: SkillGapAnalysis;
  careerName?: string;
}

type Status = 'matched' | 'important' | 'extra' | 'nice_to_have';

interface SkillCell {
  name: string;
  status: Status;
  category: string;
}

const STATUS_CONFIG: Record<Status, { label: string; bg: string; border: string; text: string; dot: string }> = {
  matched:      { label: 'Đã có',                  bg: '#dcfce7', border: 'var(--color-primary)', text: '#15803d', dot: '#16a34a' },
  important:    { label: 'Quan trọng',             bg: '#ffedd5', border: '#ea580c', text: '#9a3412', dot: '#ea580c' },
  extra:        { label: 'Nên có (nghề CV)',       bg: '#fef9c3', border: '#ca8a04', text: '#854d0e', dot: '#ca8a04' },
  nice_to_have: { label: 'Nên có (nghề Target)',   bg: '#ede9fe', border: '#7c3aed', text: '#5b21b6', dot: '#7c3aed' },
};

const SkillHeatmapGrid: React.FC<Props> = ({ analysis, careerName }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [activeFilter, setActiveFilter] = useState<Status>('important');
  const [tooltip, setTooltip] = useState<{ skill: SkillCell; x: number; y: number } | null>(null);

  const extraSkills = analysis.extra_skills || [];
  const cvCareerRecommendedSkills = extraSkills.slice(0, 10);
  const cvCareerLabel = extraSkills[0]?.current_career || 'nghề CV';
  const targetCareerLabel = careerName || extraSkills[0]?.target_career || 'nghề Target';

  // Build unified skill list
  const allSkills: SkillCell[] = [
    ...(analysis.matched_skills || []).map(s => ({ name: translateSkillName(s.name), status: 'matched' as Status, category: translateSkillCategory(s.category) })),
    ...(analysis.skill_gaps?.critical || []).map(s => ({ name: translateSkillName(s.name), status: 'important' as Status, category: translateSkillCategory(s.category) })),
    ...(analysis.skill_gaps?.important || []).map(s => ({ name: translateSkillName(s.name), status: 'important' as Status, category: translateSkillCategory(s.category) })),
    ...cvCareerRecommendedSkills.map(s => ({ name: translateSkillName(s.name), status: 'extra' as Status, category: translateSkillCategory(s.category) })),
    ...(analysis.skill_gaps?.nice_to_have || []).map(s => ({ name: translateSkillName(s.name), status: 'nice_to_have' as Status, category: translateSkillCategory(s.category) })),
  ];

  // Group by category
  const grouped: Record<string, SkillCell[]> = {};
  allSkills.forEach(skill => {
    const cat = skill.category || 'Khác';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(skill);
  });

  const filtered = (skills: SkillCell[]) =>
    skills.filter(s => s.status === activeFilter);

  const counts = {
    matched:      allSkills.filter(s => s.status === 'matched').length,
    important:    allSkills.filter(s => s.status === 'important').length,
    extra:        allSkills.filter(s => s.status === 'extra').length,
    nice_to_have: allSkills.filter(s => s.status === 'nice_to_have').length,
  };

  useEffect(() => {
    if (counts[activeFilter] > 0) return;
    const next = (['important', 'matched', 'extra', 'nice_to_have'] as Status[]).find((key) => counts[key] > 0);
    if (next && next !== activeFilter) setActiveFilter(next);
  }, [activeFilter, counts.important, counts.matched, counts.extra, counts.nice_to_have]);

  // Dynamic labels with career names
  const filterButtons: [Status, string, number][] = [
    ['matched', 'Đã có', counts.matched],
    ['important', 'Quan trọng', counts.important],
    ['extra', `Nên có (${cvCareerLabel})`, counts.extra],
    ['nice_to_have', `Nên có (${targetCareerLabel})`, counts.nice_to_have],
  ];

  return (
    <div style={{ background: isDark ? '#1e293b' : 'white', borderRadius: 16, padding: '1.5rem', boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.08)' }}>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.25rem', color: isDark ? '#f1f5f9' : '#1e293b' }}>
         Bản đồ kỹ năng
      </h2>
      <p style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
        Tổng quan {allSkills.length} kỹ năng — mức độ phù hợp {analysis.match_percentage?.toFixed(0)}%
      </p>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {filterButtons.filter(([, , count]) => count > 0).map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key)}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: 20,
              border: `2px solid ${activeFilter === key ? STATUS_CONFIG[key].border : '#e2e8f0'}`,
              background: activeFilter === key ? STATUS_CONFIG[key].border : 'white',
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
        {(['matched', 'important', 'extra', 'nice_to_have'] as Status[]).filter(key => counts[key] > 0).map((key) => {
          const cfg = STATUS_CONFIG[key];
          return (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: '#475569' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: cfg.bg, border: `1.5px solid ${cfg.border}`, display: 'inline-block' }} />
            {cfg.label}
          </div>
          );
        })}
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
