import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Play, Loader2, Briefcase, Clock, Users, Eye, Star, TrendingUp, Award, Target, Zap, ChevronRight, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { interviewService } from '../services/interviewService';
import { useDebounce } from '../hooks/useDebounce';
import MainLayout from '../components/layout/MainLayout';
import './InterviewListPage.css';

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
            console.log(' Loading initial interview data...');

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

            console.log(' Initial interview data loaded successfully');
        } catch (error) {
            console.error(' Error loading initial data:', error);
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
                console.log(' Loading random jobs for empty search...');
                const response = await interviewService.searchJobs('', 50, true); // Use random=true for full randomization
                const shuffledJobs = response.jobs.sort(() => Math.random() - 0.5);
                setJobs(shuffledJobs.slice(0, 12));
            } catch (error) {
                console.error(' Error loading random jobs:', error);
            }
            return;
        }

        try {
            setIsSearching(true);
            console.log(` Searching jobs with query: "${query}"`);
            const response = await interviewService.searchJobs(query, 50); // Search with query
            setJobs(response.jobs);
            console.log(` Found ${response.jobs.length} jobs for query: "${query}"`);
        } catch (error) {
            console.error(' Error searching jobs:', error);
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
                return 'bg-indigo-50 text-indigo-950';
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
        // Scroll to top when component mounts
        window.scrollTo(0, 0);

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
        console.log(` Search query changed to: "${debouncedSearchQuery}"`);
        handleSearch(debouncedSearchQuery);
    }, [debouncedSearchQuery, handleSearch]); // Include handleSearch but it's stable due to empty deps

    if (isLoading) {
        return (
            <MainLayout>
                <div className="interview-list-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: '#6366f1' }} />
                        <p style={{ color: 'var(--text-secondary)' }}>Đang tải danh sách nghề nghiệp...</p>
                    </div>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="interview-list-page py-8">
                <div className="max-w-6xl mx-auto px-4">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <div className="interview-hero-icon">
                            <Users className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="interview-hero-title">
                            Phỏng vấn AI <span className="interview-hero-title-gradient">thông minh</span>
                        </h1>
                        <p className="interview-hero-subtitle max-w-3xl mx-auto">
                            Luyện tập phỏng vấn với AI, nhận phản hồi chi tiết
                            và nâng cao cơ hội thành công trong sự nghiệp.
                        </p>
                    </div>

                    {/* Search */}
                    <div className="interview-search-container">
                        <div style={{ position: 'relative' }}>
                            <Search className="interview-search-icon h-5 w-5" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm kỹ năng, vị trí, công ty..."
                                value={searchQuery}
                                onChange={handleSearchChange}
                                className="interview-search-input"
                            />
                            {isSearching && (
                                <Loader2 className="h-5 w-5 animate-spin" style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            )}
                        </div>

                        {/* Popular Career Suggestions */}
                        <div className="mt-4">
                            <p className="text-sm text-gray-500 mb-3 text-center">
                                Kỹ năng của bạn
                            </p>
                            <div className="flex flex-wrap justify-center gap-2">
                                {[
                                    { name: "React", query: "kỹ sư phần mềm" },
                                    { name: "JavaScript", query: "bác sĩ" },
                                    { name: "TypeScript", query: "giáo viên" },
                                    { name: "Node.js", query: "kế toán" },
                                    { name: "SQL", query: "marketing" },
                                    { name: "Git", query: "thiết kế" },
                                    { name: "System Design", query: "luật sư" },
                                    { name: "+ Thêm kỹ năng", query: "nhân sự" }
                                ].map((career) => (
                                    <button
                                        key={career.name}
                                        onClick={() => setSearchQuery(career.query)}
                                        className="interview-skill-tag"
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
                            <div className="interview-card">
                                <div className="interview-card-header">
                                    <h2 className="interview-card-title">
                                        <div className="interview-card-icon-wrapper">
                                            <Briefcase className="h-5 w-5" style={{ color: '#6366f1' }} />
                                        </div>
                                        {searchQuery ? 'Kết quả tìm kiếm' : 'Nghề nghiệp phổ biến'}
                                    </h2>
                                    <p className="interview-card-subtitle">
                                        {searchQuery
                                            ? `Tìm thấy ${jobs.length} nghề nghiệp phù hợp`
                                            : 'Được chọn ngẫu nhiên từ 959+ nghề nghiệp trong hệ thống'
                                        }
                                    </p>
                                </div>
                                <div className="p-6">
                                    {jobs.length === 0 ? (
                                        <div className="interview-empty-state">
                                            <div className="interview-empty-icon">
                                                <Briefcase className="h-10 w-10" style={{ color: 'var(--text-muted)' }} />
                                            </div>
                                            <h3 className="interview-empty-title">
                                                {searchQuery ? 'Không tìm thấy nghề nghiệp phù hợp' : 'Không có dữ liệu nghề nghiệp'}
                                            </h3>
                                            <p className="interview-empty-text mb-4">
                                                {searchQuery
                                                    ? 'Thử tìm kiếm với từ khóa khác hoặc kiểm tra chính tả'
                                                    : 'Vui lòng thử lại sau'
                                                }
                                            </p>
                                            {searchQuery && (
                                                <button
                                                    onClick={() => setSearchQuery('')}
                                                    className="interview-btn-primary"
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
                                                    className="interview-job-card"
                                                >
                                                    {/* Header - Fixed height */}
                                                    <div className="mb-4 h-[100px] flex flex-col justify-between">
                                                        <div>
                                                            <h3 className="interview-job-title">
                                                                <span className="line-clamp-2">
                                                                    {job.title}
                                                                </span>
                                                            </h3>
                                                            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                                                                Mã nghề: {job.id}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Description - Fixed height with scroll */}
                                                    <div className="flex-1 mb-6 h-[140px] overflow-hidden">
                                                        {job.description_vi ? (
                                                            <div className="interview-job-description h-full">
                                                                <p className="line-clamp-6">
                                                                    {job.description_vi}
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <div className="text-sm italic h-full flex items-center" style={{ color: 'var(--text-muted)' }}>
                                                                <span>Mô tả nghề nghiệp sẽ được cập nhật sớm</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Action Buttons - Fixed at bottom */}
                                                    <div className="flex gap-3 mt-auto">
                                                        <button
                                                            onClick={() => navigate(`/interview/selection/${job.id}`)}
                                                            className="interview-btn-primary flex-1 text-sm"
                                                        >
                                                            <Play className="h-4 w-4" />
                                                            Phỏng vấn
                                                        </button>
                                                        <button
                                                            onClick={() => navigate(`/careers/${job.id.replace(/\./g, '-')}`)}
                                                            className="interview-btn-secondary flex-1 text-sm"
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
                            <div className="interview-card">
                                <div className="interview-card-header">
                                    <h3 className="interview-card-title">
                                        <div className="interview-card-icon-wrapper">
                                            <Clock className="h-5 w-5" style={{ color: '#6366f1' }} />
                                        </div>
                                        Phỏng vấn gần đây
                                    </h3>
                                    <p className="interview-card-subtitle">
                                        Lịch sử phỏng vấn của bạn
                                    </p>
                                </div>
                                <div className="p-6">
                                    {recentInterviews.length === 0 ? (
                                        <div className="interview-empty-state">
                                            <div className="interview-empty-icon">
                                                <Clock className="h-8 w-8" style={{ color: 'var(--text-muted)' }} />
                                            </div>
                                            <h4 className="interview-empty-title">Chưa có phỏng vấn nào</h4>
                                            <p className="interview-empty-text mb-4">
                                                Bắt đầu phỏng vấn đầu tiên để xem lịch sử tại đây
                                            </p>
                                            <button
                                                onClick={() => {
                                                    const firstJob = jobs[0];
                                                    if (firstJob) navigate(`/interview/selection/${firstJob.id}`);
                                                }}
                                                className="interview-btn-primary"
                                                style={{ fontSize: '0.875rem' }}
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
                                                                {formatDate(interview.started_at)}
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
                                                                        <span className={`text-xs font-medium ${interview.recommendation === 'PASS' ? 'text-indigo-800' :
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
                            <div className="interview-card">
                                <div className="interview-card-header">
                                    <h3 className="interview-card-title">
                                        <div className="interview-card-icon-wrapper">
                                            <Users className="h-5 w-5 interview-icon-accent" />
                                        </div>
                                        Thống kê của bạn
                                    </h3>
                                    <p className="interview-card-subtitle">
                                        Tiến độ phỏng vấn và thành tích
                                    </p>
                                </div>
                                <div className="p-6">
                                    <div className="space-y-6">
                                        {/* Total Interviews */}
                                        <div className="interview-stat-item-blue flex items-center justify-between p-4 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="interview-stat-icon-blue w-10 h-10 rounded-full flex items-center justify-center">
                                                    <Briefcase className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="interview-stat-label">Tổng phỏng vấn</p>
                                                    <p className="text-xs interview-card-subtitle">Số lần bạn đã thử</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="interview-stat-value">{interviewStats.total_interviews}</p>
                                                <p className="interview-stat-unit">lần</p>
                                            </div>
                                        </div>

                                        {/* Completed Interviews */}
                                        <div className="interview-stat-item-purple flex items-center justify-between p-4 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="interview-stat-icon-purple w-10 h-10 rounded-full flex items-center justify-center">
                                                    <Clock className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="interview-stat-label">Hoàn thành</p>
                                                    <p className="text-xs interview-card-subtitle">Phỏng vấn thành công</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="interview-stat-value">{interviewStats.completed_interviews}</p>
                                                <p className="interview-stat-unit">
                                                    {interviewStats.total_interviews > 0
                                                        ? `${((interviewStats.completed_interviews / interviewStats.total_interviews) * 100).toFixed(0)}%`
                                                        : '0%'
                                                    }
                                                </p>
                                            </div>
                                        </div>

                                        {/* Average Score */}
                                        {interviewStats.completed_interviews > 0 && (
                                            <div className="interview-stat-item-green flex items-center justify-between p-4 rounded-xl">
                                                <div className="flex items-center gap-3">
                                                    <div className="interview-stat-icon-green w-10 h-10 rounded-full flex items-center justify-center">
                                                        <Users className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <p className="interview-stat-label">Điểm trung bình</p>
                                                        <p className="text-xs interview-card-subtitle">Thành tích tổng thể</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="interview-stat-value">
                                                        {interviewStats.average_score.toFixed(1)}
                                                    </p>
                                                    <p className="interview-stat-unit">/10 điểm</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Progress Message */}
                                        <div className="interview-info-box text-center">
                                            <p className="interview-info-title mb-1">
                                                {interviewStats.total_interviews === 0
                                                    ? '🎯 Bắt đầu hành trình phỏng vấn của bạn!'
                                                    : interviewStats.average_score >= 8
                                                        ? '🏆 Xuất sắc! Bạn đã thành thạo kỹ năng phỏng vấn'
                                                        : interviewStats.average_score >= 6
                                                            ? '👍 Tốt lắm! Tiếp tục luyện tập để hoàn thiện'
                                                            : '💪 Đừng bỏ cuộc! Mỗi lần thử là một bước tiến'
                                                }
                                            </p>
                                            <p className="interview-info-text">
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
                            <div className="interview-tips-card">
                                <h3 className="interview-tips-section-title mb-4">
                                    <div className="p-2 bg-white dark:bg-opacity-10 rounded-lg shadow-sm">
                                        <Users className="h-5 w-5 interview-icon-accent" />
                                    </div>
                                    Bí quyết phỏng vấn thành công
                                </h3>
                                <div className="space-y-3">
                                    <div className="interview-tips-item">
                                        <span className="text-lg">📚</span>
                                        <div>
                                            <p className="interview-tips-title">Chuẩn bị kỹ lưỡng</p>
                                            <p className="interview-tips-text">Tìm hiểu về công ty và vị trí ứng tuyển</p>
                                        </div>
                                    </div>
                                    <div className="interview-tips-item">
                                        <span className="text-lg">⭐</span>
                                        <div>
                                            <p className="interview-tips-title">Phương pháp STAR</p>
                                            <p className="interview-tips-text">Situation → Task → Action → Result</p>
                                        </div>
                                    </div>
                                    <div className="interview-tips-item">
                                        <span className="text-lg">💬</span>
                                        <div>
                                            <p className="interview-tips-title">Giao tiếp tự tin</p>
                                            <p className="interview-tips-text">Nói chậm, rõ ràng và duy trì ánh mắt</p>
                                        </div>
                                    </div>
                                    <div className="interview-tips-item">
                                        <span className="text-lg">😊</span>
                                        <div>
                                            <p className="interview-tips-title">Thái độ tích cực</p>
                                            <p className="interview-tips-text">Thể hiện sự nhiệt tình và học hỏi</p>
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