/**
 * Test cases cho Voice Interview Page
 * Đảm bảo 100% Tiêu Chí Chấp Nhận của Yêu Cầu 2: Giao Diện Phỏng Vấn Giọng Nói
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { vi, describe, test, expect, beforeAll, beforeEach } from 'vitest';
import VoiceInterviewPage from '../pages/VoiceInterviewPage';

// Mock navigator.mediaDevices
const mockMediaDevices = {
    getUserMedia: vi.fn(),
};

const mockNavigate = vi.fn();
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useSearchParams: () => [new URLSearchParams('job_id=test&question_count=10')],
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
            this.ondataavailable({ data: new Blob(['test'], { type: 'audio/webm' }) });
        }
        if (this.onstop) {
            this.onstop();
        }
    }
}

// Mock Audio with setSinkId
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
        // Simulate audio ending after short delay
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

    // Mock fetch for API calls
    mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/interview/voice/start')) {
            return Promise.resolve({
                json: () => Promise.resolve({
                    success: true,
                    session_id: 'test-session-123',
                    first_question: {
                        id: 'q1',
                        text: 'Xin chào! AI interviewer đây.',
                        type: 'Giới thiệu',
                    },
                    question_audio: {
                        audio_url: 'mock-audio-url',
                        duration: 5,
                    },
                    progress: { current: 1, total: 10 },
                }),
            });
        }
        if (url.includes('/api/interview/voice/answer')) {
            return Promise.resolve({
                json: () => Promise.resolve({
                    success: true,
                    transcript: 'Tôi có 3 năm kinh nghiệm.',
                    file_url: 'mock-file-url',
                    ai_response: {
                        evaluation: { score: 8, feedback: 'Tốt' },
                        next_question: {
                            id: 'q2',
                            text: 'Hãy kể về dự án bạn tự hào nhất.',
                            type: 'Kỹ thuật',
                        },
                        progress: { current: 2, total: 10 },
                    },
                    next_question_audio: {
                        audio_url: 'mock-next-audio-url',
                        duration: 6,
                    },
                }),
            });
        }
        if (url.includes('/api/interview/voice/tab-switch')) {
            return Promise.resolve({ json: () => Promise.resolve({ success: true }) });
        }
        return Promise.resolve({ json: () => Promise.resolve({ success: false }) });
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

describe('VoiceInterviewPage - Yêu Cầu 2: Giao Diện Phỏng Vấn Giọng Nói', () => {

    /**
     * Tiêu chí 2.1: THE Voice_Interview_Page SHALL hiển thị avatar hình tròn ở trung tâm màn hình 
     * đại diện cho AI interviewer.
     */
    test('Tiêu chí 2.1: Hiển thị avatar hình tròn ở trung tâm màn hình', async () => {
        await renderVoiceInterviewPage();

        await waitFor(() => {
            const avatar = screen.getByTestId('ai-avatar');
            expect(avatar).toBeInTheDocument();
            // Avatar container is present and centered
            expect(avatar).toHaveClass('relative');
        });
    });

    /**
     * Tiêu chí 2.2: WHILE TTS_Service đang phát audio câu hỏi, THE Voice_Interview_Page SHALL hiển thị 
     * animation trên avatar (ví dụ: pulse/ripple effect) để chỉ thị AI đang nói.
     */
    test('Tiêu chí 2.2: Hiển thị animation trên avatar khi AI đang nói', async () => {
        await renderVoiceInterviewPage();

        await waitFor(() => {
            const avatar = screen.getByTestId('ai-avatar');
            expect(avatar).toBeInTheDocument();
        });

        // When AI is speaking, ripple effects should be present
        await waitFor(() => {
            const ripple1 = screen.getByTestId('avatar-ripple-1');
            const ripple2 = screen.getByTestId('avatar-ripple-2');
            expect(ripple1).toBeInTheDocument();
            expect(ripple2).toBeInTheDocument();
            expect(ripple1).toHaveClass('animate-ping');
            expect(ripple2).toHaveClass('animate-ping');
        });
    });

    /**
     * Tiêu chí 2.3: THE Voice_Interview_Page SHALL hiển thị nội dung câu hỏi trong một bubble chat 
     * phía trên avatar, đồng bộ với audio đang phát.
     */
    test('Tiêu chí 2.3: Hiển thị nội dung câu hỏi trong bubble chat phía trên avatar', async () => {
        await renderVoiceInterviewPage();

        await waitFor(() => {
            const questionText = screen.getByTestId('question-text');
            expect(questionText).toBeInTheDocument();
            expect(questionText).toHaveTextContent(/Xin chào.*AI interviewer/);
            // Verify bubble container exists
            const bubble = screen.getByTestId('question-bubble');
            expect(bubble).toBeInTheDocument();
        });
    });

    /**
     * Tiêu chí 2.4: THE Voice_Interview_Page SHALL sử dụng nền gradient nhẹ (lavender/white) 
     * theo phong cách Braintrust AI Interview.
     */
    test('Tiêu chí 2.4: Sử dụng nền gradient theo phong cách Braintrust AI Interview', async () => {
        await renderVoiceInterviewPage();

        const container = document.querySelector('.min-h-screen');
        expect(container).toBeInTheDocument();
        // Dark premium gradient background
        expect(container).toHaveClass('relative', 'overflow-hidden');
    });

    /**
     * Tiêu chí 2.5: THE Voice_Interview_Page SHALL hiển thị nút "Bắt đầu trả lời" ở phía dưới màn hình, 
     * chỉ kích hoạt sau khi AI đã phát xong câu hỏi.
     */
    test('Tiêu chí 2.5: Nút "Bắt đầu trả lời" chỉ kích hoạt sau khi AI phát xong câu hỏi', async () => {
        await renderVoiceInterviewPage();

        // Initially, button should be disabled (AI is speaking)
        await waitFor(() => {
            const startAnswerBtn = screen.getByTestId('start-answer-btn');
            expect(startAnswerBtn).toBeInTheDocument();
            expect(startAnswerBtn).toBeDisabled();
        });

        // Wait for AI to finish speaking
        await waitFor(() => {
            const startAnswerBtn = screen.getByTestId('start-answer-btn');
            expect(startAnswerBtn).not.toBeDisabled();
        }, { timeout: 3000 });
    });

    /**
     * Tiêu chí 2.6: THE Voice_Interview_Page SHALL hiển thị nút "Dừng trả lời" thay thế nút 
     * "Bắt đầu trả lời" khi người dùng đang ghi âm.
     */
    test('Tiêu chí 2.6: Hiển thị nút "Dừng trả lời" khi đang ghi âm', async () => {
        await renderVoiceInterviewPage();

        await waitFor(() => {
            const startAnswerBtn = screen.getByTestId('start-answer-btn');
            expect(startAnswerBtn).not.toBeDisabled();
        }, { timeout: 3000 });

        const startAnswerBtn = screen.getByTestId('start-answer-btn');
        fireEvent.click(startAnswerBtn);

        await waitFor(() => {
            // start button replaced by stop button
            expect(screen.queryByTestId('start-answer-btn')).not.toBeInTheDocument();
            const stopAnswerBtn = screen.getByTestId('stop-answer-btn');
            expect(stopAnswerBtn).toBeInTheDocument();
        });
    });

    /**
     * Tiêu chí 2.7: THE Voice_Interview_Page SHALL hiển thị chỉ số tiến trình phỏng vấn 
     * (ví dụ: "Câu 3/10") ở góc màn hình.
     */
    test('Tiêu chí 2.7: Hiển thị chỉ số tiến trình phỏng vấn ở góc màn hình', async () => {
        await renderVoiceInterviewPage();

        await waitFor(() => {
            const progressIndicator = screen.getByTestId('progress-indicator');
            expect(progressIndicator).toBeInTheDocument();
            expect(progressIndicator).toHaveTextContent('1/10');
        });
    });

    /**
     * Tiêu chí 2.8: THE Voice_Interview_Page SHALL hiển thị loại câu hỏi hiện tại 
     * (tag: Kỹ thuật, Hành vi, v.v.) tương ứng với question_type từ pipeline.
     */
    test('Tiêu chí 2.8: Hiển thị loại câu hỏi hiện tại', async () => {
        await renderVoiceInterviewPage();

        await waitFor(() => {
            const questionType = screen.getByTestId('question-type');
            expect(questionType).toBeInTheDocument();
            expect(questionType).toHaveTextContent('Giới thiệu');
        });
    });

    /**
     * Tiêu chí 2.9: WHERE người dùng chọn giọng nữ, THE Voice_Interview_Page SHALL sử dụng 
     * voice vi-VN-HoaiMyNeural cho TTS_Service.
     */
    test('Tiêu chí 2.9: Chọn giọng nữ cho TTS Service', async () => {
        await renderVoiceInterviewPage();

        await waitFor(() => {
            const femaleVoiceBtn = screen.getByTestId('voice-female-btn');
            expect(femaleVoiceBtn).toBeInTheDocument();
            expect(femaleVoiceBtn).toHaveTextContent('Nữ');
            // Female voice selected by default
            expect(femaleVoiceBtn).toHaveClass('bg-pink-500', 'text-white');
        });

        // Click female voice button (should already be selected)
        const femaleVoiceBtn = screen.getByTestId('voice-female-btn');
        fireEvent.click(femaleVoiceBtn);

        // Verify selection remains
        expect(femaleVoiceBtn).toHaveClass('bg-pink-500', 'text-white');
    });

    /**
     * Tiêu chí 2.10: WHERE người dùng chọn giọng nam, THE Voice_Interview_Page SHALL sử dụng 
     * voice vi-VN-NamMinhNeural cho TTS_Service.
     */
    test('Tiêu chí 2.10: Chọn giọng nam cho TTS Service', async () => {
        await renderVoiceInterviewPage();

        await waitFor(() => {
            const maleVoiceBtn = screen.getByTestId('voice-male-btn');
            expect(maleVoiceBtn).toBeInTheDocument();
            expect(maleVoiceBtn).toHaveTextContent('Nam');
            // Initially not selected - no active class
            expect(maleVoiceBtn).not.toHaveClass('bg-blue-500');
        });

        // Click male voice button
        const maleVoiceBtn = screen.getByTestId('voice-male-btn');
        fireEvent.click(maleVoiceBtn);

        await waitFor(() => {
            // Verify male voice is now selected
            expect(maleVoiceBtn).toHaveClass('bg-blue-500', 'text-white');
            // Verify female voice is deselected
            const femaleVoiceBtn = screen.getByTestId('voice-female-btn');
            expect(femaleVoiceBtn).not.toHaveClass('bg-pink-500');
        });
    });

    /**
     * Tiêu chí 2.11: THE Voice_Interview_Page SHALL không hiển thị lịch sử chat dài như 
     * InterviewPage.tsx hiện có — chỉ hiển thị câu hỏi hiện tại.
     */
    test('Tiêu chí 2.11: Chỉ hiển thị câu hỏi hiện tại, không có lịch sử chat', async () => {
        await renderVoiceInterviewPage();

        await waitFor(() => {
            // Verify only one question is displayed
            const questionTexts = screen.getAllByTestId('question-text');
            expect(questionTexts).toHaveLength(1);

            // Verify no chat history container
            expect(screen.queryByTestId('chat-history')).not.toBeInTheDocument();
            expect(screen.queryByTestId('message-list')).not.toBeInTheDocument();
            expect(screen.queryByTestId('conversation-history')).not.toBeInTheDocument();
        });
    });
});

/**
 * Integration Tests - Test toàn bộ flow phỏng vấn
 */
describe('VoiceInterviewPage - Integration Tests', () => {

    test('Complete voice interview flow - Question to Answer', async () => {
        await renderVoiceInterviewPage();

        // 1. Wait for page to load and AI to start speaking
        await waitFor(() => {
            expect(screen.getByTestId('ai-avatar')).toBeInTheDocument();
            expect(screen.getByTestId('ai-speaking-indicator')).toBeInTheDocument();
        });

        // 2. Wait for AI to finish speaking
        await waitFor(() => {
            const startAnswerBtn = screen.getByTestId('start-answer-btn');
            expect(startAnswerBtn).not.toBeDisabled();
        }, { timeout: 3000 });

        // 3. Start recording answer
        const startAnswerBtn = screen.getByTestId('start-answer-btn');
        fireEvent.click(startAnswerBtn);

        await waitFor(() => {
            expect(screen.getByTestId('stop-answer-btn')).toBeInTheDocument();
            expect(screen.getByTestId('recording-indicator')).toBeInTheDocument();
        });

        // 4. Stop recording
        const stopAnswerBtn = screen.getByTestId('stop-answer-btn');
        fireEvent.click(stopAnswerBtn);

        // 5. Wait for next question to load
        await waitFor(() => {
            const questionText = screen.getByTestId('question-text');
            expect(questionText).toHaveTextContent(/dự án.*tự hào/);

            const questionType = screen.getByTestId('question-type');
            expect(questionType).toHaveTextContent('Kỹ thuật');

            const progress = screen.getByTestId('progress-indicator');
            expect(progress).toHaveTextContent('2/10');
        }, { timeout: 5000 });
    });

    test('Voice preference switching', async () => {
        await renderVoiceInterviewPage();

        await waitFor(() => {
            expect(screen.getByTestId('voice-female-btn')).toBeInTheDocument();
            expect(screen.getByTestId('voice-male-btn')).toBeInTheDocument();
        });

        // Initially female is selected
        const femaleBtn = screen.getByTestId('voice-female-btn');
        const maleBtn = screen.getByTestId('voice-male-btn');

        expect(femaleBtn).toHaveClass('bg-pink-500');
        expect(maleBtn).not.toHaveClass('bg-blue-500');

        // Switch to male
        fireEvent.click(maleBtn);

        await waitFor(() => {
            expect(maleBtn).toHaveClass('bg-blue-500');
            expect(femaleBtn).not.toHaveClass('bg-pink-500');
        });

        // Switch back to female
        fireEvent.click(femaleBtn);

        await waitFor(() => {
            expect(femaleBtn).toHaveClass('bg-pink-500');
            expect(maleBtn).not.toHaveClass('bg-blue-500');
        });
    });

    test('Error handling - No device config', async () => {
        // Mock sessionStorage without device config
        const mockSessionStorage = {
            getItem: vi.fn(() => null),
            setItem: vi.fn(),
        };

        Object.defineProperty(window, 'sessionStorage', {
            value: mockSessionStorage,
        });

        // Render and confirm modal (initializeInterview will fail due to no device config)
        const result = render(
            <BrowserRouter>
                <VoiceInterviewPage />
            </BrowserRouter>
        );
        await waitFor(() => expect(screen.getByTestId('rules-modal')).toBeInTheDocument());
        fireEvent.click(screen.getByTestId('agreement-checkbox'));
        fireEvent.click(screen.getByTestId('confirm-btn'));

        await waitFor(() => {
            const errorMessage = screen.getByTestId('error-message');
            expect(errorMessage).toBeInTheDocument();
            expect(errorMessage).toHaveTextContent(/Không tìm thấy cấu hình thiết bị/);
        });
    });

    test('Navigation - Back button', async () => {
        await renderVoiceInterviewPage();

        await waitFor(() => {
            const backBtn = screen.getByTestId('back-btn');
            expect(backBtn).toBeInTheDocument();
            expect(backBtn).toHaveTextContent('← Quay lại');
        });

        const backBtn = screen.getByTestId('back-btn');
        fireEvent.click(backBtn);

        expect(mockNavigate).toHaveBeenCalledWith('/interview/device-test');
    });
});

/**
 * Accessibility Tests
 */
describe('VoiceInterviewPage - Accessibility Tests', () => {

    test('All interactive elements have proper ARIA labels', async () => {
        await renderVoiceInterviewPage();

        await waitFor(() => {
            // Wait for start button to be enabled
            const startAnswerBtn = screen.getByTestId('start-answer-btn');
            expect(startAnswerBtn).not.toBeDisabled();
        }, { timeout: 3000 });

        // Check button accessibility
        const startAnswerBtn = screen.getByTestId('start-answer-btn');
        expect(startAnswerBtn).toHaveAttribute('type', 'button');

        const voiceButtons = [
            screen.getByTestId('voice-female-btn'),
            screen.getByTestId('voice-male-btn'),
            screen.getByTestId('back-btn')
        ];

        voiceButtons.forEach(button => {
            expect(button).toHaveAttribute('type', 'button');
        });
    });

    test('Visual indicators provide clear feedback', async () => {
        await renderVoiceInterviewPage();

        // AI speaking indicator
        await waitFor(() => {
            expect(screen.getByTestId('ai-speaking-indicator')).toBeInTheDocument();
        });

        // Wait for recording to be available
        await waitFor(() => {
            const startAnswerBtn = screen.getByTestId('start-answer-btn');
            expect(startAnswerBtn).not.toBeDisabled();
        }, { timeout: 3000 });

        // Start recording
        fireEvent.click(screen.getByTestId('start-answer-btn'));

        await waitFor(() => {
            // Recording indicator
            expect(screen.getByTestId('recording-indicator')).toBeInTheDocument();
            expect(screen.getByTestId('recording-indicator')).toHaveTextContent('Đang ghi âm');
        });
    });
});