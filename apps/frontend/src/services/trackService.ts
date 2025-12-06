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

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = window.localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(SESSION_KEY, id);
  }
  return id;
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

  try {
    await api.post('/api/analytics/career-event', payload, { headers });
  } catch {
    // nuốt lỗi, không chặn UI
  }
}
