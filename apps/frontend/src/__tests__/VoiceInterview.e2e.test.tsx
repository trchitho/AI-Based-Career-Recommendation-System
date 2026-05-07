/**
 * E2E Integration Tests - Voice Interview System
 * Validates: Requirements 8.2, 8.4
 *
 * Tests the complete voice interview flow and independence of text/voice modes.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, test, expect, beforeAll, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useParams: () => ({ jobId: '15-1252.00' }),
        useSearchParams: () => [new URLSearchParams('job_id=15-1252.00&question_count=5')],
    };
});

vi.mock('../services/interviewService', () => ({
    interviewService: {
        getJobInfo: vi.fn().mockResolvedValue({
            id: '15-1252.00',
            title: 'Software Developer',
            soft_skills: [],
            hard_skills: [],
            hard_skills_total: 0,
        }),
        getCareerLevels: vi.fn().mockResolvedValue({
            levels: [
                { id: 1, name: 'Junior', slug: 'junior', description: 'Entry level', min_years: 0, max_years: 2, color: '#green' },
            ],
        }),
        startInterview: vi.fn().mockResolvedValue({
            session_id: 'sess-text-123',
            first_question: { id: 'q1', text: 'Tell me about yourself', type: 'Giới thiệu' },
        }),
        submitJDManual: vi.fn(),
        uploadJDFile: vi.fn(),
    },
    CareerLevel: {},
}));

vi.mock('../contexts/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
    }),
}));

vi.mock('../components/interview/QuestionCountSelector', () => ({
    default: ({ onSelect }: any) => (
        <div data-testid="question-count-selector">
            <button onClick={() => onSelect(5)}>Select 5</button>
        </div>
    ),
}));

vi.mock('../components/interview/STARMethodGuide', () => ({
    default: () => <div data-testid="star-method-guide" />,
}));

vi.mock('../components/interview/LevelCard', () => ({
    default: ({ level, isSelected, onSelect }: any) => (
        <button
            data-testid={`level-card-${level.slug}`}
            onClick={() => onSelect(level)}
            className={isSelected ? 'border-blue-500' : ''}
        >
            {level.name}
        </button>
    ),
}));

vi.mock('../components/layout/MainLayout', () => ({
    default: ({ children }: any) => <div>{children}</div>,
}));

// Mock browser APIs
class MockMediaRecorder {
    state = 'inactive';
    ondataavailable: ((e: any) => void) | null = null;
    onstop: (() => void) | null = null;
    start() { this.state = 'recording'; }
    stop() {
        this.state = 'inactive';
        this.ondataavailable?.({ data: new Blob(['audio'], { type: 'audio/webm' }) });
        this.onstop?.();
    }
}

class MockAudio {
    src = '';
    onplay: (() => void) | null = null;
    onended: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(src?: string) { if (src) this.src = src; }
    async setSinkId(_id: string) { return Promise.resolve(); }
    async play() {
        this.onplay?.();
        setTimeout(() => this.onended?.(), 50);
        return Promise.resolve();
    }
    pause() { }
}

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

beforeAll(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
        writable: true,
        value: {
            getUserMedia: vi.fn().mockResolvedValue({
                getTracks: () => [{ stop: vi.fn(), onended: null }],
            }),
            enumerateDevices: vi.fn().mockResolvedValue([
                { deviceId: 'mic1', label: 'Microphone 1', kind: 'audioinput' },
                { deviceId: 'spk1', label: 'Speaker 1', kind: 'audiooutput' },
            ]),
        },
    });
    (globalThis as any).MediaRecorder = MockMediaRecorder;
    (globalThis as any).Audio = MockAudio;
});

beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();

    // Default fetch mock for voice API
    mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/interview/voice/start')) {
            return Promise.resolve({
                json: () => Promise.resolve({
                    success: true,
                    session_id: 'sess-voice-456',
                    first_question: { id: 'q1', text: 'Giới thiệu bản thân bạn.', type: 'Giới thiệu' },
                    question_audio: { audio_url: 'mock-audio.mp3', duration: 3 },
                    progress: { current: 1, total: 5 },
                }),
            });
        }
        if (url.includes('/api/interview/voice/answer')) {
            return Promise.resolve({
                json: () => Promise.resolve({
                    success: true,
                    transcript: 'Tôi là lập trình viên.',
                    ai_response: {
                        next_question: { id: 'q2', text: 'Dự án bạn tự hào nhất?', type: 'Kỹ thuật' },
                        progress: { current: 2, total: 5 },
                    },
                    next_question_audio: { audio_url: 'mock-audio-2.mp3', duration: 3 },
                }),
            });
        }
        if (url.includes('/api/interview/voice/tab-switch')) {
            return Promise.resolve({ json: () => Promise.resolve({ success: true }) });
        }
        return Promise.resolve({ json: () => Promise.resolve({ success: false }) });
    });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const setupVoiceDeviceConfig = () => {
    sessionStorage.setItem('voiceDeviceConfig', JSON.stringify({
        microphoneId: 'mic1',
        speakerId: 'spk1',
    }));
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('E2E: InterviewSelectionPage → Voice Mode Flow (Req 8.2, 8.4)', () => {

    /**
     * Validates: Requirements 8.2, 8.4
     * Complete voice interview flow: selection → device-test navigation
     */
    test('Voice mode: navigates to /interview/device-test and saves params', async () => {
        const { default: InterviewSelectionPage } = await import('../pages/InterviewSelectionPage');

        render(
            <BrowserRouter>
                <InterviewSelectionPage />
            </BrowserRouter>
        );

        // Wait for page to load
        await waitFor(() => {
            expect(screen.getByTestId('interview-mode-selection')).toBeInTheDocument();
        });

        // Wait for level cards
        await waitFor(() => {
            expect(screen.getByTestId('level-card-junior')).toBeInTheDocument();
        }, { timeout: 3000 });

        // Select a level
        fireEvent.click(screen.getByTestId('level-card-junior'));

        // Switch to voice mode
        fireEvent.click(screen.getByTestId('interview-mode-voice'));

        // Start interview
        fireEvent.click(screen.getByRole('button', { name: /Bắt đầu phỏng vấn/i }));

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/interview/device-test');
        });

        // Verify params saved to sessionStorage
        const stored = sessionStorage.getItem('voiceInterviewParams');
        expect(stored).not.toBeNull();
        const params = JSON.parse(stored!);
        expect(params.job_id).toBe('15-1252.00');
        expect(params.level_slug).toBe('junior');
    });

    /**
     * Validates: Requirements 8.2, 8.4
     * Text mode works independently — calls startInterview, not device-test
     */
    test('Text mode: calls startInterview directly, does NOT navigate to device-test', async () => {
        const { default: InterviewSelectionPage } = await import('../pages/InterviewSelectionPage');
        const { interviewService } = await import('../services/interviewService');

        render(
            <BrowserRouter>
                <InterviewSelectionPage />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByTestId('interview-mode-selection')).toBeInTheDocument();
        });

        await waitFor(() => {
            expect(screen.getByTestId('level-card-junior')).toBeInTheDocument();
        }, { timeout: 3000 });

        // Select level (text mode is default)
        fireEvent.click(screen.getByTestId('level-card-junior'));

        // Start interview in text mode
        fireEvent.click(screen.getByRole('button', { name: /Bắt đầu phỏng vấn/i }));

        await waitFor(() => {
            expect(interviewService.startInterview).toHaveBeenCalled();
        });

        expect(mockNavigate).not.toHaveBeenCalledWith('/interview/device-test');
    });
});

describe('E2E: VoiceInterviewPage Full Flow (Req 8.2, 8.4)', () => {

    const renderVoicePage = async () => {
        setupVoiceDeviceConfig();
        const { default: VoiceInterviewPage } = await import('../pages/VoiceInterviewPage');

        render(
            <BrowserRouter>
                <VoiceInterviewPage />
            </BrowserRouter>
        );

        // Confirm rules modal
        await waitFor(() => {
            expect(screen.getByTestId('rules-modal')).toBeInTheDocument();
        });
        fireEvent.click(screen.getByTestId('agreement-checkbox'));
        fireEvent.click(screen.getByTestId('confirm-btn'));
    };

    /**
     * Validates: Requirements 8.2, 8.4
     * VoiceInterviewPage: rules modal → interview session → record → next question
     */
    test('Full flow: rules modal → session start → record answer → next question', async () => {
        await renderVoicePage();

        // Session starts, first question loads
        await waitFor(() => {
            expect(screen.getByTestId('question-text')).toBeInTheDocument();
            expect(screen.getByTestId('progress-indicator')).toHaveTextContent('1/5');
        }, { timeout: 3000 });

        // Wait for AI to finish speaking so answer button is enabled
        await waitFor(() => {
            expect(screen.getByTestId('start-answer-btn')).not.toBeDisabled();
        }, { timeout: 3000 });

        // Record answer
        fireEvent.click(screen.getByTestId('start-answer-btn'));
        await waitFor(() => {
            expect(screen.getByTestId('stop-answer-btn')).toBeInTheDocument();
        });

        // Stop recording → triggers upload → next question
        fireEvent.click(screen.getByTestId('stop-answer-btn'));

        await waitFor(() => {
            expect(screen.getByTestId('progress-indicator')).toHaveTextContent('2/5');
        }, { timeout: 5000 });
    });

    /**
     * Validates: Requirements 8.2, 8.4
     * Both modes work independently — switching between them doesn't break either
     */
    test('Both modes independent: voice page unaffected by text mode state', async () => {
        await renderVoicePage();

        // Voice page loads correctly with its own session
        await waitFor(() => {
            expect(screen.getByTestId('ai-avatar')).toBeInTheDocument();
            expect(screen.getByTestId('question-text')).toBeInTheDocument();
        }, { timeout: 3000 });

        // Verify voice-specific UI elements exist (not text interview UI)
        expect(screen.queryByTestId('chat-history')).not.toBeInTheDocument();
        expect(screen.getByTestId('voice-female-btn')).toBeInTheDocument();
        expect(screen.getByTestId('voice-male-btn')).toBeInTheDocument();

        // Verify fetch was called with voice endpoint, not text endpoint
        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/interview/voice/start'),
            expect.any(Object)
        );
    });
});
