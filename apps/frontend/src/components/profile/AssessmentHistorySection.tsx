import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AssessmentHistoryItem } from '../../types/profile';
import AssessmentComparisonModal from './AssessmentComparisonModal';

interface AssessmentHistorySectionProps {
  assessmentHistory: AssessmentHistoryItem[];
}

const AssessmentHistorySection = ({ assessmentHistory }: AssessmentHistorySectionProps) => {
  const navigate = useNavigate();
  const [showComparison, setShowComparison] = useState(false);
  const [selectedAssessments, setSelectedAssessments] = useState<string[]>([]);

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

  const comparisonData =
    showComparison && selectedAssessments.length === 2
      ? assessmentHistory.filter((a) => selectedAssessments.includes(a.id))
      : [];

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-2xl overflow-hidden">
      
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-[#4A7C59] to-[#3d6449] dark:from-green-600 dark:to-green-700 px-8 py-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h3 className="text-2xl font-bold text-white mb-1">
              Assessment History
            </h3>
            <p className="text-white/80 text-sm">
              Track your career assessment journey
            </p>
          </div>

          {assessmentHistory.length >= 2 && (
            <button
              onClick={() => selectedAssessments.length === 2 && setShowComparison(true)}
              disabled={selectedAssessments.length !== 2}
              className="px-5 py-2.5 bg-white text-[#4A7C59] dark:text-green-600 rounded-lg font-semibold hover:bg-gray-50 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-all shadow-lg flex items-center gap-2"
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

        {assessmentHistory.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Assessments Yet
            </h4>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Start your career journey by taking your first assessment to discover your ideal career path.
            </p>
            <button
              onClick={() => navigate('/assessment')}
              className="px-6 py-3 bg-[#4A7C59] dark:bg-green-600 text-white rounded-lg hover:bg-[#3d6449] dark:hover:bg-green-700 font-semibold transition-all shadow-lg flex items-center gap-2 mx-auto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Take Your First Assessment
            </button>
          </div>
        ) : (
          <>
            {assessmentHistory.length >= 2 && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center gap-3">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">
                  Select two assessments to compare your results and track your progress.
                </p>
              </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  {assessmentHistory.length >= 2 && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Compare
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Date Completed
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Test Types
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Top RIASEC
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Top Big Five
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>

                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {assessmentHistory.map((assessment) => (
                    <tr
                      key={assessment.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                    {assessmentHistory.length >= 2 && (
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedAssessments.includes(assessment.id)}
                          onChange={() => handleCheckboxChange(assessment.id)}
                          className="h-4 w-4 text-[#4A7C59] focus:ring-[#4A7C59] border-gray-300 rounded"
                        />
                      </td>
                    )}

                    <td className="px-4 py-4 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                      {formatDate(assessment.completed_at)}
                    </td>

                    <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {getTestTypeLabel(assessment.test_types)}
                    </td>

                    <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {getRiasecSummary(assessment.riasec_scores)}
                    </td>

                    <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {getBigFiveSummary(assessment.big_five_scores)}
                    </td>

                      <td className="px-4 py-4 text-sm text-right whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/results/${assessment.id}`)}
                          className="text-[#4A7C59] dark:text-green-400 hover:text-[#3d6449] dark:hover:text-green-300 font-semibold flex items-center gap-1 ml-auto"
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
