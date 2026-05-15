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

  // Backend đã đảm bảo số lượng & thứ tự, không slice ở FE nữa
  const displayedItems = items;

  const getMatchColor = (percentage: number) => {
    if (percentage >= 90) return "text-indigo-800 bg-indigo-50";
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
        message = `Nâng cấp lên ${planInfo?.name || 'Gói Cơ bản'} để xem top 2 nghề phù hợp.`;
      } else if (currentPlan === 'basic') {
        message = `Nâng cấp lên ${getPlanInfo('premium')?.name || 'Gói Premium'} để xem tất cả nghề nghiệp.`;
      } else {
        message = `Nâng cấp lên ${getPlanInfo('premium')?.name || 'Gói Premium'} để xem tất cả nghề nghiệp.`;
      }

      navigate('/pricing', {
        state: {
          feature: 'career_recommendations',
          message,
          requiredPlan: requiredPlan,
          redirectTo: `/careers/${slugOrId}`,
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
    navigate(`/careers/${slugOrId}`, {
      state: {
        title,
        description: desc,
        fromResults: true, // Đánh dấu đây là navigation từ results page
      },
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          Nghề Nghiệp Phù Hợp Nhất Của Bạn
        </h3>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Dựa trên kết quả đánh giá của bạn, đây là các nghề nghiệp phù hợp với
        sở thích và tính cách của bạn.
      </p>

      {loading && <div>Đang tải gợi ý nghề nghiệp...</div>}

      {!loading && error && (
        <div className="text-red-700 bg-red-50 dark:bg-red-900/30 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {!loading && !error && displayedItems.length === 0 && (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p className="text-gray-600 dark:text-gray-400">
            Gợi ý nghề nghiệp đang được tạo. Vui lòng quay lại sau.
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

            // Ưu tiên VN, thiếu thì fallback EN
            const title =
              career.title_vi ||
              career.title_vn ||
              (career as any).title ||
              career.title_en ||
              career.career_id ||
              "Nghề nghiệp chưa xác định";
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
                      <span className={`px-2 py-1 text-white text-xs font-bold rounded-full flex items-center gap-1 ${requiredPlanInfo?.color === 'blue' ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
                        requiredPlanInfo?.color === 'green' ? 'bg-gradient-to-r from-indigo-700 to-indigo-700' :
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
                      : 'bg-beige-light dark:bg-indigo-950/30'
                      }`}>
                      <span className={`font-bold text-lg ${isLocked
                        ? 'text-purple-600 dark:text-purple-400'
                        : 'text-primary-cta dark:text-indigo-400'
                        }`}>
                        {index + 1}
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
                    {percent}% Phù Hợp
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
                          return `Nâng cấp lên Gói Cơ Bản (99k) để xem 2 nghề phù hợp hàng đầu hoặc Gói Cao Cấp (199k) để truy cập không giới hạn.`;
                        } else if (currentPlan === 'basic') {
                          return `Gói Cơ Bản chỉ cho phép xem 2 nghề đầu tiên. Nâng cấp lên Gói Cao Cấp (199k) để xem tất cả.`;
                        } else {
                          return `Nâng cấp lên ${requiredPlanInfo?.name || 'Cao Cấp'} để xem chi tiết nghề nghiệp này.`;
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
                      ? `bg-gradient-to-r ${requiredPlanInfo?.color === 'blue' ? 'from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600' :
                        requiredPlanInfo?.color === 'green' ? 'from-indigo-700 to-indigo-700 hover:from-indigo-800 hover:to-indigo-800' :
                          'from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                      } text-white`
                      : 'bg-primary-cta dark:bg-indigo-800 text-white hover:bg-primary-dark dark:hover:bg-indigo-900'
                      }`}
                  >
                    {isLocked ? (() => {
                      if (currentPlan === 'free') {
                        return 'Nâng Cấp Lên Cơ Bản ';
                      } else if (currentPlan === 'basic') {
                        return 'Nâng Cấp Lên Cao Cấp ';
                      } else {
                        return `Nâng Cấp Lên ${requiredPlanInfo?.name || 'Cao Cấp'} `;
                      }
                    })() : 'Xem Chi Tiết Nghề Nghiệp'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CareerRecommendationsDisplay;
