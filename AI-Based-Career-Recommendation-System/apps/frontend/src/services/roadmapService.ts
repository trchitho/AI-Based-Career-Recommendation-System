import api from '../lib/api';
import { Roadmap } from '../types/roadmap';

export const roadmapService = {
  async getRoadmap(careerId: string): Promise<Roadmap> {
    try {
      const response = await api.get(`/api/careers/${careerId}/roadmap`);
      return response.data;
    } catch (error) {
      console.error('Error fetching roadmap:', error);
      throw error;
    }
  },

  async completeMilestone(careerId: string, milestoneId: string): Promise<any> {
    try {
      const response = await api.post(
        `/api/careers/${careerId}/roadmap/milestone/${milestoneId}/complete`
      );
      return response.data;
    } catch (error) {
      console.error('Error completing milestone:', error);
      throw error;
    }
  },
};
