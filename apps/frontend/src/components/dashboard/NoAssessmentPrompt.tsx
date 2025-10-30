import React from "react";
import { useNavigate } from "react-router-dom";

const NoAssessmentPrompt: React.FC = () => {
  const navigate = useNavigate();

  const handleStartAssessment = () => {
    navigate("/assessment");
  };

  return (
    <div className="bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-500/10 dark:to-purple-600/10 backdrop-blur-xl rounded-2xl border border-purple-300 dark:border-purple-500/30 p-10 text-center shadow-2xl transition-colors duration-300">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <div className="mx-auto h-20 w-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-purple-500/50">
            <svg
              className="h-10 w-10 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
        </div>

        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Start Your Career Journey
        </h2>

        <p className="text-gray-700 dark:text-gray-300 mb-8 text-lg">
          Take our comprehensive career assessment to discover personalized
          career recommendations tailored to your personality, interests, and
          skills. Get started in just 15 minutes!
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
          <div className="flex items-center text-sm text-gray-700 dark:text-gray-300 bg-white/80 dark:bg-gray-800/50 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700/50">
            <svg
              className="h-5 w-5 text-green-500 dark:text-green-400 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            RIASEC Personality Test
          </div>

          <div className="flex items-center text-sm text-gray-700 dark:text-gray-300 bg-white/80 dark:bg-gray-800/50 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700/50">
            <svg
              className="h-5 w-5 text-green-500 dark:text-green-400 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Big Five Assessment
          </div>

          <div className="flex items-center text-sm text-gray-700 dark:text-gray-300 bg-white/80 dark:bg-gray-800/50 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700/50">
            <svg
              className="h-5 w-5 text-green-500 dark:text-green-400 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            AI-Powered Analysis
          </div>
        </div>

        <button
          onClick={handleStartAssessment}
          className="bg-gradient-to-r from-purple-500 to-purple-600 text-white py-4 px-10 rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-200 text-lg font-bold shadow-2xl hover:shadow-purple-500/50 flex items-center justify-center space-x-2 mx-auto"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <span>Take Career Assessment</span>
        </button>
      </div>
    </div>
  );
};

export default NoAssessmentPrompt;
