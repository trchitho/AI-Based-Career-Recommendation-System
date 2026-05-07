import React, { useState, useEffect, useRef } from 'react';

export interface WordTimestamp {
    word: string;
    offset_ms: number;
    duration_ms: number;
}

export interface QuestionBubbleProps {
    question: {
        id: string;
        text: string;
        type: string;
        durationSeconds?: number;
        wordTimestamps?: WordTimestamp[];
    } | null;
    isAISpeaking: boolean;
    audioCurrentTimeMs: number;
}

const QuestionBubble: React.FC<QuestionBubbleProps> = ({
    question,
    isAISpeaking,
    audioCurrentTimeMs,
}) => {
    const [visibleChars, setVisibleChars] = useState(0);
    const animRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Requirement 4.5: typing animation synced to audio duration
    useEffect(() => {
        if (!question) return;
        if (!isAISpeaking) {
            setVisibleChars(question.text.length);
            return;
        }

        setVisibleChars(0);
        const totalChars = question.text.length;
        const durationMs = (question.durationSeconds ?? 5) * 1000;
        const intervalMs = Math.max(20, durationMs / totalChars);

        animRef.current = setInterval(() => {
            setVisibleChars(prev => {
                if (prev >= totalChars) {
                    if (animRef.current) clearInterval(animRef.current);
                    return totalChars;
                }
                return prev + 1;
            });
        }, intervalMs);

        return () => { if (animRef.current) clearInterval(animRef.current); };
    }, [question?.id, isAISpeaking]);

    if (!question) return null;

    const words = question.text.split(' ');
    const hasTimestamps = question.wordTimestamps && question.wordTimestamps.length > 0;

    // Requirement 4.6: build word → timestamp lookup
    const tsMap = new Map<string, WordTimestamp>();
    if (hasTimestamps) {
        question.wordTimestamps!.forEach(ts => {
            tsMap.set(ts.word.toLowerCase().replace(/[^\w]/g, ''), ts);
        });
    }

    return (
        <div className="mb-8 max-w-2xl w-full" data-testid="question-bubble">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
                <div className="text-center">
                    {hasTimestamps ? (
                        // Requirement 4.6: highlight active word by timestamp
                        <p className="text-lg text-gray-800 leading-relaxed" data-testid="question-text">
                            {words.map((word, idx) => {
                                const key = word.toLowerCase().replace(/[^\w]/g, '');
                                const ts = tsMap.get(key);
                                const isActive = ts
                                    ? audioCurrentTimeMs >= ts.offset_ms &&
                                    audioCurrentTimeMs < ts.offset_ms + ts.duration_ms
                                    : false;
                                return (
                                    <span
                                        key={idx}
                                        className={`transition-colors duration-100 ${isActive
                                                ? 'bg-yellow-200 text-yellow-900 rounded px-0.5'
                                                : 'text-gray-800'
                                            }`}
                                        data-testid={isActive ? 'highlighted-word' : undefined}
                                    >
                                        {word}{idx < words.length - 1 ? ' ' : ''}
                                    </span>
                                );
                            })}
                        </p>
                    ) : (
                        // Requirement 4.5: typing animation
                        <p className="text-lg text-gray-800 leading-relaxed" data-testid="question-text">
                            {question.text.slice(0, visibleChars)}
                            {isAISpeaking && visibleChars < question.text.length && (
                                <span className="animate-pulse">|</span>
                            )}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QuestionBubble;
