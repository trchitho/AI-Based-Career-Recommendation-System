/**
 * Question Generation Chain - Tách riêng logic sinh câu hỏi
 */

import { QuestionGenerationInput, QuestionGenerationOutput, AIError } from './types';

export class QuestionChain {
    private geminiClient: any; // Will be injected

    constructor(geminiClient: any) {
        this.geminiClient = geminiClient;
    }

    /**
     * Generate interview question based on context and requirements
     */
    async generateQuestion(input: QuestionGenerationInput): Promise<QuestionGenerationOutput> {
        try {
            const prompt = this.buildQuestionPrompt(input);

            const response = await this.geminiClient.generate({
                prompt,
                temperature: 0.8, // Higher creativity for question generation
                max_tokens: 500,
                response_format: 'json'
            });

            const result = JSON.parse(response.text);

            // Validate output structure
            this.validateQuestionOutput(result);

            return result;
        } catch (error) {
            throw this.handleError('generation_error', error, input);
        }
    }

    /**
     * Build question generation prompt
     */
    private buildQuestionPrompt(input: QuestionGenerationInput): string {
        const { career_context, level, question_type, question_number, history_summary, missing_skills } = input;

        const levelDescriptions = {
            fresher: 'Người mới vào nghề (0-1 năm kinh nghiệm)',
            junior: 'Nhân viên cấp thấp (1-2 năm kinh nghiệm)',
            middle: 'Nhân viên cấp trung (2-4 năm kinh nghiệm)',
            senior: 'Nhân viên cấp cao (4+ năm kinh nghiệm)',
            lead: 'Trưởng nhóm/Quản lý (5+ năm kinh nghiệm)'
        };

        const questionTypeGuides = {
            warm_up: 'Câu hỏi làm quen, giúp ứng viên thoải mái',
            technical: 'Câu hỏi kỹ thuật chuyên môn, kiểm tra kiến thức thực tế',
            behavioral: 'Câu hỏi hành vi, kiểm tra soft skills và kinh nghiệm',
            situational: 'Câu hỏi tình huống, kiểm tra khả năng xử lý vấn đề',
            closing: 'Câu hỏi kết thúc, tổng kết và định hướng'
        };

        let skillsContext = '';
        if (career_context.skills && career_context.skills.length > 0) {
            skillsContext = `
Kỹ năng cần đánh giá:
${career_context.skills.map(skill =>
                `- ${skill.skill_name} (${skill.skill_type}, mức độ quan trọng: ${skill.importance}/5)`
            ).join('\n')}`;
        }

        let missingSkillsContext = '';
        if (missing_skills && missing_skills.length > 0) {
            missingSkillsContext = `
Kỹ năng cần tập trung hỏi thêm: ${missing_skills.join(', ')}`;
        }

        let historyContext = '';
        if (history_summary) {
            historyContext = `
Tóm tắt các câu hỏi trước: ${history_summary}`;
        }

        return `
Bạn là một HR Manager chuyên nghiệp đang phỏng vấn ứng viên cho vị trí: ${career_context.title} (${career_context.onet_code}).

THÔNG TIN ỨNG VIÊN:
- Cấp độ: ${level} (${levelDescriptions[level]})
- Câu hỏi số: ${question_number}
- Loại câu hỏi: ${question_type} (${questionTypeGuides[question_type]})

${skillsContext}
${missingSkillsContext}
${historyContext}

YÊU CẦU SINH CÂU HỎI:
1. Câu hỏi phải phù hợp với cấp độ ${level}
2. Tập trung vào loại ${question_type}
3. Câu hỏi phải thực tế, có thể áp dụng trong công việc
4. Không lặp lại nội dung đã hỏi trước đó
5. Độ dài: 50-150 từ
6. Sử dụng tiếng Việt tự nhiên

ĐỊNH DẠNG OUTPUT (JSON):
{
  "question": "Câu hỏi chi tiết...",
  "question_type": "${question_type}",
  "expected_skills": ["skill1", "skill2", "skill3"],
  "difficulty_level": 1-5,
  "time_limit_seconds": 60-300
}

Hãy sinh câu hỏi phỏng vấn chất lượng cao:`;
    }

    /**
     * Validate question output structure
     */
    private validateQuestionOutput(output: any): void {
        const required = ['question', 'question_type', 'expected_skills', 'difficulty_level', 'time_limit_seconds'];

        for (const field of required) {
            if (!(field in output)) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        if (typeof output.question !== 'string' || output.question.length < 10) {
            throw new Error('Question must be a non-empty string');
        }

        if (!Array.isArray(output.expected_skills)) {
            throw new Error('Expected skills must be an array');
        }

        if (typeof output.difficulty_level !== 'number' || output.difficulty_level < 1 || output.difficulty_level > 5) {
            throw new Error('Difficulty level must be between 1-5');
        }

        if (typeof output.time_limit_seconds !== 'number' || output.time_limit_seconds < 30) {
            throw new Error('Time limit must be at least 30 seconds');
        }
    }

    /**
     * Handle errors with context
     */
    private handleError(type: AIError['type'], error: any, input: QuestionGenerationInput): AIError {
        return {
            type,
            message: `Question generation failed: ${error.message}`,
            details: {
                input_context: {
                    career: input.career_context.title,
                    level: input.level,
                    question_type: input.question_type,
                    question_number: input.question_number
                },
                original_error: error.message
            }
        };
    }

    /**
     * Generate multiple questions for batch processing
     */
    async generateQuestionBatch(inputs: QuestionGenerationInput[]): Promise<QuestionGenerationOutput[]> {
        const results = await Promise.allSettled(
            inputs.map(input => this.generateQuestion(input))
        );

        return results.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            } else {
                console.error(`Question generation failed for input ${index}:`, result.reason);
                // Return fallback question
                return this.getFallbackQuestion(inputs[index]);
            }
        });
    }

    /**
     * Fallback question when generation fails
     */
    private getFallbackQuestion(input: QuestionGenerationInput): QuestionGenerationOutput {
        const fallbackQuestions = {
            warm_up: 'Bạn có thể giới thiệu về bản thân và lý do quan tâm đến vị trí này không?',
            technical: 'Bạn có thể chia sẻ về một dự án kỹ thuật mà bạn đã tham gia gần đây không?',
            behavioral: 'Hãy kể về một tình huống khó khăn trong công việc và cách bạn đã giải quyết.',
            situational: 'Nếu bạn phải làm việc với một đồng nghiệp khó tính, bạn sẽ xử lý như thế nào?',
            closing: 'Bạn có câu hỏi nào muốn hỏi về công ty hoặc vị trí này không?'
        };

        return {
            question: fallbackQuestions[input.question_type] || fallbackQuestions.warm_up,
            question_type: input.question_type,
            expected_skills: ['communication', 'problem_solving'],
            difficulty_level: 2,
            time_limit_seconds: 120
        };
    }
}