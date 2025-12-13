// apps/frontend/src/pages/RoadmapPage.tsx

import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { roadmapService, TraitEvidence } from '../services/roadmapService';
import { careerService } from '../services/careerService';
import RoadmapTimelineComponent from '../components/roadmap/RoadmapTimelineComponent';
import RoadmapFooter from '../components/roadmap/RoadmapFooter';
import { Roadmap } from '../types/roadmap';
import MainLayout from '../components/layout/MainLayout';
import SubscriptionRefresh from '../components/subscription/SubscriptionRefresh';
import EnterpriseRoadmapFeatures from '../components/enterprise/EnterpriseRoadmapFeatures';
import { useSubscription } from '../hooks/useSubscription';


const buildGenericMilestones = (): any[] => [
  {
    order: 1,
    skillName: 'Learning foundations',
    description: 'Build strong habits for learning and retaining new skills.',
    estimatedDuration: '2-3 weeks',
    resources: [
      {
        url: 'https://www.coursera.org/learn/learning-how-to-learn',
        type: 'course',
        title: 'Learning How to Learn',
      },
      {
        url: 'https://www.coursera.org/learn/mindshift',
        type: 'course',
        title: 'Mindshift: Break Through Obstacles to Learning',
      },
    ],
  },
  {
    order: 2,
    skillName: 'Communication & teamwork',
    description: 'Improve communication, collaboration and feedback skills.',
    estimatedDuration: '3-4 weeks',
    resources: [
      {
        url: 'https://www.coursera.org/learn/wharton-communication-skills',
        type: 'course',
        title: 'Improving Communication Skills',
      },
      {
        url: 'https://www.edx.org/course/communication-skills-and-teamwork',
        type: 'course',
        title: 'Communication Skills and Teamwork',
      },
    ],
  },
  {
    order: 3,
    skillName: 'Problem solving & critical thinking',
    description: 'Practice structured thinking and real-world problem solving.',
    estimatedDuration: '3-4 weeks',
    resources: [
      {
        url: 'https://www.coursera.org/learn/critical-thinking-skills',
        type: 'course',
        title: 'Creative Problem Solving',
      },
      {
        url: 'https://www.edx.org/course/critical-thinking-reasoned-decision-making',
        type: 'course',
        title: 'Critical Thinking & Reasoned Decision Making',
      },
    ],
  },
  {
    order: 4,
    skillName: 'Project & time management',
    description: 'Plan, execute and deliver small projects on time.',
    estimatedDuration: '2-3 weeks',
    resources: [
      {
        url: 'https://www.coursera.org/learn/work-smarter-not-harder',
        type: 'course',
        title: 'Work Smarter, Not Harder',
      },
      {
        url: 'https://www.coursera.org/specializations/project-management',
        type: 'course',
        title: 'Project Management Principles and Practices',
      },
    ],
  },
  {
    order: 5,
    skillName: 'Leadership basics',
    description: 'Develop core leadership behaviours for modern workplaces.',
    estimatedDuration: '3-4 weeks',
    resources: [
      {
        url: 'https://online.hbs.edu/courses/leadership-principles/',
        type: 'course',
        title: 'Leadership Principles',
      },
      {
        url: 'https://www.coursera.org/learn/foundations-of-everyday-leadership',
        type: 'course',
        title: 'Foundations of Everyday Leadership',
      },
    ],
  },
  {
    order: 6,
    skillName: 'Career specialization',
    description:
      'Deepen expertise in a specialization related to your chosen career.',
    estimatedDuration: '4-6 weeks',
    resources: [
      {
        url: 'https://www.coursera.org/browse',
        type: 'catalog',
        title: 'Browse role-based learning paths on Coursera',
      },
      {
        url: 'https://www.edx.org/learn',
        type: 'catalog',
        title: 'Browse professional certificates on edX',
      },
    ],
  },
];

const withFallbackMilestones = (roadmap: Roadmap): Roadmap => {
  const count = roadmap.milestones?.length ?? 0;
  if (count >= 6) return roadmap;

  // Tạm thời dùng generic 6 step nếu roadmap còn ít / trống
  return {
    ...(roadmap as any),
    milestones: buildGenericMilestones(),
  } as Roadmap;
};

const RoadmapPage = () => {
  const { careerId } = useParams<{ careerId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const navState = (location.state || {}) as {
    title?: string;
    description?: string;
  };

  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingMilestone, setCompletingMilestone] =
    useState<string | null>(null);
  const [careerDesc, setCareerDesc] = useState<string>('');
  const [showFullDesc, setShowFullDesc] = useState<boolean>(false);
  const [traitEvidence, setTraitEvidence] = useState<TraitEvidence | null>(
    null,
  );
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [maxFreeLevel, setMaxFreeLevel] = useState(1);
  
  // Subscription management
  const { subscriptionData, isPremium } = useSubscription();

  // Immediate check for premium status (runs on every render)
  React.useEffect(() => {
    if (subscriptionData) {
      const limits = subscriptionData?.subscription?.limits;
      const roadmapMaxLevel = limits?.['roadmap_max_level'];
      const isApiPremium = subscriptionData?.subscription?.is_premium;
      
      // Force check premium status
      const shouldBeUnlocked = roadmapMaxLevel === -1 || isApiPremium === true || isPremium;
      
      if (shouldBeUnlocked && upgradeRequired) {
        console.log('🔓 FORCE UNLOCKING - Premium detected but still locked!');
        setUpgradeRequired(false);
        setMaxFreeLevel(-1);
      }
    }
  }); // No dependencies = runs on every render


  




  useEffect(() => {
    if (!careerId) return;
    fetchRoadmap();
    loadTraitEvidence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [careerId]);

  // Watch for subscription changes and update roadmap access
  useEffect(() => {
    if (!subscriptionData) return;
    
    const limits = subscriptionData?.subscription?.limits;
    const roadmapMaxLevel = limits?.['roadmap_max_level'];
    const isApiPremium = subscriptionData?.subscription?.is_premium;
    
    console.log('🔍 Subscription Update:', { limits, roadmapMaxLevel, isApiPremium, isPremium });
    
    // Check if user has premium access
    if (roadmapMaxLevel === -1 || isApiPremium === true || isPremium) {
      console.log('✅ Premium access detected - unlocking all levels');
      setUpgradeRequired(false);
      setMaxFreeLevel(-1);
    } else {
      console.log('❌ Free access - limiting to level', roadmapMaxLevel || 1);
      setUpgradeRequired(true);
      setMaxFreeLevel(roadmapMaxLevel || 1);
    }
  }, [subscriptionData, isPremium]);



  const fetchRoadmap = async () => {
    if (!careerId) return;
    try {
      setLoading(true);
      setError(null);

      let data: Roadmap | null = null;

      // 1) Thử load roadmap động
      try {
        data = await roadmapService.getRoadmap(careerId);
      } catch (err: any) {
        const status = err?.response?.status;
        const detail = err?.response?.data?.detail;

        if (status === 404 && detail === 'Roadmap not found') {
          // fallback skeleton nếu chưa có roadmap trong DB
          const c = await careerService.get(careerId);
          data = {
            careerId,
            careerTitle:
              navState.title ||
              (c as any).title_en ||
              (c as any).title ||
              careerId,
            milestones: [],
            userProgress: { completed_milestones: [] },
          } as any;
        } else {
          throw err;
        }
      }

      if (!data) {
        throw new Error('No roadmap data');
      }

      // 2) Load mô tả nghề (ưu tiên EN, sau đó tới VN, sau cùng là state)
      try {
        const c = await careerService.get(careerId);
        const desc =
          navState.description ||
          (c as any).short_desc_en ||
          (c as any).description ||
          (c as any).short_desc ||
          '';
        setCareerDesc(desc);

        const titleOverride =
          navState.title ||
          (c as any).title_en ||
          (c as any).title ||
          data.careerTitle;

        data = { ...(data as any), careerTitle: titleOverride } as Roadmap;
      } catch {
        // nếu fail, vẫn dùng title có sẵn + desc từ navState
        if (navState.description) setCareerDesc(navState.description);
        if (navState.title) {
          data = { ...(data as any), careerTitle: navState.title } as Roadmap;
        }
      }

      // 3) Fallback 6 step × 2 khóa học nếu milestones quá ít
      const normalized = withFallbackMilestones(data);
      
      // Use subscription limits directly from API
      const limits = subscriptionData?.subscription?.limits;
      const roadmapMaxLevel = limits?.['roadmap_max_level'];
      const isApiPremium = subscriptionData?.subscription?.is_premium;
      
      console.log('API Limits:', { limits, roadmapMaxLevel, isApiPremium });
      
      // If roadmap_max_level is -1, user has unlimited access (Premium)
      if (roadmapMaxLevel === -1 || isApiPremium) {
        setUpgradeRequired(false);
        setMaxFreeLevel(-1);
        console.log('✅ Premium detected from API limits');
      } else {
        // Use the actual limit from API, default to 1 for free users
        const actualLimit = roadmapMaxLevel || 1;
        setUpgradeRequired(true);
        setMaxFreeLevel(actualLimit);
        console.log('❌ Free user, limit:', actualLimit);
      }
      
      setRoadmap(normalized);
    } catch (err) {
      console.error(err);
      setError('Failed to load roadmap.');
    } finally {
      setLoading(false);
    }
  };

  const loadTraitEvidence = async () => {
    try {
      const data = await roadmapService.getTraitEvidence();
      setTraitEvidence(data);
    } catch {
      // không critical
    }
  };

  const handleCompleteMilestone = async (milestoneId: string) => {
    if (!careerId) return;
    try {
      setCompletingMilestone(milestoneId);
      await roadmapService.completeMilestone(careerId, milestoneId);
      await fetchRoadmap();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to mark complete.');
    } finally {
      setCompletingMilestone(null);
    }
  };

  const totalMilestones = roadmap?.milestones?.length || 0;
  const completedCount = roadmap?.userProgress?.completed_milestones?.length || 0;
  const completionRatio = totalMilestones > 0 ? completedCount / totalMilestones : 0;
  const completionPercent = Math.round(completionRatio * 100);

  const handleUpgradeDetected = () => {
    // Refresh roadmap data when upgrade is detected
    fetchRoadmap();
  };

  return (
    <MainLayout>

      <SubscriptionRefresh onUpgradeDetected={handleUpgradeDetected} />
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
          @keyframes fade-in-up { 
            0% { opacity: 0; transform: translateY(20px); } 
            100% { opacity: 1; transform: translateY(0); } 
          }
          .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; }
          .scrollbar-hide::-webkit-scrollbar { display: none; }
          .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>

        {/* Background Layers */}
        <div className="absolute inset-0 bg-dot-pattern pointer-events-none z-0 opacity-60" />
        <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-green-400/5 rounded-full blur-[120px] pointer-events-none z-0" />
        <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-blue-400/5 rounded-full blur-[120px] pointer-events-none z-0" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* LOADING */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-32 animate-pulse">
              <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 rounded-full border-t-green-600 mb-4 animate-spin" />
              <p className="text-gray-500 font-medium">
                Loading your roadmap...
              </p>
            </div>
          )}

          {/* ERROR */}
          {error && !loading && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 flex items-center gap-4 animate-fade-in-up">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center text-red-600 shrink-0">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-red-600 dark:text-red-300 font-medium">
                {error}
              </p>
            </div>
          )}

          {/* CONTENT */}
          {!loading && roadmap && (
            <div className="animate-fade-in-up space-y-8">
              {/* 1. HERO HEADER CARD */}
              <div className="bg-gradient-to-r from-[#4A7C59] to-[#3d6449] dark:from-green-800 dark:to-green-900 rounded-[32px] p-8 md:p-10 shadow-xl shadow-green-900/20 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-white/30">
                      Career Path
                    </span>
                  </div>

                  <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-8">
                    {roadmap.careerTitle}
                  </h1>

                  {/* Career Stages – horizontal scroll */}
                  <div className="flex overflow-x-auto pb-4 gap-6 scrollbar-hide snap-x">
                    {[
                      { stage: 'intern', label: 'Intern' },
                      { stage: 'junior', label: 'Junior' },
                      { stage: 'mid', label: 'Mid-Level' },
                      { stage: 'senior', label: 'Senior' },
                      { stage: 'lead', label: 'Lead' },
                      { stage: 'principal', label: 'Principal' },
                    ].map((item, idx) => {
                      const total = totalMilestones || 6;
                      const stageThreshold = ((idx + 1) * total) / 6;
                      const prevThreshold = (idx * total) / 6;

                      const isCompleted = completedCount >= stageThreshold;
                      const isCurrent =
                        !isCompleted && completedCount >= prevThreshold;

                      return (
                        <div
                          key={idx}
                          className="flex-shrink-0 flex flex-col items-center snap-center group cursor-default"
                        >
                          <div
                            className={`relative w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 border-2 ${
                              isCompleted
                                ? 'bg-white text-green-700 border-white'
                                : isCurrent
                                ? 'bg-green-600 text-white border-white ring-4 ring-white/30'
                                : 'bg-green-800/50 text-green-300 border-green-700/50'
                            }`}
                          >
                            {isCompleted ? (
                              <svg
                                className="w-8 h-8"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            ) : (
                              <span className="text-lg font-bold">
                                {idx + 1}
                              </span>
                            )}

                            {idx < 5 && (
                              <div
                                className={`absolute left-full top-1/2 w-6 h-0.5 -translate-y-1/2 z-0 ${
                                  isCompleted ? 'bg-white' : 'bg-green-800'
                                }`}
                              />
                            )}
                          </div>
                          <span
                            className={`mt-3 text-xs font-bold uppercase tracking-wide ${
                              isCompleted || isCurrent
                                ? 'text-white'
                                : 'text-green-200/60'
                            }`}
                          >
                            {item.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 2. INFO GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-8">
                  {/* Description */}
                  {(careerDesc || navState.description) && (
                    <div className="bg-white dark:bg-gray-800 rounded-[32px] p-8 shadow-lg border border-gray-100 dark:border-gray-700">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <span className="w-2 h-6 bg-green-500 rounded-full" />
                        Overview
                      </h3>
                      <div
                        className={`prose prose-green dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 leading-relaxed ${
                          showFullDesc ? '' : 'line-clamp-3'
                        }`}
                      >
                        {navState.description || careerDesc}
                      </div>
                      {(navState.description || careerDesc).length > 250 && (
                        <button
                          onClick={() => setShowFullDesc(!showFullDesc)}
                          className="mt-4 text-sm font-bold text-green-600 hover:text-green-700 dark:text-green-400 hover:underline focus:outline-none"
                        >
                          {showFullDesc ? 'Show Less' : 'Read More'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Requirements */}
                  <div className="bg-white dark:bg-gray-800 rounded-[32px] p-8 shadow-lg border border-gray-100 dark:border-gray-700">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                      <span className="w-2 h-6 bg-blue-500 rounded-full" />
                      Key Requirements
                    </h3>
                    <div className="space-y-4">
                      {[
                        'Strong communication and interpersonal skills',
                        'Ability to work independently and as part of a team',
                        'Problem-solving and analytical thinking abilities',
                        'Adaptability and willingness to learn new technologies',
                      ].map((req, idx) => (
                        <div
                          key={idx}
                          className="flex items-start p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 mt-0.5 mr-4">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                          <span className="text-gray-700 dark:text-gray-300 font-medium">
                            {req}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Trait evidence (assessment -> career link) */}
                  {traitEvidence && (
                    <div className="bg-white dark:bg-gray-800 rounded-[32px] p-8 shadow-lg border border-gray-100 dark:border-gray-700">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                        How your assessment supports this career match
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Below are some example items from the{' '}
                        <span className="font-semibold">
                          {traitEvidence.scale}
                        </span>{' '}
                        scales that were used when computing your profile.
                      </p>
                      <ul className="list-disc list-inside space-y-2">
                        {traitEvidence.items.map((q, idx) => (
                          <li
                            key={idx}
                            className="text-gray-700 dark:text-gray-300 text-sm"
                          >
                            {q}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Right Column */}
                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-[24px] border border-gray-200 dark:border-gray-700 text-center">
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                        Experience
                      </p>
                      <p className="text-lg font-extrabold text-gray-900 dark:text-white">
                        {(roadmap as any).overview?.experienceText ||
                          '6 mo - 1 yr'}
                      </p>
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-[24px] border border-gray-200 dark:border-gray-700 text-center">
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                        Degree
                      </p>
                      <p className="text-lg font-extrabold text-gray-900 dark:text-white">
                        {(roadmap as any).overview?.degreeText || 'Bachelor'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-900 dark:bg-gray-800 p-8 rounded-[32px] shadow-xl text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/20 rounded-full blur-3xl -mr-10 -mt-10" />
                    <h3 className="text-lg font-bold mb-6 relative z-10">
                      Salary Range
                    </h3>

                    <div className="space-y-6 relative z-10">
                      <div>
                        <div className="flex justify-between text-sm mb-1 text-gray-400">
                          Entry Level
                        </div>
                        <div className="text-2xl font-extrabold">
                          $40K - $60K
                        </div>
                      </div>
                      <div className="w-full h-px bg-gray-700" />
                      <div>
                        <div className="flex justify-between text-sm mb-1 text-green-400 font-bold">
                          Senior Level
                        </div>
                        <div className="text-3xl font-extrabold text-green-400">
                          $80K - $120K
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-[32px] p-8 shadow-lg border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
                      Top Skills
                    </h3>
                    <div className="space-y-4">
                      {[
                        { n: 'Technical Skills', p: 75 },
                        { n: 'Communication', p: 60 },
                        { n: 'Leadership', p: 40 },
                      ].map((s, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-xs font-bold mb-1.5">
                            <span className="text-gray-600 dark:text-gray-300">
                              {s.n}
                            </span>
                            <span className="text-green-600">{s.p}%</span>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full transition-all duration-1000"
                              style={{ width: `${s.p}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. DETAILED LEARNING PATH */}
              <div className="relative bg-white dark:bg-gray-800 rounded-[40px] shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                {/* Header */}
                <div className="relative bg-[#1a4731] dark:bg-gray-900 p-8 md:p-12 overflow-hidden">
                  <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
                    <svg
                      width="100%"
                      height="100%"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M0 100 C 20 0 50 0 100 100 Z"
                        fill="white"
                      />
                    </svg>
                  </div>
                  <div className="absolute -right-10 -top-10 w-64 h-64 bg-green-500/20 rounded-full blur-3xl" />

                  <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="text-white text-center md:text-left">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 border border-green-400/30 text-green-300 text-xs font-bold uppercase tracking-wider mb-4">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        Live Roadmap
                      </div>
                      <h2 className="text-3xl md:text-4xl font-extrabold mb-2 tracking-tight">
                        Your Learning Journey
                      </h2>
                      <p className="text-green-100/80 max-w-lg text-lg">
                        Master skills one step at a time. Track your progress
                        and reach your career goals.
                      </p>
                    </div>

                    {/* Circular Progress Stats */}
                    <div className="flex items-center gap-6 bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
                      <div className="relative w-20 h-20 flex-shrink-0">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="40"
                            cy="40"
                            r="36"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            className="text-green-900/50"
                          />
                          <circle
                            cx="40"
                            cy="40"
                            r="36"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={226}
                            strokeDashoffset={
                              226 - 226 * completionRatio
                            }
                            className="text-green-400 transition-all duration-1000 ease-out"
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center flex-col text-white">
                          <span className="text-xl font-bold">
                            {completionPercent}%
                          </span>
                        </div>
                      </div>
                      <div className="text-white">
                        <div className="text-xs text-green-300 font-bold uppercase tracking-wide">
                          Milestones
                        </div>
                        <div className="text-2xl font-bold">
                          {completedCount}
                          <span className="text-white/50 text-lg ml-1">
                            /{totalMilestones || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline Body */}
                <div className="p-8 md:p-12 bg-gray-50/50 dark:bg-gray-800/50">
                  {/* Premium upgrade banner */}
                  {upgradeRequired && (
                    <div className="mb-8 relative overflow-hidden bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 rounded-2xl p-6 text-white shadow-2xl">
                      {/* Background pattern */}
                      <div className="absolute inset-0 opacity-20">
                        <div className="absolute inset-0" style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                        }}></div>
                      </div>
                      
                      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-2xl">✨</span>
                          </div>
                          <div className="flex-1">
                            <h3 className="text-xl font-bold mb-2">
                              Mở khóa toàn bộ lộ trình học tập chuyên nghiệp
                            </h3>
                            <p className="text-white/90 text-sm mb-3">
                              Bạn đang xem <span className="font-semibold">{maxFreeLevel === -1 ? 'tất cả' : maxFreeLevel} level{maxFreeLevel === -1 ? '' : ' miễn phí'}</span>. 
                              {maxFreeLevel !== -1 && (
                                <>
                                  {' '}Nâng cấp để truy cập <span className="font-semibold">{totalMilestones} levels đầy đủ</span> với tài liệu chuyên sâu.
                                </>
                              )}
                            </p>
                            
                            {/* Premium benefits */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                              {[
                                '🎯 Tài liệu học tập chuyên sâu',
                                '📚 Khóa học và bài tập thực hành',
                                '🔄 Cập nhật nội dung liên tục',
                                '💬 Hỗ trợ cộng đồng Premium'
                              ].map((benefit, index) => (
                                <div key={index} className="flex items-center gap-2 text-white/80">
                                  <span>{benefit}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2 w-full md:w-auto">
                          <button 
                            onClick={() => navigate('/pricing')}
                            className="px-6 py-3 bg-white text-purple-600 font-bold rounded-xl hover:bg-gray-100 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Nâng cấp Premium
                            <span>⚡</span>
                          </button>
                          <p className="text-white/70 text-xs text-center">
                            Chỉ từ 299,000đ/tháng
                          </p>
                          

                          

                          

                        </div>
                      </div>
                    </div>
                  )}

                  {/* Old upgrade banner - removed for simplicity */}
                  {false && upgradeRequired && (
                    <div className="mb-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-6 text-white shadow-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-xl font-bold">Mở khóa toàn bộ lộ trình</h3>
                            <p className="text-white/90">
                              Bạn đang xem {maxFreeLevel} level miễn phí. Nâng cấp Premium để truy cập tất cả {totalMilestones} levels.
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={() => navigate('/pricing')}
                          className="px-6 py-3 bg-white text-orange-600 font-bold rounded-xl hover:bg-gray-100 transition-colors shadow-lg"
                        >
                          Nâng Cấp Ngay
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

              {/* Enterprise Features Section */}
              <EnterpriseRoadmapFeatures />

              {/* Beautiful Footer Section - Moved to bottom */}
              <RoadmapFooter 
                milestones={roadmap.milestones}
                userProgress={roadmap.userProgress}
              />
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default RoadmapPage;
