import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Eye, Briefcase, Calendar, TrendingUp, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { interviewService } from '../services/interviewService';
import { toast } from 'react-hot-toast';

interface InterviewSession {
    id: number;
    job_title: string;
    status: 'active' | 'completed' | 'abandoned';
    started_at: string;
    completed_at?: string;
    overall_score?: number;
    recommendation?: 'PASS' | 'CONDITIONAL_PASS' | 'FAIL';
    question_count?: number;
}

const InterviewHistoryPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const hasLoadedRef = useRef(false); // Prevent duplicate loads

    const [interviews, setInterviews] = useState<InterviewSession[]>([]);
    const [filteredInterviews, setFilteredInterviews] = useState<InterviewSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'date' | 'score'>('date');

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        // Only load once when component mounts
        loadAllInterviews();
    }, [user, navigate]); // Remove loadAllInterviews from dependencies

    useEffect(() => {
        filterAndSortInterviews();
    }, [interviews, searchQuery, statusFilter, sortBy]);

    const loadAllInterviews = useCallback(async () => {
        if (hasLoadedRef.current) return; // Prevent duplicate calls
        hasLoadedRef.current = true;

        try {
            setIsLoading(true);
            console.log('🔄 Loading interview history...');
            const response = await interviewService.getMyInterviews(1000);
            setInterviews(response.interviews);
            console.log(`✅ Loaded ${response.interviews.length} interviews`);
        } catch (error) {
            console.error('❌ Error loading interviews:', error);
            toast.error('Không thể tải lịch sử phỏng vấn');
            hasLoadedRef.current = false; // Reset on error to allow retry
        } finally {
            setIsLoading(false);
        }
    }, []); // Empty dependency array

    const filterAndSortInterviews = () => {
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

        // Sort
        filtered.sort((a, b) => {
            if (sortBy === 'date') {
                return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
            } else {
                return (b.overall_score || 0) - (a.overall_score || 0);
            }
        });

        setFilteredInterviews(filtered);
    };

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
            case 'completed':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'active':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'abandoned':
                return 'bg-gray-100 text-gray-800 border-gray-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'completed':
                return 'Hoàn thành';
            case 'active':
                return 'Đang diễn ra';
            case 'abandoned':
                return 'Đã hủy';
            default:
                return 'Không xác định';
        }
    };

    const getRecommendationColor = (recommendation?: string) => {
        switch (recommendation) {
            case 'PASS':
                return 'text-green-600';
            case 'CONDITIONAL_PASS':
                return 'text-yellow-600';
            case 'FAIL':
                return 'text-red-600';
            default:
                return 'text-gray-600';
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
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Đang tải lịch sử phỏng vấn...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
            <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none"></div>

            <div className="relative z-10 py-8">
                <div className="max-w-6xl mx-auto px-4">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center space-x-6">
                            <button
                                onClick={() => navigate('/interview')}
                                className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                <span>Quay lại</span>
                            </button>
                            <div>
                                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                                    Lịch sử phỏng vấn
                                </h1>
                                <p className="text-gray-600">
                                    Xem lại tất cả các buổi phỏng vấn AI của bạn
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-blue-600">{interviews.length}</div>
                            <div className="text-sm text-gray-500">Tổng phỏng vấn</div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Search */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-2">
                                    Tìm kiếm nghề nghiệp
                                </label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Nhập tên nghề nghiệp..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            {/* Status Filter */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-2">
                                    Trạng thái
                                </label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="all">Tất cả</option>
                                    <option value="completed">Hoàn thành</option>
                                    <option value="active">Đang diễn ra</option>
                                    <option value="abandoned">Đã hủy</option>
                                </select>
                            </div>

                            {/* Sort */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-2">
                                    Sắp xếp theo
                                </label>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as 'date' | 'score')}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="date">Ngày phỏng vấn</option>
                                    <option value="score">Điểm số</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Interview List */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-5 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center">
                                <Users className="h-5 w-5 mr-3 text-blue-600" />
                                {filteredInterviews.length} phỏng vấn
                            </h2>
                        </div>

                        <div className="divide-y divide-gray-200">
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
                                        className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                                    >
                                        Bắt đầu phỏng vấn
                                    </button>
                                </div>
                            ) : (
                                filteredInterviews.map((interview) => (
                                    <div
                                        key={interview.id}
                                        className="p-6 hover:bg-gray-50 transition-colors cursor-pointer group"
                                        onClick={() => navigate(`/interview/results/${interview.id}`)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-4 mb-3">
                                                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                                        {interview.job_title}
                                                    </h3>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(interview.status)}`}>
                                                        {getStatusLabel(interview.status)}
                                                    </span>
                                                </div>

                                                <div className="flex items-center space-x-6 text-sm text-gray-600">
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
                                                        <div className="text-2xl font-bold text-blue-600">
                                                            {interview.overall_score.toFixed(1)}
                                                        </div>
                                                        <div className="text-xs text-gray-500">điểm</div>
                                                    </div>
                                                )}
                                                <Eye className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InterviewHistoryPage;