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
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xl rounded-[32px] overflow-hidden font-['Plus_Jakarta_Sans']">

      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-[#4A7C59] to-[#3d6449] dark:from-green-800 dark:to-green-900 px-8 py-6 relative overflow-hidden">
        {/* Abstract pattern overlay */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
        <div className="absolute right-0 top-0 h-full w-1/3 bg-white/5 skew-x-12 transform translate-x-10 pointer-events-none"></div>

        <div className="relative z-10">
          <h3 className="text-2xl font-extrabold text-white mb-1 tracking-tight">
            Development Progress
          </h3>
          <p className="text-green-100 font-medium text-sm">
            Track your active learning roadmaps and milestones
          </p>
        </div>
      </div>

      <div className="p-8">
        {developmentProgress.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
            <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-gray-100 dark:border-gray-600">
              <svg className="w-10 h-10 text-gray-300 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              No Active Roadmaps
            </h4>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto text-sm font-medium">
              Complete an assessment and explore career recommendations to begin your learning journey.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:-translate-y-0.5 transition-all flex items-center gap-2 mx-auto"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {developmentProgress.map((progress, idx) => (
              <div
                key={progress.id || progress.roadmap_id || `${progress.career_id}-${progress.last_updated_at || idx}`}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm hover:shadow-lg hover:border-green-200 dark:hover:border-green-800 transition-all duration-300 group"
              >
                <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      </div>
                      <h4 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-green-600 transition-colors">
                        {progress.career_title}
                      </h4>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 ml-11">
                      Started {formatDate(progress.started_at)} • Last updated {formatDate(progress.last_updated_at)}
                    </p>
                  </div>

                  <button
                    onClick={() => navigate(`/roadmap/${progress.career_id}`)}
                    className="px-5 py-2.5 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-white rounded-xl font-semibold hover:bg-green-600 hover:text-white dark:hover:bg-green-600 transition-all shadow-sm flex items-center gap-2 whitespace-nowrap"
                  >
                    View Roadmap
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="mb-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Overall Progress</span>
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">
                      {(typeof progress.progress_percentage === 'number' ? progress.progress_percentage : 0).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${getProgressColor(progress.progress_percentage || 0)}`}
                      style={{ width: `${progress.progress_percentage || 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Completed</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {getCompletedMilestonesText(progress)}
                    </p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Current Focus</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                      {getCurrentMilestone(progress)}
                    </p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Duration</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {progress.estimated_total_duration}
                    </p>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DevelopmentProgressSection;