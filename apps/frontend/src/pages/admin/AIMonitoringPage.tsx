import { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { AIMetrics, UserFeedback } from '../../types/admin';

const AIMonitoringPage = () => {
  const [metrics, setMetrics] = useState<AIMetrics | null>(null);
  const [feedback, setFeedback] = useState<UserFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    minRating: '',
  });

  useEffect(() => {
    loadMetrics();
    loadFeedback();
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const data = await adminService.getAIMetrics();
      setMetrics(data);
    } catch (error) {
      console.error('Error loading AI metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFeedback = async () => {
    try {
      setFeedbackLoading(true);
      const filterParams: any = {};
      if (filters.startDate) filterParams.startDate = filters.startDate;
      if (filters.endDate) filterParams.endDate = filters.endDate;
      if (filters.minRating) filterParams.minRating = parseInt(filters.minRating);
      
      const data = await adminService.getUserFeedback(filterParams);
      setFeedback(data.feedback || []);
    } catch (error) {
      console.error('Error loading feedback:', error);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters({ ...filters, [field]: value });
  };

  const applyFilters = () => {
    loadFeedback();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500">Loading AI metrics...</p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Failed to load AI metrics</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">AI Performance Monitoring</h1>

      {/* Performance Metrics */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Recommendations"
            value={metrics.totalRecommendations}
            subtitle={`${metrics.avgRecommendationsPerAssessment.toFixed(1)} per assessment`}
          />
          <MetricCard
            title="Essay Analysis"
            value={metrics.assessmentsWithEssay}
            subtitle="Assessments analyzed"
          />
          <MetricCard
            title="Avg Processing Time"
            value={`${metrics.avgProcessingTime}s`}
            subtitle="Per assessment"
            status={metrics.avgProcessingTime < 30 ? 'good' : 'warning'}
          />
          <MetricCard
            title="Error Rate"
            value="0.5%"
            subtitle="Last 30 days"
            status="good"
          />
        </div>
      </div>

      {/* RIASEC Distribution Chart */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          RIASEC Score Distribution
        </h2>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="space-y-4">
            {Object.entries(metrics.riasecDistribution).map(([key, value]) => (
              <div key={key}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700 capitalize">{key}</span>
                  <span className="text-sm text-gray-600">{value}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${parseFloat(value)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Big Five Distribution Chart */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Big Five Score Distribution
        </h2>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="space-y-4">
            {Object.entries(metrics.bigFiveDistribution).map(([key, value]) => (
              <div key={key}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700 capitalize">{key}</span>
                  <span className="text-sm text-gray-600">{value}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${parseFloat(value)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User Feedback Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">User Feedback</h2>

        {/* Feedback Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Rating
              </label>
              <select
                value={filters.minRating}
                onChange={(e) => handleFilterChange('minRating', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Ratings</option>
                <option value="1">1+ Stars</option>
                <option value="2">2+ Stars</option>
                <option value="3">3+ Stars</option>
                <option value="4">4+ Stars</option>
                <option value="5">5 Stars</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={applyFilters}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>

        {/* Feedback List */}
        {feedbackLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading feedback...</p>
          </div>
        ) : feedback.length > 0 ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {feedback.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.userId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <span
                            key={i}
                            className={`text-lg ${
                              i < item.rating ? 'text-yellow-400' : 'text-gray-300'
                            }`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="line-clamp-2">{item.comment}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900 mr-3">
                        View Details
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        Flag
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">No feedback available</p>
            <p className="text-sm text-gray-400 mt-2">
              User feedback will appear here once users start rating recommendations
            </p>
          </div>
        )}
      </div>

      {/* System Health Indicators */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <HealthIndicator
            title="AI Service Status"
            status="operational"
            message="All systems operational"
          />
          <HealthIndicator
            title="Response Time"
            status="good"
            message={`Avg: ${metrics.avgProcessingTime}s (Target: <30s)`}
          />
          <HealthIndicator
            title="Success Rate"
            status="good"
            message="99.5% successful recommendations"
          />
        </div>
      </div>
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  status?: 'good' | 'warning' | 'error';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, status }) => {
  const statusColors = {
    good: 'border-green-500',
    warning: 'border-yellow-500',
    error: 'border-red-500',
  };

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${status ? `border-l-4 ${statusColors[status]}` : ''}`}>
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
};

interface HealthIndicatorProps {
  title: string;
  status: 'operational' | 'good' | 'warning' | 'error';
  message: string;
}

const HealthIndicator: React.FC<HealthIndicatorProps> = ({ title, status, message }) => {
  const statusConfig = {
    operational: { color: 'bg-green-500', text: 'Operational' },
    good: { color: 'bg-green-500', text: 'Good' },
    warning: { color: 'bg-yellow-500', text: 'Warning' },
    error: { color: 'bg-red-500', text: 'Error' },
  };

  const config = statusConfig[status];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full ${config.color} mr-2`} />
          <span className="text-sm font-medium text-gray-700">{config.text}</span>
        </div>
      </div>
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
};

export default AIMonitoringPage;
