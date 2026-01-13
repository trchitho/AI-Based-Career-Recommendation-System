/**
 * Big5Page2Summary - Page 2: Behavioral Patterns Summary
 * 
 * Shows 6 behavioral pattern cards (summary only, no charts)
 * Charts are displayed on pages 3-5
 * 
 * FIXED: Each summary card uses the color of its dominant trait
 */

import { NarrativeData, Facet } from '../../../services/reportService';

interface Big5Page2SummaryProps {
    narrative: NarrativeData;
    facets: Facet[];
}

// Facet display names for cards
const FACET_DISPLAY_NAMES: Record<string, string> = {
    problemSolving: 'Think & Solve',
    motivation: 'Get Motivated',
    interaction: 'Interact',
    communication: 'Communicate',
    teamwork: 'Teamwork',
    taskManagement: 'Manage Tasks',
};

// Fixed color mapping by trait name - matches QuadrantChart and FacetSection
// Each trait has a fixed color regardless of percentage
const TRAIT_COLORS: Record<string, { text: string; border: string; bg: string }> = {
    // Problem-Solving facet labels
    innovator: { text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-300 dark:border-purple-700', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    humanitarian: { text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-300 dark:border-blue-700', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    caretaker: { text: 'text-green-600 dark:text-green-400', border: 'border-green-300 dark:border-green-700', bg: 'bg-green-50 dark:bg-green-900/20' },
    pragmatist: { text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-300 dark:border-amber-700', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    // Motivation facet labels
    ambitious: { text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-300 dark:border-purple-700', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    excitable: { text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-300 dark:border-blue-700', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    dutiful: { text: 'text-green-600 dark:text-green-400', border: 'border-green-300 dark:border-green-700', bg: 'bg-green-50 dark:bg-green-900/20' },
    casual: { text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-300 dark:border-amber-700', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    // Interaction facet labels
    gregarious: { text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-300 dark:border-purple-700', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    dominant: { text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-300 dark:border-blue-700', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    supportive: { text: 'text-green-600 dark:text-green-400', border: 'border-green-300 dark:border-green-700', bg: 'bg-green-50 dark:bg-green-900/20' },
    independent: { text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-300 dark:border-amber-700', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    // Communication facet labels
    inspiring: { text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-300 dark:border-purple-700', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    informative: { text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-300 dark:border-blue-700', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    insightful: { text: 'text-green-600 dark:text-green-400', border: 'border-green-300 dark:border-green-700', bg: 'bg-green-50 dark:bg-green-900/20' },
    concise: { text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-300 dark:border-amber-700', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    // Teamwork facet labels
    taskmaster: { text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-300 dark:border-purple-700', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    empath: { text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-300 dark:border-blue-700', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    improviser: { text: 'text-green-600 dark:text-green-400', border: 'border-green-300 dark:border-green-700', bg: 'bg-green-50 dark:bg-green-900/20' },
    cooperator: { text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-300 dark:border-amber-700', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    // Task Management facet labels
    director: { text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-300 dark:border-purple-700', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    visionary: { text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-300 dark:border-blue-700', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    inspector: { text: 'text-green-600 dark:text-green-400', border: 'border-green-300 dark:border-green-700', bg: 'bg-green-50 dark:bg-green-900/20' },
    responder: { text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-300 dark:border-amber-700', bg: 'bg-amber-50 dark:bg-amber-900/20' },
};

const DEFAULT_COLOR = { text: 'text-gray-600 dark:text-gray-400', border: 'border-gray-300 dark:border-gray-700', bg: 'bg-gray-50 dark:bg-gray-800/50' };

// Get color by dominant trait name
const getTraitColor = (traitName: string) => {
    const lowerName = traitName.toLowerCase();
    return TRAIT_COLORS[lowerName] || DEFAULT_COLOR;
};

const Big5Page2Summary = ({ narrative, facets }: Big5Page2SummaryProps) => {
    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Section A: Your Career Personality Type */}
            <section className="mb-5 print:mb-4 flex-shrink-0">
                <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2 print:text-xl">
                    Your Career Personality Type
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-3 italic text-sm print:text-xs">
                    What motivates you? How do you approach work and relationships?
                </p>

                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-purple-100 dark:border-purple-800/30 print:p-3">
                    <h3 className="text-2xl font-extrabold text-purple-700 dark:text-purple-400 mb-2 print:text-xl">
                        {narrative.type_name}
                    </h3>
                    <div className="space-y-2 text-gray-700 dark:text-gray-300 leading-relaxed text-sm print:text-xs print:space-y-1.5">
                        {narrative.paragraphs.map((paragraph, index) => (
                            <p key={index}>{paragraph}</p>
                        ))}
                    </div>
                </div>
            </section>

            {/* Section B: Behavioral Patterns Overview */}
            <section className="flex-1 flex flex-col overflow-hidden">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2 print:text-base flex-shrink-0">
                    Behavioral Patterns
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-3 text-sm print:text-xs print:mb-2 flex-shrink-0">
                    Your personality manifests in six key behavioral areas. Each area shows your dominant style
                    based on the Big Five personality dimensions.
                </p>

                {/* 6 Summary Cards - 2x3 Grid - Each card uses dominant trait's color */}
                <div className="grid grid-cols-3 gap-2 print:gap-1.5 flex-shrink-0">
                    {facets.map((facet) => {
                        const traitColor = getTraitColor(facet.dominant);
                        return (
                            <div
                                key={facet.name}
                                className={`rounded-lg p-3 border shadow-sm print:p-2 print:shadow-none ${traitColor.bg} ${traitColor.border}`}
                            >
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5 print:text-[10px]">
                                    {FACET_DISPLAY_NAMES[facet.name] || facet.title.replace('How you ', '')}
                                </p>
                                <p className={`text-lg font-bold capitalize print:text-base ${traitColor.text}`}>
                                    {facet.dominant}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 print:text-xs">
                                    {facet.dominant_percent}%
                                </p>
                            </div>
                        );
                    })}
                </div>

                {/* Note - Shortened */}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 italic print:mt-2 print:text-[10px] flex-shrink-0">
                    Note: These behavioral patterns are derived from your Big Five scores using
                    heuristic mapping formulas. Detailed charts follow on the next pages.
                </p>
            </section>
        </div>
    );
};

export default Big5Page2Summary;
