import api from '../lib/api';
import {
  AdminDashboardMetrics,
  AIMetrics,
  Career,
  CareerFormData,
  Skill,
  SkillFormData,
  Question,
  QuestionFormData,
  FeedbackFilters,
} from '../types/admin';

export const adminService = {
  // Dashboard Metrics
  async getDashboardMetrics(): Promise<AdminDashboardMetrics> {
    const response = await api.get('/api/admin/dashboard');
    return response.data;
  },

  async getAIMetrics(): Promise<AIMetrics> {
    const response = await api.get('/api/admin/ai-metrics');
    return response.data;
  },

  async getUserFeedback(filters?: FeedbackFilters) {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.minRating) params.append('minRating', filters.minRating.toString());

    const response = await api.get(`/api/admin/feedback?${params.toString()}`);
    return response.data;
  },

  // Career Management
  async getAllCareers(industryCategory?: string): Promise<Career[]> {
    const params = industryCategory ? `?industryCategory=${industryCategory}` : '';
    const response = await api.get(`/api/admin/careers${params}`);
    return response.data;
  },

  async getCareer(careerId: string): Promise<Career> {
    const response = await api.get(`/api/admin/careers/${careerId}`);
    return response.data;
  },

  async createCareer(data: CareerFormData): Promise<Career> {
    const response = await api.post('/api/admin/careers', {
      title: data.title,
      description: data.description,
      requiredSkills: data.requiredSkills,
      salaryRange: data.salaryRange,
      industryCategory: data.industryCategory,
      riasecProfile: data.riasecProfile,
    });
    return response.data.career;
  },

  async updateCareer(careerId: string, data: Partial<CareerFormData>): Promise<Career> {
    const response = await api.put(`/api/admin/careers/${careerId}`, {
      title: data.title,
      description: data.description,
      requiredSkills: data.requiredSkills,
      salaryRange: data.salaryRange,
      industryCategory: data.industryCategory,
      riasecProfile: data.riasecProfile,
    });
    return response.data.career;
  },

  async deleteCareer(careerId: string): Promise<void> {
    await api.delete(`/api/admin/careers/${careerId}`);
  },

  // Skill Management
  async getAllSkills(): Promise<Skill[]> {
    const response = await api.get('/api/admin/skills');
    return response.data;
  },

  async getSkill(skillId: string): Promise<Skill> {
    const response = await api.get(`/api/admin/skills/${skillId}`);
    return response.data;
  },

  async createSkill(data: SkillFormData): Promise<Skill> {
    const response = await api.post('/api/admin/skills', {
      name: data.name,
      description: data.description,
      category: data.category,
      proficiencyLevels: data.proficiencyLevels,
      learningResources: data.learningResources,
    });
    return response.data.skill;
  },

  async updateSkill(skillId: string, data: Partial<SkillFormData>): Promise<Skill> {
    const response = await api.put(`/api/admin/skills/${skillId}`, {
      name: data.name,
      description: data.description,
      category: data.category,
      proficiencyLevels: data.proficiencyLevels,
      learningResources: data.learningResources,
    });
    return response.data.skill;
  },

  async deleteSkill(skillId: string): Promise<void> {
    await api.delete(`/api/admin/skills/${skillId}`);
  },

  // Question Management
  async getAllQuestions(testType?: string, isActive?: boolean): Promise<Question[]> {
    const params = new URLSearchParams();
    if (testType) params.append('testType', testType);
    if (isActive !== undefined) params.append('isActive', isActive.toString());

    const response = await api.get(`/api/admin/questions?${params.toString()}`);
    return response.data;
  },

  async getQuestion(questionId: string): Promise<Question> {
    const response = await api.get(`/api/admin/questions/${questionId}`);
    return response.data;
  },

  async createQuestion(data: QuestionFormData): Promise<Question> {
    const response = await api.post('/api/admin/questions', {
      text: data.text,
      testType: data.testType,
      dimension: data.dimension,
      questionType: data.questionType,
      options: data.options,
      scaleRange: data.scaleRange,
    });
    return response.data.question;
  },

  async updateQuestion(questionId: string, data: Partial<QuestionFormData & { isActive: boolean }>): Promise<Question> {
    const response = await api.put(`/api/admin/questions/${questionId}`, {
      text: data.text,
      dimension: data.dimension,
      options: data.options,
      scaleRange: data.scaleRange,
      isActive: data.isActive,
    });
    return response.data.question;
  },

  async deleteQuestion(questionId: string): Promise<void> {
    await api.delete(`/api/admin/questions/${questionId}`);
  },

  // Users Management
  async listUsers(): Promise<any[]> {
    const res = await api.get('/api/admin/users');
    return res.data;
  },
  async createUser(data: { email: string; password: string; full_name?: string; role?: 'admin' | 'user' | 'manager' }): Promise<any> {
    const res = await api.post('/api/admin/users', data);
    return res.data;
  },
  async updateUser(userId: string, data: Partial<{ full_name: string; role: 'admin' | 'user' | 'manager'; is_locked: boolean; password: string }>): Promise<any> {
    const res = await api.patch(`/api/admin/users/${userId}`, data);
    return res.data;
  },

  // App Settings
  async getSettings(): Promise<any> {
    const res = await api.get('/api/admin/settings');
    return res.data;
  },
  async updateSettings(payload: Partial<{ logo_url: string; app_title: string; app_name: string; footer_html: string }>): Promise<any> {
    const res = await api.put('/api/admin/settings', payload);
    return res.data;
  },

  // Blog Management
  async listPosts(): Promise<any[]> {
    const res = await api.get('/api/admin/blog');
    return res.data;
  },
  async createPost(data: { title: string; slug?: string; content_md?: string; status?: string }): Promise<any> {
    const res = await api.post('/api/admin/blog', data);
    return res.data;
  },
  async updatePost(postId: string, data: Partial<{ title: string; slug: string; content_md: string; status: string }>): Promise<any> {
    const res = await api.put(`/api/admin/blog/${postId}`, data);
    return res.data;
  },
  async deletePost(postId: string): Promise<void> {
    await api.delete(`/api/admin/blog/${postId}`);
  },
  async listComments(): Promise<any[]> {
    const res = await api.get('/api/admin/comments');
    return res.data;
  },
  async deleteComment(commentId: string): Promise<void> {
    await api.delete(`/api/admin/comments/${commentId}`);
  },
};
