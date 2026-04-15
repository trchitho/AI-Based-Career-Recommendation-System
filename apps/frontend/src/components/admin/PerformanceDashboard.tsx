/**
 * Performance monitoring dashboard for admin users
 */
import React, { useState } from 'react';
import { usePerformanceMonitoring } from '../../hooks/usePerformanceMonitoring';

interface MetricCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    status?: 'good' | 'warning' | 'error';
    icon?: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, status = 'good', icon }) => {
    const statusColors = {
        good: 'bg-green-50 border-green-200 text-green-800',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        error: 'bg-red-50 border-red-200 text-red-800'
    };

    return (
        <div className={`p-4 rounded-lg border-2 ${statusColors[status]}`}>
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-medium">{title}</h3>
                    <p className="text-2xl font-bold mt-1">{value}</p>
                    {subtitle && <p className="text-xs mt-1 opacity-75">{subtitle}</p>}
                </div>
                {icon && <div className="text-2xl opacity-50">{icon}</div>}
            </div>
        </div>
    );
};

const PerformanceDashboard: React.FC = () => {
    const { metrics, health, loading, error, systemStatus, performanceScore, refresh } = usePerformanceMonitoring();
    const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'database' | 'cache' | 'errors'>('overview');

    if (loading && !metrics) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2">Loading performance metrics...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-red-800 font-medium">Error Loading Metrics</h3>
                <p className="text-red-600 text-sm mt-1">{error}</p>
                <button
                    onClick={refresh}
                    className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                >
                    Retry
                </button>
            </div>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'healthy': return 'text-green-600';
            case 'degraded': return 'text-yellow-600';
            case 'unhealthy': return 'text-red-600';
            default: return 'text-gray-600';
        }
    };

    const tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'performance', label: 'Performance' },
        { id: 'database', label: 'Database' },
        { id: 'cache', label: 'Cache' },
        { id: 'errors', label: 'Errors' }
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Performance Dashboard</h1>
                    <p className="text-gray-600">System performance and health monitoring</p>
                </div>
                <div className="flex items-center space-x-4">
                    <div className={`flex items-center space-x-2 ${getStatusColor(systemStatus)}`}>
                        <div className={`w-3 h-3 rounded-full ${systemStatus === 'healthy' ? 'bg-green-500' :
                                systemStatus === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                            }`}></div>
                        <span className="font-medium capitalize">{systemStatus}</span>
                    </div>
                    <button
                        onClick={refresh}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {/* Performance Score */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-medium opacity-90">Performance Score</h2>
                        <div className="flex items-baseline space-x-2">
                            <span className="text-4xl font-bold">{performanceScore}</span>
                            <span className="text-lg opacity-75">/100</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm opacity-75">Last updated</p>
                        <p className="text-sm">{metrics ? new Date(metrics.timestamp * 1000).toLocaleTimeString() : 'N/A'}</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="space-y-6">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <MetricCard
                            title="Total Requests"
                            value={metrics?.performance.total_requests || 0}
                            icon="📊"
                        />
                        <MetricCard
                            title="Error Rate"
                            value={`${((metrics?.performance.total_errors || 0) / (metrics?.performance.total_requests || 1) * 100).toFixed(2)}%`}
                            status={((metrics?.performance.total_errors || 0) / (metrics?.performance.total_requests || 1) * 100) > 5 ? 'error' : 'good'}
                            icon="⚠️"
                        />
                        <MetricCard
                            title="Cache Hit Rate"
                            value={`${metrics?.cache.hit_rate || 0}%`}
                            status={(metrics?.cache.hit_rate || 0) < 70 ? 'warning' : 'good'}
                            icon="💾"
                        />
                        <MetricCard
                            title="DB Queries"
                            value={metrics?.database.total_queries || 0}
                            subtitle={`Avg: ${metrics?.database.average_time || 0}ms`}
                            icon="🗄️"
                        />
                    </div>
                )}

                {activeTab === 'performance' && metrics && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">API Performance</h3>
                        <div className="bg-white rounded-lg border overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Route</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requests</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Time</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Error Rate</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {Object.entries(metrics.performance.routes).map(([route, stats]) => (
                                        <tr key={route}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{route}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stats.request_count}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stats.avg_response_time.toFixed(3)}s</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${stats.error_rate > 5 ? 'bg-red-100 text-red-800' :
                                                        stats.error_rate > 1 ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-green-100 text-green-800'
                                                    }`}>
                                                    {stats.error_rate.toFixed(2)}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'database' && metrics && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Database Metrics</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <MetricCard
                                    title="Total Queries"
                                    value={metrics.database.total_queries}
                                    icon="🔍"
                                />
                                <MetricCard
                                    title="Avg Query Time"
                                    value={`${metrics.database.average_time}ms`}
                                    status={metrics.database.average_time > 100 ? 'warning' : 'good'}
                                    icon="⏱️"
                                />
                                <MetricCard
                                    title="Slow Queries"
                                    value={metrics.database.slow_queries_count}
                                    status={metrics.database.slow_queries_count > 10 ? 'error' : 'good'}
                                    icon="🐌"
                                />
                                <MetricCard
                                    title="DB Error Rate"
                                    value={`${metrics.database.error_rate}%`}
                                    status={metrics.database.error_rate > 1 ? 'error' : 'good'}
                                    icon="❌"
                                />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-medium mb-4">Query Types</h3>
                            <div className="space-y-2">
                                {Object.entries(metrics.database.query_types).map(([type, count]) => (
                                    <div key={type} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                        <span className="font-medium">{type}</span>
                                        <span className="text-gray-600">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'cache' && metrics && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Cache Performance</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <MetricCard
                                    title="Cache Status"
                                    value={metrics.cache.available ? 'Available' : 'Unavailable'}
                                    status={metrics.cache.available ? 'good' : 'error'}
                                    icon="💾"
                                />
                                <MetricCard
                                    title="Hit Rate"
                                    value={`${metrics.cache.hit_rate}%`}
                                    status={metrics.cache.hit_rate < 70 ? 'warning' : 'good'}
                                    icon="🎯"
                                />
                                <MetricCard
                                    title="Total Requests"
                                    value={metrics.cache.total_requests}
                                    icon="📊"
                                />
                                <MetricCard
                                    title="Cache Misses"
                                    value={metrics.cache.misses}
                                    icon="❌"
                                />
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-lg border">
                            <h4 className="font-medium mb-4">Cache Statistics</h4>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span>Hits:</span>
                                    <span className="font-medium text-green-600">{metrics.cache.hits}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Misses:</span>
                                    <span className="font-medium text-red-600">{metrics.cache.misses}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Total:</span>
                                    <span className="font-medium">{metrics.cache.total_requests}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'errors' && metrics && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <MetricCard
                                title="Total Errors"
                                value={metrics.errors.total_errors}
                                status={metrics.errors.total_errors > 50 ? 'error' : 'good'}
                                icon="🚨"
                            />
                            <MetricCard
                                title="Critical Errors"
                                value={metrics.errors.critical_errors}
                                status={metrics.errors.critical_errors > 0 ? 'error' : 'good'}
                                icon="💥"
                            />
                            <MetricCard
                                title="Sentry Status"
                                value={metrics.errors.sentry_enabled ? 'Enabled' : 'Disabled'}
                                status={metrics.errors.sentry_enabled ? 'good' : 'warning'}
                                icon="📡"
                            />
                        </div>

                        <div>
                            <h3 className="text-lg font-medium mb-4">Error Types</h3>
                            <div className="bg-white rounded-lg border overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Error Type</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {Object.entries(metrics.errors.error_types).map(([type, count]) => (
                                            <tr key={type}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{type}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{count}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PerformanceDashboard;