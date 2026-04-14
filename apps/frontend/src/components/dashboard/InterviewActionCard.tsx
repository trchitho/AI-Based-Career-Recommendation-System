import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mic, Users, Clock, TrendingUp } from 'lucide-react';

interface InterviewActionCardProps {
    hasCompletedAssessment: boolean;
}

const InterviewActionCard: React.FC<InterviewActionCardProps> = ({ hasCompletedAssessment }) => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const handleStartInterview = () => {
        if (hasCompletedAssessment) {
            navigate('/interview');
        } else {
            navigate('/assessment');
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-[28px] shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all duration-300 overflow-hidden relative group">
            {/* Background gradient */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-[100px] pointer-events-none group-hover:from-blue-500/20 transition-all"></div>

            <div className="relative z-10 p-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                        <Mic className="w-7 h-7" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            AI Mock Interview
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Practice with AI interviewer
                        </p>
                    </div>
                </div>

                {/* Features */}
                <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                        <Users className="w-4 h-4 text-blue-500" />
                        <span className="text-sm">Real interview scenarios</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                        <Clock className="w-4 h-4 text-blue-500" />
                        <span className="text-sm">Instant feedback & scoring</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                        <TrendingUp className="w-4 h-4 text-blue-500" />
                        <span className="text-sm">Improve interview skills</span>
                    </div>
                </div>

                {/* Action */}
                <button
                    onClick={handleStartInterview}
                    className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200 hover:-translate-y-0.5 shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40"
                >
                    {hasCompletedAssessment ? 'Start Interview' : 'Complete Assessment First'}
                </button>

                {hasCompletedAssessment && (
                    <button
                        onClick={() => navigate('/interview/history')}
                        className="w-full mt-3 px-6 py-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm transition-colors"
                    >
                        View Interview History
                    </button>
                )}
            </div>
        </div>
    );
};

export default InterviewActionCard;