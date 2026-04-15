import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import CVUploadForm from '../components/skillgap/CVUploadForm';
import SkillGapResult from '../components/skillgap/SkillGapResult';
import SkillHeatmapGrid from '../components/skillgap/SkillHeatmapGrid';
import LearningPlan from '../components/skillgap/LearningPlan';
import WhyUseAIScanner from '../components/skillgap/WhyUseAIScanner';
import { skillGapService } from '../services/skillGapService';
import { SkillGapAnalysis, LearningPlan as LearningPlanType } from '../types/skillGap';
import { useTheme } from '../contexts/ThemeContext';
import './SkillGapPage.css';

const SkillGapPage: React.FC = () => {
  const navigate = useNavigate();
  const { analysisId } = useParams<{ analysisId?: string }>();
  const { theme } = useTheme();

  const [currentStep, setCurrentStep] = useState<'upload' | 'result'>('upload');
  const [analysis, setAnalysis] = useState<SkillGapAnalysis | null>(null);
  const [learningPlan, setLearningPlan] = useState<{ plan: LearningPlanType; career_id: string } | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [loading, setLoading] = useState(false);
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

  const loadAnalysis = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const analysisData = await skillGapService.getAnalysisDetail(id);
      setAnalysis(analysisData);
      setCurrentStep('result');

      // Load learning plan in background
      setPlanLoading(true);
      skillGapService.getLearningPlan(id)
        .then(res => setLearningPlan({ plan: res.plan, career_id: res.career_id }))
        .catch(() => {/* non-critical */ })
        .finally(() => setPlanLoading(false));
    } catch (err: any) {
      setError(err.message || 'Failed to load analysis');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalysisComplete = (newAnalysisId: number) => {
    navigate(`/skill-gap/${newAnalysisId}`);
    loadAnalysis(newAnalysisId);
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
        <div className="skill-gap-page" style={theme === 'dark' ? { backgroundColor: '#111827', backgroundImage: 'radial-gradient(#374151 1px, transparent 1px)' } : {}}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading analysis...</p>
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
        <div className="skill-gap-page" style={theme === 'dark' ? { backgroundColor: '#111827', backgroundImage: 'radial-gradient(#374151 1px, transparent 1px)' } : {}}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Checking subscription...</p>
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
        <div className="skill-gap-page" style={theme === 'dark' ? { backgroundColor: '#111827', backgroundImage: 'radial-gradient(#374151 1px, transparent 1px)' } : {}}>
          <div style={{ maxWidth: 860, margin: '0 auto', padding: '2rem' }}>
            {/* Paywall Screen */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '20px',
              padding: '3rem 2rem',
              textAlign: 'center',
              color: 'white',
              boxShadow: '0 20px 60px rgba(102, 126, 234, 0.4)',
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔒</div>
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
                  ✨ Tính năng bạn sẽ nhận được:
                </h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  <li style={{ padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                    <span style={{ fontSize: '1.5rem', marginRight: '0.75rem' }}>🤖</span>
                    <strong>AI phân tích CV</strong> - Trích xuất kỹ năng tự động
                  </li>
                  <li style={{ padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                    <span style={{ fontSize: '1.5rem', marginRight: '0.75rem' }}>📊</span>
                    <strong>So sánh với yêu cầu công việc</strong> - Xác định lỗ hổng kỹ năng
                  </li>
                  <li style={{ padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                    <span style={{ fontSize: '1.5rem', marginRight: '0.75rem' }}>🎯</span>
                    <strong>Lộ trình học tập cá nhân hóa</strong> - AI tạo kế hoạch chi tiết
                  </li>
                  <li style={{ padding: '0.75rem 0' }}>
                    <span style={{ fontSize: '1.5rem', marginRight: '0.75rem' }}>📈</span>
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
                💳 Nâng cấp ngay - Chỉ từ 99,000đ/năm
              </button>

              <p style={{ marginTop: '1.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
                Hoặc <a href="/pricing" style={{ color: 'white', textDecoration: 'underline' }}>xem chi tiết các gói</a>
              </p>
            </div>

            {/* Benefits comparison */}
            <div style={{ marginTop: '3rem', textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.8rem', marginBottom: '2rem', color: theme === 'dark' ? 'white' : '#1f2937' }}>
                So sánh các gói
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                {/* Basic Plan */}
                <div style={{
                  background: theme === 'dark' ? '#1f2937' : 'white',
                  borderRadius: '16px',
                  padding: '2rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  border: '2px solid #e5e7eb',
                }}>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#3b82f6' }}>Basic</h3>
                  <p style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem', color: theme === 'dark' ? 'white' : '#1f2937' }}>
                    99,000đ<span style={{ fontSize: '1rem', fontWeight: 'normal' }}>/năm</span>
                  </p>
                  <ul style={{ textAlign: 'left', listStyle: 'none', padding: 0, color: theme === 'dark' ? '#d1d5db' : '#6b7280' }}>
                    <li style={{ padding: '0.5rem 0' }}>✅ 20 phân tích/tháng</li>
                    <li style={{ padding: '0.5rem 0' }}>✅ AI phân tích CV</li>
                    <li style={{ padding: '0.5rem 0' }}>✅ Lộ trình học tập cơ bản</li>
                  </ul>
                </div>

                {/* Premium Plan */}
                <div style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '16px',
                  padding: '2rem',
                  boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
                  border: '2px solid #667eea',
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
                    <li style={{ padding: '0.5rem 0' }}>✅ Không giới hạn phân tích</li>
                    <li style={{ padding: '0.5rem 0' }}>✅ AI phân tích nâng cao</li>
                    <li style={{ padding: '0.5rem 0' }}>✅ Lộ trình học tập chi tiết</li>
                    <li style={{ padding: '0.5rem 0' }}>✅ Theo dõi tiến độ</li>
                  </ul>
                </div>

                {/* Pro Plan */}
                <div style={{
                  background: theme === 'dark' ? '#1f2937' : 'white',
                  borderRadius: '16px',
                  padding: '2rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  border: '2px solid #e5e7eb',
                }}>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#8b5cf6' }}>Pro</h3>
                  <p style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem', color: theme === 'dark' ? 'white' : '#1f2937' }}>
                    299,000đ<span style={{ fontSize: '1rem', fontWeight: 'normal' }}>/năm</span>
                  </p>
                  <ul style={{ textAlign: 'left', listStyle: 'none', padding: 0, color: theme === 'dark' ? '#d1d5db' : '#6b7280' }}>
                    <li style={{ padding: '0.5rem 0' }}>✅ Tất cả tính năng Premium</li>
                    <li style={{ padding: '0.5rem 0' }}>✅ Xuất PDF báo cáo</li>
                    <li style={{ padding: '0.5rem 0' }}>✅ AI Assistant 24/7</li>
                    <li style={{ padding: '0.5rem 0' }}>✅ Ưu tiên hỗ trợ</li>
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
        <div className="skill-gap-page" style={theme === 'dark' ? { backgroundColor: '#111827', backgroundImage: 'radial-gradient(#374151 1px, transparent 1px)' } : {}}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <div className="error-container">
              <span className="error-icon">⚠️</span>
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
      <div className="skill-gap-page" style={theme === 'dark' ? { backgroundColor: '#111827', backgroundImage: 'radial-gradient(#374151 1px, transparent 1px)' } : {}}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div className="page-header">
            <h1>🎯 Skill Gap Analysis</h1>
            <p className="page-subtitle">
              Discover your skill gaps and get personalized learning recommendations
            </p>
          </div>
        </div>

        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          {currentStep === 'upload' && (
            <>
              <CVUploadForm onAnalysisComplete={handleAnalysisComplete} />
              <WhyUseAIScanner />
            </>
          )}

          {currentStep === 'result' && analysis && (
            <>
              <div className="result-header">
                <button onClick={handleNewAnalysis} className="back-button">
                  ← New Analysis
                </button>
                <div className="analysis-info">
                  <span className="analysis-date">
                    Analyzed: {new Date(analysis.created_at).toLocaleDateString()}
                  </span>
                  <span className="analysis-career">
                    Target: {analysis.career_id}
                  </span>
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

              {/* PB15: AI Learning Plan */}
              <div style={{ marginTop: '1.5rem' }}>
                {planLoading ? (
                  <div style={{ background: 'white', borderRadius: 16, padding: '2rem', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🤖</div>
                    <p style={{ color: '#64748b' }}>AI đang tạo lộ trình học tập...</p>
                  </div>
                ) : learningPlan ? (
                  <LearningPlan plan={learningPlan.plan} careerName={learningPlan.career_id} />
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default SkillGapPage;
