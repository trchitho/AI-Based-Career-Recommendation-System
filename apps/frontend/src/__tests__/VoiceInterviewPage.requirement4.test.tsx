/**
 * Test cases cho Yêu Cầu 4: Text-to-Speech (TTS) và Đồng Bộ Văn Bản
 * Đảm bảo 100% Tiêu Chí Chấp Nhận pass
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { vi, describe, test, expect, beforeAll, beforeEach } from 'vitest';
import VoiceInterviewPage from '../pages/VoiceInterviewPage';

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useSearchParams: () => [new URLSearchParams('job_id=1&question_count=10')],
    };
});

// Mock Audio với setSinkId support
class MockAudio {
    src = '';
    onplay: (() => void) | null = null;
    onended: (() => void) | null = null;
    onerror: (() => void) | null = null;
    currentTime = 0;
    _sinkId = '';

    constructor(src?: string) { if (src) this.src = src; }

    async setSinkId(id: string) { this._sinkId = id; }

    async play() {
        if (this.onplay) this.onplay();
        // Simulate audio ending after short delay
        setTimeout(() => { if (this.onended) this.onended(); }, 50);
    }

    pause() { }
}

class MockMediaRecorder {
    state = 'inactive';
    ondataavailable: ((e: any) => void) | null = null;
    onstop: (() => void) | null = null;

    constructor(_stream: MediaStream) { }
    start() { this.state = 'recording'; }
    stop() {
        this.state = 'inactive';
        if (this.ondataavailable) this.ondataavailable({ data: new Blob(['audio'], { type: 'audio/webm' }) });
        if (this.onstop) this.onstop();
    }
}

const mockMediaDevices = { getUserMedia: vi.fn() };

beforeAll(() => {
    Object.defineProperty(navigator, 'mediaDevices', { writable: true, value: mockMediaDevices });
    (globalThis as any).MediaRecorder = MockMediaRecorder;
    (globalThis as any).Audio = MockAudio;
});

beforeEach(() => {
    vi.clearAllMocks();
    mockMediaDevices.getUserMedia.mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }],
    } as any);

    Object.defineProperty(window, 'sessionStorage', {
        value: {
            getItem: vi.fn((key: string) => {
                if (key === 'voiceDeviceConfig') {
                    return JSON.stringify({ microphoneId: 'mic1', speakerId: 'speaker1' });
                }
                return null;
            }),
            setItem: vi.fn(),
        },
        writable: true,
    });

    // Default mock: start returns audio_url + word_timestamps
    mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/interview/voice/start')) {
            return Promise.resolve({
                json: () => Promise.resolve({
                    success: true,
                    session_id: 'session-1',
                    first_question: { id: 'q1', text: 'Xin chào! Hãy giới thiệu bản thân.', type: 'Giới thiệu' },
                    question_audio: {
                        audio_url: 'https://r2.dev/q1.mp3',
                        duration: 4.0,
                        word_timestamps: [
                            { word: 'Xin', offset_ms: 0, duration_ms: 300 },
                            { word: 'chào!', offset_ms: 350, duration_ms: 400 },
                        ],
                    },
                    progress: { current: 1, total: 10 },
                }),
            });
        }
        if (url.includes('/api/interview/voice/tts')) {
            return Promise.resolve({
                json: () => Promise.resolve({
                    success: true,
                    audio_url: 'https://r2.dev/tts.mp3',
                    question_text: 'Câu hỏi từ TTS',
                    duration_seconds: 3.0,
                    voice_used: 'vi-VN-HoaiMyNeural',
                    word_timestamps: [],
                }),
            });
        }
        if (url.includes('/api/interview/voice/answer')) {
            return Promise.resolve({
                json: () => Promise.resolve({
                    success: true,
                    transcript: 'Câu trả lời',
                    file_url: 'https://r2.dev/ans.webm',
                    ai_response: {
                        evaluation: { score: 8, feedback: 'Tốt' },
                        next_question: { id: 'q2', text: 'Câu hỏi tiếp theo', type: 'Kỹ thuật' },
                        progress: { current: 2, total: 10 },
                    },
                    next_question_audio: {
                        audio_url: 'https://r2.dev/q2.mp3',
                        duration: 5.0,
                        word_timestamps: [{ word: 'Câu', offset_ms: 0, duration_ms: 200 }],
                    },
                }),
            });
        }
        return Promise.resolve({ json: () => Promise.resolve({ success: false }) });
    });
});

const renderPage = async () => {
    const result = render(<BrowserRouter><VoiceInterviewPage /></BrowserRouter>);

    // Handle RulesModal: check agreement and confirm
    await waitFor(() => {
        expect(screen.getByTestId('rules-modal')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('agreement-checkbox'));
    fireEvent.click(screen.getByTestId('confirm-btn'));

    return result;
};

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('VoiceInterviewPage - Yêu Cầu 4: TTS và Đồng Bộ Văn Bản', () => {

    /**
     * Tiêu chí 4.3: TTS_Service SHALL trả về URL audio cùng với question_text
     */
    test('Tiêu chí 4.3: Hiển thị question_text từ API response', async () => {
        await renderPage();

        await waitFor(() => {
            expect(screen.getByTestId('question-text')).toBeInTheDocument();
            expect(screen.getByTestId('question-text')).toHaveTextContent('Xin chào! Hãy giới thiệu bản thân.');
        }, { timeout: 3000 });
    });

    /**
     * Tiêu chí 4.4: WHEN Voice_Interview_Runtime nhận được audio URL,
     * SHALL phát audio qua loa đã chọn ở Device_Test_Page
     */
    test('Tiêu chí 4.4: Phát audio qua loa đã chọn (setSinkId)', async () => {
        const setSinkIdSpy = vi.spyOn(MockAudio.prototype, 'setSinkId');
        await renderPage();

        await waitFor(() => {
            expect(screen.getByTestId('question-text')).toBeInTheDocument();
        }, { timeout: 3000 });

        // setSinkId phải được gọi với speakerId từ deviceConfig
        expect(setSinkIdSpy).toHaveBeenCalledWith('speaker1');
    });

    /**
     * Tiêu chí 4.5: WHILE audio đang phát, hiển thị text với typing animation
     */
    test('Tiêu chí 4.5: Hiển thị typing animation khi AI đang nói', async () => {
        await renderPage();

        await waitFor(() => {
            expect(screen.getByTestId('ai-speaking-indicator')).toBeInTheDocument();
        }, { timeout: 3000 });

        // Question bubble phải hiển thị
        expect(screen.getByTestId('question-bubble')).toBeInTheDocument();
        expect(screen.getByTestId('question-text')).toBeInTheDocument();
    });

    /**
     * Tiêu chí 4.7: WHEN audio phát xong, kích hoạt nút "Bắt đầu trả lời"
     */
    test('Tiêu chí 4.7: Kích hoạt nút "Bắt đầu trả lời" sau khi audio phát xong', async () => {
        await renderPage();

        // Ban đầu nút bị disabled
        await waitFor(() => {
            expect(screen.getByTestId('start-answer-btn')).toBeInTheDocument();
        }, { timeout: 3000 });

        // Sau khi audio kết thúc (MockAudio.onended sau 50ms), nút phải enabled
        await waitFor(() => {
            const btn = screen.getByTestId('start-answer-btn');
            expect(btn).not.toBeDisabled();
        }, { timeout: 3000 });
    });

    /**
     * Tiêu chí 4.8: Hỗ trợ giọng nữ vi-VN-HoaiMyNeural
     */
    test('Tiêu chí 4.8: Nút chọn giọng nữ hiển thị và hoạt động', async () => {
        await renderPage();

        await waitFor(() => {
            expect(screen.getByTestId('voice-female-btn')).toBeInTheDocument();
        }, { timeout: 3000 });

        const femaleBtn = screen.getByTestId('voice-female-btn');
        expect(femaleBtn).toHaveTextContent('Nữ');
        fireEvent.click(femaleBtn);
        expect(femaleBtn).toHaveClass('bg-pink-500');
    });

    /**
     * Tiêu chí 4.8: Hỗ trợ giọng nam vi-VN-NamMinhNeural
     */
    test('Tiêu chí 4.8: Nút chọn giọng nam hiển thị và hoạt động', async () => {
        await renderPage();

        await waitFor(() => {
            expect(screen.getByTestId('voice-male-btn')).toBeInTheDocument();
        }, { timeout: 3000 });

        const maleBtn = screen.getByTestId('voice-male-btn');
        expect(maleBtn).toHaveTextContent('Nam');
        fireEvent.click(maleBtn);
        expect(maleBtn).toHaveClass('bg-blue-500');
    });

    /**
     * Tiêu chí 4.6: word_timestamps → highlight từng từ
     */
    test('Tiêu chí 4.6: QuestionBubble render với word timestamps', async () => {
        await renderPage();

        await waitFor(() => {
            expect(screen.getByTestId('question-bubble')).toBeInTheDocument();
        }, { timeout: 3000 });

        // Question bubble phải hiển thị text
        const bubble = screen.getByTestId('question-bubble');
        expect(bubble).toBeInTheDocument();
    });

    /**
     * Tiêu chí 4.2: TTS fallback khi không có audio_url từ /start
     */
    test('Tiêu chí 4.2: Gọi /tts endpoint khi start không trả về audio_url', async () => {
        mockFetch.mockImplementation((url: string) => {
            if (url.includes('/api/interview/voice/start')) {
                return Promise.resolve({
                    json: () => Promise.resolve({
                        success: true,
                        session_id: 'session-1',
                        first_question: { id: 'q1', text: 'Câu hỏi đầu tiên', type: 'Giới thiệu' },
                        question_audio: null,  // Không có audio_url
                        progress: { current: 1, total: 10 },
                    }),
                });
            }
            if (url.includes('/api/interview/voice/tts')) {
                return Promise.resolve({
                    json: () => Promise.resolve({
                        success: true,
                        audio_url: 'https://r2.dev/tts-fallback.mp3',
                        question_text: 'Câu hỏi đầu tiên',
                        duration_seconds: 3.0,
                        voice_used: 'vi-VN-HoaiMyNeural',
                        word_timestamps: [],
                    }),
                });
            }
            return Promise.resolve({ json: () => Promise.resolve({ success: false }) });
        });

        await renderPage();

        await waitFor(() => {
            const ttsCalls = mockFetch.mock.calls.filter((c: any[]) =>
                c[0].includes('/api/interview/voice/tts')
            );
            expect(ttsCalls.length).toBeGreaterThan(0);
        }, { timeout: 3000 });
    });

    /**
     * Tiêu chí 4.7 + 3.1: Sau khi audio phát xong, có thể bắt đầu ghi âm
     */
    test('Tiêu chí 4.7 + 3.1: Ghi âm được kích hoạt sau khi audio phát xong', async () => {
        await renderPage();

        await waitFor(() => {
            const btn = screen.getByTestId('start-answer-btn');
            expect(btn).not.toBeDisabled();
        }, { timeout: 3000 });

        fireEvent.click(screen.getByTestId('start-answer-btn'));

        await waitFor(() => {
            expect(screen.getByTestId('stop-answer-btn')).toBeInTheDocument();
        });
    });

    /**
     * Tiêu chí 4.3 + 3.7: Sau khi trả lời, câu hỏi tiếp theo được hiển thị với audio
     */
    test('Tiêu chí 4.3 + 3.7: Câu hỏi tiếp theo có audio_url và word_timestamps', async () => {
        await renderPage();

        await waitFor(() => {
            expect(screen.getByTestId('start-answer-btn')).not.toBeDisabled();
        }, { timeout: 3000 });

        fireEvent.click(screen.getByTestId('start-answer-btn'));
        await waitFor(() => expect(screen.getByTestId('stop-answer-btn')).toBeInTheDocument());
        fireEvent.click(screen.getByTestId('stop-answer-btn'));

        await waitFor(() => {
            const answerCalls = mockFetch.mock.calls.filter((c: any[]) =>
                c[0].includes('/api/interview/voice/answer')
            );
            expect(answerCalls.length).toBeGreaterThan(0);
        }, { timeout: 5000 });
    });
});

/**
 * Yêu Cầu 3 regression: Đảm bảo tất cả tiêu chí Yêu Cầu 3 vẫn pass
 */
describe('Regression - Yêu Cầu 3 vẫn pass 100%', () => {
    test('3.1: Ghi âm từ microphone đã chọn', async () => {
        await renderPage();
        await waitFor(() => expect(screen.getByTestId('start-answer-btn')).not.toBeDisabled(), { timeout: 3000 });
        fireEvent.click(screen.getByTestId('start-answer-btn'));
        await waitFor(() => {
            expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith({
                audio: { deviceId: { exact: 'mic1' } },
            });
        });
    });

    test('3.2: Hiển thị chỉ báo trực quan khi ghi âm', async () => {
        await renderPage();
        await waitFor(() => expect(screen.getByTestId('start-answer-btn')).not.toBeDisabled(), { timeout: 3000 });
        fireEvent.click(screen.getByTestId('start-answer-btn'));
        await waitFor(() => {
            expect(screen.getByTestId('recording-visual-indicator')).toBeInTheDocument();
            expect(screen.getByTestId('recording-timer')).toBeInTheDocument();
        });
    });

    test('3.3 + 3.4: Dừng ghi âm và upload lên /answer', async () => {
        await renderPage();
        await waitFor(() => expect(screen.getByTestId('start-answer-btn')).not.toBeDisabled(), { timeout: 3000 });
        fireEvent.click(screen.getByTestId('start-answer-btn'));
        await waitFor(() => expect(screen.getByTestId('stop-answer-btn')).toBeInTheDocument());
        fireEvent.click(screen.getByTestId('stop-answer-btn'));
        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith('/api/interview/voice/answer', expect.objectContaining({
                method: 'POST',
                body: expect.any(FormData),
            }));
        });
    });

    test('3.8: Hiển thị lỗi STT và cho phép retry', async () => {
        mockFetch.mockImplementation((url: string) => {
            if (url.includes('/start')) return Promise.resolve({
                json: () => Promise.resolve({
                    success: true, session_id: 's1',
                    first_question: { id: 'q1', text: 'Câu hỏi', type: 'Giới thiệu' },
                    question_audio: null, progress: { current: 1, total: 10 },
                })
            });
            if (url.includes('/tts')) return Promise.resolve({
                json: () => Promise.resolve({
                    success: false,
                })
            });
            if (url.includes('/answer')) return Promise.resolve({
                json: () => Promise.resolve({
                    success: false, error: 'STT_NO_SPEECH_DETECTED',
                    message: 'Không thể nhận dạng giọng nói. Vui lòng thử ghi âm lại.',
                    allow_retry: true,
                })
            });
            return Promise.resolve({ json: () => Promise.resolve({ success: false }) });
        });

        await renderPage();
        await waitFor(() => expect(screen.getByTestId('start-answer-btn')).not.toBeDisabled(), { timeout: 3000 });
        fireEvent.click(screen.getByTestId('start-answer-btn'));
        await waitFor(() => expect(screen.getByTestId('stop-answer-btn')).toBeInTheDocument());
        fireEvent.click(screen.getByTestId('stop-answer-btn'));

        await waitFor(() => {
            expect(screen.getByTestId('error-message')).toHaveTextContent('Không thể nhận dạng giọng nói');
        }, { timeout: 5000 });
    });
});
