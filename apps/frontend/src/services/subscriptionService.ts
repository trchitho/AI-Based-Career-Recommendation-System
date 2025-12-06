/**
 * Subscription Service
 * Quản lý subscription và kiểm tra giới hạn
 */
import axios from 'axios';
import { getAccessToken } from '../utils/auth';

const API_BASE = import.meta.env['VITE_API_BASE'] || 'http://localhost:8000';

export interface Plan {
    id: number;
    name: string;
    display_name: string;
    price: number;
    max_assessments_per_month: number;
    max_career_views: number;
    max_roadmap_level: number;
    can_view_all_careers: boolean;
    can_view_full_roadmap: boolean;
    description: string;
    features: string[];
}

export interface Usage {
    assessments_count: number;
    careers_viewed: number[];
    month: number;
    year: number;
}

export interface MyPlanResponse {
    plan: Plan;
    usage: Usage;
}

export interface CheckResponse {
    allowed: boolean;
    message: string;
}

/**
 * Lấy thông tin plan và usage hiện tại
 */
export const getMyPlan = async (): Promise<MyPlanResponse> => {
    const token = getAccessToken();
    const response = await axios.get(`${API_BASE}/api/subscription/my-plan`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
};

/**
 * Kiểm tra có thể làm bài test không
 */
export const checkAssessmentLimit = async (): Promise<CheckResponse> => {
    const token = getAccessToken();
    const response = await axios.get(`${API_BASE}/api/subscription/check/assessment`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
};

/**
 * Kiểm tra có thể xem nghề nghiệp không
 */
export const checkCareerAccess = async (careerId: number): Promise<CheckResponse> => {
    const token = getAccessToken();
    const response = await axios.get(`${API_BASE}/api/subscription/check/career/${careerId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
};

/**
 * Kiểm tra có thể xem roadmap level không
 */
export const checkRoadmapLevel = async (level: number): Promise<CheckResponse> => {
    const token = getAccessToken();
    const response = await axios.get(`${API_BASE}/api/subscription/check/roadmap-level/${level}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
};

/**
 * Track việc làm bài test
 */
export const trackAssessment = async (): Promise<void> => {
    const token = getAccessToken();
    await axios.post(
        `${API_BASE}/api/subscription/track/assessment`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
    );
};

/**
 * Track việc xem nghề nghiệp
 */
export const trackCareerView = async (careerId: number): Promise<void> => {
    const token = getAccessToken();
    await axios.post(
        `${API_BASE}/api/subscription/track/career/${careerId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
    );
};
