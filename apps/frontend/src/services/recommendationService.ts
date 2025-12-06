// src/services/recommendationService.ts
import api from "../lib/api"; // axios instance đã set baseURL + interceptor token

export interface CareerRecommendationDTO {
  career_id: string;
  slug?: string | null;          // slug đọc từ core.careers (ưu tiên dùng cho URL)
  title_vi?: string | null;
  title_en?: string | null;
  description?: string | null;
  match_score: number;           // score thật từ AI-core (0–1)
  tags: string[];
  job_zone?: number | null;
  position: number;              // rank position (1-based)
  display_match?: number;        // % hiển thị nếu sau này muốn tính ở BE
}

export interface RecommendationsResponse {
  request_id: string | null;
  items: CareerRecommendationDTO[];
}

export const recommendationService = {
  /**
   * Gọi backend BFF:
   *   GET /api/recommendations?top_k=...
   *
   * Mặc định: lấy 5 nghề (topK = 5).
   */
  async getMain(topK: number = 5): Promise<RecommendationsResponse> {
    const res = await api.get<RecommendationsResponse>("/api/recommendations", {
      params: { top_k: topK },
    });
    return res.data;
  },

  /**
   * Log sự kiện click vào analytics.career_events:
   *   POST /api/recommendations/click
   */
  async logClick(payload: {
    career_id: string;
    position: number;
    request_id?: string | null;
    match_score?: number;
  }): Promise<void> {
    await api.post("/api/recommendations/click", payload);
  },
};
