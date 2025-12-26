import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AssessmentHistoryItem } from '../../types/profile';
import AssessmentComparisonModal from './AssessmentComparisonModal';
import { getRIASECFullName } from '../../utils/riasec';

interface AssessmentHistorySectionProps {
  assessmentHistory: AssessmentHistoryItem[];
}

// Grouped session type
interface GroupedSession {
  session_id: string;
  created_at: string;
  riasec_assessment?: AssessmentHistoryItem;
  bigfive_assessment?: AssessmentHistoryItem;
  riasec_scores?: any;
  big_five_scores?: any;
}

const AssessmentHistorySection = ({ assessmentHistory }: AssessmentHistorySectionProps) => {
  const navigate = useNavigate();
  const [showComparison, setShowComparison] = useState(false);
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  // Group assessments by session/time (within 5 minutes = same session)
  const groupedSessions = useMemo(() => {
    const sessions: GroupedSession[] = [];
    const sortedHistory = [...assessmentHistory].sort(
      (a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
    );

    for (const assessment of sortedHistory) {
      const assessmentTime = new Date(assessment.completed_at).getTime();
      const testTypes = assessment.test_types || [];
      const isRiasec = testTypes.some(t => t.toLowerCase().includes('riasec'));
      const isBigFive = testTypes.some(t => t.toLowerCase().includes('bigfive') || t.toLowerCase().includes('big_five'));

      // Find existing session within 5 minutes
      let existingSession = sessions.find(s => {
        const sessionTime = new Date(s.created_at).getTime();
        return Math.abs(sessionTime - assessmentTime) < 5 * 60 * 1000; // 5 minutes
      });

      if (existingSession) {
        // Add to existing session
        if (isRiasec && !existingSession.riasec_assessment) {
          existingSession.riasec_assessment = assessment;
          existingSession.riasec_scores = assessment.riasec_scores;
        }
        if (isBigFive && !existingSession.bigfive_assessment) {
          existingSession.bigfive_assessment = assessment;
          existingSession.big_five_scores = assessment.big_five_scores;
        }
        // If assessment has both types, add both scores
        if (assessment.riasec_scores && !existingSession.riasec_scores) {
          existingSession.riasec_scores = assessment.riasec_scores;
        }
        if (assessment.big_five_scores && !existingSession.big_five_scores) {
          existingSession.big_five_scores = assessment.big_five_scores;
        }
      } else {
        // Create new session
        const newSession: GroupedSession = {
          session_id: assessment.id,
          created_at: assessment.completed_at,
        };
        // Always try to get scores from assessment regardless of test_types
        if (isRiasec || assessment.riasec_scores) {
          newSession.riasec_assessment = assessment;
          newSession.riasec_scores = assessment.riasec_scores;
        }
        if (isBigFive || assessment.big_five_scores) {
          newSession.bigfive_assessment = assessment;
          newSession.big_five_scores = assessment.big_five_scores;
        }
        sessions.push(newSession);
      }
    }

    return sessions;
  }, [assessmentHistory]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCheckboxChange = (sessionId: string) => {
    setSelectedSessions((prev) => {
      if (prev.includes(sessionId)) return prev.filter((p) => p !== sessionId);
      if (prev.length < 2) return [...prev, sessionId];
      return prev;
    });
  };

  const getRiasecSummary = (scores?: any) => {
    if (!scores) return 'N/A';
    const entries = Object.entries(scores);
    if (entries.length === 0) return 'N/A';
    const sorted = entries.sort((a: any, b: any) => b[1] - a[1]);
    const topEntry = sorted[0];
    if (!topEntry || !topEntry[0]) return 'N/A';
    const trait = topEntry[0];
    const value = topEntry[1] as number;
    const fullName = getRIASECFullName(trait);
    return `${fullName} (${value.toFixed(0)})`;
  };

  const getBigFiveSummary = (scores?: any) => {
    if (!scores) return 'N/A';
    const entries = Object.entries(scores);
    if (entries.length === 0) return 'N/A';
    const sorted = entries.sort((a: any, b: any) => b[1] - a[1]);
    const topEntry = sorted[0];
    if (!topEntry || !topEntry[0]) return 'N/A';
    const trait = topEntry[0];
    const value = topEntry[1] as number;
    return `${trait.charAt(0).toUpperCase() + trait.slice(1)} (${value.toFixed(0)})`;
  };

  const getSessionTestTypes = (session: GroupedSession) => {
    const types: string[] = [];
    if (session.riasec_assessment) types.push('RIASEC');
    if (session.bigfive_assessment) types.push('BigFive');
    return types.join(' + ') || 'N/A';
  };

  // Get comparison data from selected sessions
  const comparisonData = useMemo((): AssessmentHistoryItem[] => {
    if (!showComparison || selectedSessions.length !== 2) return [];
    return groupedSessions
      .filter(s => selectedSessions.includes(s.session_id))
      .map(s => ({
        id: s.session_id,
        completed_at: s.created_at,
        test_types: [
          ...(s.riasec_assessment ? ['RIASEC'] : []),
          ...(s.bigfive_assessment ? ['BigFive'] : [])
        ],
        riasec_scores: s.riasec_scores,
        big_five_scores: s.big_five_scores
      } as AssessmentHistoryItem));
  }, [showComparison, selectedSessions, groupedSessions]);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xl rounded-[32px] overflow-hidden font-['Plus_Jakarta_Sans']">

      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-[#4A7C59] to-[#3d6449] dark:from-green-800 dark:to-green-900 px-8 py-6 relative overflow-hidden">
        {/* Abstract pattern overlay */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
        <div className="absolute right-0 top-0 h-full w-1/3 bg-white/5 skew-x-12 transform translate-x-10 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-2xl font-extrabold text-white mb-1 tracking-tight">
              Lịch sử đánh giá
            </h3>
            <p className="text-green-100 text-sm font-medium">
              Theo dõi hành trình phát triển nghề nghiệp của bạn
            </p>
          </div>

          {groupedSessions.length >= 2 && (
            <button
              onClick={() => selectedSessions.length === 2 && setShowComparison(true)}
              disabled={selectedSessions.length !== 2}
              className="px-5 py-2.5 bg-white/10 backdrop-blur-md text-white border border-white/30 rounded-xl font-bold text-sm hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              So sánh ({selectedSessions.length}/2)
            </button>
          )}
        </div>
      </div>

      <div className="p-8">

        {groupedSessions.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
            <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-gray-100 dark:border-gray-600">
              <svg className="w-10 h-10 text-gray-300 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Chưa có bài test nào
            </h4>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto text-sm font-medium">
              Hãy thực hiện bài đánh giá đầu tiên để bắt đầu hành trình phát triển nghề nghiệp.
            </p>
            <button
              onClick={() => navigate('/assessment')}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors shadow-lg"
            >
              Bắt đầu đánh giá
            </button>
          </div>
        ) : (
          <>
            {groupedSessions.length >= 2 && (
              <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl flex items-start gap-3">
                <div className="p-1.5 bg-blue-100 dark:bg-blue-800/40 rounded-full shrink-0 text-blue-600 dark:text-blue-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                  Chọn 2 bài test để so sánh tiến trình của bạn theo thời gian.
                </p>
              </div>
            )}

            <div className="space-y-4">
              {groupedSessions.map((session) => (
                <div
                  key={session.session_id}
                  className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Main Row */}
                  <div className="p-5 flex items-center gap-4">
                    {groupedSessions.length >= 2 && (
                      <input
                        type="checkbox"
                        checked={selectedSessions.includes(session.session_id)}
                        onChange={() => handleCheckboxChange(session.session_id)}
                        className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {formatDate(session.created_at)}
                        </span>
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold rounded-full">
                          {getSessionTestTypes(session)}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap gap-4 text-sm">
                        {session.riasec_scores && (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-gray-600 dark:text-gray-400">
                              RIASEC: <span className="font-medium text-gray-900 dark:text-white">{getRiasecSummary(session.riasec_scores)}</span>
                            </span>
                          </div>
                        )}
                        {session.big_five_scores && (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <span className="text-gray-600 dark:text-gray-400">
                              BigFive: <span className="font-medium text-gray-900 dark:text-white">{getBigFiveSummary(session.big_five_scores)}</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setExpandedSession(expandedSession === session.session_id ? null : session.session_id)}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        title="Xem chi tiết"
                      >
                        <svg 
                          className={`w-5 h-5 transition-transform ${expandedSession === session.session_id ? 'rotate-180' : ''}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          const assessmentId = session.riasec_assessment?.id || session.bigfive_assessment?.id;
                          if (assessmentId) navigate(`/results/${assessmentId}`);
                        }}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg transition-colors"
                      >
                        Xem kết quả
                      </button>
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {expandedSession === session.session_id && (
                    <div className="px-5 pb-5 pt-0 border-t border-gray-200 dark:border-gray-700">
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-4">
                        {/* RIASEC Score Details */}
                        {session.riasec_scores && (
                          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                            <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Score Details</h5>
                            <div className="space-y-3">
                              {(() => {
                                const riasecColors: Record<string, string> = {
                                  realistic: '#EF4444',
                                  investigative: '#F59E0B',
                                  artistic: '#10B981',
                                  social: '#3B82F6',
                                  enterprising: '#8B5CF6',
                                  conventional: '#EC4899'
                                };
                                const riasecNames: Record<string, string> = {
                                  realistic: 'Realistic',
                                  investigative: 'Investigative',
                                  artistic: 'Artistic',
                                  social: 'Social',
                                  enterprising: 'Enterprising',
                                  conventional: 'Conventional'
                                };
                                return Object.entries(session.riasec_scores)
                                  .sort((a: any, b: any) => b[1] - a[1])
                                  .map(([key, value]: [string, any]) => (
                                    <div key={key} className="flex items-center gap-3">
                                      <span className="text-xs text-gray-600 dark:text-gray-400 w-24 truncate font-medium">
                                        {riasecNames[key.toLowerCase()] || getRIASECFullName(key)}
                                      </span>
                                      <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden min-w-0">
                                        <div 
                                          className="h-full rounded-full transition-all duration-300" 
                                          style={{ 
                                            width: `${Math.min(value, 100)}%`,
                                            backgroundColor: riasecColors[key.toLowerCase()] || '#3B82F6'
                                          }}
                                        ></div>
                                      </div>
                                      <span 
                                        className="text-xs font-bold w-8 text-right shrink-0"
                                        style={{ color: riasecColors[key.toLowerCase()] || '#3B82F6' }}
                                      >
                                        {value.toFixed(0)}
                                      </span>
                                    </div>
                                  ));
                              })()}
                            </div>
                          </div>
                        )}

                        {/* BigFive Score Details */}
                        {session.big_five_scores && (
                          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                            <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Score Details</h5>
                            <div className="space-y-3">
                              {(() => {
                                const traitColors: Record<string, string> = {
                                  openness: '#8B5CF6',
                                  conscientiousness: '#3B82F6',
                                  extraversion: '#10B981',
                                  agreeableness: '#F59E0B',
                                  neuroticism: '#EF4444'
                                };
                                return Object.entries(session.big_five_scores)
                                  .sort((a: any, b: any) => b[1] - a[1])
                                  .map(([key, value]: [string, any]) => (
                                    <div key={key} className="flex items-center gap-3">
                                      <span className="text-xs text-gray-600 dark:text-gray-400 w-24 capitalize truncate font-medium">{key}</span>
                                      <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden min-w-0">
                                        <div 
                                          className="h-full rounded-full transition-all duration-300" 
                                          style={{ 
                                            width: `${Math.min(value, 100)}%`,
                                            backgroundColor: traitColors[key.toLowerCase()] || '#8B5CF6'
                                          }}
                                        ></div>
                                      </div>
                                      <span 
                                        className="text-xs font-bold w-10 text-right shrink-0"
                                        style={{ color: traitColors[key.toLowerCase()] || '#8B5CF6' }}
                                      >
                                        {value.toFixed(0)}%
                                      </span>
                                    </div>
                                  ));
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {showComparison && comparisonData.length === 2 && (
          <AssessmentComparisonModal
            assessments={comparisonData}
            onClose={() => {
              setShowComparison(false);
              setSelectedSessions([]);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default AssessmentHistorySection;