// src/services/roadmapService.ts
import api from '../lib/api';
import { Roadmap } from '../types/roadmap';

export interface TraitEvidence {
  scale: string;
  items: string[];
  riasec?: TraitEvidenceGroup | null;
  big_five?: TraitEvidenceGroup | null;
}

export interface TraitEvidenceItem {
  question_key: string;
  question: string;
  answer: string;
  score?: number | null;
}

export interface TraitEvidenceGroup {
  kind: 'riasec' | 'big_five' | string;
  code: string;
  name: string;
  score?: number | null;
  assessment_id?: number | null;
  items: TraitEvidenceItem[];
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
