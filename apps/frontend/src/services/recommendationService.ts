// src/services/recommendationService.ts
import api from "../lib/api";

export interface CareerRecommendationDTO {
  career_id: string;
  slug?: string | null;
  job_onet?: string | null;  // O*NET code from backend
  title_vi?: string | null;
  title_en?: string | null;
  description?: string | null;
  match_score: number;
  tags: string[];
  job_zone?: number | null;
  position: number;
  display_match?: number | null;
}

export interface RecommendationsResponse {
  request_id: string | null;
  items: CareerRecommendationDTO[];
}

export const recommendationService = {
  /**
   * Gọi BFF mới:
   *   GET /api/recommendations?assessment_id=xxx&top_k=5
   */
  async getMain(
    assessmentId: string | number,
    topK: number = 5
  ): Promise<RecommendationsResponse> {
    const res = await api.get<RecommendationsResponse>("/api/recommendations", {
      params: { assessment_id: assessmentId, top_k: topK },
    });
    return res.data;
  },

  async logClick(payload: {
    career_id: string;
    position: number;
    request_id?: string | null;
    match_score?: number;
  }): Promise<void> {
    await api.post("/api/recommendations/click", payload);
  },
};
