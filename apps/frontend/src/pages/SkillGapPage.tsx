import React, { useState, useEffect, useCallback } from 'react';
import { Bot, AlertTriangle, FileText, ChevronRight, History } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import CVUploadForm from '../components/skillgap/CVUploadForm';
import SkillGapResult from '../components/skillgap/SkillGapResult';
import SkillHeatmapGrid from '../components/skillgap/SkillHeatmapGrid';
import LearningPlan from '../components/skillgap/LearningPlan';
import StreamingLearningPlan from '../components/skillgap/StreamingLearningPlan';
import WhyUseAIScanner from '../components/skillgap/WhyUseAIScanner';
import { skillGapService } from '../services/skillGapService';
import { careerService } from '../services/careerService';
import { SkillGapAnalysis, LearningPlan as LearningPlanType } from '../types/skillGap';
import { useTheme } from '../contexts/ThemeContext';
import './SkillGapPage.css';

/* ── mini helpers ── */
function matchBarColor(pct: number) {
  if (pct >= 80) return '10b981';
  if (pct >= 60) return 'f59e0b';
  if (pct >= 40) return 'ef4444';
  return '9ca3af';
}
function matchBg(pct: number) {
  if (pct >= 80) return 'd1fae5';
  if (pct >= 60) return 'fef3c7';
  if (pct >= 40) return 'fee2e2';
  return 'f3f4f6';
}
function matchText(pct: number) {
  if (pct >= 80) return '065f46';
  if (pct >= 60) return '92400e';
  if (pct >= 40) return '991b1b';
  return '374151';
}

const SkillGapPage: React.FC = () => {
  const navigate = useNavigate();
  const { analysisId } = useParams<{ analysisId?: string }>();
  const { theme } = useTheme();

  const [currentStep, setCurrentStep] = useState<'upload' | 'result'>('upload');
  const [analysis, setAnalysis] = useState<SkillGapAnalysis | null>(null);
  const [careerName, setCareerName] = useState<string>('');
  const [learningPlan, setLearningPlan] = useState<{ plan: LearningPlanType; career_id: string } | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  /* ── history ── */
  const [history, setHistory] = useState<SkillGapAnalysis[]>([]);
  const [historyCareerNames, setHistoryCareerNames] = useState<Record<string, string>>({});
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Paywall state
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [userPlan, setUserPlan] = useState<string>('Free');

  // Check subscription on mount
  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      setCheckingSubscription(true);

      // Call backend to check subscription
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/subscription/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const plan = data.plan_name || 'Free';
        setUserPlan(plan);

        // Allow access only for paid plans
        const isPaid = plan !== 'Free';
        setHasAccess(isPaid);
      } else {
        // If API fails, assume Free (safe default)
        setHasAccess(false);
        setUserPlan('Free');
      }
    } catch (err) {
      console.error('Subscription check error:', err);
      // On error, assume Free (safe default)
      setHasAccess(false);
      setUserPlan('Free');
    } finally {
      setCheckingSubscription(false);
    }
  };

  // Load CV history
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await skillGapService.getMyAnalyses(20);
      setHistory(data);
      const ids = [...new Set(data.map(d => d.career_id).filter(Boolean))];
      const map: Record<string, string> = {};
      await Promise.all(ids.map(id =>
        careerService.get(id).then(c => { map[id] = c.title || id; }).catch(() => { map[id] = id; })
      ));
      setHistoryCareerNames(map);
    } catch { /* ignore */ }
    finally { setHistoryLoading(false); }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Load analysis if ID is provided in URL
  useEffect(() => {
    if (analysisId) {
      loadAnalysis(parseInt(analysisId));
    }
  }, [analysisId]);

  // Prevent navigation during loading
  useEffect(() => {
    if (loading) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = 'Đang tải dữ liệu phân tích. Bạn có chắc muốn rời khỏi trang?';
        return e.returnValue;
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [loading]);

  const loadAnalysis = async (id: number, autoLoadPlan = false) => {
    setLoading(true);
    setError(null);
    try {
      const analysisData = await skillGapService.getAnalysisDetail(id);
      setAnalysis(analysisData);
      setCurrentStep('result');

      // Fetch career name (background, fast DB call)
      if (analysisData.career_id) {
        careerService.get(analysisData.career_id)
          .then(c => setCareerName(c.title || analysisData.career_id))
          .catch(() => setCareerName(analysisData.career_id));
      }

      // Chỉ load learning plan khi vừa phân tích xong (autoLoadPlan=true)
      // Khi xem lại từ lịch sử → KHÔNG gọi, user bấm nút mới load
      if (autoLoadPlan) {
        setPlanLoading(true);
        skillGapService.getLearningPlan(id)
          .then(res => setLearningPlan({ plan: res.plan, career_id: res.career_id }))
          .catch(() => {})
          .finally(() => setPlanLoading(false));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load analysis');
    } finally {
      setLoading(false);
    }
  };

  // Gọi thủ công khi user bấm "Xem lộ trình học tập"
  const handleLoadLearningPlan = async () => {
    if (!analysis || planLoading) return;
    setPlanLoading(true);
    try {
      const res = await skillGapService.getLearningPlan(analysis.id);
      setLearningPlan({ plan: res.plan, career_id: res.career_id });
    } catch { /* ignore */ }
    finally { setPlanLoading(false); }
  };

  const handleAnalysisComplete = (newAnalysisId: number) => {
    navigate(`/skill-gap/${newAnalysisId}`);
    loadAnalysis(newAnalysisId, true); // vừa phân tích xong → auto load plan
    loadHistory();
  };

  const handleStartInterview = () => {
    if (analysis) {
      // Navigate to interview page with analysis data
      navigate(`/interview?analysisId=${analysis.id}`);
    }
  };

  const handleNewAnalysis = () => {
    setCurrentStep('upload');
    setAnalysis(null);
    setLearningPlan(null);
    navigate('/skill-gap');
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="skill-gap-page" style={{}}>
          <div>
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Đang tải phân tích...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Show loading while checking subscription
  if (checkingSubscription) {
    return (
      <MainLayout>
        <div className="skill-gap-page" style={{}}>
          <div>
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Đang kiểm tra gói dịch vụ...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Show paywall if user doesn't have access
  if (!hasAccess) {
    return (
      <MainLayout>
        <div className="skill-gap-page" style={{}}>
          <div>
            {/* Paywall Screen */}
            <div style={{
              background: 'linear-gradient(135deg, 667eea 0%, 764ba2 100%)',
              borderRadius: '20px',
              padding: '3rem 2rem',
              textAlign: 'center',
              color: 'white',
              boxShadow: '0 20px 60px rgba(102, 126, 234, 0.4)',
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}></div>
              <h1 style={{ fontSize: '2rem', marginBottom: '1rem', fontWeight: 'bold' }}>
                Skill Gap Analysis
              </h1>
              <p style={{ fontSize: '1.1rem', marginBottom: '2rem', opacity: 0.95 }}>
                Tính năng cao cấp - Yêu cầu gói trả phí
              </p>

              <div style={{
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                padding: '2rem',
                marginBottom: '2rem',
                textAlign: 'left',
              }}>
                <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem', fontWeight: '600' }}>
                   Tính năng bạn sẽ nhận được:
                </h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  <li style={{ padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                    <Bot size={22} className="mr-3 text-indigo-800 flex-shrink-0" />
                    <strong>AI phân tích CV</strong> - Trích xuất kỹ năng tự động
                  </li>
                  <li style={{ padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                    <span style={{ fontSize: '1.5rem', marginRight: '0.75rem' }}></span>
                    <strong>So sánh với yêu cầu công việc</strong> - Xác định lỗ hổng kỹ năng
                  </li>
                  <li style={{ padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                    <span style={{ fontSize: '1.5rem', marginRight: '0.75rem' }}></span>
                    <strong>Lộ trình học tập cá nhân hóa</strong> - AI tạo kế hoạch chi tiết
                  </li>
                  <li style={{ padding: '0.75rem 0' }}>
                    <span style={{ fontSize: '1.5rem', marginRight: '0.75rem' }}></span>
                    <strong>Theo dõi tiến độ</strong> - Lưu lịch sử phân tích
                  </li>
                </ul>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '2rem',
              }}>
                <p style={{ fontSize: '0.95rem', marginBottom: '0.5rem', opacity: 0.9 }}>
                  Gói hiện tại của bạn:
                </p>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
                  {userPlan}
                </p>
              </div>

              <button
                onClick={() => navigate('/pricing')}
                style={{
                  background: 'white',
                  color: '#667eea',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '1rem 3rem',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 30px rgba(0,0,0,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
                }}
              >
                 Nâng cấp ngay - Chỉ từ 99,000đ/năm
              </button>

              <p style={{ marginTop: '1.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
                Hoặc <a href="/pricing" style={{ color: 'white', textDecoration: 'underline' }}>xem chi tiết các gói</a>
              </p>
            </div>

            {/* Benefits comparison */}
            <div style={{ marginTop: '3rem', textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.8rem', marginBottom: '2rem', color: 'var(--neu-text)' }}>
                So sánh các gói
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                {/* Basic Plan */}
                <div style={{
                  background: 'var(--neu-bg-card)',
                  borderRadius: '16px',
                  padding: '2rem',
                  boxShadow: 'var(--neu-raised)',
                  border: '2px solid var(--neu-shadow-dark)',
                }}>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#3b82f6' }}>Basic</h3>
                  <p style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--neu-text)' }}>
                    99,000đ<span style={{ fontSize: '1rem', fontWeight: 'normal' }}>/năm</span>
                  </p>
                  <ul style={{ textAlign: 'left', listStyle: 'none', padding: 0, color: 'var(--neu-text-muted)' }}>
                    <li style={{ padding: '0.5rem 0' }}> 20 phân tích/tháng</li>
                    <li style={{ padding: '0.5rem 0' }}> AI phân tích CV</li>
                    <li style={{ padding: '0.5rem 0' }}> Lộ trình học tập cơ bản</li>
                  </ul>
                </div>

                {/* Premium Plan */}
                <div style={{
                  background: 'linear-gradient(135deg, 667eea 0%, 764ba2 100%)',
                  borderRadius: '16px',
                  padding: '2rem',
                  boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
                  border: '2px solid 667eea',
                  position: 'relative',
                  transform: 'scale(1.05)',
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-12px',
                    right: '20px',
                    background: '#fbbf24',
                    color: '#1f2937',
                    padding: '0.25rem 1rem',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                  }}>
                    PHỔ BIẾN
                  </div>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'white' }}>Premium</h3>
                  <p style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem', color: 'white' }}>
                    199,000đ<span style={{ fontSize: '1rem', fontWeight: 'normal' }}>/năm</span>
                  </p>
                  <ul style={{ textAlign: 'left', listStyle: 'none', padding: 0, color: 'rgba(255,255,255,0.95)' }}>
                    <li style={{ padding: '0.5rem 0' }}> Không giới hạn phân tích</li>
                    <li style={{ padding: '0.5rem 0' }}> AI phân tích nâng cao</li>
                    <li style={{ padding: '0.5rem 0' }}> Lộ trình học tập chi tiết</li>
                    <li style={{ padding: '0.5rem 0' }}> Theo dõi tiến độ</li>
                  </ul>
                </div>

                {/* Pro Plan */}
                <div style={{
                  background: 'var(--neu-bg-card)',
                  borderRadius: '16px',
                  padding: '2rem',
                  boxShadow: 'var(--neu-raised)',
                  border: '2px solid var(--neu-shadow-dark)',
                }}>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#8b5cf6' }}>Pro</h3>
                  <p style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--neu-text)' }}>
                    299,000đ<span style={{ fontSize: '1rem', fontWeight: 'normal' }}>/năm</span>
                  </p>
                  <ul style={{ textAlign: 'left', listStyle: 'none', padding: 0, color: 'var(--neu-text-muted)' }}>
                    <li style={{ padding: '0.5rem 0' }}> Tất cả tính năng Premium</li>
                    <li style={{ padding: '0.5rem 0' }}> Xuất PDF báo cáo</li>
                    <li style={{ padding: '0.5rem 0' }}> AI Assistant 24/7</li>
                    <li style={{ padding: '0.5rem 0' }}> Ưu tiên hỗ trợ</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="skill-gap-page" style={{}}>
          <div>
            <div className="error-container">
              <AlertTriangle size={48} className="text-red-500 mb-3" />
              <h2>Error Loading Analysis</h2>
              <p>{error}</p>
              <button onClick={handleNewAnalysis} className="retry-button">
                Start New Analysis
              </button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="skill-gap-page" style={{}}>
        <div className="page-header">
          <h1>Phân Tích Khoảng Cách Kỹ Năng</h1>
          <p className="page-subtitle">
            Khám phá khoảng cách kỹ năng và nhận đề xuất học tập được cá nhân hóa bởi AI
          </p>
        </div>

        <div>
          {currentStep === 'upload' && (
            <>
              <CVUploadForm onAnalysisComplete={handleAnalysisComplete} />

              {/* ── CV History Table ── */}
              {(historyLoading || history.length > 0) && (
                <div style={{ marginTop: '2rem', marginBottom: '1.5rem' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                    <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: 'var(--neu-text, 111)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileText size={16} />
                      CV History
                    </h3>
                    {history.length > 0 && (
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6b7280', background: 'var(--neu-bg, f3f4f6)', padding: '3px 10px', borderRadius: 99, border: '1px solid var(--neu-border, e5e7eb)' }}>
                        {history.length} PREVIOUS UPLOAD{history.length !== 1 ? 'S' : ''}
                      </span>
                    )}
                  </div>

                  {/* Table */}
                  <div style={{ background: 'var(--neu-bg-card, fff)', borderRadius: 14, border: '1px solid var(--neu-border, e5e7eb)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    {/* Table head */}
                    <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.5fr 1fr 1fr', padding: '0.65rem 1.25rem', background: 'var(--neu-bg, f9fafb)', borderBottom: '1px solid var(--neu-border, e5e7eb)' }}>
                      {['FILENAME & TARGET ROLE', 'DATE UPLOADED', 'MATCH SCORE', 'ACTIONS'].map(h => (
                        <span key={h} style={{ fontSize: '0.68rem', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.07em', textTransform: 'uppercase' }}>{h}</span>
                      ))}
                    </div>

                    {historyLoading ? (
                      <div style={{ padding: '1.5rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <div style={{ width: 16, height: 16, border: '2px solid e5e7eb', borderTopColor: 'var(--neu-accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                        Đang tải...
                      </div>
                    ) : (
                      history.map((item, idx) => {
                        const pct = Math.round(item.match_percentage ?? 0);
                        const cName = historyCareerNames[item.career_id] || item.career_id || '—';
                        const date = new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                        const isLast = idx === history.length - 1;
                        return (
                          <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '3fr 1.5fr 1fr 1fr', padding: '0.9rem 1.25rem', alignItems: 'center', borderBottom: isLast ? 'none' : '1px solid var(--neu-border, f3f4f6)', transition: 'background 0.15s' }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--neu-bg, f9fafb)'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                          >
                            {/* Col 1: Filename + role */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                              <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <FileText size={16} style={{ color:'var(--neu-accent)' }} />
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--neu-text, 111)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {item.cv_filename || `CV ${item.id}`}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {cName}
                                </div>
                              </div>
                            </div>

                            {/* Col 2: Date */}
                            <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>{date}</div>

                            {/* Col 3: Match score */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{ flex: 1, maxWidth: 60, height: 6, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${pct}%`, background: matchBarColor(pct), borderRadius: 99 }} />
                              </div>
                              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: matchBarColor(pct), minWidth: 32 }}>{pct}%</span>
                            </div>

                            {/* Col 4: Actions */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <button
                                onClick={() => navigate(`/skill-gap/${item.id}`)}
                                style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--neu-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 3 }}>
                                View Analysis
                                <ChevronRight size={11} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              <WhyUseAIScanner />
            </>
          )}

          {currentStep === 'result' && analysis && (
            <>
              <div className="result-header">
                <button onClick={handleNewAnalysis} className="back-button">
                  ← New Analysis
                </button>
                <span className="analysis-career" title={careerName || analysis.career_id}>
                  {careerName || analysis.career_id}
                </span>
                <div className="analysis-info">
                  <span className="analysis-date">
                    {new Date(analysis.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </span>
                  <button
                    onClick={() => navigate('/cv-history')}
                    style={{ marginLeft: '0.75rem', padding: '0.3rem 0.85rem', borderRadius: 8, border: '1.5px solid var(--neu-accent)', background: 'transparent', color: 'var(--neu-accent)', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <FileText size={12} />
                    Lịch sử
                  </button>
                </div>
              </div>

              {/* PB12+PB13: CV analysis result */}
              <SkillGapResult
                analysis={analysis}
                onStartInterview={handleStartInterview}
              />

              {/* PB14: Skill Heatmap Grid */}
              <div style={{ marginTop: '1.5rem' }}>
                <SkillHeatmapGrid analysis={analysis} />
              </div>

              {/* PB15: AI Learning Plan — SSE Streaming */}
              <div style={{ marginTop: '1.5rem' }}>
                <StreamingLearningPlan
                  analysisId={analysis.id}
                  careerId={careerName || analysis.career_id}
                  autoStart={false}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default SkillGapPage;
