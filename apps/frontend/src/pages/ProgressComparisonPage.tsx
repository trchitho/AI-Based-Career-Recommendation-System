import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Calendar, BarChart2, TrendingUp, TrendingDown, Minus, CheckCircle2 } from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { useSubscription } from '../hooks/useSubscription';
import { assessmentService } from '../services/assessmentService';
import api from '../lib/api';
/* progress-comparison.css removed — styles migrated to Tailwind/inline */

interface AssessmentHistory {
  id: number;
  created_at: string;
  big5_scores?: any;
  riasec_scores?: any;
}

interface CareerRecommendation {
  career_id: number;
  career_slug: string;
  career_title: string;
  career_description: string;
  score: number;
  rank: number;
}

interface GroupedSession {
  sessionId: string;
  timestamp: Date;
  assessments: AssessmentHistory[];
  hasBigFive: boolean;
  hasRIASEC: boolean;
  bigFiveScores?: any;
  riasecScores?: any;
  topRiasecType?: string;
  topBigFiveTrait?: string;
  careerRecommendations?: CareerRecommendation[];
}

// Big Five trait names
const BIG_FIVE_LABELS: Record<string, string> = {
  openness: 'Cởi Mở (Openness)',
  conscientiousness: 'Tận Tâm (Conscientiousness)',
  extraversion: 'Hướng Ngoại (Extraversion)',
  agreeableness: 'Dễ Chịu (Agreeableness)',
  neuroticism: 'Nhạy Cảm (Neuroticism)'
};

// RIASEC type names
const RIASEC_LABELS: Record<string, string> = {
  realistic: 'Kỹ Thuật (Realistic)',
  investigative: 'Nghiên Cứu (Investigative)',
  artistic: 'Nghệ Thuật (Artistic)',
  social: 'Xã Hội (Social)',
  enterprising: 'Kinh Doanh (Enterprising)',
  conventional: 'Nghiệp Vụ (Conventional)'
};

// Generate dynamic summary messages based on score changes
const generateSummaryMessages = (
  bigFiveChanges: Record<string, number> | null,
  riasecChanges: Record<string, number> | null
): { improved: string[]; decreased: string[]; stable: string[] } => {
  const improved: string[] = [];
  const decreased: string[] = [];
  const stable: string[] = [];

  // Big Five analysis
  if (bigFiveChanges) {
    Object.entries(bigFiveChanges).forEach(([trait, change]) => {
      const label = BIG_FIVE_LABELS[trait] || trait;
      const traitDirection = trait === 'openness' ? 'cởi mở với trải nghiệm mới' : trait === 'conscientiousness' ? 'có tổ chức và kỷ luật' : trait === 'extraversion' ? 'hướng ngoại và năng động' : trait === 'agreeableness' ? 'hợp tác và đáng tin cậy' : 'nhạy cảm về cảm xúc';

      if (change > 15) {
        improved.push(`Cải thiện đáng kể về ${label} (+${change.toFixed(0)}%) — Bạn đã trở nên ${traitDirection} hơn rất nhiều. Đây là sự phát triển tích cực, cho thấy bạn đang mở rộng khả năng và phong cách ứng xử của mình.`);
      } else if (change > 8) {
        improved.push(`Tăng đáng chú ý về ${label} (+${change.toFixed(0)}%) — Tiến bộ tốt ở chiều tính cách này. Hãy tiếp tục phát huy xu hướng này trong công việc và cuộc sống.`);
      } else if (change > 3) {
        improved.push(`Cải thiện nhẹ về ${label} (+${change.toFixed(0)}%) — Có sự thay đổi tích cực, dù chưa rõ rệt.`);
      } else if (change < -15) {
        decreased.push(`Giảm đáng kể về ${label} (${change.toFixed(0)}%) — Điều này có thể phản ánh sự thay đổi trong cách bạn thể hiện tính cách. Hãy chú ý xem có yếu tố môi trường nào đang ảnh hưởng đến bạn.`);
      } else if (change < -8) {
        decreased.push(`Giảm đáng chú ý về ${label} (${change.toFixed(0)}%) — Cần quan sát xem có lý do cụ thể nào dẫn đến sự thay đổi này.`);
      } else if (change < -3) {
        decreased.push(`Giảm nhẹ về ${label} (${change.toFixed(0)}%) — Mức giảm trong khoảng dao động bình thường.`);
      } else {
        stable.push(`${label} duy trì ổn định (${change > 0 ? '+' : ''}${change.toFixed(0)}%) — Tính cách cốt lõi của bạn ở chiều này vẫn nhất quán.`);
      }
    });
  }

  // RIASEC analysis
  if (riasecChanges) {
    Object.entries(riasecChanges).forEach(([type, change]) => {
      const label = RIASEC_LABELS[type] || type;
      const careerDirection = type === 'realistic' ? 'công việc thực hành, kỹ thuật' : type === 'investigative' ? 'nghiên cứu và phân tích' : type === 'artistic' ? 'thể hiện sáng tạo và nghệ thuật' : type === 'social' ? 'giúp đỡ và làm việc với con người' : type === 'enterprising' ? 'lãnh đạo và kinh doanh' : 'công việc có tổ chức, chú trọng chi tiết';

      if (change > 20) {
        improved.push(`Tăng mạnh sở thích ${label} (+${change.toFixed(0)}%) — Định hướng nghề nghiệp của bạn đang chuyển dịch rõ rệt sang ${careerDirection}. Đây là dấu hiệu bạn đang khám phá ra đam mê thực sự.`);
      } else if (change > 10) {
        improved.push(`Tăng quan tâm đến nghề ${label} (+${change.toFixed(0)}%) — Bạn ngày càng hứng thú với lĩnh vực này.`);
      } else if (change > 3) {
        improved.push(`Tăng nhẹ sở thích ${label} (+${change.toFixed(0)}%) — Có dấu hiệu quan tâm hơn đến lĩnh vực này.`);
      } else if (change < -20) {
        decreased.push(`Sở thích ${label} thay đổi đáng kể (${change.toFixed(0)}%) — Định hướng nghề nghiệp của bạn có thể đang chuyển hướng. Hãy dành thời gian khám phá các lĩnh vực khác.`);
      } else if (change < -10) {
        decreased.push(`Giảm quan tâm đến nghề ${label} (${change.toFixed(0)}%) — Lĩnh vực này không còn hấp dẫn bạn như trước.`);
      } else if (change < -3) {
        decreased.push(`Giảm nhẹ sở thích ${label} (${change.toFixed(0)}%) — Mức giảm chưa đáng kể.`);
      } else {
        stable.push(`Sở thích ${label} duy trì nhất quán — Định hướng nghề nghiệp ở lĩnh vực này ổn định.`);
      }
    });
  }

  return { improved, decreased, stable };
};

// Career tooltip component
const CareerTooltip: React.FC<{ career: CareerRecommendation; children: React.ReactNode }> = ({ career, children }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block" onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
      {children}
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-72 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 animate-fade-in">
          <div className="text-sm">
            <h4 className="font-bold text-gray-900 dark:text-white mb-2">{career.career_title}</h4>
            <p className="text-gray-600 dark:text-gray-400 text-xs mb-3 line-clamp-3">{career.career_description || 'Chưa có mô tả'}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Match Score</span>
              <span className="font-bold text-indigo-800">{career.score.toFixed(1)}%</span>
            </div>
            <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">Click to view details →</div>
          </div>
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-3 h-3 bg-white dark:bg-gray-800 border-r border-b border-gray-200 dark:border-gray-700"></div>
        </div>
      )}
    </div>
  );
};

const ProgressComparisonPage: React.FC = () => {
  const { hasFeature, currentPlan } = useFeatureAccess();
  useSubscription(); // Keep for potential future use
  const [assessments, setAssessments] = useState<AssessmentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonData, setComparisonData] = useState<{ first: GroupedSession; second: GroupedSession } | null>(null);
  const [animateScores, setAnimateScores] = useState(false);
  const hasLoadedRef = useRef(false);

  // Get top trait/type from scores
  const getTopTrait = (scores: Record<string, number> | undefined): string => {
    if (!scores) return '';
    const entries = Object.entries(scores);
    if (entries.length === 0) return '';
    const sorted = entries.sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || '';
  };

  const getTopScore = (scores: Record<string, number> | undefined): number => {
    if (!scores) return 0;
    const values = Object.values(scores);
    return Math.max(...values, 0);
  };

  // Group assessments into sessions (within 5 minutes)
  const groupedSessions = React.useMemo(() => {
    if (!assessments.length) return [];

    const sorted = [...assessments].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const sessions: GroupedSession[] = [];
    let currentSession: AssessmentHistory[] = [];
    let sessionStartTime: Date | null = null;

    sorted.forEach((assessment) => {
      const assessmentTime = new Date(assessment.created_at);

      if (!sessionStartTime || (sessionStartTime.getTime() - assessmentTime.getTime()) > 5 * 60 * 1000) {
        if (currentSession.length > 0) {
          const bigFive = currentSession.find(a => a.big5_scores);
          const riasec = currentSession.find(a => a.riasec_scores);
          sessions.push({
            sessionId: `session-${sessions.length}`,
            timestamp: sessionStartTime!,
            assessments: currentSession,
            hasBigFive: !!bigFive,
            hasRIASEC: !!riasec,
            bigFiveScores: bigFive?.big5_scores,
            riasecScores: riasec?.riasec_scores,
            topRiasecType: getTopTrait(riasec?.riasec_scores),
            topBigFiveTrait: getTopTrait(bigFive?.big5_scores),
          });
        }
        currentSession = [assessment];
        sessionStartTime = assessmentTime;
      } else {
        currentSession.push(assessment);
      }
    });

    if (currentSession.length > 0 && sessionStartTime) {
      const bigFive = currentSession.find(a => a.big5_scores);
      const riasec = currentSession.find(a => a.riasec_scores);
      sessions.push({
        sessionId: `session-${sessions.length}`,
        timestamp: sessionStartTime,
        assessments: currentSession,
        hasBigFive: !!bigFive,
        hasRIASEC: !!riasec,
        bigFiveScores: bigFive?.big5_scores,
        riasecScores: riasec?.riasec_scores,
        topRiasecType: getTopTrait(riasec?.riasec_scores),
        topBigFiveTrait: getTopTrait(bigFive?.big5_scores),
      });
    }

    return sessions;
  }, [assessments]);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadAssessmentHistory();
  }, [hasFeature, currentPlan]);

  const loadAssessmentHistory = async () => {
    try {
      setLoading(true);
      const history = await assessmentService.getHistory();

      const transformedAssessments: AssessmentHistory[] = history.map((item: any) => ({
        id: item.id || item.assessment_id,
        created_at: item.completed_at || item.created_at,
        big5_scores: item.big_five_scores || item.big5_scores,
        riasec_scores: item.riasec_scores,
      }));

      setAssessments(transformedAssessments);
    } catch (error) {
      console.error('Failed to load assessment history:', error);
      setAssessments([]);
    } finally {
      setLoading(false);
    }
  };

  // Load career recommendations for a session
  const loadCareerRecommendations = async (assessmentId: number): Promise<CareerRecommendation[]> => {
    try {
      const response = await api.get(`/api/recommendations/saved`, {
        params: { assessment_id: assessmentId, top_k: 5 }
      });
      const items = response.data?.items || [];
      return items.map((item: any) => ({
        career_id: item.career_id,
        career_slug: item.slug || '',
        career_title: item.title_vi || item.title_vn || item.title || item.title_en || 'Nghề chưa xác định',
        career_description: item.description || '',
        score: item.score || 0,
        rank: item.rank || 0
      }));
    } catch (error) {
      console.error('Failed to load career recommendations:', error);
      return [];
    }
  };

  const handleCompareResults = async () => {
    const firstSession = groupedSessions.find(s => s.sessionId === selectedSessions[0]);
    const secondSession = groupedSessions.find(s => s.sessionId === selectedSessions[1]);

    if (firstSession && secondSession) {
      const sortedSessions = [firstSession, secondSession].sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      );

      // Load career recommendations for both sessions
      const firstAssessmentId = sortedSessions[0]!.assessments[0]?.id;
      const secondAssessmentId = sortedSessions[1]!.assessments[0]?.id;

      const [firstCareers, secondCareers] = await Promise.all([
        firstAssessmentId ? loadCareerRecommendations(firstAssessmentId) : Promise.resolve([]),
        secondAssessmentId ? loadCareerRecommendations(secondAssessmentId) : Promise.resolve([])
      ]);

      setComparisonData({
        first: { ...sortedSessions[0]!, careerRecommendations: firstCareers },
        second: { ...sortedSessions[1]!, careerRecommendations: secondCareers }
      });
      setShowComparison(true);

      setTimeout(() => setAnimateScores(true), 500);
    }
  };

  const renderScoreComparison = (label: string, oldScore: number, newScore: number) => {
    const normalizedOld = oldScore > 1 ? oldScore : oldScore * 100;
    const normalizedNew = newScore > 1 ? newScore : newScore * 100;

    const diff = {
      value: normalizedNew - normalizedOld,
      isPositive: normalizedNew > normalizedOld,
      isNegative: normalizedNew < normalizedOld
    };

    return (
      <motion.div 
        whileHover={{ y: -4, scale: 1.01 }}
        className="glass bg-white/50 dark:bg-gray-800/50 rounded-2xl p-5 border border-gray-200/50 dark:border-white/10 hover:shadow-xl transition-all duration-300 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-bl-full pointer-events-none" />
        
        <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center justify-between relative z-10">
          {label}
          {diff.isPositive && <TrendingUp className="w-4 h-4 text-emerald-500" />}
          {diff.isNegative && <TrendingDown className="w-4 h-4 text-red-500" />}
          {!diff.isPositive && !diff.isNegative && <Minus className="w-4 h-4 text-gray-400" />}
        </h4>
        
        <div className="space-y-4 relative z-10">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Trước Đây</span>
              <span className="font-black text-gray-700 dark:text-gray-300">{normalizedOld.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: animateScores ? `${Math.min(normalizedOld, 100)}%` : '0%' }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="bg-indigo-400/50 dark:bg-indigo-500/50 h-full rounded-full"
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Hiện Tại</span>
              <span className="font-black text-gray-900 dark:text-white">{normalizedNew.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: animateScores ? `${Math.min(normalizedNew, 100)}%` : '0%' }}
                transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                className={`h-full rounded-full ${diff.isPositive ? 'bg-emerald-500' : diff.isNegative ? 'bg-red-500' : 'bg-indigo-500'}`}
              />
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100 dark:border-gray-700/50 relative z-10">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Thay Đổi</span>
          <span className={`font-black flex items-center gap-1 ${diff.isPositive ? 'text-emerald-500' : diff.isNegative ? 'text-red-500' : 'text-gray-500'}`}>
            {diff.isPositive ? '+' : ''}{diff.value.toFixed(1)}%
          </span>
        </div>
      </motion.div>
    );
  };

  // Calculate changes for summary
  const calculateChanges = () => {
    if (!comparisonData) return { bigFive: null, riasec: null };

    let bigFiveChanges: Record<string, number> | null = null;
    let riasecChanges: Record<string, number> | null = null;

    if (comparisonData.first.bigFiveScores && comparisonData.second.bigFiveScores) {
      bigFiveChanges = {};
      Object.keys(comparisonData.first.bigFiveScores).forEach(key => {
        const oldVal = comparisonData.first.bigFiveScores[key] > 1 ? comparisonData.first.bigFiveScores[key] : comparisonData.first.bigFiveScores[key] * 100;
        const newVal = comparisonData.second.bigFiveScores[key] > 1 ? comparisonData.second.bigFiveScores[key] : comparisonData.second.bigFiveScores[key] * 100;
        bigFiveChanges![key] = newVal - oldVal;
      });
    }

    if (comparisonData.first.riasecScores && comparisonData.second.riasecScores) {
      riasecChanges = {};
      Object.keys(comparisonData.first.riasecScores).forEach(key => {
        const oldVal = comparisonData.first.riasecScores[key] > 1 ? comparisonData.first.riasecScores[key] : comparisonData.first.riasecScores[key] * 100;
        const newVal = comparisonData.second.riasecScores[key] > 1 ? comparisonData.second.riasecScores[key] : comparisonData.second.riasecScores[key] * 100;
        riasecChanges![key] = newVal - oldVal;
      });
    }

    return { bigFive: bigFiveChanges, riasec: riasecChanges };
  };

  // Comparison Results View
  if (showComparison && comparisonData) {
    const changes = calculateChanges();
    const summaryMessages = generateSummaryMessages(changes.bigFive, changes.riasec);
    const daysDiff = Math.floor(Math.abs(comparisonData.second.timestamp.getTime() - comparisonData.first.timestamp.getTime()) / (1000 * 60 * 60 * 24));

    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900/50 relative overflow-x-hidden pb-20 pt-16">
          <style>{`
            .bg-dot-pattern { background-image: radial-gradient(rgba(0,0,0,0.1) 1px, transparent 1px); background-size: 24px 24px; }
            .dark .bg-dot-pattern { background-image: radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px); }
          `}</style>
          <div className="absolute inset-0 bg-dot-pattern pointer-events-none z-0 opacity-60"></div>
          <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <button
                onClick={() => { setShowComparison(false); setSelectedSessions([]); setComparisonData(null); setAnimateScores(false); }}
                className="inline-flex items-center gap-2 text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 transition-colors mb-6 hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-2 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    Quay Lại Danh Sách
              </button>

              <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Kết Quả So Sánh</h1>
                <p className="text-xl text-gray-600 dark:text-gray-400">
                  So sánh thay đổi giữa {comparisonData.first.timestamp.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })} và {comparisonData.second.timestamp.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <div className="flex justify-center gap-8 mt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{daysDiff < 1 ? '< 1' : daysDiff} ngày</div>
                    <div className="text-sm text-gray-500">Khoảng Cách Thời Gian</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-800">
                      {(comparisonData.first.bigFiveScores && comparisonData.second.bigFiveScores ? 5 : 0) + (comparisonData.first.riasecScores && comparisonData.second.riasecScores ? 6 : 0)}
                    </div>
                    <div className="text-sm text-gray-500">Chỉ Số So Sánh</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {/* Big Five Comparison */}
              {comparisonData.first.bigFiveScores && comparisonData.second.bigFiveScores && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass bg-white/60 dark:bg-gray-800/40 rounded-3xl shadow-xl border border-gray-200/50 dark:border-white/10 p-8"
                >
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center">
                      <BarChart2 className="w-6 h-6 text-indigo-500" />
                    </div>
                    So Sánh Big Five
                    <span className="text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full uppercase tracking-widest ml-auto">
                      5 chỉ số
                    </span>
                  </h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {renderScoreComparison('Cởi Mở (Openness)', comparisonData.first.bigFiveScores.openness, comparisonData.second.bigFiveScores.openness)}
                    {renderScoreComparison('Tận Tâm (Conscientiousness)', comparisonData.first.bigFiveScores.conscientiousness, comparisonData.second.bigFiveScores.conscientiousness)}
                    {renderScoreComparison('Hướng Ngoại (Extraversion)', comparisonData.first.bigFiveScores.extraversion, comparisonData.second.bigFiveScores.extraversion)}
                    {renderScoreComparison('Dễ Chịu (Agreeableness)', comparisonData.first.bigFiveScores.agreeableness, comparisonData.second.bigFiveScores.agreeableness)}
                    {renderScoreComparison('Nhạy Cảm (Neuroticism)', comparisonData.first.bigFiveScores.neuroticism, comparisonData.second.bigFiveScores.neuroticism)}
                  </div>
                </motion.div>
              )}

              {/* RIASEC Comparison */}
              {comparisonData.first.riasecScores && comparisonData.second.riasecScores && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="glass bg-white/60 dark:bg-gray-800/40 rounded-3xl shadow-xl border border-gray-200/50 dark:border-white/10 p-8"
                >
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center">
                      <BarChart2 className="w-6 h-6 text-purple-500" />
                    </div>
                    So Sánh RIASEC
                    <span className="text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 px-3 py-1 rounded-full uppercase tracking-widest ml-auto">
                      6 chỉ số
                    </span>
                  </h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {renderScoreComparison('Kỹ Thuật (Realistic)', comparisonData.first.riasecScores.realistic, comparisonData.second.riasecScores.realistic)}
                    {renderScoreComparison('Nghiên Cứu (Investigative)', comparisonData.first.riasecScores.investigative, comparisonData.second.riasecScores.investigative)}
                    {renderScoreComparison('Nghệ Thuật (Artistic)', comparisonData.first.riasecScores.artistic, comparisonData.second.riasecScores.artistic)}
                    {renderScoreComparison('Xã Hội (Social)', comparisonData.first.riasecScores.social, comparisonData.second.riasecScores.social)}
                    {renderScoreComparison('Kinh Doanh (Enterprising)', comparisonData.first.riasecScores.enterprising, comparisonData.second.riasecScores.enterprising)}
                    {renderScoreComparison('Nghiệp Vụ (Conventional)', comparisonData.first.riasecScores.conventional, comparisonData.second.riasecScores.conventional)}
                  </div>
                </motion.div>
              )}

              {/* Career Recommendations Comparison */}
              {(comparisonData.first.careerRecommendations?.length || comparisonData.second.careerRecommendations?.length) && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 flex items-center justify-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-slate-700 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </div>
                    Top 5 Nghề Nghiệp Đề Xuất
                    <span className="text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-full">Nghề Phù Hợp</span>
                  </h2>

                  <div className="grid md:grid-cols-2 gap-10">
                    {/* Before */}
                    <div className="flex flex-col">
                      <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-5 flex items-center justify-center gap-2 pb-3 border-b border-gray-200 dark:border-gray-700">
                        <span className="w-2.5 h-2.5 bg-blue-500 rounded-full"></span>
                        Trước Đây ({comparisonData.first.timestamp.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' })})
                      </h3>
                      <div className="flex flex-col gap-4 flex-1">
                        {comparisonData.first.careerRecommendations?.length ? (
                          comparisonData.first.careerRecommendations.map((career, idx) => (
                            <CareerTooltip key={career.career_id} career={career}>
                              <Link
                                to={`/careers/${career.career_slug || career.career_id}`}
                                className="flex items-center gap-3 px-3 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 group border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
                              >
                                <span className="w-6 h-6 bg-blue-600 dark:bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm">
                                  {idx + 1}
                                </span>
                                <span className="flex-1 text-sm text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors font-medium line-clamp-2">
                                  {career.career_title}
                                </span>
                                <span className="text-xs font-bold text-white bg-blue-600 dark:bg-blue-500 px-2 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap shadow-sm">{career.score.toFixed(1)}%</span>
                              </Link>
                            </CareerTooltip>
                          ))
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <p className="text-gray-500 dark:text-gray-400 text-sm italic">Chưa có gợi ý nghề nghiệp</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* After */}
                    <div className="flex flex-col">
                      <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-5 flex items-center justify-center gap-2 pb-3 border-b border-gray-200 dark:border-gray-700">
                        <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
                        Hiện Tại ({comparisonData.second.timestamp.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' })})
                      </h3>
                      <div className="flex flex-col gap-4 flex-1">
                        {comparisonData.second.careerRecommendations?.length ? (
                          comparisonData.second.careerRecommendations.map((career, idx) => {
                            const wasInPrevious = comparisonData.first.careerRecommendations?.some(c => c.career_id === career.career_id);
                            const previousRank = comparisonData.first.careerRecommendations?.find(c => c.career_id === career.career_id)?.rank;
                            const rankChange = previousRank ? previousRank - career.rank : null;

                            return (
                              <CareerTooltip key={career.career_id} career={career}>
                                <Link
                                  to={`/careers/${career.career_slug || career.career_id}`}
                                  className="flex items-center gap-3 px-3 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all duration-200 group border border-transparent hover:border-emerald-200 dark:hover:border-emerald-900"
                                >
                                  <span className="w-6 h-6 bg-emerald-600 dark:bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm">
                                    {idx + 1}
                                  </span>
                                  <span className="flex-1 text-sm text-gray-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors font-medium line-clamp-2">
                                    {career.career_title}
                                  </span>
                                  {!wasInPrevious && (
                                    <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] font-semibold rounded flex-shrink-0">Mới</span>
                                  )}
                                  {rankChange !== null && rankChange > 0 && (
                                    <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex-shrink-0">↑{rankChange}</span>
                                  )}
                                  {rankChange !== null && rankChange < 0 && (
                                    <span className="text-red-600 dark:text-red-400 text-[10px] font-bold flex-shrink-0">↓{Math.abs(rankChange)}</span>
                                  )}
                                  <span className="text-xs font-bold text-white bg-emerald-600 dark:bg-emerald-500 px-2 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap shadow-sm">{career.score.toFixed(1)}%</span>
                                </Link>
                              </CareerTooltip>
                            );
                          })
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <p className="text-gray-500 dark:text-gray-400 text-sm italic">Chưa có gợi ý nghề nghiệp</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic Summary */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-emerald-500/10 rounded-3xl p-8 border border-white/20 backdrop-blur-md"
              >
                <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-4">Tóm Tắt Thay Đổi</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-2xl">
                  Dựa trên kết quả so sánh, đây là phân tích chi tiết về sự phát triển của bạn theo thời gian.
                  Báo cáo này giúp bạn hiểu rõ những thay đổi trong tính cách và sở thích nghề nghiệp,
                  từ đó định hướng tốt hơn cho con đường phát triển bản thân và sự nghiệp trong tương lai.
                </p>

                {/* Dynamic insights */}
                <div className="space-y-4 mb-8">
                  {summaryMessages.improved.length > 0 && (
                    <div className="glass bg-emerald-500/5 rounded-2xl p-6 border border-emerald-500/20">
                      <h4 className="font-bold text-emerald-700 dark:text-emerald-400 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Lĩnh Vực Cải Thiện ({summaryMessages.improved.length})
                      </h4>
                      <ul className="space-y-3">
                        {summaryMessages.improved.slice(0, 5).map((msg, idx) => (
                          <li key={idx} className="text-sm font-medium text-emerald-800 dark:text-emerald-300 flex items-start gap-3">
                            <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                            <span>{msg}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {summaryMessages.decreased.length > 0 && (
                    <div className="glass bg-red-500/5 rounded-2xl p-6 border border-red-500/20">
                      <h4 className="font-bold text-red-700 dark:text-red-400 mb-4 flex items-center gap-2">
                        <TrendingDown className="w-5 h-5" />
                        Lĩnh Vực Suy Giảm ({summaryMessages.decreased.length})
                      </h4>
                      <ul className="space-y-3">
                        {summaryMessages.decreased.slice(0, 5).map((msg, idx) => (
                          <li key={idx} className="text-sm font-medium text-red-800 dark:text-red-300 flex items-start gap-3">
                            <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                            <span>{msg}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {summaryMessages.stable.length > 0 && (
                    <div className="glass bg-gray-500/5 rounded-2xl p-6 border border-gray-500/20">
                      <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                        <Minus className="w-5 h-5" />
                        Lĩnh Vực Ổn Định ({summaryMessages.stable.length})
                      </h4>
                      <ul className="space-y-3">
                        {summaryMessages.stable.slice(0, 3).map((msg, idx) => (
                          <li key={idx} className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-start gap-3">
                            <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                            <span>{msg}</span>
                          </li>
                        ))}
                        {summaryMessages.stable.length > 3 && (
                          <li className="text-sm text-gray-500 italic ml-4.5">...và {summaryMessages.stable.length - 3} chỉ số ổn định khác</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-200/50 dark:border-white/10">
                  <button
                    onClick={() => { setShowComparison(false); setSelectedSessions([]); setComparisonData(null); setAnimateScores(false); }}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5"
                  >
                    So Sánh Khác
                  </button>
                  <button onClick={() => window.print()} className="px-6 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-700 font-bold text-gray-700 dark:text-gray-300 rounded-xl transition-all">
                    In Kết Quả
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Main List View
  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900/50 relative overflow-x-hidden pb-20 pt-16">
        <style>{`
          .bg-dot-pattern { background-image: radial-gradient(rgba(0,0,0,0.1) 1px, transparent 1px); background-size: 24px 24px; }
          .dark .bg-dot-pattern { background-image: radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px); }
        `}</style>
        <div className="absolute inset-0 bg-dot-pattern pointer-events-none z-0 opacity-60"></div>
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link to="/dashboard" className="inline-flex items-center gap-2 text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 transition-colors mb-6">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Quay về Tổng quan
            </Link>

            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">So Sánh Tiến Trình</h1>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">Theo dõi sự thay đổi và tiến bộ qua các lần đánh giá tính cách</p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-32">
              <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 rounded-full border-t-indigo-600 animate-spin mb-6 shadow-lg"></div>
              <p className="text-gray-500 dark:text-gray-400 font-bold tracking-wide uppercase">Đang tải lịch sử...</p>
            </div>
          ) : groupedSessions.length < 2 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass bg-white/60 dark:bg-gray-800/40 rounded-3xl shadow-2xl border border-gray-200/50 dark:border-white/10 p-12 text-center"
            >
              <div className="w-24 h-24 bg-indigo-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-3 transition-transform hover:rotate-6">
                <BarChart2 className="w-10 h-10 text-indigo-500" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-4">
                {groupedSessions.length === 0 ? 'Chưa có dữ liệu đánh giá' : 'Cần thêm dữ liệu để so sánh'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-10 max-w-lg mx-auto leading-relaxed">
                {groupedSessions.length === 0
                  ? 'You have no assessment results yet. Take your first assessment to start tracking progress.'
                  : `You have ${groupedSessions.length} assessment session. Need at least 2 sessions to use comparison feature.`}
              </p>
              <Link to="/assessment" className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-2xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-1">
                Take New Assessment <ArrowLeft className="w-5 h-5 rotate-180" />
              </Link>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass bg-white/60 dark:bg-gray-800/40 rounded-3xl shadow-xl border border-gray-200/50 dark:border-white/10 p-8"
            >
              {/* Header with Compare Button */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-6">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Lịch Sử Đánh Giá</h2>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">Chọn 2 phiên để so sánh sự thay đổi theo thời gian ({groupedSessions.length} tổng)</p>
                </div>
                {selectedSessions.length === 2 ? (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={handleCompareResults}
                    className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black rounded-2xl transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center gap-3 w-full md:w-auto justify-center"
                  >
                    So Sánh Đã Chọn
                    <ArrowLeft className="w-5 h-5 rotate-180" />
                  </motion.button>
                ) : (
                  <div className="px-6 py-3 bg-gray-100/50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 rounded-xl font-bold border border-dashed border-gray-300 dark:border-gray-600 w-full md:w-auto text-center">
                    Chọn thêm {2 - selectedSessions.length} phiên{2 - selectedSessions.length > 1 ? '' : ''}
                  </div>
                )}
              </div>

              {/* Session List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupedSessions.map((session, i) => {
                  const isSelected = selectedSessions.includes(session.sessionId);
                  const topRiasec = session.topRiasecType ? RIASEC_LABELS[session.topRiasecType] || session.topRiasecType : null;
                  const topBigFive = session.topBigFiveTrait ? BIG_FIVE_LABELS[session.topBigFiveTrait] || session.topBigFiveTrait : null;
                  const riasecScore = session.riasecScores ? Math.round(getTopScore(session.riasecScores)) : null;
                  const bigFiveScore = session.bigFiveScores ? Math.round(getTopScore(session.bigFiveScores)) : null;

                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      key={session.sessionId}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedSessions(prev => prev.filter(id => id !== session.sessionId));
                        } else if (selectedSessions.length < 2) {
                          setSelectedSessions(prev => [...prev, session.sessionId]);
                        }
                      }}
                      className={`relative p-6 rounded-2xl cursor-pointer transition-all duration-300 border-2 overflow-hidden ${isSelected
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 shadow-xl shadow-indigo-500/10'
                        : 'border-transparent bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-800'
                        }`}
                    >
                      {isSelected && (
                        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-indigo-500/20 to-transparent rounded-bl-full pointer-events-none" />
                      )}

                      <div className="flex items-start gap-4">
                        {/* Checkbox */}
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mt-1 transition-all ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300 dark:border-gray-600'
                          }`}>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                        </div>

                        {/* Session Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1 truncate">
                            {session.timestamp.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </h3>
                          <p className="text-sm text-gray-500 font-medium mb-4 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {session.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </p>

                          <div className="space-y-2">
                            {session.hasRIASEC && topRiasec && (
                              <div className="flex items-center justify-between bg-white dark:bg-gray-900/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                <span className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-400">
                                  <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                                  RIASEC
                                </span>
                                <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                                  {topRiasec} <span className="opacity-50">({riasecScore}%)</span>
                                </span>
                              </div>
                            )}
                            {session.hasBigFive && topBigFive && (
                              <div className="flex items-center justify-between bg-white dark:bg-gray-900/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                <span className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-400">
                                  <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                  Big Five
                                </span>
                                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                                  {topBigFive} <span className="opacity-50">({bigFiveScore}%)</span>
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default ProgressComparisonPage;
