import api from '../lib/api';
import {
  Question,
  AssessmentSubmission,
  EssaySubmission,
  EssayPrompt,
} from '../types/assessment';

export const assessmentService = {
  async getQuestions(testType: 'RIASEC' | 'BIGFIVE'): Promise<Question[]> {
    const perDim = 3;
    const seed = Date.now();

    const response = await api.get<Question[]>(
      `/api/assessments/questions/${testType}`,
      {
        params: {
          shuffle: true,
          seed,
          per_dim: perDim,
        },
      },
    );

    return response.data;
  },

  async submitAssessment(
    submission: AssessmentSubmission,
  ): Promise<{ assessmentId: string }> {
    const response = await api.post('/api/assessments/submit', submission);
    return response.data;
  },

  /**
   * Gửi bài essay tự luận sau khi test xong.
   * BE cần:
   *  - essayText
   *  - assessmentId (optional)
   *  - lang (optional)
   *  - promptId (id prompt lấy từ /essay-prompt)
   */
  async submitEssay(
    payload: EssaySubmission & { lang?: string; promptId?: number },
  ): Promise<void> {
    await api.post('/api/assessments/essay', {
      essayText: payload.essayText,
      ...(payload.assessmentId ? { assessmentId: payload.assessmentId } : {}),
      ...(payload.lang ? { lang: payload.lang } : {}),
      ...(payload.promptId !== undefined ? { promptId: payload.promptId } : {}),
    });
  },

  async getEssayPrompt(lang: string = 'en'): Promise<EssayPrompt> {
    const response = await api.get<EssayPrompt>(
      '/api/assessments/essay-prompt',
      {
        params: { lang },
      },
    );
    return response.data;
  },

  async getResults(assessmentId: string) {
    const response = await api.get(`/api/assessments/${assessmentId}/results`);
    return response.data;
  },
};
