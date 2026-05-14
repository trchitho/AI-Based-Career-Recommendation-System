import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
import { careerService, CareerDetailDTO } from '../services/careerService';
import { companyService, CompanyItem, bestUrl, allUrls } from '../services/companyService';
import { useUsageTracking } from '../hooks/useUsageTracking';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { useSubscription } from '../hooks/useSubscription';
import CareerMentorSection from '../components/mentor/CareerMentorSection';
import { CAREER_IMAGES } from './CareersByGroupPage';

// Technology Grouped Component with expand/collapse
const TechnologyGrouped = ({ technologies, language }: { technologies: CareerDetailDTO['sections']['technology']; language: string }) => {
  const [expanded, setExpanded] = useState(false);
  const INITIAL_GROUPS = 5;

  // Group by category
  const grouped: Record<string, typeof technologies> = {};
  technologies.forEach(tech => {
    const cat = (tech as any).category || 'Khác';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(tech);
  });

  // Sort: hot items first, then by count
  const sortedGroups = Object.entries(grouped).sort((a, b) => {
    const aHot = a[1].filter(t => t.hot_flag).length;
    const bHot = b[1].filter(t => t.hot_flag).length;
    if (bHot !== aHot) return bHot - aHot;
    return b[1].length - a[1].length;
  });

  const visibleGroups = expanded ? sortedGroups : sortedGroups.slice(0, INITIAL_GROUPS);
  const hiddenCount = sortedGroups.length - INITIAL_GROUPS;

  return (
    <div className="space-y-5">
      {visibleGroups.map(([category, techs]) => (
        <div key={category}>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              {category}
            </h3>
            <span className="text-xs text-gray-400 dark:text-gray-500">({techs.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {techs.map((tech, i) => (
              <span
                key={i}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  tech.hot_flag
                    ? 'bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-700 shadow-sm'
                    : tech.in_demand_flag
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700'
                      : 'bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
                }`}
                title={(tech as any).example || ''}
              >
                {tech.name}
                {tech.hot_flag && <span className="ml-1">🔥</span>}
                {tech.in_demand_flag && !tech.hot_flag && <span className="ml-1 text-green-500">●</span>}
              </span>
            ))}
          </div>
        </div>
      ))}

      {/* Expand/Collapse button */}
      {hiddenCount > 0 && (
        <div className="flex justify-center pt-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-full shadow-lg hover:shadow-xl transition-all"
          >
            <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {expanded ? 'Thu gọn' : `Xem thêm (${hiddenCount} nhóm khác)`}
          </button>
        </div>
      )}
    </div>
  );
};

// Group fallback images
const GROUP_FALLBACK_IMAGES: Record<string, string> = {
  'sales': '/images/careers/sales/retail-salespersons.jpg',
  'computer-math': '/images/careers/computer-math/software-developer.jpg',
  'healthcare-practitioners': '/images/careers/healthcare-practitioners/family-medicine-physicians.jpg',
  'healthcare-support': '/images/careers/healthcare-support/nursing-assistants.jpg',
  'education': 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=300&fit=crop&auto=format',
  'business-finance': 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=300&fit=crop&auto=format',
  'architecture-engineering': '/images/careers/architecture-engineering/civil-engineers.jpg',
  'arts-media': '/images/careers/arts-media/graphic-designers.jpg',
  'legal': '/images/careers/legal/lawyers.jpg',
  'management': '/images/careers/management/general-and-operations-managers.jpg',
  'transportation': '/images/careers/transportation/heavy-and-tractor-trailer-truck-drivers.jpg',
  'construction': '/images/careers/construction/construction-laborers.jpg',
  'food-service': '/images/careers/food-service/chefs-and-head-cooks.jpg',
  'community-social': 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=600&h=300&fit=crop&auto=format',
  'protective-service': '/images/careers/protective-service/police-and-sheriffs-patrol-officers.jpg',
  'personal-care': '/images/careers/personal-care/hairdresser.jpg',
  'office-admin': 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=300&fit=crop&auto=format',
  'life-science': 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=600&h=300&fit=crop&auto=format',
  'farming-forestry': 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&h=300&fit=crop&auto=format',
  'installation-repair': 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&h=300&fit=crop&auto=format',
  'production': '/images/careers/production/first-line-supervisors-of-production-and-operating-workers.jpg',
  'building-maintenance': '/images/careers/building-maintenance/janitor.jpg',
};

/** Get career image URL - uses CAREER_IMAGES map (same as CareersByGroupPage) */
function getCareerImageForDetail(onetCode: string | undefined, groupSlug: string | undefined): string {
  if (onetCode && CAREER_IMAGES[onetCode]) {
    return CAREER_IMAGES[onetCode];
  }
  if (groupSlug && GROUP_FALLBACK_IMAGES[groupSlug]) {
    return GROUP_FALLBACK_IMAGES[groupSlug];
  }
  return 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=600&h=300&fit=crop&auto=format';
}

function buildDetailImageUrl(url: string, width = 1800): string {
  if (!url.includes('images.unsplash.com')) return url;
  const [base, queryString = ''] = url.split('?');
  const params = new URLSearchParams(queryString);
  params.set('w', String(width));
  params.set('h', '760');
  params.set('fit', 'crop');
  params.set('crop', 'entropy');
  params.set('auto', 'format');
  params.set('q', '90');
  return `${base}?${params.toString()}`;
}

function buildDetailImageSrcSet(url: string): string | undefined {
  if (!url.includes('images.unsplash.com')) return undefined;
  return [900, 1400, 1800, 2400]
    .map(width => `${buildDetailImageUrl(url, width)} ${width}w`)
    .join(', ');
}

const CareerDetailPage = () => {
  const { idOrSlug, groupSlug, careerIdOrSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const language = 'vi';
  const { t } = useTranslation();
  const [detail, setDetail] = useState<CareerDetailDTO | null>(null);
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'knowledge' | 'skills' | 'abilities'>('knowledge');
  const [showAllTasks, setShowAllTasks] = useState(false);

  const { incrementUsage, canUseFeature } = useUsageTracking();
  const { hasFeature, currentPlan, getNextUpgradePlan, getPlanInfo } = useFeatureAccess();
  const { loading: subscriptionLoading } = useSubscription();
  const hasTrackedUsageRef = useRef(false);

  // Determine which parameter to use based on URL structure
  const careerIdentifier = careerIdOrSlug || idOrSlug;

  useEffect(() => {
    // Wait for subscription to load before fetching career detail
    // This ensures we use the correct plan (pro/premium/basic) not 'free'
    if (subscriptionLoading) return;
    const run = async () => {
      try {
        if (!careerIdentifier) return;
        if (currentPlan === 'basic' && !hasFeature('unlimited_careers')) {
          const canView = canUseFeature('career_view');
          if (!canView) { window.location.href = '/pricing'; return; }
        }
        const data = await careerService.getDetail(careerIdentifier, currentPlan, 'vi');
        setDetail(data);
        const isFromCareersPage = location.state?.fromCareersPage === true;
        if (!hasTrackedUsageRef.current && !hasFeature('unlimited_careers') && isFromCareersPage) {
          incrementUsage('career_view');
          hasTrackedUsageRef.current = true;
        }
        // Load companies hiring for this career (background)
        // Use careerIdentifier (= careerIdOrSlug || idOrSlug) — not raw idOrSlug which may be undefined
        if (careerIdentifier) {
          companyService.getForCareer(careerIdentifier)
            .then(list => setCompanies(list.slice(0, 8)))
            .catch(() => { });
        }
      } catch (err: any) { console.error(err); } finally { setLoading(false); }
    };
    run();
  }, [careerIdentifier, currentPlan, subscriptionLoading]);

  const isSectionLocked = (section: string) => detail?.locked_sections?.includes(section) ?? false;
  const formatSalary = (amount: number | null | undefined, currency: string = 'USD') => {
    if (!amount) return 'N/A';
    if (currency === 'VND') return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  };
  const nextPlan = getNextUpgradePlan();
  const nextPlanInfo = nextPlan ? getPlanInfo(nextPlan) : null;

  // Helper function to get top tasks by importance
  const getTopTasks = (tasks: any[]) => {
    if (!tasks || tasks.length === 0) return { topTasks: [], remainingTasks: [] };

    // Sort by importance (descending) then by id (ascending)
    const sortedTasks = [...tasks].sort((a, b) => {
      const importanceA = Number(a.importance || 0);
      const importanceB = Number(b.importance || 0);
      if (importanceA !== importanceB) {
        return importanceB - importanceA; // Higher importance first
      }
      return (a.id || 0) - (b.id || 0); // Then by id ascending
    });

    // Strategy: Show top tasks by importance, but limit to reasonable number
    const MAX_INITIAL_TASKS = 8; // Show max 8 tasks initially

    if (sortedTasks.length <= MAX_INITIAL_TASKS) {
      // If total tasks <= 8, show all
      return { topTasks: sortedTasks, remainingTasks: [] };
    }

    // Find the highest importance value
    const highestImportance = Number(sortedTasks[0].importance || 0);

    // Get all tasks with the highest importance
    const highImportanceTasks = sortedTasks.filter(task => Number(task.importance || 0) === highestImportance);

    if (highImportanceTasks.length <= MAX_INITIAL_TASKS) {
      // If high importance tasks fit within limit, use them
      const remainingTasks = sortedTasks.filter(task => Number(task.importance || 0) < highestImportance);
      return { topTasks: highImportanceTasks, remainingTasks };
    } else {
      // If too many high importance tasks, just take first 8
      const topTasks = sortedTasks.slice(0, MAX_INITIAL_TASKS);
      const remainingTasks = sortedTasks.slice(MAX_INITIAL_TASKS);
      return { topTasks, remainingTasks };
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-surface-primary dark:bg-gray-900 text-gray-900 dark:text-white relative overflow-x-hidden pb-20">
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');.bg-dot-pattern{background-image:radial-gradient(E5E7EB 1px,transparent 1px);background-size:24px 24px}.dark .bg-dot-pattern{background-image:radial-gradient(374151 1px,transparent 1px)}@keyframes fade-in-up{0%{opacity:0;transform:translateY(20px)}100%{opacity:1;transform:translateY(0)}}.animate-fade-in-up{animation:fade-in-up 0.6s ease-out forwards}`}</style>
        <div className="absolute inset-0 bg-dot-pattern pointer-events-none z-0 opacity-60"></div>
        <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-indigo-400/5 rounded-full blur-[120px] pointer-events-none z-0"></div>
        <div className="fixed bottom-0 left-0 w-[600px] h-[600px] bg-blue-400/5 rounded-full blur-[120px] pointer-events-none z-0"></div>
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
          {loading && (<div className="flex flex-col items-center justify-center py-32 animate-pulse"><div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 rounded-full border-t-green-600 mb-4 animate-spin"></div><p className="text-gray-500 font-medium">{t('careerDetail.loadingCareerDetails')}</p></div>)}
          {!loading && detail && (
            <div className="animate-fade-in-up space-y-8">
              {/* Header */}
              <div className="rounded-[28px] relative overflow-hidden" style={{ boxShadow: '0 18px 54px rgba(15,23,42,0.18)' }}>
                {/* Career Image - large enough for impact, constrained to avoid stretching low-res assets */}
                <div className="relative h-[340px] sm:h-[390px] lg:h-[460px]">
                  {(() => {
                    const rawImageUrl = getCareerImageForDetail(detail.onet_code, groupSlug);
                    const detailImageUrl = buildDetailImageUrl(rawImageUrl);
                    const srcSet = buildDetailImageSrcSet(rawImageUrl);
                    return (
                  <img
                    src={detailImageUrl}
                    srcSet={srcSet}
                    sizes="(max-width: 768px) 100vw, 1152px"
                    alt={detail.title}
                    className="w-full h-full object-cover object-center transform-gpu"
                    loading="eager"
                    decoding="sync"
                    fetchPriority="high"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.parentElement?.querySelector('.img-fallback') as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                    );
                  })()}
                  <div className="img-fallback absolute inset-0 hidden items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700"></div>
                  
                  {/* Subtle gradient only at bottom for text */}
                  <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-black/85 via-black/40 to-transparent"></div>

                  {/* Back button */}
                  <button onClick={() => navigate(-1)} className="absolute top-6 left-6 z-20 flex items-center gap-2 text-white hover:text-white transition-all text-sm font-bold uppercase tracking-wide bg-white/15 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/25 hover:bg-white/25 shadow-lg">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    {t('careerDetail.back')}
                  </button>

                  {/* Content at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 p-7 md:p-10 z-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                      <div className="max-w-2xl">
                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-3 leading-[1.1]">
                          {detail.title}
                        </h1>
                        <p className="text-base text-white/50 font-mono tracking-wider">
                          {t('careerDetail.onetCode')}: {detail.onet_code}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <Link 
                          to={`/careers/${groupSlug}/${careerIdentifier}/roadmap`} 
                          className="group inline-flex items-center px-6 py-3.5 bg-white text-gray-900 rounded-2xl font-bold text-base shadow-2xl transition-all hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(255,255,255,0.2)]"
                        >
                          {t('careerDetail.viewLearningRoadmap')}
                          <svg className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Mentor Section */}
              <CareerMentorSection careerTitle={detail.title} careerId={idOrSlug || ''} careerSlug={idOrSlug || ''} />

              {/* Main Grid 65/35 */}
              <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-8">
                {/* Left Column */}
                <div className="space-y-8">
                  {/* Block A: About */}
                  <div className="bg-white dark:bg-gray-800 rounded-[24px] p-8 shadow-lg border border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3"><span className="w-2 h-6 bg-green-500 rounded-full"></span>{t('careerDetail.aboutTheRole')}</h2>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-base mb-6">{detail.short_desc || detail.sections.outlook?.summary_md || "Explore this career path to discover opportunities and requirements."}</p>

                    {detail.riasec_interests && detail.riasec_interests.length > 0 && (
                      <div className="mb-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/35 p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider">Nhóm sở thích nghề nghiệp</h3>
                          <span className="inline-flex w-fit items-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                            Mã sở thích: {detail.riasec_interests.map(item => item.code).join('')}
                          </span>
                        </div>
                        <div className="space-y-4">
                          {detail.riasec_interests.map((item) => (
                            <div key={item.code} className="flex gap-3">
                              <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-600 text-sm font-bold text-white">
                                {item.code}
                              </div>
                              <div>
                                <div className="font-bold text-gray-900 dark:text-white">{item.label}</div>
                                <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">{item.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Alternative Titles */}
                    {detail.alternative_titles && detail.alternative_titles.length > 0 && (
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                        <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">{t('careerDetail.alternativeTitles')}</h3>
                        <div className="flex flex-wrap gap-2">
                          {detail.alternative_titles.map((title, i) => (
                            <span key={i} className="px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium border border-green-200 dark:border-green-800">
                              {title}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Block B: Key Responsibilities */}
                  <div className="bg-white dark:bg-gray-800 rounded-[24px] p-8 shadow-lg border border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3"><span className="w-2 h-6 bg-blue-500 rounded-full"></span>{t('careerDetail.keyResponsibilities')}</h2>
                    {detail.sections.tasks.length > 0 ? (
                      <div>
                        {(() => {
                          const { topTasks, remainingTasks } = getTopTasks(detail.sections.tasks);
                          const tasksToShow = showAllTasks ? [...topTasks, ...remainingTasks] : topTasks;

                          return (
                            <>
                              <ul className="space-y-3">
                                {tasksToShow.map((task, i) => (
                                  <li key={i} className="flex items-start gap-3">
                                    <span className="mt-1.5 w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                                    <span className="text-gray-600 dark:text-gray-300 text-base">{task.task_text}</span>
                                  </li>
                                ))}
                              </ul>

                              {/* Show More/Less Button */}
                              {remainingTasks.length > 0 && (
                                <div className="mt-6 text-center">
                                  <button
                                    onClick={() => setShowAllTasks(!showAllTasks)}
                                    className="inline-flex items-center px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                  >
                                    {showAllTasks ? (
                                      <>
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                        </svg>
                                        {t('careerDetail.showLess')}
                                      </>
                                    ) : (
                                      <>
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                        {t('careerDetail.showMore')} ({remainingTasks.length} {t('careerDetail.moreTasks')})
                                      </>
                                    )}
                                  </button>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    ) : (<p className="text-gray-400 italic">{t('careerDetail.noTaskData')}</p>)}
                  </div>
                  {/* Block C: Technology Stack - Grouped by category */}
                  <div className="bg-white dark:bg-gray-800 rounded-[24px] p-8 shadow-lg border border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3"><span className="w-2 h-6 bg-purple-500 rounded-full"></span>{t('careerDetail.technologyStack')}</h2>
                    {detail.sections.technology.length > 0 ? (
                      <TechnologyGrouped technologies={detail.sections.technology} language={language} />
                    ) : (<p className="text-gray-400 italic">{t('careerDetail.noTechnologyData')}</p>)}
                  </div>
                  {/* Block D: Competencies Profile (Locked for Free/Basic) */}
                  {isSectionLocked('competencies') ? (
                    <div className="bg-white dark:bg-gray-800 rounded-[24px] p-8 shadow-lg border border-gray-100 dark:border-gray-700 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gray-100/80 dark:bg-gray-900/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                        <div className="text-4xl mb-4">🔒</div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('careerDetail.competenciesProfileLocked')}</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-center mb-4 max-w-md">{t('careerDetail.upgradeToUnlock', { plan: nextPlanInfo?.name || 'Premium' })}</p>
                        <button onClick={() => navigate('/pricing')} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors">{t('careerDetail.upgradeNow')}</button>
                      </div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3"><span className="w-2 h-6 bg-teal-500 rounded-full"></span>{t('careerDetail.competenciesProfile')}</h2>
                      <div className="h-48 bg-gray-50 dark:bg-gray-700 rounded-xl"></div>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-[24px] p-8 shadow-lg border border-gray-100 dark:border-gray-700">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3"><span className="w-2 h-6 bg-teal-500 rounded-full"></span>{t('careerDetail.competenciesProfile')}</h2>
                      {/* Tabs */}
                      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
                        {(['knowledge', 'skills', 'abilities'] as const).map(tab => (<button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 font-semibold text-sm transition-colors ${activeTab === tab ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>{t(`careerDetail.${tab}`)}</button>))}
                      </div>
                      {/* Tab Content */}
                      <div className="space-y-3">
                        {(activeTab === 'knowledge' ? detail.sections.knowledge : activeTab === 'skills' ? detail.sections.skills : detail.sections.abilities).slice(0, 10).map((item, i) => {
                          // Capitalize each word in the name
                          const capitalizedName = item.name.split(' ').map(word =>
                            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                          ).join(' ');
                          // Use level and importance directly from DB (scale 0-5)
                          const levelValue = Number(item.level || 0);
                          const importanceValue = Number(item.importance || 0);

                          return (
                            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg gap-4">
                              <span className="text-black dark:text-white font-medium flex-1 min-w-0">{capitalizedName}</span>
                              <div className="flex items-center gap-4 flex-shrink-0">
                                {/* Level */}
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400 dark:text-gray-500 w-8">{t('careerDetail.level')}</span>
                                  <div className="w-20 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden flex">
                                    {[1, 2, 3, 4, 5].map(seg => (
                                      <div key={seg} className={`flex-1 ${seg <= Math.round(levelValue) ? 'bg-indigo-600' : ''}`} style={{ borderRight: seg < 5 ? '1px solid rgba(156,163,175,0.3)' : 'none' }}></div>
                                    ))}
                                  </div>
                                  <span className="text-xs text-gray-500 dark:text-gray-400 w-6 text-right">{levelValue.toFixed(1)}</span>
                                </div>
                                {/* Importance */}
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400 dark:text-gray-500 w-12">{t('careerDetail.importance')}</span>
                                  <div className="w-20 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden flex">
                                    {[1, 2, 3, 4, 5].map(seg => (
                                      <div key={seg} className={`flex-1 ${seg <= Math.round(importanceValue) ? 'bg-orange-500' : ''}`} style={{ borderRight: seg < 5 ? '1px solid rgba(156,163,175,0.3)' : 'none' }}></div>
                                    ))}
                                  </div>
                                  <span className="text-xs text-gray-500 dark:text-gray-400 w-6 text-right">{importanceValue.toFixed(1)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {(activeTab === 'knowledge' ? detail.sections.knowledge : activeTab === 'skills' ? detail.sections.skills : detail.sections.abilities).length === 0 && (<p className="text-gray-400 italic">{t(`careerDetail.no${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}Data`)}</p>)}
                      </div>
                    </div>
                  )}

                  {/* Block E: NEW - Detailed Work Activities */}
                  <div className="bg-white dark:bg-gray-800 rounded-[24px] p-8 shadow-lg border border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                      <span className="w-2 h-6 bg-indigo-500 rounded-full"></span>
                      {t('careerDetail.detailedWorkActivities')}
                    </h2>
                    {detail.sections.detailed_work_activities && detail.sections.detailed_work_activities.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {detail.sections.detailed_work_activities.slice(0, 8).map((dwa, i) => (
                          <div key={i} className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800 hover:shadow-md transition-shadow">
                            <div className="flex items-start gap-3">
                              <span className="mt-0.5 w-7 h-7 bg-indigo-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {i + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-gray-800 dark:text-gray-200 text-sm font-semibold leading-relaxed">
                                  {dwa.dwa_title}
                                </p>
                                {(dwa as any).activity_category && (
                                  <span className="inline-block mt-1.5 px-2 py-0.5 text-xs font-medium bg-indigo-100 dark:bg-indigo-800/40 text-indigo-700 dark:text-indigo-300 rounded-md">
                                    {(dwa as any).activity_category}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 italic">{t('careerDetail.noDetailedWorkActivitiesData')}</p>
                    )}
                  </div>

                  {/* Block F: NEW - Work Activities Summary */}
                  <div className="bg-white dark:bg-gray-800 rounded-[24px] p-8 shadow-lg border border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                      <span className="w-2 h-6 bg-amber-500 rounded-full"></span>
                      {t('careerDetail.topWorkActivities')}
                    </h2>
                    {detail.sections.work_activities && detail.sections.work_activities.length > 0 ? (
                      <div className="space-y-3">
                        {detail.sections.work_activities.slice(0, 10).map((activity, i) => {
                          const activityName = language === 'vi'
                            ? (activity.element_name_vi || activity.element_name || 'Unknown Activity')
                            : (activity.element_name || activity.element_name_vi || 'Unknown Activity');

                          // Safely handle numeric values
                          const combinedScore = Number(activity.combined_score || 0);
                          const activityRank = Number(activity.activity_rank || i + 1);

                          return (
                            <div key={i} className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="flex items-center justify-center w-8 h-8 bg-amber-500 text-white rounded-full text-sm font-bold flex-shrink-0">
                                  {activityRank}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-gray-700 dark:text-gray-300 font-medium text-sm leading-relaxed">
                                    {activityName}
                                  </p>
                                  {activity.is_top_activity && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 mt-1">
                                      ⭐ {t('careerDetail.topActivity')}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-4 flex-shrink-0">
                                <div className="text-right">
                                  <div className="text-xs text-gray-400 dark:text-gray-500">{t('careerDetail.combinedScore')}</div>
                                  <div className="text-sm font-bold text-amber-600 dark:text-amber-400">
                                    {combinedScore.toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-400 italic">{t('careerDetail.noWorkActivitiesData')}</p>
                    )}
                  </div>

                  {/* Block G: NEW - Work Context */}
                  <div className="bg-white dark:bg-gray-800 rounded-[24px] p-8 shadow-lg border border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                      <span className="w-2 h-6 bg-cyan-500 rounded-full"></span>
                      {t('careerDetail.workEnvironment')}
                    </h2>
                    {detail.sections.work_context && detail.sections.work_context.length > 0 ? (() => {
                      const ctx = detail.sections.work_context;

                      // Chỉ lấy CX (Context Value) - giá trị tổng hợp quan trọng (thang 1-5)
                      const cxItems = ctx.filter(item => 
                        (item as any).scale_id === 'CX' && 
                        item.data_value && 
                        Number(item.data_value) > 1.5
                      );

                      // Nhóm theo chủ đề
                      const groups: Record<string, { label: string; icon: string; color: string; textColor: string; items: typeof cxItems }> = {
                        social: { label: 'Tương tác & Giao tiếp', icon: '👥', color: 'from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20', textColor: 'text-purple-700 dark:text-purple-300', items: [] },
                        physical: { label: 'Môi trường làm việc', icon: '🏢', color: 'from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20', textColor: 'text-emerald-700 dark:text-emerald-300', items: [] },
                        hazard: { label: 'Rủi ro & An toàn', icon: '⚠️', color: 'from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20', textColor: 'text-orange-700 dark:text-orange-300', items: [] },
                        autonomy: { label: 'Tự chủ & Trách nhiệm', icon: '🎯', color: 'from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-sky-900/20', textColor: 'text-blue-700 dark:text-blue-300', items: [] },
                        body: { label: 'Hoạt động thể chất', icon: '💪', color: 'from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20', textColor: 'text-rose-700 dark:text-rose-300', items: [] },
                      };

                      cxItems.forEach(item => {
                        const eid = item.element_id || '';
                        if (eid.startsWith('4.C.1.a') || eid.startsWith('4.C.1.b') || eid.startsWith('4.C.1.c') || eid.startsWith('4.C.1.d')) {
                          groups.social.items.push(item);
                        } else if (eid.startsWith('4.C.2.a')) {
                          groups.physical.items.push(item);
                        } else if (eid.startsWith('4.C.2.b') || eid.startsWith('4.C.2.c') || eid.startsWith('4.C.2.d') || eid.startsWith('4.C.2.e')) {
                          groups.hazard.items.push(item);
                        } else if (eid.startsWith('4.C.3')) {
                          groups.autonomy.items.push(item);
                        } else if (eid.startsWith('4.C.2.f') || eid.startsWith('4.C.2.g')) {
                          groups.body.items.push(item);
                        } else {
                          groups.social.items.push(item);
                        }
                      });

                      // Lọc nhóm có data, sort items theo data_value desc, top 4 mỗi nhóm
                      const activeGroups = Object.entries(groups)
                        .filter(([, g]) => g.items.length > 0)
                        .map(([key, g]) => ({
                          ...g,
                          key,
                          items: g.items
                            .sort((a, b) => Number(b.data_value || 0) - Number(a.data_value || 0))
                            .slice(0, 4),
                        }));

                      // Hàm chuyển giá trị 1-5 thành mô tả
                      const getLevelLabel = (val: number): string => {
                        if (val >= 4.5) return 'Rất cao';
                        if (val >= 3.5) return 'Cao';
                        if (val >= 2.5) return 'Trung bình';
                        if (val >= 1.5) return 'Thấp';
                        return 'Rất thấp';
                      };

                      const getLevelColor = (val: number): string => {
                        if (val >= 4.5) return 'bg-red-500';
                        if (val >= 3.5) return 'bg-orange-500';
                        if (val >= 2.5) return 'bg-yellow-500';
                        if (val >= 1.5) return 'bg-green-500';
                        return 'bg-gray-400';
                      };

                      return (
                        <div className="space-y-8">
                          {activeGroups.map(group => (
                            <div key={group.key}>
                              <div className="flex items-center gap-3 mb-4">
                                <span className="text-xl">{group.icon}</span>
                                <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">{group.label}</h3>
                              </div>
                              <div className="space-y-3">
                                {group.items.map((context, i) => {
                                  const name = language === 'vi'
                                    ? ((context as any).element_name_vi || context.element_name)
                                    : context.element_name;
                                  const val = Number(context.data_value || 0);
                                  const barWidth = Math.min((val / 5) * 100, 100);

                                  return (
                                    <div key={i} className={`p-4 rounded-xl bg-gradient-to-r ${group.color} border border-gray-100 dark:border-gray-700`}>
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex-1">
                                          {name}
                                        </span>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                          <span className={`text-xs font-bold ${group.textColor} px-2 py-0.5 rounded-full bg-white/70 dark:bg-gray-800/70`}>
                                            {getLevelLabel(val)}
                                          </span>
                                          <span className="text-xs font-mono text-gray-500 dark:text-gray-400 w-8 text-right">
                                            {val.toFixed(1)}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="w-full bg-white/60 dark:bg-gray-700/60 rounded-full h-2">
                                        <div
                                          className={`${getLevelColor(val)} h-2 rounded-full transition-all duration-700`}
                                          style={{ width: `${barWidth}%` }}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })() : (
                      <p className="text-gray-400 italic">{t('careerDetail.noWorkContextData')}</p>
                    )}
                  </div>
                </div>
                {/* Right Column - Sidebar */}
                <div className="space-y-6">
                  {isSectionLocked('sidebar') ? (
                    <>
                      {/* Locked Requirements */}
                      <div className="bg-white dark:bg-gray-800 rounded-[24px] p-6 shadow-lg border border-gray-100 dark:border-gray-700 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gray-100/80 dark:bg-gray-900/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-4">
                          <div className="text-3xl mb-2">🔒</div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">{t('careerDetail.upgradeToProUnlock')}</p>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('careerDetail.requirements')}</h3>
                        <div className="h-24 bg-gray-50 dark:bg-gray-700 rounded-xl"></div>
                      </div>
                      {/* Locked Salary */}
                      <div className="bg-white dark:bg-gray-800 rounded-[24px] p-6 shadow-lg border border-gray-100 dark:border-gray-700 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gray-100/80 dark:bg-gray-900/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-4">
                          <div className="text-3xl mb-2">🔒</div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">{t('careerDetail.upgradeToProUnlock')}</p>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('careerDetail.salaryInformation')}</h3>
                        <div className="h-24 bg-gray-50 dark:bg-gray-700 rounded-xl"></div>
                      </div>
                      {/* Locked Outlook */}
                      <div className="bg-white dark:bg-gray-800 rounded-[24px] p-6 shadow-lg border border-gray-100 dark:border-gray-700 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gray-100/80 dark:bg-gray-900/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-4">
                          <div className="text-3xl mb-2">🔒</div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">{t('careerDetail.upgradeToProUnlock')}</p>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('careerDetail.jobOutlook')}</h3>
                        <div className="h-24 bg-gray-50 dark:bg-gray-700 rounded-xl"></div>
                      </div>
                      {/* Upgrade CTA */}
                      <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-[24px] p-6 text-white">
                        <h3 className="text-lg font-bold mb-2">{t('careerDetail.unlockFullAccess')}</h3>
                        <p className="text-purple-100 text-sm mb-4">{t('careerDetail.unlockFullAccessDesc')}</p>
                        <button onClick={() => navigate('/pricing')} className="w-full py-3 bg-white text-purple-700 font-bold rounded-xl hover:bg-purple-50 transition-colors">{t('careerDetail.viewPlans')}</button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Requirements */}
                      <div className="bg-white dark:bg-gray-800 rounded-[24px] p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">📋 {t('careerDetail.requirements')}</h3>
                        <div className="space-y-4">
                          <div><div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t('careerDetail.experience')}</div><div className="text-base font-semibold text-gray-900 dark:text-white">{detail.sections.overview?.experience_text || detail.sections.preparation?.experience_summary || t('careerDetail.variesByPosition')}</div></div>
                          <div><div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t('careerDetail.education')}</div><div className="text-base font-semibold text-gray-900 dark:text-white">{detail.sections.overview?.degree_text || detail.sections.preparation?.education_summary || t('careerDetail.variesByPosition')}</div></div>
                          {detail.sections.preparation?.job_zone && (
                            <div><div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t('careerDetail.jobZone')}</div><div className="text-base font-semibold text-gray-900 dark:text-white">{t('careerDetail.zone')} {detail.sections.preparation.job_zone}</div></div>
                          )}
                        </div>
                      </div>

                      {/* Education Requirements Breakdown */}
                      {detail.sections.education_requirements && detail.sections.education_requirements.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-[24px] p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">🎓 {t('careerDetail.educationBreakdown')}</h3>
                          <div className="space-y-3">
                            {detail.sections.education_requirements.slice(0, 5).map((edu, i) => (
                              <div key={i} className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-black dark:text-white truncate">
                                    {edu.element_name}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {edu.category_description}
                                  </p>
                                </div>
                                <div className="flex-shrink-0 ml-3">
                                  <span className="text-sm font-bold text-indigo-800 dark:text-indigo-400">
                                    {Number(edu.data_value || 0).toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Enhanced Salary */}
                      <div className="bg-white dark:bg-gray-800 rounded-[24px] p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">💰 {t('careerDetail.salaryInformation')}</h3>
                        <div className="space-y-4">
                          {/* Primary salary display */}
                          {detail.sections.wages ? (
                            <div>
                              {language === 'vi' ? (
                                // Vietnamese wages
                                <>
                                  {detail.sections.wages.monthly_median_vnd && (
                                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl mb-3">
                                      <div className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">{t('careerDetail.monthlyMedianVN')}</div>
                                      <div className="text-2xl font-extrabold text-green-700 dark:text-green-300">{formatSalary(detail.sections.wages.monthly_median_vnd, 'VND')}</div>
                                    </div>
                                  )}
                                  {detail.sections.wages.annual_median_vnd && (
                                    <div className="flex justify-between text-sm mb-2">
                                      <span className="text-gray-500">{t('careerDetail.annual')}:</span>
                                      <span className="font-semibold text-gray-900 dark:text-white">{formatSalary(detail.sections.wages.annual_median_vnd, 'VND')}</span>
                                    </div>
                                  )}
                                  {/* Regional breakdown for Vietnam */}
                                  {(detail.sections.wages.region_hcm_monthly || detail.sections.wages.region_hanoi_monthly) && (
                                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t('careerDetail.byRegion')}</div>
                                      {detail.sections.wages.region_hcm_monthly && (
                                        <div className="flex justify-between text-sm mb-1">
                                          <span className="text-gray-500">{t('careerDetail.hoChiMinh')}:</span>
                                          <span className="font-semibold text-gray-900 dark:text-white">{formatSalary(detail.sections.wages.region_hcm_monthly, 'VND')}</span>
                                        </div>
                                      )}
                                      {detail.sections.wages.region_hanoi_monthly && (
                                        <div className="flex justify-between text-sm mb-1">
                                          <span className="text-gray-500">{t('careerDetail.hanoi')}:</span>
                                          <span className="font-semibold text-gray-900 dark:text-white">{formatSalary(detail.sections.wages.region_hanoi_monthly, 'VND')}</span>
                                        </div>
                                      )}
                                      {detail.sections.wages.region_danang_monthly && (
                                        <div className="flex justify-between text-sm mb-1">
                                          <span className="text-gray-500">{t('careerDetail.daNang')}:</span>
                                          <span className="font-semibold text-gray-900 dark:text-white">{formatSalary(detail.sections.wages.region_danang_monthly, 'VND')}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </>
                              ) : (
                                // US wages
                                <>
                                  {detail.sections.wages.annual_median && (
                                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl mb-3">
                                      <div className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">{t('careerDetail.annualMedianUS')}</div>
                                      <div className="text-2xl font-extrabold text-green-700 dark:text-green-300">{formatSalary(detail.sections.wages.annual_median, 'USD')}</div>
                                    </div>
                                  )}
                                  {detail.sections.wages.hourly_median && (
                                    <div className="flex justify-between text-sm mb-2">
                                      <span className="text-gray-500">{t('careerDetail.hourly')}:</span>
                                      <span className="font-semibold text-gray-900 dark:text-white">{formatSalary(detail.sections.wages.hourly_median, 'USD')}/hr</span>
                                    </div>
                                  )}
                                  {/* Percentile breakdown for US */}
                                  {(detail.sections.wages.annual_10th_percentile || detail.sections.wages.annual_90th_percentile) && (
                                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t('careerDetail.salaryRange')}</div>
                                      {detail.sections.wages.annual_10th_percentile && (
                                        <div className="flex justify-between text-sm mb-1">
                                          <span className="text-gray-500">{t('careerDetail.percentile10th')}:</span>
                                          <span className="font-semibold text-gray-900 dark:text-white">{formatSalary(detail.sections.wages.annual_10th_percentile, 'USD')}</span>
                                        </div>
                                      )}
                                      {detail.sections.wages.annual_90th_percentile && (
                                        <div className="flex justify-between text-sm mb-1">
                                          <span className="text-gray-500">{t('careerDetail.percentile90th')}:</span>
                                          <span className="font-semibold text-gray-900 dark:text-white">{formatSalary(detail.sections.wages.annual_90th_percentile, 'USD')}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          ) : (
                            // Fallback to overview data
                            <div className="space-y-3">
                              {detail.sections.overview?.salary_avg && (
                                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                                  <div className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">{t('careerDetail.averageSalary')}</div>
                                  <div className="text-2xl font-extrabold text-green-700 dark:text-green-300">{formatSalary(detail.sections.overview.salary_avg, detail.sections.overview.salary_currency || 'USD')}</div>
                                </div>
                              )}
                              <div className="flex justify-between text-sm"><span className="text-gray-500">{t('careerDetail.min')}:</span><span className="font-semibold text-gray-900 dark:text-white">{formatSalary(detail.sections.overview?.salary_min, detail.sections.overview?.salary_currency || 'USD')}</span></div>
                              <div className="flex justify-between text-sm"><span className="text-gray-500">{t('careerDetail.max')}:</span><span className="font-semibold text-gray-900 dark:text-white">{formatSalary(detail.sections.overview?.salary_max, detail.sections.overview?.salary_currency || 'USD')}</span></div>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Job Outlook */}
                      <div className="bg-white dark:bg-gray-800 rounded-[24px] p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">📈 {t('careerDetail.jobOutlook')}</h3>
                        <div className="space-y-3">
                          {detail.sections.outlook?.growth_label && (
                            <div className="flex items-center gap-2">
                              <span className={`px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 ${
                                // Triển vọng tươi sáng / Excellent
                                (detail.sections.outlook.growth_label.toLowerCase().includes('triển vọng tươi sáng') ||
                                  detail.sections.outlook.growth_label.toLowerCase().includes('excellent'))
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                  // Nhanh hơn nhiều so với mức trung bình / Much faster
                                  : (detail.sections.outlook.growth_label.toLowerCase().includes('nhanh hơn nhiều') ||
                                    detail.sections.outlook.growth_label.toLowerCase().includes('much faster'))
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                    // Nhanh hơn mức trung bình / Faster
                                    : (detail.sections.outlook.growth_label.toLowerCase().includes('nhanh hơn mức') ||
                                      (detail.sections.outlook.growth_label.toLowerCase().includes('faster') &&
                                        !detail.sections.outlook.growth_label.toLowerCase().includes('much faster')))
                                      ? 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300'
                                      // Trung bình / Average
                                      : (detail.sections.outlook.growth_label.toLowerCase().includes('trung bình') ||
                                        detail.sections.outlook.growth_label.toLowerCase().includes('average'))
                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                        // Giảm / Declining
                                        : (detail.sections.outlook.growth_label.toLowerCase().includes('giảm') ||
                                          detail.sections.outlook.growth_label.toLowerCase().includes('decline') ||
                                          detail.sections.outlook.growth_label.toLowerCase().includes('declining'))
                                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                          // Default fallback
                                          : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
                                }`}>
                                {/* Icon dựa trên 5 mức độ cụ thể */}
                                {/* Triển vọng tươi sáng / Excellent - Star icon */}
                                {(detail.sections.outlook.growth_label.toLowerCase().includes('triển vọng tươi sáng') ||
                                  detail.sections.outlook.growth_label.toLowerCase().includes('excellent')) && (
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                    </svg>
                                  )}
                                {/* Nhanh hơn nhiều so với mức trung bình / Much faster - Double arrow up */}
                                {(detail.sections.outlook.growth_label.toLowerCase().includes('nhanh hơn nhiều') ||
                                  detail.sections.outlook.growth_label.toLowerCase().includes('much faster')) && (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7l5-5m0 0l5 5" />
                                    </svg>
                                  )}
                                {/* Nhanh hơn mức trung bình / Faster - Single arrow up */}
                                {(detail.sections.outlook.growth_label.toLowerCase().includes('nhanh hơn mức') ||
                                  (detail.sections.outlook.growth_label.toLowerCase().includes('faster') &&
                                    !detail.sections.outlook.growth_label.toLowerCase().includes('much faster'))) && (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                                    </svg>
                                  )}
                                {/* Trung bình / Average - Horizontal arrow */}
                                {(detail.sections.outlook.growth_label.toLowerCase().includes('trung bình') ||
                                  detail.sections.outlook.growth_label.toLowerCase().includes('average')) && (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                  )}
                                {/* Giảm / Declining - Arrow down */}
                                {(detail.sections.outlook.growth_label.toLowerCase().includes('giảm') ||
                                  detail.sections.outlook.growth_label.toLowerCase().includes('decline') ||
                                  detail.sections.outlook.growth_label.toLowerCase().includes('declining')) && (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                                    </svg>
                                  )}
                                {detail.sections.outlook.growth_label}
                              </span>
                            </div>
                          )}
                          {/* Hiển thị openings_est dựa trên ngôn ngữ */}
                          {detail.sections.outlook?.openings_est && (
                            <div>
                              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t('careerDetail.projectedOpenings')}</div>
                              <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                {detail.sections.outlook.openings_est}
                              </div>
                            </div>
                          )}
                          {detail.sections.outlook?.summary_md && (<p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{detail.sections.outlook.summary_md}</p>)}
                        </div>
                      </div>
                    </>
                  )}

                  {/* ── Companies Hiring — cuoi cot phai ── */}
                  {companies.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-[24px] p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                      <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        Công ty đang tuyển dụng
                      </h3>
                      <div className="space-y-2">
                        {companies.map(co => {
                          const links = allUrls(co);
                          return (
                            <div key={co.id} className="p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-700 transition-colors" style={{ background: 'var(--neu-bg, #f9fafb)' }}>
                              <div className="font-semibold text-sm text-blue-900 dark:text-blue-200 mb-1">{co.name}</div>
                              <div className="flex gap-1 flex-wrap mb-2">
                                {co.industry && <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{co.industry}</span>}
                                {co.location && <span className="text-xs text-gray-400"> {co.location.split('/')[0].trim()}</span>}
                              </div>
                              <div className="flex gap-1.5 flex-wrap">
                                {links.slice(0, 3).map(l => (
                                  <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer"
                                    className="text-xs font-semibold px-2.5 py-1 rounded-full border transition-opacity hover:opacity-75"
                                    style={{ background: l.label === 'Trang tuyển dụng' ? '#2563eb' : '#fff', color: l.label === 'Trang tuyển dụng' ? '#fff' : '#2563eb', borderColor: '#bfdbfe', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                                    {l.label}
                                  </a>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs text-gray-400 mt-3">Bấm vào nút để xem trang tuyển dụng.</p>
                    </div>
                  )}
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
