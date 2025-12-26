import api from '../lib/api';
import {
  Question,
  AssessmentSubmission,
  EssaySubmission,
  EssayPrompt,
} from '../types/assessment';

export const assessmentService = {
  async getQuestions(testType: 'RIASEC' | 'BIGFIVE'): Promise<Question[]> {
    // Total 44 questions mixed between 11 dimensions (6 RIASEC + 5 Big Five)
    // Each dimension gets 4 questions: 6 × 4 = 24 RIASEC, 5 × 4 = 20 Big Five
    // Total: 24 + 20 = 44 questions
    const perDim = 4;
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
    const results = response.data;

    // Only save processed results if they haven't been saved yet
    // Check if the assessment already has processed scores to avoid overwriting old data
    if (!results.already_processed) {
      try {
        await this.saveProcessedResults(assessmentId, results);
      } catch (error) {
        console.warn('Failed to save processed results:', error);
        // Don't throw error - results are still valid even if saving fails
      }
    }

    return results;
  },

  async saveProcessedResults(assessmentId: string, results: any) {
    // Save the processed RIASEC and Big Five scores to database
    // Note: career_recommendations are saved separately to core.career_recommendations table
    await api.post(`/api/assessments/${assessmentId}/save-results`, {
      riasec_scores: results.riasec_scores,
      big_five_scores: results.big_five_scores,
      top_interest: results.top_interest,
      essay_analysis: results.essay_analysis
    });
  },

  async getSessionResults(sessionId: string) {
    const response = await api.get(`/api/assessments/session/${sessionId}/results`);
    return response.data;
  },

  async getUserSessions() {
    const response = await api.get('/api/assessments/user/sessions');
    return response.data;
  },

  async getHistory() {
    try {
      console.log('🔍 [AssessmentService] Getting assessment history...');

      // Get user sessions with assessment data
      const sessions = await this.getUserSessions();
      console.log('📊 [AssessmentService] Raw sessions data:', sessions);

      // Transform sessions into assessment history format
      const history = [];

      for (const session of sessions.sessions || []) {
        console.log('🔄 [AssessmentService] Processing session:', session);

        // Use session data directly since it now includes scores
        history.push({
          id: session.id || session.session_id.toString(),
          completed_at: session.created_at || session.completed_at,
          test_types: session.assessment_types ? session.assessment_types.split(', ') : [],
          riasec_scores: session.riasec_scores || undefined,
          big_five_scores: session.big_five_scores || undefined
        });
      }

      // Sort by completion date (newest first)
      history.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());

      console.log('✅ [AssessmentService] Final history:', history);
      return history;
    } catch (error) {
      console.error('❌ [AssessmentService] Failed to get assessment history:', error);
      // Return empty array instead of throwing
      return [];
    }
  },
};
