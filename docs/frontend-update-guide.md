# Frontend Update Guide — Clean Code Architecture
> Senior Frontend Engineer Standards · React + TypeScript + Vite

---

## Cấu trúc phân lớp (Layer Architecture)

```
User Interaction
      │
      ▼
┌────────────────────────────┐
│  PAGE / COMPONENT          │  ← Chỉ render UI, handle user events
│  pages/*.tsx               │  Không biết: API calls, business logic
│  components/**/*.tsx       │
└────────────────────────────┘
      │ calls
      ▼
┌────────────────────────────┐
│  DOMAIN HOOKS              │  ← Orchestrate data + state
│  hooks/use*.ts             │  Biết: service calls, state management
│  (useMentorMatching, ...)  │  Không biết: HTTP, axios details
└────────────────────────────┘
      │ calls
      ▼
┌────────────────────────────┐
│  SERVICE LAYER             │  ← API calls thuần túy
│  services/*.ts             │  Biết: endpoints, request/response format
│  (mentorMatchingService,…) │  Không biết: React state
└────────────────────────────┘
      │ uses
      ▼
┌────────────────────────────┐
│  API CLIENT                │  ← HTTP transport + auth + error normalization
│  lib/api-client.ts         │  Biết: axios, interceptors, token refresh
└────────────────────────────┘
      │
      ▼
   Backend API (FastAPI)
```

---

## Muốn thêm/sửa X → vào file nào?

### Data Fetching

| Muốn thêm/sửa | File | Hàm / Object |
|---------------|------|--------------|
| Thêm API endpoint mới | `constants/index.ts` | Object `API_ENDPOINTS` |
| Đổi timeout HTTP | `lib/api-client.ts` | `axios.create({ timeout: … })` |
| Đổi cách lưu token (cookie) | `lib/api-client.ts` | Class `TokenStorage` |
| Thêm global request header | `lib/api-client.ts` | `requestInterceptor` |
| Đổi error message cho HTTP 403 | `lib/api-client.ts` | `fallbackMessages` trong `normalizeAxiosError()` |
| Thêm retry logic | `lib/api-client.ts` | Response interceptor |

### State Management & Hooks

| Muốn thêm/sửa | File | Hàm |
|---------------|------|-----|
| Thêm filter mentor | `hooks/useMentorMatching.ts` | Thêm `filterOptions` state vào `useMentors()` |
| Thêm pagination | `hooks/useMentorMatching.ts` | Thêm `page` param vào `execute()` |
| Thêm toast khi lỗi | `hooks/useAsync.ts` | `onError` callback option |
| Loading state cho 1 action cụ thể | `hooks/useMentorMatching.ts` | Pattern `respondingSessionId` state |
| Thêm optimistic update | `hooks/useAsync.ts` | Dùng `setData()` sau action |
| Cache data | `hooks/useAsync.ts` | Tích hợp react-query hoặc SWR |

### UI Components

| Muốn thêm/sửa | File | Hàm |
|---------------|------|-----|
| Đổi format ngày tháng | `utils/format.ts` | `formatDate()`, `formatDateTime()` |
| Đổi format tiền tệ | `utils/format.ts` | `formatVnd()`, `formatUsd()` |
| Thêm route mới | `constants/index.ts` | Object `ROUTES` |
| Đổi màu badge status | Tìm component dùng `SESSION_STATUS` hoặc `REQUEST_STATUS` |
| Đổi thời gian toast | `constants/index.ts` | `TOAST_DURATION` |

### Mentor Matching Cụ Thể

| Muốn thêm/sửa | File | Hàm |
|---------------|------|-----|
| Thêm tab mới vào MentorMatchingPage | `pages/MentorMatchingPage.tsx` | Type `Tab` + `mm-tabs` div |
| Đổi thuật toán hiển thị score bar | `pages/MentorMatchingPage.tsx` | Component `ScoreBar` |
| Thêm field vào mentor card | `pages/MentorMatchingPage.tsx` | Card render trong `tab === 'find'` |
| Thêm loại notification WS | `components/chatbot/ChatbotButton.tsx` | Switch-case trong `openNotificationSocket` callback |
| Đổi thời gian reminder | `constants/index.ts` | `SESSION_REMINDER_MINUTES` |

### Chat & Real-time

| Muốn thêm/sửa | File | Hàm |
|---------------|------|-----|
| Thêm event WS mới | `components/chatbot/ChatbotButton.tsx` + `services/chatService.ts` | Switch-case + `openNotificationSocket()` |
| Đổi polling interval | `constants/index.ts` | `POLLING_INTERVAL_MS` |
| Thêm message types | `services/chatService.ts` | Interface `ChatMessage` |
| Đổi format tin nhắn hiển thị | `components/chat/ChatModal.tsx` | Message render |

---

## Naming Conventions

```typescript
// ✅ Đúng — tự giải thích
const mentorProfileData = await mentorMatchingService.getMentorProfile();
const isSessionConfirmed = session.status === SESSION_STATUS.CONFIRMED;
const formattedSessionTime = formatSessionTime(session.scheduled_at);

// ❌ Sai — mơ hồ
const d = await service.get();
const ok = s.status === 'confirmed';
const t = fmt(s.scheduled_at);
```

### Pattern đặt tên hooks

| Hook type | Pattern | Ví dụ |
|-----------|---------|-------|
| Data fetching | `use{Resource}` | `useMentors`, `useSessions` |
| Action | `use{Domain}Actions` | `useMentorActions` |
| Form state | `use{Feature}Form` | `useMentorProfileForm` |
| UI state | `use{Feature}UI` | `useMentorMatchingUI` |
| Domain combined | `use{Domain}` | `useMentorMatching` (re-export sub-hooks) |

---

## Component Pattern: Smart vs Dumb

```tsx
// ❌ Sai: Component biết quá nhiều
const MentorCard = ({ mentorId }) => {
  const [mentor, setMentor] = useState(null);
  useEffect(() => {
    fetch(`/api/mentors/${mentorId}`).then(/* ... */);
  }, [mentorId]);
  return <div>{mentor?.name}</div>;
};

// ✅ Đúng: Tách Smart (container) và Dumb (presentational)

// Dumb component — chỉ render props
const MentorCard: React.FC<{ mentor: MentorMatch; onRequest: () => void }> = ({
  mentor, onRequest,
}) => (
  <div>{mentor.mentor_name}</div>
);

// Smart component — fetch data, pass xuống Dumb
const MentorCardContainer: React.FC<{ mentorId: number }> = ({ mentorId }) => {
  const { mentors } = useMentors();
  const mentor = mentors.find(m => m.mentor_id === mentorId);
  if (!mentor) return null;
  return <MentorCard mentor={mentor} onRequest={() => {}} />;
};
```

---

## useAsync Pattern — Thay thế cho useState boilerplate

```typescript
// ❌ Trước: 3 useState + try/catch lặp lại khắp nơi
const [mentors, setMentors] = useState([]);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState(null);

useEffect(() => {
  setIsLoading(true);
  mentorMatchingService.findMentors()
    .then(setMentors)
    .catch(e => setError(e.message))
    .finally(() => setIsLoading(false));
}, []);

// ✅ Sau: 1 hook, consistent, typed
const { data: mentors, isLoading, error, execute: refresh } = useAsync(
  () => mentorMatchingService.findMentors(),
  { immediate: true, initialData: [] },
);
```

---

## Error Handling Standards

```typescript
// Service layer: throw ApiError (đã được normalize từ api-client)
// Hook layer: catch và set error state, return false
// Component: hiển thị error state từ hook

// Pattern trong hook
const saveProfile = async (data: MentorProfileCreate): Promise<boolean> => {
  try {
    await mentorMatchingService.createOrUpdateMentorProfile(data);
    return true;
  } catch (error) {
    // isApiError(error) để check và lấy error.message
    return false;
  }
};

// Pattern trong component
const handleSave = async () => {
  const success = await saveProfile(formData);
  if (success) {
    showToast('Lưu thành công!', 'success');
  } else {
    showToast('Lưu thất bại, vui lòng thử lại', 'error');
  }
};
```

---

## Constants — không còn magic strings

```typescript
// ❌ Trước
if (session.status === 'confirmed') { ... }
navigate('/skill-gap/' + id);
localStorage.getItem('accessToken');

// ✅ Sau
import { SESSION_STATUS, ROUTES, STORAGE_KEYS } from '../constants';
if (session.status === SESSION_STATUS.CONFIRMED) { ... }
navigate(ROUTES.SKILL_GAP_RESULT(id));
localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
```
