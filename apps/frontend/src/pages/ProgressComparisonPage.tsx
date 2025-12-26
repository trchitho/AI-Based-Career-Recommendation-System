import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { useSubscription } from '../hooks/useSubscription';
import { assessmentService } from '../services/assessmentService';
import '../styles/progress-comparison.css';

interface AssessmentHistory {
  id: number;
  created_at: string;
  big5_scores?: any;
  riasec_scores?: any;
}

interface GroupedSession {
  sessionId: string;
  timestamp: Date;
  assessments: AssessmentHistory[];
  hasBigFive: boolean;
  hasRIASEC: boolean;
  bigFiveScores?: any;
  riasecScores?: any;
}

const ProgressComparisonPage: React.FC = () => {
  const { hasFeature, currentPlan } = useFeatureAccess();
  const subscription = useSubscription();
  const [assessments, setAssessments] = useState<AssessmentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonData, setComparisonData] = useState<{first: GroupedSession, second: GroupedSession} | null>(null);
  const [animateScores, setAnimateScores] = useState(false);
  const hasLoadedRef = useRef(false); // Prevent multiple API calls

  // Group assessments into sessions (within 5 minutes)
  const groupedSessions = React.useMemo(() => {
    console.log('🔄 [GroupSessions] Input assessments:', assessments);
    if (!assessments.length) return [];
    
    const sorted = [...assessments].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    console.log('📊 [GroupSessions] Sorted assessments:', sorted);
    
    const sessions: GroupedSession[] = [];
    let currentSession: AssessmentHistory[] = [];
    let sessionStartTime: Date | null = null;
    
    sorted.forEach((assessment, idx) => {
      const assessmentTime = new Date(assessment.created_at);
      console.log(`📝 [GroupSessions] Processing #${idx}:`, assessment.id, assessmentTime, 'big5:', !!assessment.big5_scores, 'riasec:', !!assessment.riasec_scores);
      
      if (!sessionStartTime || (sessionStartTime.getTime() - assessmentTime.getTime()) > 5 * 60 * 1000) {
        // Start new session
        if (currentSession.length > 0) {
          const bigFive = currentSession.find(a => a.big5_scores);
          const riasec = currentSession.find(a => a.riasec_scores);
          console.log('✅ [GroupSessions] Creating session with', currentSession.length, 'assessments, bigFive:', !!bigFive, 'riasec:', !!riasec);
          sessions.push({
            sessionId: `session-${sessions.length}`,
            timestamp: sessionStartTime!,
            assessments: currentSession,
            hasBigFive: !!bigFive,
            hasRIASEC: !!riasec,
            bigFiveScores: bigFive?.big5_scores,
            riasecScores: riasec?.riasec_scores,
          });
        }
        currentSession = [assessment];
        sessionStartTime = assessmentTime;
      } else {
        currentSession.push(assessment);
      }
    });
    
    // Don't forget the last session
    if (currentSession.length > 0 && sessionStartTime) {
      const bigFive = currentSession.find(a => a.big5_scores);
      const riasec = currentSession.find(a => a.riasec_scores);
      console.log('✅ [GroupSessions] Creating LAST session with', currentSession.length, 'assessments, bigFive:', !!bigFive, 'riasec:', !!riasec);
      sessions.push({
        sessionId: `session-${sessions.length}`,
        timestamp: sessionStartTime,
        assessments: currentSession,
        hasBigFive: !!bigFive,
        hasRIASEC: !!riasec,
        bigFiveScores: bigFive?.big5_scores,
        riasecScores: riasec?.riasec_scores,
      });
    }
    
    console.log('🎯 [GroupSessions] Final sessions:', sessions);
    return sessions;
  }, [assessments]);

  useEffect(() => {
    // Prevent multiple calls
    if (hasLoadedRef.current) return;
    
    console.log('Current plan:', currentPlan);
    console.log('Has progress_tracking feature:', hasFeature('progress_tracking'));
    console.log('isPremium:', subscription.isPremium);
    console.log('planName:', subscription.planName);
    
    // For testing: Always load data regardless of plan
    hasLoadedRef.current = true;
    loadAssessmentHistory();
    
    // Original logic:
    // if (hasFeature('progress_tracking')) {
    //   hasLoadedRef.current = true;
    //   loadAssessmentHistory();
    // } else {
    //   setLoading(false);
    // }
  }, [hasFeature, currentPlan]); // Add currentPlan to dependencies

  const loadAssessmentHistory = async () => {
    try {
      setLoading(true);
      console.log('Loading assessment history for plan:', currentPlan);
      
      // Load real data from API
      const history = await assessmentService.getHistory();
      console.log('📊 [ProgressComparison] Loaded history:', history);
      
      // Transform to expected format
      const transformedAssessments: AssessmentHistory[] = history.map((item: any) => ({
        id: item.id || item.assessment_id,
        created_at: item.completed_at || item.created_at,
        big5_scores: item.big_five_scores || item.big5_scores,
        riasec_scores: item.riasec_scores,
      }));
      
      console.log('✅ [ProgressComparison] Transformed assessments:', transformedAssessments);
      setAssessments(transformedAssessments);
      
    } catch (error) {
      console.error('Failed to load assessment history:', error);
      setAssessments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCompareResults = () => {
    console.log('handleCompareResults called');
    console.log('selectedSessions:', selectedSessions);
    console.log('groupedSessions:', groupedSessions);
    
    const firstSession = groupedSessions.find(s => s.sessionId === selectedSessions[0]);
    const secondSession = groupedSessions.find(s => s.sessionId === selectedSessions[1]);
    
    console.log('firstSession:', firstSession);
    console.log('secondSession:', secondSession);
    
    if (firstSession && secondSession) {
      // Sort by date to show older vs newer
      const sortedSessions = [firstSession, secondSession].sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      );
      
      console.log('sortedSessions:', sortedSessions);
      
      const comparisonResult = {
        first: sortedSessions[0]!, // Older session
        second: sortedSessions[1]! // Newer session
      };
      
      console.log('Setting comparison data:', comparisonResult);
      setComparisonData(comparisonResult);
      setShowComparison(true);
      
      // Trigger score animations after a short delay
      setTimeout(() => {
        console.log('Triggering score animations');
        setAnimateScores(true);
      }, 500);
    } else {
      console.error('Could not find sessions for comparison');
    }
  };

  const calculateScoreDifference = (oldScore: number, newScore: number) => {
    const diff = newScore - oldScore;
    return {
      value: diff,
      percentage: ((diff / oldScore) * 100).toFixed(1),
      isPositive: diff > 0,
      isNegative: diff < 0
    };
  };

  const renderScoreComparison = (label: string, oldScore: number, newScore: number) => {
    // Normalize scores - if they're already 0-100, don't multiply by 100
    const normalizedOld = oldScore > 1 ? oldScore : oldScore * 100;
    const normalizedNew = newScore > 1 ? newScore : newScore * 100;
    
    const diff = {
      value: normalizedNew - normalizedOld,
      percentage: ((normalizedNew - normalizedOld) / (normalizedOld || 1) * 100).toFixed(1),
      isPositive: normalizedNew > normalizedOld,
      isNegative: normalizedNew < normalizedOld
    };
    
    return (
      <div className="comparison-card bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-300">
        <h4 className="font-medium text-gray-900 dark:text-white mb-3">{label}</h4>
        
        {/* Progress bars for visual comparison */}
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600 dark:text-gray-400">Trước</span>
              <span className="font-semibold text-gray-900 dark:text-white">{normalizedOld.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full progress-bar"
                style={{ 
                  width: animateScores ? `${Math.min(normalizedOld, 100)}%` : '0%',
                  transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              ></div>
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600 dark:text-gray-400">Sau</span>
              <span className="font-semibold text-gray-900 dark:text-white">{normalizedNew.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div 
                className={`h-2 rounded-full progress-bar ${
                  diff.isPositive ? 'bg-green-500' : diff.isNegative ? 'bg-red-500' : 'bg-blue-500'
                }`}
                style={{ 
                  width: animateScores ? `${Math.min(normalizedNew, 100)}%` : '0%',
                  transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1) 0.3s'
                }}
              ></div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
          <span className="text-sm text-gray-600 dark:text-gray-400">Thay đổi</span>
          <span className={`font-semibold flex items-center gap-1 ${
            diff.isPositive ? 'score-increase' : diff.isNegative ? 'score-decrease' : 'score-stable'
          }`}>
            {diff.isPositive && <span className="animate-bounce">↗</span>}
            {diff.isNegative && <span className="animate-bounce">↘</span>}
            {!diff.isPositive && !diff.isNegative && <span>→</span>}
            {diff.isPositive ? '+' : ''}{diff.value.toFixed(0)}%
          </span>
        </div>
      </div>
    );
  };

  // For testing: Always show the main interface
  // if (!hasFeature('progress_tracking')) {
  if (false) { // Temporarily disable restriction for testing
    console.log('Progress tracking not available. Current plan:', currentPlan, 'Has feature:', hasFeature('progress_tracking'));
    
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-12 border border-purple-200 dark:border-purple-700 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C9.79 2 8 3.79 8 6v2H7c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2h-1V6c0-2.21-1.79-4-4-4zm0 2c1.1 0 2 .9 2 2v2h-4V6c0-1.1.9-2 2-2z" />
                </svg>
              </div>
              
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                So sánh lịch sử phát triển
              </h1>
              
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-4 max-w-2xl mx-auto">
                Tính năng này chỉ dành cho người dùng Gói Pro. Theo dõi và so sánh sự thay đổi trong kết quả đánh giá tính cách theo thời gian.
              </p>
              
              <div className="text-sm text-gray-500 mb-8">
                Gói hiện tại: {currentPlan} | Có quyền truy cập: {hasFeature('progress_tracking') ? 'Có' : 'Không'}
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-8 text-left">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Theo dõi tiến bộ</h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Xem sự thay đổi trong điểm số Big Five và RIASEC qua các lần kiểm tra
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">So sánh theo thời gian</h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Chọn hai kết quả khác nhau để đối chiếu sự phát triển cá nhân
                  </p>
                </div>
              </div>

              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Nâng cấp Gói Pro (499k)
                <span>✨</span>
              </Link>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (showComparison && comparisonData) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <button
                onClick={() => {
                  setShowComparison(false);
                  setSelectedSessions([]);
                  setComparisonData(null);
                  setAnimateScores(false);
                }}
                className="inline-flex items-center gap-2 text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 transition-colors mb-6 hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-2 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Quay lại danh sách
              </button>

              <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 animate-fade-in">
                  Kết quả so sánh
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-400 animate-fade-in-delay">
                  So sánh sự thay đổi giữa {comparisonData.first.timestamp.toLocaleDateString('vi-VN')} và {comparisonData.second.timestamp.toLocaleDateString('vi-VN')}
                </p>
                
                {/* Add comparison stats */}
                <div className="flex justify-center gap-8 mt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {Math.abs(comparisonData.second.timestamp.getTime() - comparisonData.first.timestamp.getTime()) / (1000 * 60 * 60 * 24) < 1 
                        ? '< 1 ngày' 
                        : `${Math.floor(Math.abs(comparisonData.second.timestamp.getTime() - comparisonData.first.timestamp.getTime()) / (1000 * 60 * 60 * 24))} ngày`}
                    </div>
                    <div className="text-sm text-gray-500">Khoảng cách thời gian</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {comparisonData.first.bigFiveScores && comparisonData.second.bigFiveScores ? '5' : '0'} + {comparisonData.first.riasecScores && comparisonData.second.riasecScores ? '6' : '0'}
                    </div>
                    <div className="text-sm text-gray-500">Chỉ số so sánh</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {/* Big Five Comparison */}
              {comparisonData.first.bigFiveScores && comparisonData.second.bigFiveScores && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 animate-slide-up">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    So sánh Big Five
                    <span className="text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                      5 chỉ số
                    </span>
                  </h2>
                  
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {renderScoreComparison('Cởi mở (Openness)', comparisonData.first.bigFiveScores.openness, comparisonData.second.bigFiveScores.openness)}
                    {renderScoreComparison('Tận tâm (Conscientiousness)', comparisonData.first.bigFiveScores.conscientiousness, comparisonData.second.bigFiveScores.conscientiousness)}
                    {renderScoreComparison('Hướng ngoại (Extraversion)', comparisonData.first.bigFiveScores.extraversion, comparisonData.second.bigFiveScores.extraversion)}
                    {renderScoreComparison('Dễ chịu (Agreeableness)', comparisonData.first.bigFiveScores.agreeableness, comparisonData.second.bigFiveScores.agreeableness)}
                    {renderScoreComparison('Lo âu (Neuroticism)', comparisonData.first.bigFiveScores.neuroticism, comparisonData.second.bigFiveScores.neuroticism)}
                  </div>
                </div>
              )}

              {/* RIASEC Comparison */}
              {comparisonData.first.riasecScores && comparisonData.second.riasecScores && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 animate-slide-up-delay">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    So sánh RIASEC
                    <span className="text-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                      6 chỉ số
                    </span>
                  </h2>
                  
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {renderScoreComparison('Thực tế (Realistic)', comparisonData.first.riasecScores.realistic, comparisonData.second.riasecScores.realistic)}
                    {renderScoreComparison('Nghiên cứu (Investigative)', comparisonData.first.riasecScores.investigative, comparisonData.second.riasecScores.investigative)}
                    {renderScoreComparison('Nghệ thuật (Artistic)', comparisonData.first.riasecScores.artistic, comparisonData.second.riasecScores.artistic)}
                    {renderScoreComparison('Xã hội (Social)', comparisonData.first.riasecScores.social, comparisonData.second.riasecScores.social)}
                    {renderScoreComparison('Kinh doanh (Enterprising)', comparisonData.first.riasecScores.enterprising, comparisonData.second.riasecScores.enterprising)}
                    {renderScoreComparison('Quy ước (Conventional)', comparisonData.first.riasecScores.conventional, comparisonData.second.riasecScores.conventional)}
                  </div>
                </div>
              )}

              {/* Interactive Summary */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-8 border border-purple-200 dark:border-purple-700 animate-slide-up-delay-2">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Tóm tắt sự thay đổi
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Dựa trên kết quả so sánh, bạn có thể thấy sự phát triển và thay đổi trong tính cách và sở thích nghề nghiệp theo thời gian.
                </p>
                
                {/* Interactive legend */}
                <div className="flex flex-wrap gap-3 mb-6">
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm rounded-full hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors cursor-pointer">
                    <span className="animate-bounce">↗</span>
                    Cải thiện
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm rounded-full hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors cursor-pointer">
                    <span className="animate-bounce">↘</span>
                    Giảm
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer">
                    <span>→</span>
                    Ổn định
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      setShowComparison(false);
                      setSelectedSessions([]);
                      setComparisonData(null);
                      setAnimateScores(false);
                    }}
                    className="interactive-button px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all duration-200"
                  >
                    So sánh khác
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="interactive-button px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all duration-200"
                  >
                    In kết quả
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 transition-colors mb-6"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>

            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                So sánh lịch sử phát triển
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                Theo dõi sự thay đổi và tiến bộ của bạn qua các lần đánh giá tính cách
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 rounded-full border-t-purple-600 animate-spin mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">Đang tải lịch sử đánh giá...</p>
            </div>
          ) : groupedSessions.length < 2 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  {groupedSessions.length === 0 ? 'Chưa có dữ liệu đánh giá' : 'Cần thêm dữ liệu để so sánh'}
                </h3>
                
                <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                  {groupedSessions.length === 0 
                    ? 'Bạn chưa có kết quả đánh giá nào. Hãy làm bài đánh giá đầu tiên để bắt đầu theo dõi tiến bộ.'
                    : `Bạn có ${groupedSessions.length} phiên đánh giá. Cần ít nhất 2 phiên để sử dụng tính năng so sánh.`
                  }
                </p>

                <Link
                  to="/assessment"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Làm bài đánh giá mới
                </Link>
              </div>
            </div>
          ) : (
            // Show comparison interface when we have 2+ sessions
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Lịch sử đánh giá ({groupedSessions.length} phiên)
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Chọn 2 phiên để so sánh sự thay đổi theo thời gian
                </p>
              </div>

              <div className="grid gap-4 mb-8">
                {groupedSessions.map((session, index) => (
                  <div
                    key={session.sessionId}
                    className={`p-4 border rounded-xl cursor-pointer transition-all ${
                      selectedSessions.includes(session.sessionId)
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                    }`}
                    onClick={() => {
                      if (selectedSessions.includes(session.sessionId)) {
                        setSelectedSessions(prev => prev.filter(id => id !== session.sessionId));
                      } else if (selectedSessions.length < 2) {
                        setSelectedSessions(prev => [...prev, session.sessionId]);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          Phiên đánh giá #{groupedSessions.length - index}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {session.timestamp.toLocaleDateString('vi-VN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {session.hasBigFive && (
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                            Big Five
                          </span>
                        )}
                        {session.hasRIASEC && (
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full">
                            RIASEC
                          </span>
                        )}
                        {selectedSessions.includes(session.sessionId) && (
                          <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedSessions.length === 2 && (
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-4">
                    Đã chọn {selectedSessions.length} phiên đánh giá
                  </p>
                  <button
                    className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
                    onClick={() => {
                      console.log('Compare button clicked!');
                      console.log('Selected sessions:', selectedSessions);
                      console.log('Available sessions:', groupedSessions);
                      handleCompareResults();
                    }}
                  >
                    So sánh kết quả đã chọn
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default ProgressComparisonPage;