/**
 * Service cho Lộ trình cá nhân hóa
 */
import api from '../lib/api';

export interface OptionItem {
  value: string;
  label: string;
  desc?: string;
}

export interface PersonalizationOptions {
  learning_goals: OptionItem[];
  prior_experiences: OptionItem[];
  weekly_patterns: OptionItem[];
  project_intensities: OptionItem[];
  target_company_types: OptionItem[];
  ai_difficulty_levels: OptionItem[];
}

export interface PersonalizationConfig {
  analysis_id: number;
  career_id: string;
  career_title: string;
  match_percentage: number | null;
  existing_skills: string[];
  missing_skills: string[];
  critical_skills: string[];
  important_skills: string[];
  total_existing: number;
  total_missing: number;
  total_critical: number;
  total_important: number;
  career_levels: Array<{
    id: number;
    name: string;
    slug: string;
    order: number;
    description: string | null;
    min_exp: number;
    max_exp: number | null;
  }>;
  trusted_sources: Array<{
    id: string;
    name: string;
    url: string;
    strength: string;
  }>;
  duration_rules: Record<string, {
    min_hours: number;
    max_hours: number;
    desc: string;
    intensity?: string;
    weekly_breaks?: number;
  }>;
  personalization_options: PersonalizationOptions;
}

export interface GenerateRoadmapPayload {
  analysis_id: number;
  level_slug: string;
  duration_months: number;
  daily_hours: number;
  study_time: string | null;
  preferred_sources: string[];
  budget_type: 'free' | 'paid' | 'mixed' | 'budget';
  max_budget: number | null;
  learning_style: 'video' | 'reading' | 'practice' | 'mixed';
  preferred_language: 'vi' | 'en';
  email_reminder: boolean;
  // Cá nhân hóa sâu
  weekly_pattern?: 'daily' | 'weekdays' | 'weekends' | 'flexible';
  project_intensity?: 'minimal' | 'balanced' | 'project_heavy';
  prior_experience?: 'none' | 'beginner' | 'intermediate' | 'advanced';
  learning_goal?: 'career_switch' | 'job_promotion' | 'skill_upgrade' | 'first_job' | 'freelance' | 'side_project';
  target_company_type?: 'startup' | 'enterprise' | 'agency' | 'remote' | 'any';
  ai_difficulty_level?: 'gentle' | 'standard' | 'intensive' | 'extreme';
  certification_priority?: boolean;
  current_position?: string;
  target_salary_range?: string;
  user_notes?: string;
}

export interface PersonalizedRoadmapSummary {
  id: number;
  career_id: string;
  career_title: string;
  level_name: string;
  duration_months: number;
  daily_hours: number;
  status: 'pending' | 'generating' | 'ready' | 'failed';
  total_missing: number;
  total_existing: number;
  budget_type: string;
  preferred_sources: string[];
  learning_style: string;
  created_at: string;
  has_data: boolean;
}

export interface PersonalizedRoadmapDetail {
  id: number;
  career_id: string;
  career_title: string;
  level_slug: string;
  level_name: string;
  duration_months: number;
  daily_hours: number;
  study_time: string | null;
  weekly_pattern?: string | null;
  ai_difficulty_level?: string | null;
  budget_type: string;
  max_budget: number | null;
  preferred_sources: string[];
  preferred_language: string;
  learning_style: string | null;
  project_intensity?: string | null;
  certification_priority?: boolean;
  prior_experience?: string | null;
  learning_goal?: string | null;
  current_position?: string | null;
  target_company_type?: string | null;
  target_salary_range?: string | null;
  user_notes?: string | null;
  missing_skills: string[];
  existing_skills: string[];
  critical_skills?: string[];
  important_skills?: string[];
  total_missing: number;
  total_existing: number;
  roadmap_data: any;
  status: string;
  generation_error: string | null;
  email_reminder_enabled: boolean;
  email_reminder_time: string | null;
  completed_course_ids?: string[];
  completed_phase_ids?: string[];
  progress_percentage?: number;
  created_at: string;
  updated_at?: string | null;
  completed_at?: string | null;
}

const personalizedRoadmapService = {
  async getConfig(analysisId: number): Promise<PersonalizationConfig> {
    const res = await api.get(`/api/learning-path/personalized/config?analysis_id=${analysisId}`);
    return res.data;
  },

  /**
   * Tạo lộ trình cá nhân hóa (Gemini AI mất 30-180s tùy độ dài, timeout 5 phút)
   */
  async generate(payload: GenerateRoadmapPayload): Promise<{ id: number; status: string; roadmap?: any; error?: string }> {
    const res = await api.post('/api/learning-path/personalized/generate', payload, { timeout: 360000 });
    return res.data;
  },

  async getMyRoadmaps(): Promise<PersonalizedRoadmapSummary[]> {
    const res = await api.get('/api/learning-path/personalized/my-roadmaps');
    return res.data.roadmaps;
  },

  async getDetail(roadmapId: number): Promise<PersonalizedRoadmapDetail> {
    const res = await api.get(`/api/learning-path/personalized/${roadmapId}`);
    return res.data;
  },
};

export default personalizedRoadmapService;
