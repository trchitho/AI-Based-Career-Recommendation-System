import api from '../lib/api';

export const feedbackService = {
  async submit(assessmentId: string, rating: number, comment?: string) {
    const res = await api.post(`/api/assessments/${assessmentId}/feedback`, { rating, comment });
    return res.data;
  },
};

