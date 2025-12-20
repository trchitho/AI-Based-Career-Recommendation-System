/**
 * Big5Page7Closing - Page 7: Closing / Summary
 * 
 * Academic-quality closing:
 * - Summary of report value
 * - Self-awareness emphasis
 * - Career decision guidance
 * - Methodology footer
 */

const Big5Page7Closing = () => {
    return (
        <div className="h-full flex flex-col justify-center overflow-hidden">
            {/* Main Content - Centered */}
            <div className="text-center max-w-xl mx-auto">
                {/* Icon */}
                <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4 print:w-12 print:h-12 print:mb-3">
                    <svg className="w-7 h-7 text-purple-600 dark:text-purple-400 print:w-6 print:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>

                {/* Title */}
                <h2 className="text-xl font-extrabold text-gray-900 dark:text-white mb-4 print:text-lg print:mb-3">
                    Conclusion & Next Steps
                </h2>

                {/* Content Paragraphs */}
                <div className="space-y-3 text-gray-600 dark:text-gray-400 leading-relaxed text-left print:space-y-2">
                    <p className="text-xs print:text-[10px]">
                        This report provides a comprehensive analysis of your personality based on the
                        Big Five model, one of the most empirically validated frameworks in personality
                        psychology. The six behavioral patterns presented offer insights into how your
                        core personality traits manifest in workplace contexts.
                    </p>

                    <p className="text-xs print:text-[10px]">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">Self-awareness</span> is
                        the foundation of effective career decision-making. By understanding your natural
                        tendencies in problem-solving, motivation, interaction, communication, teamwork,
                        and task management, you can make more informed choices about career paths and
                        professional development opportunities.
                    </p>

                    <p className="text-xs print:text-[10px]">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">Career alignment</span> occurs
                        when your work environment matches your personality profile. Use the insights from
                        this report to evaluate potential career options, identify roles that leverage your
                        strengths, and develop strategies for areas that may require additional effort.
                    </p>

                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 print:text-[10px]">
                        Remember that personality assessments are tools for self-reflection, not definitive
                        predictions. Combine these insights with real-world experience, mentorship, and
                        continuous learning to navigate your career journey effectively.
                    </p>
                </div>

                {/* Decorative Divider */}
                <div className="mt-6 flex justify-center print:mt-4">
                    <div className="w-20 h-0.5 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full" />
                </div>
            </div>

            {/* Footer - Methodology Note */}
            <div className="mt-auto pt-6 print:pt-4">
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3 print:pt-2">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center print:text-[8px]">
                        Generated using the Big Five personality model (OCEAN) with heuristic behavioral mapping.
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-0.5 print:text-[8px]">
                        Behavioral patterns derived from trait combinations based on established psychological research.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Big5Page7Closing;
