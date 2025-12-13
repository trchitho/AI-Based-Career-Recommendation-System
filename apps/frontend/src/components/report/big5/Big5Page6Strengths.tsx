/**
 * Big5Page6Strengths - Page 6: Strengths & Potential Challenges
 * 
 * Truity-style presentation:
 * - Detailed paragraphs (not short bullets)
 * - Derived from 6 behavioral facets
 * - Professional academic language
 * - Note on Development section
 */

interface Big5Page6StrengthsProps {
    strengths: string[];
    challenges: string[];
}

const Big5Page6Strengths = ({ strengths, challenges }: Big5Page6StrengthsProps) => {
    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Page Header */}
            <div className="mb-4 print:mb-3 flex-shrink-0">
                <h2 className="text-xl font-extrabold text-gray-900 dark:text-white print:text-lg">
                    Strengths & Potential Challenges
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 print:text-[10px]">
                    Based on your behavioral patterns across all six dimensions
                </p>
            </div>

            {/* Content Container */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Strengths Section */}
                <section className="mb-4 print:mb-3 flex-shrink-0">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-1.5 print:text-xs print:mb-1.5">
                        <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 print:w-4 print:h-4">
                            <svg className="w-3 h-3 text-white print:w-2.5 print:h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </span>
                        Your Personal Strengths
                    </h3>

                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-100 dark:border-green-800/30 print:p-2">
                        <div className="space-y-1.5 text-gray-700 dark:text-gray-300 leading-relaxed text-xs print:text-[9px] print:space-y-1">
                            {strengths.map((strength, index) => (
                                <p key={index}>
                                    <span className="font-semibold text-green-700 dark:text-green-400">
                                        {index + 1}.
                                    </span>{' '}
                                    {strength}
                                </p>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Challenges Section */}
                <section className="mb-3 print:mb-2 flex-shrink-0">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-1.5 print:text-xs print:mb-1.5">
                        <span className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 print:w-4 print:h-4">
                            <svg className="w-3 h-3 text-white print:w-2.5 print:h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </span>
                        Potential Challenges
                    </h3>

                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-100 dark:border-amber-800/30 print:p-2">
                        <div className="space-y-1.5 text-gray-700 dark:text-gray-300 leading-relaxed text-xs print:text-[9px] print:space-y-1">
                            {challenges.map((challenge, index) => (
                                <p key={index}>
                                    <span className="font-semibold text-amber-700 dark:text-amber-400">
                                        {index + 1}.
                                    </span>{' '}
                                    {challenge}
                                </p>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Note on Development */}
                <div className="mt-auto p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 print:p-2 flex-shrink-0">
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed print:text-[9px]">
                        <span className="font-semibold">Note on Development:</span> These challenges represent
                        areas where conscious effort may be beneficial, not fixed limitations. Research in
                        personality psychology suggests that while core traits remain relatively stable,
                        behavioral patterns can be adapted through awareness and intentional practice.
                        Consider these insights as starting points for personal and professional growth.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Big5Page6Strengths;
