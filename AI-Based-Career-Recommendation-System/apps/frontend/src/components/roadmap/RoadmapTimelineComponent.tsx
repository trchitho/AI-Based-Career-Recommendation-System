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
      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>

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
                className={`absolute left-5 top-2 w-6 h-6 rounded-full border-4 ${
                  isCompleted
                    ? 'bg-green-500 border-green-200'
                    : isCurrent
                    ? 'bg-indigo-500 border-indigo-200 animate-pulse'
                    : 'bg-white border-gray-300'
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
                className={`bg-white rounded-lg shadow-md border-2 transition-all ${
                  isCurrent
                    ? 'border-indigo-500'
                    : isCompleted
                    ? 'border-green-200'
                    : 'border-gray-200'
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
                          <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">
                            Current
                          </span>
                        )}
                        {isCompleted && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                            Completed
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {milestone.skillName}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">{milestone.description}</p>
                      <p className="text-xs text-gray-500">
                        ⏱️ Estimated Duration: {milestone.estimatedDuration}
                      </p>
                    </div>
                    <button className="ml-4 text-gray-400 hover:text-gray-600">
                      <svg
                        className={`w-5 h-5 transition-transform ${
                          isExpanded ? 'transform rotate-180' : ''
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
                  <div className="px-5 pb-5 border-t border-gray-200 pt-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Learning Resources</h4>
                    <div className="space-y-2 mb-4">
                      {milestone.resources.map((resource, idx) => (
                        <a
                          key={idx}
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <span className="text-2xl mr-3">{getResourceIcon(resource.type)}</span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{resource.title}</p>
                            <p className="text-xs text-gray-500 capitalize">{resource.type}</p>
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
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                      >
                        {isCompleting ? 'Marking Complete...' : 'Mark as Complete'}
                      </button>
                    )}

                    {isCompleted && userProgress && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-sm text-green-800">
                          ✓ Completed on{' '}
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
