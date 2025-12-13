/**
 * QuadrantGrid Component
 * 
 * Displays all 6 behavioral quadrants in a responsive grid layout.
 */

import { QuadrantResult } from '../../utils/quadrantComputation';
import QuadrantCard from './QuadrantCard';

interface QuadrantGridProps {
    results: QuadrantResult[];
}

const QuadrantGrid = ({ results }: QuadrantGridProps) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <span className="w-2 h-6 bg-purple-500 rounded-full" />
                Behavioral Patterns
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                How your personality traits manifest in different work contexts
            </p>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((result) => (
                    <QuadrantCard key={result.quadrantName} result={result} />
                ))}
            </div>

            {/* Methodology Note */}
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    <strong>Note:</strong> These behavioral patterns are derived from your Big Five personality scores
                    using heuristic mapping formulas based on established psychological research. The percentages
                    represent the relative strength of each behavioral tendency within each category.
                </p>
            </div>
        </div>
    );
};

export default QuadrantGrid;
