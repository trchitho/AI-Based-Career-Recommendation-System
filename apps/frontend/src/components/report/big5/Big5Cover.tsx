/**
 * Big5Cover - Cover page for Big Five report
 * 
 * Features:
 * - Full-width header with gradient
 * - User name on same line (no wrap)
 * - Academic-quality intro paragraphs
 * - Synchronized layout with RIASEC cover
 */

import { CoverData } from '../../../services/reportService';

interface Big5CoverProps {
    cover: CoverData;
}

const Big5Cover = ({ cover }: Big5CoverProps) => {
    const formatDate = (dateString?: string) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header Banner - Full width with negative margins to extend to edges */}
            <div className="bg-gradient-to-r from-purple-700 to-indigo-800 text-white px-10 py-5 -mx-10 -mt-10 mb-6 print:-mx-[15mm] print:-mt-[15mm] print:px-[15mm] print:py-4 print:mb-4">
                {/* Title Row */}
                <h1 className="text-xl font-extrabold mb-1 print:text-lg">
                    {cover.title}
                </h1>
                {cover.subtitle && (
                    <p className="text-purple-200 text-sm print:text-xs mb-3">
                        {cover.subtitle}
                    </p>
                )}

                {/* User Info Row - Full width, flex wrap for safety */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-purple-500/30 pt-3 mt-2">
                    {cover.user_name && (
                        <p className="font-semibold uppercase tracking-wide text-sm print:text-xs">
                            Results for: {cover.user_name}
                        </p>
                    )}
                    {cover.completed_at && (
                        <p className="text-purple-200 text-sm print:text-xs">
                            {formatDate(cover.completed_at)}
                        </p>
                    )}
                </div>
            </div>

            {/* Intro Content */}
            <div className="flex-1 flex flex-col">
                <div className="space-y-3 text-gray-700 dark:text-gray-300 leading-relaxed print:space-y-2">
                    {cover.intro_paragraphs.map((paragraph, index) => (
                        <p key={index} className="text-sm print:text-xs">
                            {paragraph}
                        </p>
                    ))}
                </div>

                {/* What's Inside Section */}
                <div className="mt-6 print:mt-4">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2 print:text-xs">
                        What's Inside This Report
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-xs print:text-[10px] print:gap-1.5">
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full flex-shrink-0" />
                            <span className="text-gray-600 dark:text-gray-400">Your Career Personality Type</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full flex-shrink-0" />
                            <span className="text-gray-600 dark:text-gray-400">6 Behavioral Patterns</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full flex-shrink-0" />
                            <span className="text-gray-600 dark:text-gray-400">Personal Strengths</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full flex-shrink-0" />
                            <span className="text-gray-600 dark:text-gray-400">Potential Challenges</span>
                        </div>
                    </div>
                </div>

                {/* Decorative Element */}
                <div className="mt-8 flex justify-center print:mt-6">
                    <div className="w-16 h-0.5 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full" />
                </div>
            </div>

            {/* Footer */}
            <div className="mt-auto pt-4 print:pt-2">
                <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center print:text-[8px]">
                    Based on the Big Five (OCEAN) personality model
                </p>
            </div>
        </div>
    );
};

export default Big5Cover;
