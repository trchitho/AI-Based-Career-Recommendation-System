import React from 'react';
import { CareerSuggestion } from '../../types/dashboard';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface CareerSuggestionCardProps {
  career: CareerSuggestion;
}

const CareerSuggestionCard: React.FC<CareerSuggestionCardProps> = ({ career }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleViewRoadmap = () => {
    const key = (career as any).slug || career.id;
    navigate(`/careers/${key}/roadmap`);
  };

  const displayTitle =
    career.title ||
    ((career as any).slug
      ? String((career as any).slug)
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (m) => m.toUpperCase())
      : '');

  return (
    <div
      className="bg-white dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 
                 dark:border-gray-700/50 p-6 hover:border-purple-500/50 transition-all duration-300 
                 shadow-xl hover:shadow-purple-500/20 group flex flex-col justify-between min-h-[340px]"
    >
      <div>
        <div className="flex items-start justify-between mb-4">

          {/* 🔧 SỬA 1: Giảm cỡ chữ tiêu đề (từ text-lg → text-base) + font-semibold thay vì font-bold */}
          <h3 className="text-base font-semibold text-gray-900 dark:text-white 
                         group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">
            {displayTitle}
          </h3>

          <div className="flex flex-col items-end">
            <span className="text-3xl font-bold text-transparent bg-clip-text 
                             bg-gradient-to-r from-purple-500 to-purple-700 
                             dark:from-purple-400 dark:to-purple-600">
              {career.matchPercentage}%
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-500">
              {t('dashboard.careerSuggestions.match')}
            </span>
          </div>
        </div>

        <div className="mb-4">
          <div className="w-full bg-gray-200 dark:bg-gray-700/50 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-500 to-purple-600 h-2.5 rounded-full transition-all duration-500 shadow-lg shadow-purple-500/50"
              style={{ width: `${career.matchPercentage}%` }}
            />
          </div>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 line-clamp-3">
          {career.description}
        </p>
      </div>

      {/* 🔧 SỬA 2: Giữ nút nằm cố định dưới cùng bằng mt-auto */}
      <button
        onClick={handleViewRoadmap}
        className="mt-auto w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 px-4 rounded-lg 
                   hover:from-purple-600 hover:to-purple-700 transition-all duration-200 text-sm font-medium 
                   shadow-lg hover:shadow-purple-500/50 flex items-center justify-center space-x-2"
      >
        <span>{t('dashboard.progress.viewRoadmap')}</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
};

export default CareerSuggestionCard;
