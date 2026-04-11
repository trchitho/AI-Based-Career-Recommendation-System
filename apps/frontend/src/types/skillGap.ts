/**
 * Types for Skill Gap Analysis
 */

export interface SkillInfo {
  name: string;
  category: string;
  importance?: number;
  proficiency_level?: string;
}

export interface SkillGapCategory {
  critical: SkillInfo[];
  important: SkillInfo[];
  nice_to_have: SkillInfo[];
}

export interface SkillGapAnalysis {
  id: number;
  user_id: number;
  career_id: string;
  cv_filename: string;
  cv_name?: string;
  cv_email?: string;
  cv_phone?: string;
  match_percentage: number;
  total_required_skills: number;
  matched_skills_count: number;
  missing_skills_count: number;
  cv_skills: SkillInfo[];
  matched_skills: SkillInfo[];
  skill_gaps: SkillGapCategory;
  extra_skills: Array<{ name: string; category: string }>;
  created_at: string;
}

export interface HeatmapNode {
  id: string;
  name: string;
  type: 'career' | 'matched' | 'critical_gap' | 'important_gap' | 'nice_to_have_gap';
  category?: string;
  color: string;
  importance?: number;
}

export interface HeatmapLink {
  source: string;
  target: string;
  strength: number;
  style?: 'solid' | 'dashed' | 'dotted';
}

export interface HeatmapData {
  nodes: HeatmapNode[];
  links: HeatmapLink[];
  match_percentage: number;
  career_name: string;
  legend: {
    [key: string]: {
      color: string;
      label: string;
    };
  };
}

export interface LearningResource {
  name: string;
  platform: string;
  type: 'course' | 'video' | 'docs' | 'practice';
  level: 'beginner' | 'intermediate' | 'advanced';
  free: boolean;
}

export interface LearningPhase {
  phase: number;
  title: string;
  weeks: string;
  focus: string;
  skills: string[];
  resources: LearningResource[];
}

export interface LearningMilestone {
  week: number;
  title: string;
  description: string;
}

export interface LearningPlan {
  total_weeks: number;
  summary: string;
  phases: LearningPhase[];
  milestones: LearningMilestone[];
}

export interface InterviewPrepData {
  analysis_id: number;
  career_id: string;
  match_percentage: number;
  focus_areas: {
    critical_gaps: SkillInfo[];
    important_gaps: SkillInfo[];
    matched_skills: SkillInfo[];
  };
  suggested_questions: Array<{
    skill: string;
    category: string;
    question_type: 'deep_dive' | 'verification';
    sample_question: string;
  }>;
  interview_strategy: {
    focus: string;
    difficulty_level: string;
    estimated_duration: string;
  };
}
