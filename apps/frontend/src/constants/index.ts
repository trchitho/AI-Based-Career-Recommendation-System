/**
 * @file constants/index.ts
 * @description Tất cả magic strings/numbers được đặt tên ở đây.
 *
 * Tại sao cần file này?
 * - Không còn "pending", "confirmed" scattered khắp codebase
 * - Đổi tên status/route ở 1 chỗ → tất cả nơi khác tự cập nhật
 * - IDE auto-complete giảm typo
 *
 * Update guide:
 *   - Thêm route mới        → thêm vào ROUTES
 *   - Thêm session status   → thêm vào SESSION_STATUS
 *   - Thêm local storage key → thêm vào STORAGE_KEYS
 */

// ─────────────────────────────────────────────────────────────
//  Routes
// ─────────────────────────────────────────────────────────────

export const ROUTES = {
  HOME:            '/home',
  DASHBOARD:       '/dashboard',
  LOGIN:           '/login',
  REGISTER:        '/register',
  PROFILE:         '/profile',
  ASSESSMENT:      '/assessment',
  CAREERS:         '/careers',
  CAREER_DETAIL:   (idOrSlug: string) => `/careers/${idOrSlug}`,
  ROADMAP:         (careerId: string) => `/careers/${careerId}/roadmap`,
  SKILL_GAP:       '/skill-gap',
  SKILL_GAP_RESULT:(id: number) => `/skill-gap/${id}`,
  CV_HISTORY:      '/cv-history',
  MENTOR_MATCHING: '/mentor-matching',
  BLOG:            '/blog',
  BLOG_DETAIL:     (slug: string) => `/blog/${slug}`,
  PRICING:         '/pricing',
  RESULTS:         (id: string) => `/results/${id}`,
} as const;

// ─────────────────────────────────────────────────────────────
//  API Endpoints (match với backend prefix)
// ─────────────────────────────────────────────────────────────

export const API_ENDPOINTS = {
  // Auth
  AUTH_REFRESH:          '/api/auth/refresh',
  AUTH_ME:               '/api/users/me',

  // Mentor Matching
  MENTOR_PROFILE:        '/api/mentor-matching/mentor/profile',
  MENTOR_REQUESTS:       '/api/mentor-matching/mentor/requests',
  MENTOR_RESPOND:        '/api/mentor-matching/mentor/respond',
  MENTEE_PROFILE:        '/api/mentor-matching/mentee/profile',
  MENTEE_FIND_MENTORS:   '/api/mentor-matching/mentee/find-mentors',
  MENTEE_SEND_REQUEST:   '/api/mentor-matching/mentee/send-request',
  MENTEE_MY_REQUESTS:    '/api/mentor-matching/mentee/my-requests',
  CAREER_MENTORS:        '/api/mentor-matching/career-mentors',

  // Schedule
  SCHEDULE_BOOK:         '/api/schedule/book',
  SCHEDULE_MY:           '/api/schedule/my',
  SCHEDULE_RESPOND:      '/api/schedule/respond',
  SCHEDULE_CANCEL:       (id: number) => `/api/schedule/${id}`,

  // Chat
  CHAT_SEND:             (userId: number) => `/api/chat/${userId}/send`,
  CHAT_MESSAGES:         (userId: number) => `/api/chat/${userId}/messages`,
  CHAT_ROOMS:            '/api/chat/rooms',

  // Skill Gap
  SKILL_GAP_ANALYZE:     '/api/skill-gap/analyze',
  SKILL_GAP_MY_ANALYSES: '/api/skill-gap/my-analyses',
  SKILL_GAP_DETAIL:      (id: number) => `/api/skill-gap/analysis/${id}`,
  SKILL_GAP_PLAN:        (id: number) => `/api/skill-gap/learning-plan/${id}`,
  SKILL_GAP_PLAN_STREAM: (id: number) => `/api/skill-gap/learning-plan-stream/${id}`,

  // Companies
  COMPANIES_BY_GROUP:    (slug: string) => `/api/companies/group/${slug}`,
  COMPANIES_SEARCH:      '/api/companies/search',

  // Recommendations
  RECOMMENDATIONS_SAVED: '/api/recommendations/saved',
  RECOMMENDATIONS_MAIN:  '/api/recommendations',
} as const;

// ─────────────────────────────────────────────────────────────
//  WebSocket Endpoints
// ─────────────────────────────────────────────────────────────

export const WS_ENDPOINTS = {
  NOTIFICATIONS: (token: string) => `/ws/notifications?token=${token}`,
  CHAT_ROOM:     (roomId: string, token: string) => `/ws/chat/${roomId}?token=${token}`,
} as const;

// ─────────────────────────────────────────────────────────────
//  Local Storage Keys
// ─────────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  ACCESS_TOKEN:  'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  APP_THEME:     'app-theme',
  LANGUAGE:      'i18nextLng',
  WELCOME_SHOWN: 'chatbot-welcome-shown',
} as const;

// ─────────────────────────────────────────────────────────────
//  Domain Status Enums
// ─────────────────────────────────────────────────────────────

/** Trạng thái của MentorSession */
export const SESSION_STATUS = {
  PENDING:   'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
} as const;
export type SessionStatus = typeof SESSION_STATUS[keyof typeof SESSION_STATUS];

/** Trạng thái của MentorshipRequest */
export const REQUEST_STATUS = {
  PENDING:  'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
} as const;
export type RequestStatus = typeof REQUEST_STATUS[keyof typeof REQUEST_STATUS];

/** Role trong một session */
export const SESSION_ROLE = {
  MENTOR: 'mentor',
  MENTEE: 'mentee',
} as const;
export type SessionRole = typeof SESSION_ROLE[keyof typeof SESSION_ROLE];

// ─────────────────────────────────────────────────────────────
//  UI Constants
// ─────────────────────────────────────────────────────────────

/** Duration (ms) cho toast notifications */
export const TOAST_DURATION = {
  SHORT:  4_000,
  MEDIUM: 7_000,
  LONG:   12_000,
} as const;

/** Polling interval khi WebSocket không khả dụng */
export const POLLING_INTERVAL_MS = 15_000;

/** Số mentor tối đa hiển thị trên dashboard widget */
export const MAX_DASHBOARD_MENTORS = 6;

/** Số công ty tối đa hiển thị trên career detail */
export const MAX_CAREER_COMPANIES = 8;

/** Số ký tự tối đa cho tin nhắn chat */
export const MAX_CHAT_MESSAGE_LENGTH = 2_000;

/** Thời gian session reminder (phút trước giờ hẹn) */
export const SESSION_REMINDER_MINUTES = 30;

// ─────────────────────────────────────────────────────────────
//  Matching Algorithm Weights (phải sync với backend)
// ─────────────────────────────────────────────────────────────

export const MATCHING_WEIGHTS = {
  SKILL:       0.50,
  CAREER:      0.30,
  PERSONALITY: 0.20,
} as const;

export const MINIMUM_MATCH_THRESHOLD = 10; // % điểm tối thiểu
