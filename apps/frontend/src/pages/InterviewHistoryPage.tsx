import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Eye, Briefcase, Calendar, TrendingUp, Search, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { interviewService } from '../services/interviewService';
import { toast } from 'react-hot-toast';
import MainLayout from '../components/layout/MainLayout';

interface InterviewSession {
    id: number;
    job_title: string;
    status: 'completed' | 'abandoned' | 'active';
    started_at: string;
    completed_at?: string;
    overall_score?: number;
    recommendation?: 'PASS' | 'CONDITIONAL_PASS' | 'FAIL';
    question_count?: number;
}

const InterviewHistoryPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const hasLoadedRef = useRef(false);

    const [interviews, setInterviews] = useState<InterviewSession[]>([]);
    const [filteredInterviews, setFilteredInterviews] = useState<InterviewSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'date' | 'score' | 'recommendation' | 'questions'>('date');
    const [scoreFilter, setScoreFilter] = useState<string>('all');
    const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(0);
    const [totalInterviews, setTotalInterviews] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const pageSize = 20;

    const loadAllInterviews = useCallback(async () => {
        if (hasLoadedRef.current) return; // Prevent duplicate calls
        hasLoadedRef.current = true;

        try {
            setIsLoading(true);
            console.log('📋 Loading interview history...');
            const response = await interviewService.getMyInterviews(1000);
            setInterviews(response.interviews);
            setTotalInterviews(response.total || response.interviews.length);
            setHasMore(response.has_more || false);
            console.log(`✅ Loaded ${response.interviews.length} interviews`);
        } catch (error) {
            console.error('❌ Error loading interviews:', error);
            toast.error('Không thể tải lịch sử phỏng vấn');
            hasLoadedRef.current = false; // Reset on error to allow retry
        } finally {
            setIsLoading(false);
        }
    }, []); // Empty dependency array

    const filterAndSortInterviews = useCallback(() => {
        let filtered = interviews;

        // Filter by search query
        if (searchQuery.trim()) {
            filtered = filtered.filter(interview =>
                interview.job_title.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Filter by status
        if (statusFilter !== 'all') {
            filtered = filtered.filter(interview => interview.status === statusFilter);
        }

        // Filter by score range
        if (scoreFilter !== 'all') {
            filtered = filtered.filter(interview => {
                if (!interview.overall_score) return scoreFilter === 'no-score';

                switch (scoreFilter) {
                    case 'excellent': // 8.5-10
                        return interview.overall_score >= 8.5;
                    case 'good': // 7-8.4
                        return interview.overall_score >= 7 && interview.overall_score < 8.5;
                    case 'average': // 5-6.9
                        return interview.overall_score >= 5 && interview.overall_score < 7;
                    case 'poor': // 0-4.9
                        return interview.overall_score < 5;
                    case 'no-score': // No score
                        return false;
                    default:
                        return true;
                }
            });
        }

        // Filter by date range
        if (dateRangeFilter !== 'all') {
            const now = new Date();
            const filterDate = new Date();

            switch (dateRangeFilter) {
                case 'today':
                    filterDate.setHours(0, 0, 0, 0);
                    filtered = filtered.filter(interview =>
                        new Date(interview.started_at) >= filterDate
                    );
                    break;
                case 'week':
                    filterDate.setDate(now.getDate() - 7);
                    filtered = filtered.filter(interview =>
                        new Date(interview.started_at) >= filterDate
                    );
                    break;
                case 'month':
                    filterDate.setMonth(now.getMonth() - 1);
                    filtered = filtered.filter(interview =>
                        new Date(interview.started_at) >= filterDate
                    );
                    break;
                case 'quarter':
                    filterDate.setMonth(now.getMonth() - 3);
                    filtered = filtered.filter(interview =>
                        new Date(interview.started_at) >= filterDate
                    );
                    break;
                case 'year':
                    filterDate.setFullYear(now.getFullYear() - 1);
                    filtered = filtered.filter(interview =>
                        new Date(interview.started_at) >= filterDate
                    );
                    break;
            }
        }

        // Sort
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'date':
                    return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
                case 'score':
                    return (b.overall_score || 0) - (a.overall_score || 0);
                case 'recommendation':
                    const recOrder = { 'PASS': 3, 'CONDITIONAL_PASS': 2, 'FAIL': 1 };
                    const aRec = recOrder[a.recommendation as keyof typeof recOrder] || 0;
                    const bRec = recOrder[b.recommendation as keyof typeof recOrder] || 0;
                    return bRec - aRec;
                case 'questions':
                    return (b.question_count || 0) - (a.question_count || 0);
                default:
                    return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
            }
        });

        setFilteredInterviews(filtered);
    }, [interviews, searchQuery, statusFilter, sortBy, scoreFilter, dateRangeFilter]);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        // Only load once when component mounts
        loadAllInterviews();
    }, [user, navigate, loadAllInterviews]);

    useEffect(() => {
        filterAndSortInterviews();
    }, [filterAndSortInterviews]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':  return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
            case 'active':     return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
            case 'abandoned':  return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600';
            case 'terminated': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
            default:           return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'completed':  return 'Hoàn thành';
            case 'active':     return 'Đang diễn ra';
            case 'abandoned':  return 'Đã hủy';
            case 'terminated': return 'Đã thoát';
            default:           return 'Không xác định';
        }
    };

    const getRecommendationColor = (recommendation?: string) => {
        switch (recommendation) {
            case 'PASS':             return 'text-green-700 dark:text-green-400';
            case 'CONDITIONAL_PASS': return 'text-amber-600 dark:text-amber-400';
            case 'FAIL':             return 'text-red-600 dark:text-red-400';
            default:                 return 'text-gray-500 dark:text-gray-400';
        }
    };

    const getRecommendationLabel = (recommendation?: string) => {
        switch (recommendation) {
            case 'PASS':
                return 'Đạt';
            case 'CONDITIONAL_PASS':
                return 'Có điều kiện';
            case 'FAIL':
                return 'Không đạt';
            default:
                return 'Chưa có';
        }
    };

    if (isLoading) {
        return (
            <MainLayout>
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Đang tải lịch sử phỏng vấn...</p>
                    </div>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="min-h-screen relative overflow-hidden font-['Plus_Jakarta_Sans'] bg-gray-50/50 dark:bg-gray-900/50">
                
                <div className="absolute inset-0 bg-dot-pattern pointer-events-none z-0 opacity-60" />
                <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-indigo-400/10 rounded-full blur-[120px] pointer-events-none z-0" />
                <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-purple-400/10 rounded-full blur-[120px] pointer-events-none z-0" />

                <div className="py-8 relative z-10">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => navigate('/interview')}
                                    className="flex items-center gap-2 px-4 py-2 glass bg-white/60 dark:bg-gray-800/40 border border-gray-200/50 dark:border-white/10 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-white/80 dark:hover:bg-gray-700/60 transition-colors shadow-sm text-sm font-medium"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    <span>Quay lại</span>
                                </button>
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                                        Lịch sử phỏng vấn
                                    </h1>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
                                        Xem lại tất cả các buổi phỏng vấn AI của bạn
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{totalInterviews}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">Tổng phỏng vấn</div>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="glass bg-white/60 dark:bg-gray-800/40 rounded-3xl shadow-xl border border-gray-200/50 dark:border-white/10 p-5 mb-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                {/* Search */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Tìm kiếm nghề nghiệp
                                    </label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Nhập tên nghề nghiệp..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 glass bg-white/50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Status Filter */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Trạng thái
                                    </label>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="w-full px-4 py-2.5 glass bg-white/50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white text-sm"
                                    >
                                        <option value="all">Tất cả trạng thái</option>
                                        <option value="completed">Hoàn thành</option>
                                        <option value="abandoned">Đã hủy</option>
                                    </select>
                                </div>

                                {/* Score Filter */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Mức điểm
                                    </label>
                                    <select
                                        value={scoreFilter}
                                        onChange={(e) => setScoreFilter(e.target.value)}
                                        className="w-full px-4 py-2.5 glass bg-white/50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white text-sm"
                                    >
                                        <option value="all">Tất cả điểm</option>
                                        <option value="excellent">Xuất sắc (8.5-10)</option>
                                        <option value="good">Tốt (7-8.4)</option>
                                        <option value="average">Trung bình (5-6.9)</option>
                                        <option value="poor">Cần cải thiện (&lt;5)</option>
                                        <option value="no-score">Chưa có điểm</option>
                                    </select>
                                </div>

                                {/* Date Range Filter */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Thời gian
                                    </label>
                                    <select
                                        value={dateRangeFilter}
                                        onChange={(e) => setDateRangeFilter(e.target.value)}
                                        className="w-full px-4 py-2.5 glass bg-white/50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white text-sm"
                                    >
                                        <option value="all">Tất cả thời gian</option>
                                        <option value="today">Hôm nay</option>
                                        <option value="week">7 ngày qua</option>
                                        <option value="month">1 tháng qua</option>
                                        <option value="quarter">3 tháng qua</option>
                                        <option value="year">1 năm qua</option>
                                    </select>
                                </div>

                                {/* Sort */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Sắp xếp theo
                                    </label>
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value as 'date' | 'score' | 'recommendation' | 'questions')}
                                        className="w-full px-4 py-2.5 glass bg-white/50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white text-sm"
                                    >
                                        <option value="date">Ngày phỏng vấn</option>
                                        <option value="score">Điểm số</option>
                                        <option value="recommendation">Kết quả</option>
                                        <option value="questions">Số câu hỏi</option>
                                    </select>
                                </div>
                            </div>

                            {/* Filter Summary */}
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                <span className="text-sm text-gray-600">Bộ lọc đang áp dụng:</span>
                                {statusFilter !== 'all' && (
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusFilter === 'abandoned' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                        Trạng thái: {statusFilter === 'completed' ? 'Hoàn thành' : 'Đã hủy'}
                                    </span>
                                )}
                                {scoreFilter !== 'all' && (
                                    <span className="px-3 py-1 bg-indigo-50 text-indigo-950 rounded-full text-xs font-medium">
                                        Điểm: {scoreFilter === 'excellent' ? 'Xuất sắc' : scoreFilter === 'good' ? 'Tốt' : scoreFilter === 'average' ? 'Trung bình' : scoreFilter === 'poor' ? 'Cần cải thiện' : 'Chưa có điểm'}
                                    </span>
                                )}
                                {dateRangeFilter !== 'all' && (
                                    <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                                        Thời gian: {dateRangeFilter === 'today' ? 'Hôm nay' : dateRangeFilter === 'week' ? '7 ngày qua' : dateRangeFilter === 'month' ? '1 tháng qua' : dateRangeFilter === 'quarter' ? '3 tháng qua' : '1 năm qua'}
                                    </span>
                                )}
                                {searchQuery && (
                                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                                        Tìm kiếm: "{searchQuery}"
                                    </span>
                                )}
                                {(statusFilter !== 'all' || scoreFilter !== 'all' || dateRangeFilter !== 'all' || searchQuery) && (
                                    <button
                                        onClick={() => {
                                            setStatusFilter('all');
                                            setScoreFilter('all');
                                            setDateRangeFilter('all');
                                            setSearchQuery('');
                                        }}
                                        className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium hover:bg-red-200 transition-colors"
                                    >
                                        Xóa tất cả
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Interview List */}
                        <div className="glass bg-white/60 dark:bg-gray-800/40 rounded-3xl shadow-xl border border-gray-200/50 dark:border-white/10 overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-900/20 dark:to-purple-900/20 px-6 py-5 border-b border-gray-200/50 dark:border-white/5">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                                    <Users className="h-5 w-5 mr-3 text-blue-600 dark:text-blue-400" />
                                    {filteredInterviews.length} phỏng vấn
                                </h2>
                            </div>

                            <div className="divide-y divide-gray-200/50 dark:divide-white/5">
                                {filteredInterviews.length === 0 ? (
                                    <div className="text-center py-12">
                                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Users className="h-10 w-10 text-gray-400" />
                                        </div>
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                                            {searchQuery || statusFilter !== 'all' ? 'Không tìm thấy kết quả' : 'Chưa có phỏng vấn nào'}
                                        </h3>
                                        <p className="text-gray-500 mb-4">
                                            {searchQuery || statusFilter !== 'all'
                                                ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm'
                                                : 'Bắt đầu phỏng vấn đầu tiên để xem lịch sử tại đây'
                                            }
                                        </p>
                                        <button
                                            onClick={() => navigate('/interview')}
                                            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-500/20"
                                        >
                                            Bắt đầu phỏng vấn
                                        </button>
                                    </div>
                                ) : (
                                    <motion.div
                                        initial="hidden"
                                        animate="visible"
                                        variants={{
                                            hidden: { opacity: 0 },
                                            visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
                                        }}
                                        className="divide-y divide-gray-200/50 dark:divide-white/5"
                                    >
                                    {filteredInterviews.map((interview) => (
                                        <motion.div
                                            variants={{
                                                hidden: { opacity: 0, x: -20 },
                                                visible: { opacity: 1, x: 0 }
                                            }}
                                            key={interview.id}
                                            className="p-6 hover:bg-white/80 dark:hover:bg-gray-700/40 transition-colors cursor-pointer group"
                                            onClick={() => navigate(`/interview/results/${interview.id}`)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-4 mb-3">
                                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                            {interview.job_title}
                                                        </h3>
                                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(interview.status)}`}>
                                                            {getStatusLabel(interview.status)}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
                                                        <div className="flex items-center space-x-2">
                                                            <Calendar className="h-4 w-4" />
                                                            <span>{formatDate(interview.started_at)}</span>
                                                        </div>

                                                        {interview.question_count && (
                                                            <div className="flex items-center space-x-2">
                                                                <Briefcase className="h-4 w-4" />
                                                                <span>{interview.question_count} câu hỏi</span>
                                                            </div>
                                                        )}

                                                        {interview.overall_score && (
                                                            <div className="flex items-center space-x-2">
                                                                <TrendingUp className="h-4 w-4" />
                                                                <span className="font-medium">
                                                                    {interview.overall_score.toFixed(1)}/10
                                                                </span>
                                                            </div>
                                                        )}

                                                        {interview.recommendation && (
                                                            <div className={`font-medium ${getRecommendationColor(interview.recommendation)}`}>
                                                                {getRecommendationLabel(interview.recommendation)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center space-x-3">
                                                    {interview.overall_score && (
                                                        <div className="text-right">
                                                            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                                                                {interview.overall_score.toFixed(1)}
                                                            </div>
                                                            <div className="text-xs text-gray-500">điểm</div>
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col gap-1.5">
                                                        <Eye className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); navigate(`/interview/conversation/${interview.id}`); }}
                                                            className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 whitespace-nowrap flex items-center gap-0.5"
                                                            title="Xem lịch sử trò chuyện">
                                                            <MessageSquare size={11} /> Chat
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                    </motion.div>
                                )}
                            </div>
                        </div>

                        {/* Pagination Controls */}
                        {totalInterviews > pageSize && (
                            <div className="glass bg-white/60 dark:bg-gray-800/40 rounded-3xl shadow-xl border border-gray-200/50 dark:border-white/10 p-6 mt-6">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                                        Hiển thị {currentPage * pageSize + 1} - {Math.min((currentPage + 1) * pageSize, totalInterviews)} trong tổng số {totalInterviews} phỏng vấn
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                                            disabled={currentPage === 0}
                                            className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 glass bg-white/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-white/80 dark:hover:bg-gray-700/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                                        >
                                            Trang trước
                                        </button>
                                        <span className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 glass bg-white/40 dark:bg-gray-800/40 border border-gray-200/50 dark:border-white/10 rounded-xl">
                                            Trang {currentPage + 1} / {Math.ceil(totalInterviews / pageSize)}
                                        </span>
                                        <button
                                            onClick={() => setCurrentPage(prev => prev + 1)}
                                            disabled={!hasMore}
                                            className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 glass bg-white/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-white/80 dark:hover:bg-gray-700/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                                        >
                                            Trang sau
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default InterviewHistoryPage;