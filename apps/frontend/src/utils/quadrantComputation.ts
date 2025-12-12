/**
 * Quadrant Computation Utilities
 * 
 * Computes behavioral quadrant scores from Big Five (OCEAN) scores
 * using heuristic formulas based on Truity's Career Personality Profiler.
 */

import reportConfig from '../config/reportConfig.json';

export interface BigFiveScores {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
}

export interface QuadrantLabelScores {
    [label: string]: number;
}

export interface QuadrantScores {
    problemSolving: QuadrantLabelScores;
    motivation: QuadrantLabelScores;
    interaction: QuadrantLabelScores;
    communication: QuadrantLabelScores;
    teamwork: QuadrantLabelScores;
    taskManagement: QuadrantLabelScores;
}

export interface QuadrantResult {
    quadrantName: string;
    title: string;
    titleVi: string;
    scores: QuadrantLabelScores;
    primary: string;
    primaryScore: number;
    primaryDescription: string;
    primaryDescriptionVi: string;
}

// Map Big Five trait names to single letters used in formulas
const TRAIT_MAP: Record<string, keyof BigFiveScores> = {
    O: 'openness',
    C: 'conscientiousness',
    E: 'extraversion',
    A: 'agreeableness',
    N: 'neuroticism',
};

/**
 * Normalize Big Five scores to 0-1 range
 */
function normalizeScores(scores: BigFiveScores): BigFiveScores {
    return {
        openness: scores.openness / 100,
        conscientiousness: scores.conscientiousness / 100,
        extraversion: scores.extraversion / 100,
        agreeableness: scores.agreeableness / 100,
        neuroticism: scores.neuroticism / 100,
    };
}

/**
 * Compute raw score for a single label using its weight configuration
 */
function computeLabelRawScore(
    normalizedScores: BigFiveScores,
    weights: Record<string, number>
): number {
    let score = 0;
    for (const [trait, weight] of Object.entries(weights)) {
        const traitKey = TRAIT_MAP[trait];
        if (traitKey) {
            score += normalizedScores[traitKey] * weight;
        }
    }
    return score;
}

/**
 * Apply softmax normalization to convert raw scores to percentages
 * that sum to approximately 100%
 */
function softmaxNormalize(rawScores: Record<string, number>): Record<string, number> {
    const entries = Object.entries(rawScores);

    // Shift scores to prevent overflow (subtract max)
    const maxScore = Math.max(...entries.map(([, v]) => v));
    const expScores = entries.map(([key, value]) => ({
        key,
        exp: Math.exp(value - maxScore),
    }));

    const sumExp = expScores.reduce((sum, { exp }) => sum + exp, 0);

    const result: Record<string, number> = {};
    for (const { key, exp } of expScores) {
        // Convert to percentage (0-100)
        result[key] = Math.round((exp / sumExp) * 100);
    }

    return result;
}

/**
 * Compute scores for a single quadrant
 */
function computeQuadrant(
    normalizedScores: BigFiveScores,
    quadrantConfig: typeof reportConfig.quadrants.problemSolving
): QuadrantLabelScores {
    const rawScores: Record<string, number> = {};

    for (const [labelName, labelConfig] of Object.entries(quadrantConfig.labels)) {
        rawScores[labelName] = computeLabelRawScore(
            normalizedScores,
            labelConfig.weights
        );
    }

    return softmaxNormalize(rawScores);
}

/**
 * Compute all 6 quadrant scores from Big Five scores
 */
export function computeQuadrantScores(bigFiveScores: BigFiveScores): QuadrantScores {
    const normalized = normalizeScores(bigFiveScores);
    const { quadrants } = reportConfig;

    return {
        problemSolving: computeQuadrant(normalized, quadrants.problemSolving),
        motivation: computeQuadrant(normalized, quadrants.motivation),
        interaction: computeQuadrant(normalized, quadrants.interaction),
        communication: computeQuadrant(normalized, quadrants.communication),
        teamwork: computeQuadrant(normalized, quadrants.teamwork),
        taskManagement: computeQuadrant(normalized, quadrants.taskManagement),
    };
}

/**
 * Get the primary (highest scoring) label for a quadrant
 */
export function getPrimaryLabel(scores: QuadrantLabelScores): { label: string; score: number } {
    let maxLabel = '';
    let maxScore = -Infinity;

    for (const [label, score] of Object.entries(scores)) {
        if (score > maxScore) {
            maxScore = score;
            maxLabel = label;
        }
    }

    return { label: maxLabel, score: maxScore };
}

/**
 * Get detailed results for all quadrants including primary labels and descriptions
 */
export function getQuadrantResults(bigFiveScores: BigFiveScores): QuadrantResult[] {
    const scores = computeQuadrantScores(bigFiveScores);
    const { quadrants } = reportConfig;

    const results: QuadrantResult[] = [];

    for (const [quadrantName, quadrantScores] of Object.entries(scores)) {
        const config = quadrants[quadrantName as keyof typeof quadrants];
        const { label: primaryLabel, score: primaryScore } = getPrimaryLabel(quadrantScores);
        const labelConfig = config.labels[primaryLabel as keyof typeof config.labels];

        results.push({
            quadrantName,
            title: config.title,
            titleVi: config.titleVi,
            scores: quadrantScores,
            primary: primaryLabel,
            primaryScore,
            primaryDescription: labelConfig?.description || '',
            primaryDescriptionVi: labelConfig?.descriptionVi || '',
        });
    }

    return results;
}

/**
 * Format label name for display (capitalize first letter)
 */
export function formatLabelName(label: string): string {
    return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Get percentile label (Low/Average/High) for a score
 */
export function getPercentileLabel(score: number): { label: string; labelVi: string } {
    const { percentileLabels } = reportConfig;

    if (score <= percentileLabels.low.max) {
        return { label: percentileLabels.low.label, labelVi: percentileLabels.low.labelVi };
    }
    if (score <= percentileLabels.average.max) {
        return { label: percentileLabels.average.label, labelVi: percentileLabels.average.labelVi };
    }
    return { label: percentileLabels.high.label, labelVi: percentileLabels.high.labelVi };
}
