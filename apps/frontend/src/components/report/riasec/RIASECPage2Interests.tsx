/**
 * RIASECPage2Interests - Your Career Interests page
 * 
 * Shows horizontal bar chart + 6 interest area descriptions
 * Based on Truity Career Personality Profiler format
 */

import { ScoreItem } from '../../../services/reportService';

interface RIASECPage2InterestsProps {
    scores: ScoreItem[];
}

// RIASEC display names mapping to Truity style
const INTEREST_NAMES: Record<string, string> = {
    realistic: 'Building',
    investigative: 'Thinking',
    artistic: 'Creating',
    social: 'Helping',
    enterprising: 'Persuading',
    conventional: 'Organizing',
};

// Full descriptions for each interest area
const INTEREST_DESCRIPTIONS: Record<string, string> = {
    realistic: 'Building jobs involve the use of tools, machines, or physical skill. Builders like working with their hands and bodies, working with plants and animals, and working outdoors.',
    investigative: 'Thinking jobs involve theory, research, and intellectual inquiry. Thinkers like working with ideas and concepts, and enjoy science, technology, and academia.',
    artistic: 'Creating jobs involve art, design, language, and self-expression. Creators like working in unstructured environments and producing something unique.',
    social: 'Helping jobs involve assisting, teaching, coaching, and serving other people. Helpers like working in cooperative environments to improve the lives of others.',
    enterprising: 'Persuading jobs involve leading, motivating, and influencing others. Persuaders like working in positions of power to make decisions and carry out projects.',
    conventional: 'Organizing jobs involve managing data, information, and processes. Organizers like to work in structured environments to complete tasks with precision and accuracy.',
};

const BAR_COLORS: Record<string, string> = {
    realistic: 'bg-amber-600',
    investigative: 'bg-blue-600',
    artistic: 'bg-purple-600',
    social: 'bg-green-600',
    enterprising: 'bg-red-600',
    conventional: 'bg-gray-600',
};

const RIASECPage2Interests = ({ scores }: RIASECPage2InterestsProps) => {
    // Sort by score descending for bar chart
    const sortedScores = [...scores].sort((a, b) => b.score - a.score);

    // Fixed order for descriptions (RIASEC order mapped to Truity names)
    const orderedTraits = ['realistic', 'investigative', 'artistic', 'social', 'enterprising', 'conventional'];

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Page Title */}
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-3 print:text-2xl">
                Your Career Interests
            </h2>
            <p className="text-base text-gray-600 dark:text-gray-400 mb-6 print:text-sm print:mb-4">
                This section shows your top career interest areas. There are 6 total interest areas, each with its own set of typical work tasks, roles, and values. Choosing a career which is a good match for your interest profile ensures that you enjoy your daily work.
            </p>

            {/* Horizontal Bar Chart */}
            <div className="mb-8 print:mb-6">
                <div className="space-y-3 print:space-y-2">
                    {sortedScores.map((item) => {
                        const traitKey = item.trait.toLowerCase();
                        const displayName = INTEREST_NAMES[traitKey] || item.trait;
                        const barColor = BAR_COLORS[traitKey] || 'bg-gray-500';
                        const scoreValue = Math.round(item.score);

                        return (
                            <div key={item.trait} className="flex items-center gap-4">
                                <span className="w-24 text-sm font-semibold text-gray-700 dark:text-gray-300 text-right print:text-xs print:w-20">
                                    {displayName}
                                </span>
                                <div className="flex-1 h-7 bg-gray-100 dark:bg-gray-700 rounded print:h-5">
                                    <div
                                        className={`h-full ${barColor} rounded flex items-center justify-end pr-3`}
                                        style={{ width: `${scoreValue}%` }}
                                    >
                                        {scoreValue > 15 && (
                                            <span className="text-sm font-bold text-white print:text-xs">
                                                {scoreValue}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {scoreValue <= 15 && (
                                    <span className="text-sm font-medium text-gray-500 print:text-xs w-8">
                                        {scoreValue}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
                {/* Scale */}
                <div className="flex justify-end mt-2 text-xs text-gray-400 print:text-[10px]">
                    <span>0</span>
                    <span className="ml-auto mr-0">100</span>
                </div>
            </div>

            {/* The Six Interest Areas */}
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 print:text-lg">
                The Six Interest Areas
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 print:text-xs print:mb-3">
                Each of the six interest areas describes a cluster of related work tasks and activities. People who are drawn to each of these interest areas tend to have certain characteristics, preferences, and personality traits in common.
            </p>

            {/* Interest Descriptions Grid */}
            <div className="grid grid-cols-1 gap-3 print:gap-2 flex-1 overflow-auto">
                {orderedTraits.map((traitKey) => {
                    const displayName = INTEREST_NAMES[traitKey] || traitKey;
                    const description = INTEREST_DESCRIPTIONS[traitKey] || '';

                    return (
                        <div key={traitKey} className="flex gap-4 print:gap-3">
                            <span className="font-bold text-base text-gray-900 dark:text-white w-24 flex-shrink-0 print:text-sm print:w-20">
                                {displayName}
                            </span>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed print:text-xs">
                                {description}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default RIASECPage2Interests;
