/**
 * BigFiveSection Component
 * 
 * Displays Big Five personality scores with visualization and interpretation.
 */

import { BigFiveScores } from '../../types/results';
import { getPercentileLabel } from '../../utils/quadrantComputation';
import reportConfig from '../../config/reportConfig.json';

interface BigFiveSectionProps {
    scores: BigFiveScores;
}

const TRAIT_COLORS: Record<string, { bar: string; bg: string }> = {
    openness: { bar: 'bg-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    conscientiousness: { bar: 'bg-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    extraversion: { bar: 'bg-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    agreeableness: { bar: 'bg-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
    neuroticism: { bar: 'bg-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
};

const TRAIT_ORDER: (keyof BigFiveScores)[] = [
    'openness',
    'conscientiousness',
    'extraversion',
    'agreeableness',
    'neuroticism',
];

const BigFiveSection = ({ scores }: BigFiveSectionProps) => {
    const getDescription = (trait: string, score: number) => {
        const descriptions = reportConfig.traitDescriptions.bigFive[trait as keyof typeof reportConfig.traitDescriptions.bigFive];
        if (!descriptions) return '';
        return score >= 50 ? descriptions.high : descriptions.low;
    };

    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <span className="w-2 h-6 bg-blue-500 rounded-full" />
                Big Five Personality Profile
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                Your personality traits based on the OCEAN model
            </p>

            {/* Score Visualization */}
            <div className="space-y-6 mb-8">
                {TRAIT_ORDER.map((trait) => {
                    const score = scores[trait];
                    const { label } = getPercentileLabel(score);
                    const colors = TRAIT_COLORS[trait];

                    return (
                        <div key={trait}>
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-semibold text-gray-900 dark:text-white">
                                    {capitalize(trait)}
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${label === 'High'
                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                        : label === 'Low'
                                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                        }`}>
                                        {label}
                                    </span>
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-12 text-right">
                                        {Math.round(score)}%
                                    </span>
                                </div>
                            </div>

                            {/* Score Bar with Scale */}
                            <div className="relative">
                                <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${colors?.bar || 'bg-gray-500'} rounded-full transition-all duration-500`}
                                        style={{ width: `${score}%` }}
                                    />
                                </div>
                                {/* Scale markers */}
                                <div className="flex justify-between text-xs text-gray-400 mt-1">
                                    <span>Low</span>
                                    <span>Average</span>
                                    <span>High</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Trait Interpretations */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    What Your Scores Mean
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                    {TRAIT_ORDER.map((trait) => {
                        const score = scores[trait];
                        const description = getDescription(trait, score);
                        const colors = TRAIT_COLORS[trait];

                        return (
                            <div key={trait} className={`p-4 rounded-xl ${colors?.bg || 'bg-gray-50 dark:bg-gray-900/20'}`}>
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${colors?.bar || 'bg-gray-500'}`} />
                                    {capitalize(trait)}
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {description}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default BigFiveSection;
