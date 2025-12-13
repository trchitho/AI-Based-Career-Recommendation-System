/**
 * EnvironmentFit Component
 * 
 * Displays work environment recommendations based on personality traits.
 */

interface EnvironmentFitProps {
    thrivesIn: string[];
    mayStruggleWith: string[];
}

const EnvironmentFit = ({ thrivesIn, mayStruggleWith }: EnvironmentFitProps) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <span className="w-2 h-6 bg-teal-500 rounded-full" />
                Ideal Work Environment
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                Understanding your ideal work environment helps you make better career decisions
            </p>

            <div className="grid gap-6 sm:grid-cols-2">
                {/* Thrives In */}
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-5 border border-green-100 dark:border-green-800/30">
                    <h3 className="font-semibold text-green-700 dark:text-green-400 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        You Thrive In
                    </h3>
                    <ul className="space-y-3">
                        {thrivesIn.map((item, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                                <span className="text-green-500 mt-1">•</span>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* May Struggle With */}
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-5 border border-amber-100 dark:border-amber-800/30">
                    <h3 className="font-semibold text-amber-700 dark:text-amber-400 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        May Be Challenging
                    </h3>
                    <ul className="space-y-3">
                        {mayStruggleWith.map((item, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                                <span className="text-amber-500 mt-1">•</span>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default EnvironmentFit;
