import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import RulesModal from '../components/voice-interview/RulesModal';
import { InterviewRulesMonitor } from '../components/voice-interview/InterviewRulesMonitor';

// Helper: fetch với JWT token tự động từ localStorage + auto-refresh khi 401
const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const getToken = () => localStorage.getItem('accessToken');

    const doFetch = (token: string | null) => fetch(url, {
        ...options,
        headers: {
            ...(options.headers || {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });

    let res = await doFetch(getToken());

    // Nếu 401, thử refresh token một lần
    if (res.status === 401) {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
            try {
                const refreshRes = await fetch('/api/auth/refresh', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh_token: refreshToken }),
                });
                if (refreshRes.ok) {
                    const data = await refreshRes.json();
                    if (data.access_token) {
                        localStorage.setItem('accessToken', data.access_token);
                        res = await doFetch(data.access_token);
                    }
                }
            } catch {
                // refresh failed — return original 401
            }
        }
    }

    return res;
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface VoiceDeviceConfig {
    microphoneId: string;
    speakerId: string;
}

interface WordTimestamp {
    word: string;
    offset_ms: number;
    duration_ms: number;
}

interface InterviewQuestion {
    id: string;
    text: string;
    type: string;
    audioUrl?: string;
    wordTimestamps?: WordTimestamp[];
    durationSeconds?: number;
}

interface InterviewProgress {
    current: number;
    total: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// RecordingTimer — Tiêu chí 3.2
// ─────────────────────────────────────────────────────────────────────────────

const RecordingTimer: React.FC<{ isRecording: boolean }> = ({ isRecording }) => {
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | null = null;
        if (isRecording) {
            setSeconds(0);
            interval = setInterval(() => setSeconds(s => s + 1), 1000);
        } else {
            setSeconds(0);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [isRecording]);

    const fmt = (s: number) =>
        `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

    return (
        <div className="text-red-600 font-mono text-sm" data-testid="recording-timer">
            🔴 {fmt(seconds)}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// QuestionBubble — Tiêu chí 4.5 (typing animation) + 4.6 (word highlight)
// ─────────────────────────────────────────────────────────────────────────────

interface QuestionBubbleProps {
    question: InterviewQuestion | null;
    isAISpeaking: boolean;
    audioCurrentTimeMs: number; // current playback position in ms
}

const QuestionBubble: React.FC<QuestionBubbleProps> = ({
    question,
    isAISpeaking,
    audioCurrentTimeMs,
}) => {
    const [visibleChars, setVisibleChars] = useState(0);
    const animRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Tiêu chí 4.5: typing animation đồng bộ theo thời lượng audio
    useEffect(() => {
        if (!question) return;
        if (!isAISpeaking) {
            setVisibleChars(question.text.length);
            return;
        }

        setVisibleChars(0);
        const totalChars = question.text.length;
        const durationMs = (question.durationSeconds ?? 5) * 1000;
        const intervalMs = Math.max(15, Math.floor(durationMs / totalChars));

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
    }, [question?.id, isAISpeaking, question?.durationSeconds]);

    if (!question) return null;

    const words = question.text.split(' ');
    const hasTimestamps = question.wordTimestamps && question.wordTimestamps.length > 0;
    const tsArray = hasTimestamps ? question.wordTimestamps! : [];

    return (
        <div className="w-full max-w-[700px] mb-10" data-testid="question-bubble">
            {/* Question type badge */}
            <div className="flex items-center justify-center mb-4">
                <span className="inline-flex items-center gap-1.5 bg-blue-500/10 text-blue-600 text-xs font-semibold px-3 py-1 rounded-full border border-blue-200/60 tracking-wide uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                    {question.type}
                </span>
            </div>

            {/* Main bubble */}
            <div className="relative bg-white/95 backdrop-blur-md rounded-3xl px-8 py-7 shadow-2xl border border-white/40"
                style={{ boxShadow: '0 8px 40px rgba(99,102,241,0.12), 0 2px 8px rgba(0,0,0,0.06)' }}>

                {/* Decorative top bar */}
                <div className="absolute top-0 left-8 right-8 h-0.5 rounded-full bg-gradient-to-r from-transparent via-indigo-300/60 to-transparent" />

                {hasTimestamps ? (
                    // Tiêu chí 4.6: word highlight theo timestamps (index-based)
                    <p className="text-[20px] leading-[1.85] text-gray-800 text-center tracking-[0.3px] font-normal select-none"
                        data-testid="question-text"
                        style={{ fontFamily: "'Inter', 'Be Vietnam Pro', system-ui, sans-serif" }}>
                        {words.map((word, idx) => {
                            const ts = tsArray[idx];
                            const isActive = ts
                                ? audioCurrentTimeMs >= ts.offset_ms &&
                                audioCurrentTimeMs < ts.offset_ms + ts.duration_ms
                                : false;
                            const isPast = ts ? audioCurrentTimeMs >= ts.offset_ms + ts.duration_ms : false;
                            return (
                                <span
                                    key={idx}
                                    className={`transition-all duration-100 ${isActive
                                        ? 'bg-yellow-300 text-yellow-900 rounded-md px-1 py-0.5 font-semibold'
                                        : isPast
                                            ? 'text-gray-400'
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
                    // Tiêu chí 4.5: typing animation
                    <p className="text-[20px] leading-[1.85] text-gray-800 text-center tracking-[0.3px] font-normal"
                        data-testid="question-text"
                        style={{ fontFamily: "'Inter', 'Be Vietnam Pro', system-ui, sans-serif" }}>
                        {question.text.slice(0, visibleChars)}
                        {isAISpeaking && visibleChars < question.text.length && (
                            <span className="inline-block w-0.5 h-5 bg-indigo-500 ml-0.5 animate-pulse align-middle" />
                        )}
                    </p>
                )}
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// VoiceInterviewPage
// ─────────────────────────────────────────────────────────────────────────────

const VoiceInterviewPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [showRulesModal, setShowRulesModal] = useState(true);
    const [deviceConfig, setDeviceConfig] = useState<VoiceDeviceConfig | null>(null);
    const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion | null>(null);
    const [progress, setProgress] = useState<InterviewProgress>({ current: 1, total: 10 });
    const [isAISpeaking, setIsAISpeaking] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [canStartAnswer, setCanStartAnswer] = useState(false);
    const [voicePreference, setVoicePreference] = useState<'female' | 'male'>('female');
    const [sessionId, setSessionId] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [audioCurrentTimeMs, setAudioCurrentTimeMs] = useState(0);
    const [tabSwitchWarning, setTabSwitchWarning] = useState<{ count: number; remaining: number } | null>(null);
    // 9.3 STT fallback
    const [showTextFallback, setShowTextFallback] = useState(false);
    const [sttRetryCount, setSttRetryCount] = useState(0);
    const [textFallbackValue, setTextFallbackValue] = useState('');

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioStreamRef = useRef<MediaStream | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timeUpdateRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const rulesMonitorRef = useRef<InterviewRulesMonitor | null>(null);
    const isRecordingRef = useRef(false); // 9.5: ref for closure-safe isRecording check
    const ttsUnavailableRef = useRef(false); // track if TTS is known to be unavailable
    const recordingStartTimeRef = useRef<number>(0); // track recording start time for duration
    const voicePreferenceRef = useRef<'female' | 'male'>('female'); // ref để tránh stale closure

    // Sync voicePreference state → ref
    useEffect(() => { voicePreferenceRef.current = voicePreference; }, [voicePreference]);

    const jobId = searchParams.get('job_id');
    const questionCount = searchParams.get('question_count');
    const jdId = searchParams.get('jd_id');
    const levelSlug = searchParams.get('level_slug');

    useEffect(() => {
        // Hide chatbot widget during voice interview
        const hideChatbot = () => {
            const els = document.querySelectorAll('[class*="chatbot"], [class*="chat-widget"], [id*="chatbot"]');
            els.forEach(el => (el as HTMLElement).style.setProperty('display', 'none', 'important'));
        };
        hideChatbot();
        const chatbotTimer = setTimeout(hideChatbot, 500);

        return () => {
            clearTimeout(chatbotTimer);
            const els = document.querySelectorAll('[class*="chatbot"], [class*="chat-widget"], [id*="chatbot"]');
            els.forEach(el => (el as HTMLElement).style.removeProperty('display'));
        };
    }, []);

    useEffect(() => {
        return () => {
            audioStreamRef.current?.getTracks().forEach(t => t.stop());
            audioRef.current?.pause();
            if (timeUpdateRef.current) clearInterval(timeUpdateRef.current);
            rulesMonitorRef.current?.stopMonitoring();
        };
    }, []);

    // ── 9.4 Session state helpers ─────────────────────────────────────────────

    const saveSessionState = useCallback((
        sid: string,
        question: InterviewQuestion | null,
        prog: InterviewProgress,
        voicePref: 'female' | 'male',
    ) => {
        if (!sid || !question) return;
        try {
            sessionStorage.setItem('voiceInterviewState', JSON.stringify({
                sessionId: sid,
                currentQuestion: question,
                progress: prog,
                voicePreference: voicePref,
            }));
        } catch {
            // non-blocking
        }
    }, []);

    // ── Init ──────────────────────────────────────────────────────────────────

    const initializeInterview = async () => {
        try {
            const saved = sessionStorage.getItem('voiceDeviceConfig');
            if (!saved) {
                setErrorMessage('Không tìm thấy cấu hình thiết bị. Vui lòng quay lại kiểm tra thiết bị.');
                return;
            }
            setDeviceConfig(JSON.parse(saved));

            // Load voice preference từ backend
            try {
                const prefRes = await authFetch('/api/voice/preferences');
                if (prefRes.ok) {
                    const prefData = await prefRes.json();
                    if (prefData.preferred_voice === 'male' || prefData.preferred_voice === 'female') {
                        setVoicePreference(prefData.preferred_voice);
                        voicePreferenceRef.current = prefData.preferred_voice; // sync ref ngay lập tức
                    }
                }
            } catch { /* non-blocking */ }

            // 9.4: Try to restore session state
            try {
                const savedState = sessionStorage.getItem('voiceInterviewState');
                if (savedState) {
                    const state = JSON.parse(savedState);
                    if (state.sessionId && state.currentQuestion) {
                        setSessionId(state.sessionId);
                        setCurrentQuestion(state.currentQuestion);
                        setProgress(state.progress ?? { current: 1, total: 10 });
                        setVoicePreference(state.voicePreference ?? 'female');
                        setCanStartAnswer(true);
                        ttsUnavailableRef.current = true; // khi restore, skip TTS để tránh loop
                        return; // restored — skip fresh session start
                    }
                }
            } catch {
                // non-blocking, fall through to fresh start
            }

            await startInterviewSession();
        } catch {
            setErrorMessage('Không thể khởi tạo phiên phỏng vấn. Vui lòng thử lại.');
        }
    };

    const startInterviewSession = async () => {
        try {
            const formData = new FormData();
            formData.append('job_id', jobId || '1');
            formData.append('question_count', questionCount || '10');
            if (jdId) formData.append('jd_id', jdId);
            if (levelSlug) formData.append('level_slug', levelSlug);
            formData.append('voice_preference', voicePreferenceRef.current); // Fix: gửi voice_preference lên backend

            const res = await authFetch('/api/interview/voice/start', { method: 'POST', body: formData });
            const result = await res.json();

            if (!result.success) throw new Error('Failed to start interview session');

            setSessionId(String(result.session_id));

            // Yêu cầu 6.3: Bắt đầu giám sát sau khi session khởi tạo thành công
            const monitor = new InterviewRulesMonitor({
                onTabSwitch: (count, remaining) => {
                    setTabSwitchWarning({ count, remaining });
                },
                onTerminate: (_reason) => {
                    rulesMonitorRef.current = null;
                    // Xóa session state khi bị hủy
                    try { sessionStorage.removeItem('voiceInterviewState'); } catch { /* noop */ }
                    navigate('/interview/results');
                },
            });
            rulesMonitorRef.current = monitor;
            // Yêu cầu 6.3: Delay 2s để tránh false positive khi page load
            setTimeout(() => {
                monitor.startMonitoring(Number(result.session_id) || 0);
            }, 2000);

            const q: InterviewQuestion = {
                id: result.first_question.id,
                text: result.first_question.text,
                type: result.first_question.type,
                audioUrl: result.question_audio?.audio_url,
                wordTimestamps: result.question_audio?.word_timestamps ?? [],
                durationSeconds: result.question_audio?.duration_seconds ?? result.question_audio?.duration ?? 5,
            };
            setCurrentQuestion(q);
            setProgress({ current: result.progress.current, total: result.progress.total });
            saveSessionState(result.session_id, q, { current: result.progress.current, total: result.progress.total }, voicePreference);

            if (q.audioUrl) {
                await playQuestionAudio(q.audioUrl, q.wordTimestamps, q.durationSeconds);
            } else {
                await fetchAndPlayTTS(q);
            }
        } catch {
            setErrorMessage('Không thể bắt đầu phiên phỏng vấn. Vui lòng thử lại.');
        }
    };

    // ── TTS fetch (Tiêu chí 4.1, 4.2, 4.3) ───────────────────────────────────

    const fetchAndPlayTTS = async (question: InterviewQuestion, overrideVoice?: 'female' | 'male') => {
        // Nếu TTS đã biết không khả dụng, skip và cho phép trả lời ngay
        if (ttsUnavailableRef.current) {
            setIsAISpeaking(false);
            setCanStartAnswer(true);
            return;
        }
        try {
            setIsAISpeaking(true);
            setCanStartAnswer(false);

            const formData = new FormData();
            formData.append('question_text', question.text);
            formData.append('voice_preference', overrideVoice ?? voicePreferenceRef.current); // dùng ref để tránh stale closure
            if (sessionId) formData.append('session_id', sessionId);

            const res = await authFetch('/api/interview/voice/tts', { method: 'POST', body: formData });
            const result = await res.json();

            if (result.success && result.audio_url) {
                ttsUnavailableRef.current = false; // TTS working
                const updatedQ: InterviewQuestion = {
                    ...question,
                    audioUrl: result.audio_url,
                    wordTimestamps: result.word_timestamps ?? [],
                    durationSeconds: result.duration_seconds ?? 5,
                };
                setCurrentQuestion(updatedQ);
                await playQuestionAudio(
                    result.audio_url,
                    result.word_timestamps ?? [],
                    result.duration_seconds ?? 5,
                );
            } else {
                // Tiêu chí 9.2: TTS failure → text-only, cho phép tiếp tục
                ttsUnavailableRef.current = true;
                setIsAISpeaking(false);
                setCanStartAnswer(true);
            }
        } catch {
            ttsUnavailableRef.current = true;
            setIsAISpeaking(false);
            setCanStartAnswer(true);
        }
    };

    // ── Audio playback (Tiêu chí 4.4, 4.5, 4.6, 4.7) ────────────────────────

    const playQuestionAudio = useCallback(async (
        audioUrl: string,
        wordTimestamps: WordTimestamp[] = [],
        durationSeconds: number = 5,
    ) => {
        try {
            // Cleanup previous
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = '';
            }
            if (timeUpdateRef.current) clearInterval(timeUpdateRef.current);
            setAudioCurrentTimeMs(0);

            const audio = new Audio(audioUrl);
            audioRef.current = audio;

            // Tiêu chí 4.4: phát qua loa đã chọn ở Device_Test_Page
            const config = JSON.parse(sessionStorage.getItem('voiceDeviceConfig') || '{}');
            if ('setSinkId' in audio && config?.speakerId) {
                try {
                    await (audio as any).setSinkId(config.speakerId);
                } catch {
                    // setSinkId không được hỗ trợ trên mọi browser — không block
                }
            }

            audio.onplay = () => {
                setIsAISpeaking(true);
                // Tiêu chí 4.6: cập nhật currentTime để highlight từng từ
                if (wordTimestamps.length > 0) {
                    timeUpdateRef.current = setInterval(() => {
                        setAudioCurrentTimeMs(Math.round((audio.currentTime ?? 0) * 1000));
                    }, 50);
                }
            };

            // Tiêu chí 4.7: kích hoạt nút "Bắt đầu trả lời" khi audio phát xong
            audio.onended = () => {
                setIsAISpeaking(false);
                setCanStartAnswer(true);
                setAudioCurrentTimeMs(0);
                if (timeUpdateRef.current) clearInterval(timeUpdateRef.current);
            };

            audio.onerror = () => {
                setIsAISpeaking(false);
                setCanStartAnswer(true);
                if (timeUpdateRef.current) clearInterval(timeUpdateRef.current);
            };

            await audio.play();
        } catch {
            setIsAISpeaking(false);
            setCanStartAnswer(true);
        }
    }, []);

    // ── Recording (Tiêu chí 3.1 → 3.9) ──────────────────────────────────────

    const startRecording = async () => {
        setErrorMessage('');
        const config = deviceConfig ?? JSON.parse(sessionStorage.getItem('voiceDeviceConfig') || '{}');
        if (!config?.microphoneId) {
            setErrorMessage('Không tìm thấy cấu hình microphone.');
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { deviceId: { exact: config.microphoneId } },
            });
            audioStreamRef.current = stream;

            // 9.5: Microphone disconnect detection
            stream.getTracks().forEach(track => {
                track.onended = () => {
                    if (isRecordingRef.current) {
                        stopRecording();
                        setErrorMessage('Microphone bị ngắt kết nối. Vui lòng kiểm tra lại thiết bị.');
                    }
                };
            });

            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];

            recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
            recorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                processUserAnswer(blob);
                audioStreamRef.current?.getTracks().forEach(t => t.stop());
                audioStreamRef.current = null;
            };

            recorder.start(100); // timeslice 100ms ensures chunks even for short recordings
            setIsRecording(true);
            isRecordingRef.current = true;
            recordingStartTimeRef.current = Date.now();
        } catch {
            setErrorMessage('Không thể bắt đầu ghi âm. Vui lòng kiểm tra microphone.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecordingRef.current) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            isRecordingRef.current = false;
        }
    };

    const processUserAnswer = async (audioBlob: Blob) => {
        setErrorMessage('');
        const durationSeconds = recordingStartTimeRef.current
            ? Math.round((Date.now() - recordingStartTimeRef.current) / 1000)
            : undefined;
        try {
            const formData = new FormData();
            formData.append('session_id', sessionId);
            formData.append('audio_file', audioBlob, 'user_answer.webm');
            if (durationSeconds !== undefined) {
                formData.append('audio_duration', String(durationSeconds));
            }
            // Chỉ gửi message_id khi là số hợp lệ (không phải "q1" fallback)
            if (currentQuestion?.id && /^\d+$/.test(currentQuestion.id)) {
                formData.append('message_id', currentQuestion.id);
            }

            // 9.1: Network retry with exponential backoff
            const uploadWithRetry = async (fd: FormData, maxRetries = 3): Promise<Response> => {
                for (let attempt = 0; attempt < maxRetries; attempt++) {
                    try {
                        return await authFetch('/api/interview/voice/answer', { method: 'POST', body: fd });
                    } catch (err) {
                        if (attempt === maxRetries - 1) throw err;
                        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
                    }
                }
                throw new Error('Max retries exceeded');
            };

            const res = await uploadWithRetry(formData);
            const result = await res.json();

            if (!result.success) {
                // 9.3: Track STT failures and show text fallback after 3 attempts
                const isSTTError = result.message?.toLowerCase().includes('stt') ||
                    result.message?.toLowerCase().includes('speech') ||
                    result.message?.toLowerCase().includes('transcri') ||
                    result.error_type === 'stt_error';
                if (isSTTError) {
                    setSttRetryCount(prev => {
                        const next = prev + 1;
                        if (next >= 3) setShowTextFallback(true);
                        return next;
                    });
                }
                setErrorMessage(result.message || 'Lỗi xử lý câu trả lời. Vui lòng thử lại.');
                return;
            }

            if (result.ai_response?.next_question) {
                const nq = result.ai_response.next_question;
                const nextQ: InterviewQuestion = {
                    id: nq.id,
                    text: nq.text,
                    type: nq.type,
                    audioUrl: result.next_question_audio?.audio_url,
                    wordTimestamps: result.next_question_audio?.word_timestamps ?? [],
                    durationSeconds: result.next_question_audio?.duration_seconds ?? result.next_question_audio?.duration ?? 5,
                };
                const nextProgress = result.ai_response.progress
                    ? { current: result.ai_response.progress.current, total: result.ai_response.progress.total }
                    : progress;
                setCurrentQuestion(nextQ);
                if (result.ai_response.progress) {
                    setProgress(nextProgress);
                }
                // 9.4: Save state after each question
                saveSessionState(sessionId, nextQ, nextProgress, voicePreference);
                // Reset STT retry on success
                setSttRetryCount(0);
                setShowTextFallback(false);

                if (nextQ.audioUrl) {
                    await playQuestionAudio(nextQ.audioUrl, nextQ.wordTimestamps, nextQ.durationSeconds);
                } else {
                    await fetchAndPlayTTS(nextQ);
                }
            } else if (result.ai_response?.status === 'completed') {
                // Phỏng vấn hoàn thành — xóa state và navigate đến kết quả
                try { sessionStorage.removeItem('voiceInterviewState'); } catch { /* noop */ }
                rulesMonitorRef.current?.stopMonitoring();
                if (document.fullscreenElement) {
                    document.exitFullscreen().catch(() => { });
                }
                navigate(`/interview/results/${sessionId}`);
            }
        } catch {
            setErrorMessage('Không thể xử lý câu trả lời. Vui lòng kiểm tra kết nối mạng và thử lại.');
        }
    };

    // 9.3: Text fallback submit
    const handleTextFallbackSubmit = async () => {
        if (!textFallbackValue.trim()) return;
        setErrorMessage('');
        try {
            const formData = new FormData();
            formData.append('session_id', sessionId);
            formData.append('text_answer', textFallbackValue.trim());
            // Chỉ gửi message_id khi là số hợp lệ
            if (currentQuestion?.id && /^\d+$/.test(currentQuestion.id)) {
                formData.append('message_id', currentQuestion.id);
            }

            const res = await authFetch('/api/interview/voice/answer', { method: 'POST', body: formData });
            const result = await res.json();

            if (!result.success) {
                setErrorMessage(result.message || 'Lỗi gửi câu trả lời. Vui lòng thử lại.');
                return;
            }

            setTextFallbackValue('');
            setShowTextFallback(false);
            setSttRetryCount(0);

            if (result.ai_response?.next_question) {
                const nq = result.ai_response.next_question;
                const nextQ: InterviewQuestion = {
                    id: nq.id,
                    text: nq.text,
                    type: nq.type,
                    audioUrl: result.next_question_audio?.audio_url,
                    wordTimestamps: result.next_question_audio?.word_timestamps ?? [],
                    durationSeconds: result.next_question_audio?.duration_seconds ?? result.next_question_audio?.duration ?? 5,
                };
                const nextProgress = result.ai_response.progress
                    ? { current: result.ai_response.progress.current, total: result.ai_response.progress.total }
                    : progress;
                setCurrentQuestion(nextQ);
                if (result.ai_response.progress) setProgress(nextProgress);
                saveSessionState(sessionId, nextQ, nextProgress, voicePreference);

                if (nextQ.audioUrl) {
                    await playQuestionAudio(nextQ.audioUrl, nextQ.wordTimestamps, nextQ.durationSeconds);
                } else {
                    await fetchAndPlayTTS(nextQ);
                }
            } else if (result.ai_response?.status === 'completed') {
                try { sessionStorage.removeItem('voiceInterviewState'); } catch { /* noop */ }
                rulesMonitorRef.current?.stopMonitoring();
                if (document.fullscreenElement) {
                    document.exitFullscreen().catch(() => { });
                }
                navigate(`/interview/results/${sessionId}`);
            }
        } catch {
            setErrorMessage('Không thể gửi câu trả lời. Vui lòng kiểm tra kết nối mạng.');
        }
    };

    const handleVoicePreferenceChange = async (pref: 'female' | 'male') => {
        if (pref === voicePreference) return;
        setVoicePreference(pref);
        voicePreferenceRef.current = pref; // sync ref ngay lập tức

        // Persist preference lên backend (non-blocking)
        authFetch('/api/voice/preferences', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ preferred_voice: pref }),
        }).catch(() => { /* non-blocking */ });

        // Nếu AI đang không nói và không đang ghi → replay câu hỏi hiện tại với giọng mới
        if (!isAISpeaking && !isRecording && currentQuestion) {
            await fetchAndPlayTTS({ ...currentQuestion, audioUrl: undefined }, pref);
        }
    };

    // Yêu cầu 6.1, 6.2: Xử lý xác nhận/hủy quy tắc
    const handleRulesConfirm = () => {
        setShowRulesModal(false);
        initializeInterview();
    };

    const handleRulesCancel = () => {
        // Thoát fullscreen nếu đang ở fullscreen
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => { });
        }
        navigate('/interview/device-test');
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>

            {/* Ambient background orbs */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20"
                    style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)', filter: 'blur(40px)' }} />
                <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-20"
                    style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)', filter: 'blur(40px)' }} />
            </div>

            {/* Yêu cầu 6.1, 6.2: Rules Modal */}
            {showRulesModal && (
                <RulesModal
                    onConfirm={handleRulesConfirm}
                    onCancel={handleRulesCancel}
                />
            )}

            {/* Yêu cầu 6.8: Tab switch warning */}
            {tabSwitchWarning && (
                <div
                    className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-amber-500/90 backdrop-blur-sm rounded-xl px-5 py-2.5 shadow-xl border border-amber-400/50"
                    data-testid="tab-switch-warning"
                >
                    <span className="text-white text-sm font-semibold">
                        ⚠️ Cảnh báo: {tabSwitchWarning.count}/3 lần chuyển tab
                    </span>
                </div>
            )}

            {/* ── Top bar ── */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-5 py-4">
                {/* Progress pill */}
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-4 py-2 border border-white/20">
                    <div className="flex gap-1">
                        {Array.from({ length: Math.min(progress.total, 15) }).map((_, i) => (
                            <div key={i}
                                className={`h-1.5 rounded-full transition-all duration-300 ${i < progress.current ? 'bg-indigo-400 w-4' : 'bg-white/20 w-2'
                                    }`} />
                        ))}
                    </div>
                    <span className="text-white/80 text-xs font-medium ml-1" data-testid="progress-indicator">
                        {progress.current}/{progress.total}
                    </span>
                </div>

                {/* Voice selector + question type */}
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-500/80 backdrop-blur-sm rounded-full px-3 py-1.5 border border-indigo-400/40">
                        <span className="text-white text-xs font-semibold" data-testid="question-type">
                            {currentQuestion?.type || '...'}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md rounded-full px-3 py-2 border border-white/20">
                        <span className="text-white/50 text-xs">Giọng:</span>
                        <button
                            onClick={() => handleVoicePreferenceChange('female')}
                            type="button"
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${voicePreference === 'female'
                                ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/30'
                                : 'text-white/60 hover:text-white hover:bg-white/10'
                                }`}
                            data-testid="voice-female-btn"
                        >Nữ</button>
                        <button
                            onClick={() => handleVoicePreferenceChange('male')}
                            type="button"
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${voicePreference === 'male'
                                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                : 'text-white/60 hover:text-white hover:bg-white/10'
                                }`}
                            data-testid="voice-male-btn"
                        >Nam</button>
                    </div>
                </div>
            </div>

            {/* ── Main content ── */}
            <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 pt-20 pb-16">

                {/* Question bubble */}
                <QuestionBubble
                    question={currentQuestion}
                    isAISpeaking={isAISpeaking}
                    audioCurrentTimeMs={audioCurrentTimeMs}
                />

                {/* ── Avatar ── */}
                <div className="relative mb-6 flex items-center justify-center" data-testid="ai-avatar">
                    {isAISpeaking && (
                        <>
                            <div className="absolute w-52 h-52 rounded-full border border-indigo-400/20 animate-ping"
                                style={{ animationDuration: '2s' }} data-testid="avatar-ripple-1" />
                            <div className="absolute w-44 h-44 rounded-full border border-purple-400/30 animate-ping"
                                style={{ animationDuration: '1.5s', animationDelay: '0.3s' }} data-testid="avatar-ripple-2" />
                            <div className="absolute w-36 h-36 rounded-full border border-blue-400/40 animate-ping"
                                style={{ animationDuration: '1s', animationDelay: '0.6s' }} />
                        </>
                    )}
                    <div className={`relative w-28 h-28 rounded-full flex items-center justify-center shadow-2xl ${isRecording ? 'opacity-60' : 'opacity-100'
                        }`}
                        style={{
                            background: isAISpeaking
                                ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)'
                                : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                            boxShadow: isAISpeaking
                                ? '0 0 40px rgba(99,102,241,0.6), 0 0 80px rgba(139,92,246,0.3)'
                                : '0 8px 32px rgba(79,70,229,0.4)',
                            transform: isRecording ? 'scale(0.9)' : undefined,
                            transition: 'opacity 0.5s, transform 0.5s',
                            animation: isAISpeaking ? 'avatarPulse 1.2s ease-in-out infinite' : 'none',
                        }}>
                        {isAISpeaking ? (
                            <div className="flex items-end gap-0.5">
                                {[0.5, 0.9, 0.6, 1, 0.7, 0.9, 0.5].map((h, i) => (
                                    <div key={i} className="w-1.5 bg-white rounded-full"
                                        style={{
                                            height: `${h * 28}px`,
                                            animation: `soundBar 0.7s ease-in-out infinite alternate`,
                                            animationDelay: `${i * 0.1}s`,
                                        }} />
                                ))}
                            </div>
                        ) : (
                            <svg viewBox="0 0 24 24" className="w-12 h-12 text-white/90" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                            </svg>
                        )}
                    </div>
                </div>

                {/* Status label */}
                <div className="mb-8 h-6 flex items-center justify-center">
                    {isAISpeaking && (
                        <div className="flex items-center gap-2 text-indigo-300 text-sm font-medium"
                            data-testid="ai-speaking-indicator">
                            <span className="flex gap-0.5">
                                {[0, 1, 2].map(i => (
                                    <span key={i} className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"
                                        style={{ animationDelay: `${i * 0.15}s` }} />
                                ))}
                            </span>
                            AI đang đọc câu hỏi
                        </div>
                    )}
                    {isRecording && (
                        <div className="flex items-center gap-2 text-red-400 text-sm font-medium"
                            data-testid="recording-indicator">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            Đang ghi âm câu trả lời
                        </div>
                    )}
                    {!isAISpeaking && !isRecording && canStartAnswer && (
                        <p className="text-white/40 text-sm">Nhấn để bắt đầu trả lời</p>
                    )}
                </div>

                {/* ── Recording controls ── */}
                <div className="flex flex-col items-center gap-4">
                    {!isRecording ? (
                        <>
                            <button
                                onClick={startRecording}
                                type="button"
                                disabled={!canStartAnswer || isAISpeaking}
                                className="group relative w-20 h-20 rounded-full transition-all duration-300 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                style={{
                                    background: canStartAnswer && !isAISpeaking
                                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                        : 'rgba(255,255,255,0.08)',
                                    boxShadow: canStartAnswer && !isAISpeaking
                                        ? '0 0 0 0 rgba(16,185,129,0.4), 0 8px 24px rgba(16,185,129,0.3)'
                                        : 'none',
                                }}
                                data-testid="start-answer-btn"
                            >
                                {canStartAnswer && !isAISpeaking && (
                                    <span className="absolute inset-0 rounded-full bg-green-400/20 scale-0 group-hover:scale-125 transition-transform duration-300" />
                                )}
                                <svg viewBox="0 0 24 24" className="w-8 h-8 text-white mx-auto relative z-10" fill="currentColor">
                                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                                </svg>
                            </button>
                            <span className={`text-sm font-medium ${canStartAnswer && !isAISpeaking ? 'text-green-400' : 'text-white/30'}`}>
                                {canStartAnswer && !isAISpeaking ? 'Bắt đầu trả lời' : 'Chờ AI đọc xong...'}
                            </span>
                        </>
                    ) : (
                        <div className="flex flex-col items-center gap-4">
                            <button
                                onClick={stopRecording}
                                type="button"
                                className="relative w-20 h-20 rounded-full cursor-pointer"
                                style={{
                                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                    animation: 'micGlow 1.5s ease-in-out infinite',
                                }}
                                data-testid="stop-answer-btn"
                            >
                                <svg viewBox="0 0 24 24" className="w-8 h-8 text-white mx-auto" fill="currentColor">
                                    <path d="M6 6h12v12H6z" />
                                </svg>
                            </button>
                            <div className="flex items-end gap-0.5" data-testid="recording-visual-indicator">
                                {[0.4, 0.7, 1, 0.6, 0.9, 0.5, 0.8, 0.4, 0.7, 1, 0.6].map((h, i) => (
                                    <div key={i} className="w-1 bg-red-400 rounded-full"
                                        style={{
                                            height: `${h * 24}px`,
                                            animation: `soundBar 0.6s ease-in-out infinite alternate`,
                                            animationDelay: `${i * 0.07}s`,
                                        }} />
                                ))}
                            </div>
                            <RecordingTimer isRecording={isRecording} />
                        </div>
                    )}
                </div>

                {/* STT text fallback */}
                {showTextFallback && (
                    <div className="w-full max-w-[700px] mt-8" data-testid="text-fallback-input">
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20">
                            <p className="text-white/70 text-sm mb-3">
                                Không thể nhận dạng giọng nói. Nhập câu trả lời bằng văn bản:
                            </p>
                            <textarea
                                data-testid="fallback-textarea"
                                value={textFallbackValue}
                                onChange={e => setTextFallbackValue(e.target.value)}
                                className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder-white/30"
                                rows={4}
                                placeholder="Nhập câu trả lời của bạn..."
                            />
                            <button
                                data-testid="fallback-submit-btn"
                                onClick={handleTextFallbackSubmit}
                                type="button"
                                className="mt-3 bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-6 rounded-xl transition-colors cursor-pointer text-sm"
                            >
                                Gửi câu trả lời
                            </button>
                        </div>
                    </div>
                )}

                {/* Error message */}
                {errorMessage && (
                    <div className="fixed bottom-20 left-4 right-4 max-w-[700px] mx-auto bg-red-500/90 backdrop-blur-sm rounded-2xl p-4 shadow-xl z-20 border border-red-400/50">
                        <div className="flex items-center gap-3">
                            <span className="text-white text-lg">⚠️</span>
                            <span className="text-white text-sm font-medium" data-testid="error-message">{errorMessage}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Back button */}
            <div className="absolute bottom-5 left-5 z-30">
                <button
                    onClick={() => {
                        if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
                        navigate('/interview/device-test');
                    }}
                    type="button"
                    className="flex items-center gap-2 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white/70 hover:text-white text-sm font-medium py-2 px-4 rounded-full border border-white/20 transition-all duration-200 cursor-pointer"
                    data-testid="back-btn"
                >
                    ← Quay lại
                </button>
            </div>

            {/* CSS keyframes */}
            <style>{`
                @keyframes avatarPulse {
                    0%,100% { transform: scale(1.1);  box-shadow: 0 0 40px rgba(99,102,241,0.6), 0 0 80px rgba(139,92,246,0.3); }
                    50%     { transform: scale(1.18); box-shadow: 0 0 60px rgba(99,102,241,0.8), 0 0 100px rgba(139,92,246,0.4); }
                }
                @keyframes soundBar {
                    from { transform: scaleY(0.3); opacity: 0.6; }
                    to   { transform: scaleY(1);   opacity: 1; }
                }
                @keyframes micGlow {
                    0%,100% { box-shadow: 0 0 0 8px rgba(239,68,68,0.15), 0 0 0 16px rgba(239,68,68,0.08), 0 8px 24px rgba(239,68,68,0.4); }
                    50%     { box-shadow: 0 0 0 14px rgba(239,68,68,0.2), 0 0 0 28px rgba(239,68,68,0.08), 0 8px 32px rgba(239,68,68,0.5); }
                }
            `}</style>
        </div>
    );
};

export default VoiceInterviewPage;

