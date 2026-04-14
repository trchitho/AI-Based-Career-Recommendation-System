// Gemini AI Service for generating personalized career narratives
import { AssessmentResult } from '../types/assessment';

interface GeminiConfig {
  apiKey: string;
  model: string;
}

interface CareerNarrativePrompt {
  personalityProfile: any;
  careerRecommendations: any[];
  userPreferences?: any;
}

class GeminiService {
  private config: GeminiConfig;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

  constructor(apiKey: string) {
    this.config = {
      apiKey,
      model: 'gemini-pro'
    };
  }

  async generateCareerNarrative(prompt: CareerNarrativePrompt): Promise<string> {
    try {
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(prompt);

      const response = await fetch(`${this.baseUrl}/${this.config.model}:generateContent?key=${this.config.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${systemPrompt}\n\n${userPrompt}`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      return data.candidates[0]?.content?.parts[0]?.text || 'Unable to generate narrative';
    } catch (error) {
      console.error('Error generating career narrative:', error);
      return this.getFallbackNarrative(prompt);
    }
  }

  async generateDayInLifeStory(careerTitle: string, personalityProfile: any): Promise<string> {
    const prompt = `
    Tạo một câu chuyện "Một ngày trong cuộc đời" của một ${careerTitle} với tính cách:
    - Openness: ${personalityProfile.bigFive.openness}
    - Conscientiousness: ${personalityProfile.bigFive.conscientiousness}
    - Extraversion: ${personalityProfile.bigFive.extraversion}
    - Agreeableness: ${personalityProfile.bigFive.agreeableness}
    - Neuroticism: ${personalityProfile.bigFive.neuroticism}
    
    RIASEC Profile:
    - Realistic: ${personalityProfile.riasec.R}
    - Investigative: ${personalityProfile.riasec.I}
    - Artistic: ${personalityProfile.riasec.A}
    - Social: ${personalityProfile.riasec.S}
    - Enterprising: ${personalityProfile.riasec.E}
    - Conventional: ${personalityProfile.riasec.C}
    
    Viết bằng tiếng Việt, tối đa 300 từ, mô tả chi tiết từ sáng đến tối.
    `;

    return this.generateContent(prompt);
  }

  async generateCareerChallenges(careerTitle: string, personalityProfile: any): Promise<string[]> {
    const prompt = `
    Liệt kê 5 thử thách chính mà một ${careerTitle} sẽ gặp phải, 
    dựa trên tính cách cụ thể này: ${JSON.stringify(personalityProfile)}.
    
    Trả về dưới dạng danh sách, mỗi thử thách trên một dòng, bắt đầu bằng "- ".
    Viết bằng tiếng Việt.
    `;

    const response = await this.generateContent(prompt);
    return response.split('\n').filter(line => line.trim().startsWith('-')).map(line => line.replace(/^-\s*/, ''));
  }

  async generatePersonalizedAdvice(assessmentResult: AssessmentResult): Promise<string> {
    const prompt = `
    Dựa trên kết quả đánh giá tính cách và nghề nghiệp sau:
    ${JSON.stringify(assessmentResult, null, 2)}
    
    Hãy tạo ra lời khuyên cá nhân hóa cho người dùng về:
    1. Điểm mạnh tự nhiên của họ
    2. Kỹ năng cần phát triển
    3. Con đường sự nghiệp phù hợp
    4. Cách tối đa hóa tiềm năng
    
    Viết bằng tiếng Việt, tối đa 250 từ, giọng điệu thân thiện và khuyến khích.
    `;

    return this.generateContent(prompt);
  }

  async generateInteractiveScenario(context: string, previousChoices: string[]): Promise<any> {
    const prompt = `
    Tạo một tình huống tương tác mới cho assessment nghề nghiệp với context: ${context}
    
    Các lựa chọn trước đó: ${previousChoices.join(', ')}
    
    Trả về JSON format:
    {
      "situation": "Mô tả tình huống",
      "choices": [
        {
          "text": "Lựa chọn 1",
          "riasecMapping": {"R": 0, "I": 0, "A": 0, "S": 0, "E": 0, "C": 0},
          "bigFiveMapping": {"O": 0, "C": 0, "E": 0, "A": 0, "N": 0}
        }
      ]
    }
    
    Viết bằng tiếng Việt.
    `;

    const response = await this.generateContent(prompt);
    try {
      return JSON.parse(response);
    } catch {
      return this.getFallbackScenario();
    }
  }

  private buildSystemPrompt(): string {
    return `
    Bạn là một chuyên gia tư vấn nghề nghiệp AI với khả năng tạo ra những câu chuyện hấp dẫn và cá nhân hóa.
    
    Nhiệm vụ của bạn:
    1. Phân tích kết quả đánh giá tính cách RIASEC và Big Five
    2. Tạo ra những câu chuyện nghề nghiệp sinh động và thực tế
    3. Đưa ra lời khuyên cụ thể và có thể thực hiện được
    4. Sử dụng ngôn ngữ Việt Nam tự nhiên và dễ hiểu
    5. Tạo ra nội dung tích cực, khuyến khích và truyền cảm hứng
    
    Phong cách viết:
    - Thân thiện và gần gũi
    - Cụ thể và thực tế
    - Tích cực và động viên
    - Dễ hiểu và hấp dẫn
    `;
  }

  private buildUserPrompt(prompt: CareerNarrativePrompt): string {
    const { personalityProfile, careerRecommendations } = prompt;
    
    return `
    Hãy tạo một câu chuyện nghề nghiệp cá nhân hóa dựa trên:
    
    TÍNH CÁCH BIG FIVE:
    - Openness (Cởi mở): ${personalityProfile.bigFive.openness}
    - Conscientiousness (Tận tâm): ${personalityProfile.bigFive.conscientiousness}
    - Extraversion (Hướng ngoại): ${personalityProfile.bigFive.extraversion}
    - Agreeableness (Dễ chịu): ${personalityProfile.bigFive.agreeableness}
    - Neuroticism (Bất ổn cảm xúc): ${personalityProfile.bigFive.neuroticism}
    
    RIASEC PROFILE:
    - Realistic (Thực tế): ${personalityProfile.riasec.R}
    - Investigative (Nghiên cứu): ${personalityProfile.riasec.I}
    - Artistic (Nghệ thuật): ${personalityProfile.riasec.A}
    - Social (Xã hội): ${personalityProfile.riasec.S}
    - Enterprising (Kinh doanh): ${personalityProfile.riasec.E}
    - Conventional (Truyền thống): ${personalityProfile.riasec.C}
    
    NGHỀ NGHIỆP ĐƯỢC ĐỀ XUẤT:
    ${careerRecommendations.map((career, index) => 
      `${index + 1}. ${career.title} (${career.matchPercentage}% phù hợp)`
    ).join('\n')}
    
    Hãy tạo một câu chuyện bao gồm:
    1. Một ngày làm việc điển hình
    2. Những thử thách sẽ gặp phải
    3. Phần thưởng và lợi ích
    4. Lời khuyên phát triển sự nghiệp
    5. Bước tiếp theo cụ thể
    
    Độ dài: 500-800 từ, viết bằng tiếng Việt.
    `;
  }

  private async generateContent(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/${this.config.model}:generateContent?key=${this.config.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      return data.candidates[0]?.content?.parts[0]?.text || '';
    } catch (error) {
      console.error('Error generating content:', error);
      return 'Không thể tạo nội dung. Vui lòng thử lại sau.';
    }
  }

  private getFallbackNarrative(prompt: CareerNarrativePrompt): string {
    const topCareer = prompt.careerRecommendations[0];
    return `
    Dựa trên kết quả phân tích tính cách của bạn, nghề ${topCareer.title} rất phù hợp với bạn.
    
    Với điểm mạnh tự nhiên và sở thích cá nhân, bạn có thể phát triển mạnh mẽ trong lĩnh vực này.
    
    Hãy tập trung vào việc phát triển kỹ năng chuyên môn và xây dựng mạng lưới quan hệ trong ngành.
    `;
  }

  private getFallbackScenario(): any {
    return {
      situation: "Bạn đang làm việc trong một dự án nhóm và gặp phải thử thách về thời gian.",
      choices: [
        {
          text: "Tập trung hoàn thành nhiệm vụ cá nhân trước",
          riasecMapping: { R: 2, I: 3, A: 1, S: 1, E: 2, C: 4 },
          bigFiveMapping: { O: 2, C: 4, E: 2, A: 2, N: 1 }
        }
      ]
    };
  }
}

// Export singleton instance
let geminiService: GeminiService | null = null;

export const initializeGeminiService = (apiKey: string): GeminiService => {
  geminiService = new GeminiService(apiKey);
  return geminiService;
};

export const getGeminiService = (): GeminiService | null => {
  return geminiService;
};

export default GeminiService;