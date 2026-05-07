/**
 * Types cho Voice Interview System
 */

export interface AudioDeviceConfig {
    microphoneId: string;
    speakerId: string;
    testRecordingBlob?: Blob;
}

export interface DeviceInfo {
    deviceId: string;
    label: string;
    kind: MediaDeviceKind;
}

export interface VoiceInterviewSession {
    sessionId: number;
    deviceConfig: AudioDeviceConfig;
    jobId: string;
    questionCount: number;
    jdId?: number;
    levelSlug?: string;
}

export interface RecordingState {
    isRecording: boolean;
    recordedBlob: Blob | null;
    isPlaying: boolean;
    testCompleted: boolean;
    duration?: number;
}

export interface DeviceTestError {
    type: 'permission' | 'no_devices' | 'recording' | 'playback';
    message: string;
}

// Voice Interview API Types
export interface VoiceStartRequest {
    job_id: string;
    question_count: number;
    jd_id?: number;
    level_slug?: string;
    voice_preference: 'female' | 'male';
    device_config: AudioDeviceConfig;
}

export interface VoiceAnswerRequest {
    session_id: number;
    audio_file: File;
    duration_seconds: number;
}

export interface VoiceQuestionResponse {
    question_text: string;
    audio_url: string;
    question_type: string;
    question_number: number;
    progress: { current: number; total: number };
}