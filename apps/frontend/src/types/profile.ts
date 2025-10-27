export interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

export interface AssessmentHistoryItem {
  id: string;
  test_types: string[];
  completed_at: string;
  riasec_scores?: {
    realistic: number;
    investigative: number;
    artistic: number;
    social: number;
    enterprising: number;
    conventional: number;
  };
  big_five_scores?: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
}

export interface RoadmapProgress {
  id: string;
  career_id: string;
  career_title: string;
  roadmap_id: string;
  completed_milestones: string[];
  current_milestone_id?: string;
  progress_percentage: number;
  started_at: string;
  last_updated_at: string;
  milestones: Milestone[];
  estimated_total_duration: string;
}

export interface Milestone {
  order: number;
  skillName: string;
  description: string;
  estimatedDuration: string;
  resources: LearningResource[];
}

export interface LearningResource {
  title: string;
  url: string;
  type: 'course' | 'article' | 'video' | 'book';
}

export interface ProfileData {
  profile: UserProfile;
  assessmentHistory: AssessmentHistoryItem[];
  developmentProgress: RoadmapProgress[];
}
