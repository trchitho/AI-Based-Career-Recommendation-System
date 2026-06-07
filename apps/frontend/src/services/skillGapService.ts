/**
 * Service for Skill Gap Analysis API
 */
import axios from 'axios';
import api from '../lib/api';
import { SkillGapAnalysis, HeatmapData, InterviewPrepData, LearningPlan } from '../types/skillGap';

const API_BASE_URL = '/api/skill-gap';
const AI_REQUEST_TIMEOUT_MS = 180_000;

function toVietnameseError(message: string, fallback: string): string {
  const raw = String(message || '').trim();
  const lower = raw.toLowerCase();
  if (!raw) return fallback;
  if (lower.includes('network error') || lower.includes('failed to fetch')) {
    return 'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.';
  }
  if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('econnaborted')) {
    return 'Máy chủ xử lý quá lâu. Vui lòng thử lại sau vài giây.';
  }
  if (lower.includes('unexpected end of json') || lower.includes("failed to execute 'json'")) {
    return 'Máy chủ trả về phản hồi không hợp lệ. Vui lòng tải lại trang và thử lại.';
  }
  if (lower.includes('file is empty')) return 'Tệp tải lên đang rỗng. Vui lòng chọn lại CV hợp lệ.';
  if (lower.includes('file too small')) return 'Tệp tải lên quá nhỏ. Vui lòng chọn lại CV đầy đủ nội dung.';
  if (lower.includes('file too large')) return 'Tệp tải lên quá lớn. Vui lòng nén tệp hoặc chọn CV dưới 5 MB.';
  if (lower.includes('unsupported file format')) return 'Định dạng tệp không được hỗ trợ. Vui lòng tải lên PDF, JPG hoặc PNG.';
  if (lower.includes('request failed with status code')) return fallback;
  return raw;
}

function apiError(error: unknown, fallback: string): Error {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error
      ? new Error(toVietnameseError(error.message, fallback))
      : new Error(fallback);
  }

  const status = error.response?.status;
  const data = error.response?.data;
  const detail = data?.detail;
  const rawMessage = typeof detail === 'string'
    ? detail
    : detail?.message || data?.message || error.message || fallback;
  const message = toVietnameseError(rawMessage, fallback);

  const normalized: any = new Error(message);
  const normalizedData = data && typeof data === 'object'
    ? { ...data, detail: typeof detail === 'string' ? message : detail, message }
    : data;
  normalized.response = error.response
    ? { status, data: normalizedData }
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
