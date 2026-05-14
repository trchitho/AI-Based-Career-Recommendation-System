import React, { useState, useEffect, useCallback } from 'react';
import { Bot, AlertTriangle, FileText, ChevronRight } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import CVUploadForm from '../components/skillgap/CVUploadForm';
import SkillGapResult from '../components/skillgap/SkillGapResult';
import SkillHeatmapGrid from '../components/skillgap/SkillHeatmapGrid';
import WhyUseAIScanner from '../components/skillgap/WhyUseAIScanner';
import CourseRecommendationPage from './CourseRecommendationPage';
import { skillGapService } from '../services/skillGapService';
import { careerService } from '../services/careerService';
import { SkillGapAnalysis } from '../types/skillGap';
import { useTheme } from '../contexts/ThemeContext';
import careerTitleVi from '../data/careerTitleVi.json';
import './SkillGapPage.css';

/* ══════════════════════════════════════════════════════════════
   THEME TOKENS - Single Source of Truth
   ══════════════════════════════════════════════════════════════ */
const getThemeTokens = (isDark: boolean) => ({
  // Backgrounds
  cardBg: isDark ? 'rgba(30, 41, 59, 0.75)' : '#ffffff',
  containerBg: isDark ? 'rgba(30, 41, 59, 0.75)' : 'rgba(255, 255, 255, 0.95)',

  // Text
  textPrimary: isDark ? '#ffffff' : '#0f172a',
  textSecondary: isDark ? '#cbd5e1' : '#475569',
  textMuted: isDark ? '#94a3b8' : '#475569',

  // Borders
  border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '2px solid #e2e8f0',
  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
  borderSubtle: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(102, 126, 234, 0.15)',

  // Gradients
  gradient: isDark
    ? 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)'
    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  iconGradient: isDark
    ? 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)'
    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',

  // Shadows
  shadow: isDark
    ? '0 8px 30px rgba(0, 0, 0, 0.4)'
    : '0 4px 16px rgba(148, 163, 184, 0.12), 0 2px 4px rgba(148, 163, 184, 0.08)',
  shadowHover: isDark
    ? '0 0 0 1px rgba(99, 102, 241, 0.4), 0 10px 30px rgba(99, 102, 241, 0.2)'
    : '0 8px 24px rgba(148, 163, 184, 0.18), 0 4px 8px rgba(148, 163, 184, 0.12)',
  shadowPremium: isDark
    ? '0 0 0 1px rgba(99, 102, 241, 0.4), 0 12px 40px rgba(99, 102, 241, 0.35)'
    : '0 8px 32px rgba(102, 126, 234, 0.25), 0 4px 12px rgba(102, 126, 234, 0.15)',
  shadowButton: isDark
    ? '0 6px 20px rgba(99, 102, 241, 0.4)'
    : '0 4px 20px rgba(26, 35, 126, 0.3)',
  shadowButtonHover: isDark
    ? '0 10px 30px rgba(99, 102, 241, 0.6)'
    : '0 6px 30px rgba(26, 35, 126, 0.4)',

  // Accents
  checkmark: isDark ? '#22c55e' : null, // null means use brand color
  link: isDark ? '#818cf8' : '#667eea',

  // Premium card
  premiumBorder: isDark ? '1px solid transparent' : '3px solid #667eea',
  premiumBg: isDark ? 'rgba(30, 41, 59, 0.75)' : '#ffffff',
  premiumGradient: isDark
    ? 'linear-gradient(#1e293b, #1e293b), linear-gradient(135deg, #6366f1, #a855f7)'
    : 'none',
  premiumBgOrigin: isDark ? 'padding-box, border-box' : 'initial',
  premiumBgClip: isDark ? 'padding-box, border-box' : 'initial',
  premiumTitle: isDark ? '#818cf8' : '#667eea',

  // Button
  buttonBg: isDark ? 'linear-gradient(135deg, #6366f1, #a855f7)' : '#1A237E',
});

/* ══════════════════════════════════════════════════════════════
   HELPER FUNCTIONS
   ══════════════════════════════════════════════════════════════ */
function matchBarColor(pct: number) {
  if (pct >= 80) return '#10b981';
  if (pct >= 60) return '#f59e0b';
  if (pct >= 40) return '#ef4444';
  return '#9ca3af';
}

const careerTitleViMap = careerTitleVi as Record<string, string>;

function getVietnameseCareerName(careerId?: string, career?: { title?: string; title_vn?: string; title_vi?: string; title_en?: string }) {
  const rawId = (careerId || '').trim();
  const titleVi = (career?.title_vn || career?.title_vi || '').trim();
  const titleEn = (career?.title_en || '').trim();
  const displayTitle = (career?.title || '').trim();

  return (
    titleVi ||
    careerTitleViMap[titleEn] ||
    careerTitleViMap[displayTitle] ||
    careerTitleViMap[rawId] ||
    displayTitle ||
    rawId ||
    '—'
  );
}

const SkillGapPage: React.FC = () => {
  const navigate = useNavigate();
  const { analysisId } = useParams<{ analysisId?: string }>();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const t = getThemeTokens(isDark);

  // Debug: Log theme and tokens
  console.log('🎨 SkillGapPage Theme Debug:', {
    theme,
    isDark,
    cardBg: t.cardBg,
    textPrimary: t.textPrimary
  });

  const [currentStep, setCurrentStep] = useState<'upload' | 'result'>('upload');
  const [analysis, setAnalysis] = useState<SkillGapAnalysis | null>(null);
  const [careerName, setCareerName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<SkillGapAnalysis[]>([]);
  const [historyCareerNames, setHistoryCareerNames] = useState<Record<string, string>>({});
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [userPlan, setUserPlan] = useState<string>('Free');

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      setCheckingSubscription(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/subscription/status', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const plan = data.plan_name || 'Free';
        setUserPlan(plan);
        setHasAccess(plan !== 'Free');
      } else {
        setHasAccess(false);
        setUserPlan('Free');
      }
    } catch (err) {
      console.error('Subscription check error:', err);
      setHasAccess(false);
      setUserPlan('Free');
    } finally {
      setCheckingSubscription(false);
    }
  };

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await skillGapService.getMyAnalyses(20);
      setHistory(data);
      const ids = [...new Set(data.map(d => d.career_id).filter(Boolean))];
      const map: Record<string, string> = {};
      await Promise.all(ids.map(id =>
        careerService.get(id)
          .then(c => { map[id] = getVietnameseCareerName(id, c); })
          .catch(() => { map[id] = getVietnameseCareerName(id); })
      ));
      setHistoryCareerNames(map);
    } catch { }
    finally { setHistoryLoading(false); }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  useEffect(() => {
    if (analysisId) {
      loadAnalysis(parseInt(analysisId));
    }
  }, [analysisId]);

  useEffect(() => {
    if (loading) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = 'Đang tải dữ liệu phân tích. Bạn có chắc muốn rời khỏi trang?';
        return e.returnValue;
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [loading]);

  const loadAnalysis = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const analysisData = await skillGapService.getAnalysisDetail(id);
      setAnalysis(analysisData);
      setCurrentStep('result');
      if (analysisData.career_id) {
        careerService.get(analysisData.career_id)
          .then(c => setCareerName(getVietnameseCareerName(analysisData.career_id, c)))
          .catch(() => setCareerName(getVietnameseCareerName(analysisData.career_id)));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load analysis');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalysisComplete = (newAnalysisId: number) => {
    navigate(`/skill-gap/${newAnalysisId}`);
    loadAnalysis(newAnalysisId);
    loadHistory();
  };

  const handleStartInterview = () => {
    if (analysis) {
      const formattedCareerId = analysis.career_id.replace(/-(\d{2})$/, '.$1');
      // Navigate to interview selection with CV analysis context
      // InterviewSelectionPage will use skill_gap_analysis_id for CV-based personalized interview
      navigate(`/interview/selection/${formattedCareerId}`, {
        state: {
          skill_gap_analysis_id: analysis.id,
          cv_skills: analysis.cv_skills || [],
          skill_gaps: analysis.skill_gaps || {},
          match_percentage: analysis.match_percentage || 0,
          cv_based: true,
        }
      });
    }
  };

  const handleNewAnalysis = () => {
    setCurrentStep('upload');
    setAnalysis(null);
    navigate('/skill-gap');
  };

  if (loading || checkingSubscription) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white relative overflow-hidden pb-20 pt-8 px-4 sm:px-6 lg:px-8">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="text-gray-500 font-medium">{loading ? 'Đang tải phân tích...' : 'Đang kiểm tra gói dịch vụ...'}</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Paywall Screen
  if (!hasAccess) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white relative overflow-hidden pb-20 pt-8 px-4 sm:px-6 lg:px-8">
          <div style={{
            background: t.gradient,
            borderRadius: '20px',
            padding: '3rem 2rem',
            textAlign: 'center',
            color: 'white',
            boxShadow: t.shadowButton,
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔒</div>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem', fontWeight: 'bold' }}>
              Phân Tích Khoảng Cách Kỹ Năng
            </h1>
            <p style={{ fontSize: '1.1rem', marginBottom: '2rem', opacity: 0.95 }}>
              Tính năng cao cấp - Yêu cầu gói trả phí
            </p>

            <div style={{
              background: t.containerBg,
              backdropFilter: 'blur(10px)',
              borderRadius: '16px',
              padding: '2rem',
              marginBottom: '2rem',
              textAlign: 'left',
              border: t.border,
            }}>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem', fontWeight: '600', color: t.textPrimary }}>
                Tính năng bạn sẽ nhận được:
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {[
                  { icon: <Bot size={18} style={{ color: 'white' }} />, title: 'AI phân tích CV', desc: 'Trích xuất kỹ năng tự động' },
                  { icon: '📊', title: 'So sánh với yêu cầu công việc', desc: 'Xác định lỗ hổng kỹ năng' },
                  { icon: '🎯', title: 'Lộ trình học tập cá nhân hóa', desc: 'AI tạo kế hoạch chi tiết' },
                  { icon: '📈', title: 'Theo dõi tiến độ', desc: 'Lưu lịch sử phân tích' },
                ].map((item, idx, arr) => (
                  <li key={idx} style={{
                    padding: '0.75rem 0',
                    borderBottom: idx < arr.length - 1 ? t.borderSubtle : 'none',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: t.iconGradient,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '0.75rem',
                      flexShrink: 0,
                      fontSize: typeof item.icon === 'string' ? '1.2rem' : undefined
                    }}>
                      {item.icon}
                    </div>
                    <div>
                      <strong style={{ color: t.textPrimary }}>{item.title}</strong>
                      <span style={{ color: t.textSecondary }}> - {item.desc}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, 764ba2 100%)',
              borderRadius: '20px',
              padding: '3rem 2rem',
              textAlign: 'center',
              color: 'white',
              boxShadow: '0 20px 60px rgba(102, 126, 234, 0.4)',
            }}>
              <p style={{ fontSize: '0.95rem', marginBottom: '0.5rem', color: t.textMuted }}>
                Gói hiện tại của bạn:
              </p>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0, color: t.textPrimary }}>
                {userPlan}
              </p>
            </div>

            <button
              onClick={() => navigate('/pricing')}
              style={{
                background: t.buttonBg,
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '1rem 3rem',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: t.shadowButton,
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = t.shadowButtonHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = t.shadowButton;
              }}
            >
              Nâng cấp ngay - Chỉ từ 99,000đ/năm
            </button>

            <p style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: t.textMuted }}>
              Hoặc <a href="/pricing" style={{ color: t.link, textDecoration: 'underline', fontWeight: '600' }}>xem chi tiết các gói</a>
            </p>
          </div>

          {/* Pricing Cards */}
          <div style={{ marginTop: '3rem', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '2rem', color: t.textPrimary, fontWeight: '700' }}>
              So sánh các gói
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>

              {/* Basic Plan */}
              <div style={{
                background: t.cardBg,
                borderRadius: '16px',
                padding: '2rem',
                boxShadow: t.shadow,
                border: t.border,
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = t.shadowHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = t.shadow;
                }}>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#3b82f6', fontWeight: '700' }}>Basic</h3>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem', color: t.textPrimary }}>
                  99,000đ<span style={{ fontSize: '1rem', fontWeight: 'normal', color: t.textMuted }}>/năm</span>
                </p>
                <ul style={{ textAlign: 'left', listStyle: 'none', padding: 0, color: t.textSecondary }}>
                  {['20 phân tích/tháng', 'AI phân tích CV', 'Lộ trình học tập cơ bản'].map((item, idx) => (
                    <li key={idx} style={{ padding: '0.5rem 0', display: 'flex', alignItems: 'center' }}>
                      <span style={{ color: t.checkmark || '#3b82f6', marginRight: '0.5rem', fontSize: '1.2rem' }}>✓</span> {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Premium Plan */}
              <div style={{
                background: t.premiumBg,
                borderRadius: '16px',
                padding: '2rem',
                boxShadow: t.shadowPremium,
                border: t.premiumBorder,
                backgroundImage: t.premiumGradient,
                backgroundOrigin: t.premiumBgOrigin as any,
                backgroundClip: t.premiumBgClip as any,
                position: 'relative',
                transform: 'scale(1.05)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.08) translateY(-4px)';
                  e.currentTarget.style.boxShadow = isDark
                    ? '0 0 0 1px rgba(99, 102, 241, 0.5), 0 16px 50px rgba(99, 102, 241, 0.45)'
                    : '0 12px 40px rgba(102, 126, 234, 0.30), 0 6px 16px rgba(102, 126, 234, 0.20)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05) translateY(0)';
                  e.currentTarget.style.boxShadow = t.shadowPremium;
                }}>
                <div style={{
                  background: 'linear-gradient(135deg, #667eea 0%, 764ba2 100%)',
                  borderRadius: '16px',
                  padding: '2rem',
                  boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
                  border: '2px solid #667eea',
                  position: 'relative',
                  transform: 'scale(1.05)',
                }}>
                  ⭐ PHỔ BIẾN
                </div>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: t.premiumTitle, fontWeight: '700' }}>Premium</h3>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem', color: t.textPrimary }}>
                  199,000đ<span style={{ fontSize: '1rem', fontWeight: 'normal', color: t.textMuted }}>/năm</span>
                </p>
                <ul style={{ textAlign: 'left', listStyle: 'none', padding: 0, color: t.textSecondary }}>
                  {['Không giới hạn phân tích', 'AI phân tích nâng cao', 'Lộ trình học tập chi tiết', 'Theo dõi tiến độ'].map((item, idx) => (
                    <li key={idx} style={{ padding: '0.5rem 0', display: 'flex', alignItems: 'center' }}>
                      <span style={{ color: t.checkmark || '#667eea', marginRight: '0.5rem', fontSize: '1.2rem' }}>✓</span> {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pro Plan */}
              <div style={{
                background: t.cardBg,
                borderRadius: '16px',
                padding: '2rem',
                boxShadow: t.shadow,
                border: t.border,
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = t.shadowHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = t.shadow;
                }}>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#8b5cf6', fontWeight: '700' }}>Pro</h3>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem', color: t.textPrimary }}>
                  299,000đ<span style={{ fontSize: '1rem', fontWeight: 'normal', color: t.textMuted }}>/năm</span>
                </p>
                <ul style={{ textAlign: 'left', listStyle: 'none', padding: 0, color: t.textSecondary }}>
                  {['Tất cả tính năng Premium', 'Xuất PDF báo cáo', 'AI Assistant 24/7', 'Ưu tiên hỗ trợ'].map((item, idx) => (
                    <li key={idx} style={{ padding: '0.5rem 0', display: 'flex', alignItems: 'center' }}>
                      <span style={{ color: t.checkmark || '#8b5cf6', marginRight: '0.5rem', fontSize: '1.2rem' }}>✓</span> {item}
                    </li>
                  ))}
                </ul>
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
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white relative overflow-hidden pb-20 pt-8 px-4 sm:px-6 lg:px-8">
          <div className="error-container">
            <AlertTriangle size={48} className="text-red-500 mb-3" />
            <h2 className="text-xl font-bold mb-2">Không tải được phân tích</h2>
            <p className="text-gray-500 mb-4">{error}</p>
            <button onClick={handleNewAnalysis} className="px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-bold">
              Phân tích CV mới
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white relative overflow-x-hidden pb-20">
        <style>{`
          .bg-dot-pattern { background-image: radial-gradient(rgba(0,0,0,0.1) 1px, transparent 1px); background-size: 24px 24px; }
          .dark .bg-dot-pattern { background-image: radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px); }
        `}</style>
        <div className="absolute inset-0 bg-dot-pattern pointer-events-none z-0 opacity-60"></div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="page-header relative overflow-hidden rounded-[32px] mb-10 shadow-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-10 md:p-14 text-center">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" style={{ background: 'rgba(255,255,255,0.1)' }}></div>
            <div className="relative z-10">
              <h1 className="text-3xl md:text-5xl font-extrabold mb-4 tracking-tight text-white">Phân Tích Khoảng Cách Kỹ Năng</h1>
              <p className="text-indigo-100 text-lg max-w-2xl mx-auto">
                Khám phá khoảng cách kỹ năng và nhận đề xuất học tập được cá nhân hóa bởi AI
              </p>
            </div>
          </div>

          <div>
          {currentStep === 'upload' && (
            <>
              <CVUploadForm onAnalysisComplete={handleAnalysisComplete} />

              {(historyLoading || history.length > 0) && (
                <div style={{ marginTop: '2rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                    <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: 'var(--neu-text, #111)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileText size={16} />
                      Lịch sử CV
                    </h3>
                    {history.length > 0 && (
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6b7280', background: 'var(--neu-bg, #f3f4f6)', padding: '3px 10px', borderRadius: 99, border: '1px solid var(--neu-border, #e5e7eb)' }}>
                        {history.length} lần tải CV trước đây
                      </span>
                    )}
                  </div>

                  {/* Table */}
                  <div style={{ background: 'var(--neu-bg-card, #fff)', borderRadius: 14, border: '1px solid var(--neu-border, #e5e7eb)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    {/* Table head */}
                    <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.5fr 1fr 1fr', padding: '0.65rem 1.25rem', background: 'var(--neu-bg, #f9fafb)', borderBottom: '1px solid var(--neu-border, #e5e7eb)' }}>
                      {['TÊN TỆP & NGHỀ MỤC TIÊU', 'NGÀY TẢI LÊN', 'ĐỘ PHÙ HỢP', 'THAO TÁC'].map(h => (
                        <span key={h} style={{ fontSize: '0.68rem', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.07em', textTransform: 'uppercase' }}>{h}</span>
                      ))}
                    </div>

                    {historyLoading ? (
                      <div style={{ padding: '1.5rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <div style={{ width: 16, height: 16, border: '2px solid #e5e7eb', borderTopColor: 'var(--neu-accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                        Đang tải...
                      </div>
                    ) : (
                      history.map((item, idx) => {
                        const pct = Math.round(item.match_percentage ?? 0);
                        const cName = historyCareerNames[item.career_id] || getVietnameseCareerName(item.career_id);
                        const date = new Date(item.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
                        const isLast = idx === history.length - 1;
                        return (
                          <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '3fr 1.5fr 1fr 1fr', padding: '0.9rem 1.25rem', alignItems: 'center', borderBottom: isLast ? 'none' : '1px solid var(--neu-border, #f3f4f6)', transition: 'background 0.15s' }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--neu-bg, #f9fafb)'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                              <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <FileText size={16} style={{ color: 'var(--neu-accent)' }} />
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--neu-text, #111)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {item.cv_filename || `Hồ sơ ${item.id}`}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {cName}
                                </div>
                              </div>
                            </div>
                            <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>{date}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{ flex: 1, maxWidth: 60, height: 6, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${pct}%`, background: matchBarColor(pct), borderRadius: 99 }} />
                              </div>
                              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: matchBarColor(pct), minWidth: 32 }}>{pct}%</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <button
                                onClick={() => navigate(`/skill-gap/${item.id}`)}
                                style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--neu-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 3 }}>
                                Xem phân tích
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
                  ← Phân tích CV mới
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

              <SkillGapResult
                analysis={analysis}
                onStartInterview={handleStartInterview}
              />

              <div style={{ marginTop: '1.5rem' }}>
                <SkillHeatmapGrid analysis={analysis} />
              </div>

              {/* Gợi ý khóa học — tự động lấy từ kỹ năng còn thiếu */}
              {(() => {
                const gaps = analysis.skill_gaps as any;
                const toNames = (items: any[] = []) => items
                  .map((s: any) => (typeof s === 'string' ? s : s?.name))
                  .filter(Boolean);
                const skillGroups = {
                  critical: toNames(gaps?.critical),
                  important: toNames(gaps?.important),
                  nice_to_have: toNames(gaps?.nice_to_have),
                };
                const ownedSkills = [
                  ...(analysis.cv_skills || []),
                  ...(analysis.matched_skills || []),
                ].map((s: any) => (typeof s === 'string' ? s : s?.name)).filter(Boolean);
                const totalMissing = skillGroups.critical.length + skillGroups.important.length + skillGroups.nice_to_have.length;
                return totalMissing > 0 ? (
                  <div style={{ marginTop: '1.5rem' }}>
                    <CourseRecommendationPage
                      analysisId={analysis.id}
                      skillGroups={skillGroups}
                      ownedSkills={ownedSkills}
                      careerName={careerName || analysis.career_id}
                    />
                  </div>
                ) : null;
              })()}
            </>
          )}
        </div>
      </div>
      </div>
    </MainLayout>
  );
};

export default SkillGapPage;
