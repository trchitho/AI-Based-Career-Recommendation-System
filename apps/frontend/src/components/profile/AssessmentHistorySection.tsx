import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AssessmentHistoryItem } from '../../types/profile';
import AssessmentComparisonModal from './AssessmentComparisonModal.tsx';

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

  const getTestTypeLabel = (testTypes: string[]) => {
    return testTypes.join(', ');
  };

  const handleCheckboxChange = (assessmentId: string) => {
    setSelectedAssessments((prev) => {
      if (prev.includes(assessmentId)) {
        return prev.filter((id) => id !== assessmentId);
      } else if (prev.length < 2) {
        return [...prev, assessmentId];
      }
      return prev;
    });
  };

  const handleCompare = () => {
    if (selectedAssessments.length === 2) {
      setShowComparison(true);
    }
  };

  const getSelectedAssessmentData = () => {
    return assessmentHistory.filter((a) => selectedAssessments.includes(a.id));
  };

  const getRiasecSummary = (scores?: any) => {
    if (!scores) return 'N/A';
    const entries = Object.entries(scores) as [string, number][];
    const sorted = entries.sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return 'N/A';
    const top = sorted[0]!;
    return `${top[0].charAt(0).toUpperCase() + top[0].slice(1)} (${top[1].toFixed(0)})`;
  };

  const getBigFiveSummary = (scores?: any) => {
    if (!scores) return 'N/A';
    const entries = Object.entries(scores) as [string, number][];
    const sorted = entries.sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return 'N/A';
    const top = sorted[0]!;
    return `${top[0].charAt(0).toUpperCase() + top[0].slice(1)} (${top[1].toFixed(0)})`;
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Assessment History</h3>
        {assessmentHistory.length >= 2 && (
          <button
            onClick={handleCompare}
            disabled={selectedAssessments.length !== 2}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Compare Selected ({selectedAssessments.length}/2)
          </button>
        )}
      </div>

      {assessmentHistory.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">You haven't completed any assessments yet.</p>
          <button
            onClick={() => navigate('/assessment')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            Take Your First Assessment
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {assessmentHistory.length >= 2 && (
            <p className="text-sm text-gray-600">
              Select two assessments to compare your results over time.
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {assessmentHistory.length >= 2 && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Compare
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date Completed
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Test Types
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Top RIASEC
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Top Big Five
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {assessmentHistory.map((assessment) => (
                  <tr key={assessment.id} className="hover:bg-gray-50">
                    {assessmentHistory.length >= 2 && (
                      <td className="px-4 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedAssessments.includes(assessment.id)}
                          onChange={() => handleCheckboxChange(assessment.id)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                      </td>
                    )}
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(assessment.completed_at)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getTestTypeLabel(assessment.test_types)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getRiasecSummary(assessment.riasec_scores)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getBigFiveSummary(assessment.big_five_scores)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => navigate(`/results/${assessment.id}`)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showComparison && (
        <AssessmentComparisonModal
          assessments={getSelectedAssessmentData()}
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
