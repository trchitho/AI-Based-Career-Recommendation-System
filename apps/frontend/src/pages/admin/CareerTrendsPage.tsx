/**
 * CAREER TRENDS PAGE - English Only
 */

import { useState, useEffect } from "react";
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50/30 to-teal-50/20 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-6 space-y-6">
      {/* Modern Header with Gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-600 via-teal-600 to-blue-600 p-8 shadow-2xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-white">Career Trends</h1>
            </div>
            <p className="text-white/90 text-sm ml-16">Most recommended careers over time</p>
          </div>
          <div className="flex gap-2">
            {[
              { value: "7d", label: "7 Days" },
              { value: "30d", label: "30 Days" },
              { value: "90d", label: "90 Days" },
              { value: "all", label: "All Time" },
            ].map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value as typeof period)}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${period === p.value
                    ? "bg-white text-green-600 shadow-lg scale-105"
                    : "bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white hover:scale-105"
                  }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl p-12 flex items-center justify-center gap-3 text-gray-500 dark:text-gray-400">
          <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-lg font-medium">Loading trends...</span>
        </div>
      ) : !data ? (
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl p-12 text-center text-gray-500 dark:text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="text-lg font-medium">No data available</p>
        </div>
      ) : (
        <>
          {/* Summary - Modern Gradient Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="group relative bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative z-10">
                <p className="text-sm font-semibold text-blue-100 mb-2">Total Recommendations</p>
                <p className="text-5xl font-bold text-white mb-1">
                  {data.totalRecommendations.toLocaleString()}
                </p>
                <div className="flex items-center gap-2 text-blue-100 text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span>All time</span>
                </div>
              </div>
            </div>

            <div className="group relative bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative z-10">
                <p className="text-sm font-semibold text-green-100 mb-2">Top Careers</p>
                <p className="text-5xl font-bold text-white mb-1">
                  {data.topCareers.length}
                </p>
                <div className="flex items-center gap-2 text-green-100 text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Trending now</span>
                </div>
              </div>
            </div>

            <div className="group relative bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative z-10">
                <p className="text-sm font-semibold text-purple-100 mb-2">Time Period</p>
                <p className="text-5xl font-bold text-white mb-1">
                  {data.periodLabel}
                </p>
                <div className="flex items-center gap-2 text-purple-100 text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Selected range</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Careers Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <h2 className="text-base font-semibold mb-4 text-gray-900 dark:text-white">
              Top 10 Most Recommended Careers
            </h2>
            <div className="space-y-4">
              {data.topCareers.slice(0, 10).map((career, index) => (
                <div key={career.career_id} className="flex items-center gap-4">
                  <div className="w-8 text-center">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${index < 3 ? "bg-yellow-400 text-yellow-900" : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
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
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <h2 className="text-base font-semibold mb-4 text-gray-900 dark:text-white">
              Distribution by Industry
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
                    className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 text-center"
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
