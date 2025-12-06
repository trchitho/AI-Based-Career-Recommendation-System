import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { roadmapService, TraitEvidence } from '../services/roadmapService';
import { careerService } from '../services/careerService';
import RoadmapTimelineComponent from '../components/roadmap/RoadmapTimelineComponent';
import { Roadmap } from '../types/roadmap';
import MainLayout from '../components/layout/MainLayout';

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

  useEffect(() => {
    if (!careerId) return;
    fetchRoadmap();
    loadTraitEvidence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [careerId]);

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
          // fallback skeleton
          const c = await careerService.get(careerId);
          data = {
            ...(data as any),
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
          
          /* Custom Scrollbar for horizontal items */
          .scrollbar-hide::-webkit-scrollbar { display: none; }
          .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>

                {/* Background Layers */}
                <div className="absolute inset-0 bg-dot-pattern pointer-events-none z-0 opacity-60"></div>
                <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-green-400/5 rounded-full blur-[120px] pointer-events-none z-0"></div>
                <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-blue-400/5 rounded-full blur-[120px] pointer-events-none z-0"></div>

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

                    {/* --- LOADING STATE --- */}
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-32 animate-pulse">
                            <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 rounded-full border-t-green-600 mb-4 animate-spin"></div>
                            <p className="text-gray-500 font-medium">Loading your roadmap...</p>
                        </div>
                    )}

                    {/* --- ERROR STATE --- */}
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 flex items-center gap-4 animate-fade-in-up">
                            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center text-red-600 shrink-0">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <p className="text-red-600 dark:text-red-300 font-medium">{error}</p>
                        </div>
                    )}

                    {/* --- ROADMAP CONTENT --- */}
                    {!loading && roadmap && (
                        <div className="animate-fade-in-up space-y-8">

                            {/* 1. HERO HEADER CARD */}
                            <div className="bg-gradient-to-r from-[#4A7C59] to-[#3d6449] dark:from-green-800 dark:to-green-900 rounded-[32px] p-8 md:p-10 shadow-xl shadow-green-900/20 text-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-white/30">Career Path</span>
                                    </div>

                                    <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-8">
                                        {roadmap.careerTitle}
                                    </h1>

                                    {/* Career Stages - Horizontal Scrollable */}
                                    <div className="flex overflow-x-auto pb-4 gap-6 scrollbar-hide snap-x">
                                        {[
                                            { stage: 'intern', label: 'Intern' },
                                            { stage: 'junior', label: 'Junior' },
                                            { stage: 'mid', label: 'Mid-Level' },
                                            { stage: 'senior', label: 'Senior' },
                                            { stage: 'lead', label: 'Lead' },
                                            { stage: 'principal', label: 'Principal' },
                                        ].map((item, idx) => {
                                            const totalMilestones = roadmap.milestones.length;
                                            const completedCount = roadmap.userProgress?.completed_milestones?.length || 0;
                                            const stageThreshold = (idx + 1) * (totalMilestones / 6);

                                            const isCompleted = completedCount >= stageThreshold;
                                            const isCurrent = !isCompleted && completedCount >= (idx) * (totalMilestones / 6);

                                            return (
                                                <div key={idx} className="flex-shrink-0 flex flex-col items-center snap-center group cursor-default">
                                                    <div className={`relative w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 border-2 ${isCompleted
                                                        ? 'bg-white text-green-700 border-white'
                                                        : isCurrent
                                                            ? 'bg-green-600 text-white border-white ring-4 ring-white/30'
                                                            : 'bg-green-800/50 text-green-300 border-green-700/50'
                                                        }`}>
                                                        {isCompleted ? (
                                                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                        ) : (
                                                            <span className="text-lg font-bold">{idx + 1}</span>
                                                        )}

                                                        {/* Connector Line */}
                                                        {idx < 5 && (
                                                            <div className={`absolute left-full top-1/2 w-6 h-0.5 -translate-y-1/2 z-0 ${isCompleted ? 'bg-white' : 'bg-green-800'}`}></div>
                                                        )}
                                                    </div>
                                                    <span className={`mt-3 text-xs font-bold uppercase tracking-wide ${isCompleted || isCurrent ? 'text-white' : 'text-green-200/60'}`}>
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
                                    {careerDesc && (
                                        <div className="bg-white dark:bg-gray-800 rounded-[32px] p-8 shadow-lg border border-gray-100 dark:border-gray-700">
                                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                                <span className="w-2 h-6 bg-green-500 rounded-full"></span>
                                                Overview
                                            </h3>
                                            <div className={`prose prose-green dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 leading-relaxed ${showFullDesc ? '' : 'line-clamp-3'}`}>
                                                {careerDesc}
                                            </div>
                                            {careerDesc.length > 250 && (
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
                                            <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
                                            Key Requirements
                                        </h3>
                                        <div className="space-y-4">
                                            {[
                                                'Strong communication and interpersonal skills',
                                                'Ability to work independently and as part of a team',
                                                'Problem-solving and analytical thinking abilities',
                                                'Adaptability and willingness to learn new technologies'
                                            ].map((req, idx) => (
                                                <div key={idx} className="flex items-start p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 mt-0.5 mr-4">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                    </div>
                                                    <span className="text-gray-700 dark:text-gray-300 font-medium">{req}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column */}
                                <div className="space-y-8">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-[24px] border border-gray-200 dark:border-gray-700 text-center">
                                            <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">Experience</p>
                                            <p className="text-lg font-extrabold text-gray-900 dark:text-white">{(roadmap as any).overview?.experienceText || '6 mo - 1 yr'}</p>
                                        </div>
                                        <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-[24px] border border-gray-200 dark:border-gray-700 text-center">
                                            <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">Degree</p>
                                            <p className="text-lg font-extrabold text-gray-900 dark:text-white">{(roadmap as any).overview?.degreeText || 'Bachelor'}</p>
                                        </div>
                                    </div>

                                    <div className="bg-gray-900 dark:bg-gray-800 p-8 rounded-[32px] shadow-xl text-white relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
                                        <h3 className="text-lg font-bold mb-6 relative z-10">Salary Range</h3>

                                        <div className="space-y-6 relative z-10">
                                            <div>
                                                <div className="flex justify-between text-sm mb-1 text-gray-400">Entry Level</div>
                                                <div className="text-2xl font-extrabold">$40K - $60K</div>
                                            </div>
                                            <div className="w-full h-px bg-gray-700"></div>
                                            <div>
                                                <div className="flex justify-between text-sm mb-1 text-green-400 font-bold">Senior Level</div>
                                                <div className="text-3xl font-extrabold text-green-400">$80K - $120K</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white dark:bg-gray-800 rounded-[32px] p-8 shadow-lg border border-gray-100 dark:border-gray-700">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Top Skills</h3>
                                        <div className="space-y-4">
                                            {[{ n: 'Tech', p: 75 }, { n: 'Comms', p: 60 }, { n: 'Leadership', p: 40 }].map((s, i) => (
                                                <div key={i}>
                                                    <div className="flex justify-between text-xs font-bold mb-1.5">
                                                        <span className="text-gray-600 dark:text-gray-300">{s.n}</span>
                                                        <span className="text-green-600">{s.p}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                                                        <div className="bg-green-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${s.p}%` }}></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 3. DETAILED LEARNING PATH (REDESIGNED) */}
                            <div className="relative bg-white dark:bg-gray-800 rounded-[40px] shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">

                                {/* Interactive Header Section */}
                                <div className="relative bg-[#1a4731] dark:bg-gray-900 p-8 md:p-12 overflow-hidden">
                                    {/* Abstract Background Patterns */}
                                    <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
                                        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                                            <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
                                        </svg>
                                    </div>
                                    <div className="absolute -right-10 -top-10 w-64 h-64 bg-green-500/20 rounded-full blur-3xl"></div>

                                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                                        <div className="text-white text-center md:text-left">
                                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 border border-green-400/30 text-green-300 text-xs font-bold uppercase tracking-wider mb-4">
                                                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                                                Live Roadmap
                                            </div>
                                            <h2 className="text-3xl md:text-4xl font-extrabold mb-2 tracking-tight">
                                                Your Learning Journey
                                            </h2>
                                            <p className="text-green-100/80 max-w-lg text-lg">
                                                Master skills one step at a time. Track your progress and reach your career goals.
                                            </p>
                                        </div>

                                        {/* Circular Progress Stats */}
                                        <div className="flex items-center gap-6 bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
                                            <div className="relative w-20 h-20 flex-shrink-0">
                                                <svg className="w-full h-full transform -rotate-90">
                                                    <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-green-900/50" />
                                                    <circle
                                                        cx="40" cy="40" r="36"
                                                        stroke="currentColor" strokeWidth="8" fill="transparent"
                                                        strokeDasharray={226}
                                                        strokeDashoffset={226 - (226 * ((roadmap.userProgress?.completed_milestones?.length || 0) / roadmap.milestones.length))}
                                                        className="text-green-400 transition-all duration-1000 ease-out"
                                                        strokeLinecap="round"
                                                    />
                                                </svg>
                                                <div className="absolute inset-0 flex items-center justify-center flex-col text-white">
                                                    <span className="text-xl font-bold">
                                                        {Math.round(((roadmap.userProgress?.completed_milestones?.length || 0) / roadmap.milestones.length) * 100)}%
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-white">
                                                <div className="text-xs text-green-300 font-bold uppercase tracking-wide">Milestones</div>
                                                <div className="text-2xl font-bold">
                                                    {roadmap.userProgress?.completed_milestones?.length || 0}
                                                    <span className="text-white/50 text-lg ml-1">/{roadmap.milestones.length}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Timeline Body */}
                                <div className="p-8 md:p-12 bg-gray-50/50 dark:bg-gray-800/50">
                                    <RoadmapTimelineComponent
                                        milestones={roadmap.milestones}
                                        userProgress={roadmap.userProgress}
                                        onCompleteMilestone={handleCompleteMilestone}
                                        completingMilestone={completingMilestone}
                                    />
                                </div>
                            </div>

                        </div>
                    )}

                </div>
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

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#4A7C59] dark:border-green-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              Loading roadmap...
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl p-6 text-center">
            <p className="text-red-800 dark:text-red-300 font-semibold">
              {error}
            </p>
          </div>
        )}

        {!loading && roadmap && (
          <>
            {/* Header Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-700 mb-8">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
                {roadmap.careerTitle}
              </h1>

              {/* Career Stages */}
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                {[
                  { stage: 'intern', label: 'THỰC TẬP SINH' },
                  { stage: 'employee', label: 'TRỢ LÝ' },
                  { stage: 'manager', label: 'NHÂN VIÊN' },
                  { stage: 'director', label: 'CHUYÊN VIÊN' },
                  { stage: 'ceo', label: 'TRƯỞNG PHÒNG' },
                  { stage: 'executive', label: 'GIÁM ĐỐC' },
                ].map((item, idx) => {
                  const completedCount =
                    roadmap.userProgress?.completed_milestones?.length || 0;
                  // mỗi 2 milestones ~ 1 level
                  const completed = completedCount > idx * 2;
                  const isCurrent =
                    !completed && idx === Math.floor(completedCount / 2);

                  return (
                    <div key={idx} className="relative flex flex-col items-center">
                      <div
                        className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-md transition-all ${
                          completed
                            ? 'bg-[#4A7C59] dark:bg-green-600'
                            : isCurrent
                            ? 'bg-[#4A7C59]/30 dark:bg-green-600/30 ring-2 ring-[#4A7C59] dark:ring-green-500'
                            : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      >
                        <div className="text-center">
                          <div
                            className={`font-bold text-xs leading-tight px-2 ${
                              completed || isCurrent
                                ? 'text-white'
                                : 'text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            {item.label}
                          </div>
                        </div>
                        {completed && (
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-md">
                            <svg
                              className="w-4 h-4 text-[#4A7C59] dark:text-green-500"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 font-medium">
                        Level {idx + 1}
                      </div>
                      {idx < 5 && (
                        <div className="absolute -right-5 top-1/2 transform -translate-y-1/2 flex items-center">
                          <svg
                            className="w-4 h-4 text-[#4A7C59] dark:text-green-500"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Description */}
              {(careerDesc || navState.description) && (
                <div className="mt-6">
                  <p
                    className={`text-gray-700 dark:text-gray-300 leading-relaxed ${
                      showFullDesc ? '' : 'line-clamp-3'
                    }`}
                  >
                    {navState.description || careerDesc}
                  </p>
                  {(navState.description || careerDesc).length > 150 && (
                    <button
                      onClick={() => setShowFullDesc(!showFullDesc)}
                      className="mt-3 text-[#4A7C59] dark:text-green-400 font-semibold hover:underline"
                    >
                      {showFullDesc ? 'Show less' : 'Read more'}
                    </button>
                  )}
                </div>
              )}

              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="bg-[#E8DCC8] dark:bg-gray-700 rounded-xl p-4">
                  <div className="text-[#4A7C59] dark:text-green-400 font-bold text-sm mb-1">
                    EXPERIENCE
                  </div>
                  <div className="text-gray-900 dark:text-white">
                    {(roadmap as any).overview?.experienceText ||
                      '6 months - 1 year'}
                  </div>
                </div>
                <div className="bg-[#E8DCC8] dark:bg-gray-700 rounded-xl p-4">
                  <div className="text-[#4A7C59] dark:text-green-400 font-bold text-sm mb-1">
                    EDUCATION
                  </div>
                  <div className="text-gray-900 dark:text-white">
                    {(roadmap as any).overview?.degreeText ||
                      'College, University'}
                  </div>
                </div>
              </div>
            </div>

            {/* Job Requirements */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-700 mb-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Job Requirements
              </h3>

              <div className="space-y-3">
                {[
                  'Strong communication and interpersonal skills',
                  'Ability to work independently and as part of a team',
                  'Problem-solving and analytical thinking abilities',
                  'Adaptability and willingness to learn new technologies',
                ].map((text, idx) => (
                  <div key={idx} className="flex items-start">
                    <svg
                      className="w-5 h-5 text-[#4A7C59] dark:text-green-400 mr-3 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-gray-700 dark:text-gray-300">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Skills Progress */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-700 mb-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Skills Development Progress
              </h3>

              <div className="space-y-6">
                {[
                  { name: 'Technical Skills', progress: 75, time: '9-12 months' },
                  { name: 'Communication', progress: 60, time: '6-9 months' },
                  { name: 'Leadership', progress: 40, time: '12-18 months' },
                  {
                    name: 'Project Management',
                    progress: 30,
                    time: '18-24 months',
                  },
                  { name: 'Strategic Thinking', progress: 20, time: '24-36 months' },
                ].map((skill, idx) => (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {skill.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#4A7C59] dark:text-green-400">
                          {skill.progress}%
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {skill.time}
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-full bg-[#4A7C59] dark:bg-green-600 transition-all duration-500 rounded-full"
                        style={{ width: `${skill.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Assessment Evidence Block */}
            {traitEvidence && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-700 mb-8">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  How your assessment supports this career match
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Below are a few example questions from the{' '}
                  <span className="font-semibold">{traitEvidence.scale}</span>{' '}
                  scales that were used when computing your profile. A strong
                  positive response to items like these is consistent with people
                  who thrive in this career.
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

            {/* Learning Timeline */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
                Detailed Learning Path
              </h3>
              <RoadmapTimelineComponent
                milestones={roadmap.milestones}
                userProgress={roadmap.userProgress}
                onCompleteMilestone={handleCompleteMilestone}
                completingMilestone={completingMilestone}
              />
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default RoadmapPage;