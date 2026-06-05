import api from '../lib/api';

export interface MyRoadmap {
  roadmap_id: number;
  career_id: number;
  career_title: string;
  career_slug: string | null;
  onet_code: string | null;
  roadmap_title: string | null;
  progress_percentage: number;
  completed_count: number;
  total_milestones: number;
  last_updated: string | null;
}

export interface SuggestedRoadmap {
  career_id: number;
  career_title: string;
  career_slug: string | null;
  onet_code: string | null;
  score: number;
  roadmap_id: number | null;
  roadmap_title: string | null;
  total_milestones: number;
}

export interface SkillGapPlan {
  analysis_id: number;
  career_id: string | null;
  career_title: string | null;
  onet_code: string | null;
  cv_filename?: string | null;
  match_percentage: number | null;
  missing_skills_count: number | null;
  critical_count?: number | null;
  important_count?: number | null;
  matched_count?: number | null;
  has_personalized_roadmap?: boolean;
  personalized_roadmap_id?: number | null;
  personalized_roadmap_progress?: number | null;
  personalized_last_updated?: string | null;
  personalized_completed_at?: string | null;
  learning_plan: {
    summary?: string;
    total_weeks?: number;
    phases?: Array<{
      phase: number;
      title: string;
      weeks: string;
      focus: string;
      skills: string[];
      resources: Array<{
        name: string;
        type: string;
        platform: string;
        free: boolean;
        level: string;
      }>;
    }>;
    milestones?: Array<{
      week: number;
      title: string;
      description: string;
    }>;
  } | null;
  created_at: string | null;
}

const learningPathService = {
  async getMyRoadmaps(): Promise<MyRoadmap[]> {
    const res = await api.get('/api/learning-path/my-roadmaps');
    return res.data.roadmaps;
  },

  async getSuggestedRoadmaps(): Promise<SuggestedRoadmap[]> {
    const res = await api.get('/api/learning-path/suggested-roadmaps');
    return res.data.roadmaps;
  },

  async getSkillGapPlans(): Promise<SkillGapPlan[]> {
    const res = await api.get('/api/learning-path/skill-gap-plans');
    return res.data.plans;
  },
};

export default learningPathService;
