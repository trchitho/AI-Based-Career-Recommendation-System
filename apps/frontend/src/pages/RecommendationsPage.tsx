import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import {
  recommendationService,
  CareerRecommendationDTO,
  RecommendationsResponse,
} from "../services/recommendationService";

const RecommendationsPage = () => {
  const navigate = useNavigate();

  const [data, setData] = useState<RecommendationsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const items: CareerRecommendationDTO[] = data?.items ?? [];
  const requestId = data?.request_id ?? null;

  useEffect(() => {
    const fetchRecommendations = async () => {
      setError(null);
      setLoading(true);

      try {
        const res = await recommendationService.getMain(20);
        setData(res);
      } catch (err: any) {
        const msg =
          err?.response?.data?.detail ||
          err?.message ||
          "Failed to load recommendations";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  const handleClick = async (item: CareerRecommendationDTO) => {
    try {
      await recommendationService.logClick({
        career_id: item.career_id,
        position: item.position,
        request_id: requestId,
        match_score: item.match_score,
      });
    } catch (err) {
      // Không chặn UX nếu log click fail, chỉ log ra console
      // eslint-disable-next-line no-console
      console.error("Failed to log recommendation click", err);
    }

    // Điều hướng sang trang chi tiết nghề – tuỳ router thực tế
    navigate(`/careers/${item.career_id}`);
  };

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-300 p-5">
          Career Recommendations
        </h1>

        {loading && <div>Loading...</div>}

        {!loading && error && (
          <div className="text-red-700 bg-red-50 dark:bg-red-900/30 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="text-gray-600 dark:text-gray-300">
            No recommendations available. Try completing an assessment first.
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="space-y-4">
            {items.map((item) => {
              const title =
                item.title_vi ||
                item.title_en ||
                item.career_id ||
                "Unknown career";
              const desc = item.description ?? "";
              const matchPercent = Math.round(item.match_score * 100);

              return (
                <button
                  key={item.career_id}
                  type="button"
                  onClick={() => handleClick(item)}
                  className="w-full text-left bg-white dark:bg-gray-800 p-5 rounded-xl shadow flex justify-between items-center hover:shadow-md transition-shadow"
                >
                  <div className="pr-4">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {title}
                    </div>
                    {desc && (
                      <div className="text-sm text-gray-600 dark:text-gray-300 max-w-3xl mt-1">
                        {desc}
                      </div>
                    )}

                    {item.tags && item.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {item.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-1 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="text-purple-600 dark:text-purple-300 font-bold text-xl">
                      {matchPercent}%
                    </div>
                    {typeof item.position === "number" && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Rank #{item.position}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default RecommendationsPage;
