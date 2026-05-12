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
import { getRIASECFullName } from '../utils/riasec';
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
        setError('Career not found. Please check the URL and try again.');
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
            careerTitle: navState.title || careerData?.title_en || careerData?.title || careerId,
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
      const desc = navState.description || careerData?.short_desc_en || careerData?.description || careerData?.short_desc || '';
      setCareerDesc(desc);

      const titleOverride = navState.title || careerData?.title_en || careerData?.title || data.careerTitle;
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
      setError('Failed to load roadmap. Please try again later.');
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
      setError(err?.response?.data?.message || 'Failed to mark milestone as complete.');
    } finally {
      setCompletingMilestone(null);
    }
  };

  const totalMilestones = roadmap?.milestones?.length || 0;
  const completedCount = roadmap?.userProgress?.completed_milestones?.length || 0;
  const completionRatio = totalMilestones > 0 ? completedCount / totalMilestones : 0;
  const completionPercent = Math.round(completionRatio * 100);

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
              <p className="text-gray-500 font-medium">Loading your roadmap...</p>
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
              <div className="glass rounded-[32px] p-8 md:p-10 relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" style={{ background: 'rgba(255,255,255,0.08)' }} />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-100/50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50 shadow-sm backdrop-blur-sm">Lộ Trình Nghề Nghiệp</span>
                  </div>
                  <h1 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-teal-500 tracking-tight mb-8 w-fit">{roadmap.careerTitle}</h1>

                  {/* Dynamic career stages based on milestones count */}
                  {(() => {
                    const milestonesCount = roadmap.milestones?.length || 0;
                    const numStages = Math.max(3, Math.min(6, milestonesCount));

                    const stageLabels: { [key: number]: string[] } = {
                      3: ['Entry', 'Mid-Level', 'Senior'],
                      4: ['Entry', 'Junior', 'Mid-Level', 'Senior'],
                      5: ['Intern', 'Junior', 'Mid-Level', 'Senior', 'Lead'],
                      6: ['Intern', 'Junior', 'Mid-Level', 'Senior', 'Lead', 'Principal'],
                    };

                    const stages: string[] = stageLabels[numStages] ?? ['Entry', 'Mid-Level', 'Senior'];

                    return (
                      <div className="flex overflow-x-auto pb-4 gap-6 scrollbar-hide snap-x">
                        {stages.map((label, idx) => {
                          const stageThreshold = ((idx + 1) * milestonesCount) / numStages;
                          const prevThreshold = (idx * milestonesCount) / numStages;
                          const isCompleted = completedCount >= stageThreshold;
                          const isCurrent = !isCompleted && completedCount >= prevThreshold;

                          return (
                            <div key={idx} className="flex-shrink-0 flex flex-col items-center snap-center group cursor-default">
                              <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 border-2 ${isCompleted ? 'bg-white text-indigo-900 border-white' : isCurrent ? 'bg-indigo-800 text-white border-white ring-4 ring-white/30' : 'bg-indigo-950/50 text-indigo-300 border-indigo-800/50'}`}>
                                {isCompleted ? (
                                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <span className="text-lg font-bold">{idx + 1}</span>
                                )}
                                {idx < stages.length - 1 && <div className={`absolute left-full top-1/2 w-6 h-0.5 -translate-y-1/2 z-0 ${isCompleted ? 'bg-white' : 'bg-indigo-950'}`} />}
                              </div>
                              <span className="mt-2 text-xs font-bold uppercase tracking-wide" style={{ color: isCompleted || isCurrent ? 'var(--neu-btn-text, #ffffff)' : 'rgba(255,255,255,0.45)' }}>{label}</span>
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
                    <span className="w-2 h-6 bg-indigo-700 rounded-full" />Overview
                  </h3>
                  <div className={`prose prose-green dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 leading-relaxed ${showFullDesc ? '' : 'line-clamp-3'}`}>
                    {navState.description || careerDesc}
                  </div>
                  {(navState.description || careerDesc).length > 250 && (
                    <button onClick={() => setShowFullDesc(!showFullDesc)} className="mt-4 text-sm font-bold text-indigo-800 hover:text-indigo-900 dark:text-indigo-400 hover:underline focus:outline-none">
                      {showFullDesc ? 'Show Less' : 'Read More'}
                    </button>
                  )}
                </div>
              )}

              {/* Trait Evidence - Why this career matches */}
              {traitEvidence && (
                <div className="glass rounded-[24px] p-8 shadow-xl transition-all duration-300 hover:shadow-2xl">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <span className="w-2 h-6 bg-blue-500 rounded-full" />How your assessment supports this career match
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Below are some example items from the <span className="font-semibold">{getRIASECFullName(traitEvidence.scale)}</span> scales that were used when computing your profile.
                  </p>
                  <ul className="space-y-2">
                    {traitEvidence.items.map((q, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-gray-700 dark:text-gray-300 text-sm">
                        <span className="mt-1 w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>
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
                      Tìm Mentor khác →
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
              <div className="relative glass rounded-[32px] shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl">
                <div className="relative bg-indigo-900/60 dark:bg-gray-900/60 p-8 md:p-10 overflow-hidden border-b border-white/10 backdrop-blur-md">
                  <div className="absolute -right-10 -top-10 w-64 h-64 bg-indigo-700/20 rounded-full blur-3xl" />

                  <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-white text-center md:text-left">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-700/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-4">
                        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />Live Roadmap
                      </div>
                      <h2 className="text-2xl md:text-3xl font-extrabold mb-2 tracking-tight">Your Learning Journey</h2>
                      <p className="text-indigo-100/80 max-w-lg">Master skills one step at a time. Track your progress and reach your career goals.</p>
                    </div>

                    <div className="flex items-center gap-4 bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
                      <div className="relative w-16 h-16 flex-shrink-0">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-indigo-950/50" />
                          <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={176} strokeDashoffset={176 - 176 * completionRatio} className="text-indigo-400 transition-all duration-1000 ease-out" strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center flex-col text-white">
                          <span className="text-lg font-bold">{completionPercent}%</span>
                        </div>
                      </div>
                      <div className="text-white">
                        <div className="text-xs text-indigo-300 font-bold uppercase tracking-wide">Milestones</div>
                        <div className="text-xl font-bold">{completedCount}<span className="text-white/50 text-base ml-1">/{totalMilestones || 0}</span></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-8 md:p-10 bg-white/30 dark:bg-gray-800/30">
                  {upgradeRequired && (
                    <div className="mb-6 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg">
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-xl"></span>
                          </div>
                          <div>
                            <h3 className="text-lg font-bold mb-1">
                              {maxFreeLevel === 1 ? 'Upgrade to view full roadmap' : 'Unlock full learning roadmap'}
                            </h3>
                            <p className="text-white/90 text-sm">
                              {maxFreeLevel === 1
                                ? `You are viewing Level 1 (Free). Upgrade to access all ${totalMilestones} levels.`
                                : `You are viewing Level 1-2. Upgrade to Premium to access all ${totalMilestones} levels.`
                              }
                            </p>
                          </div>
                        </div>
                        <button onClick={() => navigate('/pricing')} className="px-5 py-2.5 bg-white text-purple-600 font-bold rounded-xl hover:bg-gray-100 transition-all shadow-lg flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          View Plans
                        </button>
                      </div>
                    </div>
                  )}

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
