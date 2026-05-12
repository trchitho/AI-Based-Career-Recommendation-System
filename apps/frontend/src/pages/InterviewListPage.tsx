import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Play, Loader2, Briefcase, Clock, Users, Eye, Star, TrendingUp, Award, Target, Zap, ChevronRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':  return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            case 'active':     return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
            case 'abandoned':  return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
            case 'terminated': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
            default:           return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
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
                <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                    <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
                        <p className="text-gray-500 font-medium">Đang tải danh sách nghề nghiệp...</p>
                    </div>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="min-h-[calc(100vh-64px)] py-10 px-4 bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white relative overflow-x-hidden font-['Plus_Jakarta_Sans'] pb-20">
                
                <div className="absolute inset-0 bg-dot-pattern pointer-events-none z-0 opacity-60" />
                <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-indigo-400/10 rounded-full blur-[120px] pointer-events-none z-0" />
                <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-purple-400/10 rounded-full blur-[120px] pointer-events-none z-0" />

                <div className="max-w-6xl mx-auto relative z-10">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-[20px] bg-indigo-600 shadow-lg shadow-indigo-500/30 mb-6">
                            <Users className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-4">
                            Phỏng vấn AI <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">thông minh</span>
                        </h1>
                        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto font-medium">
                            Luyện tập phỏng vấn với AI, nhận phản hồi chi tiết
                            và nâng cao cơ hội thành công trong sự nghiệp.
                        </p>
                    </div>

                    {/* Search */}
                    <div className="max-w-3xl mx-auto mb-12">
                        <div className="relative glass rounded-[24px] overflow-hidden border border-white/40 dark:border-gray-700/50 shadow-xl transition-all focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-indigo-500/70" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm kỹ năng, vị trí, công ty..."
                                value={searchQuery}
                                onChange={handleSearchChange}
                                className="w-full pl-16 pr-12 py-5 bg-transparent border-none focus:outline-none text-gray-900 dark:text-white placeholder-gray-500 text-lg font-medium"
                            />
                            {isSearching && (
                                <Loader2 className="h-5 w-5 animate-spin" style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            )}
                        </div>

                        {/* Popular Career Suggestions */}
                        <div className="mt-4">
                            <p className="text-sm text-gray-500 mb-3 text-center">
                                Nghề nghiệp phổ biến
                            </p>
                            <div className="flex flex-wrap justify-center gap-2">
                                {[
                                    { name: "Kỹ sư", query: "kỹ sư" },
                                    { name: "Nhân viên kinh doanh", query: "nhân viên kinh doanh" },
                                    { name: "Kế toán", query: "kế toán" },
                                    { name: "Giáo viên", query: "giáo viên" },
                                    { name: "Bác sĩ", query: "bác sĩ" },
                                    { name: "Thợ điện", query: "thợ điện" },
                                    { name: "Thiết kế đồ họa", query: "thiết kế" },
                                ].map((career) => (
                                    <button
                                        key={career.name}
                                        onClick={() => setSearchQuery(career.query)}
                                        className="px-3 py-1.5 text-xs font-semibold bg-white/50 dark:bg-gray-800/50 border border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-900/40 hover:shadow-sm transition-all"
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
                            <div className="glass rounded-[24px] border border-white/40 dark:border-gray-700/50 shadow-xl overflow-hidden h-full">
                                <div className="px-6 py-5 border-b border-white/40 dark:border-gray-700/50 bg-white/30 dark:bg-gray-800/30">
                                    <h2 className="flex items-center gap-3 text-xl font-bold text-gray-900 dark:text-white">
                                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                                            <Briefcase className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        {searchQuery ? 'Kết quả tìm kiếm' : 'Nghề nghiệp phổ biến'}
                                    </h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                        {searchQuery
                                            ? `Tìm thấy ${jobs.length} nghề nghiệp phù hợp`
                                            : 'Được chọn ngẫu nhiên từ 959+ nghề nghiệp trong hệ thống'
                                        }
                                    </p>
                                </div>
                                <div className="p-6">
                                    {jobs.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center p-8 text-center bg-gray-50/50 dark:bg-gray-800/20 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
                                                <Briefcase className="h-8 w-8 text-gray-400" />
                                            </div>
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                                                {searchQuery ? 'Không tìm thấy nghề nghiệp phù hợp' : 'Không có dữ liệu nghề nghiệp'}
                                            </h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md">
                                                {searchQuery
                                                    ? 'Thử tìm kiếm với từ khóa khác hoặc kiểm tra chính tả'
                                                    : 'Vui lòng thử lại sau'
                                                }
                                            </p>
                                            {searchQuery && (
                                                <button
                                                    onClick={() => setSearchQuery('')}
                                                    className="px-5 py-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-semibold rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors text-sm"
                                                >
                                                    Xóa bộ lọc và xem tất cả
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                            <motion.div 
                                                initial="hidden" 
                                                animate="visible" 
                                                variants={{
                                                    hidden: { opacity: 0 },
                                                    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
                                                }}
                                                className="grid grid-cols-1 md:grid-cols-2 gap-6"
                                            >
                                            {jobs.map((job) => (
                                                <motion.div
                                                    variants={{
                                                        hidden: { opacity: 0, y: 20 },
                                                        visible: { opacity: 1, y: 0 }
                                                    }}
                                                    whileHover={{ y: -4, scale: 1.01 }}
                                                    transition={{ type: "spring", stiffness: 300 }}
                                                    key={job.id}
                                                    className="glass rounded-2xl p-5 border border-white/40 dark:border-gray-700/50 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all shadow-sm hover:shadow-lg flex flex-col h-full bg-white/50 dark:bg-gray-800/40"
                                                >
                                                    {/* Header - Fixed height */}
                                                    <div className="mb-4 h-[90px] flex flex-col justify-start">
                                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 leading-snug">
                                                            <span className="line-clamp-2">
                                                                {job.title}
                                                            </span>
                                                        </h3>
                                                        <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 w-fit px-2 py-0.5 rounded-md">
                                                            Mã nghề: {job.id}
                                                        </p>
                                                    </div>

                                                    {/* Description - Fixed height with scroll */}
                                                    <div className="flex-1 mb-6 h-[140px] overflow-hidden">
                                                        {job.description_vi ? (
                                                            <div className="h-full text-sm text-gray-600 dark:text-gray-400">
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
                                                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/40"
                                                        >
                                                            <Play className="h-4 w-4" />
                                                            Phỏng vấn
                                                        </button>
                                                        <button
                                                            onClick={() => navigate(`/careers/${job.id.replace(/\./g, '-')}`)}
                                                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/60 dark:bg-gray-800/60 hover:bg-white/80 dark:hover:bg-gray-700/80 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-bold transition-colors shadow-sm"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                            Chi tiết
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            ))}
                                            </motion.div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Recent Interviews */}
                            <div className="glass rounded-[24px] border border-white/40 dark:border-gray-700/50 shadow-xl overflow-hidden">
                                <div className="px-6 py-5 border-b border-white/40 dark:border-gray-700/50 bg-white/30 dark:bg-gray-800/30">
                                    <h3 className="flex items-center gap-3 text-lg font-bold text-gray-900 dark:text-white">
                                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                                            <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        Phỏng vấn gần đây
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                        Lịch sử phỏng vấn của bạn
                                    </p>
                                </div>
                                <div className="p-6">
                                    {recentInterviews.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center p-8 text-center bg-gray-50/50 dark:bg-gray-800/20 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
                                                <Clock className="h-8 w-8 text-gray-400" />
                                            </div>
                                            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Chưa có phỏng vấn nào</h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md">
                                                Bắt đầu phỏng vấn đầu tiên để xem lịch sử tại đây
                                            </p>
                                            <button
                                                onClick={() => {
                                                    const firstJob = jobs[0];
                                                    if (firstJob) navigate(`/interview/selection/${firstJob.id}`);
                                                }}
                                                className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors text-sm shadow-md shadow-indigo-500/20 flex items-center gap-2"
                                            >
                                                Bắt đầu phỏng vấn ngay <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="space-y-4">
                                                {(showAllInterviews ? allInterviews : recentInterviews).map((interview) => (
                                                    <div
                                                        key={interview.id}
                                                        className="glass bg-white/50 dark:bg-gray-800/40 border border-white/40 dark:border-gray-700/50 rounded-xl p-4 sm:p-5 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md transition-all duration-300 hover:-translate-y-1 cursor-pointer group"
                                                        onClick={() => navigate(`/interview/results/${interview.id}`)}
                                                    >
                                                        <div className="flex items-center justify-between mb-3">
                                                            <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors text-sm leading-tight">
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
                                                                        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
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

                                                            <div className="text-xs text-indigo-500 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
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
                                                        className="w-full bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 px-4 py-3 rounded-xl font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all duration-200 flex items-center justify-center gap-2"
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
                                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-4 py-3 rounded-xl font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 flex items-center justify-center gap-2"
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
                            <div className="glass rounded-[24px] border border-white/40 dark:border-gray-700/50 shadow-xl overflow-hidden">
                                <div className="px-6 py-5 border-b border-white/40 dark:border-gray-700/50 bg-white/30 dark:bg-gray-800/30">
                                    <h3 className="flex items-center gap-3 text-lg font-bold text-gray-900 dark:text-white">
                                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                                            <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        Thống kê của bạn
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                        Tiến độ phỏng vấn và thành tích
                                    </p>
                                </div>
                                <div className="p-6">
                                    <div className="space-y-4">
                                        {/* Total Interviews */}
                                        <div className="glass bg-white/50 dark:bg-gray-800/40 flex items-center justify-between p-4 rounded-xl border border-white/40 dark:border-gray-700/50">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                                    <Briefcase className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900 dark:text-white text-sm">Tổng phỏng vấn</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Số lần bạn đã thử</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xl font-bold text-gray-900 dark:text-white">{interviewStats.total_interviews}</p>
                                                <p className="text-xs text-gray-500">lần</p>
                                            </div>
                                        </div>

                                        {/* Completed Interviews */}
                                        <div className="glass bg-white/50 dark:bg-gray-800/40 flex items-center justify-between p-4 rounded-xl border border-white/40 dark:border-gray-700/50">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                                                    <Clock className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900 dark:text-white text-sm">Hoàn thành</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Phỏng vấn thành công</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xl font-bold text-gray-900 dark:text-white">{interviewStats.completed_interviews}</p>
                                                <p className="text-xs text-gray-500">
                                                    {interviewStats.total_interviews > 0
                                                        ? `${((interviewStats.completed_interviews / interviewStats.total_interviews) * 100).toFixed(0)}%`
                                                        : '0%'
                                                    }
                                                </p>
                                            </div>
                                        </div>

                                        {/* Average Score */}
                                        {interviewStats.completed_interviews > 0 && (
                                            <div className="glass bg-white/50 dark:bg-gray-800/40 flex items-center justify-between p-4 rounded-xl border border-white/40 dark:border-gray-700/50">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                                                        <Star className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-900 dark:text-white text-sm">Điểm trung bình</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">Thành tích tổng thể</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                                                        {interviewStats.average_score.toFixed(1)}
                                                    </p>
                                                    <p className="text-xs text-gray-500">/10 điểm</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Progress Message */}
                                        <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/50 rounded-xl p-5 text-center">
                                            <p className="font-bold text-indigo-900 dark:text-indigo-300 text-sm mb-1.5">
                                                {interviewStats.total_interviews === 0
                                                    ? '🎯 Bắt đầu hành trình phỏng vấn của bạn!'
                                                    : interviewStats.average_score >= 8
                                                        ? '🏆 Xuất sắc! Bạn đã thành thạo kỹ năng phỏng vấn'
                                                        : interviewStats.average_score >= 6
                                                            ? '👍 Tốt lắm! Tiếp tục luyện tập để hoàn thiện'
                                                            : '💪 Đừng bỏ cuộc! Mỗi lần thử là một bước tiến'
                                                }
                                            </p>
                                            <p className="text-xs text-indigo-700/70 dark:text-indigo-400/70">
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
                            <div className="glass rounded-[24px] border border-indigo-200/50 dark:border-indigo-700/50 shadow-xl overflow-hidden bg-gradient-to-br from-indigo-50/80 to-purple-50/80 dark:from-indigo-900/20 dark:to-purple-900/20">
                                <div className="p-6">
                                    <h3 className="flex items-center gap-3 text-lg font-bold text-indigo-900 dark:text-indigo-300 mb-6">
                                        <div className="p-2 bg-white/60 dark:bg-indigo-900/50 rounded-xl shadow-sm">
                                            <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        Bí quyết phỏng vấn thành công
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-4">
                                            <span className="text-2xl mt-0.5 drop-shadow-sm">📚</span>
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white text-sm">Chuẩn bị kỹ lưỡng</p>
                                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Tìm hiểu về công ty và vị trí ứng tuyển</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <span className="text-2xl mt-0.5 drop-shadow-sm">⭐</span>
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white text-sm">Phương pháp STAR</p>
                                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Situation → Task → Action → Result</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <span className="text-2xl mt-0.5 drop-shadow-sm">💬</span>
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white text-sm">Giao tiếp tự tin</p>
                                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Nói chậm, rõ ràng và duy trì ánh mắt</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <span className="text-2xl mt-0.5 drop-shadow-sm">😊</span>
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white text-sm">Thái độ tích cực</p>
                                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Thể hiện sự nhiệt tình và học hỏi</p>
                                            </div>
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