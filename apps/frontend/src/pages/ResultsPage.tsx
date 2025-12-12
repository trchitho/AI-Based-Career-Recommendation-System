// apps/frontend/src/pages/ResultsPage.tsx
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { assessmentService } from '../services/assessmentService';
import {
  recommendationService,
  CareerRecommendationDTO,
  RecommendationsResponse,
} from '../services/recommendationService';
import { AssessmentResults } from '../types/results';
import RIASECSpiderChart from '../components/results/RIASECSpiderChart';
import BigFiveBarChart from '../components/results/BigFiveBarChart';
import CareerRecommendationsDisplay from '../components/results/CareerRecommendationsDisplay';
import { feedbackService } from '../services/feedbackService';
import MainLayout from '../components/layout/MainLayout';
import { trackCareerEvent, markDwellStart } from '../services/trackService';
import { useAuth } from '../contexts/AuthContext';
import { getRIASECFullName } from '../utils/riasec';

const ResultsPage = () => {
  // ==========================================
  // 1. LOGIC BLOCK
  // ==========================================
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const { user } = useAuth();

  const [results, setResults] = useState<AssessmentResults | null>(null);
  const [loadingResults, setLoadingResults] = useState(true);
  const [errorResults, setErrorResults] = useState<string | null>(null);

  // BFF Recommendations - LAZY LOAD only when Career Matches tab is opened
  const [recData, setRecData] = useState<RecommendationsResponse | null>(null);
  const [recLoading, setRecLoading] = useState<boolean>(false);
  const [recError, setRecError] = useState<string | null>(null);
  const [recFetched, setRecFetched] = useState<boolean>(false); // Guard: only fetch once

  const [activeTab, setActiveTab] =
    useState<'summary' | 'detailed' | 'recommendations'>('summary');

  const [fbRating, setFbRating] = useState<number | null>(null);
  const [fbComment, setFbComment] = useState('');
  const [fbDone, setFbDone] = useState(false);

  // Guard: track if impressions have been logged for this assessment
  const impressionLoggedRef = useRef<string | null>(null);

  // Bây giờ backend đã honor top_k, FE không cần slice thêm ở đây.
  const recItems: CareerRecommendationDTO[] = recData?.items ?? [];
  const recRequestId = recData?.request_id ?? null;

  // Fetch assessment results on mount
  useEffect(() => {
    if (!assessmentId) return;
    fetchResults(assessmentId);
  }, [assessmentId]);

  // LAZY LOAD: Fetch recommendations ONLY when Career Matches tab is opened
  useEffect(() => {
    if (activeTab === 'recommendations' && !recFetched && assessmentId) {
      fetchRecommendations();
    }
  }, [activeTab, recFetched, assessmentId]);

  // Log impressions ONLY ONCE when recommendations are loaded and tab is active
  // Also mark dwell start time for click tracking
  useEffect(() => {
    if (
      activeTab === 'recommendations' &&
      recData?.items &&
      recData.items.length > 0 &&
      recData.request_id &&
      impressionLoggedRef.current !== recData.request_id
    ) {
      // Mark as logged to prevent double-count
      impressionLoggedRef.current = recData.request_id;

      // Mark dwell start time for click tracking
      markDwellStart();

      // Log impression for each career item
      const reqId = recData.request_id;
      recData.items.forEach((item, index) => {
        trackCareerEvent(
          {
            event_type: 'impression',
            job_id: item.slug || item.career_id,
            rank_pos: index + 1,
            score_shown: item.display_match ?? item.match_score,
            ...(reqId ? { ref: reqId } : {}),
          },
          user?.id ? { userId: user.id } : undefined
        );
      });
    }
  }, [activeTab, recData, user?.id]);

  // Re-mark dwell start when switching back to recommendations tab
  useEffect(() => {
    if (activeTab === 'recommendations' && impressionLoggedRef.current) {
      // Re-mark dwell start when returning to tab (after navigating away)
      markDwellStart();
    }
  }, [activeTab]);

  const fetchResults = async (id: string) => {
    try {
      setLoadingResults(true);
      setErrorResults(null);

      const resultsData = await assessmentService.getResults(id);
      setResults(resultsData);
    } catch (err) {
      console.error(err);
      setErrorResults('Failed to load assessment results. Please try again.');
    } finally {
      setLoadingResults(false);
    }
  };

  const fetchRecommendations = useCallback(async () => {
    if (recFetched) return; // Guard: don't fetch twice

    try {
      setRecLoading(true);
      setRecError(null);

      if (!assessmentId) {
        throw new Error("Missing assessmentId in URL");
      }

      const res = await recommendationService.getMain(assessmentId, 5);
      setRecData(res);
      setRecFetched(true); // Mark as fetched
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to load recommendations";
      setRecError(msg);
    } finally {
      setRecLoading(false);
    }
  }, [assessmentId, recFetched]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ==========================================
  // 2. UI – NEW DESIGN
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
          @keyframes fade-in-up {
            0% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; }
        `}</style>

        {/* Background Layers */}
        <div className="absolute inset-0 bg-dot-pattern pointer-events-none z-0 opacity-60" />
        <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-green-400/5 rounded-full blur-[120px] pointer-events-none z-0" />
        <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-blue-400/5 rounded-full blur-[120px] pointer-events-none z-0" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* LOADING STATE */}
          {loadingResults && (
            <div className="flex flex-col items-center justify-center py-32 animate-pulse">
              <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 rounded-full border-t-green-600 mb-4 animate-spin" />
              <p className="text-gray-500 font-medium">
                Analyzing your results...
              </p>
            </div>
          )}

          {/* ERROR STATE */}
          {errorResults && !loadingResults && (
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
                {errorResults}
              </p>
            </div>
          )}

          {/* RESULTS CONTENT */}
          {!loadingResults && !errorResults && results && (
            <div className="animate-fade-in-up space-y-8">
              {/* 1. HERO BANNER */}
              <div className="bg-gradient-to-r from-[#4A7C59] to-[#3d6449] dark:from-green-800 dark:to-green-900 rounded-[32px] p-8 md:p-10 shadow-xl shadow-green-900/20 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-white/30">
                        Report Ready
                      </span>
                      <span className="text-green-100 text-sm font-medium opacity-80">
                        {formatDate(results.completed_at)}
                      </span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
                      Your Personal Analysis
                    </h1>
                    <p className="text-green-50 text-lg max-w-2xl font-medium">
                      We&apos;ve analyzed your responses to uncover your unique
                      personality traits and career potential.
                    </p>
                  </div>

                  <Link
                    to={`/results/${assessmentId}/report`}
                    className="flex-shrink-0 px-5 py-3 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl text-white font-semibold hover:bg-white/30 transition-colors flex items-center gap-2"
                  >
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
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    View Full Report
                  </Link>
                </div>
              </div>

              {/* 2. TABS NAVIGATION */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-1.5 flex overflow-x-auto scrollbar-hide">
                {[
                  { id: 'summary', label: 'Summary' },
                  { id: 'detailed', label: 'Detailed Analysis' },
                  { id: 'recommendations', label: 'Career Matches' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() =>
                      setActiveTab(tab.id as 'summary' | 'detailed' | 'recommendations')
                    }
                    className={`flex-1 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.id
                      ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* 3. TAB CONTENT */}
              <div className="min-h-[400px]">
                {/* TAB: SUMMARY */}
                {activeTab === 'summary' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in-up">
                    {/* Highlights */}
                    <div className="bg-white dark:bg-gray-800 rounded-[24px] p-8 shadow-lg border border-gray-100 dark:border-gray-700">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        <span className="w-2 h-6 bg-green-500 rounded-full" />
                        Key Highlights
                      </h3>

                      <div className="grid gap-6">
                        {/* Top Interest */}
                        <div className="bg-[#F0FDF4] dark:bg-green-900/10 rounded-2xl p-6 border border-green-100 dark:border-green-800/30 relative overflow-hidden">
                          <div className="relative z-10">
                            <p className="text-sm font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">
                              Top Career Interest
                            </p>
                            <p className="text-4xl font-extrabold text-gray-900 dark:text-white">
                              {(() => {
                                // Ưu tiên top_interest từ API
                                if (results.top_interest) {
                                  return getRIASECFullName(results.top_interest).toUpperCase();
                                }
                                // Fallback: tính từ riasec_scores với tie-breaking theo thứ tự R,I,A,S,E,C
                                const order = ['realistic', 'investigative', 'artistic', 'social', 'enterprising', 'conventional'];
                                const entries = Object.entries(results.riasec_scores);
                                entries.sort((a, b) => {
                                  const scoreDiff = b[1] - a[1];
                                  if (scoreDiff !== 0) return scoreDiff;
                                  // Tie-breaker: theo thứ tự RIASEC
                                  return order.indexOf(a[0].toLowerCase()) - order.indexOf(b[0].toLowerCase());
                                });
                                const topKey = entries[0]?.[0];
                                return getRIASECFullName(topKey).toUpperCase();
                              })()}
                            </p>
                          </div>
                          <svg
                            className="absolute right-0 bottom-0 w-32 h-32 text-green-500/10 transform translate-x-8 translate-y-8"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>

                        {/* Dominant Trait */}
                        <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl p-6 border border-blue-100 dark:border-blue-800/30 relative overflow-hidden">
                          <div className="relative z-10">
                            <p className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
                              Dominant Trait
                            </p>
                            <p className="text-4xl font-extrabold text-gray-900 dark:text-white">
                              {Object.entries(results.big_five_scores).sort(
                                (a, b) => b[1] - a[1],
                              )[0]?.[0]?.toUpperCase() || 'N/A'}
                            </p>
                          </div>
                          <svg
                            className="absolute right-0 bottom-0 w-32 h-32 text-blue-500/10 transform translate-x-8 translate-y-8"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Essay Insights */}
                    {results.essay_analysis && (
                      <div className="bg-white dark:bg-gray-800 rounded-[24px] p-8 shadow-lg border border-gray-100 dark:border-gray-700 flex flex-col">
                        <h3 className="text-xl font-bold text-gray-900 dark:text_white mb-6 flex items-center gap-2">
                          <span className="w-2 h-6 bg-purple-500 rounded-full" />
                          AI Analysis
                        </h3>

                        <div className="space-y-6 flex-1">
                          {results.essay_analysis.key_insights?.length > 0 && (
                            <div>
                              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                                Key Insights
                              </h4>
                              <ul className="space-y-3">
                                {results.essay_analysis.key_insights.map(
                                  (ins, idx) => (
                                    <li
                                      key={idx}
                                      className="flex items-start gap-3 text-gray-600 dark:text-gray-300 text-sm leading-relaxed"
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 flex-shrink-0" />
                                      {ins}
                                    </li>
                                  ),
                                )}
                              </ul>
                            </div>
                          )}

                          {results.essay_analysis.themes?.length > 0 && (
                            <div>
                              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                                Identified Themes
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {results.essay_analysis.themes.map(
                                  (theme, i) => (
                                    <span
                                      key={i}
                                      className="px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-xs font-bold rounded-lg"
                                    >
                                      {theme}
                                    </span>
                                  ),
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB: DETAILED */}
                {activeTab === 'detailed' && (
                  <div className="grid grid-cols-1 gap-8 animate-fade-in-up">
                    <div className="bg-white dark:bg-gray-800 rounded-[24px] p-8 shadow-lg border border-gray-100 dark:border-gray-700">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
                        RIASEC Interest Profile
                      </h3>
                      <div className="h-[400px] w-full flex items-center justify-center">
                        <RIASECSpiderChart scores={results.riasec_scores} />
                      </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-[24px] p-8 shadow-lg border border-gray-100 dark:border-gray-700">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
                        Big Five Personality Traits
                      </h3>
                      <div className="h-[400px] w-full">
                        <BigFiveBarChart scores={results.big_five_scores} />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: RECOMMENDATIONS */}
                {activeTab === 'recommendations' && (
                  <div className="animate-fade-in-up">
                    <CareerRecommendationsDisplay
                      items={recItems}
                      requestId={recRequestId}
                      loading={recLoading}
                      error={recError}
                    />
                  </div>
                )}
              </div>

              {/* 4. FEEDBACK SECTION */}
              {!fbDone && (
                <div className="mt-12 bg-white dark:bg-gray-800 rounded-[24px] p-8 shadow-lg border border-gray-100 dark:border-gray-700 animate-fade-in-up relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-green-500 to-teal-500" />
                  <div className="max-w-3xl mx-auto text-center">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                      Was this helpful?
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-8">
                      Help us improve our AI models by rating your results.
                    </p>

                    <div className="flex justify-center gap-4 mb-8">
                      {[1, 2, 3, 4, 5].map((v) => (
                        <button
                          key={v}
                          onClick={() => setFbRating(v)}
                          className={`w-12 h-12 rounded-2xl font-bold text-lg transition-all flex items-center justify-center shadow-sm ${fbRating === v
                            ? 'bg-green-600 text-white scale-110 shadow-green-600/30'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-gray-600 hover:text-green-600'
                            }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>

                    <textarea
                      className="w-full rounded-2xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 px-5 py-4 text-gray-900 dark:text-gray-100 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none transition-all resize-none"
                      placeholder="Any additional feedback? (Optional)"
                      rows={3}
                      value={fbComment}
                      onChange={(e) => setFbComment(e.target.value)}
                    />

                    <div className="mt-6 flex justify-center">
                      <button
                        disabled={!fbRating}
                        onClick={async () => {
                          if (!assessmentId || !fbRating) return;
                          try {
                            await feedbackService.submit(
                              assessmentId,
                              fbRating,
                              fbComment,
                            );
                            setFbDone(true);
                          } catch (e) {
                            console.error(e);
                          }
                        }}
                        className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-full font-bold shadow-lg shadow-green-600/20 hover:shadow-green-600/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Submit Feedback
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default ResultsPage;
