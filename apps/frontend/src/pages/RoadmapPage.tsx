// apps/frontend/src/pages/RoadmapPage.tsx

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { roadmapService, TraitEvidence } from '../services/roadmapService';
import { careerService } from '../services/careerService';
import RoadmapTimelineComponent from '../components/roadmap/RoadmapTimelineComponent';
import { Roadmap } from '../types/roadmap';
import MainLayout from '../components/layout/MainLayout';
import SubscriptionRefresh from '../components/subscription/SubscriptionRefresh';
import { useSubscription } from '../hooks/useSubscription';
import { useUsageTracking } from '../hooks/useUsageTracking';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { mentorMatchingService, MentorMatch } from '../services/mentorMatchingService';
import ChatModal from '../components/chat/ChatModal';

const RoadmapPage = () => {
  const { groupSlug, careerIdOrSlug } = useParams<{ groupSlug: string; careerIdOrSlug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const navState = (location.state || {}) as { title?: string; description?: string };

  // Use careerIdOrSlug as the career identifier
  const careerId = careerIdOrSlug;

  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingMilestone, setCompletingMilestone] = useState<string | null>(null);
  const [careerDesc, setCareerDesc] = useState<string>('');
  const [showFullDesc, setShowFullDesc] = useState<boolean>(false);
  const [traitEvidence, setTraitEvidence] = useState<TraitEvidence | null>(null);
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [maxFreeLevel, setMaxFreeLevel] = useState(1);
  const [careerDetail, setCareerDetail] = useState<any>(null);

  const { isPremium } = useSubscription();
  const { incrementUsage } = useUsageTracking();
  const { currentPlan, hasFeature } = useFeatureAccess();
  const hasLoadedTraitEvidenceRef = useRef(false);
  const hasTrackedUsageRef = useRef(false);

  // Completed-users mentor panel
  const [completedMentors, setCompletedMentors] = useState<MentorMatch[]>([]);
  const [mentorsLoaded, setMentorsLoaded] = useState(false);
  const [chatTarget, setChatTarget] = useState<{ userId: number; name: string } | null>(null);

  useEffect(() => {
    const hasUnlimitedCareers = hasFeature('unlimited_careers');
    if (hasUnlimitedCareers) {
      setUpgradeRequired(false);
      setMaxFreeLevel(-1);
    } else if (currentPlan === 'basic') {
      setUpgradeRequired(true);
      setMaxFreeLevel(2);
    } else {
      setUpgradeRequired(true);
      setMaxFreeLevel(1);
    }
  }, [currentPlan, hasFeature]);

  const fetchRoadmap = useCallback(async () => {
    if (!careerId) return;

    console.log('🚀 Starting roadmap fetch for:', careerId);
    const startTime = Date.now();

    try {
      setLoading(true);
      setError(null);

      // Convert ONET code format for backend compatibility (dot to dash)
      const normalizedCareerId = careerId.replace(/\./g, '-');
      console.log('📝 Normalized career ID:', normalizedCareerId);

      let data: Roadmap | null = null;
      let careerData: any = null;

      // First, try to get career data to validate the career exists
      console.log('🔍 Fetching career data...');
      const careerStartTime = Date.now();
      try {
        careerData = await careerService.get(normalizedCareerId);
        console.log('✅ Career data fetched in', Date.now() - careerStartTime, 'ms');
      } catch (err: any) {
        console.error(`❌ Career not found: ${normalizedCareerId}`, err);
        setError('Không tìm thấy nghề nghiệp. Vui lòng kiểm tra lại đường dẫn.');
        return;
      }

      // Then try to get roadmap data
      console.log('🗺️ Fetching roadmap data...');
      const roadmapStartTime = Date.now();
      try {
        data = await roadmapService.getRoadmap(normalizedCareerId);
        console.log('✅ Roadmap data fetched in', Date.now() - roadmapStartTime, 'ms');
      } catch (err: any) {
        const status = err?.response?.status;
        const detail = err?.response?.data?.detail;
        console.log('⚠️ Roadmap fetch error:', status, detail);
        if (status === 404 && detail === 'Roadmap not found') {
          // Create empty roadmap structure if not found
          data = {
            careerId: normalizedCareerId,
            careerTitle: navState.title || careerData?.title_vi || careerData?.title || careerId,
            milestones: [],
            userProgress: { completed_milestones: [] },
          } as any;
          console.log('📝 Created empty roadmap structure');
        } else {
          throw err;
        }
      }

      if (!data) throw new Error('No roadmap data');

      // Set career description and title from career data or nav state
      const desc = navState.description || careerData?.short_desc || careerData?.description || '';
      setCareerDesc(desc);

      // Fetch rich career detail (skills, tasks, technology) from BFF
      if (careerData?.onet_code) {
        try {
          const detail = await careerService.getDetail(careerData.onet_code, currentPlan || 'free', 'vi');
          setCareerDetail(detail);
        } catch { /* ignore */ }
      }

      const titleOverride = navState.title || careerData?.title_vi || careerData?.title || data.careerTitle;
      data = { ...(data as any), careerTitle: titleOverride } as Roadmap;

      // Set subscription-based access levels (get fresh values inside function)
      const currentHasFeature = hasFeature('unlimited_careers');
      const currentIsPremium = isPremium;
      const currentCurrentPlan = currentPlan;

      if (currentHasFeature) {
        setUpgradeRequired(false);
        setMaxFreeLevel(-1);
      } else if (currentCurrentPlan === 'basic') {
        setUpgradeRequired(true);
        setMaxFreeLevel(2);
      } else {
        setUpgradeRequired(true);
        setMaxFreeLevel(1);
      }

      setRoadmap(data);
      console.log('✅ Roadmap set successfully');

      // Track usage for non-premium users
      if (!hasTrackedUsageRef.current && !currentIsPremium) {
        incrementUsage('roadmap_level');
        hasTrackedUsageRef.current = true;
        console.log('📊 Usage tracked');
      }

      console.log('🎉 Total roadmap fetch time:', Date.now() - startTime, 'ms');
    } catch (err) {
      console.error('❌ Error loading roadmap:', err);
      setError('Không thể tải lộ trình. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, [careerId, navState.title, navState.description]); // Simplified dependencies

  const loadTraitEvidence = useCallback(async () => {
    if (!careerId || hasLoadedTraitEvidenceRef.current) return;
    hasLoadedTraitEvidenceRef.current = true;

    console.log('🔍 Loading trait evidence for:', careerId);
    const startTime = Date.now();

    try {
      // Convert ONET code format for backend compatibility (dot to dash)
      const normalizedCareerId = careerId.replace(/\./g, '-');
      const data = await roadmapService.getTraitEvidence(normalizedCareerId);
      console.log('✅ Trait evidence loaded in', Date.now() - startTime, 'ms');
      setTraitEvidence(data);
    } catch (err: any) {
      if (err?.response?.status !== 404) {
        console.error('❌ Failed to load trait evidence', err);
      } else {
        console.log('ℹ️ No trait evidence found (404)');
      }
    }
  }, [careerId]);

  useEffect(() => {
    if (!careerId) return;
    fetchRoadmap();
    loadTraitEvidence();
  }, [careerId]); // Remove fetchRoadmap and loadTraitEvidence from dependencies to prevent infinite loop

  // Load users who completed this career's roadmap
  useEffect(() => {
    if (!roadmap?.careerTitle || mentorsLoaded) return;
    setMentorsLoaded(true);
    mentorMatchingService.findMentorsForCareer(roadmap.careerTitle, 5, careerId)
      .then(setCompletedMentors)
      .catch(() => setCompletedMentors([]));
  }, [roadmap?.careerTitle, careerId, mentorsLoaded]);

  const handleCompleteMilestone = async (milestoneId: string) => {
    if (!careerId) return;
    try {
      setCompletingMilestone(milestoneId);

      // Convert ONET code format for backend compatibility (dot to dash)
      const normalizedCareerId = careerId.replace(/\./g, '-');

      await roadmapService.completeMilestone(normalizedCareerId, milestoneId);
      // Refresh roadmap data after completing milestone
      await fetchRoadmap();
      // Refresh trait evidence after completing milestone  
      await loadTraitEvidence();
    } catch (err: any) {
      console.error('Error completing milestone:', err);
      setError(err?.response?.data?.message || 'Không thể đánh dấu hoàn thành. Vui lòng thử lại.');
    } finally {
      setCompletingMilestone(null);
    }
  };

  const totalMilestones = roadmap?.milestones?.length || 0;
  const completedCount = roadmap?.userProgress?.completed_milestones?.length || 0;
  const completionRatio = totalMilestones > 0 ? completedCount / totalMilestones : 0;
  const completionPercent = Math.round(completionRatio * 100);

  const educationHighlights = (careerDetail?.sections?.education_requirements || [])
    .filter((item: any) => Number(item.data_value || 0) > 0)
    .sort((a: any, b: any) => Number(b.data_value || 0) - Number(a.data_value || 0))
    .slice(0, 3);

  const workContextHighlights = (careerDetail?.sections?.work_context || [])
    .filter((item: any) => item.scale_id === 'CX' && Number(item.data_value || 0) >= 3)
    .sort((a: any, b: any) => Number(b.data_value || 0) - Number(a.data_value || 0))
    .slice(0, 4);

  const topPracticeActivities = (careerDetail?.sections?.detailed_work_activities || []).slice(0, 4);

  const preparationSummary = careerDetail?.sections?.preparation;

  const formatPercent = (value?: number | null) => {
    if (value === null || value === undefined) return 'Đang cập nhật';
    return `${Math.round(Number(value))}%`;
  };

  const traitGroups = [traitEvidence?.riasec, traitEvidence?.big_five].filter(Boolean) as NonNullable<TraitEvidence['riasec']>[];
  const hasTraitEvidenceItems = traitGroups.some(group => (group.items || []).length > 0);

  const handleUpgradeDetected = useCallback(() => {
    console.log('🔄 Upgrade detected, refreshing roadmap...');
    // Call fetchRoadmap directly without dependency to avoid infinite loop
    if (careerId) {
      setLoading(true);
      fetchRoadmap();
    }
  }, [careerId]); // Only depend on careerId

  return (
    <MainLayout>
      <SubscriptionRefresh onUpgradeDetected={handleUpgradeDetected} />
      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white relative overflow-x-hidden pb-20">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
          .bg-dot-pattern { background-image: radial-gradient(rgba(0,0,0,0.1) 1px, transparent 1px); background-size: 24px 24px; }
          .dark .bg-dot-pattern { background-image: radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px); }
          @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
          .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; }
          .scrollbar-hide::-webkit-scrollbar { display: none; }
          .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>

        <div className="absolute inset-0 bg-dot-pattern pointer-events-none z-0 opacity-60" />
        <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-indigo-400/5 rounded-full blur-[120px] pointer-events-none z-0" />
        <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-blue-400/5 rounded-full blur-[120px] pointer-events-none z-0" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {loading && (
            <div className="flex flex-col items-center justify-center py-32 animate-pulse">
              <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 rounded-full border-t-green-600 mb-4 animate-spin" />
              <p className="text-gray-500 font-medium">Đang tải lộ trình...</p>
            </div>
          )}

          {error && !loading && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 flex items-center gap-4 animate-fade-in-up">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center text-red-600 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-red-600 dark:text-red-300 font-medium">{error}</p>
            </div>
          )}

          {!loading && roadmap && (
            <div className="animate-fade-in-up space-y-8">
              {/* Hero Header - Career Title + Stages */}
              <div className="rounded-[32px] p-8 md:p-10 relative overflow-hidden shadow-xl" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #7c3aed 100%)' }}>
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" style={{ background: 'rgba(255,255,255,0.08)' }} />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-100/50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50 shadow-sm backdrop-blur-sm">Lộ Trình Nghề Nghiệp</span>
                  </div>
                  <h1 className="max-w-4xl text-3xl md:text-5xl font-extrabold text-white tracking-tight mb-8 leading-tight">{roadmap.careerTitle}</h1>

                  {/* Dynamic career stages based on Cột mốc count */}
                  {(() => {
                    const milestonesCount = roadmap.milestones?.length || 0;
                    const numStages = Math.max(3, Math.min(6, milestonesCount));

                    const stageLabels: { [key: number]: string[] } = {
                      3: ['Mới bắt đầu', 'Trung cấp', 'Chuyên gia'],
                      4: ['Mới bắt đầu', 'Sơ cấp', 'Trung cấp', 'Chuyên gia'],
                      5: ['Thực tập', 'Sơ cấp', 'Trung cấp', 'Chuyên gia', 'Trưởng nhóm'],
                      6: ['Thực tập', 'Sơ cấp', 'Trung cấp', 'Chuyên gia', 'Trưởng nhóm', 'Chuyên viên cao cấp'],
                    };

                    const stages: string[] = stageLabels[numStages] ?? ['Mới bắt đầu', 'Trung cấp', 'Chuyên gia'];

                    return (
                      <div className="flex overflow-x-auto pb-4 gap-6 scrollbar-hide snap-x">
                        {stages.map((label, idx) => {
                          const stageThreshold = ((idx + 1) * milestonesCount) / numStages;
                          const prevThreshold = (idx * milestonesCount) / numStages;
                          const isCompleted = completedCount >= stageThreshold;
                          const isCurrent = !isCompleted && completedCount >= prevThreshold;

                          return (
                            <div key={idx} className="flex-shrink-0 flex flex-col items-center snap-center group cursor-default">
                              <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 border-2 ${isCompleted ? 'bg-white text-indigo-900 border-white' : isCurrent ? 'bg-indigo-600 text-white border-white ring-4 ring-white/30' : 'bg-white/20 text-white border-white/40'}`}>
                                {isCompleted ? (
                                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <span className="text-lg font-bold">{idx + 1}</span>
                                )}
                                {idx < stages.length - 1 && <div className={`absolute left-full top-1/2 w-6 h-0.5 -translate-y-1/2 z-0 ${isCompleted ? 'bg-white' : 'bg-white/30'}`} />}
                              </div>
                              <span className={`mt-2 text-xs font-bold uppercase tracking-wide ${isCompleted ? 'text-white' : isCurrent ? 'text-white' : 'text-white/70'}`}>{label}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Overview - Career Description */}
              {(careerDesc || navState.description) && (
                <div className="glass rounded-[24px] p-8 shadow-xl transition-all duration-300 hover:shadow-2xl">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <span className="w-2 h-6 bg-indigo-700 rounded-full" />Tổng quan nghề
                  </h3>
                  <div className={`prose prose-green dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 leading-relaxed ${showFullDesc ? '' : 'line-clamp-3'}`}>
                    {navState.description || careerDesc}
                  </div>
                  {(navState.description || careerDesc).length > 250 && (
                    <button onClick={() => setShowFullDesc(!showFullDesc)} className="mt-4 text-sm font-bold text-indigo-800 hover:text-indigo-900 dark:text-indigo-400 hover:underline focus:outline-none">
                      {showFullDesc ? 'Thu gọn' : 'Xem thêm'}
                    </button>
                  )}
                </div>
              )}

              {/* Career planning signals from catalog */}
              {careerDetail && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="glass rounded-[24px] p-6 shadow-xl">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <span className="w-2 h-5 bg-emerald-500 rounded-full" />
                      Nền tảng nên chuẩn bị
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">Học vấn thường gặp</p>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                          {preparationSummary?.education_summary || 'Đang cập nhật'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">Kinh nghiệm trước khi vào nghề</p>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                          {preparationSummary?.experience_summary || careerDetail.sections?.overview?.experience_text || 'Đang cập nhật'}
                        </p>
                      </div>
                      {preparationSummary?.job_zone && (
                        <div className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800">
                          Mức chuẩn bị nghề: {preparationSummary.job_zone}/5
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="glass rounded-[24px] p-6 shadow-xl">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <span className="w-2 h-5 bg-sky-500 rounded-full" />
                      Tỷ lệ trình độ liên quan
                    </h3>
                    {educationHighlights.length > 0 ? (
                      <div className="space-y-3">
                        {educationHighlights.map((edu: any, i: number) => (
                          <div key={i}>
                            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                              <span className="font-semibold text-gray-700 dark:text-gray-200">{edu.category_description}</span>
                              <span className="font-bold text-sky-700 dark:text-sky-300">{formatPercent(edu.data_value)}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                              <div className="h-full rounded-full bg-sky-500" style={{ width: `${Math.min(100, Number(edu.data_value || 0))}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">Đang cập nhật dữ liệu học vấn.</p>
                    )}
                  </div>

                  <div className="glass rounded-[24px] p-6 shadow-xl">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <span className="w-2 h-5 bg-amber-500 rounded-full" />
                      Cách công việc diễn ra
                    </h3>
                    {workContextHighlights.length > 0 ? (
                      <div className="space-y-2">
                        {workContextHighlights.map((item: any, i: number) => (
                          <div key={i} className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-900/20">
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                              {item.element_name_vi || item.element_name}
                            </p>
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                              Mức độ: {Number(item.data_value || 0).toFixed(1)}/5
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">Đang cập nhật dữ liệu môi trường làm việc.</p>
                    )}
                  </div>
                </div>
              )}

              {careerDetail && topPracticeActivities.length > 0 && (
                <div className="glass rounded-[24px] p-8 shadow-xl">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                    <span className="w-2 h-6 bg-indigo-600 rounded-full" />
                    Việc nên luyện trong quá trình học
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {topPracticeActivities.map((activity: any, i: number) => (
                      <div key={i} className="rounded-2xl border border-indigo-100 bg-white/70 p-4 dark:border-indigo-900/50 dark:bg-slate-900/50">
                        <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                          {i + 1}
                        </div>
                        <p className="text-sm font-semibold leading-6 text-gray-800 dark:text-gray-100">{activity.dwa_title}</p>
                        {(activity as any).activity_category && (
                          <p className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-300">{(activity as any).activity_category}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trait Evidence - latest assessment proof */}
              {traitEvidence && (
                <section className="rounded-[24px] border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h3 className="flex items-center gap-2 text-xl font-bold text-slate-950 dark:text-white">
                        <span className="h-6 w-2 rounded-full bg-blue-600" />
                        Minh chứng từ bài đánh giá gần nhất
                      </h3>
                      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                        Hệ thống đang đối chiếu lộ trình này với các câu trả lời thuộc hai nhãn nổi bật nhất trong lần đánh giá mới nhất của bạn. Mỗi dòng bên dưới là câu hỏi thật bạn đã trả lời, kèm đáp án đã chọn.
                      </p>
                    </div>

                    {traitGroups.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {traitGroups.map((group) => (
                          <span
                            key={`${group.kind}-${group.code}`}
                            className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300"
                          >
                            {group.kind === 'riasec' ? 'RIASEC' : 'OCEAN'}: {group.code} - {group.name}
                            {group.score !== null && group.score !== undefined && (
                              <span className="rounded-full bg-white px-2 py-0.5 text-blue-600 dark:bg-slate-900 dark:text-blue-300">
                                {Number(group.score).toFixed(1)}/5
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {hasTraitEvidenceItems ? (
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                      {traitGroups.map((group) => (
                        <div key={`${group.kind}-${group.code}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950/40">
                          <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                {group.kind === 'riasec' ? 'Nhóm sở thích RIASEC nổi bật' : 'Đặc điểm OCEAN nổi bật'}
                              </p>
                              <h4 className="mt-1 text-lg font-extrabold text-slate-950 dark:text-white">
                                {group.code} - {group.name}
                              </h4>
                            </div>
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">
                              {group.items?.length || 0} câu
                            </span>
                          </div>

                          <div className="space-y-3">
                            {(group.items || []).map((item, idx) => (
                              <div
                                key={`${group.kind}-${item.question_key}-${idx}`}
                                className="rounded-xl border border-white bg-white p-4 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50/60 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-900 dark:hover:bg-blue-950/20"
                              >
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                    {item.question_key || `Câu ${idx + 1}`}
                                  </span>
                                  {item.score !== null && item.score !== undefined && (
                                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                      Điểm quy đổi: {Number(item.score).toFixed(1)}/5
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm font-semibold leading-6 text-slate-800 dark:text-slate-100">{item.question}</p>
                                <div className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                  <span className="font-bold">Bạn đã chọn:</span> {item.answer || 'Đang cập nhật'}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300">
                      Chưa có câu trả lời đủ điều kiện để hiển thị minh chứng. Hãy hoàn thành lại bài đánh giá RIASEC và OCEAN để hệ thống cập nhật phần này chính xác hơn.
                    </div>
                  )}
                </section>
              )}

              {/* Người đã hoàn thành lộ trình */}
              <div className="glass rounded-[24px] p-8 shadow-xl transition-all duration-300 hover:shadow-2xl">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-6 bg-purple-500 rounded-full" />
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Người đã hoàn thành lộ trình này</h3>
                  </div>
                  {completedMentors.length > 0 && (
                    <span className="px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-bold border border-purple-200 dark:border-purple-800">
                      {completedMentors.length} người
                    </span>
                  )}
                </div>

                {!mentorsLoaded && (
                  <div className="flex items-center gap-3 py-6 text-gray-400 text-sm">
                    <div className="w-5 h-5 border-2 border-gray-200 border-t-purple-500 rounded-full animate-spin" />
                    Đang tìm kiếm...
                  </div>
                )}

                {mentorsLoaded && completedMentors.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-3xl mb-2"></div>
                    <p className="text-sm">Chưa có ai hoàn thành lộ trình này.<br />Hãy là người đầu tiên!</p>
                    <button onClick={() => navigate('/mentor-matching')} className="mt-4 px-4 py-2 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-semibold hover:bg-purple-200 transition-colors">
                      Tìm cố vấn khác
                    </button>
                  </div>
                )}

                {mentorsLoaded && completedMentors.length > 0 && (
                  <div className="space-y-3">
                    {completedMentors.map((m, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 hover:border-purple-200 dark:hover:border-purple-700 transition-colors">
                        {/* Avatar */}
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                          {m.mentor_name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 dark:text-white text-sm truncate">{m.mentor_name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{m.current_position}</div>
                          {m.expertise_areas.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {m.expertise_areas.slice(0, 3).map((s: string) => (
                                <span key={s} className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs rounded-full">{s}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* Score + Connect */}
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <span className="text-xs font-bold text-purple-600 dark:text-purple-400">{m.compatibility_score.toFixed(0)}%</span>
                          <button
                            onClick={() => setChatTarget({ userId: m.user_id, name: m.mentor_name })}
                            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold hover:opacity-90 transition-opacity shadow"
                          >
                             Kết nối
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Learning Journey Timeline */}
              <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-indigo-700 via-indigo-600 to-sky-600 px-6 py-8 md:px-10 md:py-10">
                  <div className="absolute inset-y-0 right-0 w-1/2 bg-white/10 blur-3xl" />

                  <div className="relative z-10 grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_220px] md:items-center">
                    <div className="text-white">
                      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-50">
                        <span className="h-2 w-2 rounded-full bg-emerald-300" />Lộ trình học tập
                      </div>
                      <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Hành trình học tập của bạn</h2>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-50/85">Học từng kỹ năng theo thứ tự, mở khóa tài nguyên theo tiến độ và đánh dấu hoàn thành khi bạn đã áp dụng được vào thực tế.</p>
                    </div>

                    <div className="justify-self-start md:justify-self-end">
                      <div className="flex w-full min-w-[190px] items-center gap-4 rounded-2xl border border-white/20 bg-white/12 p-4 text-white shadow-2xl backdrop-blur-md">
                        <div className="relative h-16 w-16 flex-shrink-0">
                          <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
                            <circle cx="32" cy="32" r="26" stroke="currentColor" strokeWidth="7" fill="transparent" className="text-white/20" />
                            <circle cx="32" cy="32" r="26" stroke="currentColor" strokeWidth="7" fill="transparent" strokeDasharray={164} strokeDashoffset={164 - 164 * completionRatio} className="text-emerald-300 transition-all duration-1000 ease-out" strokeLinecap="round" />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center text-base font-black">{completionPercent}%</div>
                        </div>
                        <div>
                          <div className="text-xs font-bold uppercase tracking-wide text-indigo-100/80">Cột mốc</div>
                          <div className="mt-1 text-2xl font-black leading-none">{completedCount}<span className="ml-1 text-base text-white/60">/{totalMilestones || 0}</span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 md:p-8 bg-slate-50/70 dark:bg-slate-950/30">
                  <RoadmapTimelineComponent
                    milestones={roadmap.milestones}
                    userProgress={roadmap.userProgress}
                    onCompleteMilestone={handleCompleteMilestone}
                    completingMilestone={completingMilestone}
                    upgradeRequired={upgradeRequired}
                    maxFreeLevel={maxFreeLevel}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Real-time chat modal */}
      {chatTarget && (
        <ChatModal
          otherUserId={chatTarget.userId}
          otherName={chatTarget.name}
          onClose={() => setChatTarget(null)}
        />
      )}
    </MainLayout>
  );
};

export default RoadmapPage;
