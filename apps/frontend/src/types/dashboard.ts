export interface UserProfileSummary {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  created_at: string;
}

export interface CareerSuggestion {
  id: string;
  title: string;
  matchPercentage: number;
  description: string;
}

export interface ProgressMetrics {
  completedAssessments: number;
  activeRoadmaps: number;
  completedMilestones: number;
}

export interface DashboardData {
  profileSummary: UserProfileSummary;
  topCareerSuggestions: CareerSuggestion[];
  progressMetrics: ProgressMetrics;
  hasCompletedAssessment: boolean;
  latestAssessmentId?: string;
}
