/**
 * Service for Skill Gap Analysis API
 */
import axios from 'axios';
import api from '../lib/api';
import { SkillGapAnalysis, HeatmapData, InterviewPrepData, LearningPlan } from '../types/skillGap';

const API_BASE_URL = '/api/skill-gap';
const AI_REQUEST_TIMEOUT_MS = 180_000;

function apiError(error: unknown, fallback: string): Error {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error : new Error(fallback);
  }

  const status = error.response?.status;
  const data = error.response?.data;
  const detail = data?.detail;
  const message = typeof detail === 'string'
    ? detail
    : detail?.message || data?.message || error.message || fallback;

  const normalized: any = new Error(message);
  normalized.response = error.response
    ? { status, data }
    : undefined;
  return normalized;
}

class SkillGapService {
  /**
   * Upload CV và phân tích skill gap
   */
  async analyzeCV(careerId: string, cvFile: File): Promise<any> {
    const formData = new FormData();
    formData.append('career_id', careerId);
    formData.append('cv_file', cvFile);

    try {
      const response = await api.post(`${API_BASE_URL}/analyze`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: AI_REQUEST_TIMEOUT_MS,
      });
      if (!response.data) {
        throw new Error('Máy chủ không trả về kết quả phân tích CV.');
      }
      return response.data;
    } catch (error) {
      throw apiError(error, 'Không thể phân tích CV. Vui lòng thử lại.');
    }
  }

  /**
   * Lấy danh sách phân tích của user
   */
  async getMyAnalyses(limit: number = 10): Promise<SkillGapAnalysis[]> {
    try {
      const response = await api.get(`${API_BASE_URL}/my-analyses`, {
        params: { limit },
      });
      return response.data;
    } catch (error) {
      throw apiError(error, 'Không thể tải lịch sử phân tích CV.');
    }
  }

  /**
   * Lấy chi tiết một phân tích
   */
  async getAnalysisDetail(analysisId: number): Promise<SkillGapAnalysis> {
    try {
      const response = await api.get(`${API_BASE_URL}/analysis/${analysisId}`);
      return response.data;
    } catch (error) {
      throw apiError(error, 'Không thể tải chi tiết phân tích CV.');
    }
  }

  /**
   * Lấy dữ liệu heatmap
   */
  async getHeatmapData(analysisId: number): Promise<HeatmapData> {
    try {
      const response = await api.get(`${API_BASE_URL}/heatmap/${analysisId}`);
      return response.data;
    } catch (error) {
      throw apiError(error, 'Không thể tải bản đồ kỹ năng.');
    }
  }

  /**
   * Lấy dữ liệu chuẩn bị phỏng vấn
   */
  async getInterviewPrepData(analysisId: number): Promise<InterviewPrepData> {
    try {
      const response = await api.get(`${API_BASE_URL}/interview-prep/${analysisId}`);
      return response.data;
    } catch (error) {
      throw apiError(error, 'Không thể tải dữ liệu chuẩn bị phỏng vấn.');
    }
  }

  /**
   * Lấy lộ trình học tập AI-generated
   */
  async getLearningPlan(analysisId: number): Promise<{ success: boolean; plan: LearningPlan; career_id: string }> {
    try {
      const response = await api.get(`${API_BASE_URL}/learning-plan/${analysisId}`, {
        timeout: AI_REQUEST_TIMEOUT_MS,
      });
      return response.data;
    } catch (error) {
      throw apiError(error, 'Không thể tạo lộ trình học tập.');
    }
  }
}

export const skillGapService = new SkillGapService();
