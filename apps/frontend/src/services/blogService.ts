import api from '../lib/api';
import { BlogPost, BlogPostCreate } from '../types/blog';

export const blogService = {
  // Get all blog posts for current user
  async getMyPosts(): Promise<BlogPost[]> {
    const response = await api.get('/api/essays/me');
    return response.data;
  },

  // Create new blog post
  async createPost(post: BlogPostCreate): Promise<BlogPost> {
    const response = await api.post('/api/essays', post);
    return response.data;
  },
};
