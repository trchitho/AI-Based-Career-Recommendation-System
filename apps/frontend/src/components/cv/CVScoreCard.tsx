import { CVScore } from '../../utils/cvHelper';

interface CVScoreCardProps {
    score: CVScore;
}

const CVScoreCard = ({ score }: CVScoreCardProps) => {
    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600 dark:text-green-400';
        if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-red-600 dark:text-red-400';
    };

    const getScoreBgColor = (score: number) => {
        if (score >= 80) return 'bg-green-100 dark:bg-green-900/30';
        if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/30';
        return 'bg-red-100 dark:bg-red-900/30';
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                📊 CV Quality Score
            </h3>

            {/* Overall Score */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Overall Score
                    </span>
                    <span className={`text-2xl font-bold ${getScoreColor(score.overall)}`}>
                        {score.overall}/100
                    </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div
                        className={`h-3 rounded-full transition-all duration-500 ${score.overall >= 80
                                ? 'bg-green-600'
                                : score.overall >= 60
                                    ? 'bg-yellow-600'
                                    : 'bg-red-600'
                            }`}
                        style={{ width: `${score.overall}%` }}
                    />
                </div>
            </div>

            {/* Detailed Scores */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className={`p-3 rounded-lg ${getScoreBgColor(score.completeness)}`}>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Completeness
                    </div>
                    <div className={`text-xl font-bold ${getScoreColor(score.completeness)}`}>
                        {score.completeness}%
                    </div>
                </div>
                <div className={`p-3 rounded-lg ${getScoreBgColor(score.quality)}`}>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Quality</div>
                    <div className={`text-xl font-bold ${getScoreColor(score.quality)}`}>
                        {score.quality}%
                    </div>
                </div>
            </div>

            {/* Suggestions */}
            {score.suggestions.length > 0 && (
                <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">
                        💡 Suggestions to Improve
                    </h4>
                    <ul className="space-y-2">
                        {score.suggestions.map((suggestion, idx) => (
                            <li
                                key={idx}
                                className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2"
                            >
                                <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                                <span>{suggestion}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {score.overall >= 80 && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-sm text-green-700 dark:text-green-300 font-semibold">
                        🎉 Excellent! Your CV is ready to impress employers.
                    </p>
                </div>
            )}
        </div>
    );
};

export default CVScoreCard;
