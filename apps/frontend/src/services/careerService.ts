import api from '../lib/api';

export interface CareerItem {
  id: string;
  slug: string;
  title: string;      // display title (vi preferred)
  title_vn?: string;  // tiếng Việt
  title_en?: string;  // tiếng Anh
  short_desc?: string;
  description?: string;
  description_vn?: string;
  skills?: string[];
  education_requirements?: string;
  salary_range?: string;
  job_outlook?: string;
  detailed_description?: string;
  career_path?: string;
  work_environment?: string;
  access_level?: 'basic' | 'full';
  upgrade_required?: boolean;
  premium_features_locked?: boolean;
  access_info?: any;
}

// Detailed career data from BFF catalog (all tables)
export interface CareerDetailDTO {
  onet_code: string;
  title: string;
  short_desc?: string;
  alternative_titles?: string[];
  industry_category?: string;
  language: string;
  plan: string;
  allowed_sections: string[];
  locked_sections: string[];
  sections: {
    // Original sections
    tasks: Array<{ task_text: string; importance: number | null; task_type?: string; incumbents_responding?: number }>;
    technology: Array<{
      category: string | null;
      name: string;
      example?: string;
      hot_flag: boolean | null;
      in_demand_flag?: boolean;
      commodity_code?: string;
    }>;
    skills: Array<{
      ksa_type: string;
      name: string;
      description?: string;
      category?: string | null;
      level: number | null;
      importance: number | null;
    }>;
    knowledge: Array<{
      ksa_type: string;
      name: string;
      description?: string;
      category?: string | null;
      level: number | null;
      importance: number | null;
    }>;
    abilities: Array<{
      ksa_type: string;
      name: string;
      description?: string;
      category?: string | null;
      level: number | null;
      importance: number | null;
    }>;
    outlook?: {
      summary_md?: string | null;
      growth_label?: string | null;
      openings_est?: string | null;
    } | null;
    overview?: {
      experience_text?: string | null;
      degree_text?: string | null;
      salary_min?: number | null;
      salary_max?: number | null;
      salary_avg?: number | null;
      salary_currency?: string | null;
      salary_min_en?: number | null;
      salary_max_en?: number | null;
      salary_avg_en?: number | null;
      salary_currency_en?: string | null;
      salary_bands?: any;
      salary_bands_en?: any;
    } | null;

    // New sections
    detailed_work_activities?: Array<{
      dwa_id: string;
      dwa_title: string;
      element_id?: string;
      iwa_id?: string;
    }>;
    education_requirements?: Array<{
      element_id: string;
      element_name: string;
      category: number;
      category_description: string;
      data_value: number | null;
      n?: number;
      standard_error?: number;
    }>;
    preparation?: {
      job_zone: number;
      education_summary: string;
      experience_summary: string;
      domain_source: string;
    } | null;
    wages?: {
      // US wages (when language = 'en')
      annual_median?: number;
      annual_10th_percentile?: number;
      annual_25th_percentile?: number;
      annual_75th_percentile?: number;
      annual_90th_percentile?: number;
      hourly_median?: number;
      hourly_10th_percentile?: number;
      hourly_25th_percentile?: number;
      hourly_75th_percentile?: number;
      hourly_90th_percentile?: number;
      // Vietnam wages (when language = 'vi')
      annual_median_vnd?: number;
      annual_min_vnd?: number;
      annual_max_vnd?: number;
      monthly_median_vnd?: number;
      monthly_min_vnd?: number;
      monthly_max_vnd?: number;
      region_hcm_monthly?: number;
      region_hanoi_monthly?: number;
      region_danang_monthly?: number;
      region_provinces_monthly?: number;
      // Common fields
      experience_level?: string;
      job_zone?: number;
      industry_category?: string;
      data_quality?: string;
      market_demand?: string;
    } | null;
    work_activities?: Array<{
      element_id: string;
      importance_score: number;
      level_score: number;
      combined_score: number;
      activity_rank: number;
      is_top_activity: boolean;
      element_name_vi?: string;
      element_name?: string;
      description_vi?: string;
      description?: string;
      activity_category_vi?: string;
      activity_category?: string;
    }>;
    work_context?: Array<{
      element_id: string;
      element_name: string;
      scale_id: string;
      category: number;
      category_description: string;
      data_value: number | null;
      n?: number;
      standard_error?: number;
    }>;
  };
}

export interface CareerListResponse {
  items: CareerItem[];
  total: number;
  limit: number;
  offset: number;
}

export const careerService = {
  async list(params?: { page?: number; pageSize?: number; q?: string }): Promise<CareerListResponse> {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 9;
    const offset = (page - 1) * pageSize;
    const q = params?.q ? `&q=${encodeURIComponent(params.q)}` : '';
    const res = await api.get(`/api/careers?limit=${pageSize}&offset=${offset}${q}`);
    const data = res.data || { items: [], total: 0, limit: pageSize, offset };
    return data as CareerListResponse;
  },
  async get(idOrSlug: string | number): Promise<CareerItem> {
    const res = await api.get(`/api/careers/${idOrSlug}`);
    return res.data;
  },
  /**
   * Get detailed career info from BFF catalog (tasks, salary, outlook, etc.)
   * @param onetCode - O*NET code or slug
   * @param plan - User's subscription plan (free, basic, premium, pro)
   * @param language - Language preference (en, vi)
   */
  async getDetail(onetCode: string, plan: string = 'free', language: string = 'en'): Promise<CareerDetailDTO> {
    const res = await api.get(`/bff/catalog/career/${onetCode}?plan=${plan}&language=${language}`);
    return res.data;
  },
};
