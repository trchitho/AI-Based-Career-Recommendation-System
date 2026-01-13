/**
 * Big5Page6Strengths - Page 6: Strengths & Potential Challenges
 * 
 * Truity-style presentation:
 * - Detailed paragraphs (not short bullets)
 * - Derived from 6 behavioral facets
 * - Professional academic language
 * - Note on Development section
 * - LARGER font sizes for better readability as conclusion section
 */

interface Big5Page6StrengthsProps {
    strengths: string[];
    challenges: string[];
}

const Big5Page6Strengths = ({ strengths, challenges }: Big5Page6StrengthsProps) => {
    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Page Header - Larger for conclusion section */}
            <div className="mb-5 print:mb-4 flex-shrink-0">
                <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white print:text-xl">
                    Strengths & Potential Challenges
                </h2>
                <p className="text-base text-gray-500 dark:text-gray-400 print:text-sm">
                    Based on your behavioral patterns across all six dimensions
                </p>
            </div>

            {/* Content Container */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Strengths Section */}
                <section className="mb-5 print:mb-4 flex-shrink-0">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2 print:text-base print:mb-2">
                        <span className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 print:w-5 print:h-5">
                            <svg className="w-4 h-4 text-white print:w-3 print:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </span>
                        Your Personal Strengths
                    </h3>

                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-100 dark:border-green-800/30 print:p-3">
                        <div className="space-y-3 text-gray-700 dark:text-gray-300 leading-relaxed text-base print:text-sm print:space-y-2">
                            {strengths.map((strength, index) => (
                                <p key={index}>
                                    <span className="font-bold text-green-700 dark:text-green-400">
                                        {index + 1}.
                                    </span>{' '}
                                    {strength}
                                </p>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Challenges Section */}
                <section className="mb-4 print:mb-3 flex-shrink-0">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2 print:text-base print:mb-2">
                        <span className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 print:w-5 print:h-5">
                            <svg className="w-4 h-4 text-white print:w-3 print:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </span>
                        Potential Challenges
                    </h3>

                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-100 dark:border-amber-800/30 print:p-3">
                        <div className="space-y-3 text-gray-700 dark:text-gray-300 leading-relaxed text-base print:text-sm print:space-y-2">
                            {challenges.map((challenge, index) => (
                                <p key={index}>
                                    <span className="font-bold text-amber-700 dark:text-amber-400">
                                        {index + 1}.
                                    </span>{' '}
                                    {challenge}
                                </p>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Note on Development */}
                <div className="mt-auto p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 print:p-3 flex-shrink-0">
                    <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed print:text-sm">
                        <span className="font-bold">Note:</span> These challenges are growth opportunities,
                        not fixed limitations. While core traits remain stable, behavioral patterns can be
                        adapted through awareness and practice.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Big5Page6Strengths;
