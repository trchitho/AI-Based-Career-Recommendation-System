/**
 * Evaluation Chain - Tách riêng logic đánh giá câu trả lời
 */

import { EvaluationInput, EvaluationOutput, AIError } from './types';

export class EvaluationChain {
    private geminiClient: any; // Will be injected

    constructor(geminiClient: any) {
        this.geminiClient = geminiClient;
    }

    /**
     * Evaluate user answer with detailed scoring
     */
    async evaluateAnswer(input: EvaluationInput): Promise<EvaluationOutput> {
        try {
            const prompt = this.buildEvaluationPrompt(input);

            const response = await this.geminiClient.generate({
                prompt,
                temperature: 0.2, // Lower temperature for consistent evaluation
                max_tokens: 800,
                response_format: 'json'
            });

            const result = JSON.parse(response.text);

            // Validate and normalize output
            this.validateEvaluationOutput(result);
            this.normalizeScores(result);

            return result;
        } catch (error) {
            throw this.handleError('evaluation_error', error, input);
        }
    }

    /**
     * Build evaluation prompt with structured scoring
     */
    private buildEvaluationPrompt(input: EvaluationInput): string {
        const { question, user_answer, expected_skills, question_type, career_context } = input;

        const questionTypeContext: Record<string, string> = {
            warm_up: 'Đánh giá khả năng giao tiếp, tự tin và động cơ',
            technical: 'Đánh giá kiến thức chuyên môn, kỹ thuật và kinh nghiệm thực tế',
            behavioral: 'Đánh giá soft skills, kinh nghiệm và cách xử lý tình huống',
            situational: 'Đánh giá tư duy logic, khả năng giải quyết vấn đề',
            closing: 'Đánh giá sự quan tâm, chuẩn bị và câu hỏi chất lượng'
        };

        return `
Bạn là một HR Manager chuyên nghiệp đang đánh giá câu trả lời phỏng vấn cho vị trí: ${career_context.title} (${career_context.onet_code}).

THÔNG TIN ĐÁNH GIÁ:
Câu hỏi: "${question}"
Loại câu hỏi: ${question_type} (${questionTypeContext[question_type] || 'Câu hỏi chung'})
Kỹ năng cần đánh giá: ${expected_skills.join(', ')}

CÂU TRẢ LỜI CỦA ỨNG VIÊN:
"${user_answer}"

TIÊU CHÍ ĐÁNH GIÁ (thang điểm 0-10):

1. TECHNICAL (Kỹ năng chuyên môn):
   - Kiến thức chuyên ngành chính xác
   - Sử dụng thuật ngữ đúng
   - Kinh nghiệm thực tế

2. LOGIC (Tư duy logic):
   - Cấu trúc câu trả lời rõ ràng
   - Lập luận có logic
   - Giải quyết vấn đề hiệu quả

3. COMMUNICATION (Giao tiếp):
   - Diễn đạt rõ ràng, dễ hiểu
   - Ngôn ngữ phù hợp
   - Khả năng truyền đạt ý tưởng

4. EXPERIENCE (Kinh nghiệm thực tế):
   - Ví dụ cụ thể, thực tế
   - Bài học kinh nghiệm
   - Ứng dụng trong công việc

5. ATTITUDE (Thái độ):
   - Tự tin, tích cực
   - Sẵn sàng học hỏi
   - Phù hợp văn hóa công ty

YÊU CẦU OUTPUT (JSON):
{
  "score": 7.5,
  "detailed_scores": {
    "technical": 8,
    "logic": 7,
    "communication": 8,
    "experience": 6,
    "attitude": 9
  },
  "score_reasoning": {
    "technical": "Lý do chi tiết cho điểm technical...",
    "logic": "Lý do chi tiết cho điểm logic...",
    "communication": "Lý do chi tiết cho điểm communication...",
    "experience": "Lý do chi tiết cho điểm experience...",
    "attitude": "Lý do chi tiết cho điểm attitude..."
  },
  "feedback": "Nhận xét tổng thể về câu trả lời...",
  "strengths": ["Điểm mạnh 1", "Điểm mạnh 2"],
  "weaknesses": ["Điểm cần cải thiện 1", "Điểm cần cải thiện 2"],
  "suggestion": "Gợi ý cụ thể để cải thiện...",
  "missing_skills": ["skill1", "skill2"],
  "skill_gaps": [
    {
      "skill": "skill_name",
      "current_level": 3,
      "required_level": 5,
      "gap": 2
    }
  ]
}

NGUYÊN TẮC ĐÁNH GIÁ:
- Khách quan, công bằng
- Dựa trên tiêu chuẩn nghề nghiệp
- Đưa ra feedback xây dựng
- Gợi ý cải thiện cụ thể
- Điểm số phải nhất quán với nhận xét

Hãy đánh giá câu trả lời một cách chuyên nghiệp:`;
    }

    /**
     * Validate evaluation output structure
     */
    private validateEvaluationOutput(output: any): void {
        const required = [
            'score', 'detailed_scores', 'score_reasoning', 'feedback',
            'strengths', 'weaknesses', 'suggestion', 'missing_skills', 'skill_gaps'
        ];

        for (const field of required) {
            if (!(field in output)) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Validate detailed_scores structure
        const scoreFields = ['technical', 'logic', 'communication', 'experience', 'attitude'];
        for (const field of scoreFields) {
            if (!(field in output.detailed_scores)) {
                throw new Error(`Missing detailed score: ${field}`);
            }
            if (typeof output.detailed_scores[field] !== 'number') {
                throw new Error(`Invalid score type for ${field}`);
            }
        }

        // Validate arrays
        if (!Array.isArray(output.strengths)) {
            throw new Error('Strengths must be an array');
        }
        if (!Array.isArray(output.weaknesses)) {
            throw new Error('Weaknesses must be an array');
        }
        if (!Array.isArray(output.missing_skills)) {
            throw new Error('Missing skills must be an array');
        }
        if (!Array.isArray(output.skill_gaps)) {
            throw new Error('Skill gaps must be an array');
        }
    }

    /**
     * Normalize scores to ensure consistency
     */
    private normalizeScores(output: any): void {
        // Ensure all scores are between 0-10
        const scoreFields = ['technical', 'logic', 'communication', 'experience', 'attitude'];

        for (const field of scoreFields) {
            output.detailed_scores[field] = Math.max(0, Math.min(10, output.detailed_scores[field]));
        }

        // Calculate overall score as weighted average
        const weights: Record<string, number> = {
            technical: 0.25,
            logic: 0.20,
            communication: 0.20,
            experience: 0.20,
            attitude: 0.15
        };

        const calculatedScore = scoreFields.reduce((sum, field) => {
            return sum + ((output.detailed_scores as any)[field] * weights[field]);
        }, 0);

        // Use calculated score if provided score is inconsistent
        const scoreDiff = Math.abs(output.score - calculatedScore);
        if (scoreDiff > 1.0) {
            console.warn(`Score inconsistency detected. Using calculated score: ${calculatedScore.toFixed(1)}`);
            output.score = Math.round(calculatedScore * 10) / 10;
        }

        // Ensure overall score is also 0-10
        output.score = Math.max(0, Math.min(10, output.score));
    }

    /**
     * Handle errors with context
     */
    private handleError(type: AIError['type'], error: any, input: EvaluationInput): AIError {
        return {
            type,
            message: `Answer evaluation failed: ${error.message}`,
            details: {
                input_context: {
                    question_type: input.question_type,
                    answer_length: input.user_answer.length,
                    expected_skills: input.expected_skills
                },
                original_error: error.message
            }
        };
    }

    /**
     * Batch evaluate multiple answers
     */
    async evaluateAnswerBatch(inputs: EvaluationInput[]): Promise<EvaluationOutput[]> {
        const results = await Promise.allSettled(
            inputs.map(input => this.evaluateAnswer(input))
        );

        return results.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            } else {
                console.error(`Answer evaluation failed for input ${index}:`, result.reason);
                // Return fallback evaluation
                return this.getFallbackEvaluation(inputs[index]);
            }
        });
    }

    /**
     * Fallback evaluation when AI fails
     */
    private getFallbackEvaluation(input: EvaluationInput): EvaluationOutput {
        const answerLength = input.user_answer.length;
        const hasContent = answerLength > 10;

        // Basic scoring based on answer length and content
        const baseScore = hasContent ? 5 : 2;

        return {
            score: baseScore,
            detailed_scores: {
                technical: baseScore,
                logic: baseScore,
                communication: hasContent ? baseScore + 1 : baseScore - 1,
                experience: baseScore,
                attitude: hasContent ? baseScore + 1 : baseScore - 1
            },
            score_reasoning: {
                technical: 'Đánh giá tự động do lỗi hệ thống',
                logic: 'Đánh giá tự động do lỗi hệ thống',
                communication: 'Đánh giá tự động do lỗi hệ thống',
                experience: 'Đánh giá tự động do lỗi hệ thống',
                attitude: 'Đánh giá tự động do lỗi hệ thống'
            },
            feedback: hasContent
                ? 'Cảm ơn bạn đã trả lời. Hệ thống đang gặp sự cố kỹ thuật, đánh giá chi tiết sẽ được cập nhật sau.'
                : 'Câu trả lời quá ngắn. Vui lòng cung cấp thêm thông tin chi tiết.',
            strengths: hasContent ? ['Có cung cấp câu trả lời'] : [],
            weaknesses: hasContent ? ['Cần đánh giá chi tiết hơn'] : ['Câu trả lời quá ngắn'],
            suggestion: 'Vui lòng thử lại hoặc liên hệ hỗ trợ kỹ thuật.',
            missing_skills: input.expected_skills,
            skill_gaps: input.expected_skills.map(skill => ({
                skill,
                current_level: 1,
                required_level: 3,
                gap: 2
            }))
        };
    }

    /**
     * Quick evaluation for simple yes/no or short answers
     */
    async quickEvaluate(input: EvaluationInput): Promise<Pick<EvaluationOutput, 'score' | 'feedback' | 'suggestion'>> {
        if (input.user_answer.length < 10) {
            return {
                score: 2,
                feedback: 'Câu trả lời quá ngắn, cần cung cấp thêm thông tin.',
                suggestion: 'Hãy chia sẻ chi tiết hơn về kinh nghiệm và suy nghĩ của bạn.'
            };
        }

        // For longer answers, use full evaluation
        const fullEval = await this.evaluateAnswer(input);
        return {
            score: fullEval.score,
            feedback: fullEval.feedback,
            suggestion: fullEval.suggestion
        };
    }
}