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

  useEffect(() => {
    if (assessmentId) fetchResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId]);

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
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
            </div>
          )}

          {/* ERROR */}
          {error && (
            <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl p-6">
              <p className="text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* RESULTS */}
          {!loading && !error && results && (
            <div>
              {/* HEADER */}
              <div className="bg-gradient-to-r from-[#4A7C59] to-[#3d6449] dark:from-green-700 dark:to-green-800 rounded-2xl p-6 mb-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                      Your Personality type report is ready!
                    </h2>
                    <p className="text-green-100 dark:text-green-200">
                      Completed on {formatDate(results.completed_at)}
                    </p>
                  </div>

                  <div className="flex-shrink-0 w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* TAB NAV */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
                <nav className="flex border-b border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setActiveTab('summary')}
                    className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'summary'
                      ? 'text-[#4A7C59] dark:text-green-400 border-b-2 border-[#4A7C59] dark:border-green-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                  >
                    Summary
                  </button>

                  <button
                    onClick={() => setActiveTab('detailed')}
                    className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'detailed'
                      ? 'text-[#4A7C59] dark:text-green-400 border-b-2 border-[#4A7C59] dark:border-green-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                  >
                    Detailed Analysis
                  </button>

                  <button
                    onClick={() => setActiveTab('recommendations')}
                    className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'recommendations'
                      ? 'text-[#4A7C59] dark:text-green-400 border-b-2 border-[#4A7C59] dark:border-green-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
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
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Overview</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Your assessment has been analyzed using scientifically-validated methods
                      to understand your career interests and personality traits.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* RIASEC */}
                      <div className="bg-gradient-to-br from-[#4A7C59]/10 to-[#3d6449]/5 dark:from-green-900/30 dark:to-green-800/20 border-2 border-[#4A7C59]/30 dark:border-green-600/40 rounded-xl p-6">
                        <h4 className="text-sm font-semibold text-[#2d4a36] dark:text-green-200 mb-2">
                          Top Career Interest
                        </h4>
                        <p className="text-3xl font-bold text-[#4A7C59] dark:text-green-400">
                          {(() => {
                            const top = Object.entries(results.riasec_scores)
                              .sort((a, b) => b[1] - a[1])[0];
                            return top ? top[0].toUpperCase() : 'N/A';
                          })()}
                        </p>
                      </div>

                      {/* Big Five */}
                      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/30 dark:to-emerald-800/20 border-2 border-emerald-300 dark:border-emerald-600/40 rounded-xl p-6">
                        <h4 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 mb-2">
                          Dominant Personality Trait
                        </h4>
                        <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
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
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Essay Insights</h3>

                      {/* Insights */}
                      {results.essay_analysis.key_insights?.length > 0 && (
                        <div className="mb-6">
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Key Insights:</h4>
                          <ul className="space-y-2">
                            {results.essay_analysis.key_insights.map((ins, idx) => (
                              <li key={idx} className="flex items-start">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#4A7C59] dark:bg-green-600 flex items-center justify-center mr-3 mt-0.5">
                                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                                <span className="text-gray-700 dark:text-gray-300">{ins}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Themes */}
                      {results.essay_analysis.themes?.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Identified Themes:</h4>
                          <div className="flex flex-wrap gap-2">
                            {results.essay_analysis.themes.map((theme: string, i: number) => (
                              <span
                                key={i}
                                className="px-3 py-1 bg-[#4A7C59]/10 dark:bg-green-900/30 text-[#4A7C59] dark:text-green-400 rounded-full text-sm font-medium"
                              >
                                {theme}
                              </span>
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
                <CareerRecommendationsDisplay recommendations={careerRecommendations} />
              )}

              {/* FEEDBACK */}
              {!fbDone && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mt-8">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    Rate Your Results
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    How satisfied are you with your personality assessment?
                  </p>

                  <div className="flex items-center space-x-3 mb-4">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <button
                        key={v}
                        onClick={() => setFbRating(v)}
                        className={`w-12 h-12 rounded-full font-bold text-lg transition-all ${fbRating === v
                            ? 'bg-[#4A7C59] dark:bg-green-600 text-white scale-110 shadow-lg'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                          }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>

                  <textarea
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-gray-900 dark:text-gray-100 focus:border-[#4A7C59] dark:focus:border-green-600 focus:ring-2 focus:ring-[#4A7C59]/20 dark:focus:ring-green-600/20 outline-none transition"
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
                      className="px-6 py-3 bg-emerald-700 dark:bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-800 dark:hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg"
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
    </div>
  );
};

export default ResultsPage;
