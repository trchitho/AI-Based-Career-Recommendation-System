import React from 'react';

interface AudioVisualizerProps {
    isRecording: boolean;
    audioLevel?: number; // 0-1
}

const HEIGHTS = [12, 20, 16, 24, 14];

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isRecording, audioLevel = 0.5 }) => {
    return (
        <div className="flex items-center space-x-1" data-testid="audio-visualizer">
            {HEIGHTS.map((baseHeight, i) => {
                const height = isRecording
                    ? Math.max(4, baseHeight * (0.5 + audioLevel * 0.5))
                    : 4;
                return (
                    <div
                        key={i}
                        className={`w-1 bg-red-500 rounded-full transition-all duration-150 ${isRecording ? 'animate-pulse' : ''}`}
                        style={{
                            height: `${height}px`,
                            animationDelay: isRecording ? `${i * 0.1}s` : undefined,
                        }}
                    />
                );
            })}
        </div>
    );
};

export default AudioVisualizer;
