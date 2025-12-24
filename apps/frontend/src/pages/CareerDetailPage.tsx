import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { careerService, CareerItem } from '../services/careerService';
import { useUsageTracking } from '../hooks/useUsageTracking';
import { useFeatureAccess } from '../hooks/useFeatureAccess';

const CareerDetailPage = () => {
  // ==========================================
  // 1. LOGIC BLOCK (GIỮ NGUYÊN)
  // ==========================================
  const { idOrSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [item, setItem] = useState<CareerItem | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Add usage tracking
  const { incrementUsage, canUseFeature } = useUsageTracking();
  const { hasFeature, currentPlan } = useFeatureAccess();
  const hasTrackedUsageRef = useRef(false);

  useEffect(() => {
    const run = async () => {
      try {
        if (!idOrSlug) return;
        
        // For Basic plan: Check if already reached 25 career limit before loading
        if (currentPlan === 'basic' && !hasFeature('unlimited_careers')) {
          const canView = canUseFeature('career_view');
          if (!canView) {
            // Redirect to pricing if limit exceeded
            window.location.href = '/pricing';
            return;
          }
        }
        
        const data = await careerService.get(idOrSlug);
        setItem(data);
        
        // Track career viewing usage - ONLY when navigating from CareersPage
        const isFromCareersPage = location.state?.fromCareersPage === true;
        
        if (!hasTrackedUsageRef.current && !hasFeature('unlimited_careers') && isFromCareersPage) {
          console.log('🔄 Tracking career view usage (from CareersPage)...');
          incrementUsage('career_view');
          hasTrackedUsageRef.current = true;
        } else if (!isFromCareersPage) {
          console.log('ℹ️ Direct URL access - not tracking usage');
        } else if (hasFeature('unlimited_careers')) {
          console.log('ℹ️ Unlimited plan - not tracking usage');
        }
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [idOrSlug]); // Remove incrementUsage and hasFeature from dependencies to prevent infinite loop

  // ==========================================
  // 2. NEW DESIGN UI
  // ==========================================
  return (
    <MainLayout>
      <div className="min-h-screen bg-[#F8F9FA] dark:bg-gray-900 font-['Plus_Jakarta_Sans'] text-gray-900 dark:text-white relative overflow-x-hidden pb-20">

        {/* CSS Injection */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
          .bg-dot-pattern {
            background-image: radial-gradient(#E5E7EB 1px, transparent 1px);
            background-size: 24px 24px;
          }
          .dark .bg-dot-pattern {
            background-image: radial-gradient(#374151 1px, transparent 1px);
          }
          @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
          .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; }
        `}</style>

        {/* Background Layers */}
        <div className="absolute inset-0 bg-dot-pattern pointer-events-none z-0 opacity-60"></div>
        <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-green-400/5 rounded-full blur-[120px] pointer-events-none z-0"></div>
        <div className="fixed bottom-0 left-0 w-[600px] h-[600px] bg-blue-400/5 rounded-full blur-[120px] pointer-events-none z-0"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

          {/* --- LOADING STATE --- */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-32 animate-pulse">
              <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 rounded-full border-t-green-600 mb-4 animate-spin"></div>
              <p className="text-gray-500 font-medium">Loading career details...</p>
            </div>
          )}

          {/* --- ACCESS LEVEL INFO --- */}
          {!loading && item && (
            <div className="animate-fade-in-up mb-8">
              {item.premium_features_locked ? (
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">🔓</div>
                      <div>
                        <h3 className="font-semibold text-orange-900 dark:text-orange-100">
                          Đang xem ở mức cơ bản
                        </h3>
                        <p className="text-sm text-orange-700 dark:text-orange-300">
                          Nâng cấp Premium để xem thông tin chi tiết đầy đủ
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/pricing')}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
                    >
                      Nâng Cấp
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">⭐</div>
                    <div>
                      <h3 className="font-semibold text-green-900 dark:text-green-100">
                        Truy cập Premium
                      </h3>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Bạn có thể xem tất cả thông tin chi tiết
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* --- CONTENT --- */}
          {!loading && item && (
            <div className="animate-fade-in-up space-y-8">

              {/* 1. HERO BANNER */}
              <div className="bg-gradient-to-r from-[#4A7C59] to-[#3d6449] dark:from-green-800 dark:to-green-900 rounded-[32px] p-8 md:p-12 shadow-xl shadow-green-900/20 text-white relative overflow-hidden">
                {/* Abstract shapes */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none"></div>

                <div className="relative z-10">
                  <button
                    onClick={() => navigate('/careers')}
                    className="mb-6 flex items-center text-green-100 hover:text-white transition-colors text-sm font-bold uppercase tracking-wide"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    Back to Careers
                  </button>

                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
                    <div>
                      <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
                        {item.title}
                      </h1>
                      <p className="text-lg text-green-50 max-w-2xl leading-relaxed font-medium opacity-90">
                        {item.short_desc || "Explore this career path and discover if it's the right fit for your future."}
                      </p>
                    </div>

                    <div className="flex-shrink-0">
                      <Link
                        to={`/careers/${item.id}/roadmap`}
                        className="group inline-flex items-center px-8 py-4 bg-white text-green-800 rounded-2xl font-bold text-lg shadow-lg hover:bg-green-50 transition-all hover:-translate-y-1"
                      >
                        View Roadmap
                        <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. MAIN INFO GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Description */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-[32px] p-8 md:p-10 shadow-lg border border-gray-100 dark:border-gray-700">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                    <span className="w-3 h-8 bg-green-500 rounded-full"></span>
                    Career Overview
                  </h3>
                  <div className="prose prose-lg dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 leading-relaxed">
                    {item.description || item.short_desc}
                    {!item.description && (
                      <p className="italic text-gray-400 mt-4">Detailed description coming soon...</p>
                    )}
                  </div>

                  {/* Premium Features Section */}
                  {item.premium_features_locked && (
                    <div className="mt-8 space-y-4">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        🔒 Thông tin chi tiết (Premium)
                      </h4>
                      
                      <div className="space-y-3">
                        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border-l-4 border-orange-500">
                          <h5 className="font-semibold text-gray-900 dark:text-white">Yêu cầu học vấn</h5>
                          <p className="text-gray-600 dark:text-gray-400">{item.education_requirements}</p>
                        </div>
                        
                        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border-l-4 border-orange-500">
                          <h5 className="font-semibold text-gray-900 dark:text-white">Mức lương</h5>
                          <p className="text-gray-600 dark:text-gray-400">{item.salary_range}</p>
                        </div>
                        
                        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border-l-4 border-orange-500">
                          <h5 className="font-semibold text-gray-900 dark:text-white">Triển vọng nghề nghiệp</h5>
                          <p className="text-gray-600 dark:text-gray-400">{item.job_outlook}</p>
                        </div>
                        
                        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border-l-4 border-orange-500">
                          <h5 className="font-semibold text-gray-900 dark:text-white">Môi trường làm việc</h5>
                          <p className="text-gray-600 dark:text-gray-400">{item.work_environment}</p>
                        </div>
                      </div>

                      <div className="mt-6 p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-orange-900 dark:text-orange-100">
                              Mở khóa thông tin đầy đủ
                            </h4>
                            <p className="text-sm text-orange-700 dark:text-orange-300">
                              Nâng cấp Premium để xem chi tiết về lương, yêu cầu, triển vọng và nhiều hơn nữa
                            </p>
                          </div>
                          <button
                            onClick={() => navigate('/pricing')}
                            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
                          >
                            Nâng Cấp
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Quick Stats */}
                <div className="space-y-6">
                  {/* Stats Card */}
                  <div className="bg-white dark:bg-gray-800 rounded-[32px] p-8 shadow-lg border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 border-b border-gray-100 dark:border-gray-700 pb-2">Quick Facts</h3>

                    <div className="space-y-6">
                      <div>
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Average Salary</div>
                        <div className="text-2xl font-extrabold text-[#4A7C59] dark:text-green-400">$60k - $120k</div>
                        <div className="text-xs text-gray-400">per year</div>
                      </div>

                      <div>
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Growth Rate</div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">+15%</span>
                          <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs px-2 py-1 rounded-full font-bold">High</span>
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Education</div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white">Bachelor's Degree</div>
                      </div>
                    </div>
                  </div>

                  {/* Skills Card */}
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-[32px] p-8 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Top Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {['Communication', 'Problem Solving', 'Teamwork', 'Analytical Skills'].map((skill, i) => (
                        <span key={i} className="px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-semibold shadow-sm border border-gray-100 dark:border-gray-600">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default CareerDetailPage;