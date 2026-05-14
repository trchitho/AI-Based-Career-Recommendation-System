import { useMemo, useState } from 'react';
import { Milestone, UserProgress, LearningResource } from '../../types/roadmap';
import { mentorMatchingService, MentorMatch } from '../../services/mentorMatchingService';

interface RoadmapTimelineComponentProps {
  milestones: Milestone[];
  userProgress?: UserProgress | undefined;
  onCompleteMilestone: (milestoneId: string) => void;
  completingMilestone: string | null;
  upgradeRequired?: boolean;
  maxFreeLevel?: number;
}

type ProviderStyle = {
  short: string;
  label: string;
  className: string;
};

const PROVIDER_STYLES: Record<string, ProviderStyle> = {
  coursera: {
    short: 'C',
    label: 'Coursera',
    className: 'bg-blue-600 text-white',
  },
  edx: {
    short: 'eX',
    label: 'edX',
    className: 'bg-slate-950 text-white',
  },
  'linkedin learning': {
    short: 'in',
    label: 'LinkedIn Learning',
    className: 'bg-sky-700 text-white',
  },
  'microsoft learn': {
    short: 'MS',
    label: 'Microsoft Learn',
    className: 'bg-indigo-600 text-white',
  },
  'google skillshop': {
    short: 'G',
    label: 'Google Skillshop',
    className: 'bg-white text-slate-800 ring-1 ring-slate-200',
  },
  'google analytics academy': {
    short: 'G',
    label: 'Google Analytics Academy',
    className: 'bg-white text-slate-800 ring-1 ring-slate-200',
  },
  'aws skill builder': {
    short: 'AWS',
    label: 'AWS Skill Builder',
    className: 'bg-orange-500 text-white',
  },
  'harvard business school online': {
    short: 'H',
    label: 'Harvard Business School Online',
    className: 'bg-red-700 text-white',
  },
  'khan academy': {
    short: 'K',
    label: 'Khan Academy',
    className: 'bg-emerald-600 text-white',
  },
  'mit opencourseware': {
    short: 'MIT',
    label: 'MIT OpenCourseWare',
    className: 'bg-red-600 text-white',
  },
};

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Cơ bản',
  intermediate: 'Trung cấp',
  advanced: 'Nâng cao',
  mixed: 'Nhiều cấp độ',
};

const PRICING_LABELS: Record<string, string> = {
  free: 'Miễn phí',
  paid: 'Trả phí',
  mixed: 'Miễn phí và trả phí',
};

const PRICING_CLASSES: Record<string, string> = {
  free: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  paid: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  mixed: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
};

function normalizeProvider(provider?: string): ProviderStyle {
  const raw = (provider || 'Nguồn học').trim();
  const known = PROVIDER_STYLES[raw.toLowerCase()];
  if (known) return known;

  const short = raw
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 3)
    .toUpperCase() || 'N';

  return {
    short,
    label: raw,
    className: 'bg-slate-700 text-white',
  };
}

function normalizeResourceTitle(title?: string) {
  const value = (title || 'Khóa học được gợi ý').trim();
  return value
    .replace(/^Tìm kiếm\s+khóa học\s+/i, 'Khóa học ')
    .replace(/^Tìm kiếm\s+/i, '')
    .replace(/^Course search:\s*/i, 'Khóa học ');
}

function getResourceLevelLabel(level?: string) {
  return LEVEL_LABELS[level || ''] || undefined;
}

function getResourcePricing(resource: LearningResource) {
  const pricing = (resource as any).pricing;
  if (pricing && PRICING_LABELS[pricing]) {
    return { label: PRICING_LABELS[pricing], className: PRICING_CLASSES[pricing] };
  }
  if ((resource as any).is_free === true) {
    return { label: 'Miễn phí', className: PRICING_CLASSES.free };
  }
  if ((resource as any).is_paid === true) {
    return { label: 'Trả phí', className: PRICING_CLASSES.paid };
  }
  return undefined;
}

function normalizeVietnameseNote(value?: string) {
  if (!value) return undefined;
  return value
    .replace(/\bdùng thử\/audit\b/gi, 'dùng thử hoặc xem miễn phí')
    .replace(/\bmiễn phí\/audit\b/gi, 'miễn phí hoặc xem miễn phí')
    .replace(/\baudit\b/gi, 'xem miễn phí');
}

function formatVietnameseDate(value?: string) {
  if (!value) return 'Đang cập nhật';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Đang cập nhật';
  return date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const RoadmapTimelineComponent = ({
  milestones,
  userProgress,
  onCompleteMilestone,
  completingMilestone,
}: RoadmapTimelineComponentProps) => {
  const [expandedMilestone, setExpandedMilestone] = useState<number | null>(milestones[0]?.order ?? null);
  const [mentorPanelStep, setMentorPanelStep] = useState<number | null>(null);
  const [mentorCache, setMentorCache] = useState<Record<number, MentorMatch[]>>({});
  const [mentorLoading, setMentorLoading] = useState<number | null>(null);

  const completedOrders = useMemo(
    () => new Set((userProgress?.completed_milestones || []).map(String)),
    [userProgress?.completed_milestones],
  );

  const isMilestoneCompleted = (order: number) => completedOrders.has(order.toString());
  const canOpenResource = (index: number) => index === 0 || isMilestoneCompleted(milestones[index - 1]?.order);

  const currentMilestoneIndex = useMemo(() => {
    const nextIndex = milestones.findIndex((milestone) => !isMilestoneCompleted(milestone.order));
    return nextIndex === -1 ? Math.max(0, milestones.length - 1) : nextIndex;
  }, [milestones, completedOrders]);

  const loadMentorsForStep = async (order: number, skillName: string) => {
    if (mentorCache[order]) {
      setMentorPanelStep(mentorPanelStep === order ? null : order);
      return;
    }

    setMentorLoading(order);
    setMentorPanelStep(order);
    try {
      const data = await mentorMatchingService.findMentorsForCareer(skillName, 3);
      setMentorCache((prev) => ({ ...prev, [order]: data }));
    } catch {
      setMentorCache((prev) => ({ ...prev, [order]: [] }));
    } finally {
      setMentorLoading(null);
    }
  };

  return (
    <div className="relative">
      <div className="mb-7 grid grid-cols-1 gap-3 md:grid-cols-3">
        {[
          ['1', 'Nắm mục tiêu', 'Đọc kỹ mục tiêu của từng bước trước khi mở tài nguyên học.'],
          ['2', 'Học và áp dụng', 'Ưu tiên một khóa học, sau đó thử áp dụng bằng tình huống thực tế.'],
          ['3', 'Mở khóa tuần tự', 'Hoàn thành bước trước để mở link học của bước tiếp theo.'],
        ].map(([step, title, desc]) => (
          <div key={step} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">{step}</div>
            <p className="text-sm font-bold text-slate-950 dark:text-white">{title}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{desc}</p>
          </div>
        ))}
      </div>

      <div className="absolute left-5 top-36 bottom-2 w-px bg-slate-200 dark:bg-slate-700 md:left-8" />

      <div className="space-y-5">
        {milestones.map((milestone, index) => {
          const title = milestone.skillNameVn || milestone.skillName;
          const description = milestone.descriptionVn || milestone.description;
          const duration = milestone.estimatedDurationVn || milestone.estimatedDuration || 'Đang cập nhật';
          const resources = milestone.resourcesVn || [];
          const isCompleted = isMilestoneCompleted(milestone.order);
          const isCurrent = index === currentMilestoneIndex && !isCompleted;
          const isExpanded = expandedMilestone === milestone.order;
          const isCompleting = completingMilestone === milestone.order.toString();
          const isResourceAccessible = canOpenResource(index);
          const previousStep = milestones[index - 1]?.order;

          return (
            <div key={milestone.order} className="relative pl-12 md:pl-16">
              <div
                className={`absolute left-2 top-5 z-10 flex h-7 w-7 items-center justify-center rounded-full border-4 text-xs font-bold transition-colors md:left-5 ${
                  isCompleted
                    ? 'border-emerald-100 bg-emerald-600 text-white dark:border-emerald-900'
                    : isCurrent
                      ? 'border-amber-100 bg-amber-500 text-white dark:border-amber-900'
                      : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900'
                }`}
              >
                {isCompleted ? (
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.26 7.333a1 1 0 0 1-1.42.005l-3.74-3.74a1 1 0 1 1 1.414-1.414l3.03 3.03 6.55-6.622a1 1 0 0 1 1.42-.006Z" clipRule="evenodd" />
                  </svg>
                ) : (
                  milestone.order
                )}
              </div>

              <article className={`overflow-hidden rounded-[22px] border bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:bg-slate-900 ${
                isCurrent
                  ? 'border-amber-300 shadow-amber-100/70 dark:border-amber-700 dark:shadow-none'
                  : isCompleted
                    ? 'border-emerald-200 dark:border-emerald-800'
                    : 'border-slate-200 dark:border-slate-700'
              }`}>
                <button
                  type="button"
                  onClick={() => setExpandedMilestone(isExpanded ? null : milestone.order)}
                  className="flex w-full items-start justify-between gap-4 p-5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/70"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Bước {milestone.order}</span>
                      {isCurrent && (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                          Đang học
                        </span>
                      )}
                      {isCompleted && (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                          Đã hoàn thành
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold leading-snug text-slate-950 dark:text-white">{title}</h3>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2m5-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                      Thời gian ước tính: {duration}
                    </div>
                  </div>
                  <span className="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-white dark:bg-slate-800 dark:text-slate-300">
                    <svg className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m19 9-7 7-7-7" />
                    </svg>
                  </span>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50/80 p-5 dark:border-slate-700 dark:bg-slate-950/30">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">Tài nguyên học tập</h4>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Chọn một nguồn học phù hợp, kiểm tra chi phí trên trang cung cấp trước khi bắt đầu.</p>
                      </div>
                      {!isResourceAccessible && (
                        <span className="w-fit rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                          Cần hoàn thành bước {previousStep} để mở link
                        </span>
                      )}
                    </div>

                    {resources.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {resources.map((resource, idx) => {
                          const provider = normalizeProvider(resource.provider);
                          const levelLabel = getResourceLevelLabel(resource.level);
                          const pricing = getResourcePricing(resource);
                          const costNote = normalizeVietnameseNote((resource as any).cost_note_vi);
                          const resourceTitle = normalizeResourceTitle(resource.title);

                          const card = (
                            <div className="flex min-h-[132px] flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-800">
                              <div className="mb-3 flex items-start gap-3">
                                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-xs font-black shadow-sm ${provider.className}`}>
                                  {provider.short}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="line-clamp-2 text-sm font-extrabold leading-5 text-slate-950 dark:text-white">{resourceTitle}</p>
                                  <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{provider.label}</p>
                                </div>
                                <svg className={`h-4 w-4 flex-shrink-0 ${isResourceAccessible ? 'text-slate-400' : 'text-slate-300 dark:text-slate-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </div>

                              <div className="mt-auto flex flex-wrap gap-2">
                                {levelLabel && (
                                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                    {levelLabel}
                                  </span>
                                )}
                                {pricing && (
                                  <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${pricing.className}`}>
                                    {pricing.label}
                                  </span>
                                )}
                                {!isResourceAccessible && (
                                  <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                                    Khóa link
                                  </span>
                                )}
                              </div>

                              {costNote && (
                                <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{costNote}</p>
                              )}
                            </div>
                          );

                          if (!isResourceAccessible) {
                            return (
                              <div key={idx} aria-disabled="true">
                                {card}
                              </div>
                            );
                          }

                          return (
                            <a key={idx} href={resource.url} target="_blank" rel="noopener noreferrer" className="block focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-2xl">
                              {card}
                            </a>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                        Chưa có tài nguyên tiếng Việt cho bước này.
                      </div>
                    )}

                    <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="button"
                        onClick={() => loadMentorsForStep(milestone.order, title)}
                        className="inline-flex items-center gap-2 text-sm font-bold text-indigo-700 transition-colors hover:text-indigo-900 dark:text-indigo-300 dark:hover:text-indigo-200"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2a5 5 0 0 0-.356-1.857M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2a5 5 0 0 1 .356-1.857m0 0a5 5 0 0 1 9.288 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
                        {mentorPanelStep === milestone.order ? 'Ẩn cố vấn' : `Tìm cố vấn cho "${title}"`}
                        <svg className={`h-4 w-4 transition-transform ${mentorPanelStep === milestone.order ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m19 9-7 7-7-7" />
                        </svg>
                      </button>

                      {!isCompleted ? (
                        <button
                          type="button"
                          onClick={() => onCompleteMilestone(milestone.order.toString())}
                          disabled={isCompleting}
                          className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                        >
                          {isCompleting ? 'Đang cập nhật...' : 'Đánh dấu hoàn thành'}
                        </button>
                      ) : (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                          Hoàn thành vào {formatVietnameseDate(userProgress?.milestone_completions?.[milestone.order.toString()] || userProgress?.last_updated_at)}
                        </div>
                      )}
                    </div>

                    {mentorPanelStep === milestone.order && (
                      <div className="mt-3">
                        {mentorLoading === milestone.order && (
                          <div className="flex items-center gap-2 py-3 text-sm text-slate-500 dark:text-slate-400">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
                            Đang tìm cố vấn phù hợp...
                          </div>
                        )}

                        {mentorLoading !== milestone.order && mentorCache[milestone.order]?.length === 0 && (
                          <p className="py-2 text-sm text-slate-500 dark:text-slate-400">
                            Chưa có cố vấn cho kỹ năng này.{' '}
                            <a href="/mentor-matching?tab=become" className="font-bold text-indigo-700 hover:underline dark:text-indigo-300">
                              Trở thành người đầu tiên
                            </a>
                          </p>
                        )}

                        {mentorLoading !== milestone.order && (mentorCache[milestone.order] || []).map((mentor) => (
                          <div
                            key={mentor.mentor_id}
                            className="mb-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900"
                          >
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                              {mentor.mentor_name.split(' ').map((word: string) => word[0]).slice(0, 2).join('').toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{mentor.mentor_name}</p>
                              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                {mentor.current_position}{mentor.company ? ` - ${mentor.company}` : ''}
                              </p>
                            </div>
                            <a href="/mentor-matching" className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white">
                              Kết nối
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </article>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RoadmapTimelineComponent;
