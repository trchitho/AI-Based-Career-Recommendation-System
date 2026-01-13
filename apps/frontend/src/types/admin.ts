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
  totalAssessments: number;
  avgRecommendationsPerAssessment: number;
  assessmentsWithEssay: number;
  avgProcessingTime: number;
  errorRate: number;
  errorCount: number;
  successCount: number;
  avgFeedbackRating: number;
  totalFeedback: number;
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
  userName: string;
  assessmentId: string | null;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface FeedbackFilters {
  startDate?: string;
  endDate?: string;
  minRating?: number;
}

// Transaction Management
export type AdminPaymentStatus = 'pending' | 'success' | 'failed' | 'cancelled';
export type AdminPaymentMethod = 'zalopay' | 'momo' | 'vnpay';

export interface AdminTransaction {
  id: number;
  user_id: number;
  order_id: string;
  app_trans_id?: string | null;
  amount: number;
  currency: string;
  description?: string | null;
  payment_method: AdminPaymentMethod | string;
  status: AdminPaymentStatus | string;
  order_url?: string | null;
  zp_trans_token?: string | null;
  created_at?: string | null;
  paid_at?: string | null;
  updated_at?: string | null;
  callback_data?: any;
  user?: {
    id: number;
    email?: string;
    full_name?: string;
  } | null;
}

export interface TransactionSummary {
  totalAmount: number;
  successAmount: number;
  successCount: number;
  pendingCount: number;
  failedCount: number;
  cancelledCount: number;
  currency: string;
}

export interface TransactionFilters {
  status?: AdminPaymentStatus | 'all';
  paymentMethod?: AdminPaymentMethod | 'all';
  search?: string;
  userId?: number;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

export interface TransactionListResponse {
  items: AdminTransaction[];
  total: number;
  limit: number;
  offset: number;
  summary: TransactionSummary;
}
