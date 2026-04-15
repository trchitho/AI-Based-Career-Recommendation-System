import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Play, Loader2, Briefcase, Clock, Users, Eye, Star, TrendingUp, Award, Target, Zap, ChevronRight, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { interviewService } from '../services/interviewService';
import { useDebounce } from '../hooks/useDebounce';
import MainLayout from '../components/layout/MainLayout';

interface Job {
    id: string;
    title: string;
    description_vi?: string;
}

interface InterviewSession {
    id: number;
    job_title: string;
    status: 'active' | 'completed' | 'abandoned';
    started_at: string;
    completed_at?: string;
    overall_score?: number;
    recommendation?: 'PASS' | 'CONDITIONAL_PASS' | 'FAIL';
}

interface InterviewStats {
    total_interviews: number;
    completed_interviews: number;
    average_score: number;
}

const InterviewListPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const hasLoadedRef = useRef(false); // Prevent duplicate loads

    const [jobs, setJobs] = useState<Job[]>([]);
    const [recentInterviews, setRecentInterviews] = useState<InterviewSession[]>([]);
    const [allInterviews, setAllInterviews] = useState<InterviewSession[]>([]);
    const [interviewStats, setInterviewStats] = useState<InterviewStats>({
        total_interviews: 0,
        completed_interviews: 0,
        average_score: 0
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [showAllInterviews, setShowAllInterviews] = useState(false);
    const [isLoadingAllInterviews, setIsLoadingAllInterviews] = useState(false);

    // Debounce search query to avoid too many API calls
    const debouncedSearchQuery = useDebounce(searchQuery, 300);

    // Load initial data - ONLY ONCE with ref guard
    const loadInitialData = useCallback(async () => {
        if (hasLoadedRef.current) return; // Prevent duplicate calls
        hasLoadedRef.current = true;

        try {
            setIsLoading(true);
            console.log('🔄 Loading initial interview data...');

            // Load truly random jobs from all 959 careers and recent interviews + stats in parallel
            const [jobsResponse, interviewsResponse, allInterviewsResponse] = await Promise.all([
                interviewService.searchJobs('', 50, true), // Use random=true for truly random selection from 959 careers
                interviewService.getMyInterviews(5),   // Load 5 recent interviews
                interviewService.getMyInterviews(1000) // Load all interviews for accurate stats
            ]);

            // Truly randomize jobs from the larger pool - select random 12 from 50 random jobs
            const shuffledJobs = jobsResponse.jobs.sort(() => Math.random() - 0.5);
            setJobs(shuffledJobs.slice(0, 12));
            setRecentInterviews(interviewsResponse.interviews);

            // Calculate ACCURATE stats from all interviews
            const allInterviewsData = allInterviewsResponse.interviews;
            const completedInterviews = allInterviewsData.filter(i => i.status === 'completed');
            const scoresSum = completedInterviews.reduce((sum, i) => sum + (i.overall_score || 0), 0);

            setInterviewStats({
                total_interviews: allInterviewsData.length,
                completed_interviews: completedInterviews.length,
                average_score: completedInterviews.length > 0 ? scoresSum / completedInterviews.length : 0
            });

            console.log('✅ Initial interview data loaded successfully');
        } catch (error) {
            console.error('❌ Error loading initial data:', error);
            hasLoadedRef.current = false; // Reset on error to allow retry
        } finally {
            setIsLoading(false);
        }
    }, []); // Empty dependency array to prevent re-creation

    // Load all interviews for "View More" functionality
    const loadAllInterviews = useCallback(async () => {
        try {
            setIsLoadingAllInterviews(true);
            const response = await interviewService.getMyInterviews(1000); // Load all interviews
            setAllInterviews(response.interviews);
            setShowAllInterviews(true);
        } catch (error) {
            console.error('Error loading all interviews:', error);
        } finally {
            setIsLoadingAllInterviews(false);
        }
    }, []);

    // Handle search with debounce - STABLE reference
    const handleSearch = useCallback(async (query: string) => {
        if (query.trim().length < 2) {
            // If query is too short, load truly random jobs from all 959 careers
            try {
                console.log('🔍 Loading random jobs for empty search...');
                const response = await interviewService.searchJobs('', 50, true); // Use random=true for full randomization
                const shuffledJobs = response.jobs.sort(() => Math.random() - 0.5);
                setJobs(shuffledJobs.slice(0, 12));
            } catch (error) {
                console.error('❌ Error loading random jobs:', error);
            }
            return;
        }

        try {
            setIsSearching(true);
            console.log(`🔍 Searching jobs with query: "${query}"`);
            const response = await interviewService.searchJobs(query, 50); // Search with query
            setJobs(response.jobs);
            console.log(`✅ Found ${response.jobs.length} jobs for query: "${query}"`);
        } catch (error) {
            console.error('❌ Error searching jobs:', error);
        } finally {
            setIsSearching(false);
        }
    }, []); // Empty dependency array

    // Handle search input change
    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    }, []);

    // Format date for display
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Get status color for interview status
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'active':
                return 'bg-blue-100 text-blue-800';
            case 'abandoned':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    // Get status label in Vietnamese
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

    // Check authentication and load data ONLY ONCE
    useEffect(() => {
        if (!user) {
            navigate('/login', {
                state: {
                    from: '/interview',
                    message: 'Vui lòng đăng nhập để sử dụng tính năng phỏng vấn AI'
                }
            });
            return;
        }

        // Only load data once when component mounts and user is available
        loadInitialData();
    }, [user, navigate, loadInitialData]); // Include loadInitialData but it's stable due to empty deps

    // Effect for debounced search - ONLY when search query actually changes
    useEffect(() => {
        console.log(`🔍 Search query changed to: "${debouncedSearchQuery}"`);
        handleSearch(debouncedSearchQuery);
    }, [debouncedSearchQuery, handleSearch]); // Include handleSearch but it's stable due to empty deps

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                    <p className="text-gray-600">Đang tải danh sách nghề nghiệp...</p>
                </div>
            </div>
        );
    }

    return (
        <MainLayout>
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-6xl mx-auto px-4">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-6">
                            <Users className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-4">
                            Phỏng vấn AI thông minh
                        </h1>
                        <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
                            Luyện tập phỏng vấn với AI thông minh, nhận phản hồi chi tiết và cải thiện kỹ năng của bạn.
                            Chọn nghề nghiệp bạn quan tâm và bắt đầu hành trình phát triển sự nghiệp.
                        </p>
                    </div>

                    {/* Search */}
                    <div className="max-w-lg mx-auto mb-8">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm nghề nghiệp mơ ước của bạn..."
                                value={searchQuery}
                                onChange={handleSearchChange}
                                className="w-full pl-12 pr-12 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm text-lg"
                            />
                            {isSearching && (
                                <Loader2 className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 animate-spin text-gray-400" />
                            )}
                        </div>

                        {/* Popular Career Suggestions */}
                        <div className="mt-4">
                            <p className="text-sm text-gray-500 mb-3 text-center">
                                💡 Nghề nghiệp phổ biến:
                            </p>
                            <div className="flex flex-wrap justify-center gap-2">
                                {[
                                    { name: "Kỹ sư phần mềm", query: "kỹ sư phần mềm" },
                                    { name: "Bác sĩ", query: "bác sĩ" },
                                    { name: "Giáo viên", query: "giáo viên" },
                                    { name: "Kế toán", query: "kế toán" },
                                    { name: "Marketing", query: "marketing" },
                                    { name: "Thiết kế", query: "thiết kế" },
                                    { name: "Luật sư", query: "luật sư" },
                                    { name: "Nhân sự", query: "nhân sự" }
                                ].map((career) => (
                                    <button
                                        key={career.name}
                                        onClick={() => setSearchQuery(career.query)}
                                        className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium hover:bg-blue-100 transition-colors border border-blue-200"
                                    >
                                        {career.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Job List */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-5 border-b border-gray-200">
                                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-lg shadow-sm">
                                            <Briefcase className="h-5 w-5 text-blue-600" />
                                        </div>
                                        {searchQuery ? 'Kết quả tìm kiếm' : 'Nghề nghiệp phổ biến'}
                                    </h2>
                                    <p className="text-sm text-gray-600 mt-1">
                                        {searchQuery
                                            ? `Tìm thấy ${jobs.length} nghề nghiệp phù hợp`
                                            : 'Được chọn ngẫu nhiên từ 959+ nghề nghiệp trong hệ thống'
                                        }
                                    </p>
                                </div>
                                <div className="p-6">
                                    {jobs.length === 0 ? (
                                        <div className="text-center py-12">
                                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Briefcase className="h-10 w-10 text-gray-400" />
                                            </div>
                                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                                {searchQuery ? 'Không tìm thấy nghề nghiệp phù hợp' : 'Không có dữ liệu nghề nghiệp'}
                                            </h3>
                                            <p className="text-gray-500 mb-4">
                                                {searchQuery
                                                    ? 'Thử tìm kiếm với từ khóa khác hoặc kiểm tra chính tả'
                                                    : 'Vui lòng thử lại sau'
                                                }
                                            </p>
                                            {searchQuery && (
                                                <button
                                                    onClick={() => setSearchQuery('')}
                                                    className="text-blue-600 hover:text-blue-700 font-medium"
                                                >
                                                    Xóa bộ lọc và xem tất cả
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {jobs.map((job) => (
                                                <div
                                                    key={job.id}
                                                    className="border border-gray-200 rounded-xl p-6 hover:border-blue-300 hover:shadow-lg transition-all duration-200 group bg-gradient-to-br from-white to-gray-50 flex flex-col h-[360px]"
                                                >
                                                    {/* Header - Fixed height */}
                                                    <div className="mb-4 h-[100px] flex flex-col justify-between">
                                                        <div>
                                                            <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors text-lg mb-2 leading-tight">
                                                                <span className="line-clamp-2">
                                                                    {job.title}
                                                                </span>
                                                            </h3>
                                                            <p className="text-sm text-gray-500 font-medium">
                                                                Mã nghề: {job.id}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Description - Fixed height with scroll */}
                                                    <div className="flex-1 mb-6 h-[140px] overflow-hidden">
                                                        {job.description_vi ? (
                                                            <div className="text-sm text-gray-600 leading-relaxed h-full">
                                                                <p className="line-clamp-6">
                                                                    {job.description_vi}
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <div className="text-sm text-gray-400 italic h-full flex items-center">
                                                                <span>Mô tả nghề nghiệp sẽ được cập nhật sớm</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Action Buttons - Fixed at bottom */}
                                                    <div className="flex gap-3 mt-auto">
                                                        <button
                                                            onClick={() => navigate(`/interview/selection/${job.id}`)}
                                                            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 rounded-xl font-bold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg text-sm"
                                                        >
                                                            <Play className="h-4 w-4" />
                                                            Phỏng vấn
                                                        </button>
                                                        <button
                                                            onClick={() => navigate(`/careers/${job.id.replace(/\./g, '-')}`)}
                                                            className="flex-1 bg-gray-100 text-gray-700 px-4 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                            Chi tiết
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Recent Interviews */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="bg-gradient-to-r from-green-50 to-blue-50 px-6 py-5 border-b border-gray-200">
                                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-lg shadow-sm">
                                            <Clock className="h-5 w-5 text-green-600" />
                                        </div>
                                        Phỏng vấn gần đây
                                    </h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Lịch sử phỏng vấn của bạn
                                    </p>
                                </div>
                                <div className="p-6">
                                    {recentInterviews.length === 0 ? (
                                        <div className="text-center py-8">
                                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Clock className="h-8 w-8 text-gray-400" />
                                            </div>
                                            <h4 className="font-medium text-gray-900 mb-2">Chưa có phỏng vấn nào</h4>
                                            <p className="text-sm text-gray-500 mb-4">
                                                Bắt đầu phỏng vấn đầu tiên để xem lịch sử tại đây
                                            </p>
                                            <button
                                                onClick={() => {
                                                    const firstJob = jobs[0];
                                                    if (firstJob) navigate(`/interview/selection/${firstJob.id}`);
                                                }}
                                                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                                            >
                                                Bắt đầu phỏng vấn ngay →
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="space-y-4">
                                                {(showAllInterviews ? allInterviews : recentInterviews).map((interview) => (
                                                    <div
                                                        key={interview.id}
                                                        className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer group"
                                                        onClick={() => navigate(`/interview/results/${interview.id}`)}
                                                    >
                                                        <div className="flex items-center justify-between mb-3">
                                                            <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors text-sm leading-tight">
                                                                {interview.job_title}
                                                            </h4>
                                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(interview.status)}`}>
                                                                {getStatusLabel(interview.status)}
                                                            </span>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <p className="text-xs text-gray-500">
                                                                📅 {formatDate(interview.started_at)}
                                                            </p>

                                                            {interview.overall_score && (
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs text-gray-400">Điểm:</span>
                                                                        <span className="text-sm font-bold text-blue-600">
                                                                            {interview.overall_score.toFixed(1)}/10
                                                                        </span>
                                                                    </div>
                                                                    {interview.recommendation && (
                                                                        <span className={`text-xs font-medium ${interview.recommendation === 'PASS' ? 'text-green-600' :
                                                                            interview.recommendation === 'CONDITIONAL_PASS' ? 'text-yellow-600' :
                                                                                'text-red-600'
                                                                            }`}>
                                                                            {interview.recommendation === 'PASS' ? 'Đạt' :
                                                                                interview.recommendation === 'CONDITIONAL_PASS' ? 'Có điều kiện' :
                                                                                    'Chưa đạt'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}

                                                            <div className="text-xs text-blue-600 group-hover:text-blue-700 transition-colors">
                                                                Nhấn để xem chi tiết →
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* View More Button */}
                                            {!showAllInterviews && interviewStats.total_interviews > 5 && (
                                                <div className="mt-6 text-center">
                                                    <button
                                                        onClick={() => navigate('/interview/history')}
                                                        className="w-full bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl font-semibold hover:from-blue-100 hover:to-purple-100 transition-all duration-200 flex items-center justify-center gap-2"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                        Xem thêm ({interviewStats.total_interviews - 5} phỏng vấn)
                                                    </button>
                                                </div>
                                            )}

                                            {/* Collapse Button */}
                                            {showAllInterviews && (
                                                <div className="mt-6 text-center">
                                                    <button
                                                        onClick={() => setShowAllInterviews(false)}
                                                        className="w-full bg-gray-50 border border-gray-200 text-gray-700 px-4 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-200 flex items-center justify-center gap-2"
                                                    >
                                                        Thu gọn
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Enhanced Stats */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-5 border-b border-gray-200">
                                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-lg shadow-sm">
                                            <Users className="h-5 w-5 text-purple-600" />
                                        </div>
                                        Thống kê của bạn
                                    </h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Tiến độ phỏng vấn và thành tích
                                    </p>
                                </div>
                                <div className="p-6">
                                    <div className="space-y-6">
                                        {/* Total Interviews */}
                                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                                                    <Briefcase className="h-5 w-5 text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-blue-900">Tổng phỏng vấn</p>
                                                    <p className="text-xs text-blue-700">Số lần bạn đã thử</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-bold text-blue-900">{interviewStats.total_interviews}</p>
                                                <p className="text-xs text-blue-700">lần</p>
                                            </div>
                                        </div>

                                        {/* Completed Interviews */}
                                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                                                    <Clock className="h-5 w-5 text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-green-900">Hoàn thành</p>
                                                    <p className="text-xs text-green-700">Phỏng vấn thành công</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-bold text-green-900">{interviewStats.completed_interviews}</p>
                                                <p className="text-xs text-green-700">
                                                    {interviewStats.total_interviews > 0
                                                        ? `${((interviewStats.completed_interviews / interviewStats.total_interviews) * 100).toFixed(0)}%`
                                                        : '0%'
                                                    }
                                                </p>
                                            </div>
                                        </div>

                                        {/* Average Score */}
                                        {interviewStats.completed_interviews > 0 && (
                                            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                                                        <Users className="h-5 w-5 text-white" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-purple-900">Điểm trung bình</p>
                                                        <p className="text-xs text-purple-700">Thành tích tổng thể</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-2xl font-bold text-purple-900">
                                                        {interviewStats.average_score.toFixed(1)}
                                                    </p>
                                                    <p className="text-xs text-purple-700">/10 điểm</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Progress Message */}
                                        <div className="text-center p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
                                            <p className="text-sm font-medium text-yellow-900 mb-1">
                                                {interviewStats.total_interviews === 0
                                                    ? '🚀 Bắt đầu hành trình phỏng vấn của bạn!'
                                                    : interviewStats.average_score >= 8
                                                        ? '🎉 Xuất sắc! Bạn đã thành thạo kỹ năng phỏng vấn'
                                                        : interviewStats.average_score >= 6
                                                            ? '👍 Tốt lắm! Tiếp tục luyện tập để hoàn thiện'
                                                            : '💪 Đừng bỏ cuộc! Mỗi lần thử là một bước tiến'
                                                }
                                            </p>
                                            <p className="text-xs text-yellow-700">
                                                {interviewStats.total_interviews === 0
                                                    ? 'Chọn nghề nghiệp và bắt đầu phỏng vấn đầu tiên'
                                                    : 'Luyện tập thường xuyên để cải thiện kỹ năng'
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Enhanced Tips */}
                            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6">
                                <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg shadow-sm">
                                        <Users className="h-5 w-5 text-blue-600" />
                                    </div>
                                    💡 Bí quyết phỏng vấn thành công
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3 p-3 bg-white/50 rounded-lg">
                                        <span className="text-lg">🎯</span>
                                        <div>
                                            <p className="text-sm font-medium text-blue-900">Chuẩn bị kỹ lưỡng</p>
                                            <p className="text-xs text-blue-700">Tìm hiểu về công ty và vị trí ứng tuyển</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 p-3 bg-white/50 rounded-lg">
                                        <span className="text-lg">⭐</span>
                                        <div>
                                            <p className="text-sm font-medium text-blue-900">Phương pháp STAR</p>
                                            <p className="text-xs text-blue-700">Situation → Task → Action → Result</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 p-3 bg-white/50 rounded-lg">
                                        <span className="text-lg">🗣️</span>
                                        <div>
                                            <p className="text-sm font-medium text-blue-900">Giao tiếp tự tin</p>
                                            <p className="text-xs text-blue-700">Nói chậm, rõ ràng và duy trì ánh mắt</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 p-3 bg-white/50 rounded-lg">
                                        <span className="text-lg">💪</span>
                                        <div>
                                            <p className="text-sm font-medium text-blue-900">Thái độ tích cực</p>
                                            <p className="text-xs text-blue-700">Thể hiện sự nhiệt tình và học hỏi</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default InterviewListPage;