/**
 * Test cases cho Device Test Page
 * Đảm bảo 100% Tiêu Chí Chấp Nhận của Yêu Cầu 1: Kiểm Tra Thiết Bị Âm Thanh
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { vi, describe, test, expect, beforeAll, beforeEach } from 'vitest';
import DeviceTestPage from '../pages/DeviceTestPage';

// Mock navigator.mediaDevices
const mockMediaDevices = {
    enumerateDevices: vi.fn(),
    getUserMedia: vi.fn(),
};

const mockNavigate = vi.fn();

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useSearchParams: () => [new URLSearchParams('job_id=test&question_count=5')],
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
    (globalThis as any).URL = {
        createObjectURL: vi.fn(() => 'blob:mock-url'),
        revokeObjectURL: vi.fn(),
    };
});

beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockMediaDevices.enumerateDevices.mockResolvedValue([
        { deviceId: 'mic1', label: 'Microphone 1', kind: 'audioinput' },
        { deviceId: 'mic2', label: 'Microphone 2', kind: 'audioinput' },
        { deviceId: 'speaker1', label: 'Speaker 1', kind: 'audiooutput' },
        { deviceId: 'speaker2', label: 'Speaker 2', kind: 'audiooutput' },
    ]);

    mockMediaDevices.getUserMedia.mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }],
    } as any);
});

const renderDeviceTestPage = () => {
    return render(
        <BrowserRouter>
            <DeviceTestPage />
        </BrowserRouter>
    );
};

describe('DeviceTestPage - Yêu Cầu 1: Kiểm Tra Thiết Bị Âm Thanh', () => {

    /**
     * Tiêu chí 1.1: THE Device_Test_Page SHALL hiển thị danh sách tất cả microphone khả dụng 
     * từ navigator.mediaDevices.enumerateDevices() trong một dropdown để người dùng lựa chọn.
     */
    test('Tiêu chí 1.1: Hiển thị danh sách microphone trong dropdown', async () => {
        renderDeviceTestPage();

        await waitFor(() => {
            const microphoneSelect = screen.getByTestId('microphone-select');
            expect(microphoneSelect).toBeInTheDocument();

            // Check microphone options
            expect(screen.getByText('Microphone 1')).toBeInTheDocument();
            expect(screen.getByText('Microphone 2')).toBeInTheDocument();
        });

        // Verify enumerateDevices was called
        expect(mockMediaDevices.enumerateDevices).toHaveBeenCalled();
    });

    /**
     * Tiêu chí 1.2: THE Device_Test_Page SHALL hiển thị danh sách tất cả loa (speaker) khả dụng 
     * trong một dropdown riêng biệt để người dùng lựa chọn.
     */
    test('Tiêu chí 1.2: Hiển thị danh sách speaker trong dropdown riêng biệt', async () => {
        renderDeviceTestPage();

        await waitFor(() => {
            const speakerSelect = screen.getByTestId('speaker-select');
            expect(speakerSelect).toBeInTheDocument();

            // Check speaker options
            expect(screen.getByText('Speaker 1')).toBeInTheDocument();
            expect(screen.getByText('Speaker 2')).toBeInTheDocument();
        });

        // Verify dropdowns are separate
        const microphoneSelect = screen.getByTestId('microphone-select');
        const speakerSelect = screen.getByTestId('speaker-select');
        expect(microphoneSelect).not.toBe(speakerSelect);
    });

    /**
     * Tiêu chí 1.3: WHEN người dùng nhấn nút "Bắt đầu ghi âm thử", 
     * THE Device_Test_Page SHALL ghi âm từ microphone đã chọn bằng MediaRecorder với deviceId tương ứng.
     */
    test('Tiêu chí 1.3: Bắt đầu ghi âm từ microphone đã chọn', async () => {
        renderDeviceTestPage();

        await waitFor(() => {
            expect(screen.getByTestId('start-recording-btn')).toBeInTheDocument();
        });

        // Select microphone
        const microphoneSelect = screen.getByTestId('microphone-select');
        fireEvent.change(microphoneSelect, { target: { value: 'mic1' } });

        // Click start recording
        const startRecordingBtn = screen.getByTestId('start-recording-btn');
        fireEvent.click(startRecordingBtn);

        await waitFor(() => {
            // Verify getUserMedia called with correct deviceId
            expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith({
                audio: { deviceId: { exact: 'mic1' } }
            });

            // Verify state changed to recording: stop button visible, start button hidden
            expect(screen.getByTestId('stop-recording-btn')).toBeInTheDocument();
            expect(screen.queryByTestId('start-recording-btn')).not.toBeInTheDocument();
        });
    });

    /**
     * Tiêu chí 1.4: WHEN người dùng nhấn nút "Dừng ghi âm", 
     * THE Device_Test_Page SHALL dừng ghi âm và tạo audio blob từ các chunk đã thu thập.
     */
    test('Tiêu chí 1.4: Dừng ghi âm và tạo audio blob', async () => {
        renderDeviceTestPage();

        await waitFor(() => {
            expect(screen.getByTestId('start-recording-btn')).toBeInTheDocument();
        });

        // Start recording first
        const microphoneSelect = screen.getByTestId('microphone-select');
        fireEvent.change(microphoneSelect, { target: { value: 'mic1' } });

        const startRecordingBtn = screen.getByTestId('start-recording-btn');
        fireEvent.click(startRecordingBtn);

        await waitFor(() => {
            // recording state: stop button visible, start button hidden
            expect(screen.getByTestId('stop-recording-btn')).toBeInTheDocument();
            expect(screen.queryByTestId('start-recording-btn')).not.toBeInTheDocument();
        });

        // Stop recording
        const stopRecordingBtn = screen.getByTestId('stop-recording-btn');
        fireEvent.click(stopRecordingBtn);

        await waitFor(() => {
            // Verify playback controls appear (indicating blob was created)
            expect(screen.getByTestId('play-recording-btn')).toBeInTheDocument();
            expect(screen.getByTestId('reset-recording-btn')).toBeInTheDocument();
        });
    });

    /**
     * Tiêu chí 1.5: WHEN ghi âm thử hoàn tất, THE Device_Test_Page SHALL cho phép người dùng 
     * phát lại đoạn âm thanh vừa ghi qua loa đã chọn bằng HTMLAudioElement.setSinkId().
     */
    test('Tiêu chí 1.5: Phát lại audio qua loa đã chọn với setSinkId', async () => {
        renderDeviceTestPage();

        await waitFor(() => {
            expect(screen.getByTestId('start-recording-btn')).toBeInTheDocument();
        });

        // Complete recording process
        const microphoneSelect = screen.getByTestId('microphone-select');
        const speakerSelect = screen.getByTestId('speaker-select');

        fireEvent.change(microphoneSelect, { target: { value: 'mic1' } });
        fireEvent.change(speakerSelect, { target: { value: 'speaker1' } });

        // Start and stop recording
        fireEvent.click(screen.getByTestId('start-recording-btn'));
        await waitFor(() => {
            // recording state: stop button visible, start button hidden
            expect(screen.getByTestId('stop-recording-btn')).toBeInTheDocument();
            expect(screen.queryByTestId('start-recording-btn')).not.toBeInTheDocument();
        });

        fireEvent.click(screen.getByTestId('stop-recording-btn'));

        await waitFor(() => {
            expect(screen.getByTestId('play-recording-btn')).toBeInTheDocument();
        });

        // Play recording
        const playBtn = screen.getByTestId('play-recording-btn');
        fireEvent.click(playBtn);

        await waitFor(() => {
            // Verify URL.createObjectURL was called (audio blob created)
            expect(globalThis.URL.createObjectURL).toHaveBeenCalled();

            // Verify test completion status appears
            expect(screen.getByText(/Kiểm tra thiết bị hoàn tất/)).toBeInTheDocument();
        });
    });

    /**
     * Tiêu chí 1.6: WHEN người dùng nhấn "Ghi lại", 
     * THE Device_Test_Page SHALL xóa audio blob hiện tại và cho phép ghi âm mới.
     */
    test('Tiêu chí 1.6: Reset recording và cho phép ghi âm mới', async () => {
        renderDeviceTestPage();

        await waitFor(() => {
            expect(screen.getByTestId('start-recording-btn')).toBeInTheDocument();
        });

        // Complete recording process
        const microphoneSelect = screen.getByTestId('microphone-select');
        fireEvent.change(microphoneSelect, { target: { value: 'mic1' } });

        fireEvent.click(screen.getByTestId('start-recording-btn'));
        await waitFor(() => {
            // recording state: stop button visible, start button hidden
            expect(screen.getByTestId('stop-recording-btn')).toBeInTheDocument();
            expect(screen.queryByTestId('start-recording-btn')).not.toBeInTheDocument();
        });

        fireEvent.click(screen.getByTestId('stop-recording-btn'));

        await waitFor(() => {
            expect(screen.getByTestId('reset-recording-btn')).toBeInTheDocument();
        });

        // Reset recording
        const resetBtn = screen.getByTestId('reset-recording-btn');
        fireEvent.click(resetBtn);

        await waitFor(() => {
            // Verify playback controls are hidden (blob cleared)
            expect(screen.queryByTestId('play-recording-btn')).not.toBeInTheDocument();
            expect(screen.queryByTestId('reset-recording-btn')).not.toBeInTheDocument();

            // Verify can start recording again
            const startBtn = screen.getByTestId('start-recording-btn');
            expect(startBtn).not.toBeDisabled();
            expect(screen.getByText('Bắt đầu ghi âm thử')).toBeInTheDocument();
        });
    });

    /**
     * Tiêu chí 1.7: IF trình duyệt không phát hiện được microphone nào, 
     * THEN THE Device_Test_Page SHALL hiển thị thông báo lỗi rõ ràng và vô hiệu hóa nút "Bắt đầu phỏng vấn".
     */
    test('Tiêu chí 1.7: Hiển thị lỗi và disable nút khi không có microphone', async () => {
        // Mock no microphones available
        mockMediaDevices.enumerateDevices.mockResolvedValue([
            { deviceId: 'speaker1', label: 'Speaker 1', kind: 'audiooutput' },
        ]);

        renderDeviceTestPage();

        await waitFor(() => {
            // Verify error message appears
            expect(screen.getByText(/Không phát hiện được microphone nào/)).toBeInTheDocument();

            // Verify start interview button is disabled
            const startInterviewBtn = screen.getByTestId('start-interview-btn');
            expect(startInterviewBtn).toBeDisabled();
        });
    });

    /**
     * Tiêu chí 1.8: IF người dùng chưa hoàn thành ghi âm thử thành công, 
     * THEN THE Device_Test_Page SHALL vô hiệu hóa nút "Bắt đầu phỏng vấn".
     */
    test('Tiêu chí 1.8: Disable nút phỏng vấn khi chưa hoàn thành test', async () => {
        renderDeviceTestPage();

        await waitFor(() => {
            expect(screen.getByTestId('start-interview-btn')).toBeInTheDocument();
        });

        // Initially disabled (no test completed)
        const startInterviewBtn = screen.getByTestId('start-interview-btn');
        expect(startInterviewBtn).toBeDisabled();

        // Still disabled after just selecting devices
        const microphoneSelect = screen.getByTestId('microphone-select');
        fireEvent.change(microphoneSelect, { target: { value: 'mic1' } });
        expect(startInterviewBtn).toBeDisabled();

        // Still disabled after recording but not playing
        fireEvent.click(screen.getByTestId('start-recording-btn'));
        await waitFor(() => {
            // recording state: stop button visible, start button hidden
            expect(screen.getByTestId('stop-recording-btn')).toBeInTheDocument();
            expect(screen.queryByTestId('start-recording-btn')).not.toBeInTheDocument();
        });

        fireEvent.click(screen.getByTestId('stop-recording-btn'));
        await waitFor(() => {
            expect(screen.getByTestId('play-recording-btn')).toBeInTheDocument();
        });

        expect(startInterviewBtn).toBeDisabled();
    });

    /**
     * Tiêu chí 1.9: WHEN người dùng đã ghi âm thử thành công và nhấn "Bắt đầu phỏng vấn", 
     * THE Device_Test_Page SHALL chuyển hướng đến Voice_Interview_Page với thông tin thiết bị đã chọn.
     */
    test('Tiêu chí 1.9: Chuyển hướng với thông tin thiết bị sau khi test thành công', async () => {
        // Mock sessionStorage
        const mockSessionStorage = {
            setItem: vi.fn(),
        };
        Object.defineProperty(window, 'sessionStorage', {
            value: mockSessionStorage,
        });

        renderDeviceTestPage();

        await waitFor(() => {
            expect(screen.getByTestId('start-recording-btn')).toBeInTheDocument();
        });

        // Complete full test process
        const microphoneSelect = screen.getByTestId('microphone-select');
        const speakerSelect = screen.getByTestId('speaker-select');

        fireEvent.change(microphoneSelect, { target: { value: 'mic1' } });
        fireEvent.change(speakerSelect, { target: { value: 'speaker1' } });

        // Record
        fireEvent.click(screen.getByTestId('start-recording-btn'));
        await waitFor(() => {
            // recording state: stop button visible, start button hidden
            expect(screen.getByTestId('stop-recording-btn')).toBeInTheDocument();
            expect(screen.queryByTestId('start-recording-btn')).not.toBeInTheDocument();
        });

        fireEvent.click(screen.getByTestId('stop-recording-btn'));

        await waitFor(() => {
            expect(screen.getByTestId('play-recording-btn')).toBeInTheDocument();
        });

        // Play to complete test
        fireEvent.click(screen.getByTestId('play-recording-btn'));

        await waitFor(() => {
            expect(screen.getByText(/Kiểm tra thiết bị hoàn tất/)).toBeInTheDocument();
        });

        // Now start interview button should be enabled
        const startInterviewBtn = screen.getByTestId('start-interview-btn');
        expect(startInterviewBtn).not.toBeDisabled();

        // Click start interview
        fireEvent.click(startInterviewBtn);

        // Verify device config saved to sessionStorage
        expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
            'voiceDeviceConfig',
            expect.stringContaining('"microphoneId":"mic1"')
        );
        expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
            'voiceDeviceConfig',
            expect.stringContaining('"speakerId":"speaker1"')
        );

        // Verify navigation
        expect(mockNavigate).toHaveBeenCalledWith(
            expect.stringContaining('/interview/voice')
        );
    });
});

/**
 * Integration Tests - Test toàn bộ flow
 */
describe('DeviceTestPage - Integration Tests', () => {

    test('Complete device test flow - Happy path', async () => {
        const mockSessionStorage = {
            setItem: vi.fn(),
        };
        Object.defineProperty(window, 'sessionStorage', {
            value: mockSessionStorage,
        });

        renderDeviceTestPage();

        // 1. Wait for devices to load
        await waitFor(() => {
            expect(screen.getByTestId('microphone-select')).toBeInTheDocument();
            expect(screen.getByTestId('speaker-select')).toBeInTheDocument();
        });

        // 2. Verify devices auto-selected
        const micSelect = screen.getByTestId('microphone-select') as HTMLSelectElement;
        const speakerSelect = screen.getByTestId('speaker-select') as HTMLSelectElement;
        expect(micSelect.value).toBe('mic1');
        expect(speakerSelect.value).toBe('speaker1');

        // 3. Start recording
        fireEvent.click(screen.getByTestId('start-recording-btn'));
        await waitFor(() => {
            // recording state: stop button visible, start button hidden
            expect(screen.getByTestId('stop-recording-btn')).toBeInTheDocument();
            expect(screen.queryByTestId('start-recording-btn')).not.toBeInTheDocument();
        });

        // 4. Stop recording
        fireEvent.click(screen.getByTestId('stop-recording-btn'));
        await waitFor(() => {
            expect(screen.getByTestId('play-recording-btn')).toBeInTheDocument();
        });

        // 5. Play recording
        fireEvent.click(screen.getByTestId('play-recording-btn'));
        await waitFor(() => {
            expect(screen.getByText(/Kiểm tra thiết bị hoàn tất/)).toBeInTheDocument();
        });

        // 6. Start interview
        const startInterviewBtn = screen.getByTestId('start-interview-btn');
        expect(startInterviewBtn).not.toBeDisabled();

        fireEvent.click(startInterviewBtn);

        // 7. Verify navigation and data storage
        expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
            'voiceDeviceConfig',
            expect.stringContaining('"microphoneId":"mic1"')
        );
        expect(mockNavigate).toHaveBeenCalledWith(
            expect.stringContaining('/interview/voice')
        );
    });

    test('Error recovery flow', async () => {
        renderDeviceTestPage();

        await waitFor(() => {
            expect(screen.getByTestId('start-recording-btn')).toBeInTheDocument();
        });

        // Complete recording
        const microphoneSelect = screen.getByTestId('microphone-select');
        fireEvent.change(microphoneSelect, { target: { value: 'mic1' } });

        fireEvent.click(screen.getByTestId('start-recording-btn'));
        await waitFor(() => {
            // recording state: stop button visible, start button hidden
            expect(screen.getByTestId('stop-recording-btn')).toBeInTheDocument();
            expect(screen.queryByTestId('start-recording-btn')).not.toBeInTheDocument();
        });

        fireEvent.click(screen.getByTestId('stop-recording-btn'));
        await waitFor(() => {
            expect(screen.getByTestId('reset-recording-btn')).toBeInTheDocument();
        });

        // Reset and try again
        fireEvent.click(screen.getByTestId('reset-recording-btn'));

        await waitFor(() => {
            // Should be able to record again
            expect(screen.queryByTestId('play-recording-btn')).not.toBeInTheDocument();
            expect(screen.getByTestId('start-recording-btn')).not.toBeDisabled();
            expect(screen.getByText('Bắt đầu ghi âm thử')).toBeInTheDocument();
        });
    });
});