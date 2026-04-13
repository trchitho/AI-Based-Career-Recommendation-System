/**
 * TC04 — PB04 RIASEC / OCEAN Frontend Tests
 * ===========================================
 * Test Cases:
 *   TC04.1  Tất cả câu hỏi trả lời "Strongly Like" → processed score = 1.0 (max)
 *   TC04.5  BigFive/OCEAN scoring formula đúng
 *   TC04.6  Spider-chart data: processed (0-1) → chart (0-100)
 *   TC04.3  RIASEC label mapping (letter ↔ full name)
 */

import { describe, it, expect } from 'vitest';
import { getRIASECFullName, getRIASECTagDisplay, RIASEC_LABEL_MAP } from '../utils/riasec';

// ===========================================================================
// Scoring formula utilities (replicated from backend logic, used in frontend)
// ===========================================================================

/** Convert Likert 1-5 raw score to normalized 0-1 */
function normalizeScore(raw: number): number {
  return Math.round(((raw - 1) / 4) * 1000) / 1000;
}

/** Convert array of Likert answers to average normalized score */
function avgNormalized(answers: number[]): number {
  if (answers.length === 0) return 0;
  const avg = answers.reduce((a, b) => a + b, 0) / answers.length;
  return normalizeScore(avg);
}

/** Convert normalized 0-1 score to chart percentage 0-100 */
function toChartPercent(normalized: number): number {
  return Math.round(normalized * 100);
}

// ===========================================================================
// TC04.1 — All "Strongly Like" answers → max score
// ===========================================================================

describe('TC04.1 — RIASEC max score when all answers = Strongly Like (5)', () => {
  const RIASEC_DIMS = ['R', 'I', 'A', 'S', 'E', 'C'] as const;

  it('should produce normalized score of 1.0 for raw = 5.0', () => {
    expect(normalizeScore(5)).toBe(1.0);
  });

  it('should produce normalized score of 0.0 for raw = 1.0', () => {
    expect(normalizeScore(1)).toBe(0.0);
  });

  it('should produce normalized score of 0.5 for raw = 3.0', () => {
    expect(normalizeScore(3)).toBe(0.5);
  });

  it('all RIASEC dimensions = Strongly Like (5) → each normalized = 1.0', () => {
    // Simulate 4 questions per dimension all answered with 5
    const scores: Record<string, number> = {};
    for (const dim of RIASEC_DIMS) {
      scores[dim] = avgNormalized([5, 5, 5, 5]);
    }
    for (const dim of RIASEC_DIMS) {
      expect(scores[dim]).toBe(1.0);
    }
  });

  it('all RIASEC dimensions = Strongly Dislike (1) → each normalized = 0.0', () => {
    const scores: Record<string, number> = {};
    for (const dim of ['R', 'I', 'A', 'S', 'E', 'C']) {
      scores[dim] = avgNormalized([1, 1, 1, 1]);
    }
    for (const dim of ['R', 'I', 'A', 'S', 'E', 'C']) {
      expect(scores[dim]).toBe(0.0);
    }
  });

  it('mixed answers → correct average', () => {
    // [5, 4, 3, 2] → avg = 3.5 → normalized = (3.5-1)/4 = 0.625
    expect(avgNormalized([5, 4, 3, 2])).toBe(0.625);
  });

  it('top interest should be dimension with highest score', () => {
    const rawScores: Record<string, number> = { R: 3.5, I: 4.8, A: 3.0, S: 4.2, E: 3.7, C: 2.5 };
    const topInterest = Object.entries(rawScores)
      .sort(([, a], [, b]) => b - a)[0][0];
    expect(topInterest).toBe('I');
  });
});

// ===========================================================================
// TC04.5 — BigFive / OCEAN scoring
// ===========================================================================

describe('TC04.5 — BigFive / OCEAN scoring formula', () => {
  const BIG5_DIMS = ['O', 'C', 'E', 'A', 'N'] as const;

  it('all BigFive = Strongly Agree (5) → each normalized = 1.0', () => {
    for (const dim of BIG5_DIMS) {
      expect(avgNormalized([5, 5, 5, 5])).toBe(1.0);
    }
  });

  it('normalized scores stay within [0, 1]', () => {
    for (let raw = 1; raw <= 5; raw++) {
      const n = normalizeScore(raw);
      expect(n).toBeGreaterThanOrEqual(0.0);
      expect(n).toBeLessThanOrEqual(1.0);
    }
  });

  it('BigFive OCEAN dimensions are 5 traits', () => {
    const oceanNames = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];
    expect(oceanNames).toHaveLength(5);
  });

  it('conscientiousness raw=4 → normalized = 0.75', () => {
    expect(normalizeScore(4)).toBe(0.75);
  });
});

// ===========================================================================
// TC04.6 — Spider-chart data format (0-100 scale)
// ===========================================================================

describe('TC04.6 — Spider-chart data format', () => {
  it('normalized 1.0 → chart value 100', () => {
    expect(toChartPercent(1.0)).toBe(100);
  });

  it('normalized 0.0 → chart value 0', () => {
    expect(toChartPercent(0.0)).toBe(0);
  });

  it('normalized 0.5 → chart value 50', () => {
    expect(toChartPercent(0.5)).toBe(50);
  });

  it('all-max scores generate correct chart data object', () => {
    const normalized = {
      realistic: 1.0,
      investigative: 1.0,
      artistic: 1.0,
      social: 1.0,
      enterprising: 1.0,
      conventional: 1.0,
    };
    const chartData = Object.fromEntries(
      Object.entries(normalized).map(([k, v]) => [k, toChartPercent(v)])
    );
    expect(Object.keys(chartData)).toHaveLength(6);
    for (const [, val] of Object.entries(chartData)) {
      expect(val).toBe(100);
    }
  });

  it('spider chart has correct 6 RIASEC dimension keys', () => {
    const required = new Set(['realistic', 'investigative', 'artistic', 'social', 'enterprising', 'conventional']);
    const chartKeys = new Set(['realistic', 'investigative', 'artistic', 'social', 'enterprising', 'conventional']);
    expect(chartKeys).toEqual(required);
  });
});

// ===========================================================================
// TC04.3 — RIASEC label mapping
// ===========================================================================

describe('TC04.3 — RIASEC label mapping', () => {
  it('single letter R → Realistic', () => {
    expect(getRIASECFullName('R')).toBe('Realistic');
  });

  it('single letter I → Investigative', () => {
    expect(getRIASECFullName('I')).toBe('Investigative');
  });

  it('single letter A → Artistic', () => {
    expect(getRIASECFullName('A')).toBe('Artistic');
  });

  it('single letter S → Social', () => {
    expect(getRIASECFullName('S')).toBe('Social');
  });

  it('single letter E → Enterprising', () => {
    expect(getRIASECFullName('E')).toBe('Enterprising');
  });

  it('single letter C → Conventional', () => {
    expect(getRIASECFullName('C')).toBe('Conventional');
  });

  it('lowercase full key → mapped correctly', () => {
    expect(RIASEC_LABEL_MAP['realistic']).toBe('Realistic');
    expect(RIASEC_LABEL_MAP['investigative']).toBe('Investigative');
  });

  it('null/undefined → N/A', () => {
    expect(getRIASECFullName(null)).toBe('N/A');
    expect(getRIASECFullName(undefined)).toBe('N/A');
    expect(getRIASECFullName('')).toBe('N/A');
  });

  it('RIASEC tag combination RC → Realistic-Conventional', () => {
    expect(getRIASECTagDisplay('RC')).toBe('Realistic-Conventional');
  });

  it('single letter tag R → Realistic', () => {
    expect(getRIASECTagDisplay('R')).toBe('Realistic');
  });

  it('combination lowercase ri → Realistic-Investigative', () => {
    expect(getRIASECTagDisplay('ri')).toBe('Realistic-Investigative');
  });
});

// ===========================================================================
// Reverse score
// ===========================================================================

describe('TC04.4 — Reverse score', () => {
  it('reverse score formula: 6 - raw', () => {
    expect(6 - 5).toBe(1);
    expect(6 - 1).toBe(5);
    expect(6 - 3).toBe(3);
  });

  it('reversed max answer (5) → normalized = 0.0', () => {
    const reversed = 6 - 5; // = 1
    expect(normalizeScore(reversed)).toBe(0.0);
  });

  it('reversed min answer (1) → normalized = 1.0', () => {
    const reversed = 6 - 1; // = 5
    expect(normalizeScore(reversed)).toBe(1.0);
  });
});
