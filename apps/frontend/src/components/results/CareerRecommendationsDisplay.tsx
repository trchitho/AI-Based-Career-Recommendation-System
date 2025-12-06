// src/components/results/CareerRecommendationsDisplay.tsx
import { useNavigate } from "react-router-dom";
import {
  CareerRecommendationDTO,
  recommendationService,
} from "../../services/recommendationService";

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

  // Chỉ hiển thị tối đa 5 nghề (phòng trường hợp parent vẫn pass >5)
  const displayedItems = items.slice(0, 5);

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

    // Truyền EN title / description sang RoadmapPage
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
            // Fake % match cao cho Top 5
            const basePercentages = [95, 90, 85, 80, 75];
            const raw = Math.round(career.match_score * 100);
            const percent =
              typeof career.display_match === "number"
                ? Math.round(career.display_match)
                : basePercentages[index] ?? Math.max(60, raw);

            // Ưu tiên EN, thiếu thì fallback VN
            const title =
              career.title_en ||
              career.title_vi ||
              career.career_id ||
              "Unknown career";
            const desc = career.description ?? "";

            return (
              <div
                key={career.career_id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:shadow-lg transition-shadow bg-white dark:bg-gray-800"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#E8DCC8] dark:bg-green-900/30 flex items-center justify-center mr-3">
                      <span className="text-[#4A7C59] dark:text-green-400 font-bold text-lg">
                        #{index + 1}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {title}
                      </h4>
                    </div>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full font-semibold text-sm ${getMatchColor(
                      percent
                    )}`}
                  >
                    {percent}% Match
                  </div>
                </div>

                {desc && (
                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    {desc}
                  </p>
                )}

                <button
                  onClick={() =>
                    handleViewRoadmap(career, index + 1, title, desc)
                  }
                  className="w-full px-4 py-2 bg-[#4A7C59] dark:bg-green-600 text-white rounded-lg hover:bg-[#3d6449] dark:hover:bg-green-700 transition-colors font-medium"
                >
                  View Learning Roadmap
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
