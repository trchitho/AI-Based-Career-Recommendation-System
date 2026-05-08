4/**
 * Interview Pipeline - Orchestrator điều phối Question và Evaluation chains
 */

import { QuestionChain } from './question.chain';
import { EvaluationChain } from './evaluation.chain';
import {
    InterviewStepInput,
    InterviewStepOutput,
    InterviewSession,
    QuestionGenerationInput,
    EvaluationInput,
    EvaluationOutput,
    AIError
} from './types';

export class InterviewPipeline {
    private questionChain: QuestionChain;
    private evaluationChain: EvaluationChain;

    constructor(geminiClient: any) {
        this.questionChain = new QuestionChain(geminiClient);
        this.evaluationChain = new EvaluationChain(geminiClient);
    }

    /**
     * Execute one interview step: evaluate current answer + generate next question
     */
    async executeStep(input: InterviewStepInput): Promise<InterviewStepOutput> {
        try {
            const { session, user_answer, is_skipped = false } = input;

            // Step 1: Evaluate current answer (if not first question)
            let evaluation: EvaluationOutput | null = null;
            if (session.current_question && user_answer !== undefined) {
                evaluation = await this.evaluateCurrentAnswer(session, user_answer, is_skipped);
            }

            // Step 2: Determine if interview should continue
            const shouldContinue = this.shouldContinueInterview(session, evaluation);

            if (!shouldContinue) {
                return {
                    evaluation: evaluation!,
                    session_status: 'completed',
                    updated_session: {
                        ...session,
                        status: 'completed'
                    }
                };
            }

            // Step 3: Generate next question
            const nextQuestion = await this.generateNextQuestion(session, evaluation);

            // Step 4: Update session
            const updatedSession = this.updateSession(session, user_answer, evaluation, nextQuestion);

            return {
                evaluation: evaluation!,
                next_question: nextQuestion,
                session_status: 'continue',
                updated_session: updatedSession
            };

        } catch (error) {
            throw this.handlePipelineError(error, input);
        }
    }

    /**
     * Evaluate current answer using Evaluation Chain
     */
    private async evaluateCurrentAnswer(
        session: InterviewSession,
        user_answer: string,
        is_skipped: boolean
    ) {
        if (is_skipped || !user_answer || user_answer.trim().length === 0) {
            return this.createSkippedEvaluation();
        }

        const evaluationInput: EvaluationInput = {
            question: session.current_question,
            user_answer: user_answer.trim(),
            expected_skills: this.extractExpectedSkills(session),
            question_type: session.question_type,
            career_context: {
                onet_code: session.career_context.onet_code,
                title: session.career_context.title
            }
        };

        return await this.evaluationChain.evaluateAnswer(evaluationInput);
    }

    /**
     * Generate next question using Question Chain
     */
    private async generateNextQuestion(session: InterviewSession, evaluation: any) {
        const questionType = this.determineNextQuestionType(session);
        const questionInput: QuestionGenerationInput = {
            career_context: session.career_context,
            level: session.level,
            question_type: questionType as 'warm_up' | 'technical' | 'behavioral' | 'situational' | 'closing',
            question_number: session.question_number + 1,
            history_summary: this.createHistorySummary(session),
            missing_skills: evaluation?.missing_skills || [],
            difficulty_adjustment: this.determineDifficultyAdjustment(session, evaluation)
        };

        return await this.questionChain.generateQuestion(questionInput);
    }

    /**
     * Determine if interview should continue
     */
    private shouldContinueInterview(session: InterviewSession, evaluation: any): boolean {
        // Check if reached maximum questions
        if (session.question_number >= session.total_questions) {
            return false;
        }

        // Check if user performance is too low (optional early termination)
        if (evaluation && session.history.length >= 3) {
            const avgScore = this.calculateAverageScore(session.history);
            if (avgScore < 3.0 && session.question_number >= 5) {
                console.log('Early termination due to low performance');
                return false;
            }
        }

        return true;
    }

    /**
     * Determine next question type based on interview flow
     */
    private determineNextQuestionType(session: InterviewSession): string {
        const questionNumber = session.question_number + 1;
        const totalQuestions = session.total_questions;

        // Interview flow logic
        if (questionNumber === 1) return 'warm_up';
        if (questionNumber === totalQuestions) return 'closing';

        // Middle questions - mix of technical, behavioral, situational
        const middleTypes = ['technical', 'behavioral', 'situational'];
        const typeIndex = (questionNumber - 2) % middleTypes.length;

        // Adjust based on level
        if (session.level === 'fresher' || session.level === 'junior') {
            // More behavioral questions for junior levels
            return questionNumber % 2 === 0 ? 'behavioral' : 'technical';
        }

        return middleTypes[typeIndex];
    }

    /**
     * Determine difficulty adjustment based on performance
     */
    private determineDifficultyAdjustment(session: InterviewSession, evaluation: any): 'increase' | 'decrease' | 'maintain' {
        if (!evaluation || session.history.length < 2) {
            return 'maintain';
        }

        const recentScores = session.history.slice(-2).map(h => h.evaluation.score);
        const avgRecentScore = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;

        if (avgRecentScore >= 8.0) return 'increase';
        if (avgRecentScore <= 4.0) return 'decrease';
        return 'maintain';
    }

    /**
     * Update session with new data
     */
    private updateSession(
        session: InterviewSession,
        user_answer: string,
        evaluation: any,
        nextQuestion: any
    ): InterviewSession {
        const updatedHistory = [...session.history];

        // Add current Q&A to history if we have both question and answer
        if (session.current_question && user_answer !== undefined && evaluation) {
            updatedHistory.push({
                question: session.current_question,
                answer: user_answer,
                evaluation
            });
        }

        return {
            ...session,
            current_question: nextQuestion.question,
            question_number: session.question_number + 1,
            question_type: nextQuestion.question_type,
            history: updatedHistory
        };
    }

    /**
     * Extract expected skills from session context
     */
    private extractExpectedSkills(session: InterviewSession): string[] {
        if (session.career_context.skills) {
            return session.career_context.skills
                .sort((a, b) => b.importance - a.importance)
                .slice(0, 5)
                .map(skill => skill.skill_name);
        }
        return ['communication', 'problem_solving', 'teamwork'];
    }

    /**
     * Create history summary for context
     */
    private createHistorySummary(session: InterviewSession): string {
        if (session.history.length === 0) return '';

        const recentHistory = session.history.slice(-3); // Last 3 Q&As
        const summaryParts = recentHistory.map((item, index) => {
            const score = item.evaluation.score;
            const strengths = item.evaluation.strengths.slice(0, 2).join(', ');
            return `Q${session.history.length - recentHistory.length + index + 1}: Score ${score}/10, Strengths: ${strengths}`;
        });

        return summaryParts.join('; ');
    }

    /**
     * Calculate average score from history
     */
    private calculateAverageScore(history: InterviewSession['history']): number {
        if (history.length === 0) return 0;

        const totalScore = history.reduce((sum, item) => sum + item.evaluation.score, 0);
        return totalScore / history.length;
    }

    /**
     * Create evaluation for skipped questions
     */
    private createSkippedEvaluation() {
        return {
            score: 0,
            detailed_scores: {
                technical: 0,
                logic: 0,
                communication: 0,
                experience: 0,
                attitude: 0
            },
            score_reasoning: {
                technical: 'Câu hỏi bị bỏ qua',
                logic: 'Câu hỏi bị bỏ qua',
                communication: 'Câu hỏi bị bỏ qua',
                experience: 'Câu hỏi bị bỏ qua',
                attitude: 'Câu hỏi bị bỏ qua'
            },
            feedback: 'Bạn đã bỏ qua câu hỏi này.',
            strengths: [],
            weaknesses: ['Không trả lời câu hỏi'],
            suggestion: 'Hãy cố gắng trả lời các câu hỏi để có đánh giá chính xác nhất.',
            missing_skills: [],
            skill_gaps: []
        };
    }

    /**
     * Handle pipeline errors
     */
    private handlePipelineError(error: any, input: InterviewStepInput): AIError {
        return {
            type: 'pipeline_error',
            message: `Interview pipeline failed: ${error.message}`,
            details: {
                session_id: input.session.session_id,
                question_number: input.session.question_number,
                career: input.session.career_context.title,
                original_error: error.message
            }
        };
    }

    /**
     * Start new interview session
     */
    async startInterview(
        user_id: number,
        career_context: QuestionGenerationInput['career_context'],
        level: QuestionGenerationInput['level'],
        total_questions: number = 7
    ): Promise<InterviewSession> {
        // Generate first question
        const firstQuestionInput: QuestionGenerationInput = {
            career_context,
            level,
            question_type: 'warm_up',
            question_number: 1
        };

        const firstQuestion = await this.questionChain.generateQuestion(firstQuestionInput);

        return {
            session_id: Date.now(), // Will be replaced by actual DB ID
            user_id,
            career_context,
            current_question: firstQuestion.question,
            question_number: 1,
            question_type: firstQuestion.question_type,
            total_questions,
            level,
            history: [],
            status: 'active',
            created_at: new Date().toISOString()
        };
    }

    /**
     * Get interview summary/results
     */
    getInterviewSummary(session: InterviewSession) {
        const totalQuestions = session.history.length;
        const totalScore = session.history.reduce((sum, item) => sum + item.evaluation.score, 0);
        const averageScore = totalQuestions > 0 ? totalScore / totalQuestions : 0;

        const skillScores: Record<string, number> = {
            technical: 0,
            logic: 0,
            communication: 0,
            experience: 0,
            attitude: 0
        };

        // Calculate average skill scores
        session.history.forEach(item => {
            Object.keys(skillScores).forEach(skill => {
                skillScores[skill] += (item.evaluation.detailed_scores as any)[skill] || 0;
            });
        });

        Object.keys(skillScores).forEach(skill => {
            skillScores[skill] = totalQuestions > 0 ? skillScores[skill] / totalQuestions : 0;
        });

        // Collect all strengths and weaknesses
        const allStrengths = session.history.flatMap(item => item.evaluation.strengths);
        const allWeaknesses = session.history.flatMap(item => item.evaluation.weaknesses);
        const allMissingSkills = [...new Set(session.history.flatMap(item => item.evaluation.missing_skills))];

        return {
            session_id: session.session_id,
            career: session.career_context.title,
            level: session.level,
            total_questions: totalQuestions,
            average_score: Math.round(averageScore * 10) / 10,
            skill_scores: skillScores,
            strengths: [...new Set(allStrengths)],
            weaknesses: [...new Set(allWeaknesses)],
            missing_skills: allMissingSkills,
            recommendations: this.generateRecommendations(averageScore, skillScores, allMissingSkills),
            completed_at: new Date().toISOString()
        };
    }

    /**
     * Generate recommendations based on performance
     */
    private generateRecommendations(averageScore: number, skillScores: any, missingSkills: string[]): string[] {
        const recommendations = [];

        if (averageScore < 5) {
            recommendations.push('Cần cải thiện kỹ năng tổng thể trước khi ứng tuyển vị trí này');
        } else if (averageScore < 7) {
            recommendations.push('Có tiềm năng tốt, cần rèn luyện thêm một số kỹ năng cụ thể');
        } else {
            recommendations.push('Thể hiện tốt, phù hợp với vị trí ứng tuyển');
        }

        // Skill-specific recommendations
        Object.entries(skillScores).forEach(([skill, score]) => {
            if ((score as number) < 5) {
                const skillNames: Record<string, string> = {
                    technical: 'kỹ năng chuyên môn',
                    logic: 'tư duy logic',
                    communication: 'kỹ năng giao tiếp',
                    experience: 'kinh nghiệm thực tế',
                    attitude: 'thái độ làm việc'
                };
                recommendations.push(`Cần cải thiện ${skillNames[skill] || skill}`);
            }
        });

        // Missing skills recommendations
        if (missingSkills.length > 0) {
            recommendations.push(`Nên học thêm: ${missingSkills.slice(0, 3).join(', ')}`);
        }

        return recommendations;
    }
}