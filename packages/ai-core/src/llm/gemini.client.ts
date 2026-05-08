/**
 * Gemini Client - Wrapper cho Google Gemini API
 */

export interface GeminiConfig {
    apiKey: string;
    model?: string;
    baseURL?: string;
    timeout?: number;
    retries?: number;
}

export interface GeminiRequest {
    prompt: string;
    temperature?: number;
    max_tokens?: number;
    response_format?: 'text' | 'json';
    top_p?: number;
    top_k?: number;
}

export interface GeminiResponse {
    text: string;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
    model: string;
    created: number;
}

export class GeminiClient {
    private config: GeminiConfig;
    private baseURL: string;

    constructor(config: GeminiConfig) {
        this.config = {
            model: 'gemini-1.5-flash',
            baseURL: 'https://generativelanguage.googleapis.com/v1beta',
            timeout: 30000,
            retries: 3,
            ...config
        };
        this.baseURL = this.config.baseURL!;
    }

    /**
     * Generate text using Gemini API
     */
    async generate(request: GeminiRequest): Promise<GeminiResponse> {
        const { prompt, temperature = 0.7, max_tokens = 1000, response_format = 'text' } = request;

        try {
            const response = await this.makeRequest({
                contents: [{
                    parts: [{
                        text: this.formatPrompt(prompt, response_format)
                    }]
                }],
                generationConfig: {
                    temperature,
                    maxOutputTokens: max_tokens,
                    topP: request.top_p || 0.8,
                    topK: request.top_k || 40
                }
            });

            return this.parseResponse(response);
        } catch (error) {
            throw this.handleError(error, request);
        }
    }

    /**
     * Format prompt based on response format
     */
    private formatPrompt(prompt: string, format: 'text' | 'json'): string {
        if (format === 'json') {
            return `${prompt}\n\nVui lòng trả lời CHÍNH XÁC theo định dạng JSON được yêu cầu. Không thêm text nào khác ngoài JSON.`;
        }
        return prompt;
    }

    /**
     * Make HTTP request to Gemini API
     */
    private async makeRequest(payload: any): Promise<any> {
        const url = `${this.baseURL}/models/${this.config.model}:generateContent?key=${this.config.apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(this.config.timeout!)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Parse Gemini API response
     */
    private parseResponse(response: any): GeminiResponse {
        const candidate = response.candidates?.[0];
        if (!candidate) {
            throw new Error('No candidates in Gemini response');
        }

        const content = candidate.content?.parts?.[0]?.text;
        if (!content) {
            throw new Error('No text content in Gemini response');
        }

        return {
            text: content.trim(),
            usage: {
                prompt_tokens: response.usageMetadata?.promptTokenCount || 0,
                completion_tokens: response.usageMetadata?.candidatesTokenCount || 0,
                total_tokens: response.usageMetadata?.totalTokenCount || 0
            },
            model: this.config.model!,
            created: Date.now()
        };
    }

    /**
     * Handle API errors with retry logic
     */
    private async handleError(error: any, request: GeminiRequest, retryCount = 0): Promise<GeminiResponse> {
        console.error(`Gemini API error (attempt ${retryCount + 1}):`, error.message);

        // Retry on specific errors
        const retryableErrors = ['timeout', 'network', '429', '500', '502', '503', '504'];
        const shouldRetry = retryableErrors.some(err =>
            error.message.toLowerCase().includes(err) ||
            error.code?.toString().includes(err)
        );

        if (shouldRetry && retryCount < this.config.retries!) {
            const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
            console.log(`Retrying Gemini request in ${delay}ms...`);

            await new Promise(resolve => setTimeout(resolve, delay));
            return this.generate(request);
        }

        // Transform error for better handling
        if (error.message.includes('quota')) {
            throw new Error('Gemini API quota exceeded. Please try again later.');
        }

        if (error.message.includes('timeout')) {
            throw new Error('Gemini API request timed out. Please try again.');
        }

        if (error.message.includes('401') || error.message.includes('403')) {
            throw new Error('Gemini API authentication failed. Please check your API key.');
        }

        throw new Error(`Gemini API error: ${error.message}`);
    }

    /**
     * Test connection to Gemini API
     */
    async testConnection(): Promise<boolean> {
        try {
            const response = await this.generate({
                prompt: 'Hello, this is a test message. Please respond with "OK".',
                temperature: 0,
                max_tokens: 10
            });

            return response.text.toLowerCase().includes('ok');
        } catch (error) {
            console.error('Gemini connection test failed:', error);
            return false;
        }
    }

    /**
     * Get model information
     */
    getModelInfo(): { model: string; provider: string } {
        return {
            model: this.config.model!,
            provider: 'Google Gemini'
        };
    }

    /**
     * Estimate token count (approximate)
     */
    estimateTokens(text: string): number {
        // Rough estimation: 1 token ≈ 4 characters for English, 2-3 for Vietnamese
        const avgCharsPerToken = 3;
        return Math.ceil(text.length / avgCharsPerToken);
    }

    /**
     * Check if request is within limits
     */
    validateRequest(request: GeminiRequest): void {
        const estimatedTokens = this.estimateTokens(request.prompt);
        const maxInputTokens = 1000000; // Gemini 1.5 Flash limit

        if (estimatedTokens > maxInputTokens) {
            throw new Error(`Prompt too long: ${estimatedTokens} tokens (max: ${maxInputTokens})`);
        }

        if (request.max_tokens && request.max_tokens > 8192) {
            throw new Error(`Max tokens too high: ${request.max_tokens} (max: 8192)`);
        }

        if (request.temperature && (request.temperature < 0 || request.temperature > 2)) {
            throw new Error(`Invalid temperature: ${request.temperature} (range: 0-2)`);
        }
    }
}