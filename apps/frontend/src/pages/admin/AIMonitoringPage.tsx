/**
 * AI MONITORING PAGE - Vietnamese UI, 100% Dynamic Data
 */

import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { adminService } from '../../services/adminService';
import { translateRIASEC, translateBigFive, translateSeverity, translateAnomalyText } from '../../utils/translations';

/* ---------------------------------------------
   TYPES
---------------------------------------------- */
interface AIMetrics {
  totalRecommendations: number;
  totalAssessments: number;
  avgRecommendationsPerAssessment: number;
  assessmentsWithEssay: number;
  avgProcessingTime: number;
  errorRate: number;
  errorCount: number;
  successCount: number;
  avgFeedbackRating: number;
  totalFeedback: number;
  riasecDistribution: Record<string, string>;
  bigFiveDistribution: Record<string, string>;
}

interface UserFeedback {
  id: string;
  userId: string;
  userName: string;
  assessmentId: string | null;
  rating: number;
  comment: string;
  createdAt: string;
}

interface Anomaly {
  id: number;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  user_id: number | null;
  user_email: string | null;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

interface AnomalyStats {
  total: number;
  unresolved: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

/* ---------------------------------------------
   SHARED STYLE CONSTANTS
---------------------------------------------- */
const baseInput =
  "w-full px-3 py-2 text-sm rounded-lg border " +
  "bg-white dark:bg-gray-800 " +
  "border-gray-200 dark:border-gray-700 " +
  "text-gray-900 dark:text-gray-100 " +
  "placeholder-gray-400 dark:placeholder-gray-500 " +
  "focus:outline-none focus:ring-2 focus:ring-indigo-600";

const cardClass =
  "bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 " +
  "border border-gray-100 dark:border-gray-700";

const tableHead =
  "bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300";

/* ---------------------------------------------
   MAIN COMPONENT
---------------------------------------------- */
const AIMonitoringPage = () => {
  const [metrics, setMetrics] = useState<AIMetrics | null>(null);
  const [feedback, setFeedback] = useState<UserFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  // PB28: Gemini live status
  const [geminiStatus, setGeminiStatus] = useState<any>(null);
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [reiniting, setReiniting] = useState(false);

  // Anomaly detection
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [anomalyStats, setAnomalyStats] = useState<AnomalyStats | null>(null);
  const [anomalyLoading, setAnomalyLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectMsg, setDetectMsg] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    minRating: '',
  });

  useEffect(() => {
    loadMetrics();
    loadFeedback();
    loadGeminiStatus();
    loadAnomalies();
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const data = await adminService.getAIMetrics();
      setMetrics(data);
    } catch (error) {
      console.error("Error loading metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadFeedback = async () => {
    try {
      setFeedbackLoading(true);
      const params: Record<string, string | number> = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.minRating) params.minRating = Number(filters.minRating);

      const data = await adminService.getUserFeedback(params);
      setFeedback(data.feedback || []);
    } catch (error) {
      console.error("Error loading feedback:", error);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleFilter = (field: string, value: string) => {
    setFilters({ ...filters, [field]: value });
  };

  // PB28: Gemini status functions
  const loadGeminiStatus = async () => {
    setGeminiLoading(true);
    try {
      const data = await adminService.getGeminiStatus();
      setGeminiStatus(data);
    } catch {
      setGeminiStatus(null);
    } finally {
      setGeminiLoading(false);
    }
  };

  const handleReinit = async () => {
    setReiniting(true);
    try {
      await fetch('/api/admin/gemini-reinit', { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } });
      await loadGeminiStatus();
    } catch {
      // non-critical
    } finally {
      setReiniting(false);
    }
  };

  const loadAnomalies = async () => {
    setAnomalyLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        api.get("/api/admin/anomalies?limit=50"),
        api.get("/api/admin/anomalies/stats"),
      ]);
      setAnomalies(listRes.data.items || []);
      setAnomalyStats(statsRes.data);
    } catch (e) {
      console.error("Error loading anomalies:", e);
    } finally {
      setAnomalyLoading(false);
    }
  };

  const runDetection = async () => {
    setDetecting(true);
    setDetectMsg(null);
    try {
      const res = await api.post("/api/admin/anomalies/detect");
      const created = res.data.anomalies_created ?? 0;
      setDetectMsg(created > 0 ? `${created} new anomaly(s) detected.` : "No new anomalies found.");
      await loadAnomalies();
    } catch (e: any) {
      setDetectMsg(`Detection failed: ${e?.response?.data?.detail || e?.message || "Unknown error"}`);
    } finally {
      setDetecting(false);
    }
  };

  const resolveAnomaly = async (id: number) => {
    try {
      await api.post(`/api/admin/anomalies/${id}/resolve`);
      setAnomalies((prev) => prev.map((a) => a.id === id ? { ...a, resolved: true } : a));
      if (anomalyStats) {
        setAnomalyStats({ ...anomalyStats, unresolved: Math.max(0, anomalyStats.unresolved - 1) });
      }
    } catch (e) {
      console.error("Failed to resolve anomaly:", e);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-[F8F9FA] dark:bg-gray-900 min-h-screen flex items-center justify-center gap-3 text-gray-500 dark:text-gray-400">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        Đang tải...
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-6 bg-[F8F9FA] dark:bg-gray-900 min-h-screen">
        <div className={`${cardClass} text-red-500`}>Failed to load metrics</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-6 space-y-6">
      {/* Modern Header with Gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-8 shadow-2xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-white">Giám sát hiệu suất AI</h1>
            </div>
            <p className="text-white/90 text-sm ml-16">Theo dõi sức khỏe và hiệu suất hệ thống AI theo thời gian thực</p>
          </div>
          <button
            onClick={loadMetrics}
            className="flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-xl font-medium transition-all duration-200 hover:scale-105 shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Làm mới
          </button>
        </div>
      </div>

      {/* PB28: GEMINI LIVE STATUS - Modern Card */}
      <section>
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6 transition-all duration-300 hover:shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`relative w-4 h-4 rounded-full ${geminiStatus?.streams_initialized ? 'bg-indigo-700' : 'bg-red-500'}`}>
                {geminiStatus?.streams_initialized && (
                  <span className="absolute inset-0 rounded-full bg-indigo-700 animate-ping opacity-75"></span>
                )}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Trạng thái Gemini AI</h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={loadGeminiStatus}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-all duration-200 hover:scale-105"
              >
                Làm mới
              </button>
              <button
                onClick={handleReinit}
                disabled={reiniting}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {reiniting ? "Đang khởi tạo lại..." : "Khởi tạo lại"}
              </button>
            </div>
          </div>

          {geminiLoading ? (
            <div className="flex items-center justify-center gap-3 text-gray-400 py-8">
              <div className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span>Đang tải trạng thái...</span>
            </div>
          ) : geminiStatus ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Trạng thái tổng', value: geminiStatus.streams_initialized ? '✓ Trực tuyến' : '✗ Ngoại tuyến', ok: geminiStatus.streams_initialized, gradient: 'from-indigo-700 to-indigo-800' },
                  { label: 'AI Đánh giá', value: geminiStatus.streams?.assessment?.initialized ? '✓ Sẵn sàng' : '✗ Lỗi', ok: geminiStatus.streams?.assessment?.initialized, gradient: 'from-blue-500 to-cyan-600' },
                  { label: 'AI Chatbot', value: geminiStatus.streams?.chatbot?.initialized ? '✓ Sẵn sàng' : '✗ Lỗi', ok: geminiStatus.streams?.chatbot?.initialized, gradient: 'from-purple-500 to-pink-600' },
                  { label: 'AI Phân tích CV', value: geminiStatus.streams?.cv?.initialized ? '✓ Sẵn sàng' : '✗ Lỗi', ok: geminiStatus.streams?.cv?.initialized, gradient: 'from-orange-500 to-red-600' },
                ].map(({ label, value, ok, gradient }) => (
                  <div key={label} className={`relative overflow-hidden rounded-xl p-4 ${ok ? 'bg-gradient-to-br ' + gradient : 'bg-gradient-to-br from-gray-400 to-gray-500'} shadow-lg transition-all duration-300 hover:scale-105`}>
                    <div className="absolute inset-0 bg-white/10"></div>
                    <div className="relative z-10">
                      <p className="text-xs font-semibold text-white/80 mb-1">{label}</p>
                      <p className="text-lg font-bold text-white">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
              {geminiStatus.model && (
                <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="text-sm text-blue-900 dark:text-blue-100">Mô hình: <span className="font-mono font-bold">{geminiStatus.model}</span></span>
                </div>
              )}
              {geminiStatus.error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <p className="text-sm text-red-700 dark:text-red-300 font-mono">{geminiStatus.error}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">Không thể tải trạng thái Gemini.</p>
          )}
        </div>
      </section>

      {/* PERFORMANCE METRICS - Modern Cards */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
          <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
          Chỉ số hiệu suất
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Tổng đề xuất"
            value={metrics.totalRecommendations}
            subtitle={`${metrics.avgRecommendationsPerAssessment.toFixed(1)} mỗi đánh giá`}
          />

          <MetricCard
            title="Phân tích bài luận"
            value={metrics.assessmentsWithEssay}
            subtitle="Đánh giá đã phân tích"
          />

          <MetricCard
            title="Thời gian xử lý TB"
            value={`${metrics.avgProcessingTime}s`}
            subtitle="mỗi đánh giá"
            status={metrics.avgProcessingTime < 30 ? 'good' : 'warning'}
          />

          <MetricCard
            title="Tỷ lệ lỗi"
            value={`${metrics.errorRate}%`}
            subtitle="30 ngày qua"
            status={metrics.errorRate < 5 ? 'good' : metrics.errorRate < 10 ? 'warning' : 'error'}
          />
        </div>

        {/* Additional Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
          <MetricCard
            title="Tổng đánh giá"
            value={metrics.totalAssessments}
            subtitle="Tất cả thời gian"
          />

          <MetricCard
            title="Thao tác thành công"
            value={metrics.successCount}
            subtitle="30 ngày qua"
            status="good"
          />

          <MetricCard
            title="Thao tác lỗi"
            value={metrics.errorCount}
            subtitle="30 ngày qua"
            status={metrics.errorCount === 0 ? 'good' : 'warning'}
          />

          <MetricCard
            title="Đánh giá TB"
            value={metrics.avgFeedbackRating > 0 ? `${metrics.avgFeedbackRating} ` : 'Chưa có'}
            subtitle={`${metrics.totalFeedback} đánh giá`}
            status={metrics.avgFeedbackRating >= 4 ? 'good' : metrics.avgFeedbackRating >= 3 ? 'warning' : 'error'}
          />
        </div>
      </section>

      {/* RIASEC DISTRIBUTION */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Phân bố RIASEC
        </h2>

        <div className={cardClass}>
          <div className="space-y-5">
            {Object.entries(metrics.riasecDistribution).map(([key, value]) => (
              <div key={key}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {translateRIASEC(key)}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{value}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: value }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BIG FIVE DISTRIBUTION */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Phân bố Big Five
        </h2>

        <div className={cardClass}>
          <div className="space-y-5">
            {Object.entries(metrics.bigFiveDistribution).map(([key, value]) => (
              <div key={key}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {translateBigFive(key)}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{value}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full">
                  <div
                    className="bg-indigo-800 h-2 rounded-full"
                    style={{ width: value }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* USER FEEDBACK */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Phản hồi người dùng
        </h2>

        {/* Filters */}
        <div className={`${cardClass} mb-6`}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ngày bắt đầu
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilter("startDate", e.target.value)}
                className={baseInput}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ngày kết thúc
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilter("endDate", e.target.value)}
                className={baseInput}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Đánh giá tối thiểu
              </label>
              <select
                value={filters.minRating}
                onChange={(e) => handleFilter("minRating", e.target.value)}
                className={baseInput}
              >
                <option value="">Tất cả</option>
                <option value="1">1+ Sao</option>
                <option value="2">2+ Sao</option>
                <option value="3">3+ Sao</option>
                <option value="4">4+ Sao</option>
                <option value="5">5 Sao</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={loadFeedback}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Áp dụng bộ lọc
              </button>
            </div>
          </div>
        </div>

        {/* Feedback List */}
        {feedbackLoading ? (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400">
            Đang tải phản hồi...
          </div>
        ) : feedback.length > 0 ? (
          <div className={`${cardClass} overflow-hidden p-0`}>
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className={tableHead}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Người dùng</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Đánh giá</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Bình luận</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Ngày</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-[0F172A]">
                {feedback.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-100 dark:hover:bg-[1E293B]">
                    <td className="px-6 py-4 text-gray-900 dark:text-white">
                      {item.userName}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <span
                            key={i}
                            className={i < item.rating ? "text-yellow-400" : "text-gray-400"}
                          >
                            
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300 max-w-md truncate">
                      {item.comment || '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={`${cardClass} text-center py-10`}>
            <p className="text-gray-600 dark:text-gray-400">Không tìm thấy phản hồi</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Phản hồi sẽ xuất hiện ở đây khi người dùng đánh giá
            </p>
          </div>
        )}
      </section>

      {/* SYSTEM HEALTH */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Sức khỏe hệ thống
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <HealthIndicator
            title="Trạng thái dịch vụ"
            status="operational"
            message="Tất cả hệ thống hoạt động"
          />

          <HealthIndicator
            title="Thời gian phản hồi"
            status={metrics.avgProcessingTime < 30 ? 'good' : 'warning'}
            message={`TB: ${metrics.avgProcessingTime}s (Mục tiêu < 30s)`}
          />

          <HealthIndicator
            title="Tỷ lệ thành công"
            status={metrics.errorRate < 5 ? 'good' : 'warning'}
            message={`${(100 - metrics.errorRate).toFixed(1)}% thành công`}
          />
        </div>
      </section>

      {/* ANOMALY DETECTION */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${anomalyStats && anomalyStats.critical > 0 ? 'bg-red-500 animate-pulse' : anomalyStats && anomalyStats.unresolved > 0 ? 'bg-yellow-500 animate-pulse' : 'bg-indigo-700'}`} />
            Phát hiện bất thường
            {anomalyStats && anomalyStats.unresolved > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full">
                {anomalyStats.unresolved} chưa giải quyết
              </span>
            )}
          </h2>
          <button
            onClick={runDetection}
            disabled={detecting}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors"
          >
            {detecting ? "Đang quét..." : "Chạy phát hiện"}
          </button>
        </div>

        {detectMsg && (
          <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${detectMsg.includes("failed") ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"}`}>
            {detectMsg}
          </div>
        )}

        {/* Stats row */}
        {anomalyStats && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
            {(["total", "unresolved", "critical", "high", "medium", "low"] as const).map((k) => {
              const colorMap = { total: "text-gray-700 dark:text-gray-300", unresolved: "text-orange-600 dark:text-orange-400", critical: "text-red-600 dark:text-red-400", high: "text-red-500 dark:text-red-400", medium: "text-yellow-600 dark:text-yellow-400", low: "text-blue-600 dark:text-blue-400" };
              const labelMap = { total: "Tổng", unresolved: "Chưa giải quyết", critical: "Nghiêm trọng", high: "Cao", medium: "Trung bình", low: "Thấp" };
              return (
                <div key={k} className={`${cardClass} text-center py-3`}>
                  <p className="text-xs text-gray-500">{labelMap[k]}</p>
                  <p className={`text-2xl font-bold ${colorMap[k]}`}>{anomalyStats[k]}</p>
                </div>
              );
            })}
          </div>
        )}

        {anomalyLoading ? (
          <div className="text-center py-8 text-gray-500">Đang tải bất thường...</div>
        ) : anomalies.length === 0 ? (
          <div className={`${cardClass} text-center py-8`}>
            <p className="text-indigo-800 dark:text-indigo-400 font-semibold">Không phát hiện bất thường</p>
            <p className="text-sm text-gray-500 mt-1">Nhấn "Chạy phát hiện" để quét vấn đề trong dữ liệu thực.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {anomalies.map((a) => {
              const severityColors: Record<string, string> = {
                critical: "border-red-500 bg-red-50 dark:bg-red-900/10",
                high: "border-red-400 bg-red-50 dark:bg-red-900/10",
                medium: "border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10",
                low: "border-blue-400 bg-blue-50 dark:bg-blue-900/10",
              };
              const badgeColors: Record<string, string> = {
                critical: "bg-red-600 text-white",
                high: "bg-red-500 text-white",
                medium: "bg-yellow-500 text-white",
                low: "bg-blue-500 text-white",
              };
              return (
                <div key={a.id} className={`border-l-4 rounded-xl p-4 ${severityColors[a.severity] || "border-gray-300 bg-white dark:bg-gray-800"} ${a.resolved ? "opacity-50" : ""}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase ${badgeColors[a.severity] || "bg-gray-400 text-white"}`}>{translateSeverity(a.severity)}</span>
                        <span className="text-xs text-gray-500 font-mono">{translateAnomalyText(a.type)}</span>
                        {a.resolved && <span className="px-2 py-0.5 text-xs bg-indigo-50 text-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-400 rounded">{translateAnomalyText('Resolved')}</span>}
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-white">{translateAnomalyText(a.title)}</p>
                      {a.description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{translateAnomalyText(a.description)}</p>}
                      <p className="text-xs text-gray-400 mt-1">{a.created_at ? new Date(a.created_at).toLocaleString() : ""}</p>
                    </div>
                    {!a.resolved && (
                      <button
                        onClick={() => resolveAnomaly(a.id)}
                        className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold bg-indigo-800 hover:bg-indigo-900 text-white rounded-lg transition-colors"
                      >
                        {translateAnomalyText('Resolve')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

/* ---------------------------------------------
   METRIC CARD
---------------------------------------------- */
interface MetricProps {
  title: string;
  value: string | number;
  subtitle?: string;
  status?: 'good' | 'warning' | 'error';
}

const MetricCard: React.FC<MetricProps> = ({ title, value, subtitle, status }) => {
  const statusConfig = {
    good: {
      gradient: 'from-indigo-700 to-indigo-800',
      icon: '',
      iconBg: 'bg-indigo-700/20',
      iconColor: 'text-indigo-800 dark:text-indigo-400'
    },
    warning: {
      gradient: 'from-yellow-500 to-orange-600',
      icon: '',
      iconBg: 'bg-yellow-500/20',
      iconColor: 'text-yellow-600 dark:text-yellow-400'
    },
    error: {
      gradient: 'from-red-500 to-pink-600',
      icon: '',
      iconBg: 'bg-red-500/20',
      iconColor: 'text-red-600 dark:text-red-400'
    },
  };

  const config = status ? statusConfig[status] : null;

  return (
    <div className="group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
      {config && (
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${config.gradient} opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500`}></div>
      )}

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">{title}</p>
          {config && (
            <div className={`w-8 h-8 rounded-xl ${config.iconBg} flex items-center justify-center ${config.iconColor} font-bold text-lg`}>
              {config.icon}
            </div>
          )}
        </div>
        <p className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          {value}
        </p>
        {subtitle && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

/* ---------------------------------------------
   HEALTH INDICATOR
---------------------------------------------- */
interface HealthProps {
  title: string;
  status: 'operational' | 'good' | 'warning' | 'error';
  message: string;
}

const HealthIndicator: React.FC<HealthProps> = ({ title, status, message }) => {
  const statusColors: Record<string, string> = {
    operational: "bg-indigo-700",
    good: "bg-indigo-700",
    warning: "bg-yellow-500",
    error: "bg-red-500",
  };

  const statusLabels: Record<string, string> = {
    operational: "Hoạt động",
    good: "Tốt",
    warning: "Cảnh báo",
    error: "Lỗi",
  };

  return (
    <div className={cardClass}>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">{title}</h3>
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full ${statusColors[status]} mr-2`} />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {statusLabels[status]}
          </span>
        </div>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
    </div>
  );
};

export default AIMonitoringPage;
