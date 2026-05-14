import api from '../lib/api';

export interface MentorMatch {
  mentor_id: number;
  user_id: number;
  mentor_name: string;
  current_position: string;
  company: string;
  bio: string;
  expertise_areas: string[];
  experience_years: number;
  available_hours_per_week: number;
  preferred_communication: string[];
  compatibility_score: number;
  skill_match_score: number;
  career_match_score: number;
  personality_score: number;
  matching_skills: string[];
  matching_reasons: string[];
  current_mentees_count: number;
  max_mentees: number;
}

export interface MenteeProfile {
  id: number;
  user_id: number;
  full_name: string;
  target_career: string;
  current_skills: string[];
  desired_skills: string[];
  learning_style: string;
  preferred_mentor_experience: string;
  riasec_scores: Record<string, number>;
  big_five_scores: Record<string, number>;
}

export interface MentorProfile {
  id: number;
  user_id: number;
  full_name: string;
  current_position: string;
  company: string;
  bio: string;
  expertise_areas: string[];
  experience_years: number;
  available_hours_per_week: number;
  preferred_communication: string[];
  max_mentees: number;
  current_mentees_count: number;
  is_active: boolean;
}

export interface MentorshipRequest {
  id: number;
  mentee_id: number;
  mentor_id: number;
  compatibility_score: number;
  status: string;
  message: string;
  response_message?: string;
  requested_at: string;
  responded_at?: string;
  mentor_name?: string;
  mentor_position?: string;
  mentor_company?: string;
  mentee_name?: string;
  mentor_user_id?: number;
  mentee_user_id?: number;
}

export interface MenteeProfileCreate {
  full_name: string;
  target_career: string;
  current_skills: string[];
  desired_skills: string[];
  learning_style: string;
  preferred_mentor_experience: string;
}

export interface MentorProfileCreate {
  full_name: string;
  current_position: string;
  company: string;
  bio: string;
  expertise_areas: string[];
  experience_years: number;
  available_hours_per_week: number;
  preferred_communication: string[];
  max_mentees: number;
}

class MentorMatchingService {
  private base = '/api/mentor-matching';

  async getMenteeProfile(): Promise<MenteeProfile> {
    const res = await api.get(`${this.base}/mentee/profile`);
    return res.data;
  }

  async createOrUpdateMenteeProfile(data: MenteeProfileCreate): Promise<{ message: string; profile_id: number }> {
    const res = await api.post(`${this.base}/mentee/profile`, data);
    return res.data;
  }

  async findMentors(): Promise<MentorMatch[]> {
    // Mentor matching runs GDS + SBERT — needs longer timeout than default 10s
    const res = await api.get(`${this.base}/mentee/find-mentors`, { timeout: 90000 });
    return res.data;
  }

  async sendMentorshipRequest(mentorId: number, message: string): Promise<{ message: string; request_id: number }> {
    const res = await api.post(`${this.base}/mentee/send-request`, { mentor_id: mentorId, message });
    return res.data;
  }

  async getMenteeRequests(): Promise<MentorshipRequest[]> {
    const res = await api.get(`${this.base}/mentee/my-requests`);
    return res.data;
  }

  async getMentorProfile(): Promise<MentorProfile> {
    const res = await api.get(`${this.base}/mentor/profile`);
    return res.data;
  }

  async createOrUpdateMentorProfile(data: MentorProfileCreate): Promise<{ message: string; profile_id: number }> {
    const res = await api.post(`${this.base}/mentor/profile`, data);
    return res.data;
  }

  async getMentorRequests(): Promise<MentorshipRequest[]> {
    const res = await api.get(`${this.base}/mentor/requests`);
    return res.data;
  }

  async respondToRequest(requestId: number, action: 'accepted' | 'rejected', responseMessage?: string): Promise<{ message: string; request_id: number }> {
    const res = await api.post(`${this.base}/mentor/respond`, {
      request_id: requestId,
      action,
      response_message: responseMessage || '',
    });
    return res.data;
  }

  async createMentorFromProfile(): Promise<{ message: string; profile_id: number; full_name: string; current_position: string; expertise_areas: string[] }> {
    const res = await api.post(`${this.base}/mentor/create-from-profile`);
    return res.data;
  }

  async createMenteeFromProfile(): Promise<{ message: string; profile_id: number; target_career: string; current_skills: string[]; desired_skills: string[] }> {
    const res = await api.post(`${this.base}/mentee/create-from-profile`);
    return res.data;
  }

  async getAllMentors(): Promise<MentorProfile[]> {
    const res = await api.get(`${this.base}/mentors`);
    return res.data;
  }

  async findMentorsForCareer(careerTitle: string, limit = 3, careerSlug?: string): Promise<MentorMatch[]> {
    const res = await api.get(`${this.base}/career-mentors`, {
      params: { career_title: careerTitle, limit, ...(careerSlug ? { career_slug: careerSlug } : {}) },
    });
    return res.data;
  }
}

export const mentorMatchingService = new MentorMatchingService();
