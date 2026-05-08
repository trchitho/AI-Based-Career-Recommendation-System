/**
 * Test cases for Task 15 - Error Handling & Recovery
 * Requirements: 9.1 (network retry), 9.3 (STT fallback), 9.5 (mic disconnect)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { vi, describe, test, expect, beforeAll, beforeEach } from 'vitest';
import VoiceInterviewPage from '../pages/VoiceInterviewPage';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useSearchParams: () => [new URLSearchParams('job_id=1&question_count=5')],
    };
});

// Track callbacks for mic disconnect test
let capturedTrackEndedCallback: (() => void) | null = null;

class MockMediaRecorder {
    state = 'inactive';
    ondataavailable: ((e: any) => void) | null = null;
    onstop: (() => void) | null = null;
    start() { this.state = 'recording'; }
    stop() {
        this.state = 'inactive';
        if (this.ondataavailable) this.ondataavailable({ data: new Blob(['x'], { type: 'audio/webm' }) });
        if (this.onstop) this.onstop();
    }
}

class MockAudio {
    src = '';
    onplay: (() => void) | null = null;
    onended: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(src?: string) { if (src) this.src = src; }
    async setSinkId() { return Promise.resolve(); }
    async play() {
        if (this.onplay) this.onplay();
        setTimeout(() => { if (this.onended) this.onended(); }, 50);
        return Promise.resolve();
    }
    pause() { }
}

const mockDeviceConfig = { microphoneId: 'mic1', speakerId: 'speaker1' };

const startResponse = {
    success: true,
    session_id: 'sess-1',
    first_question: { id: 'q1', text: 'Giới thiệu bản thân?', type: 'Giới thiệu' },
    question_audio: { audio_url: 'audio.mp3', duration: 3 },
    progress: { current: 1, total: 5 },
};

const answerSuccessResponse = {
    success: true,
    transcript: 'Tôi là lập trình viên.',
    ai_response: {
        next_question: { id: 'q2', text: 'Câu hỏi 2?', type: 'Kỹ thuật' },
        progress: { current: 2, total: 5 },
    },
    next_question_audio: { audio_url: 'audio2.mp3', duration: 3 },
};

beforeAll(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
        writable: true,
        value: { getUserMedia: vi.fn() },
    });
    (globalThis as any).MediaRecorder = MockMediaRecorder;
    (globalThis as any).Audio = MockAudio;
});

beforeEach(() => {
    vi.clearAllMocks();
    capturedTrackEndedCallback = null;

    const mockSessionStorage = {
        getItem: vi.fn((key: string) => {
            if (key === 'voiceDeviceConfig') return JSON.stringify(mockDeviceConfig);
            return null;
        }),
        setItem: vi.fn(),
        removeItem: vi.fn(),
    };
    Object.defineProperty(window, 'sessionStorage', { value: mockSessionStorage, writable: true, configurable: true });

    // Create a stable track object so onended setter is captured correctly
    const mockTrack = { stop: vi.fn() };
    Object.defineProperty(mockTrack, 'onended', {
        get() { return capturedTrackEndedCallback; },
        set(cb: any) { capturedTrackEndedCallback = cb; },
        configurable: true,
    });

    (navigator.mediaDevices.getUserMedia as any) = vi.fn().mockResolvedValue({
        getTracks: () => [mockTrack],
    });

    // Default fetch mock - handle /api/voice/preferences so initializeInterview doesn't hang
    mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/voice/preferences')) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ preferred_voice: 'female', voice_rate: '+0%', voice_pitch: '+0Hz', voice_volume: 1.0, language: 'vi-VN' }),
            });
        }
        return Promise.resolve({ ok: false, json: () => Promise.resolve({ success: false }) });
    });

});

const renderPage = () =>
    render(<BrowserRouter><VoiceInterviewPage /></BrowserRouter>);

// ── Helper: dismiss rules modal and wait for init ─────────────────────────────

const dismissModal = async () => {
    await waitFor(() => screen.getByTestId('rules-modal'));
    fireEvent.click(screen.getByTestId('agreement-checkbox'));
    fireEvent.click(screen.getByTestId('confirm-btn'));
};

const waitForReady = async () => {
    await waitFor(() => {
        expect(screen.getByTestId('start-answer-btn')).not.toBeDisabled();
    }, { timeout: 10000 });
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('9.1 - Network retry on upload failure', () => {
    test('retries fetch up to 3 times on network error, succeeds on 3rd attempt', async () => {
        // preferences called first, then start session
        mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ preferred_voice: 'female' }) });
        mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve(startResponse) });
        renderPage();
        await dismissModal();
        await waitForReady();

        // Fail twice, succeed on 3rd
        mockFetch
            .mockRejectedValueOnce(new Error('Network error'))
            .mockRejectedValueOnce(new Error('Network error'))
            .mockResolvedValueOnce({ json: () => Promise.resolve(answerSuccessResponse) });

        // Start and stop recording to trigger processUserAnswer
        const startBtn = screen.getByTestId('start-answer-btn');
        fireEvent.click(startBtn);
        await waitFor(() => screen.getByTestId('stop-answer-btn'));
        const stopBtn = screen.getByTestId('stop-answer-btn');
        fireEvent.click(stopBtn);

        // Should eventually succeed (no persistent error message)
        await waitFor(() => {
            const answerCalls = mockFetch.mock.calls.filter((c: any[]) =>
                c[0]?.includes?.('/api/interview/voice/answer')
            );
            expect(answerCalls.length).toBe(3);
        }, { timeout: 10000 });
    }, 15000);
});

describe('9.3 - STT fallback after 3 failures', () => {
    test('shows text fallback input after 3 STT errors', async () => {
        const sttErrorResponse = {
            success: false,
            message: 'STT error: could not transcribe audio',
            error_type: 'stt_error',
        };

        mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ preferred_voice: 'female' }) });
        mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve(startResponse) });
        renderPage();
        await dismissModal();
        await waitForReady();

        // Simulate 3 STT failures
        for (let i = 0; i < 3; i++) {
            mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve(sttErrorResponse) });
            fireEvent.click(screen.getByTestId('start-answer-btn'));
            await waitFor(() => screen.getByTestId('stop-answer-btn'));
            fireEvent.click(screen.getByTestId('stop-answer-btn'));
            await waitFor(() => screen.getByTestId('error-message'), { timeout: 5000 });
        }

        // After 3 STT failures, text fallback should appear
        await waitFor(() => {
            expect(screen.getByTestId('text-fallback-input')).toBeInTheDocument();
            expect(screen.getByTestId('fallback-textarea')).toBeInTheDocument();
            expect(screen.getByTestId('fallback-submit-btn')).toBeInTheDocument();
        });
    }, 15000);

    test('text fallback submit sends text_answer to API', async () => {
        const sttErrorResponse = {
            success: false,
            message: 'STT error: transcription failed',
            error_type: 'stt_error',
        };

        mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ preferred_voice: 'female' }) });
        mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve(startResponse) });
        renderPage();
        await dismissModal();
        await waitForReady();

        // Trigger 3 STT failures to show fallback
        for (let i = 0; i < 3; i++) {
            mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve(sttErrorResponse) });
            fireEvent.click(screen.getByTestId('start-answer-btn'));
            await waitFor(() => screen.getByTestId('stop-answer-btn'));
            fireEvent.click(screen.getByTestId('stop-answer-btn'));
            await waitFor(() => screen.getByTestId('error-message'), { timeout: 5000 });
        }

        await waitFor(() => screen.getByTestId('fallback-textarea'));

        // Type answer and submit
        mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve(answerSuccessResponse) });
        fireEvent.change(screen.getByTestId('fallback-textarea'), {
            target: { value: 'Câu trả lời của tôi' },
        });
        fireEvent.click(screen.getByTestId('fallback-submit-btn'));

        await waitFor(() => {
            const answerCalls = mockFetch.mock.calls.filter((c: any[]) =>
                c[0]?.includes?.('/api/interview/voice/answer')
            );
            const lastCall = answerCalls[answerCalls.length - 1];
            const body = lastCall[1]?.body as FormData;
            expect(body.get('text_answer')).toBe('Câu trả lời của tôi');
        });
    }, 15000);
});

describe('9.5 - Microphone disconnect', () => {
    test('shows error message when microphone track ends during recording', async () => {
        mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ preferred_voice: 'female' }) });
        mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve(startResponse) });
        renderPage();
        await dismissModal();
        await waitForReady();

        // Start recording
        fireEvent.click(screen.getByTestId('start-answer-btn'));
        await waitFor(() => screen.getByTestId('stop-answer-btn'));

        // Simulate mic disconnect by triggering track.onended
        act(() => {
            if (capturedTrackEndedCallback) capturedTrackEndedCallback();
        });

        await waitFor(() => {
            const errEl = screen.queryByTestId('error-message');
            expect(errEl).toBeInTheDocument();
            expect(errEl?.textContent).toContain('Microphone');
        }, { timeout: 5000 });
    }, 15000);
});
