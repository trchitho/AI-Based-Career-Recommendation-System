import React from 'react';
import { MicrophoneIcon, StopIcon, PlayIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import { useRecordingState } from '../../hooks/useRecordingState';

interface RecordingControlsProps {
    disabled?: boolean;
    onRecordingComplete?: (audioBlob: Blob) => void;
}

export const RecordingControls: React.FC<RecordingControlsProps> = ({
    disabled = false,
    onRecordingComplete
}) => {
    const { state, actions } = useRecordingState();

    const handleStopRecording = async () => {
        const audioBlob = await actions.stopRecording();
        if (audioBlob && onRecordingComplete) {
            onRecordingComplete(audioBlob);
        }
    };

    const isDisabled = disabled || state.isProcessing;

    return (
        <div className="recording-controls flex flex-col items-center space-y-4" data-testid="recording-controls">
            {/* State-based button rendering */}
            {state.status === 'idle' && (
                <button
                    onClick={actions.startRecording}
                    disabled={isDisabled}
                    className="flex items-center justify-center w-16 h-16 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="start-recording-btn"
                >
                    <MicrophoneIcon className="w-8 h-8" />
                </button>
            )}

            {state.status === 'recording' && (
                <button
                    onClick={handleStopRecording}
                    disabled={isDisabled}
                    className="flex items-center justify-center w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all duration-200 shadow-lg animate-pulse disabled:opacity-50"
                    data-testid="stop-recording-btn"
                >
                    <StopIcon className="w-8 h-8" />
                </button>
            )}

            {state.status === 'recorded' && (
                <div className="flex space-x-4">
                    <button
                        onClick={() => {
                            if (state.audioBlob) {
                                const audioUrl = URL.createObjectURL(state.audioBlob);
                                const audio = new Audio(audioUrl);
                                audio.play();
                            }
                        }}
                        disabled={isDisabled}
                        className="flex items-center justify-center w-12 h-12 bg-green-500 hover:bg-green-600 text-white rounded-full transition-all duration-200 disabled:opacity-50"
                        data-testid="play-recording-btn"
                    >
                        <PlayIcon className="w-6 h-6" />
                    </button>

                    <button
                        onClick={actions.resetRecording}
                        disabled={isDisabled}
                        className="flex items-center justify-center w-12 h-12 bg-gray-500 hover:bg-gray-600 text-white rounded-full transition-all duration-200 disabled:opacity-50"
                        data-testid="reset-recording-btn"
                    >
                        <ArrowPathIcon className="w-6 h-6" />
                    </button>

                    {/* Submit Recording Button */}
                    <button
                        onClick={() => {
                            if (state.audioBlob && onRecordingComplete) {
                                onRecordingComplete(state.audioBlob);
                            }
                        }}
                        disabled={isDisabled || !state.audioBlob}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all duration-200 disabled:opacity-50 text-sm font-medium"
                        data-testid="submit-recording-btn"
                    >
                        Gửi
                    </button>
                </div>
            )}

            {/* Status display */}
            <div className="text-center">
                <p className="text-sm text-gray-600">
                    {state.status === 'idle' && (isDisabled ? 'Đang xử lý...' : 'Nhấn để bắt đầu ghi âm')}
                    {state.status === 'recording' && `Đang ghi âm... ${Math.floor(state.duration)}s`}
                    {state.status === 'recorded' && `Đã ghi ${state.duration.toFixed(1)}s - Nhấn Gửi để xử lý`}
                    {state.isProcessing && 'Đang xử lý...'}
                </p>

                {state.error && (
                    <p className="text-sm text-red-500 mt-2">{state.error}</p>
                )}
            </div>
        </div>
    );
};