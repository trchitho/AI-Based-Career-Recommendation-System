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
   * V1: tạm thời trả dữ liệu cứng, sau này sẽ đổi sang gọi API dùng
   * core.assessment_questions / core.riasec_*.
   */
  async getTraitEvidence(): Promise<TraitEvidence> {
    return {
      scale: 'Realistic (R)',
      items: [
        'I enjoy working with tools, machines, or physical equipment.',
        'I like troubleshooting how mechanical or electrical things work.',
        'I prefer practical, hands-on tasks over paperwork.',
      ],
    };
  },
};
