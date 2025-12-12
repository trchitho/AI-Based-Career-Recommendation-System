/**
 * RIASECSection Component
 * 
 * Displays RIASEC scores with visualization and interpretation.
 */

import { RIASECScores } from '../../types/results';
import { RIASECPatternResult } from '../../utils/riasecPattern';
import { getRIASECFullName } from '../../utils/riasec';
import reportConfig from '../../config/reportConfig.json';

interface RIASECSectionProps {
    scores: RIASECScores;
    pattern: RIASECPatternResult;
}

const DIMENSION_COLORS: Record<string, string> = {
    realistic: 'bg-amber-500',
    investigative: 'bg-blue-500',
    artistic: 'bg-purple-500',
    social: 'bg-green-500',
    enterprising: 'bg-red-500',
    conventional: 'bg-gray-500',
};

const RIASECSection = ({ scores, pattern }: RIASECSectionProps) => {
    const sortedScores = pattern.sortedScores;
    const topKeys = pattern.topKeys;

    const getDescription = (key: string, score: number) => {
        const descriptions = reportConfig.traitDescriptions.riasec[key as keyof typeof reportConfig.traitDescriptions.riasec];
        if (!descriptions) return '';
        return score >= 50 ? descriptions.high : descriptions.low;
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <span className="w-2 h-6 bg-amber-500 rounded-full" />
                RIASEC Interest Profile
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                Your career interests based on Holland's RIASEC model
            </p>

            {/* Pattern Display */}
            <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Your Interest Pattern</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {pattern.fullPattern}
                    <span className="ml-2 text-lg text-gray-400">({pattern.shortPattern})</span>
                </p>
            </div>

            {/* Score Bars */}
            <div className="space-y-4 mb-8">
                {sortedScores.map(({ key, score }) => {
                    const isTop = topKeys.includes(key);
                    const colorClass = DIMENSION_COLORS[key] || 'bg-gray-500';

                    return (
                        <div key={key} className={`${isTop ? 'opacity-100' : 'opacity-70'}`}>
                            <div className="flex justify-between items-center mb-1">
                                <span className={`font-semibold ${isTop ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                                    {getRIASECFullName(key)}
                                    {isTop && (
                                        <span className="ml-2 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
                                            Top Interest
                                        </span>
                                    )}
                                </span>
                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                    {Math.round(score)}%
                                </span>
                            </div>
                            <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${colorClass} rounded-full transition-all duration-500`}
                                    style={{ width: `${score}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Top Interests Interpretation */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Your Top Interests Explained
                </h3>
                {topKeys.slice(0, 2).map((key) => {
                    const score = scores[key as keyof RIASECScores];
                    const description = getDescription(key, score);

                    return (
                        <div key={key} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                                {getRIASECFullName(key)}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {description}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default RIASECSection;
