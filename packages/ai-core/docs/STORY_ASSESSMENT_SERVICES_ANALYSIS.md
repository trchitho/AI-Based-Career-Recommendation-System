# Phân Tích Chi Tiết Các Dịch Vụ Trong Hệ Thống Đánh Giá Dựa Trên Câu Chuyện

## 📋 Tổng Quan

Tài liệu này phân tích chi tiết 7 file chính trong hệ thống chuyển đổi đánh giá truyền thống thành đánh giá dựa trên câu chuyện tương tác với AI.

---

## 🔧 1. story_generator.py (Backend Service)

### **Chức năng chính:**
- **Dịch vụ tạo câu chuyện sử dụng Gemini AI**
- Chuyển đổi câu hỏi truyền thống thành kịch bản tương tác

### **Logic Lọc Câu Hỏi Chi Tiết:**

#### **Bước 1: Lấy Câu Hỏi Từ Database**
```typescript
// assessmentService.getQuestions()
const riasecData = await assessmentService.getQuestions('RIASEC');  // 24 câu (6 dimensions × 4 câu/dimension)
const bigFiveData = await assessmentService.getQuestions('BIGFIVE'); // 20 câu (5 dimensions × 4 câu/dimension)
// Tổng: 44 câu hỏi từ database
```

#### **Bước 2: Trộn và Chọn Câu Hỏi**
```typescript
// StoryBasedAssessment.tsx
const allQuestions = [...riasecData, ...bigFiveData];           // 44 câu
const shuffled = [...allQuestions].sort(() => Math.random() - 0.5); // Trộn ngẫu nhiên
const selected = shuffled.slice(0, 30);                        // Chọn 30 câu đầu
```

#### **Bước 3: Chia Thành 6 Nhóm**
```typescript
// generateStoriesFromBackend()
const groupSize = 5;  // 5 câu hỏi/nhóm
for (let i = 0; i < questions.length; i += groupSize) {
  const group = questions.slice(i, i + groupSize);  // Nhóm 1: câu 0-4, Nhóm 2: câu 5-9, ...
  const groupIndex = Math.floor(i / groupSize);     // 0, 1, 2, 3, 4, 5 (6 nhóm)
}
// Kết quả: 30 câu → 6 nhóm × 5 câu/nhóm
```

### **Cách Tạo Bối Cảnh Chung và Câu Chuyện Liên Kết:**

#### **1. Tạo Bối Cảnh Chung (Group Scenario):**
```json
{
  "groupScenario": {
    "emoji": "🏢",
    "title": "Một Ngày Tại Công Ty",
    "introduction": "Bạn là một nhân viên mới tại một công ty công nghệ. Hôm nay là ngày đầu tiên và bạn sẽ trải qua nhiều tình huống khác nhau."
  }
}
```

**Logic tạo bối cảnh:**
- **Phân tích dimensions:** AI đọc 5 câu hỏi và xác định chủ đề chung (realistic, social, enterprising...)
- **Tạo setting:** Chọn môi trường phù hợp (văn phòng, phòng lab, studio nghệ thuật...)
- **Xây dựng narrative:** Tạo câu chuyện khung để 5 câu hỏi có thể "cắm" vào

#### **2. Mỗi Câu Hỏi Là Một Phần Của Câu Chuyện:**
```json
{
  "questions": [
    {
      "emoji": "💻",
      "title": "Sắp Xếp Công Việc",
      "context": "Sáng sớm, bạn nhận được một danh sách dài các nhiệm vụ cần hoàn thành trong tuần này. Có những công việc khẩn cấp, có những việc quan trọng nhưng không gấp, và cả những việc nhỏ lẻ. Bạn cần quyết định cách tổ chức công việc.",
      "situation": "Bạn thích lập kế hoạch chi tiết và sắp xếp công việc theo thứ tự ưu tiên."
    }
  ]
}
```

**Cách liên kết câu chuyện:**
- **Context:** Mô tả tình huống cụ thể trong bối cảnh chung
- **Situation:** Chuyển đổi câu hỏi gốc thành tình huống thực tế
- **Progression:** 5 câu hỏi tạo thành một chuỗi sự kiện liên tiếp trong cùng một ngày/dự án/tình huống

### **Kiến trúc:**
```python
class StoryGeneratorService:
    - __init__(): Khởi tạo Gemini API
    - _initialize_model(): Thử nhiều model Gemini với fallback
    - generate_group_story(): Tạo câu chuyện cho nhóm 5 câu hỏi
    - _build_group_prompt(): Xây dựng prompt cho AI
    - _get_fallback_group_story(): Kịch bản dự phòng khi AI lỗi
```

### **Đặc điểm kỹ thuật:**
- **Models sử dụng:** gemma-3-4b-it, gemini-1.5-flash, gemini-pro (fallback hierarchy)
- **Xử lý nhóm:** 5 câu hỏi/nhóm để tạo câu chuyện liên kết
- **Định dạng output:** JSON với groupScenario và questionScenarios
- **Ngôn ngữ:** Tiếng Việt tự nhiên, thân thiện
- **Error handling:** Tự động fallback về kịch bản có sẵn

### **Prompt Engineering:**
```
Bạn là một chuyên gia tạo câu chuyện tương tác cho bài đánh giá nghề nghiệp.

NHIỆM VỤ: Tạo một câu chuyện liên kết cho nhóm 5 câu hỏi sau, biến chúng thành một tình huống thực tế, sinh động.

NHÓM CÂU HỎI {group_index + 1}:
{questions_list}

YÊU CẦU:
1. Tạo một bối cảnh chung (scenario) cho cả nhóm 5 câu hỏi
2. Mỗi câu hỏi là một phần của câu chuyện đó
3. Câu chuyện phải mạch lạc, liên kết với nhau
4. Sử dụng ngôn ngữ Việt Nam tự nhiên, thân thiện
5. Tạo cảm giác như người dùng đang trải nghiệm một tình huống thực tế
```

### **Ví Dụ Cụ Thể Về Cách Tạo Câu Chuyện Liên Kết:**

#### **Input: 5 câu hỏi từ dimensions khác nhau**
```
1. "Tôi thích làm việc với máy móc" (Realistic)
2. "Tôi thích giải quyết vấn đề phức tạp" (Investigative)  
3. "Tôi thích làm việc theo kế hoạch chi tiết" (Conventional)
4. "Tôi thích làm việc nhóm" (Social)
5. "Tôi thích đưa ra quyết định quan trọng" (Enterprising)
```

#### **Output: Câu chuyện liên kết "Một Ngày Tại Công Ty Công Nghệ"**

**Bối cảnh chung:**
```json
{
  "groupScenario": {
    "emoji": "🏢",
    "title": "Một Ngày Tại Công Ty",
    "introduction": "Bạn là một nhân viên mới tại một công ty công nghệ. Hôm nay là ngày đầu tiên và bạn sẽ trải qua nhiều tình huống khác nhau từ sáng đến chiều."
  }
}
```

**5 câu hỏi được "cắm" vào câu chuyện:**

1. **8:00 AM - Thiết lập workspace:**
```json
{
  "context": "Sáng sớm, bạn được dẫn đến bàn làm việc mới. Trước mặt là một máy tính hiện đại và nhiều thiết bị kỹ thuật cần được cài đặt.",
  "situation": "Bạn cảm thấy hứng thú khi được làm việc với các thiết bị công nghệ này."
}
```

2. **10:00 AM - Gặp vấn đề kỹ thuật:**
```json
{
  "context": "Trong lúc làm việc, hệ thống gặp lỗi phức tạp. Các đồng nghiệp đang bối rối không biết nguyên nhân.",
  "situation": "Bạn muốn tìm hiểu sâu vào vấn đề và phân tích từng bước để tìm ra giải pháp."
}
```

3. **1:00 PM - Lập kế hoạch dự án:**
```json
{
  "context": "Sau bữa trưa, team leader giao cho bạn nhiệm vụ tổ chức timeline cho dự án mới. Có rất nhiều task cần sắp xếp.",
  "situation": "Bạn thích tạo ra một kế hoạch chi tiết với từng bước được định rõ thời gian."
}
```

4. **3:00 PM - Họp nhóm:**
```json
{
  "context": "Buổi chiều, bạn tham gia meeting với team. Mọi người đang thảo luận về hướng phát triển sản phẩm.",
  "situation": "Bạn cảm thấy thoải mái khi làm việc và đóng góp ý kiến cùng với đồng nghiệp."
}
```

5. **5:00 PM - Quyết định quan trọng:**
```json
{
  "context": "Cuối ngày, có một vấn đề cần quyết định ngay để không ảnh hưởng đến tiến độ dự án. Manager hỏi ý kiến của bạn.",
  "situation": "Bạn sẵn sàng đưa ra quyết định và chịu trách nhiệm về lựa chọn của mình."
}
```

### **Cách AI Tạo Ra Sự Liên Kết:**
1. **Thời gian tuần tự:** Từ 8AM → 5PM trong cùng một ngày
2. **Nhân vật nhất quán:** "Bạn" là nhân viên mới
3. **Môi trường cố định:** Công ty công nghệ
4. **Progression logic:** Mỗi tình huống dẫn đến tình huống tiếp theo
5. **Emotional arc:** Từ nervous (sáng) → confident (chiều)

---

## 🌐 2. routes_assessments.py (API Endpoint - Dòng 675+)

### **Chức năng chính:**
- **API endpoint `/generate-story`** để tạo kịch bản câu chuyện
- Kết nối frontend với StoryGeneratorService

### **Cấu trúc API:**
```python
@router.post("/generate-story")
def generate_story_scenarios(request: GenerateStoryRequest)

# Input Schema:
class QuestionForStory(BaseModel):
    id: str
    question_text: str
    dimension: Optional[str] = None
    test_type: str

class GenerateStoryRequest(BaseModel):
    questions: List[QuestionForStory]
    group_index: int
```

### **Xử lý logic:**
1. **Import động:** Tự động import StoryGeneratorService
2. **Chuyển đổi dữ liệu:** Pydantic models → dict
3. **Gọi AI service:** story_service.generate_group_story()
4. **Error handling:** Trả về fallback nếu AI lỗi
5. **Response format:** JSON với success flag và data

### **Response Structure:**
```json
{
  "success": true,
  "data": {
    "groupScenario": {
      "emoji": "🏢",
      "title": "Một Ngày Tại Công Ty",
      "introduction": "Bạn là nhân viên mới..."
    },
    "questionScenarios": [...]
  }
}
```

---

## ⚛️ 3. EnhancedAssessmentFlow.tsx (React Component)

### **Chức năng chính:**
- **Orchestrator component** điều phối toàn bộ luồng đánh giá cải tiến
- Quản lý các bước: intro → assessment → processing → complete

### **State Management:**
```typescript
type FlowStep = 'intro' | 'assessment' | 'processing' | 'complete';
const [currentStep, setCurrentStep] = useState<FlowStep>('intro');
const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
```

### **Luồng xử lý:**
1. **Intro Screen:** Giới thiệu tính năng với UI gradient đẹp mắt
2. **Assessment:** Gọi StoryBasedAssessment component
3. **Processing:** Hiển thị loading với animation AI analysis
4. **Complete:** Chuyển kết quả về parent component

### **Tích hợp Backend:**
```typescript
// Submit assessment
const submitResponse = await fetch('/api/assessments/submit', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ testTypes: ['RIASEC', 'BIGFIVE'], responses })
});

// Get AI-enhanced results
const resultsResponse = await fetch(`/api/assessments/${assessmentId}/results`);
```

### **AI Enhancement Features:**
- **Gemini Integration:** Tạo câu chuyện "Một ngày trong cuộc đời"
- **Career Challenges:** Phân tích thử thách nghề nghiệp
- **Personalized Advice:** Lời khuyên cá nhân hóa từ AI

### **Fallback Logic:**
- Nếu backend lỗi → xử lý local với thuật toán cơ bản
- Tính điểm RIASEC và Big Five offline
- Tạo gợi ý nghề nghiệp từ database có sẵn

---

## 🎨 4. StoryBasedAssessment.css (Styling)

### **Chức năng chính:**
- **Tạo trải nghiệm sách tương tác** với hiệu ứng 3D
- Responsive design cho mọi thiết bị

### **Kiến trúc CSS:**
```css
.story-container {
  /* Layout chính với gradient background */
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  display: flex;
  justify-content: space-between;
}

.story-book {
  /* Hiệu ứng 3D cho sách */
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5);
  transform-style: preserve-3d;
  perspective: 2000px;
}
```

### **Tính năng nổi bật:**
1. **3D Book Effect:** Hiệu ứng sách thật với shadow và perspective
2. **Page Animations:** Chuyển trang mượt mà với react-pageflip
3. **Progress Bar:** Thanh tiến độ floating với gradient
4. **Responsive Design:** Tự động điều chỉnh kích thước sách
5. **Interactive Elements:** Hover effects cho buttons và cards

### **Theme System:**
- **Cover Pages:** Gradient purple-blue với typography đẹp
- **Content Pages:** Background trắng với subtle shadows
- **Response Buttons:** Color-coded theo mức độ đồng ý
- **Navigation:** Floating buttons với smooth transitions

### **Accessibility:**
- **Scrollbar ẩn:** Giữ UX sạch sẽ
- **Focus states:** Rõ ràng cho keyboard navigation
- **Color contrast:** Đảm bảo đọc được trên mọi background

---

## 📖 5. StoryBasedAssessment.tsx (Main Component)

### **Chức năng chính:**
- **Component chính** hiển thị sách tương tác với câu chuyện AI
- Quản lý toàn bộ trải nghiệm đánh giá

### **State Architecture:**
```typescript
const [currentPage, setCurrentPage] = useState(0);
const [answers, setAnswers] = useState<Record<string, number>>({});
const [questions, setQuestions] = useState<Question[]>([]);
const [scenarios, setScenarios] = useState<StoryScenario[]>([]);
const [loading, setLoading] = useState(true);
const [storyProgress, setStoryProgress] = useState(0);
```

### **Luồng hoạt động:**
1. **Load Questions:** Lấy 30 câu hỏi từ RIASEC + Big Five
2. **Generate Stories:** Gọi API `/generate-story` theo nhóm 5 câu
3. **Display Book:** Hiển thị sách với react-pageflip
4. **Collect Responses:** Thu thập câu trả lời từng trang
5. **Submit Results:** Gửi kết quả về parent component

### **Story Generation Logic:**
```typescript
const generateStoriesFromBackend = async (questions: Question[]) => {
  const scenarios: StoryScenario[] = [];
  const groupSize = 5;
  
  for (let i = 0; i < questions.length; i += groupSize) {
    const group = questions.slice(i, i + groupSize);
    const response = await fetch('/api/assessments/generate-story', {
      method: 'POST',
      body: JSON.stringify({
        questions: group.map(q => ({
          id: q.id,
          question_text: q.question_text,
          dimension: q.dimension,
          test_type: q.test_type
        })),
        group_index: Math.floor(i / groupSize)
      })
    });
    // Process response...
  }
};
```

### **Book Structure:**
1. **Cover Page:** Tiêu đề "Your Career Journey"
2. **Welcome Page:** Giới thiệu tính năng
3. **Instructions Page:** Hướng dẫn sử dụng
4. **Question Pages:** 1 câu hỏi/trang với kịch bản AI
5. **Ending Page:** Tổng kết và nút Submit
6. **Back Cover:** Quote inspirational

### **Response System:**
```typescript
const responseOptions = [
  { value: 1, label: 'Not Me', color: '#e74c3c' },
  { value: 2, label: 'Rarely', color: '#e67e22' },
  { value: 3, label: 'Sometimes', color: '#f39c12' },
  { value: 4, label: 'Often', color: '#27ae60' },
  { value: 5, label: 'Totally Me!', color: '#2ecc71' },
];
```

### **Error Handling:**
- **API Failures:** Fallback về kịch bản có sẵn
- **Loading States:** Spinner với messages động
- **Validation:** Kiểm tra câu trả lời trước khi chuyển trang

---

## 🤖 6. geminiService.ts (AI Integration Service)

### **Chức năng chính:**
- **Dịch vụ tích hợp Gemini AI** cho frontend
- Tạo nội dung cá nhân hóa sau khi hoàn thành đánh giá

### **Class Architecture:**
```typescript
class GeminiService {
  private config: GeminiConfig;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
  
  // Core methods:
  - generateCareerNarrative(): Tạo câu chuyện nghề nghiệp
  - generateDayInLifeStory(): Mô tả một ngày làm việc
  - generateCareerChallenges(): Liệt kê thử thách nghề nghiệp
  - generatePersonalizedAdvice(): Lời khuyên cá nhân hóa
  - generateInteractiveScenario(): Tạo tình huống tương tác
}
```

### **API Integration:**
```typescript
const response = await fetch(`${this.baseUrl}/${this.config.model}:generateContent?key=${this.config.apiKey}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    }
  })
});
```

### **Prompt Engineering Examples:**
```typescript
// Day in Life Story
const prompt = `
Tạo một câu chuyện "Một ngày trong cuộc đời" của một ${careerTitle} với tính cách:
- Openness: ${personalityProfile.bigFive.openness}
- Conscientiousness: ${personalityProfile.bigFive.conscientiousness}
...
Viết bằng tiếng Việt, tối đa 300 từ, mô tả chi tiết từ sáng đến tối.
`;
```

### **Fallback System:**
- **Network errors:** Trả về nội dung có sẵn
- **API limits:** Sử dụng template responses
- **Invalid responses:** Parse và format lại

### **Singleton Pattern:**
```typescript
let geminiService: GeminiService | null = null;

export const initializeGeminiService = (apiKey: string): GeminiService => {
  geminiService = new GeminiService(apiKey);
  return geminiService;
};
```

---

## 📱 7. storyGeneratorService.ts (Frontend Story Service)

### **Chức năng chính:**
- **Frontend service** gọi Gemini API trực tiếp từ browser
- Tạo kịch bản câu chuyện cho assessment (alternative approach)

### **Class Structure:**
```typescript
class StoryGeneratorService {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
  private model = 'gemini-1.5-flash';
  private cache: Map<string, any> = new Map();
  
  // Main methods:
  - generateBatchScenarios(): Tạo kịch bản theo batch
  - generateGroupStory(): Tạo câu chuyện cho nhóm 5 câu hỏi
  - callGeminiAPI(): Gọi API trực tiếp
  - parseGroupResponse(): Parse JSON response từ AI
}
```

### **Batch Processing:**
```typescript
async generateBatchScenarios(questions: Question[]): Promise<StoryScenario[]> {
  const scenarios: StoryScenario[] = [];
  const groupSize = 5;
  
  for (let i = 0; i < questions.length; i += groupSize) {
    const group = questions.slice(i, i + groupSize);
    const groupIndex = Math.floor(i / groupSize);
    
    try {
      const groupStory = await this.generateGroupStory(group, groupIndex);
      scenarios.push(...groupStory.questionScenarios);
    } catch (error) {
      // Fallback scenarios
      const groupStory = this.getFallbackGroupStory(group, groupIndex);
      scenarios.push(...groupStory.questionScenarios);
    }
    
    // Delay between groups
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  return scenarios;
}
```

### **Caching System:**
```typescript
const cacheKey = `group-${groupIndex}-${questions.map(q => q.id).join('-')}`;
const cached = this.cache.get(cacheKey);
if (cached) {
  return cached;
}
// Generate and cache result
this.cache.set(cacheKey, result);
```

### **Fallback Themes:**
```typescript
const groupThemes = {
  realistic: {
    emoji: '🔧',
    title: 'Thử Thách Kỹ Thuật',
    introduction: 'Bạn đang làm việc trong một xưởng...'
  },
  investigative: {
    emoji: '🔬',
    title: 'Phòng Nghiên Cứu',
    introduction: 'Bạn là một nhà nghiên cứu...'
  },
  // ... other RIASEC dimensions
};
```

### **Response Parsing:**
```typescript
private parseGroupResponse(response: string, questions: Question[]): GroupStory {
  let jsonStr = response.trim();
  
  // Remove markdown code blocks
  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  }
  
  const parsed = JSON.parse(jsonStr);
  
  return {
    groupScenario: {
      emoji: parsed.groupScenario?.emoji || '📖',
      title: parsed.groupScenario?.title || 'Tình Huống',
      introduction: parsed.groupScenario?.introduction || 'Hãy trải nghiệm...',
    },
    questionScenarios: (parsed.questions || []).map((q: any, idx: number) => ({
      emoji: q.emoji || '💭',
      title: q.title || `Câu hỏi ${idx + 1}`,
      context: q.context || 'Trong tình huống này...',
      situation: q.situation || questions[idx]?.question_text || '',
    })),
  };
}
```

---

## 🔄 Tương Tác Giữa Các Dịch Vụ

### **Luồng hoạt động tổng thể:**

1. **Frontend Request:** StoryBasedAssessment.tsx gọi API
2. **API Processing:** routes_assessments.py nhận request
3. **AI Generation:** story_generator.py tạo câu chuyện với Gemini
4. **Response:** Trả về JSON với kịch bản đã tạo
5. **UI Rendering:** Component hiển thị sách tương tác
6. **User Interaction:** Thu thập responses từ user
7. **Result Processing:** EnhancedAssessmentFlow xử lý kết quả
8. **AI Enhancement:** geminiService tạo nội dung cá nhân hóa

### **Backup Strategies:**
- **Backend fallback:** story_generator.py có kịch bản có sẵn
- **Frontend fallback:** storyGeneratorService.ts gọi trực tiếp Gemini
- **Offline mode:** Sử dụng câu hỏi truyền thống nếu AI lỗi

---

## 📊 Kết Luận

Hệ thống story-based assessment là một kiến trúc phức tạp với 7 thành phần chính:

1. **story_generator.py:** Core AI service (Backend)
2. **routes_assessments.py:** API gateway
3. **EnhancedAssessmentFlow.tsx:** Orchestrator component
4. **StoryBasedAssessment.css:** 3D UI styling
5. **StoryBasedAssessment.tsx:** Main interactive component
6. **geminiService.ts:** AI enhancement service
7. **storyGeneratorService.ts:** Alternative frontend AI service

Mỗi service đều có fallback mechanisms để đảm bảo hệ thống hoạt động ổn định ngay cả khi AI services gặp sự cố.