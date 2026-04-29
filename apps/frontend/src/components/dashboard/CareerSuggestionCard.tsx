import React from 'react';
import { CareerSuggestion } from '../../types/dashboard';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface CareerSuggestionCardProps {
  career: CareerSuggestion;
}

const CareerSuggestionCard: React.FC<CareerSuggestionCardProps> = ({ career }) => {
  const navigate = useNavigate();
  useTranslation();

  const handleViewCareer = () => {
    const key = (career as any).slug || career.id;
    navigate(`/careers/${key}`);
  };

  const displayTitle =
    career.title ||
    ((career as any).slug
      ? String((career as any).slug)
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (m) => m.toUpperCase())
      : 'Career Path');

  return (
    <div
      onClick={handleViewCareer}
      className="group bg-white dark:bg-gray-800 rounded-card-feature border border-gray-100 dark:border-gray-700 p-6 md:p-8 
                 shadow-sm hover:shadow-xl hover:shadow-green-900/10 dark:shadow-none 
                 transition-all duration-slow cursor-pointer flex flex-col justify-between h-full min-h-[320px]"
    >
      <div>
        {/* Header: Title & Score */}
        <div className="flex justify-between items-start mb-6">
          <div className="pr-4">
            <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white leading-snug group-hover:text-indigo-800 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
              {displayTitle}
            </h3>
            {/* Optional: Industry Tag if available */}
            {(career as any).industry_category && (
              <span className="inline-block mt-2 px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wide">
                {(career as any).industry_category}
              </span>
            )}
          </div>

          <div className="flex flex-col items-end shrink-0">
            <div className="flex items-baseline text-indigo-800 dark:text-indigo-400">
              <span className="text-3xl font-extrabold tracking-tight">{career.matchPercentage}</span>
              <span className="text-sm font-bold ml-0.5">%</span>
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">Match</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-700 to-indigo-600 h-2 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${career.matchPercentage}%` }}
            />
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 line-clamp-3 leading-relaxed">
          {career.description || "Explore this career path to see if it matches your skills and interests."}
        </p>
      </div>

      {/* Footer Action */}
      <div className="mt-auto pt-5 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <span className="text-sm font-semibold text-indigo-800 dark:text-indigo-400 group-hover:underline transition-colors">
          View Career Details
        </span>
        <div className="w-9 h-9 rounded-full bg-indigo-800 text-white flex items-center justify-center shadow-md group-hover:bg-indigo-900 transition-all duration-200">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default CareerSuggestionCard;