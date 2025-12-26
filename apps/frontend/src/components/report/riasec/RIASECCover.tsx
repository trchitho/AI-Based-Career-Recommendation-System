/**
 * RIASECCover - Cover page for RIASEC report
 * 
 * Features:
 * - Full-width header with gradient (green theme)
 * - User name on same line (no wrap)
 * - Academic-quality intro paragraphs
 * - Synchronized layout with Big5 cover
 */

import { CoverData } from '../../../services/reportService';

interface RIASECCoverProps {
    cover: CoverData;
}

const RIASECCover = ({ cover }: RIASECCoverProps) => {
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
            <div className="bg-gradient-to-r from-green-600 to-teal-700 text-white px-10 py-6 -mx-10 -mt-10 mb-6 print:-mx-[15mm] print:-mt-[15mm] print:px-[15mm] print:py-5 print:mb-4">
                {/* Title Row */}
                <h1 className="text-2xl font-extrabold mb-2 print:text-xl">
                    {cover.title}
                </h1>
                {cover.subtitle && (
                    <p className="text-green-100 text-base print:text-sm mb-3">
                        {cover.subtitle}
                    </p>
                )}

                {/* User Info Row - Full width, flex wrap for safety */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-green-500/30 pt-3 mt-2">
                    {cover.user_name && (
                        <p className="font-semibold uppercase tracking-wide text-base print:text-sm">
                            Results for: {cover.user_name}
                        </p>
                    )}
                    {cover.completed_at && (
                        <p className="text-green-100 text-base print:text-sm">
                            {formatDate(cover.completed_at)}
                        </p>
                    )}
                </div>
            </div>

            {/* Intro Content */}
            <div className="flex-1 flex flex-col">
                <div className="space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed print:space-y-3">
                    {cover.intro_paragraphs.map((paragraph, index) => (
                        <p key={index} className="text-base print:text-sm">
                            {paragraph}
                        </p>
                    ))}
                </div>

                {/* What's Inside Section */}
                <div className="mt-6 print:mt-4">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3 print:text-sm">
                        What's Inside This Report
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm print:text-xs print:gap-2">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                            <span className="text-gray-600 dark:text-gray-400">Your Interest Pattern</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                            <span className="text-gray-600 dark:text-gray-400">6 RIASEC Dimensions</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                            <span className="text-gray-600 dark:text-gray-400">Top Career Interests</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                            <span className="text-gray-600 dark:text-gray-400">Interest Interpretations</span>
                        </div>
                    </div>
                </div>

                {/* Decorative Element */}
                <div className="mt-8 flex justify-center print:mt-6">
                    <div className="w-16 h-0.5 bg-gradient-to-r from-green-500 to-teal-500 rounded-full" />
                </div>
            </div>

            {/* Footer */}
            <div className="mt-auto pt-4 print:pt-2">
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center print:text-[10px]">
                    Based on Holland's RIASEC career interest model
                </p>
            </div>
        </div>
    );
};

export default RIASECCover;
