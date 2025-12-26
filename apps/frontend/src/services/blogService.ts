import api from '../lib/api';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content_md: string;
  excerpt?: string;
  category?: string;
  tags?: string[];
  featured_image?: string;
  is_published?: boolean;
  status?: string;
  published_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateBlogData {
  title: string;
  content_md: string;
  excerpt?: string;
  category?: string;
  tags?: string[];
  featured_image?: string;
  is_published?: boolean;
}

export interface UpdateBlogData extends Partial<CreateBlogData> {
  status?: string;
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

  async createBlog(data: CreateBlogData): Promise<BlogPost> {
    const res = await api.post('/api/blog', data);
    return res.data as BlogPost;
  },

  async updateBlog(id: string, data: UpdateBlogData): Promise<BlogPost> {
    const res = await api.put(`/api/blog/${id}`, data);
    return res.data as BlogPost;
  },

  async deleteBlog(id: string): Promise<void> {
    await api.delete(`/api/blog/${id}`);
  },

  // Admin-specific methods
  async adminList(params?: { page?: number; pageSize?: number }): Promise<BlogListResponse> {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 50;
    const offset = (page - 1) * pageSize;
    const res = await api.get(`/api/admin/blog?limit=${pageSize}&offset=${offset}`);
    
    // Transform the response to match BlogListResponse format
    const posts = res.data as BlogPost[];
    return {
      items: posts,
      total: posts.length,
      limit: pageSize,
      offset: offset
    };
  },

  async adminCreate(data: CreateBlogData): Promise<BlogPost> {
    const res = await api.post('/api/admin/blog', data);
    return res.data as BlogPost;
  },

  async adminUpdate(id: string, data: UpdateBlogData): Promise<BlogPost> {
    const res = await api.put(`/api/admin/blog/${id}`, data);
    return res.data as BlogPost;
  },

  async adminDelete(id: string): Promise<void> {
    await api.delete(`/api/admin/blog/${id}`);
  },

  /**
   * Get related blog posts (excluding current post)
   */
  async getRelated(currentSlug: string, limit: number = 4): Promise<BlogPost[]> {
    try {
      // Get recent posts and filter out current one
      const res = await api.get(`/api/blog?limit=${limit + 1}&offset=0`);
      const data = res.data as BlogListResponse;
      return data.items.filter(post => post.slug !== currentSlug).slice(0, limit);
    } catch {
      return [];
    }
  },
};

