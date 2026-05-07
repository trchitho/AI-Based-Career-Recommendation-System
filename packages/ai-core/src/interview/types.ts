/**
 * TypeScript interfaces for Interview AI Pipeline
 */

// Question Generation Types
export interface QuestionGenerationInput {
    career_context: {
        onet_code: string;
        title: string;
        skills: Array<{
            skill_name: string;
            skill_type: 'soft' | 'hard';
            importance: number;
            level: number;
        }>;
    };
    level: 'fresher' | 'junior' | 'middle' | 'senior' | 'lead';
    question_type: 'warm_up' | 'technical' | 'behavioral' | 'situational' | 'closing';
    question_number: number;
    history_summary?: string;
    missing_skills?: string[];
    difficulty_adjustment?: 'increase' | 'decrease' | 'maintain';
}

export interface QuestionGenerationOutput {
    question: string;
    question_type: string;
    expected_skills: string[];
    difficulty_level: number;
    time_limit_seconds: number;
}

// Evaluation Types
export interface EvaluationInput {
    question: string;
    user_answer: string;
    expected_skills: string[];
    question_type: string;
    career_context: {
        onet_code: string;
        title: string;
    };
}

export interface EvaluationOutput {
    score: number; // 0-10
    detailed_scores: {
        technical: number;
        logic: number;
        communication: number;
        experience: number;
        attitude: number;
    };
    score_reasoning: {
        technical: string;
        logic: string;
        communication: string;
        experience: string;
        attitude: string;
    };
    feedback: string;
    strengths: string[];
    weaknesses: string[];
    suggestion: string;
    missing_skills: string[];
    skill_gaps: Array<{
        skill: string;
        current_level: number;
        required_level: number;
        gap: number;
    }>;
}

// Interview Session Types
export interface InterviewSession {
    session_id: number;
    user_id: number;
    career_context: QuestionGenerationInput['career_context'];
    current_question: string;
    question_number: number;
    question_type: string;
    total_questions: number;
    level: QuestionGenerationInput['level'];
    history: Array<{
        question: string;
        answer: string;
        evaluation: EvaluationOutput;
    }>;
    status: 'active' | 'completed';
    created_at: string;
}

// Pipeline Types
export interface InterviewStepInput {
    session: InterviewSession;
    user_answer: string;
    is_skipped?: boolean;
}

export interface InterviewStepOutput {
    evaluation: EvaluationOutput;
    next_question?: QuestionGenerationOutput;
    session_status: 'continue' | 'completed';
    updated_session: InterviewSession;
}

// Error Types
export interface AIError {
    type: 'generation_error' | 'evaluation_error' | 'pipeline_error';
    message: string;
    details?: any;
    retry_count?: number;
}