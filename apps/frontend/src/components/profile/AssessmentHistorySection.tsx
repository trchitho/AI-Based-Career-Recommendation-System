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
            <p className="text-green-100 font-medium text-sm">
              Track your career assessment journey and growth
            </p>
          </div>

          {assessmentHistory.length >= 2 && (
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

        {assessmentHistory.length === 0 ? (
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
              Start your career journey by taking your first assessment to discover your ideal career path.
            </p>
            <button
              onClick={() => navigate('/assessment')}
              className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-full font-bold shadow-lg shadow-green-600/30 hover:shadow-green-600/50 hover:-translate-y-0.5 transition-all flex items-center gap-2 mx-auto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Take Assessment
            </button>
          </div>
        ) : (
          <>
            {assessmentHistory.length >= 2 && (
              <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl flex items-start gap-3">
                <div className="p-1.5 bg-blue-100 dark:bg-blue-800/40 rounded-full shrink-0 text-blue-600 dark:text-blue-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm text-blue-800 dark:text-blue-300 font-medium mt-0.5">
                  Select two assessments to compare your results and see how your profile has evolved.
                </p>
              </div>
            )}

            <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
              <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
                <thead className="bg-gray-50/80 dark:bg-gray-900/50">
                  <tr>
                    {assessmentHistory.length >= 2 && (
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
                    <th className="px-6 py-4 relative">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                  {assessmentHistory.map((assessment) => (
                    <tr
                      key={assessment.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group"
                    >
                      {assessmentHistory.length >= 2 && (
                        <td className="px-6 py-5 align-middle">
                          <input
                            type="checkbox"
                            checked={selectedAssessments.includes(assessment.id)}
                            onChange={() => handleCheckboxChange(assessment.id)}
                            className="w-5 h-5 text-green-600 rounded-md border-gray-300 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 cursor-pointer transition-all"
                          />
                        </td>
                      )}

                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900 dark:text-white">{formatDate(assessment.completed_at)}</div>
                      </td>

                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                          {getTestTypeLabel(assessment.test_types)}
                        </span>
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