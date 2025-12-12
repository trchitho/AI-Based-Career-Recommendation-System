/**
 * CareerMatches Component
 * 
 * Displays top career recommendations with detailed explanations.
 */

import { Link } from 'react-router-dom';
import { CareerWithExplanation } from '../../hooks/useReportData';

interface CareerMatchesProps {
    careers: CareerWithExplanation[];
}

const CareerMatches = ({ careers }: CareerMatchesProps) => {
    if (careers.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <span className="w-2 h-6 bg-blue-500 rounded-full" />
                    Top Career Matches
                </h2>
                <p className="text-gray-500 dark:text-gray-400">
                    No career recommendations available at this time.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <span className="w-2 h-6 bg-blue-500 rounded-full" />
                Top Career Matches
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                Careers that align with your interests and personality
            </p>

            <div className="space-y-6">
                {careers.map((career, index) => {
                    const matchPercent = career.display_match ?? Math.round(career.match_score * 100);
                    const careerId = career.slug || career.career_id;

                    return (
                        <div
                            key={career.career_id}
                            className="border border-gray-100 dark:border-gray-700 rounded-xl p-6 hover:border-blue-200 dark:hover:border-blue-800 transition-colors"
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between gap-4 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                                        {index + 1}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                                            {career.title_en || career.career_id}
                                        </h3>
                                        {career.title_vi && (
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {career.title_vi}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Match Score */}
                                <div className="text-right">
                                    <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
                                        {matchPercent}%
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        Match
                                    </div>
                                </div>
                            </div>

                            {/* Tags */}
                            {career.tags && career.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {career.tags.map((tag, i) => (
                                        <span
                                            key={i}
                                            className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium rounded-lg"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Description */}
                            {career.description && (
                                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 leading-relaxed">
                                    {career.description}
                                </p>
                            )}

                            {/* Why This Matches */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
                                <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-2">
                                    Why This Matches You
                                </h4>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                    {career.whyMatch}
                                </p>
                            </div>

                            {/* Action Link */}
                            <Link
                                to={`/careers/${careerId}/roadmap`}
                                className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                            >
                                View Career Roadmap
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CareerMatches;
