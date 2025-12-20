import { useState } from 'react';
import { Milestone, UserProgress } from '../../types/roadmap';

interface RoadmapTimelineComponentProps {
  milestones: Milestone[];
  userProgress?: UserProgress | undefined;
  onCompleteMilestone: (milestoneId: string) => void;
  completingMilestone: string | null;
  upgradeRequired?: boolean;
  maxFreeLevel?: number;
}

const RoadmapTimelineComponent = ({
  milestones,
  userProgress,
  onCompleteMilestone,
  completingMilestone,
  maxFreeLevel = -1,
}: RoadmapTimelineComponentProps) => {
  const [expandedMilestone, setExpandedMilestone] = useState<number | null>(null);

  const isMilestoneCompleted = (order: number) => {
    return userProgress?.completed_milestones?.includes(order.toString()) || false;
  };

  const isMilestoneLocked = (order: number) => {
    if (maxFreeLevel === -1) return false; // Unlimited access (Premium)
    return order > maxFreeLevel;
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
      {/* CSS for animations */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200px 0; }
          100% { background-position: calc(200px + 100%) 0; }
        }

        .shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          background-size: 200px 100%;
          animation: shimmer 2s infinite;
        }
        .locked-card {
          position: relative;
        }
        .locked-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(45deg, transparent 30%, rgba(147, 51, 234, 0.1) 50%, transparent 70%);
          animation: shimmer 3s infinite;
          pointer-events: none;
        }

      `}</style>
      
      {/* Timeline Line */}
      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-gray-200 via-purple-200 to-gray-200 dark:from-gray-700 dark:via-purple-700 dark:to-gray-700"></div>

      {/* Milestones */}
      <div className="space-y-6">
        {milestones.map((milestone, index) => {
          const isCompleted = isMilestoneCompleted(milestone.order);
          const isCurrent = index === currentMilestoneIndex && !isCompleted;
          const isExpanded = expandedMilestone === milestone.order;
          const isCompleting = completingMilestone === milestone.order.toString();
          const isLocked = isMilestoneLocked(milestone.order);

          return (
            <div key={milestone.order} className="relative pl-16">
              {/* Timeline Node */}
              <div
                className={`absolute left-5 top-2 w-6 h-6 rounded-full border-4 transition-all duration-300 ${
                  isLocked
                    ? 'bg-gradient-to-br from-purple-400 to-pink-400 border-purple-200 dark:border-purple-600 shadow-lg'
                    : isCompleted
                    ? 'bg-[#4A7C59] dark:bg-green-600 border-[#E8F5E9] dark:border-green-300'
                    : isCurrent
                      ? 'bg-orange-500 dark:bg-orange-600 border-orange-100 dark:border-orange-900 animate-pulse'
                      : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                  }`}
              >
                {isLocked ? (
                  <svg
                    className="w-4 h-4 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : isCompleted ? (
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
                ) : null}
              </div>

              {/* Milestone Card */}
              <div
                className={`relative overflow-hidden rounded-2xl shadow-lg border transition-all duration-300 hover:shadow-xl ${
                  isLocked
                    ? 'locked-card bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 border-purple-200 dark:border-purple-700'
                    : isCurrent
                    ? 'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-300 dark:border-orange-600 shadow-orange-200/50 dark:shadow-orange-900/20'
                    : isCompleted
                      ? 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-300 dark:border-green-600'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}
              >
                <div
                  className={`p-6 ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-700/50'} transition-colors duration-200`}
                  onClick={() => !isLocked && toggleMilestone(milestone.order)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className="text-sm font-semibold text-gray-500 mr-3">
                          Step {milestone.order}
                        </span>
                        {isLocked && (
                          <span className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-semibold rounded-full flex items-center gap-1.5 shadow-lg">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 616 0z" clipRule="evenodd" />
                            </svg>
                            PRO
                          </span>
                        )}
                        {!isLocked && isCurrent && (
                          <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-semibold rounded-full">
                            Current
                          </span>
                        )}
                        {!isLocked && isCompleted && (
                          <span className="px-2 py-1 bg-[#E8F5E9] dark:bg-green-900/30 text-[#4A7C59] dark:text-green-400 text-xs font-semibold rounded-full border border-[#4A7C59]/30 dark:border-green-600/30">
                            Completed
                          </span>
                        )}
                      </div>
                      <h3 className={`text-lg font-semibold mb-2 ${isLocked ? 'text-gray-500 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                        {milestone.skillName}
                      </h3>
                      <p className={`text-sm mb-3 ${isLocked ? 'text-gray-500 dark:text-gray-400' : 'text-gray-600 dark:text-gray-400'}`}>
                        {isLocked ? 'Mở khóa để truy cập nội dung học tập chuyên sâu' : milestone.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Estimated Duration: {milestone.estimatedDuration}</span>
                      </div>
                    </div>
                    {!isLocked && (
                      <button className="ml-4 text-gray-400 hover:text-gray-600">
                        <svg
                          className={`w-5 h-5 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`}
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
                    )}
                  </div>
                </div>

                {/* Locked Content */}
                {isLocked && (
                  <div className="relative">
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent dark:from-gray-800 dark:via-gray-800/80 pointer-events-none z-10"></div>
                    
                    <div className="px-6 pb-6 pt-4 relative">
                      {/* Blurred preview content */}
                      <div className="filter blur-sm opacity-50 mb-4">
                        <div className="space-y-2">
                          <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                          <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-full"></div>
                        </div>
                      </div>
                      
                      {/* Unlock CTA */}
                      <div className="absolute inset-x-6 bottom-6 z-20">
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-xl border border-gray-200 dark:border-gray-700">
                          <div className="text-center">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-3">
                              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 616 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Nội dung Premium</h4>
                            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                              Tài liệu học tập, bài tập thực hành và hướng dẫn chi tiết
                            </p>
                            <button 
                              onClick={() => window.location.href = '/pricing'}
                              className="w-full px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              Mở khóa ngay
                              <span>✨</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Expanded Content */}
                {isExpanded && !isLocked && (
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