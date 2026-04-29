/**
 * @file utils/format.ts
 * @description Pure formatting functions — không có side effects, dễ test.
 *
 * Update guide:
 *   - Thêm format mới       → thêm function export
 *   - Đổi locale mặc định  → sửa DEFAULT_LOCALE
 *   - Đổi format currency  → sửa formatVnd()
 */

const DEFAULT_LOCALE = 'vi-VN';

// ─────────────────────────────────────────────────────────────
//  Date & Time
// ─────────────────────────────────────────────────────────────

/**
 * Format ISO string thành "dd/MM/yyyy".
 *
 * @param isoString - ISO 8601 date string
 * @returns Formatted date string, empty string nếu input không hợp lệ
 *
 * @example
 * formatDate("2026-04-23T10:00:00") // "23/04/2026"
 */
export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString(DEFAULT_LOCALE, {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

/**
 * Format ISO string thành "dd/MM/yyyy HH:mm".
 *
 * @param isoString - ISO 8601 date string
 * @returns Formatted datetime string
 */
export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString(DEFAULT_LOCALE, {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/**
 * Format thành thời gian tương đối ("vừa xong", "5 phút", "2 giờ", "3 ngày").
 *
 * @param isoString - ISO 8601 date string
 * @returns Human-readable relative time
 */
export function formatRelativeTime(isoString: string | null | undefined): string {
  if (!isoString) return '';
  const diffMs   = Date.now() - new Date(isoString).getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 1)  return 'vừa xong';
  if (diffMins < 60) return `${diffMins} phút`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} giờ`;

  return `${Math.floor(diffHours / 24)} ngày`;
}

/**
 * Format thành "HH:mm, dd/MM" (dùng cho session time).
 *
 * @param isoString - ISO 8601 date string
 * @returns "14:00, 23/04"
 */
export function formatSessionTime(isoString: string | null | undefined): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  const time = date.toLocaleTimeString(DEFAULT_LOCALE, { hour: '2-digit', minute: '2-digit' });
  const dayMonth = date.toLocaleDateString(DEFAULT_LOCALE, { day: '2-digit', month: '2-digit' });
  return `${time}, ${dayMonth}`;
}

// ─────────────────────────────────────────────────────────────
//  Currency
// ─────────────────────────────────────────────────────────────

/**
 * Format số thành chuỗi tiền VND gọn ("20.000.000 ₫").
 *
 * @param amount - Số tiền (VND)
 * @returns Formatted string, null nếu amount không hợp lệ
 *
 * @example
 * formatVnd(20_000_000) // "20.000.000 ₫"
 * formatVnd(null)       // null
 */
export function formatVnd(amount: number | null | undefined): string | null {
  if (amount == null || isNaN(amount)) return null;
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(0)}.000.000 ₫`;
  }
  return `${amount.toLocaleString(DEFAULT_LOCALE)} ₫`;
}

/**
 * Format USD salary.
 *
 * @param amount - Số tiền (USD)
 * @returns "$XX,XXX" hoặc "N/A"
 */
export function formatUsd(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(amount);
}

// ─────────────────────────────────────────────────────────────
//  String
// ─────────────────────────────────────────────────────────────

/**
 * Lấy 1-2 ký tự đầu của tên để làm avatar initials.
 *
 * @param name - Họ tên đầy đủ
 * @returns 1-2 ký tự hoa, "?" nếu name rỗng
 *
 * @example
 * getInitials("Nguyen Van A") // "NA"
 * getInitials("John")        // "J"
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';
}

/**
 * Truncate text với ellipsis.
 *
 * @param text    - Text cần truncate
 * @param maxLen  - Độ dài tối đa (default 100)
 * @returns Text đã truncate
 */
export function truncate(text: string, maxLen = 100): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen).trim()}…`;
}

/**
 * Tạo room ID cho chat (giống backend logic: min_max).
 *
 * @param userIdA - ID user 1
 * @param userIdB - ID user 2
 * @returns Room ID string, vd "5_12"
 */
export function buildChatRoomId(userIdA: number, userIdB: number): string {
  const [min, max] = userIdA < userIdB
    ? [userIdA, userIdB]
    : [userIdB, userIdA];
  return `${min}_${max}`;
}

// ─────────────────────────────────────────────────────────────
//  Number
// ─────────────────────────────────────────────────────────────

/**
 * Parse safely một giá trị thành float, trả về 0 nếu lỗi.
 *
 * @param value - Bất kỳ giá trị nào
 * @returns number (float)
 */
export function safeParseFloat(value: unknown): number {
  const parsed = parseFloat(String(value));
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Clamp giá trị trong khoảng [min, max].
 *
 * @param value - Giá trị cần clamp
 * @param min   - Giới hạn dưới
 * @param max   - Giới hạn trên
 * @returns Giá trị đã clamp
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
