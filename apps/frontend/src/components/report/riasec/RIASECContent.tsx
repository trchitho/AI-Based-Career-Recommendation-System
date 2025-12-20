/**
 * RIASECContent - RIASEC scores visualization and interpretation
 * 
 * Print-optimized layout matching Big5 style
 */

import { ScoreItem } from '../../../services/reportService';
import { getRIASECFullName } from '../../../utils/riasec';

interface RIASECContentProps {
    scores: ScoreItem[];
}

const DIMENSION_COLORS: Record<string, { bar: string; bg: string }> = {
    realistic: { bar: 'bg-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    investigative: { bar: 'bg-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    artistic: { bar: 'bg-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    social: { bar: 'bg-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
    enterprising: { bar: 'bg-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
    conventional: { bar: 'bg-gray-500', bg: 'bg-gray-50 dark:bg-gray-800/50' },
};

const DESCRIPTIONS: Record<string, { high: string; low: string }> = {
    realistic: {
        high: 'You prefer hands-on, practical work with tools, machines, or physical activities.',
        low: 'You may prefer conceptual or interpersonal tasks over physical work.',
    },
    investigative: {
        high: 'You enjoy analyzing problems, conducting research, and exploring ideas.',
        low: 'You may prefer practical application over theoretical exploration.',
    },
    artistic: {
        high: 'You value creativity, self-expression, and originality in your work.',
        low: 'You may prefer structured, predictable work over creative ambiguity.',
    },
    social: {
        high: 'You enjoy helping, teaching, and working with others.',
        low: 'You may prefer independent work over extensive social interaction.',
    },
    enterprising: {
        high: 'You are drawn to leadership, persuasion, and business ventures.',
        low: 'You may prefer collaborative or supportive roles over leadership.',
    },
    conventional: {
        high: 'You value organization, accuracy, and systematic approaches.',
        low: 'You may prefer flexibility and variety over routine and structure.',
    },
};

const RIASECContent = ({ scores }: RIASECContentProps) => {
    // Sort scores by value descending
    const sortedScores = [...scores].sort((a, b) => b.score - a.score);
    const topInterests = sortedScores.slice(0, 3);

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Pattern Summary */}
            <section className="mb-5 print:mb-4 flex-shrink-0">
                <h2 className="text-xl font-extrabold text-gray-900 dark:text-white mb-3 print:text-lg print:mb-2">
                    Your Interest Pattern
                </h2>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-100 dark:border-green-800/30 print:p-3">
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 print:text-xs print:mb-2">
                        Your top career interests are:
                    </p>
                    <div className="flex flex-wrap gap-2 print:gap-1.5">
                        {topInterests.map((item, index) => (
                            <span
                                key={item.trait}
                                className="px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-green-200 dark:border-green-800 print:px-2 print:py-1"
                            >
                                <span className="font-bold text-green-700 dark:text-green-400 text-sm print:text-xs">
                                    {index + 1}. {getRIASECFullName(item.trait)}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400 ml-1.5 text-xs print:text-[10px]">
                                    ({Math.round(item.score)}%)
                                </span>
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* Score Bars */}
            <section className="mb-5 print:mb-4 flex-shrink-0">
                <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3 print:text-sm print:mb-2">
                    RIASEC Scores
                </h2>
                <div className="space-y-2.5 print:space-y-2">
                    {sortedScores.map((item) => {
                        const colors = DIMENSION_COLORS[item.trait.toLowerCase()] || DIMENSION_COLORS['conventional'];
                        const isTop = topInterests.some(t => t.trait === item.trait);

                        return (
                            <div key={item.trait} className={isTop ? 'opacity-100' : 'opacity-70'}>
                                <div className="flex justify-between items-center mb-0.5">
                                    <span className={`font-semibold text-xs print:text-[10px] ${isTop ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                                        {getRIASECFullName(item.trait)}
                                        {isTop && (
                                            <span className="ml-1.5 text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full print:text-[8px]">
                                                Top
                                            </span>
                                        )}
                                    </span>
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 print:text-[10px]">
                                        {Math.round(item.score)}%
                                    </span>
                                </div>
                                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden print:h-1.5">
                                    <div
                                        className={`h-full ${colors?.bar || 'bg-gray-500'} rounded-full`}
                                        style={{ width: `${item.score}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Interpretations */}
            <section className="flex-1 overflow-hidden">
                <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3 print:text-sm print:mb-2 flex-shrink-0">
                    What Your Interests Mean
                </h2>
                <div className="grid gap-2 grid-cols-2 print:gap-1.5">
                    {sortedScores.slice(0, 4).map((item) => {
                        const colors = DIMENSION_COLORS[item.trait.toLowerCase()] || DIMENSION_COLORS['conventional'];
                        const desc = DESCRIPTIONS[item.trait.toLowerCase()];
                        const isHigh = item.score >= 50;

                        return (
                            <div key={item.trait} className={`p-3 rounded-lg print:p-2 ${colors?.bg || 'bg-gray-50'}`}>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-1 text-xs print:text-[10px]">
                                    {getRIASECFullName(item.trait)}
                                </h3>
                                <p className="text-[10px] text-gray-600 dark:text-gray-400 leading-snug print:text-[9px]">
                                    {isHigh ? desc?.high : desc?.low}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
};

export default RIASECContent;
