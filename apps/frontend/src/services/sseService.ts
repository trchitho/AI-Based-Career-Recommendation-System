/**
 * SSE (Server-Sent Events) Service
 * Consumes streaming responses from FastAPI endpoints.
 * Uses fetch + ReadableStream (supports Auth headers, unlike EventSource).
 */

export interface SSEEvent {
  event: string;
  data: Record<string, any>;
}

export type SSEHandler = (event: SSEEvent) => void;
export type SSEOptions = {
  onChunk?: (text: string) => void;
  onDone?: (data: Record<string, any>) => void;
  onError?: (msg: string) => void;
  onStart?: () => void;
  signal?: AbortSignal;
};

/**
 * Stream an SSE endpoint and dispatch typed events.
 */
export async function streamSSE(url: string, options: SSEOptions = {}): Promise<void> {
  // Try both storage keys (accessToken = new, token = legacy)
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');

  // Build headers — only add Authorization if token exists
  const headers: Record<string, string> = { Accept: 'text/event-stream' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Also append token as query param as fallback (for stricter proxies)
  const fullUrl = token ? `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}` : url;

  let response: Response;
  try {
    response = await fetch(fullUrl, { headers, signal: options.signal });
  } catch (err: any) {
    options.onError?.(err?.message || 'Network error');
    return;
  }

  if (!response.ok) {
    options.onError?.(`HTTP ${response.status}`);
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    options.onError?.('No response body');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  const parseEvents = (raw: string) => {
    // SSE events are separated by \n\n
    const blocks = raw.split('\n\n');
    return blocks.map(block => {
      const lines = block.trim().split('\n');
      let event = 'message';
      let data = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) event = line.slice(7).trim();
        if (line.startsWith('data: ')) data = line.slice(6).trim();
      }
      return { event, data };
    }).filter(e => e.data);
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete events (ended by \n\n)
      const lastDouble = buffer.lastIndexOf('\n\n');
      if (lastDouble === -1) continue;

      const toProcess = buffer.slice(0, lastDouble + 2);
      buffer = buffer.slice(lastDouble + 2);

      for (const { event, data } of parseEvents(toProcess)) {
        try {
          const parsed = JSON.parse(data);
          switch (event) {
            case 'start':
              options.onStart?.();
              break;
            case 'chunk':
              options.onChunk?.(parsed.text || '');
              break;
            case 'cached':
              options.onDone?.(parsed);
              break;
            case 'done':
              options.onDone?.(parsed);
              break;
            case 'error':
              options.onError?.(parsed.message || 'Unknown error');
              break;
          }
        } catch {
          // malformed JSON — skip
        }
      }
    }
  } catch (err: any) {
    if (err?.name !== 'AbortError') {
      options.onError?.(err?.message || 'Stream error');
    }
  } finally {
    reader.cancel();
  }
}

/**
 * Stream a learning plan — returns a Promise that resolves when done.
 */
export function streamLearningPlan(
  analysisId: number,
  options: SSEOptions,
  signal?: AbortSignal,
): AbortController {
  const ctrl = new AbortController();
  streamSSE(`/api/skill-gap/learning-plan-stream/${analysisId}`, {
    ...options,
    signal: signal ?? ctrl.signal,
  });
  return ctrl;
}
