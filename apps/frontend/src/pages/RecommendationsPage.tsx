// apps/frontend/src/pages/RecommendationsPage.tsx
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import {
  recommendationService,
  CareerRecommendationDTO,
  RecommendationsResponse,
} from "../services/recommendationService";
import { getRIASECTagDisplay } from "../utils/riasec";
import api from "../lib/api";

// RIASEC tag → Vietnamese explanation
const RIASEC_WHY: Record<string, string> = {
  R: "Bạn thích làm việc thực tế với công cụ, máy móc và vật chất",
  I: "Bạn có tư duy phân tích, thích nghiên cứu và giải quyết vấn đề phức tạp",
  A: "Bạn có khả năng sáng tạo, thiên về nghệ thuật và biểu đạt",
  S: "Bạn có kỹ năng giao tiếp, thích giúp đỡ và làm việc với con người",
  E: "Bạn có tố chất lãnh đạo, thích thuyết phục và quản lý",
  C: "Bạn cẩn thận, có kỷ luật, làm việc tốt với dữ liệu và quy trình",
};

const RecommendationsPage = () => {
  const navigate = useNavigate();

  const [data, setData] = useState<RecommendationsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // PB10: which card is expanded for explainability
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  // PB11: feedback state per career_id: 'up' | 'down' | null
  const [feedback, setFeedback] = useState<Record<string, 'up' | 'down'>>(() => {
    try { return JSON.parse(localStorage.getItem('career_feedback') || '{}'); } catch { return {}; }
  });

  const items: CareerRecommendationDTO[] = data?.items ?? [];
  const requestId = data?.request_id ?? null;

  useEffect(() => {
    const fetchRecommendations = async () => {
      setError(null);
      setLoading(true);
      try {
        // Get latest assessment ID from user sessions
        const token = localStorage.getItem('accessToken');
        let assessmentId: number | null = null;
        try {
          const sessRes = await fetch('/api/assessments/user/sessions', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (sessRes.ok) {
            const sessions = await sessRes.json();
            if (sessions?.length > 0) assessmentId = sessions[0].primary_assessment_id ?? sessions[0].id;
          }
        } catch { /* fallback to null */ }

        if (!assessmentId) throw new Error("Chưa có kết quả đánh giá. Hãy hoàn thành bài kiểm tra trước.");

        const res = await recommendationService.getMain(assessmentId, 20);
        setData(res);
      } catch (err: any) {
        setError(err?.response?.data?.detail || err?.message || "Failed to load recommendations");
      } finally {
        setLoading(false);
      }
    };
    fetchRecommendations();
  }, []);

  // PB11: send feedback
  const handleFeedback = async (career_id: string, value: 'up' | 'down') => {
    const newFb = { ...feedback, [career_id]: value };
    setFeedback(newFb);
    localStorage.setItem('career_feedback', JSON.stringify(newFb));
    try {
      await api.post('/api/recommendations/feedback', {
        career_id,
        rating: value === 'up' ? 5 : 1,
        comment: `User ${value === 'up' ? 'liked' : 'disliked'} career: ${career_id}`,
      });
    } catch { /* non-critical */ }
  };

  // Match style theo % match_score
  const getMatchStyle = (score: number) => {
    const percent = Math.round(score * 100);
    if (percent >= 90)
      return {
        color: "text-green-600",
        bg: "bg-green-100 dark:bg-green-900/30",
        border: "border-green-200 dark:border-green-700",
        label: "Excellent Match",
      };
    if (percent >= 75)
      return {
        color: "text-blue-600",
        bg: "bg-blue-100 dark:bg-blue-900/30",
        border: "border-blue-200 dark:border-blue-700",
        label: "Great Match",
      };
    return {
      color: "text-yellow-600",
      bg: "bg-yellow-100 dark:bg-yellow-900/30",
      border: "border-yellow-200 dark:border-yellow-700",
      label: "Good Match",
    };
  };

  const handleClick = async (item: CareerRecommendationDTO, index: number) => {
    const slugOrId = item.slug || item.career_id;

    try {
      await recommendationService.logClick({
        career_id: slugOrId,
        position: item.position ?? index + 1,
        request_id: requestId,
        match_score: item.match_score,
      });
    } catch (err) {
      // Không chặn UX nếu log fail
      // eslint-disable-next-line no-console
      console.error("Failed to log recommendation click", err);
    }

    // Điều hướng sang trang chi tiết nghề (không /roadmap ở trang này)
    navigate(`/careers/${slugOrId}`);
  };

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
        <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-green-400/5 rounded-full blur-[120px] pointer-events-none z-0" />
        <div className="fixed bottom-0 left-0 w-[600px] h-[600px] bg-blue-400/5 rounded-full blur-[120px] pointer-events-none z-0" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* HEADER */}
          <div className="text-center mb-16 animate-fade-in-up">
            <span className="inline-block py-1.5 px-4 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold tracking-widest uppercase mb-6 border border-green-200 dark:border-green-800">
              AI-Powered Analysis
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-6 tracking-tight leading-tight">
              Your Career{" "}
              <span className="text-green-600 dark:text-green-500">
                Recommendations
              </span>
            </h1>
            <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto font-medium leading-relaxed">
              Based on your unique personality profile and interests, here are
              the top career paths that fit you best.
            </p>
          </div>

          {/* LOADING */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-32 animate-pulse">
              <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 rounded-full border-t-green-600 mb-4 animate-spin" />
              <p className="text-gray-500 font-medium">
                Analyzing career matches...
              </p>
            </div>
          )}

          {/* ERROR */}
          {error && !loading && (
            <div className="max-w-2xl mx-auto bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 flex items-center gap-4 animate-fade-in-up">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center text-red-600 shrink-0">
                <svg
                  className="w-6 h-6"
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
                {error}
              </p>
            </div>
          )}

          {/* GRID RECOMMENDATIONS */}
          {!loading && !error && items.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in-up">
              {items.map((it, index) => {
                const style = getMatchStyle(it.match_score);
                const percent = Math.round(it.match_score * 100);

                const title =
                  it.title_en ||
                  it.title_vi ||
                  it.career_id ||
                  "Unknown career";
                const desc = it.description || "";

                return (
                  <div
                    key={it.career_id}
                    className="group bg-white dark:bg-gray-800 rounded-[32px] border border-gray-100 dark:border-gray-700 shadow-xl shadow-gray-200/50 dark:shadow-none hover:shadow-2xl hover:shadow-green-900/10 hover:-translate-y-2 transition-all duration-300 flex flex-col overflow-hidden h-full"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {/* Card Header with Score */}
                    <div className="p-8 border-b border-gray-50 dark:border-gray-700/50">
                      <div className="flex justify-between items-start mb-4">
                        <div
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${style.bg} ${style.color} ${style.border}`}
                        >
                          {style.label}
                        </div>
                        <div className="relative w-14 h-14 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle
                              cx="28"
                              cy="28"
                              r="26"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="transparent"
                              className="text-gray-200 dark:text-gray-700"
                            />
                            <circle
                              cx="28"
                              cy="28"
                              r="26"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="transparent"
                              strokeDasharray={163}
                              strokeDashoffset={163 - (163 * percent) / 100}
                              className={style.color}
                              strokeLinecap="round"
                            />
                          </svg>
                          <span
                            className={`absolute text-sm font-bold ${style.color}`}
                          >
                            {percent}%
                          </span>
                        </div>
                      </div>

                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-green-600 transition-colors">
                        {title}
                      </h3>

                      {/* Tags – tạm thời static + tags từ API nếu có */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-1 rounded-md font-medium">
                          Full-time
                        </span>
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-1 rounded-md font-medium">
                          Remote Friendly
                        </span>
                        {it.tags &&
                          it.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-xs bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-200 px-2 py-1 rounded-md font-medium"
                            >
                              {getRIASECTagDisplay(tag)}
                            </span>
                          ))}
                      </div>
                    </div>

                    {/* Description + Action */}
                    <div className="p-8 pt-6 flex-grow flex flex-col">
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-4 leading-relaxed mb-4 flex-grow">
                        {desc || "No description available."}
                      </p>

                      {/* PB10: Explainability – "Tại sao phù hợp?" */}
                      <button
                        onClick={() => setExpandedCard(expandedCard === it.career_id ? null : it.career_id)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-green-600 dark:text-green-400 hover:text-green-700 mb-3 self-start"
                      >
                        <svg className={`w-3.5 h-3.5 transition-transform ${expandedCard === it.career_id ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        Tại sao phù hợp?
                      </button>
                      {expandedCard === it.career_id && (
                        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-xl text-xs text-green-800 dark:text-green-200 space-y-1.5">
                          {it.tags && it.tags.length > 0 ? (
                            it.tags.map((tag) => (
                              <div key={tag} className="flex items-start gap-2">
                                <span className="mt-0.5 w-4 h-4 rounded-full bg-green-200 dark:bg-green-800 flex items-center justify-center text-green-700 dark:text-green-200 font-bold shrink-0 text-[10px]">{tag.toUpperCase()}</span>
                                <span>{RIASEC_WHY[tag.toUpperCase()] ?? `Nhóm RIASEC: ${tag.toUpperCase()}`}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-gray-500 dark:text-gray-400">Dựa trên kết quả đánh giá tính cách RIASEC của bạn với điểm phù hợp {percent}%.</p>
                          )}
                        </div>
                      )}

                      {/* PB11: Feedback buttons */}
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-xs text-gray-400 dark:text-gray-500">Phù hợp không?</span>
                        <button
                          onClick={() => handleFeedback(it.career_id, 'up')}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${feedback[it.career_id] === 'up' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-green-400 hover:text-green-600'}`}
                        >
                          <svg className="w-3.5 h-3.5" fill={feedback[it.career_id] === 'up' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                          </svg>
                          Có
                        </button>
                        <button
                          onClick={() => handleFeedback(it.career_id, 'down')}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${feedback[it.career_id] === 'down' ? 'bg-red-500 border-red-500 text-white' : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-red-400 hover:text-red-600'}`}
                        >
                          <svg className="w-3.5 h-3.5" fill={feedback[it.career_id] === 'down' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                          </svg>
                          Không
                        </button>
                      </div>

                      <button
                        onClick={() => handleClick(it, index)}
                        className="w-full py-3.5 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold text-sm shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 group/btn"
                      >
                        View Career Path
                        <svg
                          className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M14 5l7 7m0 0l-7 7m7-7H3"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* EMPTY STATE */}
          {!loading && !error && items.length === 0 && (
            <div className="text-center py-32 animate-fade-in-up">
              <div className="w-24 h-24 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-10 h-10 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                No recommendations found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
                It seems we couldn't generate recommendations at this time.
                Please try taking the assessment again.
              </p>
              <Link
                to="/assessment"
                className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-full font-bold shadow-lg transition-all"
              >
                Take Assessment
              </Link>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default RecommendationsPage;
