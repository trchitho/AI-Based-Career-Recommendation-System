import React, { useState, useEffect, useRef } from 'react';

interface WordTimestamp {
    word: string;
    start_time: number;
    end_time: number;
    index: number;
}

interface KaraokeTextProps {
    text: string;
    audioUrl: string;
    timestamps?: WordTimestamp[];
    isPlaying: boolean;
    onPlaybackComplete?: () => void;
}

export const KaraokeText: React.FC<KaraokeTextProps> = ({
    text,
    audioUrl,
    timestamps,
    isPlaying,
    onPlaybackComplete
}) => {
    const [currentWordIndex, setCurrentWordIndex] = useState(-1);
    const [currentTime, setCurrentTime] = useState(0);
    const [isAudioReady, setIsAudioReady] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    const wordsRef = useRef<HTMLSpanElement[]>([]);

    // Preload and setup audio
    useEffect(() => {
        if (audioRef.current && audioUrl) {
            const audio = audioRef.current;

            const handleCanPlay = () => setIsAudioReady(true);
            const handleEnded = () => {
                setCurrentWordIndex(-1);
                setCurrentTime(0);
                onPlaybackComplete?.();
            };

            audio.addEventListener('canplay', handleCanPlay);
            audio.addEventListener('ended', handleEnded);

            // Preload audio
            audio.load();

            return () => {
                audio.removeEventListener('canplay', handleCanPlay);
                audio.removeEventListener('ended', handleEnded);
            };
        }
    }, [audioUrl, onPlaybackComplete]);

    // Handle playback control
    useEffect(() => {
        if (audioRef.current && isAudioReady) {
            const audio = audioRef.current;

            if (isPlaying) {
                audio.play().catch(console.error);
            } else {
                audio.pause();
            }
        }
    }, [isPlaying, isAudioReady]);

    // Track current time and highlight words
    useEffect(() => {
        if (isPlaying && audioRef.current) {
            const audio = audioRef.current;

            const updateTime = () => {
                const time = audio.currentTime;
                setCurrentTime(time);

                // Find current word based on timestamp
                if (timestamps) {
                    const currentWord = timestamps.find(
                        ts => ts.start_time <= time && time <= ts.end_time
                    );

                    const newIndex = currentWord?.index ?? -1;
                    if (newIndex !== currentWordIndex) {
                        setCurrentWordIndex(newIndex);

                        // Scroll to current word
                        if (newIndex >= 0 && wordsRef.current[newIndex]) {
                            wordsRef.current[newIndex].scrollIntoView({
                                behavior: 'smooth',
                                block: 'center'
                            });
                        }
                    }
                }
            };

            const intervalId = setInterval(updateTime, 50); // Update every 50ms for smooth highlighting

            return () => clearInterval(intervalId);
        }
    }, [isPlaying, timestamps, currentWordIndex]);

    const renderWords = () => {
        if (!timestamps || timestamps.length === 0) {
            return (
                <span className="text-slate-800 text-xl leading-relaxed">
                    {text}
                </span>
            );
        }

        return timestamps.map((ts, index) => (
            <span
                key={index}
                ref={el => wordsRef.current[index] = el!}
                className={`
          inline-block transition-all duration-150 ease-out text-xl leading-relaxed mx-1
          ${index === currentWordIndex
                        ? 'bg-gradient-to-r from-blue-400 to-blue-600 text-white px-2 py-1 rounded-md shadow-lg transform scale-105 current-word'
                        : 'text-slate-800 hover:text-blue-600 highlighted-word'
                    }
        `}
                style={{
                    transitionDelay: index === currentWordIndex ? '0ms' : '100ms'
                }}
            >
                {ts.word}
            </span>
        ));
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="karaoke-text-container" data-testid="karaoke-text">
            <audio
                ref={audioRef}
                src={audioUrl}
                preload="auto"
                className="hidden"
                data-testid="audio-element"
            />

            <div className="text-content max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-sm" data-testid="text-content">
                <div className="text-center mb-4">
                    <div className="inline-flex items-center space-x-2 text-sm text-gray-500">
                        <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                        <span>{isPlaying ? 'Đang phát' : 'Tạm dừng'}</span>
                        {timestamps && (
                            <span>• {currentWordIndex + 1}/{timestamps.length} từ</span>
                        )}
                    </div>
                </div>

                <div className="text-content leading-loose text-center">
                    {renderWords()}
                </div>

                {/* Progress bar */}
                {audioRef.current && (
                    <div className="mt-6">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-blue-500 h-2 rounded-full transition-all duration-100"
                                style={{
                                    width: `${(currentTime / (audioRef.current.duration || 1)) * 100}%`
                                }}
                            />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(audioRef.current.duration || 0)}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};