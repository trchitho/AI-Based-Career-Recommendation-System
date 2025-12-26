// src/components/results/CareerRecommendationsDisplay.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CareerRecommendationDTO,
  recommendationService,
} from "../../services/recommendationService";
import { useFeatureAccess } from "../../hooks/useFeatureAccess";
import { useUsageTracking } from "../../hooks/useUsageTracking";
import { trackCareerEvent, getDwellMs, clearDwellStart } from "../../services/trackService";
import { useAuth } from "../../contexts/AuthContext";
import { goalsService } from "../../services/goalsService";

interface CareerRecommendationsDisplayProps {
  items: CareerRecommendationDTO[];
  requestId: string | null;
  loading: boolean;
  error?: string | null;
}

const CareerRecommendationsDisplay = ({
  items,
  requestId,
  loading,
  error,
}: CareerRecommendationsDisplayProps) => {
  const navigate = useNavigate();
  const { hasFeature, getPlanInfo, currentPlan } = useFeatureAccess();
  useUsageTracking();
  const { user } = useAuth();
  const [savingGoal, setSavingGoal] = useState<string | null>(null);
  const [savedGoals, setSavedGoals] = useState<Set<string>>(new Set());
  const [showAIPrompt, setShowAIPrompt] = useState<{ goalId: number; careerName: string } | null>(null);

  // Check if user has Pro plan for goal setting
  const canSetGoals = currentPlan === 'pro';

  const handleSaveAsGoal = async (careerId: string, careerName: string) => {
    if (!canSetGoals) {
      navigate('/pricing', {
        state: {
          feature: 'career_goals',
          message: 'Nâng cấp Gói Pro để sử dụng tính năng Quản lý Mục tiêu Sự nghiệp.',
          requiredPlan: 'pro'
        }
      });
      return;
    }

    try {
      setSavingGoal(careerId);
      const result = await goalsService.saveCareerAsGoal(careerId, careerName);
      setSavedGoals(prev => new Set(prev).add(careerId));
      // Show AI prompt modal
      setShowAIPrompt({ goalId: result.goal_id, careerName });
    } catch (err) {
      console.error('Failed to save career as goal:', err);
    } finally {
      setSavingGoal(null);
    }
  };

  const handleAIGenerate = () => {
    if (showAIPrompt) {
      navigate('/career-goals', { 
        state: { 
          openAIModal: true, 
          goalId: showAIPrompt.goalId 
        } 
      });
    }
    setShowAIPrompt(null);
  };

  // Backend đã đảm bảo số lượng & thứ tự, không slice ở FE nữa
  const displayedItems = items;

  const getMatchColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600 bg-green-100";
    if (percentage >= 80) return "text-blue-600 bg-blue-100";
    if (percentage >= 70) return "text-yellow-600 bg-yellow-100";
    return "text-gray-600 bg-gray-100";
  };

  const handleViewRoadmap = async (
    career: CareerRecommendationDTO,
    position: number,
    title: string,
    desc: string
  ) => {
    const slugOrId = career.slug || career.career_id;

    // Check career viewing limits based on plan
    const canViewCareer = () => {
      if (hasFeature('unlimited_careers')) {
        return true; // Premium/Pro users can view all careers
      }
      
      // For Basic plan: can only view first 2 careers (position 1, 2)
      // Position 3+ are locked
      if (currentPlan === 'basic') {
        return position <= 2; // Allow positions 1, 2 only
      }
      
      // Free users can only view first career (position 1)
      return position === 1;
    };

    if (!canViewCareer()) {
      const requiredPlan = currentPlan === 'basic' ? 'premium' : 'basic';
      const planInfo = getPlanInfo(requiredPlan);
      
      let message = '';
      if (currentPlan === 'free') {
        message = `Nâng cấp ${planInfo?.name || 'Gói Cơ Bản'} để xem 2 nghề nghiệp phù hợp nhất.`;
      } else if (currentPlan === 'basic') {
        message = `Nâng cấp ${getPlanInfo('premium')?.name || 'Gói Premium'} để xem toàn bộ danh mục nghề nghiệp.`;
      } else {
        message = `Nâng cấp ${getPlanInfo('premium')?.name || 'Gói Premium'} để xem toàn bộ danh mục nghề nghiệp.`;
      }
      
      navigate('/pricing', {
        state: {
          feature: 'career_recommendations',
          message,
          requiredPlan: requiredPlan,
          redirectTo: `/careers/${slugOrId}/roadmap`,
          redirectState: { title, description: desc }
        }
      });
      return;
    }

    // For unlocked careers, proceed normally
    try {
      await recommendationService.logClick({
        career_id: slugOrId,
        position,
        request_id: requestId,
        match_score: career.match_score,
      });
    } catch (err) {
      // Không chặn UX nếu log fail
      // eslint-disable-next-line no-console
      console.error("Failed to log recommendation click", err);
    }

    // NOTE: ViewRoadmap không track usage - chỉ track khi vào career detail page
    // Tracking sẽ được thực hiện ở CareerDetailPage và CareersPage

    // Truyền EN title / description sang RoadmapPage
    // Calculate dwell time before clearing
    const dwellMs = getDwellMs();

    // Log click event via trackService (uses axios instance with auth)
    // dwell_ms = time from when Career Matches tab was opened until click
    trackCareerEvent(
      {
        event_type: 'click',
        job_id: slugOrId,
        rank_pos: position,
        score_shown: career.display_match ?? career.match_score,
        dwell_ms: dwellMs,
        ...(requestId ? { ref: requestId } : {}),
      },
      user && user.id ? { userId: user.id } : undefined
    );

    // Clear dwell start to prevent double-count on back navigation
    clearDwellStart();

    // Navigate immediately, don't wait for tracking
    navigate(`/careers/${slugOrId}/roadmap`, {
      state: {
        title,
        description: desc,
        fromRoadmap: true, // Đánh dấu đây là navigation từ roadmap
      },
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Your Top Career Matches
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Based on your assessment results, here are careers that align with your
        interests and personality.
      </p>

      {loading && <div>Loading recommendations...</div>}

      {!loading && error && (
        <div className="text-red-700 bg-red-50 dark:bg-red-900/30 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {!loading && !error && displayedItems.length === 0 && (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p className="text-gray-600 dark:text-gray-400">
            Career recommendations are being generated. Please check back
            shortly.
          </p>
        </div>
      )}

      {!loading && !error && displayedItems.length > 0 && (
        <div className="space-y-4">
          {displayedItems.map((career, index) => {
            // Ưu tiên dùng display_match từ backend.
            // Nếu chưa có (giai đoạn chuyển tiếp), fallback = max(60, match_score * 100).
            const hasDisplayMatch =
              typeof career.display_match === "number" &&
              !Number.isNaN(career.display_match);

            const raw = Math.round(career.match_score * 100);
            const percent = hasDisplayMatch
              ? Math.round(career.display_match as number)
              : Math.max(60, raw);

            // Ưu tiên EN, thiếu thì fallback VN
            const title =
              career.title_en ||
              career.title_vi ||
              career.career_id ||
              "Unknown career";
            const desc = career.description ?? "";

            // Check if this career is locked based on 4-tier system
            const isLocked = (() => {
              if (hasFeature('unlimited_careers')) {
                return false; // Premium/Pro users can view all careers
              }
              
              // For Basic plan: can only view first 2 careers (index 0, 1)
              // Career 3+ (index 2+) are locked
              if (currentPlan === 'basic') {
                return index >= 2; // Lock careers from index 2 onwards
              }
              
              // Free users can only view first career (index 0)
              return index > 0;
            })();
            
            const requiredPlan = (() => {
              if (!isLocked) return null;
              
              // For Basic users viewing career 3+, suggest Premium
              if (currentPlan === 'basic') {
                return 'premium';
              }
              
              // For Free users, suggest Basic
              return 'basic';
            })();
            const requiredPlanInfo = requiredPlan ? getPlanInfo(requiredPlan) : null;

            return (
              <div
                key={career.career_id}
                className={`border border-gray-200 dark:border-gray-700 rounded-lg p-5 transition-shadow bg-white dark:bg-gray-800 relative overflow-hidden ${isLocked ? 'opacity-75' : 'hover:shadow-lg'
                  }`}
              >
                {/* Premium overlay for locked careers */}
                {isLocked && (
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 pointer-events-none">
                    <div className="absolute top-3 right-3">
                      <span className={`px-2 py-1 text-white text-xs font-bold rounded-full flex items-center gap-1 ${
                        requiredPlanInfo?.color === 'blue' ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
                        requiredPlanInfo?.color === 'green' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                        'bg-gradient-to-r from-purple-500 to-pink-500'
                      }`}>
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C9.79 2 8 3.79 8 6v2H7c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2h-1V6c0-2.21-1.79-4-4-4zm0 2c1.1 0 2 .9 2 2v2h-4V6c0-1.1.9-2 2-2z" />
                        </svg>
                        {requiredPlanInfo?.name.replace('Gói ', '') || 'PRO'}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mr-3 ${isLocked
                        ? 'bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30'
                        : 'bg-[#E8DCC8] dark:bg-green-900/30'
                      }`}>
                      <span className={`font-bold text-lg ${isLocked
                          ? 'text-purple-600 dark:text-purple-400'
                          : 'text-[#4A7C59] dark:text-green-400'
                        }`}>
                        #{index + 1}
                      </span>
                    </div>
                    <div>
                      <h4 className={`text-lg font-semibold ${isLocked
                          ? 'text-gray-600 dark:text-gray-400'
                          : 'text-gray-900 dark:text-white'
                        }`}>
                        {title}
                      </h4>
                    </div>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full font-semibold text-sm ${isLocked
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        : getMatchColor(percent)
                      }`}
                  >
                    {percent}% Match
                  </div>
                </div>

                    {desc && (
                  <p className={`mb-4 ${isLocked
                      ? 'text-gray-500 dark:text-gray-500'
                      : 'text-gray-700 dark:text-gray-300'
                    }`}>
                    {isLocked 
                      ? (() => {
                          if (currentPlan === 'free') {
                            return `Nâng cấp Gói Cơ Bản (99k) để xem 2 nghề nghiệp phù hợp nhất hoặc Gói Premium (299k) để xem không giới hạn.`;
                          } else if (currentPlan === 'basic') {
                            return `Gói Cơ Bản chỉ xem được 2 nghề nghiệp đầu tiên. Nâng cấp Gói Premium (299k) để xem toàn bộ danh mục nghề nghiệp.`;
                          } else {
                            return `Nâng cấp ${requiredPlanInfo?.name || 'Premium'} để xem chi tiết nghề nghiệp này.`;
                          }
                        })()
                      : desc
                    }
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      handleViewRoadmap(career, index + 1, title, desc)
                    }
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${isLocked
                        ? `bg-gradient-to-r ${
                            requiredPlanInfo?.color === 'blue' ? 'from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600' :
                            requiredPlanInfo?.color === 'green' ? 'from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600' :
                            'from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                          } text-white`
                        : 'bg-[#4A7C59] dark:bg-green-600 text-white hover:bg-[#3d6449] dark:hover:bg-green-700'
                      }`}
                  >
                    {isLocked ? (() => {
                      if (currentPlan === 'free') {
                        return 'Nâng cấp Gói Cơ Bản ✨';
                      } else if (currentPlan === 'basic') {
                        return 'Nâng cấp Premium ✨';
                      } else {
                        return `Nâng cấp ${requiredPlanInfo?.name || 'Premium'} ✨`;
                      }
                    })() : 'View Learning Roadmap'}
                  </button>
                  
                  {/* Save as Goal button - Pro feature */}
                  {!isLocked && (
                    <button
                      onClick={() => handleSaveAsGoal(career.slug || career.career_id, title)}
                      disabled={savingGoal === career.career_id || savedGoals.has(career.career_id)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                        savedGoals.has(career.career_id)
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : canSetGoals
                            ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                      }`}
                      title={canSetGoals ? 'Lưu làm mục tiêu nghề nghiệp' : 'Tính năng Pro - Nâng cấp để sử dụng'}
                    >
                      {savingGoal === career.career_id ? (
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : savedGoals.has(career.career_id) ? (
                        <>
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Đã lưu
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                          {canSetGoals ? 'Save' : '🔒 Pro'}
                        </>
                      )}
                    </button>
                  )}
                </div>
                
                {/* Link to Career Goals page for saved goals */}
                {savedGoals.has(career.career_id) && (
                  <button
                    onClick={() => navigate('/career-goals')}
                    className="w-full mt-2 px-4 py-2 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                  >
                    → Quản lý Mục tiêu Sự nghiệp
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* AI Generate Prompt Modal */}
      {showAIPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 animate-fade-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Đã lưu mục tiêu thành công!
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Bạn có muốn AI tạo lộ trình thực hiện cho mục tiêu "{showAIPrompt.careerName}" không?
              </p>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 mb-6">
              <p className="text-sm text-purple-700 dark:text-purple-300">
                <span className="font-semibold">✨ AI sẽ:</span>
                <br />• Phân tích dữ liệu nghề nghiệp và lộ trình
                <br />• Tạo các bước thực hiện chi tiết
                <br />• Ước tính thời gian cho từng bước
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAIPrompt(null);
                  navigate('/career-goals');
                }}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Để sau
              </button>
              <button
                onClick={handleAIGenerate}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Tạo lộ trình AI
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CareerRecommendationsDisplay;
