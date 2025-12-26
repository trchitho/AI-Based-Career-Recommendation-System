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
  const [showFullDesc, setShowFullDesc] = useState<boolean>(false);
  const [traitEvidence, setTraitEvidence] = useState<TraitEvidence | null>(null);
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [maxFreeLevel, setMaxFreeLevel] = useState(1);

  const { isPremium } = useSubscription();
  const { incrementUsage } = useUsageTracking();
  const { currentPlan, hasFeature } = useFeatureAccess();
  const hasLoadedTraitEvidenceRef = useRef(false);
  const hasTrackedUsageRef = useRef(false);

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
        const desc = navState.description || (c as any).short_desc_en || (c as any).description || (c as any).short_desc || '';
        setCareerDesc(desc);
        const titleOverride = navState.title || (c as any).title_en || (c as any).title || data.careerTitle;
        data = { ...(data as any), careerTitle: titleOverride } as Roadmap;
      } catch {
        if (navState.description) setCareerDesc(navState.description);
        if (navState.title) data = { ...(data as any), careerTitle: navState.title } as Roadmap;
      }

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

      setRoadmap(data);

      if (!hasTrackedUsageRef.current && !isPremium) {
        incrementUsage('roadmap_level');
        hasTrackedUsageRef.current = true;
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load roadmap.');
    } finally {
      setLoading(false);
    }
  }, [careerId, navState.description, navState.title, currentPlan]);

  const loadTraitEvidence = useCallback(async () => {
    if (!careerId || hasLoadedTraitEvidenceRef.current) return;
    hasLoadedTraitEvidenceRef.current = true;
    try {
      const data = await roadmapService.getTraitEvidence(careerId);
      setTraitEvidence(data);
    } catch (err: any) {
      if (err?.response?.status !== 404) console.error('Failed to load trait evidence', err);
    }
  }, [careerId]);

  useEffect(() => {
    if (!careerId) return;
    fetchRoadmap();
    loadTraitEvidence();
  }, [careerId, fetchRoadmap, loadTraitEvidence]);

  const handleCompleteMilestone = async (milestoneId: string) => {
    if (!careerId) return;
    try {
      setCompletingMilestone(milestoneId);
      await roadmapService.completeMilestone(careerId, milestoneId);
      await fetchRoadmap();
      await loadTraitEvidence();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to mark complete.');
    } finally {
      setCompletingMilestone(null);
    }
  };

  const totalMilestones = roadmap?.milestones?.length || 0;
  const completedCount = roadmap?.userProgress?.completed_milestones?.length || 0;
  const completionRatio = totalMilestones > 0 ? completedCount / totalMilestones : 0;
  const completionPercent = Math.round(completionRatio * 100);

  const handleUpgradeDetected = () => fetchRoadmap();

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
              <div className="bg-gradient-to-r from-[#4A7C59] to-[#3d6449] dark:from-green-800 dark:to-green-900 rounded-[32px] p-8 md:p-10 shadow-xl shadow-green-900/20 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-white/30">Career Path</span>
                  </div>
                  <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-8">{roadmap.careerTitle}</h1>

                  {/* Dynamic career stages based on milestones count */}
                  {(() => {
                    const milestonesCount = roadmap.milestones?.length || 0;
                    const numStages = Math.max(3, Math.min(6, milestonesCount || 3));

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
                              <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 border-2 ${isCompleted ? 'bg-white text-green-700 border-white' : isCurrent ? 'bg-green-600 text-white border-white ring-4 ring-white/30' : 'bg-green-800/50 text-green-300 border-green-700/50'}`}>
                                {isCompleted ? (
                                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <span className="text-lg font-bold">{idx + 1}</span>
                                )}
                                {idx < stages.length - 1 && <div className={`absolute left-full top-1/2 w-6 h-0.5 -translate-y-1/2 z-0 ${isCompleted ? 'bg-white' : 'bg-green-800'}`} />}
                              </div>
                              <span className={`mt-2 text-xs font-bold uppercase tracking-wide ${isCompleted || isCurrent ? 'text-white' : 'text-green-200/60'}`}>{label}</span>
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
                <div className="bg-white dark:bg-gray-800 rounded-[24px] p-8 shadow-lg border border-gray-100 dark:border-gray-700">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <span className="w-2 h-6 bg-green-500 rounded-full" />Overview
                  </h3>
                  <div className={`prose prose-green dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 leading-relaxed ${showFullDesc ? '' : 'line-clamp-3'}`}>
                    {navState.description || careerDesc}
                  </div>
                  {(navState.description || careerDesc).length > 250 && (
                    <button onClick={() => setShowFullDesc(!showFullDesc)} className="mt-4 text-sm font-bold text-green-600 hover:text-green-700 dark:text-green-400 hover:underline focus:outline-none">
                      {showFullDesc ? 'Show Less' : 'Read More'}
                    </button>
                  )}
                </div>
              )}

              {/* Trait Evidence - Why this career matches */}
              {traitEvidence && (
                <div className="bg-white dark:bg-gray-800 rounded-[24px] p-8 shadow-lg border border-gray-100 dark:border-gray-700">
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

              {/* Learning Journey Timeline */}
              <div className="relative bg-white dark:bg-gray-800 rounded-[32px] shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="relative bg-[#1a4731] dark:bg-gray-900 p-8 md:p-10 overflow-hidden">
                  <div className="absolute -right-10 -top-10 w-64 h-64 bg-green-500/20 rounded-full blur-3xl" />

                  <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-white text-center md:text-left">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 border border-green-400/30 text-green-300 text-xs font-bold uppercase tracking-wider mb-4">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />Live Roadmap
                      </div>
                      <h2 className="text-2xl md:text-3xl font-extrabold mb-2 tracking-tight">Your Learning Journey</h2>
                      <p className="text-green-100/80 max-w-lg">Master skills one step at a time. Track your progress and reach your career goals.</p>
                    </div>

                    <div className="flex items-center gap-4 bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
                      <div className="relative w-16 h-16 flex-shrink-0">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-green-900/50" />
                          <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={176} strokeDashoffset={176 - 176 * completionRatio} className="text-green-400 transition-all duration-1000 ease-out" strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center flex-col text-white">
                          <span className="text-lg font-bold">{completionPercent}%</span>
                        </div>
                      </div>
                      <div className="text-white">
                        <div className="text-xs text-green-300 font-bold uppercase tracking-wide">Milestones</div>
                        <div className="text-xl font-bold">{completedCount}<span className="text-white/50 text-base ml-1">/{totalMilestones || 0}</span></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-8 md:p-10 bg-gray-50/50 dark:bg-gray-800/50">
                  {upgradeRequired && (
                    <div className="mb-6 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg">
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-xl">✨</span>
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
    </MainLayout>
  );
};

export default RoadmapPage;
