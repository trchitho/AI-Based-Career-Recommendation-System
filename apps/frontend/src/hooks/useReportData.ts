/**
 * useReportData Hook
 * 
 * Fetches and computes all data needed for the Personality & Career Report page.
 */

import { useState, useEffect, useCallback } from 'react';
import { assessmentService } from '../services/assessmentService';
import { recommendationService, CareerRecommendationDTO } from '../services/recommendationService';
import { AssessmentResults } from '../types/results';
import { computeQuadrantScores, getQuadrantResults, QuadrantScores, QuadrantResult } from '../utils/quadrantComputation';
import { generateRIASECPattern, RIASECPatternResult } from '../utils/riasecPattern';
import { generateReportText, GeneratedReportText, generateCareerExplanation } from '../utils/reportTextGeneration';

export interface CareerWithExplanation extends CareerRecommendationDTO {
    whyMatch: string;
}

export interface ReportData {
    // Raw data from APIs
    assessment: AssessmentResults;
    recommendations: CareerRecommendationDTO[];

    // Computed data
    riasecPattern: RIASECPatternResult;
    quadrantScores: QuadrantScores;
    quadrantResults: QuadrantResult[];
    reportText: GeneratedReportText;
    careersWithExplanations: CareerWithExplanation[];
}

export interface UseReportDataResult {
    data: ReportData | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useReportData(assessmentId: string | undefined): UseReportDataResult {
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!assessmentId) {
            setError('Assessment ID is required');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Fetch assessment results and recommendations in parallel
            const [assessmentData, recommendationsData] = await Promise.all([
                assessmentService.getResults(assessmentId),
                recommendationService.getMain(assessmentId, 3),
            ]);

            const assessment = assessmentData as AssessmentResults;
            const recommendations = recommendationsData.items;

            // Validate required data
            if (!assessment.riasec_scores) {
                throw new Error('RIASEC scores not found in assessment results');
            }
            if (!assessment.big_five_scores) {
                throw new Error('Big Five scores not found in assessment results');
            }

            // Compute RIASEC pattern
            const riasecPattern = generateRIASECPattern(assessment.riasec_scores, 3);

            // Compute quadrant scores from Big Five
            const quadrantScores = computeQuadrantScores(assessment.big_five_scores);
            const quadrantResults = getQuadrantResults(assessment.big_five_scores);

            // Generate report text
            const reportText = generateReportText(
                assessment.riasec_scores,
                assessment.big_five_scores,
                'en' // TODO: Support language switching
            );

            // Generate career explanations
            const careersWithExplanations: CareerWithExplanation[] = recommendations.map(career => ({
                ...career,
                whyMatch: generateCareerExplanation(
                    career.title_en || career.career_id,
                    assessment.riasec_scores,
                    assessment.big_five_scores,
                    career.tags || [],
                    'en'
                ),
            }));

            setData({
                assessment,
                recommendations,
                riasecPattern,
                quadrantScores,
                quadrantResults,
                reportText,
                careersWithExplanations,
            });
        } catch (err: any) {
            const message = err?.response?.data?.detail
                || err?.message
                || 'Failed to load report data';
            setError(message);
            console.error('useReportData error:', err);
        } finally {
            setLoading(false);
        }
    }, [assessmentId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        data,
        loading,
        error,
        refetch: fetchData,
    };
}

export default useReportData;
