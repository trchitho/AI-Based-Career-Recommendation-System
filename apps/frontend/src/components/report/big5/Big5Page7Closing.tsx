/**
 * Big5Page7Closing - Page 7: Closing / Summary
 * 
 * Concise closing with key takeaways
 */

const Big5Page7Closing = () => {
    return (
        <div className="h-full flex flex-col justify-center overflow-hidden">
            {/* Main Content - Centered */}
            <div className="text-center max-w-2xl mx-auto">
                {/* Icon */}
                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-5 print:w-14 print:h-14 print:mb-4">
                    <svg className="w-8 h-8 text-purple-600 dark:text-purple-400 print:w-7 print:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-5 print:text-xl print:mb-4">
                    Conclusion & Next Steps
                </h2>

                {/* Content Paragraphs - Shortened */}
                <div className="space-y-4 text-gray-600 dark:text-gray-400 leading-relaxed text-left print:space-y-3">
                    <p className="text-sm print:text-xs">
                        This report analyzes your personality using the Big Five model (OCEAN).
                        The six behavioral patterns show how your traits manifest in workplace contexts.
                    </p>

                    <p className="text-sm print:text-xs">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">Self-awareness</span> enables
                        better career decisions. Use these insights to identify roles that leverage your
                        strengths and develop strategies for growth areas.
                    </p>

                    <p className="text-sm print:text-xs">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">Career alignment</span> occurs
                        when your work environment matches your personality. Evaluate opportunities based on
                        how well they fit your natural tendencies.
                    </p>

                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 print:text-xs">
                        Personality assessments are tools for reflection, not predictions. Combine these
                        insights with experience and continuous learning.
                    </p>
                </div>

                {/* Decorative Divider */}
                <div className="mt-8 flex justify-center print:mt-6">
                    <div className="w-24 h-0.5 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full" />
                </div>
            </div>

            {/* Footer - Methodology Note - Shortened */}
            <div className="mt-auto pt-8 print:pt-6">
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 print:pt-3">
                    <p className="text-xs text-gray-400 dark:text-gray-500 text-center print:text-[10px]">
                        Generated using the Big Five personality model (OCEAN) with heuristic behavioral mapping
                        based on established psychological research.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Big5Page7Closing;
