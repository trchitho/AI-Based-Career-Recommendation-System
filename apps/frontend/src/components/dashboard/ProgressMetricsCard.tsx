import React from 'react';
import { ProgressMetrics } from '../../types/dashboard';
import { useTranslation } from "react-i18next";

interface ProgressMetricsCardProps {
  metrics: ProgressMetrics;
}

const ProgressMetricsCard: React.FC<ProgressMetricsCardProps> = ({ metrics }) => {
  const { t } = useTranslation();

  return (
    <div className="h-full flex flex-col justify-center p-8 bg-white/70 dark:bg-gray-800/60 backdrop-blur-sm relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500/60 via-purple-500/40 to-transparent rounded-t-[28px]"></div>

      {/* Title Header */}
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <span className="w-1 h-5 bg-indigo-700 rounded-full"></span>
          {t("dashboard.progress.title")}
        </h3>

        {/* Decorative Icon */}
        <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center">
          <svg className="w-4 h-4 text-indigo-800 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="flex justify-between items-stretch text-center divide-x divide-gray-100 dark:divide-gray-700">

        {/* Assessments */}
        <div className="flex-1 px-2 group cursor-default flex flex-col items-center justify-start">
          <div className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2 group-hover:text-indigo-800 transition-colors duration-300">
            {metrics.completedAssessments}
          </div>
          <div className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase tracking-wider leading-tight min-h-[2.5em] flex items-center">
            {t("dashboard.stats.assessmentsCompleted")}
          </div>
        </div>

        {/* Active Roadmaps */}
        <div className="flex-1 px-2 group cursor-default flex flex-col items-center justify-start">
          <div className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2 group-hover:text-indigo-800 transition-colors duration-300">
            {metrics.activeRoadmaps}
          </div>
          <div className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase tracking-wider leading-tight min-h-[2.5em] flex items-center">
            {t("dashboard.stats.activeRoadmaps")}
          </div>
        </div>

        {/* Milestones */}
        <div className="flex-1 px-2 group cursor-default flex flex-col items-center justify-start">
          <div className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2 group-hover:text-indigo-800 transition-colors duration-300">
            {metrics.completedMilestones}
          </div>
          <div className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase tracking-wider leading-tight min-h-[2.5em] flex items-center">
            {t("dashboard.stats.milestonesAchieved")}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProgressMetricsCard;