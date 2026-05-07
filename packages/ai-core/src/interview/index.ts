/**
 * Interview AI Pipeline - Main exports
 */

export { QuestionChain } from './question.chain';
export { EvaluationChain } from './evaluation.chain';
export { InterviewPipeline } from './interview.pipeline';
export { GeminiClient } from '../llm/gemini.client';

export type {
    QuestionGenerationInput,
    QuestionGenerationOutput,
    EvaluationInput,
    EvaluationOutput,
    InterviewSession,
    InterviewStepInput,
    InterviewStepOutput,
    AIError
} from './types';

// Import the classes for use in factory function
import { InterviewPipeline } from './interview.pipeline';
import { GeminiClient } from '../llm/gemini.client';
import type { InterviewSession } from './types';

/**
 * Factory function to create Interview Pipeline with Gemini
 */
export function createInterviewPipeline(geminiApiKey: string): InterviewPipeline {
    const geminiClient = new GeminiClient({
        apiKey: geminiApiKey,
        model: 'gemini-1.5-flash',
        timeout: 30000,
        retries: 2
    });

    return new InterviewPipeline(geminiClient);
}

/**
 * Utility function to validate interview session
 */
export function validateInterviewSession(session: any): session is InterviewSession {
    return (
        session &&
        typeof session.session_id === 'number' &&
        typeof session.user_id === 'number' &&
        session.career_context &&
        typeof session.current_question === 'string' &&
        typeof session.question_number === 'number' &&
        Array.isArray(session.history) &&
        ['active', 'completed'].includes(session.status)
    );
}

/**
 * Utility function to create empty session
 */
export function createEmptySession(
    user_id: number,
    career_context: InterviewSession['career_context'],
    level: InterviewSession['level'],
    total_questions: number = 7
): Omit<InterviewSession, 'session_id' | 'current_question'> {
    return {
        user_id,
        career_context,
        question_number: 0,
        question_type: 'warm_up' as const,
        total_questions,
        level,
        history: [],
        status: 'active',
        created_at: new Date().toISOString()
    };
}