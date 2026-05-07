import React, { useState, useEffect } from 'react';
import { RecordingControls } from './RecordingControls';
import { VoiceSelector } from './VoiceSelector';
import { KaraokeText } from './KaraokeText';
import { ProcessingIndicator } from './ProcessingIndicator';
import { VoiceInterviewLayout } from './VoiceInterviewLayout';

interface VoiceInterfaceProps {
    className?: string;
    onProcessingStateChange?: (isProcessing: boolean) => void;
}

export const VoiceInterface: React.FC<VoiceInterfaceProps> = ({
    className = '',
    onProcessingStateChange
}) => {
    const [selectedVoice, setSelectedVoice] = useState<'male' | 'female'>('female');
    const [processingStage, setProcessingStage] = useState<'idle' | 'stt' | 'ai' | 'tts' | 'complete'>('idle');
    const [currentText, setCurrentText] = useState('');
    const [currentAudioUrl, setCurrentAudioUrl] = useState('');
    const [isPlaying, setIsPlaying] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Notify parent component about processing state
    useEffect(() => {
        const processing = processingStage !== 'idle';
        setIsProcessing(processing);
        onProcessingStateChange?.(processing);
    }, [processingStage, onProcessingStateChange]);

    const handleVoiceChange = (voice: 'male' | 'female') => {
        setSelectedVoice(voice);
    };

    const handleRecordingComplete = async (audioBlob: Blob) => {
        try {
            // Start processing
            setProcessingStage('stt');

            // Simulate real voice processing pipeline
            await processVoiceAnswer(audioBlob);

        } catch (error) {
            console.error('Voice processing failed:', error);
            setProcessingStage('idle');
        }
    };

    const processVoiceAnswer = async (audioBlob: Blob) => {
        try {
            // Create FormData for streaming request
            const formData = new FormData();
            formData.append('session_id', '1'); // Replace with actual session ID
            formData.append('audio_file', audioBlob, 'recording.webm');
            formData.append('voice_preference', selectedVoice);
            formData.append('tab_switch_count', '0');

            // Use fetch for streaming response
            const response = await fetch('/api/interview/voice/answer-stream', {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Process streaming response
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (reader) {
                let buffer = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');

                    // Keep the last incomplete line in buffer
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6));

                                // Update processing stage based on stream data
                                if (data.stage === 'stt') {
                                    setProcessingStage('stt');
                                } else if (data.stage === 'ai') {
                                    setProcessingStage('ai');
                                } else if (data.stage === 'tts') {
                                    setProcessingStage('tts');
                                } else if (data.stage === 'complete') {
                                    setProcessingStage('complete');

                                    // Set the final result
                                    if (data.result) {
                                        setCurrentText(data.result.next_question);
                                        setCurrentAudioUrl(data.result.audio_url || '');

                                        // Log performance metrics
                                        console.log('Voice processing completed:', {
                                            processing_time: data.result.processing_time,
                                            cache_stats: data.result.metadata?.cache_stats,
                                            tts_metadata: data.result.metadata?.tts_metadata
                                        });
                                    }
                                } else if (data.stage === 'error') {
                                    console.error('Processing error:', data.message);
                                    setProcessingStage('idle');

                                    // Show error to user
                                    setCurrentText(`Lỗi xử lý: ${data.message}`);
                                    return;
                                }
                            } catch (e) {
                                console.warn('Failed to parse streaming data:', e);
                            }
                        }
                    }
                }
            }

            // Complete processing
            setTimeout(() => {
                setProcessingStage('idle');
            }, 2000);

        } catch (error) {
            console.error('Voice processing failed:', error);
            setProcessingStage('idle');

            // Fallback to non-streaming processing
            await fallbackProcessing(audioBlob);
        }
    };

    const fallbackProcessing = async (audioBlob: Blob) => {
        // Fallback to original processing method
        setProcessingStage('stt');
        await new Promise(resolve => setTimeout(resolve, 2000));

        setProcessingStage('ai');
        await new Promise(resolve => setTimeout(resolve, 3000));

        setProcessingStage('tts');
        await new Promise(resolve => setTimeout(resolve, 2500));

        setProcessingStage('complete');
        setCurrentText('Cảm ơn bạn đã trả lời. Đây là phản hồi từ AI interviewer (fallback mode).');

        setTimeout(() => {
            setProcessingStage('idle');
        }, 2000);
    };

    const simulateProcessing = async () => {
        // Simulate STT processing
        setProcessingStage('stt');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Simulate AI processing
        setProcessingStage('ai');
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Simulate TTS processing
        setProcessingStage('tts');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Complete
        setProcessingStage('complete');
        setCurrentText('Đây là câu trả lời mẫu từ AI interviewer. Câu hỏi tiếp theo sẽ được đưa ra sau khi bạn trả lời.');

        setTimeout(() => {
            setProcessingStage('idle');
        }, 2000);
    };

    return (
        <div className={`voice-interface ${className}`} data-testid="voice-interface">
            <VoiceInterviewLayout>
                <div className="space-y-8">
                    {/* Voice Selection */}
                    <div className="mb-8">
                        <VoiceSelector
                            selectedVoice={selectedVoice}
                            onVoiceChange={handleVoiceChange}
                            disabled={isProcessing}
                        />
                    </div>

                    {/* Processing Indicator - Always show when processing */}
                    {isProcessing && (
                        <div className="mb-8">
                            <ProcessingIndicator stage={processingStage} />

                            {/* Processing Overlay */}
                            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-center justify-center space-x-3">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                    <div className="text-blue-700 font-medium">
                                        {processingStage === 'stt' && 'Đang chuyển đổi giọng nói thành văn bản...'}
                                        {processingStage === 'ai' && 'AI đang phân tích và tạo phản hồi...'}
                                        {processingStage === 'tts' && 'Đang tạo âm thanh phản hồi...'}
                                        {processingStage === 'complete' && 'Hoàn tất xử lý!'}
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="mt-3 w-full bg-blue-200 rounded-full h-2">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                                        style={{
                                            width: processingStage === 'stt' ? '25%' :
                                                processingStage === 'ai' ? '60%' :
                                                    processingStage === 'tts' ? '90%' :
                                                        processingStage === 'complete' ? '100%' : '0%'
                                        }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Text Display with Karaoke Effect */}
                    {currentText && !isProcessing && (
                        <div className="mb-8">
                            <KaraokeText
                                text={currentText}
                                audioUrl={currentAudioUrl}
                                isPlaying={isPlaying}
                                onPlaybackComplete={() => setIsPlaying(false)}
                            />
                        </div>
                    )}

                    {/* Recording Controls */}
                    <div className="text-center">
                        <RecordingControls
                            disabled={isProcessing}
                            onRecordingComplete={handleRecordingComplete}
                        />

                        {/* Demo Button */}
                        <div className="mt-6">
                            <button
                                onClick={simulateProcessing}
                                disabled={isProcessing}
                                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? 'Đang xử lý...' : 'Demo Voice Processing'}
                            </button>
                        </div>
                    </div>

                    {/* Voice Layout Indicator */}
                    <div className="voice-layout text-center py-4 bg-blue-50 rounded-lg" data-testid="voice-layout">
                        <div className="flex items-center justify-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${isProcessing ? 'bg-orange-500 animate-pulse' : 'bg-blue-500'}`}></div>
                            <span className={`font-medium ${isProcessing ? 'text-orange-700' : 'text-blue-700'}`}>
                                {isProcessing ? 'Đang xử lý giọng nói...' : 'Voice Interview Mode'}
                            </span>
                        </div>
                        <p className={`text-sm mt-1 ${isProcessing ? 'text-orange-600' : 'text-blue-600'}`}>
                            {isProcessing ? 'Vui lòng chờ trong khi hệ thống xử lý phản hồi của bạn' : 'Giao diện được tối ưu cho phỏng vấn bằng giọng nói'}
                        </p>
                    </div>
                </div>
            </VoiceInterviewLayout>
        </div>
    );
};