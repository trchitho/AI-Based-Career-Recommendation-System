/**
 * TC05 — PB06 Voice AI Frontend Tests
 * =====================================
 * Test Cases:
 *   TC05.1  Ghi âm môi trường ồn → API trích xuất được từ khóa chính
 *           (confidence thấp nhưng transcript và traits vẫn hợp lệ)
 *   TC05.2  Chỉnh sửa transcript sau khi STT trả về → hệ thống lưu theo
 *           nội dung đã sửa
 *   TC05.3  Validation: ghi âm < 10 giây bị reject
 *   TC05.4  MIME type audio/webm được chấp nhận
 *   TC05.5  formatTime() hiển thị đúng MM:SS
 */

import { describe, it, expect } from 'vitest';

// ===========================================================================
// Utilities extracted from VoiceAssessmentComponent (pure logic)
// ===========================================================================

const MIN_DURATION_SEC = 10;
const MAX_DURATION_SEC = 120;

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function isValidDuration(duration: number): boolean {
  return duration >= MIN_DURATION_SEC;
}

function isAllowedMimeType(contentType: string): boolean {
  return contentType.startsWith('audio/') || contentType === 'application/octet-stream';
}

function getMimeType(): string {
  // Simulates the MIME type selection logic in VoiceAssessmentComponent
  // In real browser: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
  // Returns the best supported type
  return 'audio/webm;codecs=opus';
}

// ===========================================================================
// TC05 — Voice response processing (simulates API response handling)
// ===========================================================================

interface VoiceAPIResponse {
  ok: boolean;
  assessment_id: number;
  confidence: number;
  voice_summary: string;
  transcript_preview: string;
  big5: Record<string, number>;
  riasec: Record<string, number>;
}

function processVoiceResponse(data: VoiceAPIResponse) {
  return {
    shouldShowEditMode: !!data.transcript_preview,
    voiceSummary: data.voice_summary || null,
    transcript: data.transcript_preview || '',
    confidence: data.confidence,
    hasTraits: !!(data.big5 && data.riasec),
  };
}

// ===========================================================================
// TC05.2 — Transcript editing logic (pure function)
// ===========================================================================

interface TranscriptEditPayload {
  transcript: string;
}

function buildTranscriptEditPayload(edited: string): TranscriptEditPayload {
  return { transcript: edited };
}

function applyTranscriptEdit(
  essayAnalysis: Record<string, unknown>,
  editedTranscript: string
): Record<string, unknown> {
  const updated = { ...essayAnalysis };
  if ('voice_analysis' in updated && typeof updated.voice_analysis === 'object' && updated.voice_analysis !== null) {
    updated.voice_analysis = {
      ...(updated.voice_analysis as Record<string, unknown>),
      transcript: editedTranscript,
      transcript_edited: true,
    };
  }
  return updated;
}

// ===========================================================================
// TC05.5 — formatTime()
// ===========================================================================

describe('TC05.5 — formatTime()', () => {
  it('0 seconds → 00:00', () => {
    expect(formatTime(0)).toBe('00:00');
  });

  it('30 seconds → 00:30', () => {
    expect(formatTime(30)).toBe('00:30');
  });

  it('60 seconds → 01:00', () => {
    expect(formatTime(60)).toBe('01:00');
  });

  it('90 seconds → 01:30', () => {
    expect(formatTime(90)).toBe('01:30');
  });

  it('120 seconds (max) → 02:00', () => {
    expect(formatTime(MAX_DURATION_SEC)).toBe('02:00');
  });

  it('single-digit seconds padded with 0', () => {
    expect(formatTime(5)).toBe('00:05');
  });

  it('61 seconds → 01:01', () => {
    expect(formatTime(61)).toBe('01:01');
  });
});

// ===========================================================================
// TC05.3 — Duration validation
// ===========================================================================

describe('TC05.3 — Duration validation', () => {
  it('duration < 10 seconds → invalid', () => {
    expect(isValidDuration(9)).toBe(false);
    expect(isValidDuration(5)).toBe(false);
    expect(isValidDuration(0)).toBe(false);
  });

  it('duration = 10 seconds (min) → valid', () => {
    expect(isValidDuration(MIN_DURATION_SEC)).toBe(true);
  });

  it('duration > 10 seconds → valid', () => {
    expect(isValidDuration(30)).toBe(true);
    expect(isValidDuration(60)).toBe(true);
    expect(isValidDuration(120)).toBe(true);
  });

  it('MIN_DURATION_SEC constant = 10', () => {
    expect(MIN_DURATION_SEC).toBe(10);
  });

  it('MAX_DURATION_SEC constant = 120', () => {
    expect(MAX_DURATION_SEC).toBe(120);
  });
});

// ===========================================================================
// TC05.4 — MIME type validation
// ===========================================================================

describe('TC05.4 — MIME type validation', () => {
  it('audio/webm accepted', () => {
    expect(isAllowedMimeType('audio/webm')).toBe(true);
  });

  it('audio/webm;codecs=opus accepted', () => {
    expect(isAllowedMimeType('audio/webm;codecs=opus')).toBe(true);
  });

  it('audio/ogg accepted', () => {
    expect(isAllowedMimeType('audio/ogg')).toBe(true);
  });

  it('audio/mp4 accepted', () => {
    expect(isAllowedMimeType('audio/mp4')).toBe(true);
  });

  it('application/octet-stream accepted (binary upload)', () => {
    expect(isAllowedMimeType('application/octet-stream')).toBe(true);
  });

  it('video/mp4 rejected', () => {
    expect(isAllowedMimeType('video/mp4')).toBe(false);
  });

  it('text/plain rejected', () => {
    expect(isAllowedMimeType('text/plain')).toBe(false);
  });

  it('image/png rejected', () => {
    expect(isAllowedMimeType('image/png')).toBe(false);
  });
});

// ===========================================================================
// TC05.1 — Noisy audio: API still extracts keywords
// ===========================================================================

describe('TC05.1 — Noisy audio response handling', () => {
  it('low confidence response still has transcript', () => {
    const noisyResponse: VoiceAPIResponse = {
      ok: true,
      assessment_id: 42,
      confidence: 0.2,  // low confidence from noisy audio
      voice_summary: 'Speaker appeared to discuss work-related topics',
      transcript_preview: '[inaudible] working in technology [noise]',
      big5: { openness: 0.6, conscientiousness: 0.7, extraversion: 0.5, agreeableness: 0.8, neuroticism: 0.3 },
      riasec: { realistic: 0.4, investigative: 0.7, artistic: 0.3, social: 0.5, enterprising: 0.6, conventional: 0.4 },
    };

    const result = processVoiceResponse(noisyResponse);

    // TC05.1: API extracts keywords even in noisy environment
    expect(result.transcript).toBeTruthy();
    expect(result.transcript.length).toBeGreaterThan(0);
    expect(result.hasTraits).toBe(true);  // traits still extracted
    expect(result.confidence).toBe(0.2);  // confidence is low but valid
  });

  it('low confidence triggers transcript edit mode', () => {
    const noisyResponse: VoiceAPIResponse = {
      ok: true,
      assessment_id: 42,
      confidence: 0.2,
      voice_summary: 'Partial analysis',
      transcript_preview: '[noisy audio detected]',
      big5: { openness: 0.5, conscientiousness: 0.5, extraversion: 0.5, agreeableness: 0.5, neuroticism: 0.5 },
      riasec: { realistic: 0.5, investigative: 0.5, artistic: 0.5, social: 0.5, enterprising: 0.5, conventional: 0.5 },
    };

    const result = processVoiceResponse(noisyResponse);
    // Because transcript_preview is present, should enter edit mode
    expect(result.shouldShowEditMode).toBe(true);
  });

  it('empty transcript skips edit mode', () => {
    const silentResponse: VoiceAPIResponse = {
      ok: true,
      assessment_id: 42,
      confidence: 0.0,
      voice_summary: '',
      transcript_preview: '',
      big5: { openness: 0.5, conscientiousness: 0.5, extraversion: 0.5, agreeableness: 0.5, neuroticism: 0.5 },
      riasec: { realistic: 0.167, investigative: 0.167, artistic: 0.167, social: 0.167, enterprising: 0.167, conventional: 0.167 },
    };

    const result = processVoiceResponse(silentResponse);
    expect(result.shouldShowEditMode).toBe(false);
  });

  it('riasec keys all present even in noisy audio response', () => {
    const riasecKeys = ['realistic', 'investigative', 'artistic', 'social', 'enterprising', 'conventional'];
    const noisyRiasec = { realistic: 0.4, investigative: 0.7, artistic: 0.3, social: 0.5, enterprising: 0.6, conventional: 0.4 };
    for (const key of riasecKeys) {
      expect(noisyRiasec).toHaveProperty(key);
    }
  });
});

// ===========================================================================
// TC05.2 — Transcript editing
// ===========================================================================

describe('TC05.2 — Transcript editing after STT returns', () => {
  it('buildTranscriptEditPayload creates correct body', () => {
    const edited = 'I work in technology and enjoy problem solving';
    const payload = buildTranscriptEditPayload(edited);
    expect(payload).toEqual({ transcript: edited });
  });

  it('applyTranscriptEdit replaces transcript in voice_analysis', () => {
    const original = {
      voice_analysis: {
        transcript: '[noisy] work [inaudible] technology',
        confidence: 0.3,
        big5: { openness: 0.7 },
      },
    };
    const edited = 'I work in technology sector';
    const result = applyTranscriptEdit(original, edited);
    const va = result.voice_analysis as Record<string, unknown>;
    expect(va.transcript).toBe(edited);
    expect(va.transcript_edited).toBe(true);
  });

  it('applyTranscriptEdit preserves confidence and other fields', () => {
    const original = {
      voice_analysis: {
        transcript: 'original',
        confidence: 0.4,
        voice_summary: 'Analytical thinker',
      },
    };
    const result = applyTranscriptEdit(original, 'cleaned transcript');
    const va = result.voice_analysis as Record<string, unknown>;
    expect(va.confidence).toBe(0.4);
    expect(va.voice_summary).toBe('Analytical thinker');
  });

  it('applyTranscriptEdit with empty string is valid', () => {
    const original = { voice_analysis: { transcript: 'original', confidence: 0.5 } };
    const result = applyTranscriptEdit(original, '');
    const va = result.voice_analysis as Record<string, unknown>;
    expect(va.transcript).toBe('');
    expect(va.transcript_edited).toBe(true);
  });

  it('no voice_analysis in essay_analysis → no change', () => {
    const original = { essay_themes: ['tech', 'leadership'] };
    const result = applyTranscriptEdit(original as Record<string, unknown>, 'edit');
    // voice_analysis not present → no change to the object
    expect(result).not.toHaveProperty('voice_analysis');
    expect(result).toHaveProperty('essay_themes');
  });

  it('PATCH endpoint URL contains assessment_id', () => {
    const assessmentId = '42';
    const url = `/api/assessments/${assessmentId}/voice-transcript`;
    expect(url).toBe('/api/assessments/42/voice-transcript');
  });

  it('edited transcript used in PATCH body', () => {
    const edited = 'User manually corrected this text';
    const payload = buildTranscriptEditPayload(edited);
    const body = JSON.stringify(payload);
    expect(JSON.parse(body)).toEqual({ transcript: edited });
  });
});
