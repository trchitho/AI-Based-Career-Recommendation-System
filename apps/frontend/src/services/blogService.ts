import api from '../lib/api';
import { BlogPost, BlogPostCreate } from '../types/blog';

export const blogService = {
  // Get all blog posts
  async getAllPosts(): Promise<{ items: BlogPost[]; total: number }> {
    const response = await api.get('/api/blog');
    return response.data;
  },

  // Create new blog post
  async createPost(post: BlogPostCreate): Promise<BlogPost> {
    const response = await api.post('/api/blog', post);
    return response.data;
  },
};
