import { useState, useRef, useCallback } from 'react';

interface RecordingState {
    status: 'idle' | 'recording' | 'recorded';
    audioBlob: Blob | null;
    duration: number;
    error: string | null;
    isProcessing: boolean;
}

export const useRecordingState = () => {
    const [state, setState] = useState<RecordingState>({
        status: 'idle',
        audioBlob: null,
        duration: 0,
        error: null,
        isProcessing: false
    });

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const startTimeRef = useRef<number>(0);

    const startRecording = useCallback(async () => {
        try {
            setState(prev => ({ ...prev, isProcessing: true, error: null }));

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            chunksRef.current = [];
            startTimeRef.current = Date.now();

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const duration = (Date.now() - startTimeRef.current) / 1000;

                setState(prev => ({
                    ...prev,
                    status: 'recorded',
                    audioBlob,
                    duration,
                    isProcessing: false
                }));

                // Cleanup
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start(100); // Collect data every 100ms
            mediaRecorderRef.current = mediaRecorder;

            setState(prev => ({
                ...prev,
                status: 'recording',
                isProcessing: false
            }));

        } catch (error: any) {
            setState(prev => ({
                ...prev,
                error: `Recording failed: ${error.message}`,
                isProcessing: false
            }));
        }
    }, []);

    const stopRecording = useCallback((): Promise<Blob | null> => {
        return new Promise((resolve) => {
            if (mediaRecorderRef.current && state.status === 'recording') {
                // Store the current resolve function to call when recording stops
                const originalOnStop = mediaRecorderRef.current.onstop;

                mediaRecorderRef.current.onstop = (event) => {
                    // Call original onstop first
                    if (originalOnStop && mediaRecorderRef.current) {
                        originalOnStop.call(mediaRecorderRef.current, event);
                    }

                    // Then resolve with the audioBlob
                    const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
                    resolve(audioBlob);
                };

                mediaRecorderRef.current.stop();
            } else {
                resolve(null);
            }
        });
    }, [state.status]);

    const resetRecording = useCallback(() => {
        setState({
            status: 'idle',
            audioBlob: null,
            duration: 0,
            error: null,
            isProcessing: false
        });
        chunksRef.current = [];
    }, []);

    return {
        state,
        actions: {
            startRecording,
            stopRecording,
            resetRecording
        }
    };
};