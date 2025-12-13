/**
 * Report Text Generation Utilities
 * 
 * Generates text content for the personality report using templates
 * and trait-based mappings.
 */

import reportConfig from '../config/reportConfig.json';
import { BigFiveScores, getPercentileLabel } from './quadrantComputation';
import { RIASECScores, generateRIASECPattern } from './riasecPattern';

export interface GeneratedReportText {
    summaryStatement: string;
    riasecPattern: string;
    bigFivePattern: string;
    strengths: string[];
    thrivesIn: string[];
    mayStruggleWith: string[];
    developmentRecommendations: string[];
}

type Lang = 'en' | 'vi';

/**
 * Identify high/low traits from Big Five scores
 */
function identifyTraitLevels(scores: BigFiveScores): {
    high: string[];
    low: string[];
    average: string[];
} {
    const high: string[] = [];
    const low: string[] = [];
    const average: string[] = [];

    for (const [trait, score] of Object.entries(scores)) {
        const { label } = getPercentileLabel(score);
        if (label === 'High') {
            high.push(trait);
        } else if (label === 'Low') {
            low.push(trait);
        } else {
            average.push(trait);
        }
    }

    return { high, low, average };
}

/**
 * Generate Big Five pattern description
 * e.g., "High Openness, High Agreeableness, Low Neuroticism"
 */
export function generateBigFivePattern(
    scores: BigFiveScores,
    lang: Lang = 'en'
): string {
    const { high, low } = identifyTraitLevels(scores);
    const parts: string[] = [];

    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    const highLabel = lang === 'vi' ? 'Cao' : 'High';
    const lowLabel = lang === 'vi' ? 'Thấp' : 'Low';

    for (const trait of high) {
        parts.push(`${highLabel} ${capitalize(trait)}`);
    }
    for (const trait of low) {
        parts.push(`${lowLabel} ${capitalize(trait)}`);
    }

    return parts.length > 0 ? parts.join(', ') : (lang === 'vi' ? 'Cân bằng' : 'Balanced');
}

/**
 * Generate summary statement combining RIASEC and Big Five patterns
 */
export function generateSummaryStatement(
    riasecScores: RIASECScores,
    bigFiveScores: BigFiveScores,
    lang: Lang = 'en'
): string {
    const riasecPattern = generateRIASECPattern(riasecScores, 2);
    const bigFivePattern = generateBigFivePattern(bigFiveScores, lang);

    const template = lang === 'vi'
        ? reportConfig.templates.summaryVi
        : reportConfig.templates.summary;

    return template
        .replace('{riasecPattern}', riasecPattern.fullPattern)
        .replace('{bigFivePattern}', bigFivePattern);
}

/**
 * Generate strengths based on trait combinations
 */
export function generateStrengths(
    bigFiveScores: BigFiveScores,
    riasecScores: RIASECScores,
    lang: Lang = 'en'
): string[] {
    const { high } = identifyTraitLevels(bigFiveScores);
    const strengths: string[] = [];
    const { strengthMappings } = reportConfig;

    // Map trait names to single letters for lookup
    const traitToLetter: Record<string, string> = {
        openness: 'O',
        conscientiousness: 'C',
        extraversion: 'E',
        agreeableness: 'A',
        neuroticism: 'N',
    };

    // Check for high trait combinations
    const highLetters = high.map(t => traitToLetter[t.toLowerCase()]);

    // Generate strengths from high trait pairs
    for (let i = 0; i < highLetters.length; i++) {
        for (let j = i + 1; j < highLetters.length; j++) {
            const key1 = `high${highLetters[i]}_high${highLetters[j]}`;
            const key2 = `high${highLetters[j]}_high${highLetters[i]}`;

            const mapping = strengthMappings[key1 as keyof typeof strengthMappings]
                || strengthMappings[key2 as keyof typeof strengthMappings];

            if (mapping && !strengths.includes(mapping)) {
                strengths.push(mapping);
            }
        }
    }

    // Check for low N combinations
    const { low } = identifyTraitLevels(bigFiveScores);
    if (low.includes('neuroticism')) {
        for (const highTrait of highLetters) {
            const key = `lowN_high${highTrait}`;
            const mapping = strengthMappings[key as keyof typeof strengthMappings];
            if (mapping && !strengths.includes(mapping)) {
                strengths.push(mapping);
            }
        }
    }

    // Add RIASEC-based strengths
    const riasecPattern = generateRIASECPattern(riasecScores, 2);
    const topRiasec = riasecPattern.topKeys[0];

    const riasecStrengths: Record<string, string> = {
        social: 'Strong interpersonal and communication skills',
        artistic: 'Creative thinking and innovative problem-solving',
        investigative: 'Analytical mindset with attention to detail',
        enterprising: 'Natural leadership and persuasion abilities',
        realistic: 'Practical skills and hands-on problem-solving',
        conventional: 'Organizational skills and systematic approach',
    };

    if (topRiasec && riasecStrengths[topRiasec]) {
        strengths.push(riasecStrengths[topRiasec]);
    }

    // Ensure we have at least 4 strengths
    const defaultStrengths = [
        'Adaptable and open to learning new skills',
        'Ability to work both independently and in teams',
        'Strong work ethic and commitment to quality',
        'Good problem-solving and critical thinking skills',
    ];

    while (strengths.length < 4 && defaultStrengths.length > 0) {
        const defaultStrength = defaultStrengths.shift();
        if (defaultStrength && !strengths.includes(defaultStrength)) {
            strengths.push(defaultStrength);
        }
    }

    return strengths.slice(0, 6);
}

/**
 * Generate environment fit recommendations
 */
export function generateEnvironmentFit(
    bigFiveScores: BigFiveScores,
    lang: Lang = 'en'
): { thrivesIn: string[]; mayStruggleWith: string[] } {
    const { high, low } = identifyTraitLevels(bigFiveScores);
    const { environmentMappings } = reportConfig;

    const thrivesIn: string[] = [];
    const mayStruggleWith: string[] = [];

    // Map trait names to letters
    const traitToLetter: Record<string, string> = {
        openness: 'O',
        conscientiousness: 'C',
        extraversion: 'E',
        agreeableness: 'A',
        neuroticism: 'N',
    };

    // Add "thrives in" based on high traits
    for (const trait of high) {
        const letter = traitToLetter[trait.toLowerCase()];
        const key = `high${letter}` as keyof typeof environmentMappings.thrivesIn;
        const mapping = environmentMappings.thrivesIn[key];
        if (mapping && !thrivesIn.includes(mapping)) {
            thrivesIn.push(mapping);
        }
    }

    // Add "may struggle with" based on low traits
    for (const trait of low) {
        const letter = traitToLetter[trait.toLowerCase()];
        const key = `low${letter}` as keyof typeof environmentMappings.mayStruggleWith;
        const mapping = environmentMappings.mayStruggleWith[key];
        if (mapping && !mayStruggleWith.includes(mapping)) {
            mayStruggleWith.push(mapping);
        }
    }

    // Add high N to "may struggle with"
    if (high.includes('neuroticism')) {
        const mapping = environmentMappings.mayStruggleWith.highN;
        if (mapping && !mayStruggleWith.includes(mapping)) {
            mayStruggleWith.push(mapping);
        }
    }

    // Add low N to "thrives in"
    if (low.includes('neuroticism')) {
        const mapping = environmentMappings.thrivesIn.lowN;
        if (mapping && !thrivesIn.includes(mapping)) {
            thrivesIn.push(mapping);
        }
    }

    // Ensure minimum content
    if (thrivesIn.length === 0) {
        thrivesIn.push('Environments that match your unique combination of traits');
    }
    if (mayStruggleWith.length === 0) {
        mayStruggleWith.push('Environments that conflict with your natural preferences');
    }

    return { thrivesIn, mayStruggleWith };
}

/**
 * Generate development recommendations based on moderate/low scores
 */
export function generateDevelopmentRecommendations(
    bigFiveScores: BigFiveScores,
    lang: Lang = 'en'
): string[] {
    const { low, average } = identifyTraitLevels(bigFiveScores);
    const { high } = identifyTraitLevels(bigFiveScores);
    const { developmentMappings } = reportConfig;

    const recommendations: string[] = [];

    // Map trait names to letters
    const traitToLetter: Record<string, string> = {
        openness: 'O',
        conscientiousness: 'C',
        extraversion: 'E',
        agreeableness: 'A',
        neuroticism: 'N',
    };

    // Add recommendations for low traits
    for (const trait of low) {
        const letter = traitToLetter[trait.toLowerCase()];
        const key = `low${letter}` as keyof typeof developmentMappings;
        const mapping = developmentMappings[key];
        if (mapping && !recommendations.includes(mapping)) {
            recommendations.push(mapping);
        }
    }

    // Add recommendation for high neuroticism
    if (high.includes('neuroticism')) {
        const mapping = developmentMappings.highN;
        if (mapping && !recommendations.includes(mapping)) {
            recommendations.push(mapping);
        }
    }

    // Add general recommendations if we don't have enough
    const generalRecommendations = [
        'Continue developing your existing strengths through practice and feedback',
        'Seek mentorship opportunities to accelerate your professional growth',
        'Set specific, measurable goals for your career development',
    ];

    while (recommendations.length < 3 && generalRecommendations.length > 0) {
        const rec = generalRecommendations.shift();
        if (rec && !recommendations.includes(rec)) {
            recommendations.push(rec);
        }
    }

    return recommendations.slice(0, 5);
}

/**
 * Generate career match explanation
 */
export function generateCareerExplanation(
    careerTitle: string,
    riasecScores: RIASECScores,
    bigFiveScores: BigFiveScores,
    careerTags: string[],
    lang: Lang = 'en'
): string {
    const riasecPattern = generateRIASECPattern(riasecScores, 2);
    const { high } = identifyTraitLevels(bigFiveScores);

    const parts: string[] = [];

    // Match based on RIASEC tags
    const matchingTags = careerTags.filter(tag =>
        riasecPattern.shortPattern.includes(tag.toUpperCase())
    );

    if (matchingTags.length > 0) {
        parts.push(`Your ${riasecPattern.fullPattern} interest profile aligns well with this career`);
    }

    // Match based on Big Five
    if (high.includes('openness')) {
        parts.push('Your high openness supports the creative aspects of this role');
    }
    if (high.includes('conscientiousness')) {
        parts.push('Your organized and disciplined nature fits the structured requirements');
    }
    if (high.includes('extraversion')) {
        parts.push('Your sociable personality suits the interpersonal demands');
    }
    if (high.includes('agreeableness')) {
        parts.push('Your cooperative nature aligns with the collaborative aspects');
    }

    if (parts.length === 0) {
        parts.push(`This career matches your unique combination of interests and personality traits`);
    }

    return parts.slice(0, 2).join('. ') + '.';
}

/**
 * Generate complete report text
 */
export function generateReportText(
    riasecScores: RIASECScores,
    bigFiveScores: BigFiveScores,
    lang: Lang = 'en'
): GeneratedReportText {
    const riasecPattern = generateRIASECPattern(riasecScores, 2);
    const bigFivePattern = generateBigFivePattern(bigFiveScores, lang);
    const summaryStatement = generateSummaryStatement(riasecScores, bigFiveScores, lang);
    const strengths = generateStrengths(bigFiveScores, riasecScores, lang);
    const { thrivesIn, mayStruggleWith } = generateEnvironmentFit(bigFiveScores, lang);
    const developmentRecommendations = generateDevelopmentRecommendations(bigFiveScores, lang);

    return {
        summaryStatement,
        riasecPattern: riasecPattern.fullPattern,
        bigFivePattern,
        strengths,
        thrivesIn,
        mayStruggleWith,
        developmentRecommendations,
    };
}
