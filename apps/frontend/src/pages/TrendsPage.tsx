import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Users,
  MapPin,
  Briefcase,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Bell,
  Clock,
  TrendingDown,
  Minus,
  Flame,
  DollarSign,
  Building2,
  UserCheck,
  Search,
  Filter,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Grid3X3,
  List
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import axios from 'axios';
import { cn } from '../lib/utils';
import useVietnamworksCategories, { useCategoryGroups, useCategorySearch } from '../hooks/useVietnamworksCategories';
import { useTrendsSummary } from '../hooks/useTrends';
import { useTheme } from '../contexts/ThemeContext';
import './TrendsPage-dark.css';

// Hook lấy trends từ dữ liệu crawl thật
const useCrawledTrends = () => {
  return useQuery({
    queryKey: ['crawled-trends-summary'],
    queryFn: async () => {
      const response = await axios.get('http://localhost:8000/api/jobs/analytics/trends-summary');
      return response.data;
    },
    staleTime: 30 * 1000,       // 30s — refresh nhanh khi có data mới
    gcTime: 5 * 60 * 1000,
  });
};

interface MarketMetrics {
  avg_salary: number;
  salary_change: number;
  job_postings: number;
  posting_change: number;
  market_health: number;
  health_change: number;
  recruitment_speed: number;
  speed_change: number;
}

interface SkillData {
  skill: string;
  growth: number;
  trend_score: number;
}

interface IndustryData {
  industry: string;
  demand: number;
}

interface RegionData {
  region: string;
  posts: number;
  change: string;
}

interface TrendingJob {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  posted: string;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  category: string;
  applicants: number;
  urgency: 'high' | 'medium' | 'low';
  skills: string[];
  description?: string;
  apply_url?: string;
  url?: string;
  source?: string;
}

const generateMockJobs = (): TrendingJob[] => {
  const baseJobs = [
    { category: 'Y tế & Chăm sóc sức khỏe', titles: ['Bác sĩ Đa khoa', 'Y tá trưởng', 'Điều dưỡng viên', 'Chuyên viên Y tế'], desc: 'Cơ hội làm việc tại bệnh viện tuyến đầu với trang thiết bị hiện đại. Yêu cầu có chứng chỉ hành nghề và ít nhất 3 năm kinh nghiệm làm việc tại khoa khám bệnh.', skills: ['Khám bệnh', 'Tư vấn y tế', 'Cấp cứu', 'Chăm sóc bệnh nhân'] },
    { category: 'Kinh doanh & Tiếp thị', titles: ['Chuyên viên Marketing', 'Quản lý Kinh doanh', 'Nhân viên Sales', 'Giám đốc Truyền thông'], desc: 'Lên ý tưởng và triển khai các chiến dịch marketing đa kênh. Đóng góp trực tiếp vào định vị thương hiệu công ty trên thị trường.', skills: ['Digital Marketing', 'Content Creation', 'SEO', 'Event Management'] },
    { category: 'Kỹ thuật & Xây dựng', titles: ['Kỹ sư Cầu đường', 'Chuyên viên Giám sát', 'Kiến trúc sư', 'Kỹ sư Cơ điện'], desc: 'Tham gia thiết kế và giám sát các công trình hạ tầng giao thông trọng điểm quốc gia. Sẵn sàng đi công tác và làm việc tại hiện trường.', skills: ['AutoCAD', 'Thiết kế kết cấu', 'Giám sát thi công', 'Bóc tách khối lượng'] },
    { category: 'Giáo dục & Đào tạo', titles: ['Giảng viên Tiếng Anh', 'Giáo viên Kỹ năng mềm', 'Chuyên gia Đào tạo', 'Cố vấn Học tập'], desc: 'Giảng dạy các khóa học luyện thi và chuyên môn. Yêu cầu chứng chỉ và có đam mê với ngành giáo dục.', skills: ['Giảng dạy', 'Giao tiếp', 'Phát triển giáo trình', 'Sư phạm'] },
    { category: 'IT & Phần mềm', titles: ['Senior Software Engineer', 'Full Stack Developer', 'Data Scientist', 'DevOps Engineer'], desc: 'Phát triển các hệ thống backend quy mô lớn. Cơ hội thăng tiến lên vị trí Technical Lead và làm việc với khách hàng toàn cầu.', skills: ['Java', 'React', 'Python', 'AWS'] }
  ];

  const companies = ['Bệnh viện Đa khoa Quốc tế', 'Tập đoàn Vingroup', 'Tập đoàn Đèo Cả', 'Hệ thống Anh ngữ ILA', 'FPT Software', 'VNG Corporation', 'Viettel', 'Techcombank', 'Shopee', 'Tiki'];
  const locations = ['Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ', 'Hải Phòng'];
  const jobs: TrendingJob[] = [];

  baseJobs.forEach((base, index) => {
    for (let i = 0; i < 15; i++) {
      jobs.push({
        id: `mock-job-${index}-${i}`,
        title: `${base.titles[i % base.titles.length]} ${i > 3 ? `(Senior)` : ''}`.trim(),
        company: companies[(i + index) % companies.length],
        location: locations[i % locations.length],
        salary: `${15 + (i % 5) * 5},000,000 - ${30 + (i % 5) * 10},000,000 VND`,
        posted: `${(i % 24) + 1} giờ trước`,
        trend: i % 3 === 0 ? 'up' : i % 3 === 1 ? 'stable' : 'down',
        trendPercentage: 15 - (i % 5) + (i % 3) * 5,
        category: base.category,
        applicants: 10 + i * 5,
        urgency: i % 4 === 0 ? 'high' : i % 2 === 0 ? 'medium' : 'low',
        skills: base.skills,
        description: base.desc
      });
    }
  });

  return jobs;
};

// Mock data matching trending-job style
const mockTrends = {
  salary_growth: [
    { period: 'T1', average: 1450 },
    { period: 'T2', average: 1520 },
    { period: 'T3', average: 1580 },
    { period: 'T4', average: 1650 },
    { period: 'T5', average: 1720 },
    { period: 'T6', average: 1750 },
  ],
  trending_skills: [
    { skill: 'Digital Marketing', growth: 14.2, trend_score: 85 },
    { skill: 'Tư vấn & CSKH', growth: 12.6, trend_score: 82 },
    { skill: 'Phân tích dữ liệu', growth: 15.2, trend_score: 88 },
    { skill: 'Quản lý dự án', growth: 10.7, trend_score: 78 },
    { skill: 'Lập trình Python', growth: 17.6, trend_score: 92 },
  ],
  industry_demand: [
    { industry: 'IT & Phần mềm', growth: 95 },
    { industry: 'Kinh doanh & Tiếp thị', growth: 88 },
    { industry: 'Y tế & Chăm sóc', growth: 85 },
    { industry: 'Giáo dục & Đào tạo', growth: 78 },
    { industry: 'Kỹ thuật & Xây dựng', growth: 72 },
  ],
  regional_demand: [
    { region: 'Hồ Chí Minh', count: 150 },
    { region: 'Hà Nội', count: 120 },
    { region: 'Đà Nẵng', count: 45 },
    { region: 'Cần Thơ', count: 28 },
    { region: 'Hải Phòng', count: 22 },
  ],
  trending_jobs: generateMockJobs()
};

const TrendsPage: React.FC = () => {
  const { theme } = useTheme();
  const [marketMetrics, setMarketMetrics] = useState<MarketMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [jobFilter, setJobFilter] = useState<string>('all');
  const [jobSearch, setJobSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('trend');

  // VietnamWorks categories state
  const [selectedCategoryGroup, setSelectedCategoryGroup] = useState<string>('');
  const [categorySearch, setCategorySearch] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Job expansion state for VietnamWorks categories
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);
  const [categoryJobs, setCategoryJobs] = useState<any[]>([]);
  const [loadingCategoryJobs, setLoadingCategoryJobs] = useState(false);
  const [showAllCategoryJobs, setShowAllCategoryJobs] = useState(false);

  // Trending jobs expansion state
  const [expandedTrendCategories, setExpandedTrendCategories] = useState<Record<string, boolean>>({});

  // Trending jobs manual refresh state — không tự load lại, chỉ load khi bấm nút
  const [trendingJobs, setTrendingJobs] = useState<TrendingJob[]>([]);
  const [isRefreshingJobs, setIsRefreshingJobs] = useState(true);  // true ban đầu vì đang load
  const [refreshStatus, setRefreshStatus] = useState<string>('Đang tải...');
  const [dataSource, setDataSource] = useState<'mock' | 'live_scrape' | 'fallback_db' | 'fallback_mock'>('live_scrape');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchTrendingJobs = async () => {
    setIsRefreshingJobs(true);
    setRefreshStatus('Đang tải...');
    try {
      // Đọc từ DB — dữ liệu đã được crawler cập nhật tự động mỗi 1 giờ
      const response = await axios.get('http://localhost:8000/api/jobs/trending', {
        params: { active_only: true },
        timeout: 15000,
      });
      const jobs = response.data?.trending_jobs;
      const total = response.data?.total ?? 0;

      if (jobs && jobs.length > 0) {
        setTrendingJobs(jobs);
        setDataSource('live_scrape');
        setRefreshStatus(`✓ ${total} việc làm từ 20 nhóm ngành`);
      } else {
        setTrendingJobs([]);
        setDataSource('live_scrape');
        setRefreshStatus('Chưa có dữ liệu — hệ thống đang thu thập, vui lòng chờ');
      }
    } catch (error) {
      console.error('Lỗi khi tải việc làm:', error);
      setTrendingJobs([]);
      setDataSource('fallback_mock');
      setRefreshStatus('⚠ Không kết nối được server');
    } finally {
      setLastRefreshed(new Date());
      setIsRefreshingJobs(false);
      setTimeout(() => setRefreshStatus(''), 5000);
    }
  };

  // Load dữ liệu thực từ API khi mount
  useEffect(() => {
    fetchTrendingJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefreshJobs = () => {
    fetchTrendingJobs();
    refetch(); // Cũng refresh biểu đồ thống kê
  };

  const toggleTrendCategory = (categoryName: string) => {
    setExpandedTrendCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  };

  // VietnamWorks categories hooks
  const { data: categoryGroups, isLoading: groupsLoading } = useCategoryGroups(true);
  const { data: categories, isLoading: categoriesLoading } = useVietnamworksCategories({
    group: selectedCategoryGroup || undefined,
    active_only: true,
    limit: 100
  });
  const { data: searchResults, isLoading: searchLoading } = useCategorySearch(categorySearch, 20);

  // Debug logging
  console.log('TrendsPage Debug:', {
    categoryGroups: categoryGroups?.length || 0,
    categories: categories?.length || 0,
    groupsLoading,
    categoriesLoading,
    selectedCategoryGroup
  });

  const { data: trends, isLoading, error, refetch } = useCrawledTrends();

  useEffect(() => {
    if (trends?.market_metrics) {
      setMarketMetrics(trends.market_metrics);
    } else {
      setMarketMetrics({
        avg_salary: 18500000,
        salary_change: 8.4,
        job_postings: 12450,
        posting_change: 12.1,
        market_health: 85,
        health_change: -2.5,
        recruitment_speed: 14,
        speed_change: 0.5
      });
    }
  }, [trends]);

  // Dynamic live logs simulation
  const [liveLogs, setLiveLogs] = useState<LogData[]>([]);

  useEffect(() => {
    // Initial logs setup
    const initialLogs = trends?.live_skills || mockTrends.logs;
    if (liveLogs.length === 0) {
      setLiveLogs(initialLogs);
    }

    // Simulate incoming data
    const skills = ['Quản lý dự án', 'Digital Marketing', 'Phân tích tài chính', 'Python / AI', 'AutoCAD', 'Tư vấn khách hàng', 'Thiết kế UI/UX', 'SEO', 'Phân tích dữ liệu', 'Khám chữa bệnh', 'Giảng dạy', 'Kiểm toán', 'Bán hàng B2B', 'Tuyển dụng'];
    const companies = ['Vinmec', 'Vingroup', 'Shopee', 'Coteccons', 'Techcombank', 'VinAI', 'Unilever', 'Vietcombank', 'FPT'];
    const roles = ['Bác sĩ', 'Kỹ sư xây dựng', 'Data Scientist', 'Product Manager', 'Chuyên viên Marketing', 'Giám đốc Kinh doanh', 'Business Analyst', 'Giảng viên', 'Chuyên viên Nhân sự', 'Kiểm toán viên'];

    const interval = setInterval(() => {
      setLiveLogs(prevLogs => {
        const newSkill = skills[Math.floor(Math.random() * skills.length)];
        const newCompany = companies[Math.floor(Math.random() * companies.length)];
        const newRole = roles[Math.floor(Math.random() * roles.length)];
        const isHighMatch = Math.random() > 0.5;

        const newLog: LogData = {
          id: Date.now(),
          skill: newSkill,
          time: 'Vừa xong',
          meta: `${newRole} tại ${newCompany}`,
          score: isHighMatch ? 0.85 + Math.random() * 0.14 : 0.6 + Math.random() * 0.2,
          color: isHighMatch ? 'text-emerald-600' : 'text-indigo-600',
          match: isHighMatch ? 0.85 + Math.random() * 0.14 : 0.6 + Math.random() * 0.2,
        };

        // Update relative time strings for old logs
        const updatedPrevLogs = prevLogs.map(log => {
          if (log.time === 'Vừa xong') return { ...log, time: '5 giây trước' };
          if (log.time === '5 giây trước') return { ...log, time: '12 giây trước' };
          if (log.time === '12 giây trước') return { ...log, time: '20 giây trước' };
          if (log.time === '20 giây trước') return { ...log, time: '45 giây trước' };
          if (log.time === '45 giây trước') return { ...log, time: '1 phút trước' };
          return log;
        });

        // Keep maximum of 5 items
        return [newLog, ...updatedPrevLogs].slice(0, 5);
      });
    }, 3500); // New log every 3.5s

    return () => clearInterval(interval);
  }, [trends]);

  // Ensure trends always has all required properties
  // trending_jobs dùng state riêng, không tự cập nhật theo refetch interval
  const safeTrends = {
    salary_growth: trends?.salary_trends || mockTrends.salary_growth,
    trending_skills: trends?.top_trending || mockTrends.trending_skills,
    industry_demand: trends?.industry_demand || mockTrends.industry_demand,
    regional_demand: trends?.regional_distribution || mockTrends.regional_demand,
    trending_jobs: trendingJobs,
  };

  // Filter and sort trending jobs — useMemo để tránh re-compute khi re-render không liên quan
  const filteredJobs = useMemo(() => (trendingJobs || [])
    .map((job: any) => ({
      ...job,
      trend: (job.trend || 'stable') as 'up' | 'down' | 'stable',
      urgency: (job.urgency || 'medium') as 'high' | 'medium' | 'low',
    }))
    .filter((job: TrendingJob) => {
      const matchesFilter = jobFilter === 'all' || job.category === jobFilter;
      const matchesSearch = job.title.toLowerCase().includes(jobSearch.toLowerCase()) ||
        job.company.toLowerCase().includes(jobSearch.toLowerCase()) ||
        job.skills.some(skill => skill.toLowerCase().includes(jobSearch.toLowerCase()));
      return matchesFilter && matchesSearch;
    })
    .sort((a: TrendingJob, b: TrendingJob) => {
      switch (sortBy) {
        case 'trend':
          return b.trendPercentage - a.trendPercentage;
        case 'salary': {
          const salaryA = parseInt(a.salary.replace(/[^0-9]/g, ''));
          const salaryB = parseInt(b.salary.replace(/[^0-9]/g, ''));
          return salaryB - salaryA;
        }
        case 'applicants':
          return a.applicants - b.applicants;
        case 'posted':
          return a.posted.localeCompare(b.posted);
        default:
          return 0;
      }
    }), [trendingJobs, jobFilter, jobSearch, sortBy]);

  const uniqueCategories = useMemo(
    () => Array.from(new Set((trendingJobs || []).map((job: any) => job.category))) as string[],
    [trendingJobs]
  );

  const formatCurrency = (value: number, currency: string = 'VND') => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(value);
  };

  function StatCard({ title, value, change, trend, icon: Icon, color }: any) {
    const colors: any = {
      indigo: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800',
      emerald: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800',
      purple: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-800',
    };

    return (
      <div className="bento-item p-6 group">
        <div className="flex items-center justify-between mb-4">
          <div className={cn("p-2 rounded-xl border", colors[color] || colors.indigo)}>
            <Icon className="w-5 h-5" />
          </div>
          <div className={cn(
            "flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded border",
            trend === 'up' ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-800" : "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 border-rose-100 dark:border-rose-800"
          )}>
            {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {change}
          </div>
        </div>
        <h4 className="text-slate-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest">{title}</h4>
        <p className="text-2xl font-bold font-mono mt-1 text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors tracking-tighter">{value}</p>
      </div>
    );
  }

  function TrendingJobCard({ job }: { job: TrendingJob }) {
    const getTrendIcon = () => {
      switch (job.trend) {
        case 'up':
          return <TrendingUp className="w-4 h-4 text-emerald-600" />;
        case 'down':
          return <TrendingDown className="w-4 h-4 text-rose-600" />;
        default:
          return <Minus className="w-4 h-4 text-gray-400" />;
      }
    };

    const getTrendColor = () => {
      switch (job.trend) {
        case 'up':
          return 'text-emerald-600 bg-emerald-50 border-emerald-100';
        case 'down':
          return 'text-rose-600 bg-rose-50 border-rose-100';
        default:
          return 'text-gray-600 bg-gray-50 border-gray-100';
      }
    };

    const getUrgencyColor = () => {
      switch (job.urgency) {
        case 'high':
          return 'bg-red-100 text-red-700 border-red-200';
        case 'medium':
          return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        default:
          return 'bg-green-100 text-green-700 border-green-200';
      }
    };

    return (
      <motion.div
        whileHover={{ y: -2 }}
        className="bento-item p-6 cursor-pointer group flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-bold text-base text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">
                {job.title}
              </h3>
              <div className={cn("flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border shrink-0", getTrendColor())}>
                {getTrendIcon()}
                {job.trendPercentage > 0 ? '+' : ''}{job.trendPercentage}%
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600 mb-2">
              <div className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate max-w-[160px]">{job.company}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>{job.location}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <div className="flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-mono text-sm font-bold text-emerald-700">{job.salary}</span>
              </div>
              <div className="flex items-center gap-1 text-slate-400">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span className="text-xs">{job.posted}</span>
              </div>
            </div>
          </div>
          <div className={cn("px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border", getUrgencyColor())}>
            {job.urgency}
          </div>
        </div>

        <div className="space-y-2">
          {job.description && (
            <p className="text-xs text-slate-600 mb-3 line-clamp-3">{job.description}</p>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Skills:</span>
            <div className="flex flex-wrap gap-1">
              {job.skills.slice(0, 3).map((skill, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-medium rounded border border-indigo-100"
                >
                  {skill}
                </span>
              ))}
              {job.skills.length > 3 && (
                <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-medium rounded border border-slate-200">
                  +{job.skills.length - 3} more
                </span>
              )}
          <div className="flex flex-col items-end gap-1 ml-2 shrink-0">
            <div className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border", getUrgencyColor())}>
              {job.urgency === 'high' ? 'Gấp' : job.urgency === 'medium' ? 'Bình thường' : 'Thường'}
            </div>
            {job.source && (
              <span className="text-[9px] text-slate-400 font-mono">
                {job.source === 'vietnamworks' ? 'VNW' : job.source === 'itviec' ? 'ITViec' : job.source}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        {job.description ? (
          <p className="text-xs text-slate-600 leading-relaxed mb-3 line-clamp-3 flex-1">
            {job.description}
          </p>
        ) : (
          <p className="text-xs text-slate-400 italic mb-3 flex-1">Xem chi tiết tại trang tuyển dụng.</p>
        )}

        {/* Skills */}
        <div className="flex flex-wrap gap-1 mb-3">
          {job.skills.slice(0, 4).map((skill, index) => (
            <span key={index} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-medium rounded border border-indigo-100">
              {skill}
            </span>
          ))}
          {job.skills.length > 4 && (
            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded border border-slate-200">
              +{job.skills.length - 4}
            </span>
          )}
        </div>

        {/* Footer: category + apply button */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-auto">
          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-medium rounded border border-purple-100 truncate max-w-[140px]">
            {job.category}
          </span>
          {(job.apply_url || job.url) ? (
            <a
              href={job.apply_url || job.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors shrink-0"
            >
              Ứng tuyển ngay
              <ChevronRight className="w-3 h-3" />
            </a>
          ) : (
            <span className="text-[10px] text-slate-400 italic">Chưa có link</span>
          )}
        </div>
      </motion.div>
    );
  }

  const handleCategoryClick = (category: any) => {
    if (expandedCategory === category.id) {
      setExpandedCategory(null);
      return;
    }
    setExpandedCategory(category.id);
    setLoadingCategoryJobs(true);
    setShowAllCategoryJobs(false);

    // Simulate fetching jobs from VietnamWorks API
    setTimeout(() => {
      const generatedJobs = [];
      const companies = ['VietnamTech Group', 'Global Solutions', 'Startup VN', 'FPT Software', 'VNG Corporation', 'Tiki', 'Shopee', 'Momo'];
      const locations = ['Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ'];
      const titles = ['Chuyên viên', 'Quản lý', 'Nhân viên', 'Trưởng phòng', 'Thực tập sinh', 'Kỹ sư', 'Chuyên gia', 'Giám đốc'];
      const jobCount = Math.floor(Math.random() * 11) + 10; // Generate 10 to 20 jobs

      for (let i = 0; i < jobCount; i++) {
        generatedJobs.push({
          id: `job-${i}-${category.id}`,
          title: `${titles[i % titles.length]} ${category.vietnamese_name}`,
          company: companies[i % companies.length],
          location: locations[i % locations.length],
          salary: i % 2 === 0 ? 'Thoả thuận' : `${10 + i * 5},000,000 - ${20 + i * 5},000,000 VND`,
          posted: `${i + 1} giờ trước`,
          description: `Vị trí ${titles[i % titles.length]} trong lĩnh vực ${category.vietnamese_name} yêu cầu ứng viên có chuyên môn và kinh nghiệm thực tế. Bạn sẽ được làm việc trong môi trường chuyên nghiệp, tham gia vào các dự án quan trọng và có lộ trình thăng tiến rõ ràng tại ${companies[i % companies.length]}.`
        });
      }
      setCategoryJobs(generatedJobs);
      setLoadingCategoryJobs(false);
    }, 600);
  };

  function CategoryCard({ category, isGrid }: { category: any, isGrid: boolean }) {
    const isExpanded = expandedCategory === category.id;
    const displayedJobs = showAllCategoryJobs ? categoryJobs : categoryJobs.slice(0, 3);

    return (
      <motion.div
        className={cn(
          "p-3 rounded-lg bg-slate-50 border border-slate-100 hover:border-indigo-100 hover:bg-white transition-all cursor-pointer",
          isExpanded && isGrid ? "col-span-2 shadow-md ring-1 ring-indigo-500" : "",
          isExpanded && !isGrid ? "shadow-md ring-1 ring-indigo-500" : ""
        )}
      >
        <div
          className={cn("flex items-center justify-between", isGrid && !isExpanded ? "items-start" : "")}
          onClick={() => handleCategoryClick(category)}
        >
          <div className="flex-1">
            <h4 className="text-xs font-bold text-slate-800 mb-1">{category.vietnamese_name}</h4>
            <p className="text-[10px] text-slate-500">{category.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full font-medium">
              {category.category_group}
            </span>
            <ChevronRight className={cn("w-3 h-3 text-slate-400 transition-transform", isExpanded ? "rotate-90" : "")} />
          </div>
        </div>

        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 pt-4 border-t border-slate-200"
          >
            <div className="mb-4 bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Nhóm ngành:</span>
                  <span className="text-xs font-bold text-indigo-700">{category.category_group}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ngành nghề:</span>
                  <span className="text-xs font-bold text-slate-700">{category.vietnamese_name}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                  {categoryJobs.length} vị trí mở
                </span>
              </div>
            </div>

            <h5 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-3">Công việc đang tuyển</h5>

            {loadingCategoryJobs ? (
              <div className="flex justify-center py-6">
                <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                {displayedJobs.map(job => (
                  <div key={job.id} className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm flex flex-col hover:border-indigo-200 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <h6 className="text-sm font-bold text-indigo-700">{job.title}</h6>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-1">
                          <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {job.company}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location}</span>
                        </div>
                      </div>
                      <div className="flex flex-col sm:items-end gap-1 shrink-0">
                        <span className="text-xs font-bold text-emerald-600">{job.salary}</span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {job.posted}</span>
                      </div>
                    </div>
                    {job.description && (
                      <p className="mt-2 text-xs text-slate-600 border-t border-slate-100 pt-2">{job.description}</p>
                    )}
                  </div>
                ))}

                {!showAllCategoryJobs && categoryJobs.length > 3 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowAllCategoryJobs(true); }}
                    className="w-full mt-3 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
                  >
                    Xem thêm {categoryJobs.length - 3} công việc <ChevronDown className="w-3 h-3" />
                  </button>
                )}

                {showAllCategoryJobs && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowAllCategoryJobs(false); }}
                    className="w-full mt-3 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
                  >
                    Thu gọn <ChevronUp className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </motion.div>
    );
  }

  if (isLoading) return <div className="animate-pulse space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-100 rounded-3xl border border-slate-200"></div>)}
    </div>
    <div className="h-96 bg-slate-50 rounded-3xl border border-slate-200"></div>
  </div>;

  return (
    <div className={cn("space-y-8 pb-12 bg-[#F8FAFC] dark:bg-gray-900 min-h-screen pt-6 pl-8 pr-8", theme === 'dark' && 'trends-page-dark')}>
      {/* CSS Styles */}
      <style>{`
        .bento-item {
          @apply bg-white dark:bg-gray-800 rounded-3xl border border-slate-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-300;
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
        .line-clamp-2 {
          overflow: hidden;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }
        .line-clamp-3 {
          overflow: hidden;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 3;
        }
      `}</style>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Phân tích thị trường</h1>
        <button
          onClick={() => refetch()}
          className="p-2 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-gray-700 rounded-lg transition-all"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          Phân tích thị trường
        </h1>
        <p className="text-sm text-slate-500 mt-1">Dữ liệu việc làm được cập nhật tự động mỗi giờ</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="LƯƠNG TRUNG BÌNH"
          value={formatCurrency(marketMetrics?.avg_salary || 0)}
          change="+8.4%"
          change={`${marketMetrics?.job_postings || 0} tin`}
          trend="up"
          icon={TrendingUp}
          color="indigo"
        />
        <StatCard
          title="TIN TUYỂN DỤNG"
          value={(marketMetrics?.job_postings || 0).toLocaleString()}
          change="+12.1%"
          change="đang hoạt động"
          trend="up"
          icon={Briefcase}
          color="indigo"
        />
        <StatCard
          title="SỨC KHỎE THỊ TRƯỜNG"
          value={marketMetrics?.market_health || 0}
          change="-2.5%"
          trend="down"
          icon={RefreshCw}
          color="emerald"
        />
        <StatCard
          title="TỐC ĐỘ TUYỂN DỤNG"
          value={`${marketMetrics?.recruitment_speed || 0}d`}
          change="+0.5d"
          trend="up"
          icon={MapPin}
          title="NGÀNH ĐANG TUYỂN"
          value={uniqueCategories.length || 0}
          change="nhóm ngành"
          trend="up"
          icon={Users}
          color="emerald"
        />
        <StatCard
          title="CẬP NHẬT GẦN NHẤT"
          value={lastRefreshed.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          change="tự động mỗi 1h"
          trend="up"
          icon={Clock}
          color="purple"
        />
      </div>

      {/* ═══ ANALYTICS SECTION — Biểu đồ phân tích ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Trending Jobs Section */}
        <div className="lg:col-span-3">
          <div className="bento-item p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl">
                  <Flame className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Việc làm thịnh hành</h3>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Cơ hội việc làm nổi bật theo xu hướng thị trường</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-bold">
                  Xem tất cả
                </button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col lg:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo tên công việc, công ty, kỹ năng..."
                    value={jobSearch}
                    onChange={(e) => setJobSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                  />
                  <svg className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={jobFilter}
                  onChange={(e) => setJobFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm bg-white"
                >
                  <option value="all">Tất cả danh mục</option>
                  {uniqueCategories.map((category: string) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm bg-white"
                >
                  <option value="trend">Xu hướng</option>
                  <option value="salary">Lương</option>
                  <option value="applicants">Ứng viên</option>
                  <option value="posted">Ngày đăng</option>
                </select>
              </div>
            </div>

            {/* Job Cards Grid */}
            <div className="space-y-8">
              {filteredJobs.length > 0 ? (
                Object.entries(
                  filteredJobs.reduce((acc: any, job: TrendingJob) => {
                    const cat = job.category || 'Khác';
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(job);
                    return acc;
                  }, {})
                ).map(([categoryName, jobsInCategory]: [string, any]) => {
                  const isExpanded = expandedTrendCategories[categoryName];
                  const displayedJobs = isExpanded ? jobsInCategory : jobsInCategory.slice(0, 6);
                  const hasMore = jobsInCategory.length > 6;

                  return (
                    <div key={categoryName} className="mb-8">
                      <div className="flex items-center justify-between mb-4 border-b border-indigo-100 pb-2">
                        <h4 className="text-md font-bold text-indigo-700">{categoryName} <span className="text-sm font-normal text-slate-500">({jobsInCategory.length})</span></h4>
                        {hasMore && (
                          <button
                            onClick={() => toggleTrendCategory(categoryName)}
                            className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 transition-colors flex items-center gap-1"
                          >
                            {isExpanded ? 'Thu gọn' : `Xem thêm ${jobsInCategory.length - 6} việc`}
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {displayedJobs.map((job: TrendingJob) => (
                          <TrendingJobCard key={job.id} job={job} />
                        ))}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="col-span-full text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Không tìm thấy công việc</h3>
                  <p className="text-slate-500">Thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm của bạn</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Chart */}
        {/* Lương theo ngành */}
        <div className="lg:col-span-2 bento-item p-4 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="font-bold text-lg text-slate-900">Mức lương theo nhóm ngành</h3>
              <p className="text-xs text-slate-500 mt-1">Lương trung bình (triệu VND) từ dữ liệu tuyển dụng thực tế</p>
            </div>
          </div>
          <div style={{ height: Math.max(280, (safeTrends.salary_growth?.length || 5) * 40) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={safeTrends.salary_growth} layout="vertical" margin={{ left: 10, right: 20 }}>
                <defs>
                  <linearGradient id="colorSal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #E2E8F0', color: '#1E293B' }}
                  <linearGradient id="salaryGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10 }} unit=" tr" />
                <YAxis dataKey="period" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11 }} width={130} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #E2E8F0' }}
                  formatter={(value: any) => [`${value} triệu VND`, 'Lương TB']}
                />
                <Bar dataKey="average" fill="url(#salaryGradient)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Kỹ năng thịnh hành */}
        <div className="bento-item p-4 sm:p-8 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Kỹ năng thịnh hành</h3>
            <TrendingUp className="text-emerald-500 w-5 h-5" />
          </div>
          <p className="text-[10px] text-slate-400 mb-4">Kỹ năng được yêu cầu nhiều nhất từ tất cả ngành nghề</p>
          <div className="space-y-3 flex-1">
            {safeTrends.trending_skills.slice(0, 10).map((skill: SkillData, i: number) => (
              <div key={skill.skill} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-400 border border-slate-100">
                  #{i + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-700">{skill.skill}</p>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (skill.trend_score / (safeTrends.trending_skills[0]?.trend_score || 1)) * 100)}%` }}
                      className="bg-emerald-500 h-full rounded-full shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-mono text-emerald-600 font-bold">{skill.trend_score} jobs</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        {/* Nhu cầu theo ngành */}
        <div className="bento-item p-4 sm:p-8">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Nhu cầu theo ngành</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={safeTrends.industry_demand} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis type="number" hide />
                <YAxis dataKey="industry" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} width={120} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #E2E8F0' }} />
                <Bar dataKey="growth" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          <div className="h-80 overflow-y-auto">
            <div style={{ height: Math.max(300, (safeTrends.industry_demand?.length || 5) * 32) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={safeTrends.industry_demand} layout="vertical" margin={{ left: 0, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10 }} />
                  <YAxis dataKey="industry" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11 }} width={160} />
                  <Tooltip
                    cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #E2E8F0' }}
                    formatter={(value: any) => [`${value} tin tuyển dụng`, 'Nhu cầu']}
                  />
                  <Bar dataKey="growth" radius={[0, 4, 4, 0]}>
                    {(safeTrends.industry_demand || []).map((_: any, index: number) => {
                      const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f97316', '#14b8a6', '#ef4444', '#3b82f6', '#84cc16', '#a855f7', '#f43f5e'];
                      return <Cell key={index} fill={colors[index % colors.length]} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Phân bổ khu vực */}
        <div className="bento-item p-4 sm:p-8">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Phân bổ khu vực</h3>
          <div className="space-y-6">
            {(safeTrends.regional_demand || []).map((reg: any, index: number) => (
              <div key={`region-${index}-${reg.region || reg.city}`} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.4)]" />
                  <span className="text-sm font-medium text-slate-600">{reg.region || reg.city}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold font-mono text-slate-900">{reg.posts || reg.count} tin</span>
                  <span className="text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded border border-orange-100 font-bold">
                    {reg.change || '+0%'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ JOB LISTINGS SECTION — Việc làm thịnh hành ═══ */}
      <div className="bento-item p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-slate-900">Việc làm thịnh hành</h3>
                {dataSource === 'live_scrape' && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full uppercase tracking-wide">
                    🟢 Dữ liệu thật
                  </span>
                )}
                {dataSource === 'fallback_db' && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200 rounded-full uppercase tracking-wide">
                    🔵 Từ cơ sở dữ liệu
                  </span>
                )}
                {(dataSource === 'mock' || dataSource === 'fallback_mock') && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 rounded-full uppercase tracking-wide">
                    Dữ liệu mẫu
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mt-0.5">
                {dataSource === 'live_scrape'
                  ? `${trendingJobs.length} việc làm`
                  : 'Cơ hội việc làm nổi bật theo xu hướng thị trường'}
              </p>
            </div>
          </div>
          <div className="space-y-4 overflow-y-auto pr-2">
            {liveLogs.map((log: LogData, index: number) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-3 rounded-lg bg-slate-50 border border-slate-100 hover:border-indigo-100 hover:bg-white transition-colors"
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[11px] font-bold text-indigo-600">{log.skill}</span>
                  <span className="text-[9px] text-slate-400 font-mono tracking-tighter">{log.time}</span>
                </div>
                <p className="text-[10px] leading-relaxed text-slate-500">{log.meta}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-[2px] bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-300" style={{ width: `${(log.match || log.score || 0.85) * 100}%` }} />
                  </div>
                  <span className="text-[9px] text-slate-400 font-bold">Độ khớp: {(log.match || log.score || 0.85).toFixed(2)}</span>
                </div>
              </motion.div>
            ))}
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] text-slate-400 font-mono">
                {refreshStatus
                  ? <span className={cn("font-semibold", isRefreshingJobs ? "text-orange-500 animate-pulse" : "text-emerald-600")}>{refreshStatus}</span>
                  : <>Cập nhật lúc {lastRefreshed.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</>
                }
              </span>
              <button
                onClick={handleRefreshJobs}
                disabled={isRefreshingJobs}
                className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <RefreshCw className={cn("w-4 h-4", isRefreshingJobs && "animate-spin")} />
                {isRefreshingJobs ? 'Đang lấy dữ liệu...' : 'Tải lại'}
              </button>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm kiếm theo tên công việc, công ty, kỹ năng..."
                value={jobSearch}
                onChange={(e) => setJobSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
              />
              <svg className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={jobFilter}
              onChange={(e) => setJobFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm bg-white"
            >
              <option value="all">Tất cả danh mục</option>
              {uniqueCategories.map((category: string) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm bg-white"
            >
              <option value="trend">Xu hướng</option>
              <option value="salary">Lương</option>
              <option value="applicants">Ứng viên</option>
              <option value="posted">Ngày đăng</option>
            </select>
          </div>
        </div>

        {/* Job Cards Grid */}
        <div className={cn("space-y-8 relative", isRefreshingJobs && "opacity-50 pointer-events-none")}>
          {isRefreshingJobs && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-white/60 rounded-2xl min-h-[200px]">
              <RefreshCw className="w-8 h-8 text-orange-500 animate-spin mb-3" />
              <p className="text-sm font-semibold text-orange-600 animate-pulse">{refreshStatus || 'Đang lấy dữ liệu mới nhất...'}</p>
              <p className="text-xs text-slate-400 mt-1">Playwright đang scrape VietnamWorks & ITViec</p>
            </div>
          )}
          {filteredJobs.length > 0 ? (
            Object.entries(
              filteredJobs.reduce((acc: any, job: TrendingJob) => {
                const cat = job.category || 'Khác';
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(job);
                return acc;
              }, {})
            ).map(([categoryName, jobsInCategory]: [string, any]) => {
              const isExpanded = expandedTrendCategories[categoryName];
              const displayedJobs = isExpanded ? jobsInCategory : jobsInCategory.slice(0, 6);
              const hasMore = jobsInCategory.length > 6;

              return (
                <div key={categoryName} className="mb-8">
                  <div className="flex items-center justify-between mb-4 border-b border-indigo-100 pb-2">
                    <h4 className="text-md font-bold text-indigo-700">{categoryName} <span className="text-sm font-normal text-slate-500">({jobsInCategory.length})</span></h4>
                    {hasMore && (
                      <button
                        onClick={() => toggleTrendCategory(categoryName)}
                        className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 transition-colors flex items-center gap-1"
                      >
                        {isExpanded ? 'Thu gọn' : `Xem thêm ${jobsInCategory.length - 6} việc`}
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayedJobs.map((job: TrendingJob) => (
                      <TrendingJobCard key={job.id} job={job} />
                    ))}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="col-span-full text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Không tìm thấy công việc</h3>
              <p className="text-slate-500">Thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm của bạn</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default TrendsPage;
