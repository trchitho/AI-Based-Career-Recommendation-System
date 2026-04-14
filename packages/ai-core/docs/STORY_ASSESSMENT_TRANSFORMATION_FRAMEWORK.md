# 📚 STORY ASSESSMENT TRANSFORMATION FRAMEWORK

## 📋 Executive Summary

**Purpose**: Analyze and document the complete logic for transforming traditional assessment questions into interactive story-based scenarios  
**Scope**: Compare "main" branch (traditional) vs "sach" branch (story-based) implementations  
**Focus**: AI-powered question transformation using Gemini API

---

## 🔄 TRANSFORMATION LOGIC FRAMEWORK

### **Phase 1: Traditional Question Analysis** 📊

```typescript
interface TraditionalQuestion {
  id: string;
  type: 'RIASEC' | 'BIG5';
  dimension: 'R' | 'I' | 'A' | 'S' | 'E' | 'C' | 'O' | 'C' | 'E' | 'A' | 'N';
  question_text: string;
  scale: '1-5' | '1-7';
  language: 'en' | 'vi';
}

// Example Traditional Question
{
  id: "R001",
  type: "RIASEC", 
  dimension: "R",
  question_text: "Tôi thích làm việc với máy móc và dụng cụ",
  scale: "1-5",
  language: "vi"
}
```

### **Phase 2: AI Story Generation** 🤖

```python
# Hypothetical Story Generation Service
class StoryGeneratorService:
    def __init__(self):
        self.gemini_client = GeminiClient()
        self.story_templates = self.load_templates()
    
    async def transform_to_story(self, traditional_question: TraditionalQuestion) -> StoryScenario:
        # 1. Analyze question context
        context = self.analyze_question_context(traditional_question)
        
        # 2. Generate story prompt for Gemini
        prompt = self.build_story_prompt(context)
        
        # 3. Call Gemini API
        story_response = await self.gemini_client.generate_story(prompt)
        
        # 4. Parse and structure response
        story = self.parse_story_response(story_response)
        
        return story
```

### **Phase 3: Story Structure** 📖

```typescript
interface StoryScenario {
  id: string;
  traditional_question_id: string;
  title: string;
  emoji: string;
  context: string;          // Bối cảnh tình huống
  situation: string;        // Mô tả chi tiết tình huống
  choices: StoryChoice[];   // 4-5 lựa chọn
  scoring_map: ScoringMap;  // Mapping choice → score
}

interface StoryChoice {
  id: 'A' | 'B' | 'C' | 'D' | 'E';
  text: string;
  trait_score: number;      // 1-5 mapping to original scale
  personality_indicator: string;
}
```

---

## 🎯 EXPECTED TRANSFORMATION EXAMPLES

### **Example 1: Realistic (R) Question**

**Traditional Input:**
```
"Tôi thích sửa chữa đồ điện tử" (1-5 scale)
```

**Expected Story Output:**
```markdown
## 🔧 Tình huống: Sửa chữa trong xưởng

**Bối cảnh**: Bạn đang làm việc tại một công ty sản xuất thiết bị điện tử

**Tình huống**: 
Một thiết bị quan trọng trong dây chuyền sản xuất bị hỏng. 
Kỹ thuật viên chính đang bận, và việc sửa chữa cần được thực hiện ngay.

**Bạn sẽ làm gì?**
A) Chủ động nghiên cứu và sửa chữa thiết bị (Score: 5)
B) Hỗ trợ kỹ thuật viên khi họ rảnh (Score: 4)  
C) Tìm hiểu cách hoạt động để học hỏi (Score: 3)
D) Báo cáo lên cấp trên để xử lý (Score: 2)
E) Tập trung vào công việc khác (Score: 1)
```

### **Example 2: Social (S) Question**

**Traditional Input:**
```
"Tôi thích giúp đỡ người khác giải quyết vấn đề" (1-5 scale)
```

**Expected Story Output:**
```markdown
## 🤝 Tình huống: Đồng nghiệp gặp khó khăn

**Bối cảnh**: Trong một dự án nhóm tại công ty

**Tình huống**:
Một đồng nghiệp mới đang gặp khó khăn với công việc và có vẻ căng thẳng. 
Họ chưa quen với quy trình và công cụ làm việc.

**Bạn sẽ làm gì?**
A) Chủ động hướng dẫn và hỗ trợ chi tiết (Score: 5)
B) Chia sẻ kinh nghiệm khi được hỏi (Score: 4)
C) Giới thiệu họ với người có thể giúp (Score: 3)  
D) Động viên tinh thần và khuyến khích (Score: 2)
E) Để họ tự học và thích nghi (Score: 1)
```

---

## 🔧 TECHNICAL ARCHITECTURE ANALYSIS

### **Frontend Components (Expected)**
```typescript
// Story-based Assessment Components
- StoryBasedAssessment.tsx      // Main assessment container
- StoryScenario.tsx             // Individual story display
- StoryChoices.tsx              // Choice selection interface  
- StoryProgress.tsx             // Progress tracking
- StoryResults.tsx              // Results display

// Services
- storyGeneratorService.ts      // API calls to backend
- storyResponseService.ts       // Handle user responses
- storyScoringService.ts        // Calculate scores
```

### **Backend Services (Expected)**
```python
# Story Generation Pipeline
- story_generator.py            # Main story generation logic
- gemini_integration.py         # Gemini API integration
- story_templates.py            # Story template management
- story_scoring.py              # Response scoring logic

# API Endpoints
POST /api/assessment/generate-story
POST /api/assessment/submit-story-response  
GET  /api/assessment/story-progress
```

### **Database Schema Changes (Expected)**
```sql
-- New tables for story assessment
CREATE TABLE story_scenarios (
    id UUID PRIMARY KEY,
    traditional_question_id UUID REFERENCES assessment_questions(id),
    title VARCHAR(255),
    emoji VARCHAR(10),
    context TEXT,
    situation TEXT,
    choices JSONB,
    scoring_map JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE story_responses (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    story_id UUID REFERENCES story_scenarios(id),
    selected_choice VARCHAR(1),
    response_time INTEGER,
    confidence_level INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 📊 COMPARISON FRAMEWORK: MAIN vs SACH

### **Assessment Flow Comparison**

**MAIN Branch (Traditional):**
```
User Login → Question List → Answer Scale → Next Question → Results
```

**SACH Branch (Story-based):**
```
User Login → Story Generation → Story Display → Choice Selection → Next Story → Results
```

### **Key Differences Expected**

| Aspect | Main Branch | Sach Branch |
|--------|-------------|-------------|
| **Question Format** | Direct questions | Story scenarios |
| **Response Method** | 1-5 scale | Multiple choice |
| **AI Integration** | None | Gemini API |
| **User Engagement** | Low | High |
| **Processing Time** | Fast | Slower (AI generation) |
| **Personalization** | Static | Dynamic stories |

---

## 🎯 ANALYSIS CHECKLIST

### **Code Analysis Tasks**
- [ ] Compare component structures between branches
- [ ] Identify new API endpoints in sach branch
- [ ] Analyze Gemini integration implementation
- [ ] Document story generation algorithms
- [ ] Map data flow from question → story → response

### **Logic Analysis Tasks**  
- [ ] Document story template system
- [ ] Analyze choice-to-score mapping logic
- [ ] Understand caching and performance optimizations
- [ ] Identify fallback mechanisms for AI failures

### **User Experience Analysis**
- [ ] Compare user journey flows
- [ ] Analyze engagement improvements
- [ ] Document accessibility considerations
- [ ] Evaluate mobile responsiveness

---

## 🚀 NEXT STEPS

1. **Obtain Source Files** - Get STORY_ASSESSMENT_GUIDE.md and INTERACTIVE_ASSESSMENT_SETUP.md
2. **Code Comparison** - Analyze actual implementation differences
3. **Flow Documentation** - Create detailed process diagrams
4. **Performance Analysis** - Evaluate system performance implications
5. **Recommendations** - Suggest improvements and optimizations

---

**Status**: Framework Ready - Awaiting Source Materials  
**Next Phase**: Detailed Implementation Analysis  
**Review Date**: Upon source file availability