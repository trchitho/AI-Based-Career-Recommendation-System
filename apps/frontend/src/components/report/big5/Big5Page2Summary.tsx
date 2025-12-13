/**
 * Big5Page2Summary - Page 2: Behavioral Patterns Summary
 * 
 * Shows 6 behavioral pattern cards (summary only, no charts)
 * Charts are displayed on pages 3-5
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

const Big5Page2Summary = ({ narrative, facets }: Big5Page2SummaryProps) => {
    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Section A: Your Career Personality Type */}
            <section className="mb-5 print:mb-4 flex-shrink-0">
                <h2 className="text-xl font-extrabold text-gray-900 dark:text-white mb-1.5 print:text-lg">
                    Your Career Personality Type
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-3 italic text-xs print:text-[10px]">
                    What motivates you? How do you approach work and relationships?
                </p>

                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-purple-100 dark:border-purple-800/30 print:p-3">
                    <h3 className="text-xl font-extrabold text-purple-700 dark:text-purple-400 mb-2 print:text-lg">
                        {narrative.type_name}
                    </h3>
                    <div className="space-y-2 text-gray-700 dark:text-gray-300 leading-relaxed text-xs print:text-[10px] print:space-y-1.5">
                        {narrative.paragraphs.map((paragraph, index) => (
                            <p key={index}>{paragraph}</p>
                        ))}
                    </div>
                </div>
            </section>

            {/* Section B: Behavioral Patterns Overview */}
            <section className="flex-1 flex flex-col overflow-hidden">
                <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1.5 print:text-sm flex-shrink-0">
                    Behavioral Patterns
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-3 text-xs print:text-[10px] print:mb-2 flex-shrink-0">
                    Your personality manifests in six key behavioral areas. Each area shows your dominant style
                    based on the Big Five personality dimensions.
                </p>

                {/* 6 Summary Cards - 2x3 Grid */}
                <div className="grid grid-cols-3 gap-2 print:gap-1.5 flex-shrink-0">
                    {facets.map((facet) => (
                        <div
                            key={facet.name}
                            className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 shadow-sm print:p-2 print:shadow-none"
                        >
                            <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5 print:text-[8px]">
                                {FACET_DISPLAY_NAMES[facet.name] || facet.title.replace('How you ', '')}
                            </p>
                            <p className="text-base font-bold text-purple-600 dark:text-purple-400 capitalize print:text-sm">
                                {facet.dominant}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 print:text-[10px]">
                                {facet.dominant_percent}%
                            </p>
                        </div>
                    ))}
                </div>

                {/* Note */}
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-3 italic print:mt-2 print:text-[8px] flex-shrink-0">
                    Note: These behavioral patterns are derived from your Big Five personality scores using
                    heuristic mapping formulas based on established psychological research. Detailed charts
                    and descriptions follow on the next pages.
                </p>
            </section>
        </div>
    );
};

export default Big5Page2Summary;
