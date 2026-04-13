// Story Generator Service using Gemini AI
import { Question } from '../types/assessment';

interface StoryScenario {
  emoji: string;
  title: string;
  context: string;
  situation: string;
}

interface GroupStory {
  groupScenario: {
    emoji: string;
    title: string;
    introduction: string;
  };
  questionScenarios: StoryScenario[];
}

class StoryGeneratorService {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
  private model = 'gemini-1.5-flash'; // Updated to newer model
  private cache: Map<string, any> = new Map();

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Generate scenarios for a batch of questions (grouped by 5)
  async generateBatchScenarios(questions: Question[]): Promise<StoryScenario[]> {
    const scenarios: StoryScenario[] = [];
    
    // Generate in groups of 5 questions with connected story
    const groupSize = 5;
    for (let i = 0; i < questions.length; i += groupSize) {
      const group = questions.slice(i, i + groupSize);
      const groupIndex = Math.floor(i / groupSize);
      
      try {
        console.log(`Generating story for group ${groupIndex + 1}...`);
        const groupStory = await this.generateGroupStory(group, groupIndex);
        scenarios.push(...groupStory.questionScenarios);
        console.log(`✓ Group ${groupIndex + 1} story generated successfully`);
      } catch (error) {
        console.error(`Error generating group ${groupIndex}:`, error);
        // Fallback to predefined scenarios
        const groupStory = this.getFallbackGroupStory(group, groupIndex);
        scenarios.push(...groupStory.questionScenarios);
        console.log(`✓ Using fallback scenarios for group ${groupIndex + 1}`);
      }
      
      // Small delay between groups
      if (i + groupSize < questions.length) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
    
    return scenarios;
  }

  // Generate a connected story for a group of 5 questions
  async generateGroupStory(questions: Question[], groupIndex: number): Promise<GroupStory> {
    // Check cache first
    const cacheKey = `group-${groupIndex}-${questions.map(q => q.id).join('-')}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const prompt = this.buildGroupPrompt(questions, groupIndex);
      const response = await this.callGeminiAPI(prompt);
      const result = this.parseGroupResponse(response, questions);
      
      // Cache the result
      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error generating group story:', error);
      return this.getFallbackGroupStory(questions, groupIndex);
    }
  }

  private buildGroupPrompt(questions: Question[], groupIndex: number): string {
    const questionsList = questions.map((q, idx) => 
      `${idx + 1}. "${q.question_text}" (${q.dimension || 'general'})`
    ).join('\n');
    
    return `
Bạn là một chuyên gia tạo câu chuyện tương tác cho bài đánh giá nghề nghiệp.

NHIỆM VỤ: Tạo một câu chuyện liên kết cho nhóm 5 câu hỏi sau, biến chúng thành một tình huống thực tế, sinh động.

NHÓM CÂU HỎI ${groupIndex + 1}:
${questionsList}

YÊU CẦU:
1. Tạo một bối cảnh chung (scenario) cho cả nhóm 5 câu hỏi
2. Mỗi câu hỏi là một phần của câu chuyện đó
3. Câu chuyện phải mạch lạc, liên kết với nhau
4. Sử dụng ngôn ngữ Việt Nam tự nhiên, thân thiện
5. Tạo cảm giác như người dùng đang trải nghiệm một tình huống thực tế

TRẢ VỀ JSON FORMAT (chỉ JSON, không có text khác):
{
  "groupScenario": {
    "emoji": "emoji phù hợp với nhóm (ví dụ: 🏢, 🎨, 🔬, 🤝)",
    "title": "Tiêu đề cho nhóm tình huống (3-6 từ, tiếng Việt)",
    "introduction": "Giới thiệu bối cảnh chung cho 5 câu hỏi (2-3 câu, tiếng Việt)"
  },
  "questions": [
    {
      "emoji": "emoji cho câu hỏi 1",
      "title": "Tiêu đề ngắn (3-5 từ)",
      "context": "Bối cảnh cụ thể (1 câu)",
      "situation": "Câu hỏi được diễn đạt lại thành tình huống (1 câu)"
    }
  ]
}

BẮT ĐẦU TẠO CHO NHÓM CÂU HỎI TRÊN:
`;
  }

  private async callGeminiAPI(prompt: string): Promise<string> {
    // Updated API endpoint for Gemini 1.5
    const url = `https://generativelanguage.googleapis.com/v1/models/${this.model}:generateContent?key=${this.apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.8,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error:', errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates[0]?.content?.parts[0]?.text || '';
  }

  private parseGroupResponse(response: string, questions: Question[]): GroupStory {
    try {
      let jsonStr = response.trim();
      
      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```\n?/g, '');
      }
      
      const parsed = JSON.parse(jsonStr);
      
      return {
        groupScenario: {
          emoji: parsed.groupScenario?.emoji || '📖',
          title: parsed.groupScenario?.title || 'Tình Huống',
          introduction: parsed.groupScenario?.introduction || 'Hãy trải nghiệm các tình huống sau...',
        },
        questionScenarios: (parsed.questions || []).map((q: any, idx: number) => ({
          emoji: q.emoji || '💭',
          title: q.title || `Câu hỏi ${idx + 1}`,
          context: q.context || 'Trong tình huống này...',
          situation: q.situation || questions[idx]?.question_text || '',
        })),
      };
    } catch (error) {
      console.error('Error parsing group response:', error);
      return this.getFallbackGroupStory(questions, 0);
    }
  }

  private getFallbackGroupStory(questions: Question[], groupIndex: number): GroupStory {
    const dimensions = questions.map(q => q.dimension?.toLowerCase() || '').filter(Boolean);
    
    const groupThemes: Record<string, any> = {
      realistic: {
        emoji: '🔧',
        title: 'Thử Thách Kỹ Thuật',
        introduction: 'Bạn đang làm việc trong một xưởng với nhiều công cụ và thiết bị. Hãy trải nghiệm các tình huống sau.',
      },
      investigative: {
        emoji: '🔬',
        title: 'Phòng Nghiên Cứu',
        introduction: 'Bạn là một nhà nghiên cứu trong phòng thí nghiệm. Hôm nay bạn sẽ đối mặt với nhiều thử thách khoa học.',
      },
      artistic: {
        emoji: '🎨',
        title: 'Studio Sáng Tạo',
        introduction: 'Bạn bước vào một studio nghệ thuật đầy cảm hứng. Hãy khám phá khả năng sáng tạo của bạn.',
      },
      social: {
        emoji: '🤝',
        title: 'Trung Tâm Cộng Đồng',
        introduction: 'Bạn đang làm việc tại trung tâm cộng đồng. Nhiều người cần sự giúp đỡ và hỗ trợ từ bạn.',
      },
      enterprising: {
        emoji: '💼',
        title: 'Văn Phòng Kinh Doanh',
        introduction: 'Bạn là một nhân viên trong công ty. Hôm nay có nhiều quyết định quan trọng cần được đưa ra.',
      },
      conventional: {
        emoji: '📊',
        title: 'Phòng Phân Tích Dữ Liệu',
        introduction: 'Bạn làm việc với số liệu và biểu đồ. Hãy sử dụng kỹ năng tổ chức và phân tích của bạn.',
      },
    };
    
    // Find matching theme
    let groupScenario = groupThemes['conventional']; // default
    for (const dim of dimensions) {
      if (groupThemes[dim]) {
        groupScenario = groupThemes[dim];
        break;
      }
    }
    
    // Generate scenarios for each question
    const questionScenarios = questions.map((q, idx) => 
      this.getFallbackScenario(q, groupIndex * 5 + idx)
    );
    
    return {
      groupScenario,
      questionScenarios,
    };
  }

  private getFallbackScenario(question: Question, index: number): StoryScenario {
    const dimension = question.dimension?.toLowerCase() || '';
    const testType = question.test_type;
    
    const fallbackMap: Record<string, StoryScenario> = {
      realistic: {
        emoji: '🔧',
        title: 'Thử Thách Thực Tế',
        context: 'Bạn đang ở trong một xưởng với đầy đủ công cụ và thiết bị.',
        situation: question.question_text,
      },
      investigative: {
        emoji: '🔬',
        title: 'Phòng Nghiên Cứu',
        context: 'Trong phòng thí nghiệm, bạn phát hiện điều gì đó thú vị...',
        situation: question.question_text,
      },
      artistic: {
        emoji: '🎨',
        title: 'Studio Sáng Tạo',
        context: 'Bạn bước vào một studio nghệ thuật đầy cảm hứng.',
        situation: question.question_text,
      },
      social: {
        emoji: '🤝',
        title: 'Trung Tâm Cộng Đồng',
        context: 'Tại trung tâm cộng đồng, mọi người cần sự giúp đỡ của bạn...',
        situation: question.question_text,
      },
      enterprising: {
        emoji: '💼',
        title: 'Phòng Họp Kinh Doanh',
        context: 'Trong phòng họp, các quyết định quan trọng đang chờ bạn.',
        situation: question.question_text,
      },
      conventional: {
        emoji: '📊',
        title: 'Phòng Phân Tích',
        context: 'Xung quanh bạn là biểu đồ và số liệu, bạn nhận ra quy luật...',
        situation: question.question_text,
      },
      openness: {
        emoji: '🌟',
        title: 'Khám Phá Mới',
        context: 'Bạn đang đối mặt với một cơ hội mới lạ và thú vị.',
        situation: question.question_text,
      },
      conscientiousness: {
        emoji: '✅',
        title: 'Nhiệm Vụ Quan Trọng',
        context: 'Một dự án quan trọng đang cần sự tập trung và tổ chức của bạn.',
        situation: question.question_text,
      },
      extraversion: {
        emoji: '🎉',
        title: 'Sự Kiện Giao Lưu',
        context: 'Bạn đang ở một sự kiện với nhiều người xung quanh.',
        situation: question.question_text,
      },
      agreeableness: {
        emoji: '💚',
        title: 'Tình Huống Hợp Tác',
        context: 'Trong một nhóm làm việc, mọi người có ý kiến khác nhau.',
        situation: question.question_text,
      },
      neuroticism: {
        emoji: '🎯',
        title: 'Áp Lực Công Việc',
        context: 'Bạn đang đối mặt với một tình huống có áp lực.',
        situation: question.question_text,
      },
    };
    
    // Try to match dimension
    const dimensionKey = dimension.toLowerCase();
    for (const [key, scenario] of Object.entries(fallbackMap)) {
      if (dimensionKey.includes(key)) {
        return scenario;
      }
    }
    
    // Default fallback based on test type
    if (testType === 'RIASEC') {
      const riasecScenarios = ['realistic', 'investigative', 'artistic', 'social', 'enterprising', 'conventional'] as const;
      const idx = index % riasecScenarios.length;
      const scenarioKey = riasecScenarios[idx] as keyof typeof fallbackMap;
      return fallbackMap[scenarioKey]!;
    } else {
      const bigFiveScenarios = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'] as const;
      const idx = index % bigFiveScenarios.length;
      const scenarioKey = bigFiveScenarios[idx] as keyof typeof fallbackMap;
      return fallbackMap[scenarioKey]!;
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}

// Singleton instance
let storyGeneratorService: StoryGeneratorService | null = null;

export const initializeStoryGenerator = (apiKey: string): StoryGeneratorService => {
  storyGeneratorService = new StoryGeneratorService(apiKey);
  return storyGeneratorService;
};

export const getStoryGenerator = (): StoryGeneratorService | null => {
  return storyGeneratorService;
};

export default StoryGeneratorService;
