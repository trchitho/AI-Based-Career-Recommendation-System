import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, Target, GraduationCap, FileText, ChevronRight,
  Clock, TrendingUp, Sparkles, Map, ArrowRight, BarChart3,
} from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import LearningPlan from '../components/skillgap/LearningPlan';
import learningPathService, {
  MyRoadmap, SuggestedRoadmap, SkillGapPlan,
} from '../services/learningPathService';
import { useTheme } from '../contexts/ThemeContext';
import './LearningPathPage.css';

/* ═══════════════════════════════════════════════════════════════
   Helper
   ═══════════════════════════════════════════════════════════════ */
function progressColor(pct: number) {
  if (pct >= 75) return '#16a34a';
  if (pct >= 40) return '#f59e0b';
  if (pct >= 10) return '#6366f1';
  return '#94a3b8';
}

function scoreColor(score: number) {
  if (score >= 80) return { bg: '#dcfce7', color: '#166534' };
  if (score >= 60) return { bg: '#dbeafe', color: '#1e40af' };
  return { bg: '#f3e8ff', color: '#6b21a8' };
}

/* ═══════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════ */
const LearningPathPage = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [myRoadmaps, setMyRoadmaps] = useState<MyRoadmap[]>([]);
  const [suggested, setSuggested] = useState<SuggestedRoadmap[]>([]);
  const [plans, setPlans] = useState<SkillGapPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlan, setExpandedPlan] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      learningPathService.getMyRoadmaps().catch(() => []),
      learningPathService.getSuggestedRoadmaps().catch(() => []),
      learningPathService.getSkillGapPlans().catch(() => []),
    ]).then(([my, sug, pl]) => {
      setMyRoadmaps(my);
      setSuggested(sug);
      setPlans(pl);
      // Auto-expand first plan if available
      if (pl.length > 0) setExpandedPlan(pl[0].analysis_id);
    }).finally(() => setLoading(false));
  }, []);

  const goToRoadmap = (slug: string | null, onet: string | null) => {
    if (slug) {
      navigate(`/careers/${slug}/roadmap`);
    } else if (onet) {
      navigate(`/careers/${onet}/roadmap`);
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════ */
  return (
    <MainLayout>
      <div className="lp-page">
        {/* Hero */}
        <div className="lp-hero">
          <h1>📚 Lộ Trình Học Tập</h1>
          <p className="lp-hero-sub">
            Tổng quan tiến độ học tập, lộ trình gợi ý và kế hoạch cá nhân hóa từ AI
          </p>
        </div>

        {loading ? (
          <div className="lp-loading">
            <div className="lp-spinner" />
            <span style={{ color: 'var(--neu-text-muted)', fontSize: '0.9rem' }}>
              Đang tải lộ trình học tập...
            </span>
          </div>
        ) : (
          <>
            {/* ══════════ SECTION 1: Lộ trình đang học ══════════ */}
            <section className="lp-section">
              <div className="lp-section-header">
                <div className="lp-section-icon" style={{ background: 'linear-gradient(135deg, #16a34a, #059669)' }}>
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h2 className="lp-section-title">Lộ trình đang học</h2>
                  <p className="lp-section-desc">Tiến độ các lộ trình bạn đã bắt đầu</p>
                </div>
              </div>

              {myRoadmaps.length === 0 ? (
                <div className="lp-empty">
                  <div className="lp-empty-icon"><BookOpen size={24} /></div>
                  <h3>Chưa bắt đầu lộ trình nào</h3>
                  <p>Hãy chọn một nghề nghiệp và bắt đầu lộ trình học tập của bạn.</p>
                  <button className="lp-btn lp-btn-primary" onClick={() => navigate('/careers')}>
                    <Target size={15} /> Khám phá nghề nghiệp
                  </button>
                </div>
              ) : (
                <div className="lp-grid">
                  {myRoadmaps.map((rm) => (
                    <div key={rm.roadmap_id} className="lp-card">
                      <div className="lp-card-title">{rm.career_title || rm.roadmap_title || 'Lộ trình'}</div>
                      <div className="lp-card-meta">
                        <span><Clock size={13} /> {rm.completed_count}/{rm.total_milestones} bước</span>
                        {rm.last_updated && (
                          <span>· Cập nhật {new Date(rm.last_updated).toLocaleDateString('vi-VN')}</span>
                        )}
                      </div>
                      <div className="lp-progress-wrap">
                        <div className="lp-progress-track">
                          <div
                            className="lp-progress-fill"
                            style={{
                              width: `${Math.min(rm.progress_percentage, 100)}%`,
                              background: progressColor(rm.progress_percentage),
                            }}
                          />
                        </div>
                        <span className="lp-progress-label" style={{ color: progressColor(rm.progress_percentage) }}>
                          {Math.round(rm.progress_percentage)}%
                        </span>
                      </div>
                      <button
                        className="lp-btn lp-btn-outline"
                        onClick={() => goToRoadmap(rm.career_slug, rm.onet_code)}
                      >
                        Tiếp tục học <ChevronRight size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ══════════ SECTION 2: Lộ trình gợi ý ══════════ */}
            <section className="lp-section">
              <div className="lp-section-header">
                <div className="lp-section-icon" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <h2 className="lp-section-title">Lộ trình gợi ý</h2>
                  <p className="lp-section-desc">Nghề nghiệp phù hợp từ kết quả đánh giá của bạn</p>
                </div>
              </div>

              {suggested.length === 0 ? (
                <div className="lp-empty">
                  <div className="lp-empty-icon"><GraduationCap size={24} /></div>
                  <h3>Chưa có gợi ý</h3>
                  <p>Hoàn thành bài đánh giá để nhận gợi ý nghề nghiệp phù hợp.</p>
                  <button className="lp-btn lp-btn-primary" onClick={() => navigate('/assessment')}>
                    <Target size={15} /> Làm bài đánh giá
                  </button>
                </div>
              ) : (
                <div className="lp-grid">
                  {suggested.map((s) => {
                    const sc = scoreColor(s.score);
                    return (
                      <div key={s.career_id} className="lp-card">
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                          <div className="lp-card-title">{s.career_title}</div>
                          <span className="lp-score-badge" style={{ background: isDark ? `${sc.color}20` : sc.bg, color: sc.color }}>
                            <BarChart3 size={12} /> {Math.round(s.score)}%
                          </span>
                        </div>
                        <div className="lp-card-meta">
                          {s.total_milestones > 0 && (
                            <span><Map size={13} /> {s.total_milestones} bước trong lộ trình</span>
                          )}
                          {s.onet_code && <span>· {s.onet_code}</span>}
                        </div>
                        <button
                          className="lp-btn lp-btn-primary"
                          onClick={() => goToRoadmap(s.career_slug, s.onet_code)}
                          disabled={!s.roadmap_id}
                        >
                          <ArrowRight size={14} /> Bắt đầu học
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ══════════ SECTION 3: Lộ trình cá nhân hóa từ CV ══════════ */}
            <section className="lp-section">
              <div className="lp-section-header">
                <div className="lp-section-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className="lp-section-title">Lộ trình cá nhân hóa từ CV</h2>
                  <p className="lp-section-desc">Kế hoạch học tập AI tạo dựa trên kỹ năng còn thiếu của bạn</p>
                </div>
              </div>

              {plans.length === 0 ? (
                <div className="lp-empty">
                  <div className="lp-empty-icon"><FileText size={24} /></div>
                  <h3>Chưa có lộ trình cá nhân hóa</h3>
                  <p>Upload CV và phân tích kỹ năng để AI tạo lộ trình học tập riêng cho bạn.</p>
                  <button className="lp-btn lp-btn-primary" onClick={() => navigate('/skill-gap')}>
                    <FileText size={15} /> Phân tích CV
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {plans.map((plan) => (
                    <div key={plan.analysis_id} className="lp-plan-card">
                      {/* Plan Header */}
                      <div className="lp-plan-header">
                        <div>
                          <h3 className="lp-plan-title">
                            {plan.career_title || plan.career_id || 'Lộ trình học tập'}
                          </h3>
                          <div className="lp-card-meta" style={{ marginTop: '0.3rem' }}>
                            {plan.match_percentage != null && (
                              <span className="lp-milestone-tag">
                                <BarChart3 size={11} /> Phù hợp {Math.round(plan.match_percentage)}%
                              </span>
                            )}
                            {plan.missing_skills_count != null && (
                              <span className="lp-milestone-tag" style={{ background: '#fef3c7', color: '#92400e' }}>
                                Thiếu {plan.missing_skills_count} kỹ năng
                              </span>
                            )}
                            {plan.learning_plan?.total_weeks && (
                              <span className="lp-milestone-tag" style={{ background: '#dbeafe', color: '#1e40af' }}>
                                <Clock size={11} /> {plan.learning_plan.total_weeks} tuần
                              </span>
                            )}
                            {plan.created_at && (
                              <span style={{ fontSize: '0.78rem', color: 'var(--neu-text-muted)' }}>
                                · {new Date(plan.created_at).toLocaleDateString('vi-VN')}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          className="lp-btn lp-btn-outline"
                          onClick={() => setExpandedPlan(expandedPlan === plan.analysis_id ? null : plan.analysis_id)}
                        >
                          {expandedPlan === plan.analysis_id ? 'Thu gọn' : 'Xem chi tiết'}
                          <ChevronRight
                            size={14}
                            style={{
                              transform: expandedPlan === plan.analysis_id ? 'rotate(90deg)' : 'none',
                              transition: 'transform 0.2s',
                            }}
                          />
                        </button>
                      </div>

                      {/* Plan Summary */}
                      {plan.learning_plan?.summary && expandedPlan !== plan.analysis_id && (
                        <p style={{
                          fontSize: '0.85rem',
                          color: 'var(--neu-text-muted)',
                          margin: 0,
                          lineHeight: 1.6,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}>
                          {plan.learning_plan.summary}
                        </p>
                      )}

                      {/* Expanded: Full Learning Plan */}
                      {expandedPlan === plan.analysis_id && plan.learning_plan && (
                        <div style={{ marginTop: '0.75rem' }}>
                          <LearningPlan
                            plan={plan.learning_plan as any}
                            careerName={plan.career_title || plan.career_id || ''}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default LearningPathPage;
