# Logic Lọc Câu Hỏi và Prompt Engineering Cho Story-Based Assessment

## 📋 Tổng Quan

Tài liệu này phân tích chi tiết logic lọc câu hỏi từ database và cách sử dụng prompt engineering để tạo ra câu chuyện liên kết cho hệ thống đánh giá dựa trên câu chuyện.

---

## 🔍 Logic Lọc Câu Hỏi Chi Tiết

### **Bước 1: Lấy Câu Hỏi Từ Database**

#### **Cấu trúc Database:**
```sql
-- RIASEC Questions: 6 dimensions × 4 questions = 24 câu
Realistic (R): 4 câu
Investigative (I): 4 câu  
Artistic (A): 4 câu
Social (S): 4 câu
Enterprising (E): 4 câu
Conventional (C): 4 câu

-- Big Five Questions: 5 dimensions × 4 questions = 20 câu
Openness (O): 4 câu
Conscientiousness (C): 4 câu
Extraversion (E): 4 câu
Agreeableness (A): 4 câu
Neuroticism (N): 4 câu

TỔNG: 44 câu hỏi trong database
```

#### **API Call Logic:**
```typescript
// assessmentService.ts
async getQuestions(testType: 'RIASEC' | 'BIGFIVE'): Promise<Question[]> {
  const perDim = 4; // 4 câu hỏi mỗi dimension
  const seed = Date.now(); // Seed để đảm bảo tính ngẫu nhiên nhưng có thể reproduce
  
  const response = await api.get<Question[]>(`/api/assessments/questions/${testType}`, {
    params: {
      shuffle: true,    // Trộn câu hỏi trong mỗi dimension
      seed,            // Seed cho random
      per_dim: perDim, // Số câu hỏi mỗi dimension
    },
  });
  
  return response.data;
}
```

### **Bước 2: Trộn và Lọc Câu Hỏi**

#### **Code Implementation:**
```typescript
// StoryBasedAssessment.tsx - loadQuestionsAndStories()
const loadQuestionsAndStories = async () => {
  // Lấy câu hỏi từ 2 bộ test
  const riasecData = await assessmentService.getQuestions('RIASEC');  // 24 câu
  const bigFiveData = await assessmentService.getQuestions('BIGFIVE'); // 20 câu
  
  // Gộp tất cả câu hỏi
  const allQuestions = [...riasecData, ...bigFiveData]; // 44 câu tổng
  
  // Trộn ngẫu nhiên để tránh bias
  const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
  
  // Chọn 30 câu đầu tiên (tối ưu cho trải nghiệm người dùng)
  const selected = shuffled.slice(0, 30); // 30 câu được chọn
  
  setQuestions(selected);
};
```

#### **Lý do chọn 30 câu thay vì 44:**
1. **Trải nghiệm người dùng:** 30 câu = 6 nhóm × 5 câu, dễ chia đều
2. **Thời gian hoàn thành:** ~15-20 phút thay vì 25-30 phút
3. **Chất lượng câu chuyện:** 5 câu/nhóm tạo câu chuyện mạch lạc hơn 7-8 câu/nhóm
4. **Độ chính xác:** 30 câu vẫn đủ để đánh giá chính xác tính cách

### **Bước 3: Chia Thành 6 Nhóm**

#### **Grouping Algorithm:**
```typescript
// generateStoriesFromBackend()
const generateStoriesFromBackend = async (questions: Question[]): Promise<StoryScenario[]> => {
  const scenarios: StoryScenario[] = [];
  const groupSize = 5; // Cố định 5 câu hỏi mỗi nhóm
  
  // Chia tuần tự, không theo dimension
  for (let i = 0; i < questions.length; i += groupSize) {
    const group = questions.slice(i, i + groupSize);
    const groupIndex = Math.floor(i / groupSize);
    
    // Nhóm 0: câu 0-4   (questions[0] đến questions[4])
    // Nhóm 1: câu 5-9   (questions[5] đến questions[9])
    // Nhóm 2: câu 10-14 (questions[10] đến questions[14])
    // Nhóm 3: câu 15-19 (questions[15] đến questions[19])
    // Nhóm 4: câu 20-24 (questions[20] đến questions[24])
    // Nhóm 5: câu 25-29 (questions[25] đến questions[29])
    
    console.log(`Generating story for group ${groupIndex + 1}...`);
    
    // Gọi API để tạo câu chuyện cho nhóm này
    const response = await fetch('/api/assessments/generate-story', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questions: group.map(q => ({
          id: q.id,
          question_text: q.question_text,
          dimension: q.dimension,
          test_type: q.test_type
        })),
        group_index: groupIndex
      })
    });
    
    // Xử lý response và thêm vào scenarios
    const result = await response.json();
    if (result.success && result.data.questionScenarios) {
      scenarios.push(...result.data.questionScenarios);
    }
    
    // Delay giữa các nhóm để tránh rate limit
    if (i + groupSize < questions.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return scenarios; // 30 scenarios tương ứng với 30 câu hỏi
};
```

### **Đặc Điểm Của Logic Grouping:**

#### **1. Sequential Grouping (Không phải Dimension-based):**
```
❌ KHÔNG làm như này (group theo dimension):
Nhóm 1: 5 câu Realistic
Nhóm 2: 5 câu Investigative  
Nhóm 3: 5 câu Artistic
...

✅ LÀM như này (group tuần tự):
Nhóm 1: câu 0,1,2,3,4 (có thể là R,I,A,S,E)
Nhóm 2: câu 5,6,7,8,9 (có thể là C,O,C,E,A)
Nhóm 3: câu 10,11,12,13,14 (có thể là N,R,I,S,C)
...
```

#### **2. Lợi ích của Sequential Grouping:**
- **Đa dạng dimensions:** Mỗi nhóm có câu hỏi từ nhiều dimensions khác nhau
- **Câu chuyện phong phú:** AI phải tạo bối cảnh phức tạp hơn, thú vị hơn
- **Tránh monotony:** Người dùng không bị nhàm chán với cùng một chủ đề
- **Realistic scenarios:** Tình huống thực tế thường yêu cầu nhiều kỹ năng khác nhau

#### **3. Ví dụ Cụ thể Về Một Nhóm:**
```typescript
// Giả sử nhóm 1 có 5 câu hỏi sau (sau khi shuffle):
const group1 = [
  { id: "R_001", question_text: "Tôi thích làm việc với máy móc", dimension: "realistic" },
  { id: "S_003", question_text: "Tôi thích giúp đỡ người khác", dimension: "social" },
  { id: "C_002", question_text: "Tôi thích làm việc theo kế hoạch", dimension: "conventional" },
  { id: "O_001", question_text: "Tôi thích thử nghiệm ý tưởng mới", dimension: "openness" },
  { id: "E_004", question_text: "Tôi thích lãnh đạo nhóm", dimension: "enterprising" }
];

// AI sẽ tạo một câu chuyện kết hợp tất cả 5 dimensions này
// Ví dụ: "Một ngày làm việc tại startup công nghệ"
```

---

## 🤖 Prompt Engineering Chi Tiết

### **Cấu Trúc Prompt Hoàn Chỉnh:**

```python
def _build_group_prompt(self, questions: List[Dict[str, Any]], group_index: int) -> str:
    """Build prompt for Gemini AI"""
    
    # 1. Tạo danh sách câu hỏi với thông tin dimension
    questions_list = '\n'.join([
        f"{idx + 1}. \"{q.get('question_text', '')}\" ({q.get('dimension', 'general')})"
        for idx, q in enumerate(questions)
    ])
    
    # 2. Xây dựng prompt hoàn chỉnh
    return f"""
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

TRẢ VỀ JSON FORMAT (chỉ JSON, không có text khác):
{{
  "groupScenario": {{
    "emoji": "emoji phù hợp với nhóm (ví dụ: 🏢, 🎨, 🔬, 🤝)",
    "title": "Tiêu đề cho nhóm tình huống (3-6 từ, tiếng Việt)",
    "introduction": "Giới thiệu bối cảnh chung cho 5 câu hỏi (2-3 câu, tiếng Việt)"
  }},
  "questions": [
    {{
      "emoji": "emoji cho câu hỏi 1",
      "title": "Tiêu đề ngắn (3-5 từ)",
      "context": "Kịch bản/bối cảnh chi tiết của tình huống (2-3 câu, mô tả sinh động)",
      "situation": "Câu hỏi ngắn gọn dựa trên câu hỏi gốc (1 câu)"
    }}
  ]
}}

VÍ DỤ:
Nhóm câu hỏi về công việc văn phòng:
{{
  "groupScenario": {{
    "emoji": "🏢",
    "title": "Một Ngày Tại Công Ty",
    "introduction": "Bạn là một nhân viên mới tại một công ty công nghệ. Hôm nay là ngày đầu tiên và bạn sẽ trải qua nhiều tình huống khác nhau."
  }},
  "questions": [
    {{
      "emoji": "💻",
      "title": "Sắp Xếp Công Việc",
      "context": "Sáng sớm, bạn nhận được một danh sách dài các nhiệm vụ cần hoàn thành trong tuần này. Có những công việc khẩn cấp, có những việc quan trọng nhưng không gấp, và cả những việc nhỏ lẻ. Bạn cần quyết định cách tổ chức công việc.",
      "situation": "Bạn thích lập kế hoạch chi tiết và sắp xếp công việc theo thứ tự ưu tiên."
    }}
  ]
}}

BẮT ĐẦU TẠO CHO NHÓM CÂU HỎI TRÊN:
"""
```

### **Phân Tích Các Thành Phần Prompt:**

#### **1. Role Definition (Định nghĩa vai trò):**
```
"Bạn là một chuyên gia tạo câu chuyện tương tác cho bài đánh giá nghề nghiệp."
```
- **Mục đích:** Thiết lập context và expertise cho AI
- **Hiệu quả:** AI hiểu được domain và mục tiêu cần đạt

#### **2. Task Specification (Đặc tả nhiệm vụ):**
```
"NHIỆM VỤ: Tạo một câu chuyện liên kết cho nhóm 5 câu hỏi sau, biến chúng thành một tình huống thực tế, sinh động."
```
- **Mục đích:** Định nghĩa rõ ràng output mong muốn
- **Keywords:** "liên kết", "thực tế", "sinh động"

#### **3. Input Data (Dữ liệu đầu vào):**
```
NHÓM CÂU HỎI {group_index + 1}:
{questions_list}
```
- **Format:** Numbered list với dimension info
- **Ví dụ:**
  ```
  1. "Tôi thích làm việc với máy móc" (realistic)
  2. "Tôi thích giúp đỡ người khác" (social)
  3. "Tôi thích làm việc theo kế hoạch" (conventional)
  4. "Tôi thích thử nghiệm ý tưởng mới" (openness)
  5. "Tôi thích lãnh đạo nhóm" (enterprising)
  ```

#### **4. Requirements (Yêu cầu cụ thể):**
```
YÊU CẦU:
1. Tạo một bối cảnh chung (scenario) cho cả nhóm 5 câu hỏi
2. Mỗi câu hỏi là một phần của câu chuyện đó
3. Câu chuyện phải mạch lạc, liên kết với nhau
4. Sử dụng ngôn ngữ Việt Nam tự nhiên, thân thiện
5. Tạo cảm giác như người dùng đang trải nghiệm một tình huống thực tế
```

**Phân tích từng yêu cầu:**

**Yêu cầu 1: "Tạo bối cảnh chung"**
- **Ý nghĩa:** Tạo một setting/environment chung cho tất cả 5 câu hỏi
- **Ví dụ:** "Công ty công nghệ", "Bệnh viện", "Studio nghệ thuật"
- **Mục đích:** Tạo sự nhất quán và immersion

**Yêu cầu 2: "Mỗi câu hỏi là một phần của câu chuyện"**
- **Ý nghĩa:** Không được tạo 5 câu chuyện riêng biệt
- **Thay vào đó:** 5 câu hỏi = 5 moments trong cùng một câu chuyện
- **Ví dụ:** 5 thời điểm khác nhau trong một ngày làm việc

**Yêu cầu 3: "Mạch lạc, liên kết"**
- **Temporal connection:** Thứ tự thời gian (sáng → chiều)
- **Causal connection:** Tình huống này dẫn đến tình huống kia
- **Character consistency:** Cùng một nhân vật, cùng một role

**Yêu cầu 4: "Ngôn ngữ Việt Nam tự nhiên"**
- **Tone:** Thân thiện, không formal quá
- **Vocabulary:** Từ ngữ quen thuộc, dễ hiểu
- **Grammar:** Câu văn mượt mà, không máy móc

**Yêu cầu 5: "Trải nghiệm thực tế"**
- **Realistic scenarios:** Tình huống có thể xảy ra ngoài đời
- **Immersive language:** Dùng "bạn" để tạo sự tham gia
- **Detailed context:** Mô tả chi tiết để người đọc hình dung được

#### **5. Output Format (Định dạng đầu ra):**
```json
{
  "groupScenario": {
    "emoji": "🏢",
    "title": "Một Ngày Tại Công Ty", 
    "introduction": "Bạn là một nhân viên mới..."
  },
  "questions": [
    {
      "emoji": "💻",
      "title": "Sắp Xếp Công Việc",
      "context": "Sáng sớm, bạn nhận được...",
      "situation": "Bạn thích lập kế hoạch chi tiết..."
    }
  ]
}
```

**Phân tích cấu trúc JSON:**

**groupScenario (Bối cảnh nhóm):**
- **emoji:** Visual cue cho theme (🏢=office, 🔬=lab, 🎨=creative)
- **title:** Tên ngắn gọn cho câu chuyện (3-6 từ)
- **introduction:** Mở đầu câu chuyện, thiết lập context (2-3 câu)

**questions (Từng câu hỏi):**
- **emoji:** Icon cho từng tình huống cụ thể
- **title:** Tên ngắn cho tình huống (3-5 từ)
- **context:** Mô tả chi tiết tình huống (2-3 câu)
- **situation:** Câu hỏi được chuyển đổi thành tình huống (1 câu)

#### **6. Example (Ví dụ minh họa):**
```json
{
  "groupScenario": {
    "emoji": "🏢",
    "title": "Một Ngày Tại Công Ty",
    "introduction": "Bạn là một nhân viên mới tại một công ty công nghệ. Hôm nay là ngày đầu tiên và bạn sẽ trải qua nhiều tình huống khác nhau."
  },
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

**Tại sao cần ví dụ:**
- **Pattern recognition:** AI học được format mong muốn
- **Quality benchmark:** Thiết lập standard cho output
- **Consistency:** Đảm bảo tất cả responses có chất lượng tương tự

---

## 🎯 Ví Dụ Thực Tế: Từ 5 Câu Hỏi Đến Câu Chuyện

### **Input: 5 Câu Hỏi Từ Dimensions Khác Nhau**

```
Nhóm 3 (câu 10-14):
1. "Tôi thích sửa chữa đồ vật bằng tay" (realistic)
2. "Tôi thích làm việc với con số và dữ liệu" (conventional) 
3. "Tôi thích gặp gỡ người mới" (extraversion)
4. "Tôi thích giúp đỡ đồng nghiệp khi họ gặp khó khăn" (agreeableness)
5. "Tôi thích thử nghiệm cách làm việc mới" (openness)
```

### **AI Processing: Phân Tích Dimensions**

```
Realistic (R): Hands-on work, practical tasks
Conventional (C): Data, numbers, systematic work  
Extraversion (E): Social interaction, meeting people
Agreeableness (A): Helping others, cooperation
Openness (O): Innovation, trying new methods

→ Theme: "Workplace collaboration with technical problem-solving"
→ Setting: "IT Support team in a company"
```

### **Output: Câu Chuyện "Đội Hỗ Trợ Kỹ Thuật"**

```json
{
  "groupScenario": {
    "emoji": "🔧",
    "title": "Đội Hỗ Trợ Kỹ Thuật", 
    "introduction": "Bạn là thành viên mới của đội IT Support tại một công ty lớn. Hôm nay bạn sẽ trải nghiệm một ngày làm việc đầy thử thách với nhiều tình huống khác nhau cần giải quyết."
  },
  "questions": [
    {
      "emoji": "🔨",
      "title": "Sửa Chữa Thiết Bị",
      "context": "Sáng sớm, một đồng nghiệp mang đến một chiếc laptop bị hỏng. Màn hình không hiển thị và có tiếng kêu lạ từ bên trong. Bạn cần kiểm tra và tìm cách khắc phục.",
      "situation": "Bạn cảm thấy hứng thú khi được tháo rời và sửa chữa thiết bị bằng tay."
    },
    {
      "emoji": "📊", 
      "title": "Phân Tích Báo Cáo",
      "context": "Sau khi sửa xong laptop, bạn nhận được yêu cầu tạo báo cáo thống kê về các sự cố kỹ thuật trong tháng. Có rất nhiều số liệu cần được phân loại và tính toán.",
      "situation": "Bạn thích làm việc với những con số và dữ liệu để tạo ra báo cáo chi tiết."
    },
    {
      "emoji": "🤝",
      "title": "Gặp Gỡ Khách Hàng",
      "context": "Buổi trưa, bạn được phân công đi gặp các phòng ban khác để tìm hiểu nhu cầu hỗ trợ kỹ thuật của họ. Bạn sẽ phải trò chuyện với nhiều người mà bạn chưa từng gặp.",
      "situation": "Bạn cảm thấy thoải mái và thích thú khi được gặp gỡ những người mới."
    },
    {
      "emoji": "💚",
      "title": "Hỗ Trợ Đồng Nghiệp", 
      "context": "Chiều muộn, bạn thấy một đồng nghiệp trong team đang vật lộn với một vấn đề phức tạp và trông có vẻ stress. Anh ấy đã làm việc liên tục mà chưa tìm ra giải pháp.",
      "situation": "Bạn muốn dành thời gian để giúp đỡ đồng nghiệp giải quyết vấn đề."
    },
    {
      "emoji": "💡",
      "title": "Thử Nghiệm Giải Pháp",
      "context": "Cuối ngày, team leader đề xuất thử một phương pháp làm việc mới để tăng hiệu quả. Đây là cách tiếp cận chưa từng được áp dụng ở công ty và có thể có rủi ro.",
      "situation": "Bạn sẵn sàng thử nghiệm cách làm việc mới này để xem liệu nó có hiệu quả không."
    }
  ]
}
```

### **Phân Tích Cách AI Tạo Sự Liên Kết:**

#### **1. Thematic Consistency (Nhất quán chủ đề):**
- **Setting:** IT Support team (phù hợp với realistic + conventional)
- **Role:** Technical support member (cho phép thể hiện tất cả 5 traits)
- **Environment:** Corporate office (realistic workplace)

#### **2. Temporal Progression (Tiến triển thời gian):**
```
8:00 AM  → Sửa chữa thiết bị (Realistic)
10:00 AM → Phân tích báo cáo (Conventional)  
1:00 PM  → Gặp gỡ khách hàng (Extraversion)
4:00 PM  → Hỗ trợ đồng nghiệp (Agreeableness)
5:30 PM  → Thử nghiệm giải pháp (Openness)
```

#### **3. Narrative Flow (Dòng chảy câu chuyện):**
- **Morning:** Individual technical work
- **Midday:** Data analysis and reporting  
- **Afternoon:** Social interaction and collaboration
- **Evening:** Team support and innovation

#### **4. Character Development (Phát triển nhân vật):**
- **Progression:** Từ individual contributor → team collaborator → innovator
- **Skills showcase:** Technical → analytical → social → supportive → creative
- **Realistic arc:** Một ngày làm việc thực tế của IT support

#### **5. Context Richness (Độ phong phú của context):**
- **Specific details:** "laptop bị hỏng", "tiếng kêu lạ", "báo cáo thống kê"
- **Emotional context:** "stress", "hứng thú", "thoải mái"
- **Realistic scenarios:** Tình huống thực tế trong môi trường IT

---

## 🔄 Fallback Mechanisms

### **Khi AI Không Thể Tạo Câu Chuyện:**

```python
def _get_fallback_group_story(self, questions: List[Dict[str, Any]], group_index: int) -> Dict[str, Any]:
    """Fallback scenarios when AI fails"""
    dimensions = [q.get('dimension', '').lower() for q in questions if q.get('dimension')]
    
    # Phân tích dimensions chủ đạo
    group_themes = {
        'realistic': {
            'emoji': '🔧',
            'title': 'Thử Thách Kỹ Thuật',
            'introduction': 'Bạn đang làm việc trong một xưởng với nhiều công cụ và thiết bị. Hãy trải nghiệm các tình huống sau.'
        },
        'investigative': {
            'emoji': '🔬', 
            'title': 'Phòng Nghiên Cứu',
            'introduction': 'Bạn là một nhà nghiên cứu trong phòng thí nghiệm. Hôm nay bạn sẽ đối mặt với nhiều thử thách khoa học.'
        },
        'artistic': {
            'emoji': '🎨',
            'title': 'Studio Sáng Tạo', 
            'introduction': 'Bạn bước vào một studio nghệ thuật đầy cảm hứng. Hãy khám phá khả năng sáng tạo của bạn.'
        },
        'social': {
            'emoji': '🤝',
            'title': 'Trung Tâm Cộng Đồng',
            'introduction': 'Bạn đang làm việc tại trung tâm cộng đồng. Nhiều người cần sự giúp đỡ và hỗ trợ từ bạn.'
        },
        'enterprising': {
            'emoji': '💼',
            'title': 'Văn Phòng Kinh Doanh',
            'introduction': 'Bạn là một nhân viên trong công ty. Hôm nay có nhiều quyết định quan trọng cần được đưa ra.'
        },
        'conventional': {
            'emoji': '📊',
            'title': 'Phòng Phân Tích Dữ Liệu', 
            'introduction': 'Bạn làm việc với số liệu và biểu đồ. Hãy sử dụng kỹ năng tổ chức và phân tích của bạn.'
        }
    }
    
    # Tìm theme phù hợp nhất
    group_scenario = group_themes['conventional']  # default
    for dim in dimensions:
        if dim in group_themes:
            group_scenario = group_themes[dim]
            break
    
    # Tạo scenarios đơn giản cho từng câu hỏi
    question_scenarios = []
    for idx, q in enumerate(questions):
        question_scenarios.append({
            'emoji': '💭',
            'title': f'Tình Huống {idx + 1}',
            'context': 'Hãy suy nghĩ về tình huống này...',
            'situation': q.get('question_text', '')
        })
    
    return {
        'groupScenario': group_scenario,
        'questionScenarios': question_scenarios
    }
```

### **Fallback Strategy:**
1. **Phân tích dimensions:** Tìm dimension chủ đạo trong nhóm
2. **Chọn theme:** Sử dụng predefined themes cho từng dimension
3. **Simple scenarios:** Tạo context đơn giản thay vì câu chuyện phức tạp
4. **Preserve structure:** Vẫn giữ format JSON như AI-generated content

---

## 📊 Kết Luận

### **Tóm Tắt Logic Lọc Câu Hỏi:**
1. **44 câu từ database** (24 RIASEC + 20 Big Five)
2. **Trộn ngẫu nhiên** để tránh bias
3. **Chọn 30 câu** để tối ưu UX
4. **Chia 6 nhóm** × 5 câu/nhóm (sequential, không theo dimension)
5. **AI tạo câu chuyện** cho từng nhóm với prompt engineering

### **Điểm Mạnh Của Approach:**
- **Đa dạng:** Mỗi nhóm có nhiều dimensions khác nhau
- **Realistic:** Câu chuyện phản ánh tình huống thực tế
- **Engaging:** Người dùng cảm thấy như đang trải nghiệm
- **Scalable:** Có thể áp dụng cho bất kỳ bộ câu hỏi nào
- **Robust:** Có fallback khi AI lỗi

### **Kết Quả:**
Thay vì 30 câu hỏi rời rạc, người dùng trải nghiệm 6 câu chuyện liên kết, mỗi câu chuyện kéo dài ~3-5 phút, tạo ra một assessment journey thú vị và có ý nghĩa.