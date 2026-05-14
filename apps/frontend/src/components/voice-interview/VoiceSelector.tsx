import React, { useState } from 'react';
import { UserIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

interface VoiceSelectorProps {
    selectedVoice: 'male' | 'female';
    onVoiceChange: (voice: 'male' | 'female') => void;
    disabled?: boolean;
    showPreview?: boolean;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
    selectedVoice,
    onVoiceChange,
    disabled = false,
    showPreview = true
}) => {
    const [isPlaying, setIsPlaying] = useState<'male' | 'female' | null>(null);

    const voiceOptions = [
        {
            type: 'female' as const,
            label: 'Giọng Nữ',
            description: 'Giọng nữ tự nhiên, ấm áp',
            color: 'pink',
            previewText: 'Xin chào, tôi là AI interviewer với giọng nữ.'
        },
        {
            type: 'male' as const,
            label: 'Giọng Nam',
            description: 'Giọng nam chuyên nghiệp, rõ ràng',
            color: 'blue',
            previewText: 'Xin chào, tôi là AI interviewer với giọng nam.'
        }
    ];

    const playVoicePreview = async (voiceType: 'male' | 'female') => {
        if (disabled || isPlaying) return;

        setIsPlaying(voiceType);

        try {
            const option = voiceOptions.find(v => v.type === voiceType);
            if (!option) return;

            const response = await fetch('/api/voice/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: option.previewText,
                    voice_type: voiceType
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.audio_url) {
                    const audio = new Audio(data.audio_url);
                    audio.onended = () => setIsPlaying(null);
                    await audio.play();
                }
            }
        } catch (error) {
            console.error('Voice preview failed:', error);
        } finally {
            setTimeout(() => setIsPlaying(null), 3000); // Fallback cleanup
        }
    };

    return (
        <div className="voice-selector">
            <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-800 mb-2">
                    Chọn giọng AI
                </h3>
                <p className="text-sm text-slate-600">
                    Chọn giọng phù hợp cho cuộc phỏng vấn của bạn
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {voiceOptions.map((option) => (
                    <div
                        key={option.type}
                        className={`
              relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
              ${selectedVoice === option.type
                                ? `border-${option.color}-500 bg-${option.color}-50 shadow-md`
                                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                            }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
                        onClick={() => !disabled && onVoiceChange(option.type)}
                    >
                        {/* Selection indicator */}
                        {selectedVoice === option.type && (
                            <div className={`absolute top-2 right-2 text-${option.color}-500`}>
                                <CheckCircleIcon className="w-6 h-6" />
                            </div>
                        )}

                        {/* Voice icon */}
                        <div className={`
              flex items-center justify-center w-12 h-12 rounded-full mb-3
              ${selectedVoice === option.type
                                ? `bg-${option.color}-100 text-${option.color}-600`
                                : 'bg-gray-100 text-gray-500'
                            }
            `}>
                            <UserIcon className="w-6 h-6" />
                        </div>

                        {/* Voice info */}
                        <div className="mb-3">
                            <h4 className="font-medium text-slate-800 mb-1">
                                {option.label}
                            </h4>
                            <p className="text-sm text-slate-600">
                                {option.description}
                            </p>
                        </div>

                        {/* Preview button */}
                        {showPreview && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    playVoicePreview(option.type);
                                }}
                                disabled={disabled || isPlaying !== null}
                                className={`
                  flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
                  ${isPlaying === option.type
                                        ? `bg-${option.color}-500 text-white`
                                        : `text-${option.color}-600 hover:bg-${option.color}-100`
                                    }
                  ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
                `}
                            >
                                <SpeakerWaveIcon className="w-4 h-4" />
                                <span>
                                    {isPlaying === option.type ? 'Đang phát...' : 'Nghe thử'}
                                </span>
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Voice settings */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-slate-800 mb-3">Cài đặt giọng nói</h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Tốc độ nói
                        </label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option value="slow">Chậm</option>
                            <option value="normal">Bình thường</option>
                            <option value="fast">Nhanh</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Âm điệu
                        </label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option value="-10Hz">Thấp</option>
                            <option value="+0Hz">Bình thường</option>
                            <option value="+10Hz">Cao</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Âm lượng
                        </label>
                        <input
                            type="range"
                            min="0.5"
                            max="1.5"
                            step="0.1"
                            defaultValue="1.0"
                            className="w-full"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};