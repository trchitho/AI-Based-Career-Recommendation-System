import React from 'react';

interface ProcessingIndicatorProps {
    stage: 'idle' | 'stt' | 'ai' | 'tts' | 'complete';
    progress?: number;
    className?: string;
}

export const ProcessingIndicator: React.FC<ProcessingIndicatorProps> = ({
    stage,
    progress = 0,
    className = ''
}) => {
    const stageConfig = {
        idle: {
            message: 'Sẵn sàng',
            color: 'gray',
            icon: '⏸️'
        },
        stt: {
            message: 'Đang xử lý giọng nói…',
            color: 'blue',
            icon: '🎤'
        },
        ai: {
            message: 'AI đang suy nghĩ…',
            color: 'purple',
            icon: '🧠'
        },
        tts: {
            message: 'Đang tạo giọng nói…',
            color: 'green',
            icon: '🔊'
        },
        complete: {
            message: 'Hoàn thành',
            color: 'green',
            icon: '✅'
        }
    };

    const config = stageConfig[stage];

    return (
        <div className={`processing-indicator ${className}`} data-testid="processing-indicator">
            <div className="flex flex-col items-center space-y-4 p-6 bg-white rounded-lg shadow-sm">
                {/* Stage Icon */}
                <div className={`
          w-16 h-16 rounded-full flex items-center justify-center text-2xl
          ${stage === 'idle' ? 'bg-gray-100' : ''}
          ${stage === 'stt' ? 'bg-blue-100 animate-pulse' : ''}
          ${stage === 'ai' ? 'bg-purple-100 animate-bounce' : ''}
          ${stage === 'tts' ? 'bg-green-100 animate-pulse' : ''}
          ${stage === 'complete' ? 'bg-green-100' : ''}
        `}>
                    <span>{config.icon}</span>
                </div>

                {/* Stage Message */}
                <div className="text-center">
                    <h3 className={`
            text-lg font-semibold mb-2
            ${config.color === 'gray' ? 'text-gray-700' : ''}
            ${config.color === 'blue' ? 'text-blue-700' : ''}
            ${config.color === 'purple' ? 'text-purple-700' : ''}
            ${config.color === 'green' ? 'text-green-700' : ''}
          `}>
                        {config.message}
                    </h3>

                    {stage !== 'idle' && stage !== 'complete' && (
                        <p className="text-sm text-gray-500">
                            Vui lòng đợi trong giây lát...
                        </p>
                    )}
                </div>

                {/* Progress Bar */}
                {progress > 0 && stage !== 'complete' && (
                    <div className="w-full max-w-xs">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className={`
                  h-2 rounded-full transition-all duration-300
                  ${config.color === 'blue' ? 'bg-blue-500' : ''}
                  ${config.color === 'purple' ? 'bg-purple-500' : ''}
                  ${config.color === 'green' ? 'bg-green-500' : ''}
                `}
                                style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                        </div>
                        <div className="text-center mt-2">
                            <span className="text-xs text-gray-500">{Math.round(progress)}%</span>
                        </div>
                    </div>
                )}

                {/* Stage Details */}
                <div className="text-center">
                    {stage === 'stt' && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                            <span>Chuyển đổi giọng nói thành văn bản</span>
                        </div>
                    )}

                    {stage === 'ai' && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-ping"></div>
                            <span>Phân tích và tạo phản hồi</span>
                        </div>
                    )}

                    {stage === 'tts' && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                            <span>Tạo âm thanh từ văn bản</span>
                        </div>
                    )}
                </div>

                {/* Time Estimate */}
                {stage !== 'idle' && stage !== 'complete' && (
                    <div className="text-xs text-gray-400">
                        {stage === 'stt' && 'Ước tính: 2-3 giây'}
                        {stage === 'ai' && 'Ước tính: 1-2 giây'}
                        {stage === 'tts' && 'Ước tính: 3-4 giây'}
                    </div>
                )}
            </div>
        </div>
    );
};