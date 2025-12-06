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
