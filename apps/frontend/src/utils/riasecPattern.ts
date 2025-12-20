/**
 * RIASEC Pattern Utilities
 * 
 * Generates RIASEC patterns from scores for display in reports.
 */

import { getRIASECFullName } from './riasec';

export interface RIASECScores {
    realistic: number;
    investigative: number;
    artistic: number;
    social: number;
    enterprising: number;
    conventional: number;
}

export interface RIASECPatternResult {
    /** Full pattern like "Social-Artistic-Investigative" */
    fullPattern: string;
    /** Short pattern like "SAI" */
    shortPattern: string;
    /** Array of top dimensions in order */
    topDimensions: string[];
    /** Array of dimension keys in order (lowercase) */
    topKeys: string[];
    /** Scores sorted by value descending */
    sortedScores: Array<{ key: string; score: number }>;
}

// Standard RIASEC order for tie-breaking
const RIASEC_ORDER = [
    'realistic',
    'investigative',
    'artistic',
    'social',
    'enterprising',
    'conventional',
];

// Map dimension key to single letter
const KEY_TO_LETTER: Record<string, string> = {
    realistic: 'R',
    investigative: 'I',
    artistic: 'A',
    social: 'S',
    enterprising: 'E',
    conventional: 'C',
};

/**
 * Sort RIASEC scores in descending order with consistent tie-breaking
 * Tie-breaker: follows standard RIASEC order (R, I, A, S, E, C)
 */
export function sortRIASECScores(
    scores: RIASECScores
): Array<{ key: string; score: number }> {
    const entries = Object.entries(scores).map(([key, score]) => ({
        key: key.toLowerCase(),
        score,
    }));

    entries.sort((a, b) => {
        // Primary sort: by score descending
        const scoreDiff = b.score - a.score;
        if (scoreDiff !== 0) return scoreDiff;

        // Tie-breaker: by RIASEC order
        return RIASEC_ORDER.indexOf(a.key) - RIASEC_ORDER.indexOf(b.key);
    });

    return entries;
}

/**
 * Generate RIASEC pattern from scores
 * @param scores - RIASEC scores object
 * @param topN - Number of top dimensions to include (default: 3)
 */
export function generateRIASECPattern(
    scores: RIASECScores,
    topN: number = 3
): RIASECPatternResult {
    const sortedScores = sortRIASECScores(scores);
    const topEntries = sortedScores.slice(0, topN);

    const topKeys = topEntries.map(e => e.key);
    const topDimensions = topKeys.map(key => getRIASECFullName(key));

    const fullPattern = topDimensions.join('-');
    const shortPattern = topKeys.map(key => KEY_TO_LETTER[key] || key.charAt(0).toUpperCase()).join('');

    return {
        fullPattern,
        shortPattern,
        topDimensions,
        topKeys,
        sortedScores,
    };
}

/**
 * Get the primary (highest) RIASEC dimension
 */
export function getPrimaryRIASEC(scores: RIASECScores): {
    key: string;
    fullName: string;
    letter: string;
    score: number;
} {
    const sorted = sortRIASECScores(scores);
    const top = sorted[0];

    if (!top) {
        return {
            key: 'unknown',
            fullName: 'Unknown',
            letter: '?',
            score: 0,
        };
    }

    return {
        key: top.key,
        fullName: getRIASECFullName(top.key),
        letter: KEY_TO_LETTER[top.key] || top.key.charAt(0).toUpperCase(),
        score: top.score,
    };
}

/**
 * Check if two RIASEC dimensions are adjacent in the hexagon
 * Adjacent pairs: R-I, I-A, A-S, S-E, E-C, C-R
 */
export function areAdjacentDimensions(dim1: string, dim2: string): boolean {
    const adjacentPairs = [
        ['realistic', 'investigative'],
        ['investigative', 'artistic'],
        ['artistic', 'social'],
        ['social', 'enterprising'],
        ['enterprising', 'conventional'],
        ['conventional', 'realistic'],
    ];

    const d1 = dim1.toLowerCase();
    const d2 = dim2.toLowerCase();

    return adjacentPairs.some(
        ([a, b]) => (d1 === a && d2 === b) || (d1 === b && d2 === a)
    );
}

/**
 * Get RIASEC pattern description based on top dimensions
 */
export function getRIASECPatternDescription(
    pattern: RIASECPatternResult,
    lang: 'en' | 'vi' = 'en'
): string {
    const { topDimensions, shortPattern } = pattern;

    if (lang === 'vi') {
        return `Kiểu ${shortPattern} (${topDimensions.join(', ')})`;
    }

    return `${shortPattern} Type (${topDimensions.join(', ')})`;
}
