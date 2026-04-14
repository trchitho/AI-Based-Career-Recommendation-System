import api from '../lib/api';

export interface StartInterviewRequest {
    job_id: string;
    question_count?: number;
}

export interface StartInterviewResponse {
    session_id: number;
    job_title: string;
    greeting: string;
    first_question: string;
    skills_context: Array<{
        skill_name: string;
        skill_type: string;
        importance: number;
        level: number;
    }>;
    question_count: number;
    question_distribution: {
        warm_up: number;
        technical: number;
        behavioral: number;
        situational: number;
    };
}

export interface SubmitAnswerRequest {
    session_id: number;
    answer: string;
    has_audio: boolean;
    audio_duration: number | null;
    is_skipped?: boolean;
}

export interface SubmitAnswerResponse {
    status: 'continue' | 'completed';
    evaluation?: {
        score: number;
        detailed_scores: {
            technical: number;
            logic: number;
            communication: number;
            experience: number;
            attitude: number;
        };
        score_reasoning?: {
            technical: string;
            logic: string;
            communication: string;
            experience: string;
            attitude: string;
        };
        feedback: string;
        strengths: string[];
        weaknesses: string[];
        suggestion: string;
    };
    next_question?: string;
    question_number?: number;
    question_type?: string;
    final_summary?: {
        overall_score: number;
        recommendation: 'PASS' | 'CONDITIONAL_PASS' | 'FAIL';
        summary: string;
        key_strengths: string[];
        key_weaknesses: string[];
        skill_gaps: string[];
        learning_recommendations: Array<{
            skill: string;
            priority: 'HIGH' | 'MEDIUM' | 'LOW';
            suggested_courses: string[];
            estimated_time: string;
        }>;
    };
}

export interface InterviewSession {
    id: number;
    job_title: string;
    status: 'active' | 'completed' | 'abandoned';
    started_at: string;
    completed_at?: string;
    overall_score?: number;
    recommendation?: 'PASS' | 'CONDITIONAL_PASS' | 'FAIL';
}

export interface InterviewMessage {
    id: number;
    role: 'interviewer' | 'candidate';
    content: string;
    timestamp: string;
    question_type?: string;
    question_number?: number;
    score?: number;
    detailed_scores?: {
        technical: number;
        logic: number;
        communication: number;
        experience: number;
        attitude: number;
    };
    feedback?: string;
    strengths?: string[];
    weaknesses?: string[];
    suggestion?: string;
    has_audio: boolean;
    audio_duration?: number;
}

export interface InterviewHistory {
    session: InterviewSession & {
        technical_score?: number;
        communication_score?: number;
        logic_score?: number;
        experience_score?: number;
        attitude_score?: number;
        summary?: string;
        key_strengths?: string[];
        key_weaknesses?: string[];
        skill_gaps?: string[];
        learning_recommendations?: Array<{
            skill: string;
            priority: 'HIGH' | 'MEDIUM' | 'LOW';
            suggested_courses: string[];
            estimated_time: string;
        }>;
        skills_context?: Array<{
            skill_name: string;
            skill_type: string;
            importance: number;
            level: number;
        }>;
    };
    messages: InterviewMessage[];
}

export interface SkillItem {
    skill_name: string;
    skill_type: string;
    importance: number;
    level: number;
    is_hard_skill?: boolean;
}

export interface JobInfo {
    id: string;
    title: string;
    soft_skills: SkillItem[];
    hard_skills: SkillItem[];
    hard_skills_total: number;
}

export interface AllSkillsResponse {
    job_id: string;
    job_title: string;
    skills: Array<{
        skill_name: string;
        skill_type: string;
        importance: number;
        level: number;
        rank: number;
        combined_score: number;
        is_hard_skill?: boolean;
    }>;
    total_skills: number;
}

export interface InterviewFeedback {
    session_id: number;
    question_quality: number;
    ai_accuracy: number;
    overall_experience: number;
    comments?: string;
    suggestions?: string;
}

export interface InterviewStats {
    total_interviews: number;
    completed_interviews: number;
    average_score: number;
    pass_rate: number;
    popular_jobs: Array<{
        job_title: string;
        interview_count: number;
    }>;
}

class InterviewService {
    private baseUrl = '/api/interview';

    async startInterview(jobId: string, questionCount: number = 7): Promise<StartInterviewResponse> {
        const response = await api.post<StartInterviewResponse>(`${this.baseUrl}/start`, {
            job_id: jobId,
            question_count: questionCount
        });
        return response.data;
    }

    async submitAnswer(request: SubmitAnswerRequest): Promise<SubmitAnswerResponse> {
        const response = await api.post<SubmitAnswerResponse>(`${this.baseUrl}/answer`, request);
        return response.data;
    }

    async getInterviewHistory(sessionId: number): Promise<InterviewHistory> {
        const response = await api.get<InterviewHistory>(`${this.baseUrl}/session/${sessionId}`);
        return response.data;
    }

    async getMyInterviews(limit: number = 10): Promise<{ interviews: InterviewSession[]; total: number }> {
        const response = await api.get<{ interviews: InterviewSession[]; total: number }>(
            `${this.baseUrl}/my-interviews?limit=${limit}`
        );
        return response.data;
    }

    async submitFeedback(feedback: InterviewFeedback): Promise<{ message: string }> {
        const response = await api.post<{ message: string }>(`${this.baseUrl}/feedback`, feedback);
        return response.data;
    }

    async searchJobs(query: string = '', limit: number = 20, random: boolean = false): Promise<{ jobs: Array<{ id: string; title: string; description_vi?: string }> }> {
        const params = new URLSearchParams({
            query: query,
            limit: limit.toString(),
            random: random.toString()
        });

        const response = await api.get<{ jobs: Array<{ id: string; title: string; description_vi?: string }> }>(
            `${this.baseUrl}/jobs/search?${params.toString()}`
        );
        return response.data;
    }

    async getJobInfo(jobId: string): Promise<JobInfo> {
        const response = await api.get<JobInfo>(`${this.baseUrl}/jobs/${jobId}`);
        return response.data;
    }

    async getMoreHardSkills(jobId: string, limit = 10): Promise<{ skills: SkillItem[]; total: number }> {
        const response = await api.get<{ skills: SkillItem[]; total: number }>(
            `${this.baseUrl}/jobs/${jobId}/hard-skills?limit=${limit}`
        );
        return response.data;
    }

    async getAllJobSkills(jobId: string): Promise<AllSkillsResponse> {
        const response = await api.get<AllSkillsResponse>(`${this.baseUrl}/jobs/${jobId}/skills/all`);
        return response.data;
    }

    // Admin methods
    async getInterviewStats(): Promise<InterviewStats> {
        const response = await api.get<InterviewStats>(`${this.baseUrl}/admin/stats`);
        return response.data;
    }

    // Utility methods
    getRecommendationColor(recommendation?: string): string {
        switch (recommendation) {
            case 'PASS':
                return 'text-green-600 bg-green-100';
            case 'CONDITIONAL_PASS':
                return 'text-yellow-600 bg-yellow-100';
            case 'FAIL':
                return 'text-red-600 bg-red-100';
            default:
                return 'text-gray-600 bg-gray-100';
        }
    }

    getRecommendationLabel(recommendation?: string): string {
        switch (recommendation) {
            case 'PASS':
                return 'Đạt yêu cầu';
            case 'CONDITIONAL_PASS':
                return 'Có điều kiện';
            case 'FAIL':
                return 'Chưa đạt';
            default:
                return 'Chưa có kết quả';
        }
    }

    getPriorityColor(priority: string): string {
        switch (priority) {
            case 'HIGH':
                return 'text-red-600 bg-red-100';
            case 'MEDIUM':
                return 'text-yellow-600 bg-yellow-100';
            case 'LOW':
                return 'text-green-600 bg-green-100';
            default:
                return 'text-gray-600 bg-gray-100';
        }
    }

    getPriorityLabel(priority: string): string {
        switch (priority) {
            case 'HIGH':
                return 'Cao';
            case 'MEDIUM':
                return 'Trung bình';
            case 'LOW':
                return 'Thấp';
            default:
                return 'Không xác định';
        }
    }

    formatScore(score?: number): string {
        if (score === undefined || score === null) return 'N/A';
        return `${score.toFixed(1)}/10`;
    }

    getScoreColor(score?: number): string {
        if (!score) return 'text-gray-600';
        if (score >= 8) return 'text-green-600';
        if (score >= 6) return 'text-yellow-600';
        return 'text-red-600';
    }
}

export const interviewService = new InterviewService();