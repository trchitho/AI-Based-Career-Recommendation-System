import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const NoAssessmentPrompt: React.FC = () => {
  const navigate = useNavigate();
  useTranslation();

  const handleStartAssessment = () => {
    navigate('/assessment');
  };

  return (
    <div className="relative overflow-hidden rounded-[28px] bg-white dark:bg-gray-800 p-8 md:p-16 text-center">

      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-green-500 to-teal-500"></div>
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-green-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 max-w-2xl mx-auto">
        {/* Illustration Icon */}
        <div className="mx-auto mb-8 w-24 h-24 bg-green-50 dark:bg-green-900/20 rounded-[24px] flex items-center justify-center shadow-sm border border-green-100 dark:border-green-800/50 group hover:scale-105 transition-transform duration-300">
          <svg className="w-12 h-12 text-green-600 dark:text-green-400 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>

        {/* Heading */}
        <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">
          Start Your <span className="text-green-600 dark:text-green-500">Career Journey</span>
        </h2>

        <p className="text-gray-500 dark:text-gray-400 mb-10 text-lg leading-relaxed font-medium">
          Take our comprehensive career assessment to discover personalized career recommendations
          tailored to your personality, interests, and skills. Get started in just 15 minutes!
        </p>

        {/* Feature Badges */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {[
            { label: 'RIASEC Personality Test', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
            { label: 'Big Five Assessment', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
            { label: 'AI-Powered Analysis', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-full text-sm font-semibold text-gray-700 dark:text-gray-300 shadow-sm">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} /></svg>
              {item.label}
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <button
          onClick={handleStartAssessment}
          className="group relative inline-flex items-center justify-center px-10 py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-green-600/30 hover:shadow-green-600/50 hover:-translate-y-1 transition-all duration-300"
        >
          <span>Take Career Assessment</span>
          <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default NoAssessmentPrompt;