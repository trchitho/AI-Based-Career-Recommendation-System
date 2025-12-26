import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { careerService, CareerDetailDTO } from '../services/careerService';
import { useUsageTracking } from '../hooks/useUsageTracking';
import { useFeatureAccess } from '../hooks/useFeatureAccess';

const CareerDetailPage = () => {
  const { idOrSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [detail, setDetail] = useState<CareerDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'knowledge' | 'skills' | 'abilities'>('knowledge');

  const { incrementUsage, canUseFeature } = useUsageTracking();
  const { hasFeature, currentPlan, getNextUpgradePlan, getPlanInfo } = useFeatureAccess();
  const hasTrackedUsageRef = useRef(false);

  useEffect(() => {
    const run = async () => {
      try {
        if (!idOrSlug) return;
        if (currentPlan === 'basic' && !hasFeature('unlimited_careers')) {
          const canView = canUseFeature('career_view');
          if (!canView) { window.location.href = '/pricing'; return; }
        }
        const data = await careerService.getDetail(idOrSlug, currentPlan);
        setDetail(data);
        const isFromCareersPage = location.state?.fromCareersPage === true;
        if (!hasTrackedUsageRef.current && !hasFeature('unlimited_careers') && isFromCareersPage) {
          incrementUsage('career_view');
          hasTrackedUsageRef.current = true;
        }
      } catch (err: any) { console.error(err); } finally { setLoading(false); }
    };
    run();
  }, [idOrSlug, currentPlan]);

  const isSectionLocked = (section: string) => detail?.locked_sections?.includes(section) ?? false;
  const formatSalary = (amount: number | null | undefined, currency: string = 'USD') => {
    if (!amount) return 'N/A';
    if (currency === 'VND') return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  };
  const nextPlan = getNextUpgradePlan();
  const nextPlanInfo = nextPlan ? getPlanInfo(nextPlan) : null;

  return (
    <MainLayout>
      <div className="min-h-screen bg-[#F8F9FA] dark:bg-gray-900 font-['Plus_Jakarta_Sans'] text-gray-900 dark:text-white relative overflow-x-hidden pb-20">
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');.bg-dot-pattern{background-image:radial-gradient(#E5E7EB 1px,transparent 1px);background-size:24px 24px}.dark .bg-dot-pattern{background-image:radial-gradient(#374151 1px,transparent 1px)}@keyframes fade-in-up{0%{opacity:0;transform:translateY(20px)}100%{opacity:1;transform:translateY(0)}}.animate-fade-in-up{animation:fade-in-up 0.6s ease-out forwards}`}</style>
        <div className="absolute inset-0 bg-dot-pattern pointer-events-none z-0 opacity-60"></div>
        <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-green-400/5 rounded-full blur-[120px] pointer-events-none z-0"></div>
        <div className="fixed bottom-0 left-0 w-[600px] h-[600px] bg-blue-400/5 rounded-full blur-[120px] pointer-events-none z-0"></div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading && (<div className="flex flex-col items-center justify-center py-32 animate-pulse"><div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 rounded-full border-t-green-600 mb-4 animate-spin"></div><p className="text-gray-500 font-medium">Loading career details...</p></div>)}
          {!loading && detail && (
            <div className="animate-fade-in-up space-y-8">
              {/* Header */}
              <div className="bg-gradient-to-r from-[#4A7C59] to-[#3d6449] dark:from-green-800 dark:to-green-900 rounded-[32px] p-8 md:p-12 shadow-xl shadow-green-900/20 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none"></div>
                <div className="relative z-10">
                  <button onClick={() => navigate(-1)} className="mb-6 flex items-center text-green-100 hover:text-white transition-colors text-sm font-bold uppercase tracking-wide">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>Back
                  </button>
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
                    <div><h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">{detail.title}</h1><p className="text-sm text-green-200 font-mono">O*NET Code: {detail.onet_code}</p></div>
                    <div className="flex-shrink-0"><Link to={`/careers/${idOrSlug}/roadmap`} className="group inline-flex items-center px-6 py-3 bg-white text-green-800 rounded-xl font-bold text-base shadow-lg hover:bg-green-50 transition-all hover:-translate-y-1">View Learning Roadmap<svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg></Link></div>
                  </div>
                </div>
              </div>
              {/* Main Grid 65/35 */}
              <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-8">
                {/* Left Column */}
                <div className="space-y-8">
                  {/* Block A: About */}
                  <div className="bg-white dark:bg-gray-800 rounded-[24px] p-8 shadow-lg border border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3"><span className="w-2 h-6 bg-green-500 rounded-full"></span>About the Role</h2>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-base">{detail.short_desc || detail.sections.outlook?.summary_md || "Explore this career path to discover opportunities and requirements."}</p>
                  </div>
                  {/* Block B: Key Responsibilities */}
                  <div className="bg-white dark:bg-gray-800 rounded-[24px] p-8 shadow-lg border border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3"><span className="w-2 h-6 bg-blue-500 rounded-full"></span>Key Responsibilities</h2>
                    {detail.sections.tasks.length > 0 ? (
                      <ul className="space-y-3">{detail.sections.tasks.slice(0, 7).map((task, i) => (<li key={i} className="flex items-start gap-3"><span className="mt-1.5 w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span><span className="text-gray-600 dark:text-gray-300 text-base">{task.task_text}</span></li>))}</ul>
                    ) : (<p className="text-gray-400 italic">No task data available.</p>)}
                  </div>
                  {/* Block C: Technology Stack */}
                  <div className="bg-white dark:bg-gray-800 rounded-[24px] p-8 shadow-lg border border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3"><span className="w-2 h-6 bg-purple-500 rounded-full"></span>Technology Stack</h2>
                    {detail.sections.technology.length > 0 ? (
                      <div className="flex flex-wrap gap-2">{detail.sections.technology.map((tech, i) => (<span key={i} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tech.hot_flag ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600'}`}>{tech.name} {tech.hot_flag && '🔥'}</span>))}</div>
                    ) : (<p className="text-gray-400 italic">No technology data available.</p>)}
                  </div>
                  {/* Block D: Competencies Profile (Locked for Free/Basic) */}
                  {isSectionLocked('competencies') ? (
                    <div className="bg-white dark:bg-gray-800 rounded-[24px] p-8 shadow-lg border border-gray-100 dark:border-gray-700 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gray-100/80 dark:bg-gray-900/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                        <div className="text-4xl mb-4">🔒</div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Competencies Profile Locked</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-center mb-4 max-w-md">Upgrade to {nextPlanInfo?.name || 'Premium'} to unlock detailed Knowledge, Skills, and Abilities analysis.</p>
                        <button onClick={() => navigate('/pricing')} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors">Upgrade Now</button>
                      </div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3"><span className="w-2 h-6 bg-teal-500 rounded-full"></span>Competencies Profile</h2>
                      <div className="h-48 bg-gray-50 dark:bg-gray-700 rounded-xl"></div>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-[24px] p-8 shadow-lg border border-gray-100 dark:border-gray-700">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3"><span className="w-2 h-6 bg-teal-500 rounded-full"></span>Competencies Profile</h2>
                      {/* Tabs */}
                      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
                        {(['knowledge', 'skills', 'abilities'] as const).map(tab => (<button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 font-semibold text-sm transition-colors ${activeTab === tab ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</button>))}
                      </div>
                      {/* Tab Content */}
                      <div className="space-y-3">
                        {(activeTab === 'knowledge' ? detail.sections.knowledge : activeTab === 'skills' ? detail.sections.skills : detail.sections.abilities).slice(0, 10).map((item, i) => {
                          // Capitalize each word in the name
                          const capitalizedName = item.name.split(' ').map(word =>
                            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                          ).join(' ');
                          // Use level and importance directly from DB (scale 0-5)
                          const levelValue = item.level ?? 0;
                          const importanceValue = item.importance ?? 0;

                          return (
                            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg gap-4">
                              <span className="text-gray-700 dark:text-gray-300 font-medium flex-1 min-w-0">{capitalizedName}</span>
                              <div className="flex items-center gap-4 flex-shrink-0">
                                {/* Level */}
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400 dark:text-gray-500 w-8">Level</span>
                                  <div className="w-20 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden flex">
                                    {[1, 2, 3, 4, 5].map(seg => (
                                      <div key={seg} className={`flex-1 ${seg <= Math.round(levelValue) ? 'bg-teal-500' : ''}`} style={{ borderRight: seg < 5 ? '1px solid rgba(156,163,175,0.3)' : 'none' }}></div>
                                    ))}
                                  </div>
                                  <span className="text-xs text-gray-500 dark:text-gray-400 w-6 text-right">{levelValue.toFixed(1)}</span>
                                </div>
                                {/* Importance */}
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400 dark:text-gray-500 w-12">Import.</span>
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
                        {(activeTab === 'knowledge' ? detail.sections.knowledge : activeTab === 'skills' ? detail.sections.skills : detail.sections.abilities).length === 0 && (<p className="text-gray-400 italic">No {activeTab} data available.</p>)}
                      </div>
                    </div>
                  )}
                </div>
                {/* Right Column - Sidebar */}
                <div className="space-y-6">
                  {isSectionLocked('sidebar') ? (
                    <>
                      {/* Locked Requirements */}
                      <div className="bg-white dark:bg-gray-800 rounded-[24px] p-6 shadow-lg border border-gray-100 dark:border-gray-700 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gray-100/80 dark:bg-gray-900/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-4">
                          <div className="text-3xl mb-2">🔒</div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">Upgrade to Pro to unlock</p>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Requirements</h3>
                        <div className="h-24 bg-gray-50 dark:bg-gray-700 rounded-xl"></div>
                      </div>
                      {/* Locked Salary */}
                      <div className="bg-white dark:bg-gray-800 rounded-[24px] p-6 shadow-lg border border-gray-100 dark:border-gray-700 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gray-100/80 dark:bg-gray-900/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-4">
                          <div className="text-3xl mb-2">🔒</div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">Upgrade to Pro to unlock</p>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Salary Information</h3>
                        <div className="h-24 bg-gray-50 dark:bg-gray-700 rounded-xl"></div>
                      </div>
                      {/* Locked Outlook */}
                      <div className="bg-white dark:bg-gray-800 rounded-[24px] p-6 shadow-lg border border-gray-100 dark:border-gray-700 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gray-100/80 dark:bg-gray-900/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-4">
                          <div className="text-3xl mb-2">🔒</div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">Upgrade to Pro to unlock</p>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Job Outlook</h3>
                        <div className="h-24 bg-gray-50 dark:bg-gray-700 rounded-xl"></div>
                      </div>
                      {/* Upgrade CTA */}
                      <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-[24px] p-6 text-white">
                        <h3 className="text-lg font-bold mb-2">Unlock Full Access</h3>
                        <p className="text-purple-100 text-sm mb-4">Get salary insights, job outlook, and detailed requirements with Pro plan.</p>
                        <button onClick={() => navigate('/pricing')} className="w-full py-3 bg-white text-purple-700 font-bold rounded-xl hover:bg-purple-50 transition-colors">View Plans</button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Requirements */}
                      <div className="bg-white dark:bg-gray-800 rounded-[24px] p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">📋 Requirements</h3>
                        <div className="space-y-4">
                          <div><div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Experience</div><div className="text-base font-semibold text-gray-900 dark:text-white">{detail.sections.overview?.experience_text || 'Varies by position'}</div></div>
                          <div><div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Education</div><div className="text-base font-semibold text-gray-900 dark:text-white">{detail.sections.overview?.degree_text || 'Varies by position'}</div></div>
                        </div>
                      </div>
                      {/* Salary */}
                      <div className="bg-white dark:bg-gray-800 rounded-[24px] p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">💰 Salary Information</h3>
                        <div className="space-y-3">
                          {detail.sections.overview?.salary_avg && (<div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl"><div className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">Average Salary</div><div className="text-2xl font-extrabold text-green-700 dark:text-green-300">{formatSalary(detail.sections.overview.salary_avg, detail.sections.overview.salary_currency || 'USD')}</div></div>)}
                          <div className="flex justify-between text-sm"><span className="text-gray-500">Min:</span><span className="font-semibold text-gray-900 dark:text-white">{formatSalary(detail.sections.overview?.salary_min, detail.sections.overview?.salary_currency || 'USD')}</span></div>
                          <div className="flex justify-between text-sm"><span className="text-gray-500">Max:</span><span className="font-semibold text-gray-900 dark:text-white">{formatSalary(detail.sections.overview?.salary_max, detail.sections.overview?.salary_currency || 'USD')}</span></div>
                        </div>
                      </div>
                      {/* Job Outlook */}
                      <div className="bg-white dark:bg-gray-800 rounded-[24px] p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">📈 Job Outlook</h3>
                        <div className="space-y-3">
                          {detail.sections.outlook?.growth_label && (<div className="flex items-center gap-2"><span className={`px-3 py-1 rounded-full text-sm font-bold ${detail.sections.outlook.growth_label.toLowerCase().includes('faster') || detail.sections.outlook.growth_label.toLowerCase().includes('much faster') ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : detail.sections.outlook.growth_label.toLowerCase().includes('decline') ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>{detail.sections.outlook.growth_label}</span></div>)}
                          {detail.sections.outlook?.openings_est && (<div><div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Projected Openings</div><div className="text-lg font-bold text-gray-900 dark:text-white">{detail.sections.outlook.openings_est.toLocaleString()} / year</div></div>)}
                          {detail.sections.outlook?.summary_md && (<p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{detail.sections.outlook.summary_md}</p>)}
                        </div>
                      </div>
                    </>
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
