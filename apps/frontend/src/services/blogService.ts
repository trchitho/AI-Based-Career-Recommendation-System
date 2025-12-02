import api from '../lib/api';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content_md: string;
  status?: string;
  published_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BlogListResponse {
  items: BlogPost[];
  total: number;
  limit: number;
  offset: number;
}

export const blogService = {
  async list(params?: { page?: number; pageSize?: number }): Promise<BlogListResponse> {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 10;
    const offset = (page - 1) * pageSize;
    const res = await api.get(`/api/blog?limit=${pageSize}&offset=${offset}`);
    return res.data as BlogListResponse;
  },

  async get(slug: string): Promise<BlogPost> {
    const res = await api.get(`/api/blog/${slug}`);
    return res.data as BlogPost;
    },

  async create(data: { title: string; content_md: string }): Promise<BlogPost> {
    const res = await api.post('/api/blog', data);
    return res.data as BlogPost;
  },
};

