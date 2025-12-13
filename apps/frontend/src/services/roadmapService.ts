// src/services/roadmapService.ts
import api from '../lib/api';
import { Roadmap } from '../types/roadmap';

export interface TraitEvidence {
  scale: string;
  items: string[];
}

export const roadmapService = {
  async getRoadmap(careerId: string): Promise<Roadmap> {
    const response = await api.get(`/api/careers/${careerId}/roadmap`);
    return response.data;
  },

  async completeMilestone(careerId: string, milestoneId: string): Promise<any> {
    const response = await api.post(
      `/api/careers/${careerId}/roadmap/milestone/${milestoneId}/complete`,
    );
    return response.data;
  },

  /**
   * V2: lấy trait evidence động từ backend:
   *   GET /api/careers/{careerId}/trait-evidence
   */
  async getTraitEvidence(careerId: string): Promise<TraitEvidence> {
    const res = await api.get(`/api/careers/${careerId}/trait-evidence`);
    return res.data as TraitEvidence;
  },
};
