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
import { useAppSettings } from '../contexts/AppSettingsContext';
import AppLogo from '../components/common/AppLogo';

const ResultsPage = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const app = useAppSettings();

  const [results, setResults] = useState<AssessmentResults | null>(null);
  const [careerRecommendations, setCareerRecommendations] = useState<CareerRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'detailed' | 'recommendations'>('summary');

  const [fbRating, setFbRating] = useState<number | null>(null);
  const [fbComment, setFbComment] = useState('');
  const [fbDone, setFbDone] = useState(false);

  useEffect(() => {
    if (assessmentId) {
      fetchResults();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId]);

  const fetchResults = async () => {
    if (!assessmentId) return;

    try {
      setLoading(true);
      setError(null);

      const resultsData = await assessmentService.getResults(assessmentId);
      setResults(resultsData);

      // Ưu tiên career_recommendations_full nếu BE đã pre-enrich
      if (resultsData.career_recommendations_full && resultsData.career_recommendations_full.length > 0) {
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
      } else if (resultsData.career_recommendations && resultsData.career_recommendations.length > 0) {
        // Nếu chỉ có list id → fetch chi tiết từng career
        const careerPromises = resultsData.career_recommendations.map((careerId: string) =>
          api.get(`/api/careers/${careerId}`),
        );
        const careerResponses = await Promise.allSettled(careerPromises);
        const careers: CareerRecommendation[] = careerResponses
          .filter((r: any) => r.status === 'fulfilled')
          .map((r: any, index: number) => {
            const career = r.value.data;
            return {
              id: career.id,
              slug: career.slug,
              title: career.title,
              description: career.description,
              matchPercentage: 95 - index * 5,
              required_skills: career.required_skills,
              salary_range: career.salary_range,
              industry_category: career.industry_category,
            } as CareerRecommendation;
          });
        setCareerRecommendations(careers);
      }
    } catch (err) {
      console.error('Error fetching results:', err);
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
    <div className="min-h-screen bg-[#F5EFE7] dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <AppLogo size="sm" showText={true} linkTo="/dashboard" />
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate('/profile')}
                className="text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                Profile
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-300">{user?.firstName || user?.email}</span>
              <button onClick={logout} className="text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A7C59] dark:border-green-600"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4 mb-6">
              <p className="text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          {!loading && !error && results && (
            <div>
              {/* Header */}
              <div className="mb-8 bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Your Personality type report is ready!</h2>
                    <p className="text-gray-600 dark:text-gray-400">Completed on {formatDate(results.completed_at)}</p>
                  </div>
                  <div className="w-16 h-16 bg-[#4A7C59] dark:bg-green-600 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                <nav className="flex space-x-1 p-2">
                  <button
                    onClick={() => setActiveTab('summary')}
                    className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-colors ${
                      activeTab === 'summary'
                        ? 'bg-[#4A7C59] dark:bg-green-600 text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    Summary
                  </button>
                  <button
                    onClick={() => setActiveTab('detailed')}
                    className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-colors ${
                      activeTab === 'detailed'
                        ? 'bg-[#4A7C59] dark:bg-green-600 text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    Detailed Analysis
                  </button>
                  <button
                    onClick={() => setActiveTab('recommendations')}
                    className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-colors ${
                      activeTab === 'recommendations'
                        ? 'bg-[#4A7C59] dark:bg-green-600 text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    Career Recommendations
                  </button>
                </nav>
              </div>

              {/* TAB: Summary */}
              {activeTab === 'summary' && (
                <div className="space-y-6">
                  <div className="bg-white dark:bg-gray-800 shadow-lg rounded-2xl p-8">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Overview</h3>
                    <p className="text-gray-700 dark:text-gray-300 mb-6">
                      Your assessment has been analyzed using scientifically-validated methods to
                      understand your career interests and personality traits.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-[#E8F5E9] dark:bg-green-900/20 border-2 border-[#4A7C59] dark:border-green-600 rounded-xl p-6">
                        <h4 className="font-bold text-[#4A7C59] dark:text-green-400 mb-3 text-lg">Top Career Interest</h4>
                        <p className="text-[#2E5C3E] dark:text-green-300 text-xl font-semibold">
                          {(() => {
                            const topRiasec = Object.entries(results.riasec_scores)
                              .sort((a, b) => b[1] - a[1])[0];
                            return topRiasec
                              ? topRiasec[0].charAt(0).toUpperCase() + topRiasec[0].slice(1)
                              : 'N/A';
                          })()}
                        </p>
                      </div>
                      <div className="bg-[#FFF3E0] dark:bg-yellow-900/20 border-2 border-[#E8B86D] dark:border-yellow-600 rounded-xl p-6">
                        <h4 className="font-bold text-[#E8B86D] dark:text-yellow-400 mb-3 text-lg">
                          Dominant Personality Trait
                        </h4>
                        <p className="text-[#C89D4D] dark:text-yellow-300 text-xl font-semibold">
                          {(() => {
                            const topBigFive = Object.entries(results.big_five_scores)
                              .sort((a, b) => b[1] - a[1])[0];
                            return topBigFive
                              ? topBigFive[0].charAt(0).toUpperCase() + topBigFive[0].slice(1)
                              : 'N/A';
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {results.essay_analysis && (
                    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-2xl p-8">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Essay Insights</h3>
                      {results.essay_analysis.key_insights &&
                        results.essay_analysis.key_insights.length > 0 && (
                          <div className="mb-6">
                            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Key Insights:</h4>
                            <ul className="space-y-2">
                              {results.essay_analysis.key_insights.map((insight, index) => (
                                <li key={index} className="flex items-start">
                                  <svg className="w-5 h-5 text-[#4A7C59] dark:text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  <span className="text-gray-700 dark:text-gray-300">{insight}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      {results.essay_analysis.themes && results.essay_analysis.themes.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Identified Themes:</h4>
                          <div className="flex flex-wrap gap-2">
                            {results.essay_analysis.themes.map((theme, index) => (
                              <span
                                key={index}
                                className="px-4 py-2 bg-[#E8F5E9] dark:bg-green-900/30 text-[#4A7C59] dark:text-green-400 text-sm font-medium rounded-full border border-[#4A7C59]/30 dark:border-green-600/30"
                              >
                                {theme}
                              </span>
                            ))}
                          </div>
                        )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB: Detailed */}
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

              {/* Quick Feedback */}
              {!fbDone && (
                <div className="mt-8 bg-white dark:bg-gray-800 shadow-lg rounded-2xl p-8">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Rate Your Results</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">How satisfied are you with your personality assessment?</p>
                  <div className="flex items-center space-x-3 mb-4">
                    {[1,2,3,4,5].map(v => (
                      <button 
                        key={v} 
                        onClick={() => setFbRating(v)} 
                        className={`w-12 h-12 rounded-full border-2 font-semibold transition-all ${
                          fbRating===v
                            ? 'bg-[#4A7C59] dark:bg-green-600 text-white border-[#4A7C59] dark:border-green-600 scale-110' 
                            : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-[#4A7C59] dark:hover:border-green-600'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="w-full border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-3 focus:border-[#4A7C59] dark:focus:border-green-600 focus:outline-none"
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
                      className="px-6 py-3 bg-[#4A7C59] dark:bg-green-600 text-white rounded-lg font-medium hover:bg-[#3d6449] dark:hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
