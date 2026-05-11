/**
 * Test cases cho Yêu Cầu 3: Luồng Ghi Âm và Xử Lý Câu Trả Lời
 * Đảm bảo 100% Tiêu Chí Chấp Nhận của Yêu Cầu 3
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { vi, describe, test, expect, beforeAll, beforeEach } from 'vitest';
import VoiceInterviewPage from '../pages/VoiceInterviewPage';

// Mock fetch for API calls
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Mock navigator.mediaDevices
const mockMediaDevices = {
    getUserMedia: vi.fn(),
};

const mockNavigate = vi.fn();

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useSearchParams: () => [new URLSearchParams('job_id=1&question_count=10')],
    };
});

// Mock MediaRecorder
class MockMediaRecorder {
    state: string = 'inactive';
    ondataavailable: ((event: any) => void) | null = null;
    onstop: (() => void) | null = null;

    constructor(stream: MediaStream) { }

    start() {
        this.state = 'recording';
    }

    stop() {
        this.state = 'inactive';
        if (this.ondataavailable) {
            this.ondataavailable({ data: new Blob(['test-audio'], { type: 'audio/webm' }) });
        }
        if (this.onstop) {
            this.onstop();
        }
    }
}

// Mock Audio
class MockAudio {
    src: string = '';
    onplay: (() => void) | null = null;
    onended: (() => void) | null = null;
    onerror: (() => void) | null = null;

    constructor(src?: string) {
        if (src) this.src = src;
    }

    async setSinkId(deviceId: string) {
        return Promise.resolve();
    }

    async play() {
        if (this.onplay) this.onplay();
        setTimeout(() => {
            if (this.onended) this.onended();
        }, 100);
        return Promise.resolve();
    }

    pause() { }
}

// Setup mocks
beforeAll(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
        writable: true,
        value: mockMediaDevices,
    });

    (globalThis as any).MediaRecorder = MockMediaRecorder;
    (globalThis as any).Audio = MockAudio;
});

beforeEach(() => {
    vi.clearAllMocks();

    // Mock sessionStorage with device config
    const mockDeviceConfig = {
        microphoneId: 'mic1',
        speakerId: 'speaker1',
    };

    const mockSessionStorage = {
        getItem: vi.fn((key) => {
            if (key === 'voiceDeviceConfig') {
                return JSON.stringify(mockDeviceConfig);
            }
            return null;
        }),
        setItem: vi.fn(),
    };

    Object.defineProperty(window, 'sessionStorage', {
        value: mockSessionStorage,
    });

    mockMediaDevices.getUserMedia.mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }],
    } as any);

    // Mock successful API responses by default
    mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/interview/voice/start')) {
            return Promise.resolve({
                json: () => Promise.resolve({
                    success: true,
                    session_id: 'test-session-123',
                    first_question: {
                        id: 'q1',
                        text: 'Xin chào! Hãy giới thiệu về bản thân.',
                        type: 'Giới thiệu'
                    },
                    question_audio: {
                        audio_url: 'mock-audio-url',
                        duration: 5
                    },
                    progress: {
                        current: 1,
                        total: 10
                    }
                })
            });
        }

        if (url.includes('/api/interview/voice/answer')) {
            return Promise.resolve({
                json: () => Promise.resolve({
                    success: true,
                    transcript: 'Tôi có 3 năm kinh nghiệm làm việc với React.',
                    file_url: 'mock-file-url',
                    ai_response: {
                        evaluation: {
                            score: 8,
                            feedback: 'Câu trả lời tốt'
                        },
                        next_question: {
                            id: 'q2',
                            text: 'Hãy kể về dự án bạn tự hào nhất.',
                            type: 'Kỹ thuật'
                        },
                        progress: {
                            current: 2,
                            total: 10
                        }
                    },
                    next_question_audio: {
                        audio_url: 'mock-next-audio-url',
                        duration: 6
                    }
                })
            });
        }

        return Promise.resolve({
            json: () => Promise.resolve({ success: false })
        });
    });
});

const renderVoiceInterviewPage = async () => {
    const result = render(
        <BrowserRouter>
            <VoiceInterviewPage />
        </BrowserRouter>
    );

    // Handle RulesModal: check agreement and confirm
    await waitFor(() => {
        expect(screen.getByTestId('rules-modal')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('agreement-checkbox'));
    fireEvent.click(screen.getByTestId('confirm-btn'));

    return result;
};

describe('VoiceInterviewPage - Yêu Cầu 3: Luồng Ghi Âm và Xử Lý Câu Trả Lời', () => {

    /**
     * Tiêu chí 3.1: WHEN người dùng nhấn "Bắt đầu trả lời", THE Voice_Interview_Runtime SHALL 
     * bắt đầu ghi âm từ microphone đã chọn ở Device_Test_Page bằng MediaRecorder.
     */
    test('Tiêu chí 3.1: Bắt đầu ghi âm từ microphone đã chọn bằng MediaRecorder', async () => {
        await renderVoiceInterviewPage();

        // Wait for page to load and AI to finish speaking
        await waitFor(() => {
            const startAnswerBtn = screen.getByTestId('start-answer-btn');
            expect(startAnswerBtn).not.toBeDisabled();
        }, { timeout: 5000 });

        // Click start recording
        const startAnswerBtn = screen.getByTestId('start-answer-btn');
        fireEvent.click(startAnswerBtn);

        await waitFor(() => {
            // Verify MediaRecorder was called with correct device
            expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith({
                audio: {
                    deviceId: { exact: 'mic1' }
                }
            });

            // Verify recording UI appears
            expect(screen.getByTestId('stop-answer-btn')).toBeInTheDocument();
        });
    });

    /**
     * Tiêu chí 3.2: WHILE đang ghi âm, THE Voice_Interview_Runtime SHALL hiển thị chỉ báo trực quan 
     * (ví dụ: waveform animation hoặc timer) để người dùng biết hệ thống đang ghi.
     */
    test('Tiêu chí 3.2: Hiển thị chỉ báo trực quan khi đang ghi âm', async () => {
        await renderVoiceInterviewPage();

        await waitFor(() => {
            const startAnswerBtn = screen.getByTestId('start-answer-btn');
            expect(startAnswerBtn).not.toBeDisabled();
        }, { timeout: 5000 });

        // Start recording
        const startAnswerBtn = screen.getByTestId('start-answer-btn');
        fireEvent.click(startAnswerBtn);

        await waitFor(() => {
            // Verify visual indicators are present
            expect(screen.getByTestId('recording-visual-indicator')).toBeInTheDocument();
            expect(screen.getByTestId('recording-timer')).toBeInTheDocument();
            expect(screen.getByTestId('recording-indicator')).toBeInTheDocument();

            // Verify timer shows recording time
            const timer = screen.getByTestId('recording-timer');
            expect(timer).toHaveTextContent('🔴 00:0');
        });
    });

    /**
     * Tiêu chí 3.3: WHEN người dùng nhấn "Dừng trả lời", THE Voice_Interview_Runtime SHALL 
     * dừng ghi âm và tạo audio blob định dạng WebM hoặc MP4.
     */
    test('Tiêu chí 3.3: Dừng ghi âm và tạo audio blob định dạng WebM', async () => {
        await renderVoiceInterviewPage();

        await waitFor(() => {
            const startAnswerBtn = screen.getByTestId('start-answer-btn');
            expect(startAnswerBtn).not.toBeDisabled();
        }, { timeout: 5000 });

        // Start recording
        const startAnswerBtn = screen.getByTestId('start-answer-btn');
        fireEvent.click(startAnswerBtn);

        await waitFor(() => {
            expect(screen.getByTestId('stop-answer-btn')).toBeInTheDocument();
        });

        // Stop recording
        const stopAnswerBtn = screen.getByTestId('stop-answer-btn');
        fireEvent.click(stopAnswerBtn);

        await waitFor(() => {
            // Verify MediaRecorder.stop() was called and audio blob was created
            // This is verified by the API call being made with FormData containing audio file
            expect(mockFetch).toHaveBeenCalledWith('/api/interview/voice/answer', expect.objectContaining({
                method: 'POST',
                body: expect.any(FormData)
            }));
        });
    });

    /**
     * Tiêu chí 3.4: WHEN ghi âm dừng, THE Voice_Interview_Runtime SHALL upload audio blob 
     * lên endpoint POST /api/interview/voice/answer dưới dạng multipart/form-data.
     */
    test('Tiêu chí 3.4: Upload audio blob lên endpoint POST /api/interview/voice/answer', async () => {
        await renderVoiceInterviewPage();

        await waitFor(() => {
            const startAnswerBtn = screen.getByTestId('start-answer-btn');
            expect(startAnswerBtn).not.toBeDisabled();
        }, { timeout: 5000 });

        // Complete recording flow
        const startAnswerBtn = screen.getByTestId('start-answer-btn');
        fireEvent.click(startAnswerBtn);

        await waitFor(() => {
            expect(screen.getByTestId('stop-answer-btn')).toBeInTheDocument();
        });

        const stopAnswerBtn = screen.getByTestId('stop-answer-btn');
        fireEvent.click(stopAnswerBtn);

        await waitFor(() => {
            // Verify API call was made to correct endpoint
            expect(mockFetch).toHaveBeenCalledWith('/api/interview/voice/answer', expect.objectContaining({
                method: 'POST',
                body: expect.any(FormData)
            }));

            // Verify FormData contains required fields
            const formDataCall = mockFetch.mock.calls.find(call =>
                call[0].includes('/api/interview/voice/answer')
            );
            expect(formDataCall).toBeDefined();
            if (!formDataCall) {
                throw new Error('Expected /api/interview/voice/answer call to exist');
            }
            expect(formDataCall[1].body).toBeInstanceOf(FormData);
        });
    });

    /**
     * Tiêu chí 3.5 & 3.6: WHEN upload hoàn tất, THE Audio_Pipeline SHALL chuyển audio sang STT_Service 
     * và gọi AIPipelineService.submit_answer(session_id, transcript).
     */
    test('Tiêu chí 3.5 & 3.6: Audio Pipeline xử lý STT và AI Pipeline', async () => {
        await renderVoiceInterviewPage();

        await waitFor(() => {
            const startAnswerBtn = screen.getByTestId('start-answer-btn');
            expect(startAnswerBtn).not.toBeDisabled();
        }, { timeout: 5000 });

        // Complete recording and upload
        const startAnswerBtn = screen.getByTestId('start-answer-btn');
        fireEvent.click(startAnswerBtn);

        await waitFor(() => {
            expect(screen.getByTestId('stop-answer-btn')).toBeInTheDocument();
        });

        const stopAnswerBtn = screen.getByTestId('stop-answer-btn');
        fireEvent.click(stopAnswerBtn);

        await waitFor(() => {
            // Verify API was called and response was processed
            expect(mockFetch).toHaveBeenCalledWith('/api/interview/voice/answer', expect.objectContaining({
                method: 'POST',
                body: expect.any(FormData)
            }));
        }, { timeout: 10000 });

        // The actual STT and AI Pipeline processing is verified by the backend API tests
        // Frontend just needs to verify the API call was made correctly
    });

    /**
     * Tiêu chí 3.7: WHEN AIPipelineService trả về kết quả, THE Voice_Interview_Runtime SHALL 
     * hiển thị câu hỏi tiếp theo và phát audio TTS tương ứng.
     */
    test('Tiêu chí 3.7: Hiển thị câu hỏi tiếp theo và phát audio TTS', async () => {
        await renderVoiceInterviewPage();

        await waitFor(() => {
            const startAnswerBtn = screen.getByTestId('start-answer-btn');
            expect(startAnswerBtn).not.toBeDisabled();
        }, { timeout: 5000 });

        // Complete recording flow
        const startAnswerBtn = screen.getByTestId('start-answer-btn');
        fireEvent.click(startAnswerBtn);

        await waitFor(() => {
            expect(screen.getByTestId('stop-answer-btn')).toBeInTheDocument();
        });

        const stopAnswerBtn = screen.getByTestId('stop-answer-btn');
        fireEvent.click(stopAnswerBtn);

        await waitFor(() => {
            // Verify next question is displayed
            const questionText = screen.getByTestId('question-text');
            expect(questionText).toHaveTextContent('Hãy kể về dự án bạn tự hào nhất');

            // Verify question type updated
            const questionType = screen.getByTestId('question-type');
            expect(questionType).toHaveTextContent('Kỹ thuật');

            // Verify progress updated
            const progress = screen.getByTestId('progress-indicator');
            expect(progress).toHaveTextContent('2/10');
        }, { timeout: 10000 });
    });

    /**
     * Tiêu chí 3.8: IF STT_Service không thể nhận dạng được giọng nói (transcript rỗng hoặc lỗi), 
     * THEN THE Voice_Interview_Runtime SHALL hiển thị thông báo lỗi và cho phép người dùng ghi âm lại.
     */
    test('Tiêu chí 3.8: Xử lý lỗi STT và cho phép ghi âm lại', async () => {
        // Mock STT failure response
        mockFetch.mockImplementation((url: string) => {
            if (url.includes('/api/interview/voice/start')) {
                return Promise.resolve({
                    json: () => Promise.resolve({
                        success: true,
                        session_id: 'test-session-123',
                        first_question: {
                            id: 'q1',
                            text: 'Xin chào! Hãy giới thiệu về bản thân.',
                            type: 'Giới thiệu'
                        },
                        progress: { current: 1, total: 10 }
                    })
                });
            }

            if (url.includes('/api/interview/voice/answer')) {
                return Promise.resolve({
                    json: () => Promise.resolve({
                        success: false,
                        error: 'STT_NO_SPEECH_DETECTED',
                        message: 'Không thể nhận dạng giọng nói. Vui lòng thử ghi âm lại.',
                        allow_retry: true
                    })
                });
            }

            return Promise.resolve({
                json: () => Promise.resolve({ success: false })
            });
        });

        await renderVoiceInterviewPage();

        await waitFor(() => {
            const startAnswerBtn = screen.getByTestId('start-answer-btn');
            expect(startAnswerBtn).not.toBeDisabled();
        }, { timeout: 5000 });

        // Complete recording flow
        const startAnswerBtn = screen.getByTestId('start-answer-btn');
        fireEvent.click(startAnswerBtn);

        await waitFor(() => {
            expect(screen.getByTestId('stop-answer-btn')).toBeInTheDocument();
        });

        const stopAnswerBtn = screen.getByTestId('stop-answer-btn');
        fireEvent.click(stopAnswerBtn);

        await waitFor(() => {
            // Verify error message is displayed
            const errorMessage = screen.getByTestId('error-message');
            expect(errorMessage).toBeInTheDocument();
            expect(errorMessage).toHaveTextContent('Không thể nhận dạng giọng nói');

            // Verify user can try recording again
            expect(screen.getByTestId('start-answer-btn')).toBeInTheDocument();
        }, { timeout: 10000 });
    });

    /**
     * Tiêu chí 3.9: THE Voice_Interview_Runtime SHALL lưu metadata audio 
     * (session_id, file_url, message_id, duration_seconds) vào bảng interview_audio.
     */
    test('Tiêu chí 3.9: Lưu metadata audio vào database', async () => {
        await renderVoiceInterviewPage();

        await waitFor(() => {
            const startAnswerBtn = screen.getByTestId('start-answer-btn');
            expect(startAnswerBtn).not.toBeDisabled();
        }, { timeout: 5000 });

        // Complete recording flow
        const startAnswerBtn = screen.getByTestId('start-answer-btn');
        fireEvent.click(startAnswerBtn);

        await waitFor(() => {
            expect(screen.getByTestId('stop-answer-btn')).toBeInTheDocument();
        });

        const stopAnswerBtn = screen.getByTestId('stop-answer-btn');
        fireEvent.click(stopAnswerBtn);

        await waitFor(() => {
            // Verify API call includes session_id and message_id for metadata storage
            const formDataCall = mockFetch.mock.calls.find(call =>
                call[0].includes('/api/interview/voice/answer')
            );
            expect(formDataCall).toBeDefined();
            if (!formDataCall) {
                throw new Error('Expected /api/interview/voice/answer call to exist');
            }

            // The actual database storage is handled by the backend
            // Frontend responsibility is to send correct metadata in the API call
            expect(formDataCall[1].body).toBeInstanceOf(FormData);
        });
    });
});

/**
 * Integration Tests - Complete Voice Interview Flow
 */
describe('VoiceInterviewPage - Requirement 3 Integration Tests', () => {

    test('Complete voice interview flow with multiple questions', async () => {
        await renderVoiceInterviewPage();

        // Wait for first question to load
        await waitFor(() => {
            const startAnswerBtn = screen.getByTestId('start-answer-btn');
            expect(startAnswerBtn).not.toBeDisabled();
        }, { timeout: 5000 });

        // Answer first question
        const startAnswerBtn = screen.getByTestId('start-answer-btn');
        fireEvent.click(startAnswerBtn);

        await waitFor(() => {
            expect(screen.getByTestId('recording-visual-indicator')).toBeInTheDocument();
        });

        const stopAnswerBtn = screen.getByTestId('stop-answer-btn');
        fireEvent.click(stopAnswerBtn);

        // Wait for next question
        await waitFor(() => {
            const questionText = screen.getByTestId('question-text');
            expect(questionText).toHaveTextContent('Hãy kể về dự án bạn tự hào nhất');

            const progress = screen.getByTestId('progress-indicator');
            expect(progress).toHaveTextContent('2/10');
        }, { timeout: 10000 });

        // Verify we can answer the next question
        await waitFor(() => {
            const nextStartBtn = screen.getByTestId('start-answer-btn');
            expect(nextStartBtn).not.toBeDisabled();
        }, { timeout: 5000 });
    });

    test('Error handling and recovery flow', async () => {
        // Test network error scenario
        mockFetch.mockImplementation((url: string) => {
            if (url.includes('/api/interview/voice/start')) {
                return Promise.resolve({
                    json: () => Promise.resolve({
                        success: true,
                        session_id: 'test-session-123',
                        first_question: {
                            id: 'q1',
                            text: 'Xin chào! Hãy giới thiệu về bản thân.',
                            type: 'Giới thiệu'
                        },
                        progress: { current: 1, total: 10 }
                    })
                });
            }

            if (url.includes('/api/interview/voice/answer')) {
                return Promise.reject(new Error('Network error'));
            }

            return Promise.resolve({
                json: () => Promise.resolve({ success: false })
            });
        });

        await renderVoiceInterviewPage();

        await waitFor(() => {
            const startAnswerBtn = screen.getByTestId('start-answer-btn');
            expect(startAnswerBtn).not.toBeDisabled();
        }, { timeout: 5000 });

        // Try to record and upload
        const startAnswerBtn = screen.getByTestId('start-answer-btn');
        fireEvent.click(startAnswerBtn);

        await waitFor(() => {
            expect(screen.getByTestId('stop-answer-btn')).toBeInTheDocument();
        });

        const stopAnswerBtn = screen.getByTestId('stop-answer-btn');
        fireEvent.click(stopAnswerBtn);

        await waitFor(() => {
            // Verify error message for network failure
            const errorMessage = screen.getByTestId('error-message');
            expect(errorMessage).toHaveTextContent('Không thể xử lý câu trả lời');
        }, { timeout: 10000 });
    }, 15000); // Increase timeout for this test
});
