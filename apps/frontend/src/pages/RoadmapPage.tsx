// apps/frontend/src/pages/RoadmapPage.tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { roadmapService } from '../services/roadmapService';
import { careerService } from '../services/careerService';
import RoadmapTimelineComponent from '../components/roadmap/RoadmapTimelineComponent';
import { Roadmap } from '../types/roadmap';
import MainLayout from '../components/layout/MainLayout';
import SubscriptionRefresh from '../components/subscription/SubscriptionRefresh';
import { useSubscription } from '../hooks/useSubscription';
import { useUsageTracking } from '../hooks/useUsageTracking';
import { useFeatureAccess } from '../hooks/useFeatureAccess';

// Generate career levels based on milestone count
const getCareerLevels = (milestoneCount: number) => {
  if (milestoneCount <= 3) {
    return [
      { stage: 'entry', label: 'Entry' },
      { stage: 'mid', label: 'Mid-Level' },
      { stage: 'senior', label: 'Senior' },
    ];
  } else if (milestoneCount === 4) {
    return [
      { stage: 'entry', label: 'Entry' },
      { stage: 'junior', label: 'Junior' },
      { stage: 'mid', label: 'Mid-Level' },
      { stage: 'senior', label: 'Senior' },
    ];
  } else if (milestoneCount === 5) {
    return [
      { stage: 'intern', label: 'Intern' },
      { stage: 'entry', label: 'Entry' },
      { stage: 'mid', label: 'Mid-Level' },
      { stage: 'senior', label: 'Senior' },
      { stage: 'lead', label: 'Lead' },
    ];
  } else {
    return [
      { stage: 'intern', label: 'Intern' },
      { stage: 'junior', label: 'Junior' },
      { stage: 'mid', label: 'Mid-Level' },
      { stage: 'senior', label: 'Senior' },
      { stage: 'lead', label: 'Lead' },
      { stage: 'principal', label: 'Principal' },
    ].slice(0, milestoneCount);
  }
};

const RoadmapPage = () => {
  const { careerId } = useParams<{ careerId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const navState = (location.state || {}) as { title?: string; description?: string };

  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingMilestone, setCompletingMilestone] = useState<string | null>(null);
  const [careerDesc, setCareerDesc] = useState<string>('');
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [maxFreeLevel, setMaxFreeLevel] = useState(1);

  const { isPremium } = useSubscription();
  const { incrementUsage } = useUsageTracking();
  const { currentPlan, hasFeature } = useFeatureAccess();
  const hasTrackedUsageRef = useRef(false);

  // Use refs to avoid infinite loop - these values are used inside fetchRoadmap
  // but shouldn't trigger re-fetches when they change
  const currentPlanRef = useRef(currentPlan);
  const hasFeatureRef = useRef(hasFeature);
  const isPremiumRef = useRef(isPremium);
  const incrementUsageRef = useRef(incrementUsage);

  // Keep refs updated
  useEffect(() => {
    currentPlanRef.current = currentPlan;
    hasFeatureRef.current = hasFeature;
    isPremiumRef.current = isPremium;
    incrementUsageRef.current = incrementUsage;
  }, [currentPlan, hasFeature, isPremium, incrementUsage]);

  // Update upgrade state when plan changes
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
    try {
      setLoading(true);
      setError(null);

      let data: Roadmap | null = null;

      try {
        data = await roadmapService.getRoadmap(careerId);
      } catch (err: any) {
        const status = err?.response?.status;
        const detail = err?.response?.data?.detail;
        if (status === 404 && detail === 'Roadmap not found') {
          const c = await careerService.get(careerId);
          data = {
            careerId,
            careerTitle: navState.title || (c as any).title_en || (c as any).title || careerId,
            milestones: [],
            userProgress: { completed_milestones: [] },
          } as any;
        } else {
          throw err;
        }
      }

      if (!data) throw new Error('No roadmap data');

      try {
        const c = await careerService.get(careerId);
        const desc = navState.description || (c as any).short_desc_en || (c as any).short_desc || (c as any).description || '';
        setCareerDesc(desc);
        const titleOverride = navState.title || (c as any).title_en || (c as any).title || data.careerTitle;
        data = { ...(data as any), careerTitle: titleOverride } as Roadmap;
      } catch {
        if (navState.description) setCareerDesc(navState.description);
        if (navState.title) data = { ...(data as any), careerTitle: navState.title } as Roadmap;
      }

      // Use refs to avoid dependency issues
      const hasUnlimitedCareers = hasFeatureRef.current('unlimited_careers');
      if (hasUnlimitedCareers) {
        setUpgradeRequired(false);
        setMaxFreeLevel(-1);
      } else if (currentPlanRef.current === 'basic') {
        setUpgradeRequired(true);
        setMaxFreeLevel(2);
      } else {
        setUpgradeRequired(true);
        setMaxFreeLevel(1);
      }

      setRoadmap(data);

      if (!hasTrackedUsageRef.current && !isPremiumRef.current) {
        incrementUsageRef.current('roadmap_level');
        hasTrackedUsageRef.current = true;
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load roadmap.');
    } finally {
      setLoading(false);
    }
  }, [careerId, navState.description, navState.title]);

  useEffect(() => {
    if (!careerId) return;
    fetchRoadmap();
  }, [careerId, fetchRoadmap]);

  const handleCompleteMilestone = async (milestoneId: string) => {
    if (!careerId) return;
    try {
      setCompletingMilestone(milestoneId);
      await roadmapService.completeMilestone(careerId, milestoneId);
      await fetchRoadmap();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to mark complete.');
    } finally {
      setCompletingMilestone(null);
    }
  };

  const handleUpgradeDetected = () => fetchRoadmap();

  const totalMilestones = roadmap?.milestones?.length || 0;
  const completedCount = roadmap?.userProgress?.completed_milestones?.length || 0;
  const completionRatio = totalMilestones > 0 ? completedCount / totalMilestones : 0;
  const completionPercent = Math.round(completionRatio * 100);
  const careerLevels = getCareerLevels(totalMilestones || 6);

  return (
    <MainLayout>
      <SubscriptionRefresh onUpgradeDetected={handleUpgradeDetected} />
      <div className="min-h-screen bg-[#F8F9FA] dark:bg-gray-900 font-['Plus_Jakarta_Sans'] text-gray-900 dark:text-white relative overflow-x-hidden pb-20">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
          .bg-dot-pattern { background-image: radial-gradient(#E5E7EB 1px, transparent 1px); background-size: 24px 24px; }
          .dark .bg-dot-pattern { background-image: radial-gradient(#374151 1px, transparent 1px); }
          @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
          .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; }
          .scrollbar-hide::-webkit-scrollbar { display: none; }
          .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>

        <div className="absolute inset-0 bg-dot-pattern pointer-events-none z-0 opacity-60" />
        <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-green-400/5 rounded-full blur-[120px] pointer-events-none z-0" />
        <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-blue-400/5 rounded-full blur-[120px] pointer-events-none z-0" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
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
              {/* Hero Header Card - Simplified */}
              <div className="bg-gradient-to-r from-[#4A7C59] to-[#3d6449] dark:from-green-800 dark:to-green-900 rounded-[32px] p-8 md:p-10 shadow-xl shadow-green-900/20 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                <div className="relative z-10">
                  <button onClick={() => navigate(-1)} className="mb-4 flex items-center text-green-100 hover:text-white transition-colors text-sm font-bold uppercase tracking-wide">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    Back
                  </button>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-white/30">Career Path</span>
                  </div>
                  <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">{roadmap.careerTitle}</h1>
                  {careerDesc && <p className="text-green-100/80 max-w-2xl text-lg mb-8">{careerDesc}</p>}

                  {/* Dynamic Career Levels */}
                  <div className="flex overflow-x-auto pb-4 gap-6 scrollbar-hide snap-x">
                    {careerLevels.map((item, idx) => {
                      const total = totalMilestones || careerLevels.length;
                      const stageThreshold = ((idx + 1) * total) / careerLevels.length;
                      const prevThreshold = (idx * total) / careerLevels.length;
                      const isCompleted = completedCount >= stageThreshold;
                      const isCurrent = !isCompleted && completedCount >= prevThreshold;

                      return (
                        <div key={idx} className="flex-shrink-0 flex flex-col items-center snap-center group cursor-default">
                          <div className={`relative w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 border-2 ${isCompleted ? 'bg-white text-green-700 border-white' : isCurrent ? 'bg-green-600 text-white border-white ring-4 ring-white/30' : 'bg-green-800/50 text-green-300 border-green-700/50'}`}>
                            {isCompleted ? (
                              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <span className="text-lg font-bold">{idx + 1}</span>
                            )}
                            {idx < careerLevels.length - 1 && <div className={`absolute left-full top-1/2 w-6 h-0.5 -translate-y-1/2 z-0 ${isCompleted ? 'bg-white' : 'bg-green-800'}`} />}
                          </div>
                          <span className={`mt-3 text-xs font-bold uppercase tracking-wide ${isCompleted || isCurrent ? 'text-white' : 'text-green-200/60'}`}>{item.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Live Roadmap Section */}
              <div className="relative bg-white dark:bg-gray-800 rounded-[40px] shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="relative bg-[#1a4731] dark:bg-gray-900 p-8 md:p-12 overflow-hidden">
                  <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
                    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
                    </svg>
                  </div>
                  <div className="absolute -right-10 -top-10 w-64 h-64 bg-green-500/20 rounded-full blur-3xl" />

                  <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="text-white text-center md:text-left">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 border border-green-400/30 text-green-300 text-xs font-bold uppercase tracking-wider mb-4">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />Live Roadmap
                      </div>
                      <h2 className="text-3xl md:text-4xl font-extrabold mb-2 tracking-tight">Your Learning Journey</h2>
                      <p className="text-green-100/80 max-w-lg text-lg">Master skills one step at a time. Track your progress and reach your career goals.</p>
                    </div>

                    <div className="flex items-center gap-6 bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
                      <div className="relative w-20 h-20 flex-shrink-0">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-green-900/50" />
                          <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={226} strokeDashoffset={226 - 226 * completionRatio} className="text-green-400 transition-all duration-1000 ease-out" strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center flex-col text-white">
                          <span className="text-xl font-bold">{completionPercent}%</span>
                        </div>
                      </div>
                      <div className="text-white">
                        <div className="text-xs text-green-300 font-bold uppercase tracking-wide">Milestones</div>
                        <div className="text-2xl font-bold">{completedCount}<span className="text-white/50 text-lg ml-1">/{totalMilestones || 0}</span></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-8 md:p-12 bg-gray-50/50 dark:bg-gray-800/50">
                  {upgradeRequired && (
                    <div className="mb-8 relative overflow-hidden bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 rounded-2xl p-6 text-white shadow-2xl">
                      <div className="absolute inset-0 opacity-20">
                        <div className="absolute inset-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}></div>
                      </div>
                      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-2xl">✨</span>
                          </div>
                          <div className="flex-1">
                            <h3 className="text-xl font-bold mb-2">
                              {maxFreeLevel === 1 ? 'Upgrade to view full roadmap' : 'Unlock complete learning path'}
                            </h3>
                            <p className="text-white/90 text-sm mb-3">
                              {maxFreeLevel === 1 ? (
                                <>You are viewing <span className="font-semibold">Level 1 (Free)</span>. Upgrade to <span className="font-semibold">Basic (99k)</span> for Level 1-2 or <span className="font-semibold">Premium (299k)</span> for all <span className="font-semibold">{totalMilestones} levels</span>.</>
                              ) : maxFreeLevel === 2 ? (
                                <>You are viewing <span className="font-semibold">Level 1-2 (Basic)</span>. Upgrade to <span className="font-semibold">Premium (299k)</span> for all <span className="font-semibold">{totalMilestones} levels</span> with advanced resources.</>
                              ) : (
                                <>You are viewing <span className="font-semibold">{maxFreeLevel} levels (Free)</span>. Upgrade for all <span className="font-semibold">{totalMilestones} levels</span> with advanced resources.</>
                              )}
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                              {['🎯 In-depth learning materials', '📚 Courses and practical exercises', '🔄 Continuous content updates', '💬 Premium community support'].map((benefit, index) => (
                                <div key={index} className="flex items-center gap-2 text-white/80"><span>{benefit}</span></div>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 w-full md:w-auto">
                          <button onClick={() => navigate('/pricing')} className="px-6 py-3 bg-white text-purple-600 font-bold rounded-xl hover:bg-gray-100 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            {maxFreeLevel === 1 ? 'View Plans' : 'Upgrade to Premium'}<span>⚡</span>
                          </button>
                          <p className="text-white/70 text-xs text-center">
                            {maxFreeLevel === 1 ? 'From 99k (Basic) - 299k (Premium)' : 'Only 299,000đ'}
                          </p>
                        </div>
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
    </MainLayout>
  );
};

export default RoadmapPage;
