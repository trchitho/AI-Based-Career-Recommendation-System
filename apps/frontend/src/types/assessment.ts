export interface Question {
  id: string;
  test_type: "RIASEC" | "BIG_FIVE";
  question_text: string;
  question_type: "MULTIPLE_CHOICE" | "SCALE";
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
}
