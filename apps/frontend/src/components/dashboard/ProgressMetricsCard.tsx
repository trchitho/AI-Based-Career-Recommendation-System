import React from 'react';
import { ProgressMetrics } from '../../types/dashboard';
import { useTranslation } from "react-i18next";

interface ProgressMetricsCardProps {
  metrics: ProgressMetrics;
}

const ProgressMetricsCard: React.FC<ProgressMetricsCardProps> = ({ metrics }) => {
  const { t } = useTranslation();

  return (
    <div className="h-full flex flex-col justify-center p-8 bg-white dark:bg-gray-800">

      {/* Title Header */}
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <span className="w-1 h-5 bg-green-500 rounded-full"></span>
          {t("dashboard.progress.title")}
        </h3>

        {/* Decorative Icon */}
        <div className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
          <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="flex justify-between items-center text-center divide-x divide-gray-100 dark:divide-gray-700">

        {/* Assessments */}
        <div className="flex-1 px-2 group cursor-default">
          <div className="text-4xl font-extrabold text-gray-900 dark:text-white mb-1 group-hover:text-green-600 transition-colors duration-300">
            {metrics.completedAssessments}
          </div>
          <div className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase tracking-wider leading-tight">
            {t("dashboard.stats.assessmentsCompleted")}
          </div>
        </div>

        {/* Active Roadmaps */}
        <div className="flex-1 px-2 group cursor-default">
          <div className="text-4xl font-extrabold text-gray-900 dark:text-white mb-1 group-hover:text-green-600 transition-colors duration-300">
            {metrics.activeRoadmaps}
          </div>
          <div className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase tracking-wider leading-tight">
            {t("dashboard.stats.activeRoadmaps")}
          </div>
        </div>

        {/* Milestones */}
        <div className="flex-1 px-2 group cursor-default">
          <div className="text-4xl font-extrabold text-gray-900 dark:text-white mb-1 group-hover:text-green-600 transition-colors duration-300">
            {metrics.completedMilestones}
          </div>
          <div className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase tracking-wider leading-tight">
            {t("dashboard.stats.milestonesAchieved")}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProgressMetricsCard;