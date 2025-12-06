import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
import AppLogo from '../components/common/AppLogo';
import { paymentService, UserPermissions } from '../services/paymentService';
import { PricingModal } from '../components/payment/PricingModal';
import { UpgradePrompt } from '../components/payment/UpgradePrompt';

const ResultsPage = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [results, setResults] = useState<AssessmentResults | null>(null);
  const [loadingResults, setLoadingResults] = useState(true);
  const [errorResults, setErrorResults] = useState<string | null>(null);

  // BFF Recommendations
  const [recData, setRecData] = useState<RecommendationsResponse | null>(null);
  const [recLoading, setRecLoading] = useState<boolean>(false);
  const [recError, setRecError] = useState<string | null>(null);

  const [activeTab, setActiveTab] =
    useState<'summary' | 'detailed' | 'recommendations'>('summary');

  const [fbRating, setFbRating] = useState<number | null>(null);
  const [fbComment, setFbComment] = useState('');
  const [fbDone, setFbDone] = useState(false);

  // Luôn giới hạn tối đa 5 nghề cho UI
  const recItems: CareerRecommendationDTO[] = (recData?.items ?? []).slice(0, 5);
  const recRequestId = recData?.request_id ?? null;

  useEffect(() => {
    if (!assessmentId) return;
    fetchResults(assessmentId);
    fetchRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId]);

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

  const fetchRecommendations = async () => {
    try {
      setRecLoading(true);
      setRecError(null);

      // Không truyền 20 nữa – dùng default = 5 ở recommendationService
      const res = await recommendationService.getMain();
      setRecData(res);
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to load recommendations';
      setRecError(msg);
    } finally {
      setRecLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-[#F5EFE7] dark:bg-gray-900">
      {/* NAVBAR */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <AppLogo size="sm" showText={true} linkTo="/dashboard" />
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="nav-btn"
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate('/profile')}
                className="nav-btn"
              >
                Profile
              </button>
              <span className="nav-text">{user?.firstName || user?.email}</span>
              <button onClick={logout} className="nav-btn">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* MAIN */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6">
          {/* LOADING */}
          {loadingResults && (
            <div className="flex justify-center items-center py-12">
              <div className="spinner-border" />
            </div>
          )}

          {/* ERROR */}
          {errorResults && (
            <div className="error-box">
              <p>{errorResults}</p>
            </div>
          )}

          {/* RESULTS */}
          {!loadingResults && !errorResults && results && (
            <div>
              {/* HEADER */}
              <div className="result-header">
                <div>
                  <h2 className="header-title">
                    Your Personality type report is ready!
                  </h2>
                  <p className="header-sub">
                    Completed on {formatDate(results.completed_at)}
                  </p>
                </div>

                <div className="header-icon">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>

              {/* TAB NAV */}
              <div className="tab-box">
                <nav className="tab-nav">
                  <button
                    onClick={() => setActiveTab('summary')}
                    className={`tab-btn ${
                      activeTab === 'summary' ? 'tab-active' : ''
                    }`}
                  >
                    Summary
                  </button>

                  <button
                    onClick={() => setActiveTab('detailed')}
                    className={`tab-btn ${
                      activeTab === 'detailed' ? 'tab-active' : ''
                    }`}
                  >
                    Detailed Analysis
                  </button>

                  <button
                    onClick={() => setActiveTab('recommendations')}
                    className={`tab-btn ${
                      activeTab === 'recommendations' ? 'tab-active' : ''
                    }`}
                  >
                    Career Recommendations
                  </button>
                </nav>
              </div>

              {/* TAB: SUMMARY */}
              {activeTab === 'summary' && (
                <div className="space-y-6">
                  {/* Overview */}
                  <div className="card">
                    <h3 className="card-title">Overview</h3>
                    <p className="card-text">
                      Your assessment has been analyzed using
                      scientifically-validated methods to understand your career
                      interests and personality traits.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* RIASEC */}
                      <div className="summary-box summary-green">
                        <h4 className="summary-title">Top Career Interest</h4>
                        <p className="summary-value">
                          {(() => {
                            const top = Object.entries(results.riasec_scores)
                              .sort((a, b) => b[1] - a[1])[0];
                            return top ? top[0].toUpperCase() : 'N/A';
                          })()}
                        </p>
                      </div>

                      {/* Big Five */}
                      <div className="summary-box summary-yellow">
                        <h4 className="summary-title-yellow">
                          Dominant Personality Trait
                        </h4>
                        <p className="summary-value-yellow">
                          {(() => {
                            const top = Object.entries(
                              results.big_five_scores,
                            ).sort((a, b) => b[1] - a[1])[0];
                            return top ? top[0].toUpperCase() : 'N/A';
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Essay Insights */}
                  {results.essay_analysis && (
                    <div className="card">
                      <h3 className="card-title">Essay Insights</h3>

                      {/* Insights */}
                      {results.essay_analysis.key_insights?.length > 0 && (
                        <div className="mb-6">
                          <h4 className="sub-title">Key Insights:</h4>
                          <ul className="space-y-2">
                            {results.essay_analysis.key_insights.map(
                              (ins, idx) => (
                                <li key={idx} className="insight-item">
                                  <span>{ins}</span>
                                </li>
                              ),
                            )}
                          </ul>
                        </div>
                      )}

                      {/* Themes */}
                      {results.essay_analysis.themes?.length > 0 && (
                        <div>
                          <h4 className="sub-title">Identified Themes:</h4>
                          <div className="flex flex-wrap gap-2">
                            {results.essay_analysis.themes.map(
                              (theme: string, i: number) => (
                                <span key={i} className="tag">
                                  {theme}
                                </span>
                              ),
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB: DETAILED */}
              {activeTab === 'detailed' && (
                <div className="space-y-6">
                  <RIASECSpiderChart scores={results.riasec_scores} />
                  <BigFiveBarChart scores={results.big_five_scores} />
                </div>
              )}

              {/* TAB: RECOMMENDATIONS – BFF /api/recommendations */}
              {activeTab === 'recommendations' && (
                <CareerRecommendationsDisplay
                  items={recItems}
                  requestId={recRequestId}
                  loading={recLoading}
                  error={recError}
                />
              )}

              {/* FEEDBACK */}
              {!fbDone && (
                <div className="card mt-8">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    Rate Your Results
                  </h3>
                  <p className="card-text mb-4">
                    How satisfied are you with your personality assessment?
                  </p>

                  <div className="flex items-center space-x-3 mb-4">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <button
                        key={v}
                        onClick={() => setFbRating(v)}
                        className={`rate-dot ${
                          fbRating === v ? 'rate-selected' : ''
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>

                  <textarea
                    className="feedback-input"
                    placeholder="Optional comment (tell us what you think)"
                    rows={3}
                    value={fbComment}
                    onChange={(e) => setFbComment(e.target.value)}
                  />

                  <div className="mt-4 flex justify-end">
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
                      className="submit-btn"
                    >
                      Submit Feedback
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Pricing Modal */}
      <PricingModal
        isOpen={showPricing}
        onClose={() => setShowPricing(false)}
        reason="careers"
      />
    </div>
  );
};

export default ResultsPage;