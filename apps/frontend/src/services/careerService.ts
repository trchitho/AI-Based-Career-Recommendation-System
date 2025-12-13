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
};

