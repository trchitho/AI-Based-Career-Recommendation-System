/**
 * StrengthsList Component
 * 
 * Displays the user's key strengths derived from their personality profile.
 */

interface StrengthsListProps {
    strengths: string[];
}

const StrengthsList = ({ strengths }: StrengthsListProps) => {
    return (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-8 border border-green-100 dark:border-green-800/30">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <span className="w-2 h-6 bg-green-500 rounded-full" />
                Your Strengths
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                Key strengths based on your personality profile
            </p>

            <ul className="space-y-4">
                {strengths.map((strength, index) => (
                    <li key={index} className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mt-0.5">
                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <span className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            {strength}
                        </span>
                    </li>
                ))}
            </ul>

            <div className="mt-6 p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong className="text-green-600 dark:text-green-400">Tip:</strong> Leverage these strengths
                    in your career by seeking roles and projects that allow you to apply them regularly.
                </p>
            </div>
        </div>
    );
};

export default StrengthsList;
