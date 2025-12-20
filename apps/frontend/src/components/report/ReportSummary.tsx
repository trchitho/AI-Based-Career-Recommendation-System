/**
 * ReportSummary Component
 * 
 * Displays the summary section of the personality report with
 * RIASEC pattern and Big Five pattern badges.
 */

import { RIASECPatternResult } from '../../utils/riasecPattern';

interface ReportSummaryProps {
    summaryStatement: string;
    riasecPattern: RIASECPatternResult;
    bigFivePattern: string;
}

const ReportSummary = ({ summaryStatement, riasecPattern, bigFivePattern }: ReportSummaryProps) => {
    return (
        <div className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 rounded-2xl p-8 border border-green-100 dark:border-green-800/30">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-6 bg-green-500 rounded-full" />
                Summary
            </h2>

            <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
                {summaryStatement}
            </p>

            <div className="flex flex-wrap gap-3">
                {/* RIASEC Pattern Badge */}
                <div className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Interest Type
                    </span>
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">
                        {riasecPattern.shortPattern}
                    </span>
                </div>

                {/* Big Five Pattern Badge */}
                <div className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Personality
                    </span>
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {bigFivePattern}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ReportSummary;
