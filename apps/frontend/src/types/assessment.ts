export interface Question {
  id: string;
  test_type: 'RIASEC' | 'BIGFIVE';
  question_text: string;
  question_type: 'MULTIPLE_CHOICE' | 'SCALE';
  options?: string[];
  dimension?: string;
  order_index: number;
}

export interface QuestionResponse {
  questionId: string;
  answer: string | number;
}

export interface AssessmentSubmission {
  testTypes: string[];
  responses: QuestionResponse[];
}

export interface EssaySubmission {
  assessmentId: string;
  essayText: string;
  promptId?: number;
  lang?: string;
}

export interface EssayPrompt {
  id: number | null;
  title: string;
  prompt_text: string;
  lang?: string;
}

export interface AssessmentResult {
  id: string;
  userId: string;
  personalityProfile: {
    riasec: Record<string, number>;
    bigFive: Record<string, number>;
  };
  careerRecommendations: CareerRecommendation[];
  completedAt: string;
  assessmentType: string;
}

export interface CareerRecommendation {
  id: string;
  title: string;
  description: string;
  matchPercentage: number;
  reasons: string[];
  salaryRange?: string;
  growthRate?: string;
  skills?: string[];
  aiEnhanced?: {
    dayInLife: string;
    challenges: string[];
    personalizedAdvice: string;
  };
}

