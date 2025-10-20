import api from '../lib/api';
import { Question, AssessmentSubmission, EssaySubmission } from '../types/assessment';

export const assessmentService = {
  async getQuestions(testType: 'RIASEC' | 'BIG_FIVE'): Promise<Question[]> {
    try {
      const response = await api.get(`/api/assessments/questions/${testType}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${testType} questions:`, error);
      throw error;
    }
  },

  async submitAssessment(submission: AssessmentSubmission): Promise<{ assessmentId: string }> {
    try {
      const response = await api.post('/api/assessments/submit', submission);
      return response.data;
    } catch (error) {
      console.error('Error submitting assessment:', error);
      throw error;
    }
  },

  async submitEssay(essayData: EssaySubmission): Promise<void> {
    try {
      await api.post('/api/assessments/essay', essayData);
    } catch (error) {
      console.error('Error submitting essay:', error);
      throw error;
    }
  },

  async getResults(assessmentId: string): Promise<any> {
    try {
      const response = await api.get(`/api/assessments/${assessmentId}/results`);
      return response.data;
    } catch (error) {
      console.error('Error fetching results:', error);
      throw error;
    }
  },
};
