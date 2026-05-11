import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// State machine cho recording flow
type RecordingState = 'idle' | 'recording' | 'recorded';

// Types cho Device Test Page
interface AudioDeviceConfig {
    microphoneId: string;
    speakerId: string;
    testRecordingBlob?: Blob;
}

interface DeviceInfo {
    deviceId: string;
    label: string;
    kind: MediaDeviceKind;
}

const DeviceTestPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // State management
    const [availableMicrophones, setAvailableMicrophones] = useState<DeviceInfo[]>([]);
    const [availableSpeakers, setAvailableSpeakers] = useState<DeviceInfo[]>([]);
    const [selectedMicId, setSelectedMicId] = useState<string>('');
    const [selectedSpeakerId, setSelectedSpeakerId] = useState<string>('');
    const [recordingState, setRecordingState] = useState<RecordingState>('idle');
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [testCompleted, setTestCompleted] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [hasPermission, setHasPermission] = useState(false);

    // Derived state for backward compat
    const isRecording = recordingState === 'recording';

    // Refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioStreamRef = useRef<MediaStream | null>(null);
    const audioElementRef = useRef<HTMLAudioElement | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    // Get interview parameters from URL
    const jobId = searchParams.get('job_id');
    const questionCount = searchParams.get('question_count');
    const jdId = searchParams.get('jd_id');
    const levelSlug = searchParams.get('level_slug');

    useEffect(() => {
        initializeDevices();
        return () => {
            // Cleanup
            if (audioStreamRef.current) {
                audioStreamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    /**
     * Tiêu chí 1.1: THE Device_Test_Page SHALL hiển thị danh sách tất cả microphone khả dụng 
     * từ navigator.mediaDevices.enumerateDevices() trong một dropdown để người dùng lựa chọn.
     * 
     * Tiêu chí 1.2: THE Device_Test_Page SHALL hiển thị danh sách tất cả loa (speaker) khả dụng 
     * trong một dropdown riêng biệt để người dùng lựa chọn.
     */
    const initializeDevices = async () => {
        try {
            // Request permission first
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setHasPermission(true);
            stream.getTracks().forEach(track => track.stop()); // Stop immediately after permission

            // Enumerate devices
            const devices = await navigator.mediaDevices.enumerateDevices();

            const microphones = devices
                .filter(device => device.kind === 'audioinput')
                .map(device => ({
                    deviceId: device.deviceId,
                    label: device.label || `Microphone ${device.deviceId.slice(0, 8)}`,
                    kind: device.kind
                }));

            const speakers = devices
                .filter(device => device.kind === 'audiooutput')
                .map(device => ({
                    deviceId: device.deviceId,
                    label: device.label || `Speaker ${device.deviceId.slice(0, 8)}`,
                    kind: device.kind
                }));

            setAvailableMicrophones(microphones);
            setAvailableSpeakers(speakers);

            // Auto-select first devices if available
            if (microphones.length > 0) {
                setSelectedMicId(microphones[0].deviceId);
            }
            if (speakers.length > 0) {
                setSelectedSpeakerId(speakers[0].deviceId);
            }

            // Tiêu chí 1.7: IF trình duyệt không phát hiện được microphone nào, 
            // THEN THE Device_Test_Page SHALL hiển thị thông báo lỗi rõ ràng và vô hiệu hóa nút "Bắt đầu phỏng vấn".
            if (microphones.length === 0) {
                setErrorMessage('Không phát hiện được microphone nào. Vui lòng kết nối microphone và làm mới trang.');
            }

        } catch (error) {
            console.error('Error accessing media devices:', error);
            setErrorMessage('Không thể truy cập thiết bị âm thanh. Vui lòng cho phép quyền truy cập microphone.');
            setHasPermission(false);
        }
    };

    /**
     * Tiêu chí 1.3: WHEN người dùng nhấn nút "Bắt đầu ghi âm thử", 
     * THE Device_Test_Page SHALL ghi âm từ microphone đã chọn bằng MediaRecorder với deviceId tương ứng.
     */
    const startRecording = async () => {
        try {
            setErrorMessage('');

            // Get audio stream from selected microphone
            const constraints: MediaStreamConstraints = {
                audio: {
                    deviceId: selectedMicId ? { exact: selectedMicId } : undefined
                }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            audioStreamRef.current = stream;

            // Create MediaRecorder
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                // Tiêu chí 1.4: WHEN người dùng nhấn nút "Dừng ghi âm", 
                // THE Device_Test_Page SHALL dừng ghi âm và tạo audio blob từ các chunk đã thu thập.
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setRecordedBlob(audioBlob);
                setRecordingState('recorded'); // → state = recorded, ẩn start/stop, hiện replay/retry

                // Stop stream
                if (audioStreamRef.current) {
                    audioStreamRef.current.getTracks().forEach(track => track.stop());
                    audioStreamRef.current = null;
                }
            };

            mediaRecorder.start();
            setRecordingState('recording');

        } catch (error) {
            console.error('Error starting recording:', error);
            setErrorMessage('Không thể bắt đầu ghi âm. Vui lòng kiểm tra microphone.');
        }
    };

    /**
     * Tiêu chí 1.4: WHEN người dùng nhấn nút "Dừng ghi âm", 
     * THE Device_Test_Page SHALL dừng ghi âm và tạo audio blob từ các chunk đã thu thập.
     */
    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            // state sẽ được set sang 'recorded' trong onstop handler
        }
    };

    /**
     * Tiêu chí 1.5: WHEN ghi âm thử hoàn tất, THE Device_Test_Page SHALL cho phép người dùng 
     * phát lại đoạn âm thanh vừa ghi qua loa đã chọn bằng HTMLAudioElement.setSinkId().
     */
    const playRecording = async () => {
        if (!recordedBlob) return;

        try {
            setErrorMessage('');

            const audioUrl = URL.createObjectURL(recordedBlob);
            const audio = new Audio(audioUrl);
            audioElementRef.current = audio;

            // Set speaker if supported
            if ('setSinkId' in audio && selectedSpeakerId) {
                await (audio as any).setSinkId(selectedSpeakerId);
            }

            audio.onplay = () => setIsPlaying(true);
            audio.onended = () => {
                setIsPlaying(false);
                setTestCompleted(true); // Mark test as completed after successful playback
                URL.revokeObjectURL(audioUrl);
            };
            audio.onerror = () => {
                setIsPlaying(false);
                setErrorMessage('Không thể phát audio. Vui lòng thử lại.');
                URL.revokeObjectURL(audioUrl);
            };

            await audio.play();

        } catch (error) {
            console.error('Error playing recording:', error);
            setErrorMessage('Không thể phát audio qua loa đã chọn.');
        }
    };

    /**
     * Tiêu chí 1.6: WHEN người dùng nhấn "Ghi lại", 
     * THE Device_Test_Page SHALL xóa audio blob hiện tại và cho phép ghi âm mới.
     */
    const resetRecording = () => {
        setRecordedBlob(null);
        setTestCompleted(false);
        setRecordingState('idle'); // → reset audio, state = idle
        audioChunksRef.current = [];

        if (audioElementRef.current) {
            audioElementRef.current.pause();
            audioElementRef.current = null;
        }

        setIsPlaying(false);
    };

    /**
     * Tiêu chí 1.9: WHEN người dùng đã ghi âm thử thành công và nhấn "Bắt đầu phỏng vấn", 
     * THE Device_Test_Page SHALL chuyển hướng đến Voice_Interview_Page với thông tin thiết bị đã chọn.
     */
    const startVoiceInterview = async () => {
        const deviceConfig: AudioDeviceConfig = {
            microphoneId: selectedMicId,
            speakerId: selectedSpeakerId,
            testRecordingBlob: recordedBlob || undefined
        };

        // Store device config in sessionStorage for Voice Interview Page
        sessionStorage.setItem('voiceDeviceConfig', JSON.stringify(deviceConfig));

        // Request fullscreen trước khi navigate
        try {
            const el = document.documentElement;
            if (el.requestFullscreen) {
                await el.requestFullscreen();
            } else if ((el as any).webkitRequestFullscreen) {
                await (el as any).webkitRequestFullscreen();
            }
        } catch {
            // Fullscreen bị từ chối (e.g. iframe) — không block navigation
        }

        // Ưu tiên URL params, fallback về sessionStorage.voiceInterviewParams
        // (InterviewSelectionPage lưu params vào sessionStorage khi chọn voice mode)
        let resolvedJobId = jobId;
        let resolvedQuestionCount = questionCount;
        let resolvedJdId = jdId;
        let resolvedLevelSlug = levelSlug;
        let resolvedSkillGapAnalysisId: string | null = null;

        if (!resolvedJobId) {
            try {
                const stored = sessionStorage.getItem('voiceInterviewParams');
                if (stored) {
                    const p = JSON.parse(stored);
                    resolvedJobId = p.job_id || null;
                    resolvedQuestionCount = p.question_count ? String(p.question_count) : null;
                    resolvedJdId = p.jd_id ? String(p.jd_id) : null;
                    resolvedLevelSlug = p.level_slug || null;
                    resolvedSkillGapAnalysisId = p.skill_gap_analysis_id ? String(p.skill_gap_analysis_id) : null;
                }
            } catch {
                // non-blocking
            }
        }

        // Navigate to Voice Interview Page with parameters
        const params = new URLSearchParams();
        if (resolvedJobId) params.set('job_id', resolvedJobId);
        if (resolvedQuestionCount) params.set('question_count', resolvedQuestionCount);
        if (resolvedJdId) params.set('jd_id', resolvedJdId);
        if (resolvedLevelSlug) params.set('level_slug', resolvedLevelSlug);
        if (resolvedSkillGapAnalysisId) params.set('skill_gap_analysis_id', resolvedSkillGapAnalysisId);

        navigate(`/interview/voice?${params.toString()}`);
    };

    /**
     * Tiêu chí 1.8: IF người dùng chưa hoàn thành ghi âm thử thành công, 
     * THEN THE Device_Test_Page SHALL vô hiệu hóa nút "Bắt đầu phỏng vấn".
     */
    const canStartInterview = () => {
        return (
            hasPermission &&
            availableMicrophones.length > 0 &&
            selectedMicId &&
            testCompleted &&
            !errorMessage
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Kiểm Tra Thiết Bị Âm Thanh
                    </h1>
                    <p className="text-gray-600">
                        Vui lòng kiểm tra microphone và loa trước khi bắt đầu phỏng vấn
                    </p>
                </div>

                {/* Error Message */}
                {errorMessage && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center">
                            <div className="text-red-600 mr-3">⚠️</div>
                            <div className="text-red-800">{errorMessage}</div>
                        </div>
                    </div>
                )}

                {/* Device Selection */}
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">Chọn Thiết Bị</h2>

                    {/* Microphone Selection - Tiêu chí 1.1 */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Microphone
                        </label>
                        <select
                            value={selectedMicId}
                            onChange={(e) => setSelectedMicId(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={isRecording}
                            data-testid="microphone-select"
                        >
                            <option value="">Chọn microphone...</option>
                            {availableMicrophones.map((mic) => (
                                <option key={mic.deviceId} value={mic.deviceId}>
                                    {mic.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Speaker Selection - Tiêu chí 1.2 */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Loa
                        </label>
                        <select
                            value={selectedSpeakerId}
                            onChange={(e) => setSelectedSpeakerId(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={isRecording || isPlaying}
                            data-testid="speaker-select"
                        >
                            <option value="">Chọn loa...</option>
                            {availableSpeakers.map((speaker) => (
                                <option key={speaker.deviceId} value={speaker.deviceId}>
                                    {speaker.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Recording Test */}
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">Kiểm Tra Ghi Âm</h2>

                    <div className="flex flex-col space-y-4">
                        {/* State Machine UI */}
                        {recordingState === 'idle' && (
                            /* idle: chỉ hiện nút Bắt đầu ghi âm */
                            <button
                                onClick={startRecording}
                                disabled={!selectedMicId || isPlaying}
                                className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                                data-testid="start-recording-btn"
                            >
                                Bắt đầu ghi âm thử
                            </button>
                        )}

                        {recordingState === 'recording' && (
                            /* recording: chỉ hiện nút Dừng ghi âm */
                            <button
                                onClick={stopRecording}
                                className="w-full bg-gray-500 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-lg transition-colors animate-pulse"
                                data-testid="stop-recording-btn"
                            >
                                🎤 Dừng ghi âm
                            </button>
                        )}

                        {recordingState === 'recorded' && (
                            /* recorded: ẩn hoàn toàn start/stop, chỉ hiện Nghe lại + Ghi lại */
                            <div className="flex space-x-4">
                                <button
                                    onClick={playRecording}
                                    disabled={isPlaying}
                                    className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                                    data-testid="play-recording-btn"
                                >
                                    {isPlaying ? '🔊 Đang phát...' : 'Nghe lại'}
                                </button>
                                <button
                                    onClick={resetRecording}
                                    disabled={isPlaying}
                                    className="flex-1 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                                    data-testid="reset-recording-btn"
                                >
                                    Ghi lại
                                </button>
                            </div>
                        )}

                        {/* Test Status */}
                        {testCompleted && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <div className="flex items-center">
                                    <div className="text-green-600 mr-3">✅</div>
                                    <div className="text-green-800">
                                        Kiểm tra thiết bị hoàn tất! Bạn có thể bắt đầu phỏng vấn.
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Start Interview Button */}
                <div className="text-center">
                    {/* Tiêu chí 1.8 & 1.9: Button chỉ enable khi test completed */}
                    <button
                        onClick={startVoiceInterview}
                        disabled={!canStartInterview()}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-lg text-lg transition-colors"
                        data-testid="start-interview-btn"
                    >
                        Bắt đầu phỏng vấn
                    </button>

                    {!canStartInterview() && (
                        <p className="text-sm text-gray-500 mt-2">
                            Vui lòng hoàn thành kiểm tra thiết bị trước khi bắt đầu
                        </p>
                    )}
                </div>

                {/* Back Button */}
                <div className="text-center mt-4">
                    <button
                        onClick={() => navigate('/interview/selection')}
                        className="text-gray-600 hover:text-gray-800 underline"
                    >
                        ← Quay lại chọn phỏng vấn
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeviceTestPage;