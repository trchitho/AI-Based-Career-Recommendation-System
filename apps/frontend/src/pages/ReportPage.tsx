/**
 * ReportPage - Personality & Career Report
 * 
 * A comprehensive, PDF-style report page with 2 tabs:
 * - Tab 1: Big Five (7 pages)
 * - Tab 2: RIASEC (4 intro pages + 10 career detail pages + 2 closing pages)
 * 
 * Features:
 * - PageContainer for consistent page dimensions
 * - Print-ready layout (A4)
 * - Each career gets its own full page (1 career = 1 page)
 * - Rich career data from 5 DB tables
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { reportService, FullReportResponse } from '../services/reportService';
import { recommendationService, CareerRecommendationDTO } from '../services/recommendationService';
import { careerService } from '../services/careerService';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { useAuth } from '../contexts/AuthContext';

// Big Five Report Components
import {
    Big5Cover,
    Big5Page2Summary,
    Big5Page3Facets,
    Big5Page4Facets,
    Big5Page5Facets,
    Big5Page6Strengths,
    Big5Page7Closing,
    PageContainer,
} from '../components/report/big5';

// RIASEC Report Components
import {
    RIASECCover,
    RIASECPage2Interests,
    RIASECPage3TopInterests,
    RIASECPage4Careers,
    RIASECCareerDetailPage,
    RIASECPage7Guidance,
    RIASECPage8Closing,
    CareerFullData,
} from '../components/report/riasec';

const ReportPage = () => {
    const { assessmentId } = useParams<{ assessmentId: string }>();
    const [data, setData] = useState<FullReportResponse | null>(null);
    const [careers, setCareers] = useState<CareerFullData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'big5' | 'riasec'>('big5');
    const [showMoreCareers, setShowMoreCareers] = useState(false);
    const { hasFeature } = useFeatureAccess();
    const { user } = useAuth();

    // Email sending state
    const [emailInput, setEmailInput] = useState('');
    const [sendingEmail, setSendingEmail] = useState(false);
    const [emailResult, setEmailResult] = useState<{ success: boolean; message: string } | null>(null);

    // Handle send email to logged-in user
    const handleSendToMyEmail = async () => {
        if (!assessmentId) return;
        setSendingEmail(true);
        setEmailResult(null);
        try {
            const result = await reportService.sendReportEmail(parseInt(assessmentId), { useLoggedInEmail: true });
            setEmailResult(result);
        } catch (err) {
            setEmailResult({ success: false, message: 'Failed to send email' });
        } finally {
            setSendingEmail(false);
        }
    };

    // Handle send email to custom address
    const handleSendToCustomEmail = async () => {
        if (!assessmentId || !emailInput.trim()) return;
        setSendingEmail(true);
        setEmailResult(null);
        try {
            const result = await reportService.sendReportEmail(parseInt(assessmentId), { email: emailInput.trim() });
            setEmailResult(result);
            if (result.success) {
                setEmailInput(''); // Clear input on success
            }
        } catch (err) {
            setEmailResult({ success: false, message: 'Failed to send email' });
        } finally {
            setSendingEmail(false);
        }
    };

    // Track page views - use refs to avoid re-renders
    const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
    const hasLoggedOpen = useRef(false);
    const hasFetchedReport = useRef(false);

    const fetchReport = useCallback(async () => {
        if (!assessmentId) {
            setError('Assessment ID is required');
            setLoading(false);
            return;
        }

        // Guard against duplicate fetches (React StrictMode)
        if (hasFetchedReport.current) return;
        hasFetchedReport.current = true;

        try {
            setLoading(true);
            setError(null);

            // Fetch report and career recommendations in parallel
            const [reportResponse, recResponse] = await Promise.all([
                reportService.getFullReport(assessmentId, 'en'),
                recommendationService.getMain(assessmentId, 10), // Get 10 careers
            ]);

            setData(reportResponse);

            // Fetch detailed career data for each recommendation (all 5 tables)
            const careerDetailsPromises = recResponse.items.map(async (item: CareerRecommendationDTO) => {
                // Use job_onet (O*NET code) directly from backend if available
                // Otherwise extract from slug format: "camera-and-photographic-equipment-repairers-49-9061-00"
                let onetCode = item.job_onet || '';

                if (!onetCode) {
                    const slugOrId = item.slug || item.career_id;
                    // Try to extract onet_code from slug (last part with format XX-XXXX-XX)
                    const slugMatch = slugOrId.match(/(\d{2})-(\d{4})-(\d{2})$/);
                    if (slugMatch) {
                        onetCode = `${slugMatch[1]}-${slugMatch[2]}.${slugMatch[3]}`;
                    } else {
                        onetCode = slugOrId;
                    }
                }

                console.log(`[Career] Fetching detail for: ${onetCode} (job_onet: ${item.job_onet}, slug: ${item.slug})`);

                try {
                    const detail = await careerService.getDetail(onetCode);
                    console.log(`[Career] Success for ${onetCode}:`, detail?.sections);
                    return { item, detail, onetCode };
                } catch (err) {
                    console.error(`[Career] Failed for ${onetCode}:`, err);
                    // Try with original slug if onet_code format fails
                    try {
                        const detail = await careerService.getDetail(item.slug || item.career_id);
                        console.log(`[Career] Fallback success for ${item.slug || item.career_id}:`, detail?.sections);
                        return { item, detail, onetCode: item.slug || item.career_id };
                    } catch (err2) {
                        console.error(`[Career] Fallback also failed for: ${item.slug || item.career_id}`, err2);
                        return { item, detail: null, onetCode };
                    }
                }
            });

            const careerResults = await Promise.all(careerDetailsPromises);

            // Transform career recommendations to CareerFullData format with enriched data from 5 tables
            const careerData: CareerFullData[] = careerResults.map(({ item, detail, onetCode }) => {
                // Extract tasks from career_tasks
                const tasksRaw = detail?.sections?.tasks;
                const tasks = Array.isArray(tasksRaw)
                    ? tasksRaw
                        .sort((a, b) => (b.importance || 0) - (a.importance || 0))
                        .slice(0, 10)
                        .map(t => t.task_text)
                    : [];

                // Extract skills from career_ksas (ksa_type = 'skill')
                const skillsRaw = detail?.sections?.skills;
                const skills = Array.isArray(skillsRaw)
                    ? skillsRaw
                        .sort((a, b) => (b.importance || 0) - (a.importance || 0))
                        .slice(0, 8)
                        .map(s => ({ name: s.name, level: s.level || 0, importance: s.importance || 0 }))
                    : [];

                // Extract knowledge from career_ksas (ksa_type = 'knowledge')
                const knowledgeRaw = detail?.sections?.knowledge;
                const knowledge = Array.isArray(knowledgeRaw)
                    ? knowledgeRaw
                        .sort((a, b) => (b.importance || 0) - (a.importance || 0))
                        .slice(0, 8)
                        .map(k => ({ name: k.name, level: k.level || 0, importance: k.importance || 0 }))
                    : [];

                // Extract abilities from career_ksas (ksa_type = 'ability')
                const abilitiesRaw = detail?.sections?.abilities;
                const abilities = Array.isArray(abilitiesRaw)
                    ? abilitiesRaw
                        .sort((a, b) => (b.importance || 0) - (a.importance || 0))
                        .slice(0, 8)
                        .map(a => ({ name: a.name, level: a.level || 0, importance: a.importance || 0 }))
                    : [];

                // Extract technologies from career_technology
                const techRaw = detail?.sections?.technology;
                const technologies = Array.isArray(techRaw)
                    ? techRaw
                        .slice(0, 12)
                        .map(t => ({ category: t.category || '', name: t.name, hot_flag: t.hot_flag || false }))
                    : [];

                // Get salary from career_overview
                const overview = detail?.sections?.overview;
                const salaryAvg = overview?.salary_avg;

                // Get outlook data from career_outlook
                const outlook = detail?.sections?.outlook;
                const growthLabel = outlook?.growth_label;
                const openingsEst = outlook?.openings_est;
                const outlookSummary = outlook?.summary_md;

                // Get education from career_overview
                const educationReq = overview?.degree_text;

                return {
                    career_id: item.career_id,
                    onet_code: detail?.onet_code || onetCode,
                    title: detail?.title || item.title_en || item.title_vi || item.career_id,
                    description: detail?.short_desc || item.description,
                    match_score: item.display_match ?? item.match_score * 100,
                    tags: item.tags || [],
                    tasks,
                    skills,
                    knowledge,
                    abilities,
                    technologies,
                    salary_avg: salaryAvg,
                    growth_label: growthLabel,
                    openings_est: openingsEst,
                    outlook_summary: outlookSummary,
                    education_req: educationReq,
                } as CareerFullData;
            });
            setCareers(careerData);

        } catch (err: any) {
            const message = err?.response?.data?.detail || err?.message || 'Failed to load report';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [assessmentId]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    // Log open event ONCE when data is loaded
    useEffect(() => {
        if (!data || hasLoggedOpen.current) return;

        const reportId = data.big5?.id || data.riasec?.id;
        if (reportId && assessmentId) {
            hasLoggedOpen.current = true;
            reportService.logEvent({
                assessment_id: parseInt(assessmentId),
                report_id: reportId,
                report_type: data.big5 ? 'big5' : 'riasec',
                event_type: 'open',
                meta: { initial_tab: activeTab },
            });
        }
    }, [data, assessmentId, activeTab]);

    // Handle tab switch
    const handleTabSwitch = (tab: 'big5' | 'riasec') => {
        if (tab === activeTab) return;

        // Clear page view cache for new tab
        reportService.clearEventCache(activeTab);
        setActiveTab(tab);

        // Log tab switch
        const reportId = tab === 'big5' ? data?.big5?.id : data?.riasec?.id;
        if (reportId && assessmentId) {
            reportService.logEvent({
                assessment_id: parseInt(assessmentId),
                report_id: reportId,
                report_type: tab,
                event_type: 'tab_switch',
                tab_key: tab,
                meta: { from_tab: activeTab },
            });
        }
    };

    // Intersection observer for page views
    useEffect(() => {
        if (!data) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const pageNo = parseInt(entry.target.getAttribute('data-page') || '0');
                        const pageKey = entry.target.getAttribute('data-page-key') || '';

                        if (pageNo > 0) {
                            const reportId = activeTab === 'big5' ? data.big5?.id : data.riasec?.id;
                            if (reportId && assessmentId) {
                                reportService.logEvent({
                                    assessment_id: parseInt(assessmentId),
                                    report_id: reportId,
                                    report_type: activeTab,
                                    event_type: 'page_view',
                                    page_no: pageNo,
                                    page_key: pageKey,
                                });
                            }
                        }
                    }
                });
            },
            { threshold: 0.5 }
        );

        // Observe all page refs
        pageRefs.current.forEach((ref) => {
            if (ref) observer.observe(ref);
        });

        return () => observer.disconnect();
    }, [data, activeTab, assessmentId]);

    const setPageRef = (index: number) => (el: HTMLDivElement | null) => {
        pageRefs.current[index] = el;
    };

    // Handle print with event logging
    const handlePrint = () => {
        const reportId = activeTab === 'big5' ? data?.big5?.id : data?.riasec?.id;
        if (reportId && assessmentId) {
            reportService.logEvent({
                assessment_id: parseInt(assessmentId),
                report_id: reportId,
                report_type: activeTab,
                event_type: 'print',
                meta: { tab: activeTab },
            });
        }
        window.print();
    };

    // Split careers into two groups: Top 5 and More to Explore
    const topCareers = careers.slice(0, 5);
    const moreCareers = careers.slice(5, 10);

    return (
        <MainLayout>
            <div className="min-h-screen bg-gray-100 dark:bg-gray-900 font-['Plus_Jakarta_Sans'] text-gray-900 dark:text-white">
                {/* Print Styles - Standardized for A4 */}
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
                    
                    @media print {
                        /* Hide non-print elements */
                        .no-print { display: none !important; }
                        
                        /* Reset body and html */
                        html, body { 
                            background: white !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        
                        /* Page setup - A4 */
                        @page {
                            size: A4 portrait;
                            margin: 0;
                        }
                        
                        /* Report page container */
                        .report-page {
                            page-break-after: always !important;
                            page-break-inside: avoid !important;
                            break-after: page !important;
                            break-inside: avoid !important;
                        }
                        
                        /* Last page no break after */
                        .report-page:last-child {
                            page-break-after: auto !important;
                            break-after: auto !important;
                        }
                        
                        /* Prevent content splitting */
                        .facet-section {
                            page-break-inside: avoid !important;
                            break-inside: avoid !important;
                        }
                        
                        /* Hide scrollbars */
                        ::-webkit-scrollbar {
                            display: none;
                        }
                    }
                `}</style>

                {/* Loading State */}
                {loading && (
                    <div className="flex flex-col items-center justify-center min-h-[60vh]">
                        <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 rounded-full border-t-purple-600 animate-spin mb-4" />
                        <p className="text-gray-500 dark:text-gray-400 font-medium">
                            Generating your personality report...
                        </p>
                    </div>
                )}

                {/* Error State */}
                {error && !loading && (
                    <div className="max-w-3xl mx-auto px-4 py-16">
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 text-center">
                            <h2 className="text-xl font-bold text-red-700 dark:text-red-300 mb-2">
                                Unable to Load Report
                            </h2>
                            <p className="text-red-600 dark:text-red-400 mb-6">{error}</p>
                            <button
                                onClick={fetchReport}
                                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                )}

                {/* Report Content */}
                {!loading && !error && data && (
                    <div className="py-6 print:py-0 print:bg-white">
                        {/* Back Link & Header */}
                        <div className="max-w-4xl mx-auto px-4 mb-6 no-print">
                            <Link
                                to={`/results/${assessmentId}`}
                                className="inline-flex items-center gap-2 text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 transition-colors mb-4"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                Back to Results
                            </Link>
                        </div>

                        {/* Tabs */}
                        <div className="max-w-4xl mx-auto px-4 mb-6 no-print">
                            <div className="flex justify-center">
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-1 inline-flex">
                                    <button
                                        onClick={() => handleTabSwitch('big5')}
                                        disabled={!data.big5}
                                        className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'big5'
                                            ? 'bg-purple-600 text-white shadow-sm'
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                            } ${!data.big5 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        Big Five Personality
                                    </button>
                                    <button
                                        onClick={() => handleTabSwitch('riasec')}
                                        disabled={!data.riasec}
                                        className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'riasec'
                                            ? 'bg-green-600 text-white shadow-sm'
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                            } ${!data.riasec ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        RIASEC Interests
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Big Five Tab Content - 7 Pages */}
                        {activeTab === 'big5' && data.big5 && (
                            <div className="print:block">
                                {/* Page 1: Cover */}
                                <div ref={setPageRef(0)}>
                                    <PageContainer pageNo={1} pageKey="cover">
                                        <Big5Cover cover={data.big5.cover} />
                                    </PageContainer>
                                </div>

                                {/* Page 2: Summary + Behavioral Patterns Overview */}
                                <div ref={setPageRef(1)}>
                                    <PageContainer pageNo={2} pageKey="summary">
                                        <Big5Page2Summary
                                            narrative={data.big5.narrative}
                                            facets={data.big5.facets}
                                        />
                                    </PageContainer>
                                </div>

                                {/* Page 3: Problem-Solving + Motivation */}
                                <div ref={setPageRef(2)}>
                                    <PageContainer pageNo={3} pageKey="facets-1">
                                        <Big5Page3Facets facets={data.big5.facets} />
                                    </PageContainer>
                                </div>

                                {/* Page 4: Interaction + Communication */}
                                <div ref={setPageRef(3)}>
                                    <PageContainer pageNo={4} pageKey="facets-2">
                                        <Big5Page4Facets facets={data.big5.facets} />
                                    </PageContainer>
                                </div>

                                {/* Page 5: Teamwork + Task Management */}
                                <div ref={setPageRef(4)}>
                                    <PageContainer pageNo={5} pageKey="facets-3">
                                        <Big5Page5Facets facets={data.big5.facets} />
                                    </PageContainer>
                                </div>

                                {/* Page 6: Strengths & Challenges */}
                                <div ref={setPageRef(5)}>
                                    <PageContainer pageNo={6} pageKey="strengths">
                                        <Big5Page6Strengths
                                            strengths={data.big5.strengths}
                                            challenges={data.big5.challenges}
                                        />
                                    </PageContainer>
                                </div>

                                {/* Page 7: Closing */}
                                <div ref={setPageRef(6)}>
                                    <PageContainer pageNo={7} pageKey="closing">
                                        <Big5Page7Closing />
                                    </PageContainer>
                                </div>
                            </div>
                        )}

                        {/* RIASEC Tab Content - Intro pages + 10 Career Detail Pages + Closing pages */}
                        {activeTab === 'riasec' && data.riasec && (
                            <div className="print:block">
                                {/* Page 1: Cover */}
                                <div ref={setPageRef(0)}>
                                    <PageContainer pageNo={1} pageKey="riasec-cover">
                                        <RIASECCover cover={data.riasec.cover} />
                                    </PageContainer>
                                </div>

                                {/* Page 2: Your Career Interests */}
                                <div ref={setPageRef(1)}>
                                    <PageContainer pageNo={2} pageKey="riasec-interests">
                                        <RIASECPage2Interests scores={data.riasec.scores} />
                                    </PageContainer>
                                </div>

                                {/* Page 3: Your Top Interests */}
                                <div ref={setPageRef(2)}>
                                    <PageContainer pageNo={3} pageKey="riasec-top-interests">
                                        <RIASECPage3TopInterests scores={data.riasec.scores} />
                                    </PageContainer>
                                </div>

                                {/* Page 4: Careers to Explore Intro */}
                                <div ref={setPageRef(3)}>
                                    <PageContainer pageNo={4} pageKey="riasec-careers-intro">
                                        <RIASECPage4Careers />
                                    </PageContainer>
                                </div>

                                {/* Pages 5-9: Top 5 Career Matches (1 career per page) */}
                                {topCareers.map((career, index) => (
                                    <div key={career.career_id} ref={setPageRef(4 + index)}>
                                        <PageContainer
                                            pageNo={5 + index}
                                            pageKey={`riasec-career-${index + 1}`}
                                        >
                                            <RIASECCareerDetailPage
                                                career={career}
                                                rank={index + 1}
                                                sectionTitle={index === 0 ? 'Your Top Career Matches' : undefined}
                                            />
                                        </PageContainer>
                                    </div>
                                ))}

                                {/* Show More / Collapse Button - After Top 5 Careers */}
                                {moreCareers.length > 0 && (
                                    <div className="max-w-[1400px] mx-auto px-12 py-8 no-print">
                                        <button
                                            onClick={() => setShowMoreCareers(!showMoreCareers)}
                                            className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-semibold text-lg shadow-lg transition-all duration-200 flex items-center justify-center gap-3"
                                        >
                                            <svg className={`w-6 h-6 transition-transform ${showMoreCareers ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                            {showMoreCareers
                                                ? 'Collapse additional careers'
                                                : `View more careers that match you (${moreCareers.length} careers)`}
                                            <svg className={`w-6 h-6 transition-transform ${showMoreCareers ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                    </div>
                                )}

                                {/* Pages 10-14: More Careers to Explore (1 career per page) - Show when expanded OR when printing */}
                                {moreCareers.map((career, index) => (
                                    <div
                                        key={career.career_id}
                                        ref={setPageRef(9 + index)}
                                        className={showMoreCareers ? '' : 'hidden print:block'}
                                    >
                                        <PageContainer
                                            pageNo={10 + index}
                                            pageKey={`riasec-career-${index + 6}`}
                                        >
                                            <RIASECCareerDetailPage
                                                career={career}
                                                rank={index + 6}
                                                sectionTitle={index === 0 ? 'More Careers to Explore' : undefined}
                                            />
                                        </PageContainer>
                                    </div>
                                ))}

                                {/* Page 15: Choosing the Right Career */}
                                <div ref={setPageRef(14)}>
                                    <PageContainer pageNo={15} pageKey="riasec-guidance">
                                        <RIASECPage7Guidance scores={data.riasec.scores} />
                                    </PageContainer>
                                </div>

                                {/* Page 16: Closing */}
                                <div ref={setPageRef(15)}>
                                    <PageContainer pageNo={16} pageKey="riasec-closing">
                                        <RIASECPage8Closing />
                                    </PageContainer>
                                </div>
                            </div>
                        )}

                        {/* Print Button & Email Section */}
                        <div className="py-6 no-print">
                            {hasFeature('pdf_export') ? (
                                <div className="max-w-4xl mx-auto px-4">
                                    <div className="flex flex-col lg:flex-row gap-6 items-stretch">
                                        {/* Left: Export PDF Button */}
                                        <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                                </svg>
                                                Export Report
                                            </h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                                Download your full report as a PDF file
                                            </p>
                                            <button
                                                onClick={handlePrint}
                                                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                </svg>
                                                Export PDF Report
                                            </button>
                                        </div>

                                        {/* Right: Send to Email */}
                                        <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                </svg>
                                                Send to Email
                                            </h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                                Receive your report summary via email
                                            </p>

                                            {/* Send to my email button */}
                                            {user?.email && (
                                                <button
                                                    onClick={handleSendToMyEmail}
                                                    disabled={sendingEmail}
                                                    className="w-full mb-3 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-xl font-medium transition-colors"
                                                >
                                                    {sendingEmail ? (
                                                        <>
                                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                            Sending...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                            Send to {user.email}
                                                        </>
                                                    )}
                                                </button>
                                            )}

                                            {/* Divider */}
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                                                <span className="text-xs text-gray-400 dark:text-gray-500">or</span>
                                                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                                            </div>

                                            {/* Custom email input */}
                                            <div className="flex gap-2">
                                                <input
                                                    type="email"
                                                    value={emailInput}
                                                    onChange={(e) => setEmailInput(e.target.value)}
                                                    placeholder="Enter email address"
                                                    className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                                />
                                                <button
                                                    onClick={handleSendToCustomEmail}
                                                    disabled={sendingEmail || !emailInput.trim()}
                                                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors text-sm whitespace-nowrap"
                                                >
                                                    Send
                                                </button>
                                            </div>

                                            {/* Result message */}
                                            {emailResult && (
                                                <div className={`mt-3 p-3 rounded-lg text-sm ${emailResult.success
                                                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                                                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                                                    }`}>
                                                    {emailResult.message}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="max-w-3xl mx-auto px-4">
                                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-8 border border-purple-200 dark:border-purple-700">
                                        <div className="text-center">
                                            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M12 2C9.79 2 8 3.79 8 6v2H7c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2h-1V6c0-2.21-1.79-4-4-4zm0 2c1.1 0 2 .9 2 2v2h-4V6c0-1.1.9-2 2-2z" />
                                                </svg>
                                            </div>
                                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                                Export PDF - Pro Feature
                                            </h3>
                                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                                Upgrade to Pro to export detailed PDF reports with RIASEC & Big Five charts
                                            </p>
                                            <div className="space-y-3 mb-6 text-sm text-gray-600 dark:text-gray-400">
                                                <div className="flex items-center justify-center gap-2">
                                                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                    <span>High-quality PDF reports</span>
                                                </div>
                                                <div className="flex items-center justify-center gap-2">
                                                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                    <span>RIASEC & Big Five radar charts</span>
                                                </div>
                                                <div className="flex items-center justify-center gap-2">
                                                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                    <span>Perfect for personal portfolio</span>
                                                </div>
                                            </div>
                                            <Link
                                                to="/pricing"
                                                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                </svg>
                                                Upgrade to Pro (499k)
                                                <span>✨</span>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
};

export default ReportPage;
