/**
 * DevelopmentSection Component
 * 
 * Displays personalized development recommendations.
 */

interface DevelopmentSectionProps {
    recommendations: string[];
}

const DevelopmentSection = ({ recommendations }: DevelopmentSectionProps) => {
    return (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-8 border border-indigo-100 dark:border-indigo-800/30">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <span className="w-2 h-6 bg-indigo-500 rounded-full" />
                Development Recommendations
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                Areas for growth based on your personality profile
            </p>

            <div className="space-y-4">
                {recommendations.map((recommendation, index) => (
                    <div
                        key={index}
                        className="flex items-start gap-4 bg-white/60 dark:bg-gray-800/60 rounded-xl p-4"
                    >
                        <div className="flex-shrink-0 w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                            {index + 1}
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed pt-1">
                            {recommendation}
                        </p>
                    </div>
                ))}
            </div>

            <div className="mt-6 p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong className="text-indigo-600 dark:text-indigo-400">Remember:</strong> These recommendations
                    are meant to complement your existing strengths, not replace them. Focus on gradual improvement
                    in areas that align with your career goals.
                </p>
            </div>
        </div>
    );
};

export default DevelopmentSection;
