import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { roadmapService } from '../services/roadmapService';
import { careerService } from '../services/careerService';
import RoadmapTimelineComponent from '../components/roadmap/RoadmapTimelineComponent';
import { Roadmap } from '../types/roadmap';
import MainLayout from '../components/layout/MainLayout';
import { paymentService, UserPermissions } from '../services/paymentService';
import { PricingModal } from '../components/payment/PricingModal';
import { UpgradePrompt } from '../components/payment/UpgradePrompt';
import { SimplePaymentPrompt } from '../components/payment/SimplePaymentPrompt';

const RoadmapPage = () => {
    const { careerId } = useParams<{ careerId: string }>();

    const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [completingMilestone, setCompletingMilestone] = useState<string | null>(null);
    const [careerDesc, setCareerDesc] = useState<string>('');
    const [showFullDesc, setShowFullDesc] = useState<boolean>(false);

    // Payment integration
    const [permissions, setPermissions] = useState<UserPermissions | null>(null);
    const [showPricing, setShowPricing] = useState(false);
    const [showSimplePrompt, setShowSimplePrompt] = useState(false);
    const [selectedLevel, setSelectedLevel] = useState<number>(1);

    useEffect(() => {
        if (careerId) fetchRoadmap();
        loadPermissions();
    }, [careerId]);

    const loadPermissions = async () => {
        try {
            const perms = await paymentService.getUserPermissions();
            setPermissions(perms);
        } catch (error) {
            // Silently use mock data when backend is not available
            // console.error('Failed to load permissions:', error);
            
            // TEMPORARY: Use mock data when backend is not available
            // TODO: Remove this after backend is fixed
            setPermissions({
                has_active_subscription: false,
                can_take_test: true,
                can_view_all_careers: false,
                can_view_full_roadmap: false,
                test_count_this_month: 0,
                free_test_quota: 5,
                remaining_free_tests: 5
            });
        }
    };

    const fetchRoadmap = async () => {
        if (!careerId) return;
        try {
            setLoading(true);
            const data = await roadmapService.getRoadmap(careerId);
            setRoadmap(data);

            try {
                const c = await careerService.get(careerId);
                setCareerDesc((c as any).description || (c as any).short_desc || '');
            } catch { }
        } catch (err) {
            setError('Failed to load roadmap.');
        } finally {
            setLoading(false);
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
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#4A7C59] dark:border-green-600 mb-4"></div>
                        <p className="text-gray-500 dark:text-gray-400">Loading roadmap...</p>
                    </div>
                )}

                {error && (
                    <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl p-6 text-center">
                        <p className="text-red-800 dark:text-red-300 font-semibold">{error}</p>
                    </div>
                )}

                {!loading && roadmap && (
                    <>
                        {/* Header Card */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-700 mb-8">
                            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
                                {roadmap.careerTitle}
                            </h1>

                            {/* Career Stages - Clickable */}
                            <div className="flex flex-wrap justify-center gap-4 mb-8" style={{ scrollMargin: 0 }}>
                                {[
                                    { stage: 'intern', label: 'THỰC TẬP SINH', level: 1 },
                                    { stage: 'employee', label: 'TRỢ LÝ', level: 2 },
                                    { stage: 'manager', label: 'NHÂN VIÊN', level: 3 },
                                    { stage: 'director', label: 'CHUYÊN VIÊN', level: 4 },
                                    { stage: 'ceo', label: 'TRƯỞNG PHÒNG', level: 5 },
                                    { stage: 'executive', label: 'GIÁM ĐỐC', level: 6 },
                                ].map((item, idx) => {
                                    const completed = (roadmap.userProgress?.completed_milestones?.length || 0) > idx * 2;
                                    const isCurrent = idx === Math.floor((roadmap.userProgress?.completed_milestones?.length || 0) / 2);
                                    const isLocked = permissions && !permissions.can_view_full_roadmap && item.level > 1;

                                    const handleLevelClick = (e: React.MouseEvent) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        
                                        // Save current scroll position
                                        const currentScrollY = window.scrollY;
                                        
                                        // Debug: Check if locked
                                        console.log('Level clicked:', item.level, 'isLocked:', isLocked, 'permissions:', permissions);
                                        
                                        if (isLocked) {
                                            // Show simple payment prompt for locked levels - NO SCROLL
                                            setSelectedLevel(item.level);
                                            setShowSimplePrompt(true);
                                            
                                            // Prevent any scroll by restoring position
                                            setTimeout(() => {
                                                window.scrollTo(0, currentScrollY);
                                            }, 0);
                                        } else {
                                            // Scroll to learning timeline section for unlocked levels
                                            const timelineSection = document.getElementById('learning-timeline');
                                            if (timelineSection) {
                                                timelineSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                            }
                                        }
                                    };

                                    return (
                                        <div key={idx} className="relative flex flex-col items-center">
                                            {/* Circle - Clickable */}
                                            <button
                                                type="button"
                                                onClick={handleLevelClick}
                                                onFocus={(e) => e.currentTarget.blur()}
                                                className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-md transition-all cursor-pointer hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                                completed 
                                                    ? 'bg-[#4A7C59] dark:bg-green-600 hover:bg-[#3d6449] dark:hover:bg-green-700 focus:ring-[#4A7C59]' 
                                                    : isCurrent 
                                                        ? 'bg-[#4A7C59]/30 dark:bg-green-600/30 ring-2 ring-[#4A7C59] dark:ring-green-500 hover:bg-[#4A7C59]/40 focus:ring-[#4A7C59]' 
                                                        : isLocked
                                                            ? 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 focus:ring-purple-500'
                                                            : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 focus:ring-gray-400'
                                            }`}
                                                title={isLocked ? 'Click để nâng cấp và mở khóa' : 'Click để xem chi tiết'}
                                            >
                                                <div className="text-center">
                                                    <div className={`font-bold text-xs leading-tight px-2 ${
                                                        completed || isCurrent 
                                                            ? 'text-white' 
                                                            : 'text-gray-600 dark:text-gray-400'
                                                    }`}>
                                                        {item.label}
                                                    </div>
                                                </div>
                                                {completed && (
                                                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-md">
                                                        <svg className="w-4 h-4 text-[#4A7C59] dark:text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                )}
                                                {/* Lock icon for locked levels */}
                                                {isLocked && (
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <svg className="w-6 h-6 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </button>
                                            {/* Level text */}
                                            <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 font-medium">
                                                Level {idx + 1}
                                            </div>
                                            {/* Arrow - centered between circles */}
                                            {idx < 5 && (
                                                <div className="absolute -right-5 top-1/2 transform -translate-y-1/2 flex items-center">
                                                    <svg className="w-4 h-4 text-[#4A7C59] dark:text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Description */}
                            {careerDesc && (
                                <div className="mt-6">
                                    <p className={`text-gray-700 dark:text-gray-300 leading-relaxed ${showFullDesc ? '' : 'line-clamp-3'}`}>
                                        {careerDesc}
                                    </p>
                                    {careerDesc.length > 200 && (
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
                                    <div className="text-[#4A7C59] dark:text-green-400 font-bold text-sm mb-1">EXPERIENCE</div>
                                    <div className="text-gray-900 dark:text-white">{(roadmap as any).overview?.experienceText || '6 months - 1 year'}</div>
                                </div>
                                <div className="bg-[#E8DCC8] dark:bg-gray-700 rounded-xl p-4">
                                    <div className="text-[#4A7C59] dark:text-green-400 font-bold text-sm mb-1">EDUCATION</div>
                                    <div className="text-gray-900 dark:text-white">{(roadmap as any).overview?.degreeText || 'College, University'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Job Requirements */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-700 mb-8">
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Job Requirements</h3>
                            
                            <div className="space-y-3">
                                <div className="flex items-start">
                                    <svg className="w-5 h-5 text-[#4A7C59] dark:text-green-400 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <p className="text-gray-700 dark:text-gray-300">Strong communication and interpersonal skills</p>
                                </div>
                                <div className="flex items-start">
                                    <svg className="w-5 h-5 text-[#4A7C59] dark:text-green-400 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <p className="text-gray-700 dark:text-gray-300">Ability to work independently and as part of a team</p>
                                </div>
                                <div className="flex items-start">
                                    <svg className="w-5 h-5 text-[#4A7C59] dark:text-green-400 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <p className="text-gray-700 dark:text-gray-300">Problem-solving and analytical thinking abilities</p>
                                </div>
                                <div className="flex items-start">
                                    <svg className="w-5 h-5 text-[#4A7C59] dark:text-green-400 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <p className="text-gray-700 dark:text-gray-300">Adaptability and willingness to learn new technologies</p>
                                </div>
                            </div>
                        </div>

                        {/* Skills Progress */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-700 mb-8">
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Skills Development Progress</h3>
                            
                            <div className="space-y-6">
                                {[
                                    { name: 'Technical Skills', progress: 75, time: '9-12 months' },
                                    { name: 'Communication', progress: 60, time: '6-9 months' },
                                    { name: 'Leadership', progress: 40, time: '12-18 months' },
                                    { name: 'Project Management', progress: 30, time: '18-24 months' },
                                    { name: 'Strategic Thinking', progress: 20, time: '24-36 months' },
                                ].map((skill, idx) => (
                                    <div key={idx}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{skill.name}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-[#4A7C59] dark:text-green-400">{skill.progress}%</span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">{skill.time}</span>
                                            </div>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                                            <div 
                                                className="h-full bg-[#4A7C59] dark:bg-green-600 transition-all duration-500 rounded-full"
                                                style={{ width: `${skill.progress}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Salary Range - Simplified */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-700 mb-8">
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Average Salary Range</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-[#E8DCC8] dark:bg-gray-700 rounded-xl p-6 text-center border border-gray-300 dark:border-gray-600">
                                    <div className="text-sm mb-2 text-gray-600 dark:text-gray-400 font-semibold">Entry Level</div>
                                    <div className="text-3xl font-bold text-gray-900 dark:text-white">$40K - $60K</div>
                                    <div className="text-xs mt-2 text-gray-500 dark:text-gray-400">Per year</div>
                                </div>
                                <div className="bg-[#4A7C59] dark:bg-green-600 rounded-xl p-6 text-center border border-[#4A7C59] dark:border-green-600">
                                    <div className="text-sm mb-2 text-white/90 font-semibold">Senior Level</div>
                                    <div className="text-3xl font-bold text-white">$80K - $120K</div>
                                    <div className="text-xs mt-2 text-white/80">Per year</div>
                                </div>
                            </div>
                        </div>

                        {/* Learning Timeline */}
                        <div id="learning-timeline" className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-700 scroll-mt-20">
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Detailed Learning Path</h3>
                            
                            {/* Show upgrade banner if user doesn't have subscription */}
                            {permissions && !permissions.can_view_full_roadmap && roadmap.milestones.some(m => (m.level || 1) > 1) && (
                                <div className="mb-6">
                                    <UpgradePrompt
                                        message="Bạn đang xem Level 1. Nâng cấp để xem toàn bộ 6 levels!"
                                        onUpgrade={() => setShowPricing(true)}
                                        variant="banner"
                                    />
                                </div>
                            )}

                            {/* Filter milestones based on permissions */}
                            {permissions && !permissions.can_view_full_roadmap ? (
                                <div className="space-y-6">
                                    {/* Show only Level 1 milestones for free users */}
                                    <RoadmapTimelineComponent
                                        milestones={roadmap.milestones.filter(m => (m.level || 1) === 1)}
                                        userProgress={roadmap.userProgress}
                                        onCompleteMilestone={handleCompleteMilestone}
                                        completingMilestone={completingMilestone}
                                    />
                                    
                                    {/* Show locked levels (2-6) with blur */}
                                    {roadmap.milestones.some(m => (m.level || 1) > 1) && (
                                        <div className="relative mt-8">
                                            <div className="blur-sm pointer-events-none opacity-50">
                                                <RoadmapTimelineComponent
                                                    milestones={roadmap.milestones.filter(m => (m.level || 1) === 2).slice(0, 2)}
                                                    userProgress={roadmap.userProgress}
                                                    onCompleteMilestone={handleCompleteMilestone}
                                                    completingMilestone={completingMilestone}
                                                />
                                            </div>
                                            <UpgradePrompt
                                                message="Nâng cấp để mở khóa Level 2-6 và xem toàn bộ lộ trình phát triển nghề nghiệp"
                                                onUpgrade={() => setShowPricing(true)}
                                                variant="overlay"
                                            />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <RoadmapTimelineComponent
                                    milestones={roadmap.milestones}
                                    userProgress={roadmap.userProgress}
                                    onCompleteMilestone={handleCompleteMilestone}
                                    completingMilestone={completingMilestone}
                                />
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Simple Payment Prompt - Shows when clicking locked levels */}
            <SimplePaymentPrompt
                isOpen={showSimplePrompt}
                onClose={() => setShowSimplePrompt(false)}
                onPayment={() => {
                    setShowSimplePrompt(false);
                    setShowPricing(true);
                }}
                level={selectedLevel}
            />

            {/* Pricing Modal - Shows full pricing options */}
            <PricingModal
                isOpen={showPricing}
                onClose={() => setShowPricing(false)}
                reason="roadmap"
            />
        </MainLayout>
    );
};

export default RoadmapPage;
