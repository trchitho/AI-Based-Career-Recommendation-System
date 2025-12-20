/**
 * Report Service
 * 
 * API client for fetching and tracking personality reports.
 * Includes idempotent event logging with event_uuid.
 */

import api from '../lib/api';

// ============ Types ============

export interface FacetLabel {
    name: string;
    percent: number;
    description: string;
}

export interface Facet {
    name: string;
    title: string;
    dominant: string;
    dominant_percent: number;
    labels: FacetLabel[];
}

export interface CoverData {
    title: string;
    subtitle?: string;
    user_name?: string;
    completed_at?: string;
    intro_paragraphs: string[];
}

export interface NarrativeData {
    type_name: string;
    type_description: string;
    paragraphs: string[];
}

export interface ScoreItem {
    trait: string;
    score: number;
    percentile_label: string;
}

export interface ReportData {
    id: number;
    assessment_id: number;
    report_type: string;
    locale: string;
    status: string;
    computed_at: string;
    cover: CoverData;
    narrative: NarrativeData;
    scores: ScoreItem[];
    facets: Facet[];
    strengths: string[];
    challenges: string[];
}

export interface FullReportResponse {
    assessment_id: number;
    user_id: number;
    big5: ReportData | null;
    riasec: ReportData | null;
}

export interface ReportEventPayload {
    assessment_id: number;
    report_id: number;
    report_type: string;
    event_type: 'open' | 'tab_switch' | 'page_view' | 'scroll_depth' | 'print';
    event_uuid?: string;
    tab_key?: string;
    page_no?: number;
    page_key?: string;
    meta?: Record<string, unknown>;
}

// ============ Helpers ============

/**
 * Generate a unique event UUID for idempotent tracking
 */
function generateEventUUID(): string {
    // Use crypto.randomUUID if available, otherwise fallback
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

// Track logged events to prevent duplicates (session-level)
const loggedEvents = new Set<string>();

/**
 * Create a unique key for deduplication
 */
function createEventKey(payload: ReportEventPayload): string {
    const parts = [
        payload.assessment_id,
        payload.report_id,
        payload.report_type,
        payload.event_type,
        payload.tab_key || '',
        payload.page_no || '',
        payload.page_key || '',
    ];
    return parts.join(':');
}

// ============ Service ============

export const reportService = {
    /**
     * Get full report for an assessment (both Big5 and RIASEC)
     */
    async getFullReport(assessmentId: string | number, locale: string = 'en'): Promise<FullReportResponse> {
        const res = await api.get<FullReportResponse>(`/api/reports/${assessmentId}`, {
            params: { locale },
        });
        return res.data;
    },

    /**
     * Log a report viewing event (idempotent)
     * 
     * Rules:
     * - open: only once per report session
     * - tab_switch: requires tab_key
     * - page_view: requires page_no
     * - print: once per print action
     * - All events have event_uuid for backend deduplication
     * - meta_json is never null (defaults to {})
     */
    async logEvent(payload: ReportEventPayload): Promise<void> {
        try {
            // Create dedup key
            const eventKey = createEventKey(payload);

            // Skip if already logged this session (for open, page_view)
            if (payload.event_type === 'open' || payload.event_type === 'page_view') {
                if (loggedEvents.has(eventKey)) {
                    return; // Skip duplicate
                }
                loggedEvents.add(eventKey);
            }

            // Validate required fields based on event type
            if (payload.event_type === 'tab_switch' && !payload.tab_key) {
                console.warn('tab_switch event requires tab_key');
                return;
            }
            if (payload.event_type === 'page_view' && payload.page_no === undefined) {
                console.warn('page_view event requires page_no');
                return;
            }

            // Add event_uuid for idempotency
            const eventWithUUID: ReportEventPayload = {
                ...payload,
                event_uuid: payload.event_uuid || generateEventUUID(),
                meta: payload.meta || {}, // Ensure meta is never null
            };

            await api.post('/api/reports/events', eventWithUUID);
        } catch (error) {
            console.warn('Failed to log report event:', error);
        }
    },

    /**
     * Clear logged events (call when switching reports or tabs)
     */
    clearEventCache(reportType?: string): void {
        if (reportType) {
            // Clear only events for specific report type
            const keysToDelete: string[] = [];
            loggedEvents.forEach((key) => {
                if (key.includes(`:${reportType}:`)) {
                    keysToDelete.push(key);
                }
            });
            keysToDelete.forEach((key) => loggedEvents.delete(key));
        } else {
            loggedEvents.clear();
        }
    },
};

export default reportService;
