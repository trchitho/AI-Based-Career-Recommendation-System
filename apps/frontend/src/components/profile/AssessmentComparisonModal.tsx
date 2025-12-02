import { AssessmentHistoryItem } from '../../types/profile';

interface AssessmentComparisonModalProps {
  assessments: AssessmentHistoryItem[];
  onClose: () => void;
}

const AssessmentComparisonModal = ({ assessments, onClose }: AssessmentComparisonModalProps) => {
  if (assessments.length !== 2) return null;

  const assessment1 = assessments[0]!;
  const assessment2 = assessments[1]!;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const calculateChange = (score1?: number, score2?: number) => {
    if (score1 === undefined || score2 === undefined) return null;
    const change = score2 - score1;
    return {
      value: Math.abs(change),
      direction: change > 0 ? 'increase' : change < 0 ? 'decrease' : 'same',
    };
  };

  const renderScoreComparison = (label: string, score1?: number, score2?: number) => {
    const change = calculateChange(score1, score2);

    return (
      <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 w-1/3">{label}</span>

        <div className="flex items-center space-x-4 w-2/3">
          <span className="text-sm text-gray-900 dark:text-gray-100 w-16 text-right">{score1?.toFixed(0) || 'N/A'}</span>

          <div className="flex-1 flex items-center justify-center">
            {change && change.direction !== 'same' && (
              <span
                className={`text-xs font-medium ${change.direction === 'increase'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
                  }`}
              >
                {change.direction === 'increase' ? '↑' : '↓'} {change.value.toFixed(0)}
              </span>
            )}

            {change && change.direction === 'same' && (
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">→ No change</span>
            )}
          </div>

          <span className="text-sm text-gray-900 dark:text-gray-100 w-16 text-left">{score2?.toFixed(0) || 'N/A'}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Assessment Comparison</h3>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Date Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="w-1/3"></div>

            <div className="flex items-center space-x-4 w-2/3">
              <div className="w-16 text-right">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Earlier</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formatDate(assessment1.completed_at)}
                </p>
              </div>

              <div className="flex-1 text-center">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Change</p>
              </div>

              <div className="w-16 text-left">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Recent</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formatDate(assessment2.completed_at)}
                </p>
              </div>
            </div>
          </div>

          {/* RIASEC */}
          {assessment1.riasec_scores && assessment2.riasec_scores && (
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">RIASEC Scores</h4>
              <div className="space-y-1">
                {renderScoreComparison("Realistic", assessment1.riasec_scores.realistic, assessment2.riasec_scores.realistic)}
                {renderScoreComparison("Investigative", assessment1.riasec_scores.investigative, assessment2.riasec_scores.investigative)}
                {renderScoreComparison("Artistic", assessment1.riasec_scores.artistic, assessment2.riasec_scores.artistic)}
                {renderScoreComparison("Social", assessment1.riasec_scores.social, assessment2.riasec_scores.social)}
                {renderScoreComparison("Enterprising", assessment1.riasec_scores.enterprising, assessment2.riasec_scores.enterprising)}
                {renderScoreComparison("Conventional", assessment1.riasec_scores.conventional, assessment2.riasec_scores.conventional)}
              </div>
            </div>
          )}

          {/* Big Five */}
          {assessment1.big_five_scores && assessment2.big_five_scores && (
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Big Five Personality Traits</h4>
              <div className="space-y-1">
                {renderScoreComparison("Openness", assessment1.big_five_scores.openness, assessment2.big_five_scores.openness)}
                {renderScoreComparison("Conscientiousness", assessment1.big_five_scores.conscientiousness, assessment2.big_five_scores.conscientiousness)}
                {renderScoreComparison("Extraversion", assessment1.big_five_scores.extraversion, assessment2.big_five_scores.extraversion)}
                {renderScoreComparison("Agreeableness", assessment1.big_five_scores.agreeableness, assessment2.big_five_scores.agreeableness)}
                {renderScoreComparison("Neuroticism", assessment1.big_five_scores.neuroticism, assessment2.big_five_scores.neuroticism)}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">Interpretation</h4>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Changes in scores can reflect personal growth, new experiences, or evolving interests.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-[#111] px-6 py-4 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssessmentComparisonModal;
