import { useState } from 'react';
import { suggestSkillsFromRIASEC } from '../../utils/cvHelper';

interface AISuggestionsProps {
    riasecScores?: Record<string, number> | undefined;
    onApplySuggestion: (type: 'skill', value: string) => void;
}

const AISuggestions = ({ riasecScores, onApplySuggestion }: AISuggestionsProps) => {
    const [expanded, setExpanded] = useState(false);

    if (!riasecScores) {
        return (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                    💡 Complete a career assessment to get AI-powered suggestions for your CV
                </p>
            </div>
        );
    }

    const suggestedSkills = suggestSkillsFromRIASEC(riasecScores);

    return (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="text-2xl">🤖</span>
                    AI-Powered Suggestions
                </h3>
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-sm text-purple-600 dark:text-purple-400 font-semibold hover:underline"
                >
                    {expanded ? 'Hide' : 'Show'}
                </button>
            </div>

            {expanded && (
                <div className="space-y-4">
                    {/* Suggested Skills */}
                    <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">
                            Recommended Skills Based on Your Profile
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {suggestedSkills.map((skill, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => onApplySuggestion('skill', skill)}
                                    className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-purple-300 dark:border-purple-700 rounded-lg text-sm font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors flex items-center gap-1"
                                >
                                    <span>+</span>
                                    {skill}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tips */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">
                            💡 Pro Tips
                        </h4>
                        <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                            <li className="flex items-start gap-2">
                                <span className="text-green-600 dark:text-green-400">✓</span>
                                <span>Use action verbs (achieved, developed, led, implemented)</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-600 dark:text-green-400">✓</span>
                                <span>Quantify achievements with numbers and percentages</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-600 dark:text-green-400">✓</span>
                                <span>Tailor your CV to match the job description</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-600 dark:text-green-400">✓</span>
                                <span>Keep it concise - aim for 1-2 pages maximum</span>
                            </li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AISuggestions;
