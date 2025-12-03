import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { assessmentService } from '../services/assessmentService';
import { AssessmentResults, CareerRecommendation } from '../types/results';
import RIASECSpiderChart from '../components/results/RIASECSpiderChart';
import BigFiveBarChart from '../components/results/BigFiveBarChart';
import CareerRecommendationsDisplay from '../components/results/CareerRecommendationsDisplay';
import { feedbackService } from '../services/feedbackService';
import api from '../lib/api';
import AppLogo from '../components/common/AppLogo';
import { paymentService, UserPermissions } from '../services/paymentService';
import { PricingModal } from '../components/payment/PricingModal';
import { UpgradePrompt } from '../components/payment/UpgradePrompt';

const ResultsPage = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [results, setResults] = useState<AssessmentResults | null>(null);
  const [careerRecommendations, setCareerRecommendations] = useState<CareerRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'detailed' | 'recommendations'>('summary');

  const [fbRating, setFbRating] = useState<number | null>(null);
  const [fbComment, setFbComment] = useState('');
  const [fbDone, setFbDone] = useState(false);

  // Payment integration
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [showPricing, setShowPricing] = useState(false);

  useEffect(() => {
    if (assessmentId) fetchResults();
    loadPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId]);

  const loadPermissions = async () => {
    try {
      const perms = await paymentService.getUserPermissions();
      setPermissions(perms);
    } catch (error) {
      // Silently use mock data when backend is not available
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

  const fetchResults = async () => {
    if (!assessmentId) return;

    try {
      setLoading(true);
      setError(null);

      const resultsData = await assessmentService.getResults(assessmentId);
      setResults(resultsData);

      // Nếu BE trả về career_recommendations_full
      if (resultsData.career_recommendations_full?.length > 0) {
        const careers: CareerRecommendation[] = resultsData.career_recommendations_full.map(
          (c: any, index: number) => ({
            id: c.id,
            slug: c.slug,
            title: c.title,
            description: c.description,
            matchPercentage: 95 - index * 5,
            required_skills: c.required_skills,
            salary_range: c.salary_range,
            industry_category: c.industry_category,
          }),
        );
        setCareerRecommendations(careers);
      }
      // Nếu BE chỉ trả về ID → fetch chi tiết từng nghề
      else if (resultsData.career_recommendations?.length > 0) {
        const promises = resultsData.career_recommendations.map((careerId: string) =>
          api.get(`/api/careers/${careerId}`),
        );

        const responses = await Promise.allSettled(promises);

        const careers = responses
          .filter((r) => r.status === 'fulfilled')
          .map((r: any, index) => {
            const c = r.value.data;
            return {
              id: c.id,
              slug: c.slug,
              title: c.title,
              description: c.description,
              matchPercentage: 95 - index * 5,
              required_skills: c.required_skills,
              salary_range: c.salary_range,
              industry_category: c.industry_category,
            } as CareerRecommendation;
          });

        setCareerRecommendations(careers);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load assessment results. Please try again.');
    } finally {
      setLoading(false);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* NAVBAR */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <AppLogo size="sm" showText={true} linkTo="/dashboard" />
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-gray-700 dark:text-gray-300 hover:text-[#4A7C59] dark:hover:text-green-400 font-medium transition-colors"
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate('/profile')}
                className="text-gray-700 dark:text-gray-300 hover:text-[#4A7C59] dark:hover:text-green-400 font-medium transition-colors"
              >
                Profile
              </button>
              <span className="text-gray-600 dark:text-gray-400">{user?.firstName || user?.email}</span>
              <button
                onClick={logout}
                className="text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 font-medium transition-colors"
              >
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
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="spinner-border" />
            </div>
          )}

          {/* ERROR */}
          {error && (
            <div className="error-box">
              <p>{error}</p>
            </div>
          )}

          {/* RESULTS */}
          {!loading && !error && results && (
            <div>
              {/* HEADER */}
              <div className="result-header">
                <div>
                  <h2 className="header-title">Your Personality type report is ready!</h2>
                  <p className="header-sub">Completed on {formatDate(results.completed_at)}</p>
                </div>

                <div className="header-icon">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 0 0118 0z" />
                  </svg>
                </div>
              </div>

              {/* TAB NAV */}
              <div className="tab-box">
                <nav className="tab-nav">
                  <button
                    onClick={() => setActiveTab('summary')}
                    className={`tab-btn ${activeTab === 'summary' ? 'tab-active' : ''}`}
                  >
                    Summary
                  </button>

                  <button
                    onClick={() => setActiveTab('detailed')}
                    className={`tab-btn ${activeTab === 'detailed' ? 'tab-active' : ''}`}
                  >
                    Detailed Analysis
                  </button>

                  <button
                    onClick={() => setActiveTab('recommendations')}
                    className={`tab-btn ${activeTab === 'recommendations' ? 'tab-active' : ''}`}
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
                      Your assessment has been analyzed using scientifically-validated methods
                      to understand your career interests and personality traits.
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
                        <h4 className="summary-title-yellow">Dominant Personality Trait</h4>
                        <p className="summary-value-yellow">
                          {(() => {
                            const top = Object.entries(results.big_five_scores)
                              .sort((a, b) => b[1] - a[1])[0];
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
                            {results.essay_analysis.key_insights.map((ins, idx) => (
                              <li key={idx} className="insight-item">
                                <span>{ins}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Themes */}
                      {results.essay_analysis.themes?.length > 0 && (
                        <div>
                          <h4 className="sub-title">Identified Themes:</h4>
                          <div className="flex flex-wrap gap-2">
                            {results.essay_analysis.themes.map((theme: string, i: number) => (
                              <span key={i} className="tag">{theme}</span>
                            ))}
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

              {/* TAB: Recommendations */}
              {activeTab === 'recommendations' && (
                <div>
                  {/* Show upgrade banner if user doesn't have subscription */}
                  {permissions && !permissions.can_view_all_careers && (
                    <div className="mb-6">
                      <UpgradePrompt
                        message={`Bạn đang xem 1/${careerRecommendations.length} nghề nghiệp phù hợp. Nâng cấp để xem tất cả!`}
                        onUpgrade={() => setShowPricing(true)}
                        variant="banner"
                      />
                    </div>
                  )}

                  {/* Show only first career for free users */}
                  {permissions && !permissions.can_view_all_careers ? (
                    <div className="space-y-6">
                      <CareerRecommendationsDisplay 
                        recommendations={careerRecommendations.slice(0, 1)} 
                      />
                      <UpgradePrompt
                        message="Nâng cấp để xem tất cả các nghề nghiệp phù hợp với bạn"
                        onUpgrade={() => setShowPricing(true)}
                        variant="card"
                      />
                    </div>
                  ) : (
                    <CareerRecommendationsDisplay recommendations={careerRecommendations} />
                  )}
                </div>
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
                        className={`rate-dot ${fbRating === v ? 'rate-selected' : ''}`}
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
                          await feedbackService.submit(assessmentId, fbRating, fbComment);
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
