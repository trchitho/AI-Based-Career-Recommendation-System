/**
 * QuadrantCard Component
 * 
 * Displays a single behavioral quadrant with its 4 labels and percentages.
 */

import { QuadrantResult } from '../../utils/quadrantComputation';

interface QuadrantCardProps {
    result: QuadrantResult;
}

const QUADRANT_COLORS: Record<string, { primary: string; bg: string; border: string }> = {
    problemSolving: {
        primary: 'text-purple-600 dark:text-purple-400',
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        border: 'border-purple-200 dark:border-purple-800/30',
    },
    motivation: {
        primary: 'text-orange-600 dark:text-orange-400',
        bg: 'bg-orange-50 dark:bg-orange-900/20',
        border: 'border-orange-200 dark:border-orange-800/30',
    },
    interaction: {
        primary: 'text-green-600 dark:text-green-400',
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-200 dark:border-green-800/30',
    },
    communication: {
        primary: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-200 dark:border-blue-800/30',
    },
    teamwork: {
        primary: 'text-teal-600 dark:text-teal-400',
        bg: 'bg-teal-50 dark:bg-teal-900/20',
        border: 'border-teal-200 dark:border-teal-800/30',
    },
    taskManagement: {
        primary: 'text-indigo-600 dark:text-indigo-400',
        bg: 'bg-indigo-50 dark:bg-indigo-900/20',
        border: 'border-indigo-200 dark:border-indigo-800/30',
    },
};

const QuadrantCard = ({ result }: QuadrantCardProps) => {
    const colors = QUADRANT_COLORS[result.quadrantName] || QUADRANT_COLORS['problemSolving'];
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

    // Sort labels by score descending
    const sortedLabels = Object.entries(result.scores)
        .sort(([, a], [, b]) => b - a);

    return (
        <div className={`rounded-xl p-5 border ${colors?.bg || ''} ${colors?.border || ''}`}>
            <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-1">
                {result.title}
            </h3>

            {/* Primary Label */}
            <div className="mb-4">
                <span className={`text-2xl font-extrabold ${colors?.primary || ''}`}>
                    {capitalize(result.primary)}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                    {result.primaryScore}%
                </span>
            </div>

            {/* All Labels with Bars */}
            <div className="space-y-2">
                {sortedLabels.map(([label, score]) => {
                    const isPrimary = label === result.primary;

                    return (
                        <div key={label}>
                            <div className="flex justify-between items-center text-xs mb-0.5">
                                <span className={`${isPrimary ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                    {capitalize(label)}
                                </span>
                                <span className="text-gray-400">{score}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-300 ${isPrimary
                                        ? 'bg-gradient-to-r from-gray-700 to-gray-900 dark:from-gray-300 dark:to-white'
                                        : 'bg-gray-400 dark:bg-gray-500'
                                        }`}
                                    style={{ width: `${score}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Description */}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 leading-relaxed">
                {result.primaryDescription}
            </p>
        </div>
    );
};

export default QuadrantCard;
