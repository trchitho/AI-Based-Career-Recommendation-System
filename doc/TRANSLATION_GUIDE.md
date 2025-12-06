# Hướng Dẫn Sử Dụng Hệ Thống Dịch Tự Động

## Tổng Quan

Hệ thống dịch tự động sử dụng Google Translate API để dịch nội dung động từ database (câu hỏi, nghề nghiệp, kỹ năng, v.v.) sang tiếng Việt.

## Cách Sử Dụng

### 1. Dịch Text Đơn Giản

```tsx
import { useAutoTranslate } from '../hooks/useAutoTranslate';

function MyComponent() {
  const question = "What is your favorite hobby?";
  const translated = useAutoTranslate(question);
  
  return <p>{translated}</p>;
}
```

### 2. Dịch Component

```tsx
import TranslatedText from '../components/TranslatedText';

function MyComponent() {
  return (
    <TranslatedText 
      text="What is your favorite hobby?" 
      as="h3"
      className="text-lg font-bold"
    />
  );
}
```

### 3. Dịch Array of Objects

```tsx
import { useAutoTranslateArray } from '../hooks/useAutoTranslate';

function QuestionList({ questions }) {
  // Dịch field 'question_text' và 'description'
  const translated = useAutoTranslateArray(questions, ['question_text', 'description']);
  
  return (
    <div>
      {translated.map(q => (
        <div key={q.id}>
          <h3>{q.question_text}</h3>
          <p>{q.description}</p>
        </div>
      ))}
    </div>
  );
}
```

### 4. Dịch Thủ Công

```tsx
import translationService from '../services/translationService';

async function translateManually() {
  const text = "Hello World";
  const translated = await translationService.translateText(text, 'vi');
  console.log(translated); // "Xin chào thế giới"
}
```

## Tính Năng

✅ **Tự động dịch** - Dịch tự động khi chuyển ngôn ngữ
✅ **Cache** - Lưu cache để tránh dịch lại
✅ **Batch translation** - Dịch nhiều text cùng lúc
✅ **Fallback** - Hiển thị text gốc nếu lỗi
✅ **Miễn phí** - Sử dụng Google Translate API miễn phí

## Lưu Ý

- API miễn phí có giới hạn request, nên sử dụng cache
- Nếu cần dịch nhiều, nên dùng `translateBatch` hoặc `translateArray`
- Text đã dịch được cache, chỉ dịch 1 lần
- Nếu muốn dùng API chính thức, cần thay đổi trong `translationService.ts`

## Ví Dụ Thực Tế

### Dịch Câu Hỏi Assessment

```tsx
// CareerTestComponent.tsx
const translatedQuestions = useAutoTranslateArray(questions, ['question_text']);
```

### Dịch Danh Sách Nghề Nghiệp

```tsx
// CareersPage.tsx
const translatedCareers = useAutoTranslateArray(careers, ['title', 'description']);
```

### Dịch Kỹ Năng

```tsx
// SkillsComponent.tsx
const translatedSkills = useAutoTranslateArray(skills, ['name', 'description']);
```

## API Reference

### `translationService.translateText(text, targetLang)`
Dịch một đoạn text

### `translationService.translateBatch(texts, targetLang)`
Dịch nhiều text cùng lúc

### `translationService.translateObject(obj, fields, targetLang)`
Dịch các field trong object

### `translationService.translateArray(items, fields, targetLang)`
Dịch các field trong array of objects

### `useAutoTranslate(text)`
Hook để dịch text tự động

### `useAutoTranslateArray(items, fields)`
Hook để dịch array tự động
