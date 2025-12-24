import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AssessmentHistoryItem } from '../../types/profile';
import AssessmentComparisonModal from './AssessmentComparisonModal';
import { getRIASECFullName } from '../../utils/riasec';

interface AssessmentHistorySectionProps {
  assessmentHistory: AssessmentHistoryItem[];
}

const AssessmentHistorySection = ({ assessmentHistory }: AssessmentHistorySectionProps) => {
  const navigate = useNavigate();
  const [showComparison, setShowComparison] = useState(false);
  const [selectedAssessments, setSelectedAssessments] = useState<string[]>([]);

  // Debug logging
  console.log('🎯 [AssessmentHistorySection] Received assessmentHistory:', assessmentHistory);

  // Use real assessment history data
  const enrichedHistory = assessmentHistory;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTestTypeLabel = (testTypes: string[]) => testTypes.join(', ');

  const handleCheckboxChange = (id: string) => {
    setSelectedAssessments((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length < 2) return [...prev, id];
      return prev;
    });
  };

  const getRiasecSummary = (scores?: any) => {
    console.log('🔍 [getRiasecSummary] Input scores:', scores);
    if (!scores) return 'N/A';
    const entries = Object.entries(scores);
    if (entries.length === 0) return 'N/A';
    const sorted = entries.sort((a: any, b: any) => b[1] - a[1]);
    const topEntry = sorted[0];
    if (!topEntry || !topEntry[0]) return 'N/A';
    const trait = topEntry[0];
    const value = topEntry[1] as number;
    // Use shared util for consistent Title Case display
    const fullName = getRIASECFullName(trait);
    const result = `${fullName} (${value.toFixed(0)})`;
    console.log('✅ [getRiasecSummary] Result:', result);
    return result;
  };

  const getBigFiveSummary = (scores?: any) => {
    console.log('🔍 [getBigFiveSummary] Input scores:', scores);
    if (!scores) return 'N/A';
    const entries = Object.entries(scores);
    if (entries.length === 0) return 'N/A';
    const sorted = entries.sort((a: any, b: any) => b[1] - a[1]);
    const topEntry = sorted[0];
    if (!topEntry || !topEntry[0]) return 'N/A';
    const trait = topEntry[0];
    const value = topEntry[1] as number;
    const result = `${trait.charAt(0).toUpperCase() + trait.slice(1)} (${value.toFixed(0)})`;
    console.log('✅ [getBigFiveSummary] Result:', result);
    return result;
  };

  const comparisonData =
    showComparison && selectedAssessments.length === 2
      ? enrichedHistory.filter((a) => selectedAssessments.includes(a.id))
      : [];

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
              Assessment History
            </h3>
            <p className="text-green-100 text-sm font-medium">
              Track your career assessment journey and growth
            </p>
          </div>

          {enrichedHistory.length >= 2 && (
            <button
              onClick={() => selectedAssessments.length === 2 && setShowComparison(true)}
              disabled={selectedAssessments.length !== 2}
              className="px-5 py-2.5 bg-white/10 backdrop-blur-md text-white border border-white/30 rounded-xl font-bold text-sm hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Compare ({selectedAssessments.length}/2)
            </button>
          )}
        </div>
      </div>

      <div className="p-8">

        {enrichedHistory.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
            <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-gray-100 dark:border-gray-600">
              <svg className="w-10 h-10 text-gray-300 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              No Assessments Yet
            </h4>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto text-sm font-medium">
              Take your first career assessment to start tracking your professional development journey.
            </p>
            <button
              onClick={() => navigate('/assessment')}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors shadow-lg"
            >
              Take Assessment
            </button>
          </div>
        ) : (
          <>
            {enrichedHistory.length >= 2 && (
              <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl flex items-start gap-3">
                <div className="p-1.5 bg-blue-100 dark:bg-blue-800/40 rounded-full shrink-0 text-blue-600 dark:text-blue-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                  Select two assessments to compare your progress over time.
                </p>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50/80 dark:bg-gray-900/50">
                  <tr>
                    {enrichedHistory.length >= 2 && (
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">
                        Select
                      </th>
                    )}
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date Completed
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Test Types
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Top RIASEC
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Top Big Five
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                  {enrichedHistory.map((assessment) => (
                    <tr
                      key={assessment.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group"
                    >
                      {enrichedHistory.length >= 2 && (
                        <td className="px-6 py-5 align-middle">
                          <input
                            type="checkbox"
                            checked={selectedAssessments.includes(assessment.id)}
                            onChange={() => handleCheckboxChange(assessment.id)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                          />
                        </td>
                      )}

                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                          {formatDate(assessment.completed_at)}
                        </div>
                      </td>

                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                          {getTestTypeLabel(assessment.test_types || [])}
                        </div>
                      </td>

                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                          {getRiasecSummary(assessment.riasec_scores)}
                        </div>
                      </td>

                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                          {getBigFiveSummary(assessment.big_five_scores)}
                        </div>
                      </td>

                      <td className="px-6 py-5 whitespace-nowrap text-right">
                        <button
                          onClick={() => navigate(`/results/${assessment.id}`)}
                          className="text-gray-400 hover:text-green-600 dark:hover:text-green-400 font-semibold text-sm flex items-center gap-1 ml-auto transition-colors group-hover:opacity-100 opacity-70"
                        >
                          View Details
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {showComparison && comparisonData.length === 2 && (
          <AssessmentComparisonModal
            assessments={comparisonData}
            onClose={() => {
              setShowComparison(false);
              setSelectedAssessments([]);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default AssessmentHistorySection;