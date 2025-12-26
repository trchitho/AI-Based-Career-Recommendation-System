/**
 * RIASECPage8Closing - The Next Step / Closing page
 * 
 * Final page with encouragement and next steps
 * Based on Truity Career Personality Profiler format
 */

const RIASECPage8Closing = () => {
    return (
        <div className="h-full flex flex-col justify-center overflow-hidden">
            {/* Main Content - Centered */}
            <div className="text-center max-w-2xl mx-auto">
                {/* Icon */}
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-5 print:w-14 print:h-14 print:mb-4">
                    <svg className="w-8 h-8 text-green-600 dark:text-green-400 print:w-7 print:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-5 print:text-xl print:mb-4">
                    The Next Step
                </h2>

                {/* Content */}
                <div className="space-y-4 text-gray-600 dark:text-gray-400 leading-relaxed text-left print:space-y-3">
                    <p className="text-sm print:text-xs">
                        You've just made an excellent start to your career search process by exploring your interests, talents, preferences, and values. Give yourself a pat on the back!
                    </p>

                    <p className="text-sm print:text-xs">
                        Although choosing a career isn't an easy process, it can be an incredibly rewarding one when done right. By doing an objective assessment of who you are and what you are suited to, you've already gotten off to a huge head start.
                    </p>

                    <p className="text-sm print:text-xs">
                        You've digested a lot of information, so take a while to sit with it. When you're ready, come back to your list of careers and pick out the ones that sound most appealing. Use this as a jumping-off point to begin your own research.
                    </p>

                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 print:text-xs">
                        You have plenty of work ahead of you to find your ideal career, but you should now feel well prepared to get started. We wish you the best of luck in your search!
                    </p>
                </div>

                {/* Decorative Divider */}
                <div className="mt-8 flex justify-center print:mt-6">
                    <div className="w-24 h-0.5 bg-gradient-to-r from-green-500 to-teal-500 rounded-full" />
                </div>
            </div>

            {/* Footer */}
            <div className="mt-auto pt-8 print:pt-6">
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 print:pt-3">
                    <p className="text-xs text-gray-400 dark:text-gray-500 text-center print:text-[10px]">
                        Generated using Holland's RIASEC career interest model with AI-powered career matching.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RIASECPage8Closing;
