import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { roadmapService } from '../services/roadmapService';
import { useAppSettings } from '../contexts/AppSettingsContext';
import { Roadmap } from '../types/roadmap';
import RoadmapTimelineComponent from '../components/roadmap/RoadmapTimelineComponent';
import { careerService } from '../services/careerService';

const RoadmapPage = () => {
  const { careerId } = useParams<{ careerId: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const app = useAppSettings();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingMilestone, setCompletingMilestone] = useState<string | null>(null);
  const [careerDesc, setCareerDesc] = useState<string>('');
  const [showFullDesc, setShowFullDesc] = useState<boolean>(false);
  const [showSalary, setShowSalary] = useState<boolean>(true);

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
      try {
        const c = await careerService.get(careerId);
        setCareerDesc((c as any).description || (c as any).short_desc || '');
      } catch {}
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

      <main className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Overview hero section */}
          {!loading && !error && roadmap && (
            <section className="mb-8">
              <div className="bg-white rounded-xl shadow p-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                  <div className="lg:col-span-3">
                    <h1 className="text-3xl font-extrabold text-gray-900 mb-4">{(roadmap.careerTitle || '').toUpperCase()}</h1>
                    <div className="flex flex-wrap items-center gap-6 mb-6">
                      {['THỰC TẬP SINH','NHÂN VIÊN','TRƯỞNG PHÒNG','GIÁM ĐỐC','GIÁM ĐỐC\nĐIỀU HÀNH'].map((label, idx) => {
                        const completed = (roadmap.userProgress?.completed_milestones?.length || 0) > idx;
                        return (
                          <div key={idx} className={`relative flex items-center justify-center w-28 h-28 rounded-full border-4 text-center leading-tight px-2 ${completed ? 'bg-indigo-600 text-white border-indigo-200' : 'bg-blue-100 text-blue-900 border-blue-300'}`}>
                            <span className="text-xs font-bold whitespace-pre-line">{label}</span>
                          </div>
                        );
                      })}
                    </div>
                    {careerDesc && (
                      <div className="text-gray-700 space-y-3">
                        <p className={`${showFullDesc ? '' : 'line-clamp-4'}`}>{careerDesc}</p>
                        <button onClick={() => setShowFullDesc((v)=>!v)} className="inline-block mt-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
                          {showFullDesc ? 'Thu gọn' : 'Xem đầy đủ nội dung'}
                        </button>
                      </div>
                    )}
                  </div>
                  <aside className="space-y-4 lg:col-span-1">
                    <div className="rounded-xl border p-4">
                      <div className="text-orange-600 font-bold mb-1">KINH NGHIỆM</div>
                      <div className="text-gray-800">{(roadmap as any).overview?.experienceText || (roadmap.milestones.length ? '6 tháng - 1 năm' : 'Đang cập nhật')}</div>
                    </div>
                    <div className="rounded-xl border p-4">
                      <div className="text-orange-600 font-bold mb-1">BẰNG CẤP</div>
                      <div className="text-gray-800">{(roadmap as any).overview?.degreeText || 'Cao đẳng, Đại học'}</div>
                    </div>
                  </aside>
                </div>
              </div>
            </section>
          )}
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
              {/* Career growth panel (collapsible) */}
              <div className="mb-6">
                <div className="bg-blue-600 text-white rounded-t-xl px-4 py-3 flex items-center justify-between cursor-pointer" onClick={() => setShowSalary((s)=>!s)}>
                  <h3 className="text-lg font-semibold">Lộ trình nghề nghiệp: {roadmap.careerTitle}</h3>
                  <span className="text-white">{showSalary ? '▴' : '▾'}</span>
                </div>
                {showSalary && (
                  <div className="bg-white border border-blue-200 rounded-b-xl p-4">
                    <ul className="divide-y">
                      {(((roadmap as any).overview?.salaryBands as any[]) || [
                        { label: 'Giám Đốc và Cấp Cao Hơn', value: 70.5 },
                        { label: 'Trưởng phòng', value: 37.4 },
                        { label: 'Nhân viên', value: 17.3 },
                        { label: 'Mới Tốt Nghiệp', value: 11 },
                        { label: 'Thực tập sinh/Sinh viên', value: 5.6 },
                      ]).map((band, i) => (
                        <li key={(band as any).label || i} className="py-3 flex items-center gap-4">
                          <div className="w-56 text-gray-800 font-medium">{(band as any).label || ''}</div>
                          <div className="flex-1 h-3 bg-gray-200 rounded-full">
                            <div className={`h-3 rounded-full ${['bg-yellow-400','bg-red-400','bg-blue-400','bg-gray-400','bg-green-300'][i % 5]}`} style={{ width: `${Math.min(100, Math.max(10, ((band as any).value || 0))) }%` }} />
                          </div>
                          <div className="w-24 text-right text-gray-700 text-sm">{((band as any).value ?? 0)} triệu</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
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
              {/* Salary summary */}
              <div className="mt-6">
                <div className="bg-blue-600 text-white rounded-t-xl px-4 py-3 flex items-center justify-between cursor-pointer" onClick={() => setShowSalary((s)=>!s)}>
                  <h3 className="text-lg font-semibold">Mức lương trung bình: {roadmap.careerTitle}</h3>
                  <span className="text-white">{showSalary ? '▴' : '▾'}</span>
                </div>
                {showSalary && (
                  <div className="bg-white border border-blue-200 rounded-b-xl p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="text-center">
                      <div className="text-gray-500">Khoảng lương phổ biến</div>
                      <div className="text-orange-500 text-3xl font-extrabold mt-2">{(() => { const ov=(roadmap as any).overview; const min=ov?.salaryMin; const max=ov?.salaryMax; return (min||max)?`${min||0} triệu - ${max||0} triệu`:'0 triệu - 20.9 triệu'; })()}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-500">Mức lương trung bình</div>
                      <div className="text-orange-500 text-3xl font-extrabold mt-2">{((roadmap as any).overview?.salaryAvg ?? 24.4)} triệu</div>
                    </div>
                    <div className="md:col-span-2 text-center text-sm text-gray-500">Thông tin mang tính tham khảo</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default RoadmapPage;
