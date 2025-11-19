import { useNavigate } from 'react-router-dom';
import { RoadmapProgress } from '../../types/profile';

interface DevelopmentProgressSectionProps {
  developmentProgress: RoadmapProgress[];
}

const DevelopmentProgressSection = ({ developmentProgress }: DevelopmentProgressSectionProps) => {
  const navigate = useNavigate();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 75) return 'bg-green-500';
    if (percentage >= 50) return 'bg-blue-500';
    if (percentage >= 25) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  const getCurrentMilestone = (progress: RoadmapProgress) => {
    if (!progress.completed_milestones || !progress.milestones) {
      return 'No active milestone';
    }
    const completedCount = progress.completed_milestones.length;
    if (completedCount >= progress.milestones.length) {
      return 'All milestones completed!';
    }
    const nextMilestone = progress.milestones.find(
      (m) => !progress.completed_milestones.includes(m.order.toString())
    );
    return nextMilestone ? nextMilestone.skillName : 'No active milestone';
  };

  const getCompletedMilestonesText = (progress: RoadmapProgress) => {
    if (!progress.completed_milestones || !progress.milestones) {
      return '0 of 0 milestones';
    }
    return `${progress.completed_milestones.length} of ${progress.milestones.length} milestones`;
  };

  return (
    <div
      className="
        bg-white dark:bg-[#1A1F2C]
        border border-gray-200 dark:border-white/10
        rounded-xl p-6 shadow-sm transition-colors
      "
    >
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          Development Progress
        </h3>
      </div>

      {developmentProgress.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            You haven't started any learning roadmaps yet.
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
            Complete an assessment and explore career recommendations to begin your learning journey.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="
              px-4 py-2 rounded-md text-white
              bg-indigo-600 hover:bg-indigo-700
              transition-colors
            "
          >
            Go to Dashboard
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {developmentProgress.map((progress, idx) => (
            <div
              key={
                progress.id ||
                progress.roadmap_id ||
                `${progress.career_id}-${progress.last_updated_at || progress.started_at || idx}`
              }
              className="
                rounded-lg p-5
                bg-white dark:bg-[#1A1F2C]
                border border-gray-200 dark:border-white/10
                hover:shadow-md transition-shadow
              "
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {progress.career_title}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Started {formatDate(progress.started_at)} • Last updated{' '}
                    {formatDate(progress.last_updated_at)}
                  </p>
                </div>

                <button
                  onClick={() => navigate(`/roadmap/${progress.career_id}`)}
                  className="
                    ml-4 px-4 py-2 text-sm rounded-md
                    bg-indigo-600 hover:bg-indigo-700
                    text-white transition-colors
                  "
                >
                  View Roadmap
                </button>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Overall Progress
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {(typeof progress.progress_percentage === 'number' ? progress.progress_percentage : 0).toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(
                      progress.progress_percentage || 0
                    )}`}
                    style={{ width: `${progress.progress_percentage || 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Milestone Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Completed Milestones
                  </p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {getCompletedMilestonesText(progress)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Current Focus
                  </p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {getCurrentMilestone(progress)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Estimated Duration
                  </p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {progress.estimated_total_duration}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Status
                  </p>
                  <p className="text-sm">
                    {(progress.progress_percentage || 0) >= 100 ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300">
                        Completed
                      </span>
                    ) : (progress.progress_percentage || 0) > 0 ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
                        In Progress
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                        Not Started
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Recent Milestones */}
              {progress.completed_milestones &&
                progress.milestones &&
                progress.completed_milestones.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Recently Completed
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {progress.milestones
                        .filter((m) =>
                          progress.completed_milestones.includes(m.order.toString())
                        )
                        .slice(-3)
                        .map((milestone) => (
                          <span
                            key={`${progress.career_id}-${milestone.order}`}
                            className="
                              inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
                              bg-green-50 dark:bg-green-900/30
                              text-green-700 dark:text-green-300
                              border border-green-200 dark:border-green-700/40
                            "
                          >
                            ✓ {milestone.skillName}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DevelopmentProgressSection;
