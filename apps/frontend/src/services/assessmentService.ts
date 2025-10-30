import api from "../lib/api";
import {
  Question,
  AssessmentSubmission,
  EssaySubmission,
} from "../types/assessment";

export const assessmentService = {
  async getQuestions(testType: "RIASEC" | "BIG_FIVE"): Promise<Question[]> {
    try {
      // Shuffle questions each attempt using a time-based seed
      const seed = Date.now();
      // Keep tests short and balanced by dimension
      const perDim = testType === "RIASEC" ? 4 : 4; // 24 for RIASEC, 20 for Big Five
      const response = await api.get(
        `/api/assessments/questions/${testType}?shuffle=true&seed=${seed}&per_dim=${perDim}`,
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${testType} questions:`, error);
      throw error;
    }
  },

  async submitAssessment(
    submission: AssessmentSubmission,
  ): Promise<{ assessmentId: string }> {
    try {
      const response = await api.post("/api/assessments/submit", submission);
      return response.data;
    } catch (error) {
      console.error("Error submitting assessment:", error);
      throw error;
    }
  },

  async submitEssay(essayData: EssaySubmission): Promise<void> {
    try {
      await api.post("/api/assessments/essay", essayData);
    } catch (error) {
      console.error("Error submitting essay:", error);
      throw error;
    }
  },

  async getResults(assessmentId: string): Promise<any> {
    try {
      const response = await api.get(
        `/api/assessments/${assessmentId}/results`,
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching results:", error);
      throw error;
    }
  },
};
