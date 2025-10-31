import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { roadmapService } from '../services/roadmapService';
import { useAppSettings } from '../contexts/AppSettingsContext';
import { Roadmap } from '../types/roadmap';
import RoadmapTimelineComponent from '../components/roadmap/RoadmapTimelineComponent';

const RoadmapPage = () => {
  const { careerId } = useParams<{ careerId: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const app = useAppSettings();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingMilestone, setCompletingMilestone] = useState<string | null>(null);

  useEffect(() => {
    if (careerId) {
      fetchRoadmap();
    }
  }, [careerId]);

  const fetchRoadmap = async () => {
    if (!careerId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await roadmapService.getRoadmap(careerId);
      setRoadmap(data);
    } catch (err) {
      console.error('Error fetching roadmap:', err);
      setError('Failed to load learning roadmap. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteMilestone = async (milestoneId: string) => {
    if (!careerId) return;

    try {
      setCompletingMilestone(milestoneId);
      setError(null);

      await roadmapService.completeMilestone(careerId, milestoneId);

      // Refresh roadmap to get updated progress
      await fetchRoadmap();
    } catch (err: any) {
      console.error('Error completing milestone:', err);
      const errorMessage = err.response?.data?.message || 'Failed to mark milestone as complete.';
      setError(errorMessage);
    } finally {
      setCompletingMilestone(null);
    }
  };

  const getProgressPercentage = () => {
    if (!roadmap?.userProgress) return 0;
    const percentage = roadmap.userProgress.progress_percentage;
    return typeof percentage === 'number' ? percentage : 0;
  };

  const getCompletedCount = () => {
    if (!roadmap?.userProgress) return 0;
    return roadmap.userProgress.completed_milestones?.length || 0;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-xl font-bold text-gray-900 hover:text-indigo-700 focus:outline-none"
                aria-label="Go to Dashboard"
              >
                {app.app_title || 'Career Recommendation System'}
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-sm text-gray-700 hover:text-gray-900"
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate('/profile')}
                className="text-sm text-gray-700 hover:text-gray-900"
              >
                Profile
              </button>
              <span className="text-sm text-gray-700">{user?.firstName || user?.email}</span>
              <button onClick={logout} className="text-sm text-gray-700 hover:text-gray-900">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {!loading && !error && roadmap && (
            <div>
              {/* Header */}
              <div className="mb-8">
                <button
                  onClick={() => navigate(-1)}
                  className="text-indigo-600 hover:text-indigo-800 mb-4 flex items-center"
                >
                  <svg
                    className="w-5 h-5 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Back
                </button>

                <h2 className="text-3xl font-bold text-gray-900 mb-2">{roadmap.careerTitle}</h2>
                <p className="text-gray-600 mb-4">Learning Roadmap</p>

                {/* Progress Overview */}
                <div className="bg-white shadow rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Your Progress</h3>
                      <p className="text-sm text-gray-600">
                        {getCompletedCount()} of {roadmap.milestones.length} milestones completed
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-indigo-600">
                        {getProgressPercentage().toFixed(0)}%
                      </p>
                      <p className="text-xs text-gray-500">Complete</p>
                    </div>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${getProgressPercentage()}%` }}
                    ></div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                    <span>⏱️ Estimated Total Duration: {roadmap.estimatedTotalDuration}</span>
                    {roadmap.userProgress && (
                      <span>
                        Started: {new Date(roadmap.userProgress.started_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">Learning Path</h3>
                <RoadmapTimelineComponent
                  milestones={roadmap.milestones}
                  userProgress={roadmap.userProgress}
                  onCompleteMilestone={handleCompleteMilestone}
                  completingMilestone={completingMilestone}
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default RoadmapPage;
