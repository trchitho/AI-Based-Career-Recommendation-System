import api from '../lib/api';

export interface RecommendationItem {
  career_id: string;
  score: number;
}

export const recommendationService = {
  async generate(essay?: string): Promise<{ recommendations: RecommendationItem[]; source?: string }>{
    const res = await api.post('/api/recommendations/generate', { essay });
    return res.data;
  },
};

