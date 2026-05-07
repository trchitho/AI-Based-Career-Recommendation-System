/**
 * Utilities cho Device Test Page
 */

import { DeviceInfo, AudioDeviceConfig, DeviceTestError } from '../types/voice-interview';

/**
 * Enumerate và filter audio devices
 */
export const getAudioDevices = async (): Promise<{
    microphones: DeviceInfo[];
    speakers: DeviceInfo[];
}> => {
    try {
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

        return { microphones, speakers };
    } catch (error) {
        throw new Error('Không thể liệt kê thiết bị âm thanh');
    }
};

/**
 * Request microphone permission
 */
export const requestMicrophonePermission = async (): Promise<boolean> => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        return true;
    } catch (error) {
        return false;
    }
};

/**
 * Validate device configuration
 */
export const validateDeviceConfig = (config: Partial<AudioDeviceConfig>): DeviceTestError | null => {
    if (!config.microphoneId) {
        return {
            type: 'no_devices',
            message: 'Vui lòng chọn microphone'
        };
    }

    if (!config.speakerId) {
        return {
            type: 'no_devices',
            message: 'Vui lòng chọn loa'
        };
    }

    return null;
};

/**
 * Create MediaRecorder với device constraints
 */
export const createMediaRecorder = async (
    microphoneId: string,
    onDataAvailable: (event: BlobEvent) => void,
    onStop: () => void
): Promise<{ recorder: MediaRecorder; stream: MediaStream }> => {
    try {
        const constraints: MediaStreamConstraints = {
            audio: {
                deviceId: microphoneId ? { exact: microphoneId } : undefined,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        const recorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'
        });

        recorder.ondataavailable = onDataAvailable;
        recorder.onstop = onStop;

        return { recorder, stream };
    } catch (error) {
        throw new Error('Không thể tạo MediaRecorder với microphone đã chọn');
    }
};

/**
 * Play audio với speaker selection
 */
export const playAudioWithSpeaker = async (
    audioBlob: Blob,
    speakerId: string,
    onPlay?: () => void,
    onEnded?: () => void,
    onError?: (error: Error) => void
): Promise<HTMLAudioElement> => {
    try {
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        // Set speaker if supported
        if ('setSinkId' in audio && speakerId) {
            await (audio as any).setSinkId(speakerId);
        }

        // Event handlers
        audio.onplay = () => {
            if (onPlay) onPlay();
        };

        audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            if (onEnded) onEnded();
        };

        audio.onerror = () => {
            URL.revokeObjectURL(audioUrl);
            if (onError) onError(new Error('Không thể phát audio'));
        };

        await audio.play();
        return audio;
    } catch (error) {
        throw new Error('Không thể phát audio qua loa đã chọn');
    }
};

/**
 * Save device config to sessionStorage
 */
export const saveDeviceConfig = (config: AudioDeviceConfig): void => {
    try {
        sessionStorage.setItem('voiceDeviceConfig', JSON.stringify(config));
    } catch (error) {
        console.warn('Không thể lưu cấu hình thiết bị:', error);
    }
};

/**
 * Load device config from sessionStorage
 */
export const loadDeviceConfig = (): AudioDeviceConfig | null => {
    try {
        const stored = sessionStorage.getItem('voiceDeviceConfig');
        return stored ? JSON.parse(stored) : null;
    } catch (error) {
        console.warn('Không thể tải cấu hình thiết bị:', error);
        return null;
    }
};

/**
 * Check browser support cho voice interview features
 */
export const checkBrowserSupport = (): {
    mediaDevices: boolean;
    mediaRecorder: boolean;
    setSinkId: boolean;
    getUserMedia: boolean;
} => {
    return {
        mediaDevices: !!(navigator.mediaDevices && navigator.mediaDevices.enumerateDevices),
        mediaRecorder: !!(window.MediaRecorder),
        setSinkId: !!(HTMLAudioElement.prototype.setSinkId),
        getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    };
};

/**
 * Format device label for display
 */
export const formatDeviceLabel = (device: DeviceInfo, index: number): string => {
    if (device.label && device.label !== 'Default') {
        return device.label;
    }

    const type = device.kind === 'audioinput' ? 'Microphone' : 'Speaker';
    return `${type} ${index + 1}`;
};

/**
 * Validate audio blob
 */
export const validateAudioBlob = (blob: Blob): boolean => {
    return blob && blob.size > 0 && blob.type.includes('audio');
};

/**
 * Get audio duration from blob (approximate)
 */
export const getAudioDuration = (blob: Blob): Promise<number> => {
    return new Promise((resolve, reject) => {
        const audio = new Audio();
        const url = URL.createObjectURL(blob);

        audio.onloadedmetadata = () => {
            URL.revokeObjectURL(url);
            resolve(audio.duration);
        };

        audio.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Không thể đọc thời lượng audio'));
        };

        audio.src = url;
    });
};