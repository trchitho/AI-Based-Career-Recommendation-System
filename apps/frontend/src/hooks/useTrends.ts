/**
 * Hook for fetching market trends data
 * Aggregates job data from VietnamWorks categories
 */
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import api from '../lib/api';

export interface SalaryTrend {
  period: string;
  average: number;
}

export interface TrendingSkill {
  skill: string;
  growth: number;
  trend_score: number;
}

export interface IndustryGrowth {
  industry: string;
  growth: number;
}

export interface RegionalDemand {
  region: string;
  posts: number;
  change: string;
}

export interface LiveSkill {
  id: number;
  skill: string;
  time: string;
  meta: string;
  score: number;
  color: string;
  match: number;
  source?: string;
}

export interface TrendingJob {
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
}

export interface MarketMetrics {
  avg_salary: number;
  salary_change: number;
  job_postings: number;
  posting_change: number;
  market_health: number;
  health_change: number;
  recruitment_speed: number;
  speed_change: number;
}

export interface TrendsSummary {
  market_metrics?: MarketMetrics;
  salary_trends: SalaryTrend[];
  top_trending: TrendingSkill[];
  industry_demand: IndustryGrowth[];
  regional_distribution: RegionalDemand[];
  live_skills: LiveSkill[];
  trending_jobs: TrendingJob[];
}

/**
 * Fetch comprehensive market trends summary
 * @returns Query result with trends data
 */
export const useTrendsSummary = (): UseQueryResult<TrendsSummary, Error> => {
  return useQuery({
    queryKey: ['trends-summary'],
    queryFn: async () => {
      try {
        const response = await api.get<TrendsSummary>('/api/trends/summary');
        return response.data;
      } catch (error) {
        console.error('Error fetching trends summary:', error);
        throw error;
      }
    },
    refetchInterval: false, // Không tự động refresh — người dùng bấm nút để tải lại
    staleTime: 5 * 60 * 1000, // Data is fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Cache for 10 minutes
  });
};

/**
 * Fetch only trending skills
 */
export const useTrendingSkills = () => {
  return useQuery({
    queryKey: ['trending-skills'],
    queryFn: async () => {
      const response = await api.get<{ skills: TrendingSkill[] }>('/api/trends/skills');
      return response.data.skills;
    },
    refetchInterval: 60000, // Refresh every minute
  });
};

/**
 * Fetch industry demand data
 */
export const useIndustryDemand = () => {
  return useQuery({
    queryKey: ['industry-demand'],
    queryFn: async () => {
      const response = await api.get<{ industries: IndustryGrowth[] }>('/api/trends/industries');
      return response.data.industries;
    },
    refetchInterval: 60000, // Refresh every minute
  });
};

/**
 * Fetch regional job distribution
 */
export const useRegionalDistribution = () => {
  return useQuery({
    queryKey: ['regional-distribution'],
    queryFn: async () => {
      const response = await api.get<{ regions: RegionalDemand[] }>('/api/trends/regions');
      return response.data.regions;
    },
    refetchInterval: 60000, // Refresh every minute
  });
};

/**
 * Fetch salary trends
 */
export const useSalaryTrends = () => {
  return useQuery({
    queryKey: ['salary-trends'],
    queryFn: async () => {
      const response = await api.get<{ trends: SalaryTrend[] }>('/api/trends/salary');
      return response.data.trends;
    },
    refetchInterval: 120000, // Refresh every 2 minutes
  });
};
