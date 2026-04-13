# 🎭 Story-Based Assessment - Hướng Dẫn Sử Dụng

## 📖 Tổng Quan

**StoryBasedAssessment** là một component React tương tác biến bài kiểm tra RIASEC và Big Five thành một cuộc phiêu lưu với câu chuyện được tạo tự động bởi **Google Gemini AI**.

### ✨ Điểm Khác Biệt

**Trước đây:**
```
❌ Câu hỏi: "I enjoy working with my hands"
❌ Lựa chọn: 1 2 3 4 5 (khô khan)
```

**Bây giờ:**
```
✅ Tình huống: "🔧 Xưởng Sửa Chữa"
   "Bạn đang ở trong một xưởng với đầy đủ dụng cụ và thiết bị.
    Bạn thích làm việc với tay, sửa chữa và lắp ráp đồ vật."
    
✅ Lựa chọn: 😰 Not Me | 😕 Rarely | 😐 Sometimes | 😊 Often | 🤩 Totally Me!
```

## 🚀 Cài Đặt Nhanh

### 1. Cấu Hình Gemini API Key

Thêm vào file `.env`:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

**Lấy API Key:**
1. Truy cập: https://makersuite.google.com/app/apikey
2. Tạo API key mới
3. Copy và paste vào `.env`

### 2. Import Component

```tsx
import StoryBasedAssessment from './components/assessment/StoryBasedAssessment';
```

### 3. Sử Dụng

```tsx
function AssessmentPage() {
  const handleComplete = (responses: QuestionResponse[]) => {
    console.log('Completed!', responses);
    // Xử lý kết quả
  };

  return <StoryBasedAssessment onComplete={handleComplete} />;
}
```

## 🎯 Cách Hoạt Động

### Flow Tự Động

```
1. Load Questions (30 câu từ RIASEC + Big Five)
   ↓
2. Call Gemini AI để tạo story cho mỗi câu
   ↓
3. Hiển thị dưới dạng flipbook tương tác
   ↓
4. Thu thập câu trả lời
   ↓
5. Submit kết quả
```

### Gemini AI Prompt

Mỗi câu hỏi được gửi đến Gemini với prompt:

```
"Biến câu hỏi sau thành một tình huống thực tế, sinh động:
 
 Câu hỏi: [question_text]
 Loại: [RIASEC/BIGFIVE]
 Chiều kích: [dimension]
 
 Trả về JSON:
 {
   "emoji": "🔧",
   "title": "Tiêu đề ngắn",
   "context": "Bối cảnh tình huống",
   "situation": "Câu hỏi được diễn đạt lại"
 }"
```

### Caching

- Stories được cache tự động
- Không gọi API lặp lại cho cùng câu hỏi
- Clear cache: `storyGenerator.clearCache()`

### Fallback

Nếu Gemini API fail:
- Tự động dùng fallback scenarios
- Dựa trên dimension (R, I, A, S, E, C)
- Không ảnh hưởng UX

## 🎨 Customization

### Thay Đổi Số Câu Hỏi

```tsx
// Trong StoryBasedAssessment.tsx
const selected = shuffled.slice(0, 30); // Thay 30 thành số khác
```

### Thay Đổi Response Options

```tsx
const responseOptions = [
  { value: 1, emoji: '😰', label: 'Not Me', color: '#e74c3c' },
  { value: 2, emoji: '😕', label: 'Rarely', color: '#e67e22' },
  // Thêm hoặc sửa...
];
```

### Thay Đổi Theme

```css
/* StoryBasedAssessment.css */
.story-container {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  /* Đổi màu gradient */
}
```

## 📊 API Response Format

### Input (Questions)

```typescript
interface Question {
  id: string;
  test_type: 'RIASEC' | 'BIGFIVE';
  question_text: string;
  dimension?: string;
}
```

### Output (Responses)

```typescript
interface QuestionResponse {
  questionId: string;
  answer: number; // 1-5
}
```

### Gemini Generated Story

```typescript
interface StoryScenario {
  emoji: string;        // "🔧"
  title: string;        // "Xưởng Sửa Chữa"
  context: string;      // "Bạn đang ở trong..."
  situation: string;    // "Bạn thích làm việc..."
}
```

## 🔧 Troubleshooting

### Gemini API Không Hoạt Động

**Triệu chứng:** Loading mãi không xong

**Giải pháp:**
1. Kiểm tra API key trong `.env`
2. Kiểm tra console log
3. Kiểm tra network tab
4. Đảm bảo có internet

**Fallback:** Component tự động dùng scenarios mặc định

### Stories Không Hay

**Triệu chứng:** Câu chuyện không sinh động

**Giải pháp:**
1. Điều chỉnh prompt trong `storyGeneratorService.ts`
2. Tăng `temperature` (0.7 → 0.9)
3. Thêm examples vào prompt

### Loading Quá Lâu

**Triệu chứng:** Mất >30s để load

**Giải pháp:**
1. Giảm số câu hỏi (30 → 20)
2. Tăng batch delay
3. Cache stories ở backend

## 📈 Performance

### Metrics

- **Load Time:** ~10-15s cho 30 câu hỏi
- **API Calls:** 30 calls (1 per question)
- **Batch Size:** 5 questions per batch
- **Delay:** 1s between batches

### Optimization Tips

```typescript
// Tăng batch size
const batchSize = 10; // từ 5 → 10

// Giảm delay
await new Promise(resolve => setTimeout(resolve, 500)); // từ 1000 → 500

// Pre-generate stories
useEffect(() => {
  // Generate stories khi component mount
  // Cache cho lần sau
}, []);
```

## 🎯 Best Practices

### 1. Error Handling

```tsx
try {
  const scenarios = await storyGenerator.generateBatchScenarios(questions);
  setScenarios(scenarios);
} catch (error) {
  console.error('Failed to generate stories:', error);
  // Fallback to default scenarios
  setScenarios(questions.map((q, i) => getFallbackScenario(q, i)));
}
```

### 2. Loading States

```tsx
setLoadingMessage('📚 Loading questions...');
// ... load questions
setLoadingMessage('✨ Creating stories with AI...');
// ... generate stories
setLoadingMessage('🎉 Ready!');
```

### 3. User Feedback

```tsx
{isAnswered && (
  <div className="continue-hint">
    ✓ Response recorded! Click Next to continue →
  </div>
)}
```

## 🌟 Advanced Features

### Custom Story Templates

```typescript
// Thêm template riêng
const customTemplate = {
  realistic: {
    emoji: '🛠️',
    title: 'Thử Thách Kỹ Thuật',
    context: 'Trong phòng lab...',
  }
};
```

### Multi-Language Support

```typescript
// Thêm vào prompt
const prompt = `
  Viết bằng ${language === 'vi' ? 'tiếng Việt' : 'English'}
  ...
`;
```

### Analytics Tracking

```typescript
const handleAnswer = (questionId: string, value: number) => {
  setAnswers(prev => ({ ...prev, [questionId]: value }));
  
  // Track analytics
  analytics.track('question_answered', {
    questionId,
    value,
    timestamp: Date.now()
  });
};
```

## 📚 Resources

- **Gemini AI Docs:** https://ai.google.dev/docs
- **React Pageflip:** https://github.com/Nodlik/react-pageflip
- **RIASEC Theory:** https://en.wikipedia.org/wiki/Holland_Codes
- **Big Five:** https://en.wikipedia.org/wiki/Big_Five_personality_traits

## 🤝 Support

Nếu gặp vấn đề:
1. Check console logs
2. Check network tab
3. Verify API key
4. Read error messages
5. Check fallback scenarios

---

**Made with ❤️ using Gemini AI**

*Transform boring assessments into engaging adventures!* 🚀
