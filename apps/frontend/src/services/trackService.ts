import api from '../lib/api';

type CareerEventPayload = {
  event_type: 'impression' | 'click' | 'save' | 'apply';
  job_id: string;
  rank_pos?: number;
  score_shown?: number;
  ref?: string;
  dwell_ms?: number;
};

const SESSION_KEY = 'cb_session_id';
const DWELL_START_KEY = 'cb_dwell_start';

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = window.localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/**
 * Mark the start time for dwell tracking.
 * Call this when Career Matches tab is opened / items are displayed.
 */
export function markDwellStart(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(DWELL_START_KEY, String(Date.now()));
}

/**
 * Get dwell time in milliseconds since markDwellStart() was called.
 * Returns 0 if no start time was recorded.
 */
export function getDwellMs(): number {
  if (typeof window === 'undefined') return 0;
  const startStr = window.sessionStorage.getItem(DWELL_START_KEY);
  if (!startStr) return 0;
  const start = parseInt(startStr, 10);
  if (isNaN(start)) return 0;
  return Math.max(0, Date.now() - start);
}

/**
 * Clear dwell start time (call after click to prevent double-count).
 */
export function clearDwellStart(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(DWELL_START_KEY);
}

export async function trackCareerEvent(
  payload: CareerEventPayload,
  // ⬇⬇⬇ cho phép cả number lẫn string để hợp với user.id hiện tại
  opts?: { userId?: number | string }
): Promise<void> {
  const sessionId = getSessionId();

  const headers: Record<string, string> = {
    'X-Session-Id': sessionId,
  };

  if (opts?.userId !== undefined) {
    headers['X-User-Id'] = String(opts.userId);
  }

  // Ensure dwell_ms rules:
  // - impression: dwell_ms = null (không gửi)
  // - click/save/apply: dwell_ms phải có số >= 0
  const finalPayload = { ...payload };

  if (payload.event_type === 'impression') {
    // Impression không cần dwell_ms
    delete finalPayload.dwell_ms;
  } else if (['click', 'save', 'apply'].includes(payload.event_type)) {
    // Click/save/apply cần dwell_ms
    if (finalPayload.dwell_ms === undefined || finalPayload.dwell_ms === null) {
      // Auto-calculate from dwell start if not provided
      finalPayload.dwell_ms = getDwellMs();
    }
    // Ensure it's a valid number >= 0
    if (typeof finalPayload.dwell_ms !== 'number' || isNaN(finalPayload.dwell_ms)) {
      finalPayload.dwell_ms = 0;
    }
    finalPayload.dwell_ms = Math.max(0, Math.round(finalPayload.dwell_ms));
  }

  try {
    await api.post('/api/analytics/career-event', finalPayload, { headers });
  } catch {
    // nuốt lỗi, không chặn UI
  }
}
