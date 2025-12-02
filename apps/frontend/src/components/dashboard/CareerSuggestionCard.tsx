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
      className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 
                 dark:border-gray-700 p-6 hover:border-[#4A7C59] dark:hover:border-green-600 transition-all duration-300 
                 shadow-lg hover:shadow-xl group flex flex-col justify-between min-h-[340px]"
    >
      <div>
        <div className="flex items-start justify-between mb-4">

          <h3 className="text-base font-semibold text-gray-900 dark:text-white 
                         group-hover:text-[#4A7C59] dark:group-hover:text-green-400 transition-colors">
            {displayTitle}
          </h3>

          <div className="flex flex-col items-end">
            <span className="text-3xl font-bold text-[#4A7C59] dark:text-green-500">
              {career.matchPercentage}%
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {t('dashboard.careerSuggestions.match')}
            </span>
          </div>
        </div>

        <div className="mb-4">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-[#4A7C59] dark:bg-green-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${career.matchPercentage}%` }}
            />
          </div>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 line-clamp-3">
          {career.description}
        </p>
      </div>

      <button
        onClick={handleViewRoadmap}
        className="mt-auto w-full bg-[#4A7C59] dark:bg-green-600 text-white py-3 px-4 rounded-lg 
                   hover:bg-[#3d6449] dark:hover:bg-green-700 transition-all duration-200 text-sm font-medium 
                   shadow-lg flex items-center justify-center space-x-2"
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
