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
    const sorted = Object.entries(scores).sort((a: any, b: any) => b[1] - a[1]);
    const [trait, value] = sorted[0];
    return `${trait[0].toUpperCase() + trait.slice(1)} (${value.toFixed(0)})`;
  };

  const getBigFiveSummary = (scores?: any) => {
    if (!scores) return 'N/A';
    const sorted = Object.entries(scores).sort((a: any, b: any) => b[1] - a[1]);
    const [trait, value] = sorted[0];
    return `${trait[0].toUpperCase() + trait.slice(1)} (${value.toFixed(0)})`;
  };

  const comparisonData =
    showComparison && selectedAssessments.length === 2
      ? assessmentHistory.filter((a) => selectedAssessments.includes(a.id))
      : [];

  return (
    <div
      className="
        bg-white dark:bg-[#1A1F2C]
        border border-gray-200 dark:border-white/10
        rounded-xl p-6 shadow-sm transition-colors
      "
    >
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          Assessment History
        </h3>

        {assessmentHistory.length >= 2 && (
          <button
            onClick={() => selectedAssessments.length === 2 && setShowComparison(true)}
            disabled={selectedAssessments.length !== 2}
            className="
              px-4 py-2 bg-indigo-600 text-white rounded-md
              hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed
              transition-colors
            "
          >
            Compare Selected ({selectedAssessments.length}/2)
          </button>
        )}
      </div>

      {assessmentHistory.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            You haven't completed any assessments yet.
          </p>
          <button
            onClick={() => navigate('/assessment')}
            className="
              px-4 py-2 bg-indigo-600 text-white rounded-md
              hover:bg-indigo-700 transition-colors
            "
          >
            Take Your First Assessment
          </button>
        </div>
      ) : (
        <>
          {assessmentHistory.length >= 2 && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Select two assessments to compare your results.
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
              <thead className="bg-gray-100 dark:bg-[#111827]">
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

              <tbody
                className="
                  bg-white dark:bg-[#1A1F2C]
                  divide-y divide-gray-200 dark:divide-white/10
                "
              >
                {assessmentHistory.map((assessment) => (
                  <tr
                    key={assessment.id}
                    className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    {assessmentHistory.length >= 2 && (
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedAssessments.includes(assessment.id)}
                          onChange={() => handleCheckboxChange(assessment.id)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
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
                        className="text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        View Details
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
  );
};

export default AssessmentHistorySection;
