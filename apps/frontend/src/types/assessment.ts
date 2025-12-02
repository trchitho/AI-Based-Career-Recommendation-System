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

import type { TraitSnapshot } from './traits';

export interface AssessmentResults {
  assessment_id: number;
  user_id: number;
  riasec_scores: Record<string, number>;    // {Realistic:3.2, ...}
  big_five_scores: Record<string, number>;  // {Openness:0.7, ...}

  traits: TraitSnapshot;
}

