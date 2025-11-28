import React from 'react';
import { ProgressMetrics } from '../../types/dashboard';
import { useTranslation } from "react-i18next";

interface ProgressMetricsCardProps {
  metrics: ProgressMetrics;
}

const ProgressMetricsCard: React.FC<ProgressMetricsCardProps> = ({ metrics }) => {

  const { t } = useTranslation();

  return (
    <div className="rounded-3xl p-8
        
        /* Light Mode */
        bg-white 
        border border-gray-200 
        shadow-md
        text-gray-900
        
        /* Dark Mode */
        dark:bg-gradient-to-br
        dark:from-[#0f172a]
        dark:via-[#111827]
        dark:to-[#1e1b4b]
        dark:border-white/5
        dark:shadow-[0_8px_25px_rgba(0,0,0,0.35)]
        dark:text-white transition-all duration-300">

      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {t("dashboard.progress.title")}
      </h3>

      <div className="grid grid-cols-3 gap-4">

        {/* Assessments Completed */}
        <div className="text-center">
          <div className="text-3xl font-bold text-indigo-600">
            {metrics.completedAssessments}
          </div>
          <div className="text-xs text-white-500 mt-1">
            {t("dashboard.stats.assessmentsCompleted")}
          </div>
        </div>

        {/* Active Roadmaps */}
        <div className="text-center border-l border-r border-gray-200 dark:border-white/10">
          <div className="text-3xl font-bold text-green-600">
            {metrics.activeRoadmaps}
          </div>
          <div className="text-xs text-white-900 mt-1">
            {t("dashboard.stats.activeRoadmaps")}
          </div>
        </div>

        {/* Milestones Achieved */}
        <div className="text-center">
          <div className="text-3xl font-bold text-purple-600">
            {metrics.completedMilestones}
          </div>
          <div className="text-xs text-white-900 mt-1">
            {t("dashboard.stats.milestonesAchieved")}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProgressMetricsCard;
