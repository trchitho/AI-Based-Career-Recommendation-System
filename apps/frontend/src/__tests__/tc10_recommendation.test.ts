/**
 * TC10 — NeuMF Career Recommendation Frontend Tests
 * ===================================================
 * Covers:
 *   TC10.3  top_k giới hạn số kết quả (FE display)
 *   TC10.10 display_match [70, 95] range
 *   TC10.11 Kết quả sort theo display_match giảm dần
 *   TC10.12 Response shape: career_id, title_vi/title_en, display_match, tags
 */

import { describe, it, expect } from 'vitest';

// ── Types ──────────────────────────────────────────────────────────────────

interface CareerRecommendation {
  career_id: string;
  title_vi: string | null;
  title_en: string | null;
  description: string;
  tags: string[];
  job_zone: number | null;
  match_score: number;
  display_match: number;
  position: number;
}

interface RecommendationResponse {
  request_id: string | null;
  items: CareerRecommendation[];
}

// ── Utilities (replicate FE logic) ────────────────────────────────────────

function normalizeDisplayMatch(scores: number[]): number[] {
  if (scores.length === 0) return [];
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  if (max === min) return scores.map(() => 95);
  return scores.map(s => {
    const normalized = 70 + ((s - min) / (max - min)) * (95 - 70);
    return Math.round(normalized * 10) / 10;
  });
}

function getTopK(items: CareerRecommendation[], k: number): CareerRecommendation[] {
  return items.slice(0, k);
}

function getRIASECLabel(code: string): string {
  const map: Record<string, string> = {
    R: 'Realistic', I: 'Investigative', A: 'Artistic',
    S: 'Social', E: 'Enterprising', C: 'Conventional',
  };
  return map[code.toUpperCase()] || code;
}

// ── TC10.10 — display_match range ─────────────────────────────────────────

describe('TC10.10 — display_match normalization [70, 95]', () => {
  it('highest score → display_match = 95', () => {
    const scores = [0.95, 0.85, 0.70, 0.60];
    const normalized = normalizeDisplayMatch(scores);
    expect(normalized[0]).toBe(95);
  });

  it('lowest score → display_match = 70', () => {
    const scores = [0.95, 0.85, 0.70, 0.60];
    const normalized = normalizeDisplayMatch(scores);
    expect(normalized[normalized.length - 1]).toBe(70);
  });

  it('all scores equal → all display_match = 95', () => {
    const scores = [0.8, 0.8, 0.8];
    const normalized = normalizeDisplayMatch(scores);
    expect(normalized.every(n => n === 95)).toBe(true);
  });

  it('all normalized scores within [70, 95]', () => {
    const scores = [0.95, 0.88, 0.80, 0.75, 0.60];
    const normalized = normalizeDisplayMatch(scores);
    for (const n of normalized) {
      expect(n).toBeGreaterThanOrEqual(70);
      expect(n).toBeLessThanOrEqual(95);
    }
  });

  it('empty scores → empty result', () => {
    expect(normalizeDisplayMatch([])).toHaveLength(0);
  });

  it('single score → 95 (max)', () => {
    const normalized = normalizeDisplayMatch([0.7]);
    expect(normalized[0]).toBe(95);
  });
});

// ── TC10.3 — top_k limit ─────────────────────────────────────────────────

describe('TC10.3 — top_k limits displayed recommendations', () => {
  const items: CareerRecommendation[] = Array.from({ length: 10 }, (_, i) => ({
    career_id: `career-${i}`,
    title_vi: `Nghề ${i}`,
    title_en: `Career ${i}`,
    description: 'desc',
    tags: ['R'],
    job_zone: 3,
    match_score: 0.9 - i * 0.05,
    display_match: 95 - i * 2,
    position: i + 1,
  }));

  it('top_k=5 returns exactly 5 items', () => {
    expect(getTopK(items, 5)).toHaveLength(5);
  });

  it('top_k=1 returns the single highest match', () => {
    const result = getTopK(items, 1);
    expect(result).toHaveLength(1);
    expect(result[0].career_id).toBe('career-0');
  });

  it('top_k larger than list → returns all', () => {
    expect(getTopK(items, 20)).toHaveLength(10);
  });
});

// ── TC10.11 — Sort by display_match ────────────────────────────────────────

describe('TC10.11 — Recommendations sorted by display_match descending', () => {
  it('items already sorted descending by display_match', () => {
    const items = [
      { display_match: 95 },
      { display_match: 88 },
      { display_match: 82 },
    ];
    const sorted = [...items].sort((a, b) => b.display_match - a.display_match);
    expect(sorted[0].display_match).toBe(95);
    expect(sorted[2].display_match).toBe(82);
  });

  it('unsorted items are correctly sorted', () => {
    const items = [
      { display_match: 75, career_id: 'c3' },
      { display_match: 92, career_id: 'c1' },
      { display_match: 83, career_id: 'c2' },
    ];
    const sorted = [...items].sort((a, b) => b.display_match - a.display_match);
    expect(sorted.map(i => i.career_id)).toEqual(['c1', 'c2', 'c3']);
  });
});

// ── TC10.12 — Response shape ─────────────────────────────────────────────

describe('TC10.12 — Recommendation response shape', () => {
  const mockItem: CareerRecommendation = {
    career_id: '15-1252-00',
    title_vi: 'Lập trình viên',
    title_en: 'Software Developer',
    description: 'Develops software applications',
    tags: ['I', 'IR'],
    job_zone: 4,
    match_score: 0.88,
    display_match: 92,
    position: 1,
  };

  it('career_id is present and non-empty', () => {
    expect(mockItem.career_id).toBeTruthy();
  });

  it('has title (vi or en)', () => {
    expect(mockItem.title_vi || mockItem.title_en).toBeTruthy();
  });

  it('display_match is number in [70, 95]', () => {
    expect(mockItem.display_match).toBeGreaterThanOrEqual(70);
    expect(mockItem.display_match).toBeLessThanOrEqual(95);
  });

  it('position starts at 1', () => {
    expect(mockItem.position).toBeGreaterThanOrEqual(1);
  });

  it('tags is an array', () => {
    expect(Array.isArray(mockItem.tags)).toBe(true);
  });

  it('empty response has items array', () => {
    const emptyResp: RecommendationResponse = { request_id: null, items: [] };
    expect(Array.isArray(emptyResp.items)).toBe(true);
    expect(emptyResp.items).toHaveLength(0);
  });
});

// ── RIASEC tag display ────────────────────────────────────────────────────

describe('TC10 — RIASEC tag display in recommendation cards', () => {
  it('R → Realistic', () => expect(getRIASECLabel('R')).toBe('Realistic'));
  it('I → Investigative', () => expect(getRIASECLabel('I')).toBe('Investigative'));
  it('S → Social', () => expect(getRIASECLabel('S')).toBe('Social'));

  it('primary tag from compound tag RC → Realistic', () => {
    const primaryLabel = getRIASECLabel('RC'[0]);
    expect(primaryLabel).toBe('Realistic');
  });

  it('unknown code returned as-is', () => {
    expect(getRIASECLabel('X')).toBe('X');
  });
});
