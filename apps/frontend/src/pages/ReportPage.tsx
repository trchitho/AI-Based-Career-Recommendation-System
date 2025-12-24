/**
 * ReportPage - Personality & Career Report
 * 
 * A comprehensive, PDF-style report page with 2 tabs:
 * - Tab 1: Big Five (7 pages)
 * - Tab 2: RIASEC (2 pages)
 * 
 * Features:
 * - PageContainer for consistent page dimensions
 * - Print-ready layout (A4)
 * - Idempotent event tracking (no double open)
 * - Page view tracking with IntersectionObserver
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { reportService, FullReportResponse } from '../services/reportService';
import { useFeatureAccess } from '../hooks/useFeatureAccess';

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
import { RIASECCover, RIASECContent } from '../components/report/riasec';

const ReportPage = () => {
    const { assessmentId } = useParams<{ assessmentId: string }>();
    const [data, setData] = useState<FullReportResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'big5' | 'riasec'>('big5');
    const { hasFeature, currentPlan, getPlanInfo } = useFeatureAccess();

    // Track page views - use refs to avoid re-renders
    const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
    const hasLoggedOpen = useRef(false);

    const fetchReport = useCallback(async () => {
        if (!assessmentId) {
            setError('Assessment ID is required');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const response = await reportService.getFullReport(assessmentId, 'en');
            setData(response);
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

                        {/* RIASEC Tab Content - 2 Pages */}
                        {activeTab === 'riasec' && data.riasec && (
                            <div className="print:block">
                                {/* Page 1: Cover */}
                                <div ref={setPageRef(0)}>
                                    <PageContainer pageNo={1} pageKey="riasec-cover">
                                        <RIASECCover cover={data.riasec.cover} />
                                    </PageContainer>
                                </div>

                                {/* Page 2: Content */}
                                <div ref={setPageRef(1)}>
                                    <PageContainer pageNo={2} pageKey="riasec-content">
                                        <RIASECContent scores={data.riasec.scores} />
                                    </PageContainer>
                                </div>
                            </div>
                        )}

                        {/* Print Button */}
                        <div className="text-center py-6 no-print">
                            {hasFeature('pdf_export') ? (
                                <button
                                    onClick={handlePrint}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                    </svg>
                                    Export PDF Report
                                </button>
                            ) : (
                                <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-8 border border-purple-200 dark:border-purple-700">
                                    <div className="text-center">
                                        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M12 2C9.79 2 8 3.79 8 6v2H7c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2h-1V6c0-2.21-1.79-4-4-4zm0 2c1.1 0 2 .9 2 2v2h-4V6c0-1.1.9-2 2-2z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                            Xuất PDF - Tính năng Pro
                                        </h3>
                                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                                            Nâng cấp lên Gói Pro để xuất báo cáo PDF chuyên sâu với biểu đồ RIASEC & Big Five
                                        </p>
                                        <div className="space-y-3 mb-6 text-sm text-gray-600 dark:text-gray-400">
                                            <div className="flex items-center justify-center gap-2">
                                                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                                <span>Báo cáo PDF chất lượng cao</span>
                                            </div>
                                            <div className="flex items-center justify-center gap-2">
                                                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                                <span>Biểu đồ radar RIASEC & Big Five</span>
                                            </div>
                                            <div className="flex items-center justify-center gap-2">
                                                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                                <span>Phù hợp cho hồ sơ năng lực cá nhân</span>
                                            </div>
                                        </div>
                                        <Link
                                            to="/pricing"
                                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                            Nâng cấp Gói Pro (499k)
                                            <span>✨</span>
                                        </Link>
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
