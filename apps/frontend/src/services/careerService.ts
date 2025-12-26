import api from '../lib/api';

export interface CareerItem {
  id: string;
  slug: string;
  title: string;
  short_desc?: string;
  description?: string;
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

// Detailed career data from BFF catalog (5 tables)
export interface CareerDetailDTO {
  onet_code: string;
  title: string;
  short_desc?: string;
  plan: string;
  allowed_sections: string[];
  locked_sections: string[];
  sections: {
    // From career_tasks
    tasks: Array<{ task_text: string; importance: number | null }>;
    // From career_technology
    technology: Array<{ category: string | null; name: string; hot_flag: boolean | null }>;
    // From career_ksas (ksa_type = 'skill')
    skills: Array<{ ksa_type: string; name: string; category?: string | null; level: number | null; importance: number | null }>;
    // From career_ksas (ksa_type = 'knowledge')
    knowledge: Array<{ ksa_type: string; name: string; category?: string | null; level: number | null; importance: number | null }>;
    // From career_ksas (ksa_type = 'ability')
    abilities: Array<{ ksa_type: string; name: string; category?: string | null; level: number | null; importance: number | null }>;
    // From career_outlook
    outlook?: { summary_md?: string | null; growth_label?: string | null; openings_est?: number | null } | null;
    // From career_overview
    overview?: {
      experience_text?: string | null;
      degree_text?: string | null;
      salary_min?: number | null;
      salary_max?: number | null;
      salary_avg?: number | null;
      salary_currency?: string | null;
    } | null;
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
   */
  async getDetail(onetCode: string, plan: string = 'free'): Promise<CareerDetailDTO> {
    const res = await api.get(`/bff/catalog/career/${onetCode}?plan=${plan}`);
    return res.data;
  },
};
