import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import api from "../../lib/api";

interface CareerTrend {
  career_id: string;
  career_title: string;
  recommendation_count: number;
  percentage: number;
  industry_category: string;
}

interface TrendData {
  topCareers: CareerTrend[];
  totalRecommendations: number;
  periodLabel: string;
}

const CareerTrendsPage = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"7d" | "30d" | "90d" | "all">("30d");

  useEffect(() => {
    loadTrends();
  }, [period]);

  const loadTrends = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/admin/career-trends", { params: { period } });
      setData(res.data);
    } catch (err) {
      console.error("Error loading career trends:", err);
    } finally {
      setLoading(false);
    }
  };

  const getBarWidth = (percentage: number) => {
    return `${Math.min(percentage * 2, 100)}%`;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      "Technology": "bg-blue-500",
      "Healthcare": "bg-green-500",
      "Finance": "bg-yellow-500",
      "Education": "bg-purple-500",
      "Engineering": "bg-red-500",
      "Arts": "bg-pink-500",
      "Business": "bg-indigo-500",
      "Science": "bg-teal-500",
    };
    return colors[category] || "bg-gray-500";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold dark:text-white">Xu hướng nghề nghiệp</h1>
        <div className="flex gap-2">
          {[
            { value: "7d", label: "7 ngày" },
            { value: "30d", label: "30 ngày" },
            { value: "90d", label: "90 ngày" },
            { value: "all", label: "Tất cả" },
          ].map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value as any)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                period === p.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center text-gray-500 dark:text-gray-400">
          Đang tải...
        </div>
      ) : !data ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center text-gray-500 dark:text-gray-400">
          Không có dữ liệu
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">Tổng đề xuất</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {data.totalRecommendations.toLocaleString()}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">Top nghề nghiệp</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {data.topCareers.length}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">Khoảng thời gian</p>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {data.periodLabel}
              </p>
            </div>
          </div>

          {/* Top Careers Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 dark:text-white">
              Top 10 nghề nghiệp được đề xuất nhiều nhất
            </h2>
            <div className="space-y-4">
              {data.topCareers.slice(0, 10).map((career, index) => (
                <div key={career.career_id} className="flex items-center gap-4">
                  <div className="w-8 text-center">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      index < 3 ? "bg-yellow-400 text-yellow-900" : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
                    }`}>
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {career.career_title}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {career.recommendation_count} ({career.percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full ${getCategoryColor(career.industry_category)}`}
                        style={{ width: getBarWidth(career.percentage) }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {career.industry_category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Industry Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 dark:text-white">
              Phân bố theo ngành
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(
                data.topCareers.reduce((acc, career) => {
                  acc[career.industry_category] = (acc[career.industry_category] || 0) + career.recommendation_count;
                  return acc;
                }, {} as Record<string, number>)
              )
                .sort((a, b) => b[1] - a[1])
                .map(([category, count]) => (
                  <div
                    key={category}
                    className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700 text-center"
                  >
                    <div className={`w-3 h-3 rounded-full ${getCategoryColor(category)} mx-auto mb-2`} />
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{category}</p>
                    <p className="text-lg font-bold text-gray-600 dark:text-gray-300">{count}</p>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CareerTrendsPage;
