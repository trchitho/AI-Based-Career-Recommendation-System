import { useState } from 'react';
import { Milestone, UserProgress } from '../../types/roadmap';

interface RoadmapTimelineComponentProps {
  milestones: Milestone[];
  userProgress?: UserProgress | undefined;
  onCompleteMilestone: (milestoneId: string) => void;
  completingMilestone: string | null;
}

const RoadmapTimelineComponent = ({
  milestones,
  userProgress,
  onCompleteMilestone,
  completingMilestone,
}: RoadmapTimelineComponentProps) => {
  const [expandedMilestone, setExpandedMilestone] = useState<number | null>(null);

  const isMilestoneCompleted = (order: number) => {
    return userProgress?.completed_milestones?.includes(order.toString()) || false;
  };

  const getCurrentMilestone = () => {
    if (!userProgress) return 0;
    const completedCount = userProgress.completed_milestones?.length || 0;
    return completedCount < milestones.length ? completedCount : milestones.length - 1;
  };

  const currentMilestoneIndex = getCurrentMilestone();

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'course':
        return '📚';
      case 'article':
        return '📄';
      case 'video':
        return '🎥';
      case 'book':
        return '📖';
      default:
        return '🔗';
    }
  };

  const toggleMilestone = (order: number) => {
    setExpandedMilestone(expandedMilestone === order ? null : order);
  };

  return (
    <div className="relative">
      {/* Timeline Line */}
      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>

      {/* Milestones */}
      <div className="space-y-6">
        {milestones.map((milestone, index) => {
          const isCompleted = isMilestoneCompleted(milestone.order);
          const isCurrent = index === currentMilestoneIndex && !isCompleted;
          const isExpanded = expandedMilestone === milestone.order;
          const isCompleting = completingMilestone === milestone.order.toString();

          return (
            <div key={milestone.order} className="relative pl-16">
              {/* Timeline Node */}
              <div
                className={`absolute left-5 top-2 w-6 h-6 rounded-full border-4 transition-colors ${isCompleted
                    ? 'bg-[#4A7C59] dark:bg-green-600 border-[#E8F5E9] dark:border-green-300'
                    : isCurrent
                      ? 'bg-orange-500 dark:bg-orange-600 border-orange-100 dark:border-orange-900 animate-pulse' // Changed from beige to orange
                      : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                  }`}
              >
                {isCompleted && (
                  <svg
                    className="w-4 h-4 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>

              {/* Milestone Card */}
              <div
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-md border-2 transition-all ${isCurrent
                    ? 'border-orange-400 dark:border-orange-500 shadow-lg' // Changed border to orange
                    : isCompleted
                      ? 'border-[#E8F5E9] dark:border-green-700'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
              >
                <div
                  className="p-5 cursor-pointer"
                  onClick={() => toggleMilestone(milestone.order)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className="text-sm font-semibold text-gray-500 mr-3">
                          Step {milestone.order}
                        </span>
                        {isCurrent && (
                          <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-semibold rounded-full"> {/* Changed to orange */}
                            Current
                          </span>
                        )}
                        {isCompleted && (
                          <span className="px-2 py-1 bg-[#E8F5E9] dark:bg-green-900/30 text-[#4A7C59] dark:text-green-400 text-xs font-semibold rounded-full border border-[#4A7C59]/30 dark:border-green-600/30">
                            Completed
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {milestone.skillName}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{milestone.description}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Estimated Duration: {milestone.estimatedDuration}</span>
                      </div>
                    </div>
                    <button className="ml-4 text-gray-400 hover:text-gray-600">
                      <svg
                        className={`w-5 h-5 transition-transform ${isExpanded ? 'transform rotate-180' : ''
                          }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Learning Resources</h4>
                    <div className="space-y-2 mb-4">
                      {milestone.resources.map((resource, idx) => (
                        <a
                          key={idx}
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <span className="text-2xl mr-3">{getResourceIcon(resource.type)}</span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{resource.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{resource.type}</p>
                          </div>
                          <svg
                            className="w-4 h-4 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>
                      ))}
                    </div>

                    {!isCompleted && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCompleteMilestone(milestone.order.toString());
                        }}
                        disabled={isCompleting}
                        className="w-full px-4 py-2 bg-[#4A7C59] dark:bg-green-600 text-white rounded-lg hover:bg-[#3d6449] dark:hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-all shadow-sm"
                      >
                        {isCompleting ? 'Marking Complete...' : 'Mark as Complete'}
                      </button>
                    )}

                    {isCompleted && userProgress && (
                      <div className="bg-[#E8F5E9] dark:bg-green-900/20 border border-[#4A7C59]/30 dark:border-green-600/30 rounded-lg p-3">
                        <p className="text-sm text-[#4A7C59] dark:text-green-400 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>Completed on{' '}
                            {(() => {
                              const completionTimestamp =
                                userProgress.milestone_completions?.[milestone.order.toString()];
                              if (completionTimestamp) {
                                return new Date(completionTimestamp).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                });
                              }
                              return new Date(userProgress.last_updated_at).toLocaleDateString();
                            })()}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RoadmapTimelineComponent;