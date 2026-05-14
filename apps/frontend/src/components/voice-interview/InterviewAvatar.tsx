import React from 'react';

interface InterviewAvatarProps {
    isTalking: boolean;
    isListening: boolean;
    size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP = {
    sm: 'w-16 h-16 text-2xl',
    md: 'w-24 h-24 text-3xl',
    lg: 'w-32 h-32 text-4xl',
};

const InterviewAvatar: React.FC<InterviewAvatarProps> = ({
    isTalking,
    isListening,
    size = 'lg',
}) => {
    const sizeClass = SIZE_MAP[size];

    const borderClass = isListening && !isTalking
        ? 'ring-4 ring-green-400 ring-offset-2 animate-pulse'
        : '';

    const scaleClass = isTalking ? 'animate-pulse scale-110' : 'scale-100';

    return (
        <div className="relative inline-flex items-center justify-center" data-testid="interview-avatar">
            {isTalking && (
                <>
                    <div
                        className={`absolute inset-0 rounded-full bg-blue-400/30 animate-ping ${sizeClass}`}
                        data-testid="avatar-ripple-1"
                    />
                    <div
                        className={`absolute inset-0 rounded-full bg-purple-400/20 animate-ping ${sizeClass}`}
                        style={{ animationDelay: '0.15s' }}
                        data-testid="avatar-ripple-2"
                    />
                </>
            )}
            <div
                className={`relative rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shadow-2xl transition-all duration-300 ${sizeClass} ${scaleClass} ${borderClass}`}
            >
                <span aria-hidden="true">🤖</span>
            </div>
        </div>
    );
};

export default InterviewAvatar;
