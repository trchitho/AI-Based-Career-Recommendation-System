import api from '../lib/api';

export interface CareerGoal {
  id: number;
  career_id?: string;
  career_name?: string;
  goal_text: string;
  goal_type: 'short_term' | 'long_term';
  target_date?: string;
  status: 'in_progress' | 'completed' | 'paused' | 'cancelled';
  priority: number;
  notes?: string;
  created_at: string;
  updated_at?: string;
  milestone_count?: number;
  completed_milestones?: number;
  progress?: number;
}

export interface GoalMilestone {
  id: number;
  title: string;
  description?: string;
  target_date?: string;
  status: 'pending' | 'in_progress' | 'completed';
  order_index: number;
  created_at: string;
  completed_at?: string;
}

export interface CreateGoalPayload {
  career_id?: string;
  career_name?: string;
  goal_text: string;
  goal_type?: 'short_term' | 'long_term';
  target_date?: string;
  priority?: number;
  notes?: string;
}

export interface UpdateGoalPayload {
  goal_text?: string;
  goal_type?: 'short_term' | 'long_term';
  target_date?: string;
  status?: 'in_progress' | 'completed' | 'paused' | 'cancelled';
  priority?: number;
  notes?: string;
}

export const goalsService = {
  async getGoals(): Promise<{ goals: CareerGoal[]; total: number }> {
    const response = await api.get('/api/goals');
    return response.data;
  },

  async getGoalDetail(goalId: number): Promise<{ goal: CareerGoal; milestones: GoalMilestone[] }> {
    const response = await api.get(`/api/goals/${goalId}`);
    return response.data;
  },

  async createGoal(payload: CreateGoalPayload): Promise<{ success: boolean; goal_id: number }> {
    const response = await api.post('/api/goals', payload);
    return response.data;
  },

  async updateGoal(goalId: number, payload: UpdateGoalPayload): Promise<{ success: boolean }> {
    const response = await api.put(`/api/goals/${goalId}`, payload);
    return response.data;
  },

  async deleteGoal(goalId: number): Promise<{ success: boolean }> {
    const response = await api.delete(`/api/goals/${goalId}`);
    return response.data;
  },

  async createMilestone(goalId: number, payload: { title: string; description?: string; target_date?: string; order_index?: number }): Promise<{ success: boolean; milestone_id: number }> {
    const response = await api.post(`/api/goals/${goalId}/milestones`, payload);
    return response.data;
  },

  async updateMilestone(goalId: number, milestoneId: number, payload: Partial<GoalMilestone>): Promise<{ success: boolean }> {
    const response = await api.put(`/api/goals/${goalId}/milestones/${milestoneId}`, payload);
    return response.data;
  },

  async deleteMilestone(goalId: number, milestoneId: number): Promise<{ success: boolean }> {
    const response = await api.delete(`/api/goals/${goalId}/milestones/${milestoneId}`);
    return response.data;
  },

  // Helper to save a career as a goal from results page
  async saveCareerAsGoal(careerId: string, careerName: string): Promise<{ success: boolean; goal_id: number }> {
    return this.createGoal({
      career_id: careerId,
      career_name: careerName,
      goal_text: `Trở thành ${careerName}`,
      goal_type: 'long_term',
      priority: 3
    });
  },

  // AI Generate milestones from roadmap
  async generateAIMilestones(goalId: number, targetMonths: number = 12): Promise<{
    success: boolean;
    milestones: GoalMilestone[];
    recommended_months: number;
    target_months: number;
    warning?: string;
    message: string;
  }> {
    const response = await api.post(`/api/goals/${goalId}/generate-milestones`, {
      target_months: targetMonths
    });
    return response.data;
  }
};
