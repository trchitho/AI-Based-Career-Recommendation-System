/**
 * Service for Skill Gap Analysis API
 */
import { SkillGapAnalysis, HeatmapData, InterviewPrepData, LearningPlan } from '../types/skillGap';

const API_BASE_URL = '/api/skill-gap';

class SkillGapService {
  /**
   * Upload CV và phân tích skill gap
   */
  async analyzeCV(careerId: string, cvFile: File): Promise<any> {
    const formData = new FormData();
    formData.append('career_id', careerId);
    formData.append('cv_file', cvFile);

    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      
      // If detail is an object (payment required), throw it as-is
      if (typeof error.detail === 'object' && error.detail !== null) {
        const err: any = new Error('Payment required');
        err.response = { status: response.status, data: error };
        throw err;
      }
      
      // Otherwise throw as string
      throw new Error(error.detail || 'Failed to analyze CV');
    }

    return response.json();
  }

  /**
   * Lấy danh sách phân tích của user
   */
  async getMyAnalyses(limit: number = 10): Promise<SkillGapAnalysis[]> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE_URL}/my-analyses?limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch analyses');
    }

    return response.json();
  }

  /**
   * Lấy chi tiết một phân tích
   */
  async getAnalysisDetail(analysisId: number): Promise<SkillGapAnalysis> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE_URL}/analysis/${analysisId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch analysis detail');
    }

    return response.json();
  }

  /**
   * Lấy dữ liệu heatmap
   */
  async getHeatmapData(analysisId: number): Promise<HeatmapData> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE_URL}/heatmap/${analysisId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch heatmap data');
    }

    return response.json();
  }

  /**
   * Lấy dữ liệu chuẩn bị phỏng vấn
   */
  async getInterviewPrepData(analysisId: number): Promise<InterviewPrepData> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE_URL}/interview-prep/${analysisId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch interview prep data');
    }

    return response.json();
  }

  /**
   * Lấy lộ trình học tập AI-generated
   */
  async getLearningPlan(analysisId: number): Promise<{ success: boolean; plan: LearningPlan; career_id: string }> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE_URL}/learning-plan/${analysisId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to fetch learning plan');
    return response.json();
  }
}

export const skillGapService = new SkillGapService();
