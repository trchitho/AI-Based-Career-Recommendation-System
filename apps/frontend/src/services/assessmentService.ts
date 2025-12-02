import api from '../lib/api';
import {
  Question,
  AssessmentSubmission,
  EssaySubmission,
  EssayPrompt,
  AssessmentResults,
} from '../types/assessment';

export const assessmentService = {
  /**
   * Lấy danh sách câu hỏi cho 1 loại test.
   * FE dùng testType = 'RIASEC' hoặc 'BIGFIVE'
   * BE router sẽ normalize: BIGFIVE → BigFive.
   */
  async getQuestions(testType: 'RIASEC' | 'BIGFIVE'): Promise<Question[]> {
    const perDim = 3; // 3 câu / dimension → 33 câu tổng (RIASEC + BigFive)
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

  /**
   * Gửi toàn bộ bài làm trắc nghiệm:
   * {
   *   testTypes: ['RIASEC', 'BIGFIVE'],
   *   responses: QuestionResponse[]
   * }
   * → BE: POST /api/assessments/submit
   */
  async submitAssessment(
    submission: AssessmentSubmission,
  ): Promise<{ assessmentId: string }> {
    const response = await api.post('/api/assessments/submit', submission);
    return response.data;
  },

  /**
   * Gửi bài essay tự luận sau khi test xong.
   * BE hiện chỉ cần essayText, assessmentId gửi kèm cũng không sao.
   */
  async submitEssay(payload: EssaySubmission & { lang?: string }): Promise<void> {
    await api.post('/api/assessments/essay', {
      essayText: payload.essayText,
      ...(payload.assessmentId ? { assessmentId: payload.assessmentId } : {}),
      ...(payload.lang ? { lang: payload.lang } : {}),
    });
  },

  /**
   * Lấy prompt essay từ core.essay_prompts.
   * BE: GET /api/assessments/essay-prompt?lang=en
   */
  async getEssayPrompt(lang: string = 'en'): Promise<EssayPrompt> {
    const response = await api.get<EssayPrompt>(
      '/api/assessments/essay-prompt',
      {
        params: { lang },
      },
    );
    return response.data;
  },

  /**
   * Lấy kết quả phân tích của 1 assessment.
   */
  async getResults(assessmentId: string) {
    const response = await api.get(`/api/assessments/${assessmentId}/results`);
    return response.data;
  },

};
