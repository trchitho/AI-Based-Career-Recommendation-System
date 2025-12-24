import { AssessmentHistoryItem } from '../../types/profile';

interface AssessmentComparisonModalProps {
  assessments: AssessmentHistoryItem[];
  onClose: () => void;
}

const AssessmentComparisonModal = ({ assessments, onClose }: AssessmentComparisonModalProps) => {
  if (assessments.length !== 2) return null;

  const assessment1 = assessments[0]!;
  const assessment2 = assessments[1]!;

  console.log('Assessment 1:', assessment1);
  console.log('Assessment 2:', assessment2);

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
      <div className="grid grid-cols-12 gap-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0 items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors px-2 rounded-lg">
        {/* Label */}
        <div className="col-span-5 text-sm font-semibold text-gray-700 dark:text-gray-200">
          {label}
        </div>

        {/* Old Score */}
        <div className="col-span-2 text-sm font-bold text-gray-500 dark:text-gray-400 text-center">
          {score1?.toFixed(0) || '-'}
        </div>

        {/* Change Indicator */}
        <div className="col-span-3 flex justify-center">
          {change && change.direction !== 'same' ? (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${change.direction === 'increase'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}>
              {change.direction === 'increase' ? '↑' : '↓'} {change.value.toFixed(0)}
            </span>
          ) : (
            <span className="text-xs font-medium text-gray-400">-</span>
          )}
        </div>

        {/* New Score */}
        <div className="col-span-2 text-sm font-bold text-gray-900 dark:text-white text-center">
          {score2?.toFixed(0) || '-'}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-['Plus_Jakarta_Sans']">

      {/* Modal Container */}
      <div className="bg-white dark:bg-gray-900 rounded-[32px] shadow-2xl border border-gray-100 dark:border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-fade-in-up">

        {/* Header */}
        <div className="p-6 md:p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-start bg-white dark:bg-gray-900 sticky top-0 z-10">
          <div>
            <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Compare Results</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">See how your profile has evolved over time.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 md:p-8 overflow-y-auto">

          {/* Comparison Header Grid */}
          <div className="grid grid-cols-12 gap-4 mb-6 pb-4 border-b-2 border-gray-100 dark:border-gray-800 text-xs font-bold uppercase tracking-wider text-gray-400">
            <div className="col-span-5">Metric</div>
            <div className="col-span-2 text-center">
              {formatDate(assessment1.completed_at)}
            </div>
            <div className="col-span-3 text-center">Change</div>
            <div className="col-span-2 text-center text-green-600 dark:text-green-500">
              {formatDate(assessment2.completed_at)}
            </div>
          </div>

          {/* RIASEC Section */}
          {(assessment1.riasec_scores || assessment2.riasec_scores) && (
            <div className="mb-8">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-blue-500 rounded-full"></span>
                RIASEC Scores
              </h4>
              <div className="space-y-1">
                {renderScoreComparison("Realistic", assessment1.riasec_scores?.realistic, assessment2.riasec_scores?.realistic)}
                {renderScoreComparison("Investigative", assessment1.riasec_scores?.investigative, assessment2.riasec_scores?.investigative)}
                {renderScoreComparison("Artistic", assessment1.riasec_scores?.artistic, assessment2.riasec_scores?.artistic)}
                {renderScoreComparison("Social", assessment1.riasec_scores?.social, assessment2.riasec_scores?.social)}
                {renderScoreComparison("Enterprising", assessment1.riasec_scores?.enterprising, assessment2.riasec_scores?.enterprising)}
                {renderScoreComparison("Conventional", assessment1.riasec_scores?.conventional, assessment2.riasec_scores?.conventional)}
              </div>
            </div>
          )}

          {/* Big Five Section */}
          {(assessment1.big_five_scores || assessment2.big_five_scores) && (
            <div className="mb-8">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-purple-500 rounded-full"></span>
                Big Five Traits
              </h4>
              <div className="space-y-1">
                {renderScoreComparison("Openness", assessment1.big_five_scores?.openness, assessment2.big_five_scores?.openness)}
                {renderScoreComparison("Conscientiousness", assessment1.big_five_scores?.conscientiousness, assessment2.big_five_scores?.conscientiousness)}
                {renderScoreComparison("Extraversion", assessment1.big_five_scores?.extraversion, assessment2.big_five_scores?.extraversion)}
                {renderScoreComparison("Agreeableness", assessment1.big_five_scores?.agreeableness, assessment2.big_five_scores?.agreeableness)}
                {renderScoreComparison("Neuroticism", assessment1.big_five_scores?.neuroticism, assessment2.big_five_scores?.neuroticism)}
              </div>
            </div>
          )}

          {/* Show message if no scores available */}
          {!assessment1.riasec_scores && !assessment2.riasec_scores && !assessment1.big_five_scores && !assessment2.big_five_scores && (
            <div className="text-center py-8">
              <div className="text-gray-500 dark:text-gray-400 mb-4">
                <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-lg font-medium">No assessment data available</p>
                <p className="text-sm">The selected assessments don't contain score data for comparison.</p>
              </div>
            </div>
          )}

          {/* Summary Box */}
          <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-2xl p-5 flex gap-4">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <h4 className="font-bold text-blue-900 dark:text-blue-300 text-sm mb-1">Interpretation</h4>
              <p className="text-sm text-blue-700 dark:text-blue-200 leading-relaxed">
                Changes in your scores may reflect personal growth, new experiences, or shifts in your interests over time. Small fluctuations are normal.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end sticky bottom-0">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold hover:opacity-90 transition-opacity shadow-lg"
          >
            Close Comparison
          </button>
        </div>

      </div>
    </div>
  );
};

export default AssessmentComparisonModal;