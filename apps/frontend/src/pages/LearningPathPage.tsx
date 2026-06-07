import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, Target, GraduationCap, FileText, ChevronRight, CheckCircle,
  Clock, TrendingUp, Sparkles, Map, ArrowRight, BarChart3,
} from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import LearningPlan from '../components/skillgap/LearningPlan';
import learningPathService, {
  MyRoadmap, SuggestedRoadmap, SkillGapPlan,
} from '../services/learningPathService';
import { assessmentService } from '../services/assessmentService';
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
  const [showAllPlans, setShowAllPlans] = useState(false);
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const [hasAssessments, setHasAssessments] = useState(false);

  // Tách 2 nhóm: completed (xếp trên) và in-progress/pending (xếp dưới)
  const completedPlans = useMemo(
    () => plans.filter(p => p.has_personalized_roadmap && !!p.personalized_completed_at),
    [plans]
  );
  const ongoingPlans = useMemo(
    () => plans.filter(p => !(p.has_personalized_roadmap && !!p.personalized_completed_at)),
    [plans]
  );

  useEffect(() => {
    Promise.all([
      learningPathService.getMyRoadmaps().catch(() => []),
      learningPathService.getSuggestedRoadmaps().catch(() => []),
      learningPathService.getSkillGapPlans().catch(() => []),
      assessmentService.getHistory().catch(() => []),
    ]).then(([my, sug, pl, history]) => {
      setMyRoadmaps(my);
      setSuggested(sug);
      setPlans(pl);
      setHasAssessments(Array.isArray(history) && history.length > 0);
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
          <h1>Lộ Trình Học Tập</h1>
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
                    <div key={rm.roadmap_id} className="lp-card group" style={{ position: 'relative' }}>
                      <div className="lp-card-title" style={{ minHeight: '2.6em' }}>{rm.career_title || rm.roadmap_title || 'Lộ trình'}</div>
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
                      <div style={{ marginTop: 'auto' }}>
                        <button
                          className="lp-btn lp-btn-outline"
                          onClick={() => goToRoadmap(rm.career_slug, rm.onet_code)}
                        >
                          Tiếp tục học <ChevronRight size={14} />
                        </button>
                      </div>

                      {/* Hover tooltip */}
                      <div className="lp-card-tooltip">
                        <p className="lp-card-tooltip-title">{rm.career_title || rm.roadmap_title}</p>
                        <p className="lp-card-tooltip-desc">
                          Bạn đã hoàn thành {rm.completed_count}/{rm.total_milestones} bước ({Math.round(rm.progress_percentage)}%).
                          {rm.progress_percentage < 100 ? ' Tiếp tục học để hoàn thành lộ trình!' : ' Chúc mừng bạn đã hoàn thành!'}
                        </p>
                        {rm.last_updated && (
                          <span className="lp-card-tooltip-code">Cập nhật lần cuối: {new Date(rm.last_updated).toLocaleDateString('vi-VN')}</span>
                        )}
                      </div>
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
                  {hasAssessments ? (
                    <>
                      <h3>Đang xử lý kết quả</h3>
                      <p>Bạn đã hoàn thành bài đánh giá. Hệ thống đang phân tích để đưa ra gợi ý nghề nghiệp phù hợp. Hãy thử làm lại bài đánh giá nếu chưa thấy kết quả.</p>
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button className="lp-btn lp-btn-primary" onClick={() => navigate('/assessment')}>
                          <Target size={15} /> Làm lại bài đánh giá
                        </button>
                        <button className="lp-btn lp-btn-outline" onClick={() => navigate('/recommendations')}>
                          <Sparkles size={15} /> Xem nghề phù hợp
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3>Chưa có gợi ý</h3>
                      <p>Hoàn thành bài đánh giá RIASEC & Big Five để nhận gợi ý nghề nghiệp phù hợp với bạn.</p>
                      <button className="lp-btn lp-btn-primary" onClick={() => navigate('/assessment')}>
                        <Target size={15} /> Làm bài đánh giá
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="lp-grid">
                  {suggested.map((s) => {
                    const sc = scoreColor(s.score);
                    return (
                      <div key={s.career_id} className="lp-card group" style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                          <div className="lp-card-title" style={{ minHeight: '2.6em' }}>{s.career_title}</div>
                          <span className="lp-score-badge" style={{ background: isDark ? `${sc.color}20` : sc.bg, color: sc.color, flexShrink: 0 }}>
                            <BarChart3 size={12} /> {Math.round(s.score)}%
                          </span>
                        </div>
                        <div className="lp-card-meta">
                          {s.total_milestones > 0 && (
                            <span><Map size={13} /> {s.total_milestones} bước trong lộ trình</span>
                          )}
                          {s.onet_code && <span>· {s.onet_code}</span>}
                        </div>
                        <div style={{ marginTop: 'auto' }}>
                          <button
                            className="lp-btn lp-btn-primary"
                            onClick={() => goToRoadmap(s.career_slug, s.onet_code)}
                            disabled={!s.roadmap_id}
                          >
                            <ArrowRight size={14} /> Bắt đầu học
                          </button>
                        </div>

                        {/* Hover tooltip - career description */}
                        <div className="lp-card-tooltip">
                          <div className="lp-card-tooltip-header">
                            <span className="lp-card-tooltip-badge" style={{ background: sc.bg, color: sc.color }}>{Math.round(s.score)}% phù hợp</span>
                          </div>
                          <p className="lp-card-tooltip-title">{s.career_title}</p>
                          <p className="lp-card-tooltip-desc">
                            {s.total_milestones > 0
                              ? `Lộ trình gồm ${s.total_milestones} bước học tập được thiết kế riêng cho nghề này. Bắt đầu ngay để phát triển kỹ năng chuyên môn.`
                              : 'Nghề nghiệp phù hợp với hồ sơ tính cách của bạn. Khám phá chi tiết để tìm hiểu thêm.'}
                          </p>
                          {s.onet_code && (
                            <span className="lp-card-tooltip-code">Mã nghề: {s.onet_code}</span>
                          )}
                        </div>
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
                  <p>Upload CV và phân tích kỹ năng để AI tạo lộ trình học tập riêng cho bạn. Hệ thống sẽ xác định kỹ năng còn thiếu và đề xuất kế hoạch học tập chi tiết.</p>
                  <button className="lp-btn lp-btn-primary" onClick={() => navigate('/skill-gap')}>
                    <FileText size={15} /> Phân tích CV
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* ─── Sub-section 1: ĐÃ HOÀN THÀNH 100% (compact, ở trên cùng) ─── */}
                  {completedPlans.length > 0 && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <CheckCircle size={14} color="#10b981" />
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Đã hoàn thành ({completedPlans.length})
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {(showAllCompleted ? completedPlans : completedPlans.slice(0, 3)).map((plan) => (
                          <div
                            key={plan.analysis_id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.85rem',
                              padding: '0.85rem 1.1rem',
                              background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                              border: '1px solid #a7f3d0',
                              borderRadius: 14,
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateX(2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.15)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                          >
                            <div style={{
                              width: 36, height: 36, borderRadius: 10,
                              background: 'linear-gradient(135deg, #10b981, #059669)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0, boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)',
                            }}>
                              <CheckCircle size={18} color="#fff" />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#065f46' }}>
                                  {plan.career_title || plan.career_id || 'Lộ trình học tập'}
                                </span>
                                <span style={{
                                  fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px',
                                  borderRadius: 999, background: '#10b981', color: '#fff', whiteSpace: 'nowrap',
                                }}>ĐÃ HOÀN THÀNH 100%</span>
                              </div>
                              <div style={{ display: 'flex', gap: 10, marginTop: 3, fontSize: '0.74rem', color: '#047857', alignItems: 'center', flexWrap: 'wrap' }}>
                                {plan.cv_filename && (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                    <FileText size={10} /> {plan.cv_filename}
                                  </span>
                                )}
                                {plan.personalized_completed_at && (
                                  <span>· Xong: {new Date(plan.personalized_completed_at).toLocaleDateString('vi-VN')}</span>
                                )}
                              </div>
                            </div>
                            {plan.personalized_roadmap_id && (
                              <button
                                onClick={() => navigate(`/learning-path/view/${plan.personalized_roadmap_id}`)}
                                style={{
                                  padding: '6px 14px', background: 'transparent',
                                  border: '1.5px solid #10b981', borderRadius: 8,
                                  color: '#059669', fontWeight: 700, fontSize: '0.78rem',
                                  cursor: 'pointer', whiteSpace: 'nowrap',
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  transition: 'all 0.15s',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#10b981'; e.currentTarget.style.color = '#fff'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#059669'; }}
                              >Xem lại <ChevronRight size={12} /></button>
                            )}
                          </div>
                        ))}
                      </div>
                      {completedPlans.length > 3 && (
                        <button
                          onClick={() => setShowAllCompleted(!showAllCompleted)}
                          style={{
                            display: 'block', margin: '10px auto 0',
                            padding: '6px 16px', borderRadius: 8,
                            border: '1px solid #a7f3d0', background: 'transparent',
                            color: '#059669', fontWeight: 700, fontSize: '0.75rem',
                            cursor: 'pointer',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#d1fae5'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          {showAllCompleted ? `Thu gọn` : `Xem thêm (${completedPlans.length - 3} đã hoàn thành)`}
                        </button>
                      )}
                    </div>
                  )}

                  {/* ─── Sub-section 2: ĐANG HỌC + CHƯA TẠO LỘ TRÌNH (full card) ─── */}
                  {ongoingPlans.length > 0 && (
                    <div>
                      {completedPlans.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 4 }}>
                          <Sparkles size={14} color="#6366f1" />
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#4338ca', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Đang học & Chưa bắt đầu ({ongoingPlans.length})
                          </span>
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {(showAllPlans ? ongoingPlans : ongoingPlans.slice(0, 3)).map((plan) => {
                          const isInProgress = !!(plan.has_personalized_roadmap && !plan.personalized_completed_at);
                          return (
                          <div key={plan.analysis_id} className="lp-plan-card">
                            {/* Plan Header */}
                            <div className="lp-plan-header">
                              <div>
                                <h3 className="lp-plan-title">
                                  {plan.career_title || plan.career_id || 'Lộ trình học tập'}
                                </h3>
                                {plan.cv_filename && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, fontSize: '0.78rem', color: '#6b7280' }}>
                                    <FileText size={11} />
                                    <span style={{ fontWeight: 600 }}>{plan.cv_filename}</span>
                                  </div>
                                )}
                                <div className="lp-card-meta" style={{ marginTop: '0.3rem', flexWrap: 'wrap' }}>
                                  {isInProgress && (
                                    <span className="lp-milestone-tag" style={{
                                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                      color: '#fff', fontWeight: 700, border: 'none',
                                    }}>
                                      <Sparkles size={11} /> Đang học {Math.round(plan.personalized_roadmap_progress || 0)}%
                                    </span>
                                  )}
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
                                  {isInProgress && plan.personalized_last_updated ? (
                                    <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 600 }}>
                                      · Học gần nhất: {new Date(plan.personalized_last_updated).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                                    </span>
                                  ) : plan.created_at ? (
                                    <span style={{ fontSize: '0.78rem', color: 'var(--neu-text-muted)' }}>
                                      · Phân tích {new Date(plan.created_at).toLocaleDateString('vi-VN')}
                                    </span>
                                  ) : null}
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

                      {/* No learning plan yet - show skills info and generate button */}
                      {expandedPlan === plan.analysis_id && !plan.learning_plan && (
                        <div style={{ marginTop: '0.75rem', padding: '1.25rem', background: 'var(--neu-bg, #f9fafb)', borderRadius: 12 }}>
                          {/* Skills breakdown - matching SkillHeatmap structure */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                            <div style={{ padding: '0.85rem', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, textAlign: 'center' }}>
                              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#c2410c' }}>{plan.critical_count ?? 0}</div>
                              <div style={{ fontSize: '0.72rem', color: '#9a3412', fontWeight: 700, marginTop: 2 }}>QUAN TRỌNG</div>
                              <div style={{ fontSize: '0.65rem', color: '#9a3412', marginTop: 1 }}>Cần học trước</div>
                            </div>
                            <div style={{ padding: '0.85rem', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, textAlign: 'center' }}>
                              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#92400e' }}>{plan.important_count ?? 0}</div>
                              <div style={{ fontSize: '0.72rem', color: '#92400e', fontWeight: 700, marginTop: 2 }}>NÊN CÓ ({plan.career_title || plan.career_id || 'nghề mục tiêu'})</div>
                              <div style={{ fontSize: '0.65rem', color: '#92400e', marginTop: 1 }}>Bổ sung sau</div>
                            </div>
                            <div style={{ padding: '0.85rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, textAlign: 'center' }}>
                              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#15803d' }}>{plan.matched_count ?? 0}</div>
                              <div style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 700, marginTop: 2 }}>ĐÃ CÓ</div>
                              <div style={{ fontSize: '0.65rem', color: '#15803d', marginTop: 1 }}>Trong CV</div>
                            </div>
                          </div>

                          {plan.match_percentage != null && (
                            <div style={{ marginBottom: '0.85rem', padding: '0.65rem 0.85rem', background: '#dbeafe', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '0.8rem', color: '#1e40af', fontWeight: 600 }}>Độ phù hợp với nghề</span>
                              <span style={{ fontSize: '1.1rem', color: '#1e40af', fontWeight: 900 }}>{Math.round(plan.match_percentage)}%</span>
                            </div>
                          )}

                          <p style={{ fontSize: '0.83rem', color: 'var(--neu-text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
                            AI sẽ dựa trên các kỹ năng còn thiếu để tạo lộ trình học tập cá nhân hóa với <strong>khóa học từ 6 nguồn uy tín</strong>, <strong>timeline theo tháng</strong>, <strong>milestones cụ thể</strong>, và <strong>điều kiện qua từng bước</strong>.
                          </p>

                          {plan.has_personalized_roadmap && plan.personalized_roadmap_id ? (
                            <button
                              className="lp-btn lp-btn-primary"
                              onClick={() => navigate(`/learning-path/view/${plan.personalized_roadmap_id}`)}
                            >
                              <BookOpen size={14} /> Xem lộ trình đã tạo
                            </button>
                          ) : (
                            <button
                              className="lp-btn lp-btn-primary"
                              onClick={() => navigate(`/learning-path/create/${plan.analysis_id}`)}
                            >
                              <Sparkles size={14} /> Tạo lộ trình cá nhân hóa
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    );
                  })}
                      </div>

                      {/* Toggle Show More cho ongoing plans */}
                      {ongoingPlans.length > 3 && (
                        <button
                          onClick={() => setShowAllPlans(!showAllPlans)}
                          style={{
                            margin: '14px auto 0',
                            padding: '0.65rem 1.5rem', borderRadius: 12,
                            border: '1.5px solid var(--neu-accent, #6366f1)',
                            background: 'transparent',
                            color: 'var(--neu-accent, #6366f1)',
                            fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--neu-accent, #6366f1)';
                            e.currentTarget.style.color = '#fff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--neu-accent, #6366f1)';
                          }}
                        >
                          {showAllPlans ? (
                            <>Thu gọn <ChevronRight size={14} style={{ transform: 'rotate(-90deg)' }} /></>
                          ) : (
                            <>Xem thêm ({ongoingPlans.length - 3} đang học/chưa bắt đầu) <ChevronRight size={14} style={{ transform: 'rotate(90deg)' }} /></>
                          )}
                        </button>
                      )}
                    </div>
                  )}
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
