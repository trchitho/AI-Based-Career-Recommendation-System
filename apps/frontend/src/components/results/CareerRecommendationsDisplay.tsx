// src/components/results/CareerRecommendationsDisplay.tsx
import { useNavigate } from "react-router-dom";
import {
  CareerRecommendationDTO,
  recommendationService,
} from "../../services/recommendationService";
import { useSubscription } from "../../hooks/useSubscription";
import { checkCareerAccess, trackCareerView } from "../../services/subscriptionService";
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
  const { isPremium } = useSubscription();
  const { user } = useAuth();

  // Debug: Log premium status
  console.log('🔍 CareerRecommendations - isPremium:', isPremium);

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

    // Check career access for free users
    if (!isPremium) {
      try {
        const accessCheck = await checkCareerAccess(parseInt(slugOrId));
        if (!accessCheck.allowed) {
          // Show upgrade prompt instead of navigating
          navigate('/pricing', {
            state: {
              feature: 'career_view',
              message: accessCheck.message,
              redirectTo: `/careers/${slugOrId}/roadmap`,
              redirectState: { title, description: desc }
            }
          });
          return;
        }
      } catch (err) {
        console.error("Failed to check career access", err);
      }
    }

    try {
      await recommendationService.logClick({
        career_id: slugOrId,
        position,
        request_id: requestId,
        match_score: career.match_score,
      });

      // Track career view for usage counting
      if (!isPremium) {
        await trackCareerView(parseInt(slugOrId));
      }
    } catch (err) {
      // Không chặn UX nếu log fail
      // eslint-disable-next-line no-console
      console.error("Failed to log recommendation click", err);
    }

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

            // Check if this career is locked for free users
            const isLocked = !isPremium && index > 0; // Free users can only view first career

            // Debug: Log lock status for each career
            console.log(`Career ${index + 1} (${title}):`, { isPremium, index, isLocked });

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
                      <span className="px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 616 0z" clipRule="evenodd" />
                        </svg>
                        PRO
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
                    {isLocked ? 'Nâng cấp Premium để xem chi tiết nghề nghiệp này và lộ trình học tập đầy đủ.' : desc}
                  </p>
                )}

                <button
                  onClick={() =>
                    handleViewRoadmap(career, index + 1, title, desc)
                  }
                  className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${isLocked
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
                      : 'bg-[#4A7C59] dark:bg-green-600 text-white hover:bg-[#3d6449] dark:hover:bg-green-700'
                    }`}
                >
                  {isLocked ? 'Mở khóa với Premium ✨' : 'View Learning Roadmap'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CareerRecommendationsDisplay;
