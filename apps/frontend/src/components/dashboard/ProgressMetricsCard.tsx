import React from "react";
import { ProgressMetrics } from "../../types/dashboard";

interface ProgressMetricsCardProps {
  metrics: ProgressMetrics;
}

const ProgressMetricsCard: React.FC<ProgressMetricsCardProps> = ({
  metrics,
}) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Your Progress
      </h3>

      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-indigo-600">
            {metrics.completedAssessments}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Assessments Completed
          </div>
        </div>

        <div className="text-center border-l border-r border-gray-200">
          <div className="text-3xl font-bold text-green-600">
            {metrics.activeRoadmaps}
          </div>
          <div className="text-xs text-gray-500 mt-1">Active Roadmaps</div>
        </div>

        <div className="text-center">
          <div className="text-3xl font-bold text-purple-600">
            {metrics.completedMilestones}
          </div>
          <div className="text-xs text-gray-500 mt-1">Milestones Achieved</div>
        </div>
      </div>
    </div>
  );
};

export default ProgressMetricsCard;
