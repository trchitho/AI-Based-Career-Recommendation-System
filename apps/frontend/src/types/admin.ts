// Admin Dashboard Types
export interface AdminDashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  completedAssessments: number;
  totalAssessments: number;
  completionRate: number;
  usersWithRoadmaps: number;
  avgRoadmapProgress: number;
  recentAssessments: number;
}

export interface AIMetrics {
  totalRecommendations: number;
  avgRecommendationsPerAssessment: number;
  assessmentsWithEssay: number;
  avgProcessingTime: number;
  riasecDistribution: {
    realistic: string;
    investigative: string;
    artistic: string;
    social: string;
    enterprising: string;
    conventional: string;
  };
  bigFiveDistribution: {
    openness: string;
    conscientiousness: string;
    extraversion: string;
    agreeableness: string;
    neuroticism: string;
  };
}

// Career Management Types
export interface Career {
  id: string;
  title: string;
  description: string;
  required_skills: string[];
  salary_range: {
    min: number;
    max: number;
    currency: string;
  };
  industry_category: string;
  riasec_profile: {
    realistic: number;
    investigative: number;
    artistic: number;
    social: number;
    enterprising: number;
    conventional: number;
  };
  created_at: string;
  updated_at: string;
}

export interface CareerFormData {
  title: string;
  description: string;
  requiredSkills: string[];
  salaryRange: {
    min: number;
    max: number;
    currency: string;
  };
  industryCategory: string;
  riasecProfile: {
    realistic: number;
    investigative: number;
    artistic: number;
    social: number;
    enterprising: number;
    conventional: number;
  };
}

// Skill Management Types
export interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  proficiency_levels: string[];
  learning_resources: LearningResource[];
  created_at: string;
  updated_at: string;
}

export interface LearningResource {
  title: string;
  url: string;
  type: 'course' | 'article' | 'video' | 'book';
}

export interface SkillFormData {
  name: string;
  description: string;
  category: string;
  proficiencyLevels: string[];
  learningResources: LearningResource[];
}

// Question Management Types
export interface Question {
  id: string;
  text: string;
  test_type: 'RIASEC' | 'BIG_FIVE';
  dimension: string;
  question_type: 'multiple_choice' | 'scale';
  options?: string[];
  scale_range?: {
    min: number;
    max: number;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuestionFormData {
  text: string;
  testType: 'RIASEC' | 'BIG_FIVE';
  dimension: string;
  questionType: 'multiple_choice' | 'scale';
  options?: string[];
  scaleRange?: {
    min: number;
    max: number;
  };
}

// User Feedback Types
export interface UserFeedback {
  id: string;
  userId: string;
  assessmentId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface FeedbackFilters {
  startDate?: string;
  endDate?: string;
  minRating?: number;
}
