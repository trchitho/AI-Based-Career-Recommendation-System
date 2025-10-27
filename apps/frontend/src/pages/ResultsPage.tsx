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
    if (assessmentId) {
      fetchResults();
    }
  }, [assessmentId]);

  const fetchResults = async () => {
    if (!assessmentId) return;

    try {
      setLoading(true);
      setError(null);

      const resultsData = await assessmentService.getResults(assessmentId);
      setResults(resultsData);

      // Fetch career details for recommendations
      if (resultsData.career_recommendations && resultsData.career_recommendations.length > 0) {
        const careerPromises = resultsData.career_recommendations.map((careerId: string) =>
          api.get(`/api/careers/${careerId}`)
        );

        const careerResponses = await Promise.all(careerPromises);
        const careers: CareerRecommendation[] = careerResponses.map((response, index) => {
          const career = response.data;
          // Calculate match percentage based on position (first is highest)
          const matchPercentage = 95 - index * 5;

          return {
            id: career.id,
            title: career.title,
            description: career.description,
            matchPercentage,
            required_skills: career.required_skills,
            salary_range: career.salary_range,
            industry_category: career.industry_category,
          };
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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-xl font-bold text-gray-900 hover:text-indigo-700 focus:outline-none"
                aria-label="Go to Dashboard"
              >
                Career Recommendation System
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-sm text-gray-700 hover:text-gray-900"
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate('/profile')}
                className="text-sm text-gray-700 hover:text-gray-900"
              >
                Profile
              </button>
              <span className="text-sm text-gray-700">{user?.firstName || user?.email}</span>
              <button onClick={logout} className="text-sm text-gray-700 hover:text-gray-900">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {!loading && !error && results && (
            <div>
              {/* Header */}
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Assessment Results</h2>
                <p className="text-gray-600">Completed on {formatDate(results.completed_at)}</p>
              </div>

              {/* Tab Navigation */}
              <div className="mb-6 border-b border-gray-200">
                <nav className="flex space-x-8">
                  <button
                    onClick={() => setActiveTab('summary')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'summary'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Summary
                  </button>
                  <button
                    onClick={() => setActiveTab('detailed')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'detailed'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Detailed Analysis
                  </button>
                  <button
                    onClick={() => setActiveTab('recommendations')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'recommendations'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Career Recommendations
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              {activeTab === 'summary' && (
                <div className="space-y-6">
                  <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Overview</h3>
                    <p className="text-gray-700 mb-4">
                      Your assessment has been analyzed using scientifically-validated methods to
                      understand your career interests and personality traits.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                        <h4 className="font-semibold text-indigo-900 mb-2">Top Career Interest</h4>
                        <p className="text-indigo-700">
                          {(() => {
                            const topRiasec = Object.entries(results.riasec_scores)
                              .sort((a, b) => b[1] - a[1])[0];
                            return topRiasec ? topRiasec[0].charAt(0).toUpperCase() + topRiasec[0].slice(1) : 'N/A';
                          })()}
                        </p>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-900 mb-2">
                          Dominant Personality Trait
                        </h4>
                        <p className="text-blue-700">
                          {(() => {
                            const topBigFive = Object.entries(results.big_five_scores)
                              .sort((a, b) => b[1] - a[1])[0];
                            return topBigFive ? topBigFive[0].charAt(0).toUpperCase() + topBigFive[0].slice(1) : 'N/A';
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {results.essay_analysis && (
                    <div className="bg-white shadow rounded-lg p-6">
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">Essay Insights</h3>
                      {results.essay_analysis.key_insights &&
                        results.essay_analysis.key_insights.length > 0 && (
                          <div className="mb-4">
                            <h4 className="font-medium text-gray-700 mb-2">Key Insights:</h4>
                            <ul className="list-disc list-inside space-y-1">
                              {results.essay_analysis.key_insights.map((insight, index) => (
                                <li key={index} className="text-gray-600">
                                  {insight}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      {results.essay_analysis.themes && results.essay_analysis.themes.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">Identified Themes:</h4>
                          <div className="flex flex-wrap gap-2">
                            {results.essay_analysis.themes.map((theme, index) => (
                              <span
                                key={index}
                                className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm rounded-full"
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

              {activeTab === 'detailed' && (
                <div className="space-y-6">
                  <RIASECSpiderChart scores={results.riasec_scores} />
                  <BigFiveBarChart scores={results.big_five_scores} />
                </div>
              )}

              {activeTab === 'recommendations' && (
                <CareerRecommendationsDisplay recommendations={careerRecommendations} />
              )}

              {/* Quick Feedback */}
              {!fbDone && (
                <div className="mt-8 bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Rate Your Results</h3>
                  <div className="flex items-center space-x-2 mb-3">
                    {[1,2,3,4,5].map(v => (
                      <button key={v} onClick={() => setFbRating(v)} className={`w-8 h-8 rounded-full border ${fbRating===v? 'bg-indigo-600 text-white border-indigo-600':'border-gray-300 text-gray-700'}`}>{v}</button>
                    ))}
                  </div>
                  <textarea
                    className="w-full border rounded px-3 py-2"
                    placeholder="Optional comment"
                    value={fbComment}
                    onChange={(e)=>setFbComment(e.target.value)}
                  />
                  <div className="mt-3 flex justify-end">
                    <button
                      disabled={!fbRating}
                      onClick={async ()=>{
                        if (!assessmentId || !fbRating) return;
                        try {
                          await feedbackService.submit(assessmentId, fbRating, fbComment);
                          setFbDone(true);
                        } catch (e) { console.error(e); }
                      }}
                      className="px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50"
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
