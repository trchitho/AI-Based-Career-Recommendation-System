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
    // DISABLED: Hiển thị text ngay lập tức để đồng bộ với audio
    useEffect(() => {
        if (!question) return;
        // Luôn hiển thị full text ngay lập tức
        setVisibleChars(question.text.length);
    }, [question?.id, question?.text]);

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
// Utility: convert any audio Blob → 16kHz mono WAV via WebAudio API
// No ffmpeg needed — browser handles webm/opus decoding natively.
// ─────────────────────────────────────────────────────────────────────────────

async function blobToWav16k(blob: Blob): Promise<Blob> {
    const SR = 16000;
    const ctx = new AudioContext({ sampleRate: SR });
    try {
        const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
        const samples = decoded.getChannelData(0);
        const n = samples.length;
        const buf = new ArrayBuffer(44 + n * 2);
        const v = new DataView(buf);
        const ws = (o: number, s: string) => s.split('').forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
        ws(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true);
        ws(8, 'WAVE'); ws(12, 'fmt '); v.setUint32(16, 16, true);
        v.setUint16(20, 1, true); v.setUint16(22, 1, true);
        v.setUint32(24, SR, true); v.setUint32(28, SR * 2, true);
        v.setUint16(32, 2, true); v.setUint16(34, 16, true);
        ws(36, 'data'); v.setUint32(40, n * 2, true);
        for (let i = 0; i < n; i++) {
            const s = Math.max(-1, Math.min(1, samples[i]));
            v.setInt16(44 + i * 2, s < 0 ? s * 32768 : s * 32767, true);
        }
        return new Blob([buf], { type: 'audio/wav' });
    } finally {
        await ctx.close();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// VoiceInterviewPage
// ─────────────────────────────────────────────────────────────────────────────

const VoiceInterviewPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [showRulesModal, setShowRulesModal] = useState(true);
    const [showExitModal, setShowExitModal] = useState(false);
    const [deviceConfig, setDeviceConfig] = useState<VoiceDeviceConfig | null>(null);
    const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion | null>(null);
    // pendingQuestion: câu hỏi đã fetch nhưng chưa hiển thị — chỉ show khi audio bắt đầu phát
    const [pendingQuestion, setPendingQuestion] = useState<InterviewQuestion | null>(null);
    const [progress, setProgress] = useState<InterviewProgress>({ current: 1, total: 10 });
    const [isAISpeaking, setIsAISpeaking] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [canStartAnswer, setCanStartAnswer] = useState(false);
    const [isLoadingQuestion, setIsLoadingQuestion] = useState(true); // Loading state for first question
    // Read gender from sessionStorage once at mount (set by InterviewSelectionPage)
    const [voicePreference, setVoicePreference] = useState<'female' | 'male'>(() => {
        const saved = sessionStorage.getItem('interviewerGender');
        return (saved === 'male' || saved === 'female') ? saved : 'female';
    });
    const [sessionId, setSessionId] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [audioCurrentTimeMs, setAudioCurrentTimeMs] = useState(0);
    const [tabSwitchWarning, setTabSwitchWarning] = useState<{ count: number; remaining: number } | null>(null);
    // 9.3 STT fallback
    const [showTextFallback, setShowTextFallback] = useState(false);
    const [sttRetryCount, setSttRetryCount] = useState(0);
    const [textFallbackValue, setTextFallbackValue] = useState('');
    // Live transcript: confirmed (final) + interim (đang dự đoán)
    const [liveTranscript, setLiveTranscript] = useState('');       // confirmed text
    const [interimTranscript, setInterimTranscript] = useState(''); // current interim
    const [isEditingTranscript, setIsEditingTranscript] = useState(false); // edit mode
    const liveTranscriptRef = useRef('');
    const chunkSttTimerRef = useRef<any>(null);
    const chunkAccumRef = useRef<Blob[]>([]);
    const wsSTTRef = useRef<WebSocket | null>(null);  // WebSocket for realtime STT
    const recognitionRef = useRef<any>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);  // AI interviewer video

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioStreamRef = useRef<MediaStream | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timeUpdateRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const rulesMonitorRef = useRef<InterviewRulesMonitor | null>(null);
    const isRecordingRef = useRef(false);
    const ttsUnavailableRef = useRef(false);
    const recordingStartTimeRef = useRef<number>(0);
    const voicePreferenceRef = useRef<'female' | 'male'>(
        (() => { const s = sessionStorage.getItem('interviewerGender'); return (s === 'male' || s === 'female') ? s : 'female'; })()
    );
    // AudioContext — unlocked permanently once resumed during user gesture
    const audioCtxRef = useRef<AudioContext | null>(null);
    const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
    // Fallback: unlocked <audio> element
    const unlockedAudioRef = useRef<HTMLAudioElement | null>(null);

    // Sync voicePreference state → ref
    useEffect(() => { voicePreferenceRef.current = voicePreference; }, [voicePreference]);

    // Reveal pending question text only when audio starts playing
    useEffect(() => {
        if (isAISpeaking && pendingQuestion) {
            setCurrentQuestion(pendingQuestion);
            setPendingQuestion(null);
        }
    }, [isAISpeaking, pendingQuestion]);

    // Control AI interviewer video: play when speaking, pause when done
    useEffect(() => {
        const vid = videoRef.current;
        if (!vid) return;
        if (isAISpeaking) {
            vid.currentTime = 0;
            vid.play().catch(() => { /* autoplay policy — video will show static image */ });
        } else {
            vid.pause();
            vid.currentTime = 0;
        }
    }, [isAISpeaking]);

    const jobId = searchParams.get('job_id');
    const questionCount = searchParams.get('question_count');
    const jdId = searchParams.get('jd_id');
    const levelSlug = searchParams.get('level_slug');
    const skillGapAnalysisId = searchParams.get('skill_gap_analysis_id');

    // Preload Web Speech API voices (async on first call)
    useEffect(() => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.getVoices();
            window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
        }
    }, []);

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
            // Reset TTS availability
            ttsUnavailableRef.current = false;

            // Clear old session state
            try { sessionStorage.removeItem('voiceInterviewState'); } catch { }

            const saved = sessionStorage.getItem('voiceDeviceConfig');
            if (!saved) {
                setErrorMessage('Không tìm thấy cấu hình thiết bị. Vui lòng quay lại kiểm tra thiết bị.');
                return;
            }
            setDeviceConfig(JSON.parse(saved));

            // Voice preference: use current state (defaults to 'female')
            // DO NOT read from sessionStorage — it may contain stale 'male' from previous session
            // The voicePreference state defaults to 'female' and can only change via UI toggle
            console.log('[VoiceInterview] Starting with voice:', voicePreferenceRef.current);

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
            if (skillGapAnalysisId) formData.append('skill_gap_analysis_id', skillGapAnalysisId);
            formData.append('voice_preference', voicePreferenceRef.current);

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
            // Use pendingQuestion — text will only reveal when audio starts playing
            setPendingQuestion(q);
            setProgress({ current: result.progress.current, total: result.progress.total });
            saveSessionState(result.session_id, q, { current: result.progress.current, total: result.progress.total }, voicePreference);

            await fetchAndPlayTTS(q);
        } catch {
            setErrorMessage('Không thể bắt đầu phiên phỏng vấn. Vui lòng thử lại.');
        }
    };

    // ── TTS fetch (Tiêu chí 4.1, 4.2, 4.3) ───────────────────────────────────

    const fetchAndPlayTTS = async (question: InterviewQuestion, overrideVoice?: 'female' | 'male') => {
        setIsAISpeaking(true);
        setCanStartAnswer(false);

        const voiceToUse = overrideVoice ?? voicePreferenceRef.current;
        console.log('[TTS] Requesting voice:', voiceToUse, '| sessionId:', sessionId);
        try {
            const formData = new FormData();
            formData.append('question_text', question.text);
            formData.append('voice_preference', voiceToUse);
            if (sessionId) formData.append('session_id', sessionId);

            const res = await authFetch('/api/interview/voice/tts', { method: 'POST', body: formData });
            const result = await res.json();

            if (result.success && result.audio_url) {
                ttsUnavailableRef.current = false;
                const updatedQ: InterviewQuestion = {
                    ...question,
                    audioUrl: result.audio_url,
                    wordTimestamps: result.word_timestamps ?? [],
                    durationSeconds: result.duration_seconds ?? 5,
                };
                // Set as pending — text reveals when audio starts (isAISpeaking=true)
                setPendingQuestion(updatedQ);
                
                // Turn off loading spinner before playing audio
                setIsLoadingQuestion(false);
                
                await playQuestionAudio(
                    result.audio_url,
                    result.word_timestamps ?? [],
                    result.duration_seconds ?? 5,
                    question.text,
                );
            } else {
                // Server TTS failed → fallback to browser TTS
                ttsUnavailableRef.current = true;
                setIsLoadingQuestion(false);
                speakWithBrowser(question.text, () => {});
            }
        } catch {
            // Network error → fallback to browser TTS
            ttsUnavailableRef.current = true;
            setIsLoadingQuestion(false);
            speakWithBrowser(question.text, () => {});
        }
    };

    // ── Audio playback (Tiêu chí 4.4, 4.5, 4.6, 4.7) ────────────────────────

    // Simulate speaking for durationSeconds (used as fallback when audio is blocked)
    const simulateSpeaking = useCallback((durationSeconds: number) => {
        setIsAISpeaking(true);
        setCanStartAnswer(false);
        const timer = setTimeout(() => {
            setIsAISpeaking(false);
            setCanStartAnswer(true);
        }, Math.max(durationSeconds, 3) * 1000);
        return timer;
    }, []);

    // Speak text using browser Web Speech API (fallback TTS)
    const speakWithBrowser = useCallback((text: string, onEnd: () => void) => {
        if (!('speechSynthesis' in window)) { onEnd(); return; }
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'vi-VN';
        utter.rate = 0.92;
        utter.pitch = voicePreferenceRef.current === 'female' ? 1.1 : 0.9;

        // Pick Vietnamese voice matching gender preference
        const voices = window.speechSynthesis.getVoices();
        const viVoices = voices.filter(v => v.lang.startsWith('vi'));
        const isFemale = voicePreferenceRef.current === 'female';
        const matchedVoice = viVoices.find(v => {
            const n = v.name.toLowerCase();
            return isFemale
                ? (n.includes('female') || n.includes('hoai') || n.includes('nu') || n.includes('f'))
                : (n.includes('male') || n.includes('nam') || n.includes('m'));
        }) || viVoices[0] || voices.find(v => v.lang.startsWith('en'));
        if (matchedVoice) utter.voice = matchedVoice;

        utter.onstart = () => setIsAISpeaking(true);
        utter.onend   = () => { setIsAISpeaking(false); setCanStartAnswer(true); onEnd(); };
        utter.onerror = () => { setIsAISpeaking(false); setCanStartAnswer(true); onEnd(); };
        window.speechSynthesis.speak(utter);
    }, []);

    const playQuestionAudio = useCallback(async (
        audioUrl: string,
        wordTimestamps: WordTimestamp[] = [],
        durationSeconds: number = 5,
        questionText: string = '',
    ) => {
        // Stop previous audio
        if (currentSourceRef.current) {
            try { currentSourceRef.current.stop(); } catch { /* ignore */ }
            currentSourceRef.current = null;
        }
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
        }
        if (timeUpdateRef.current) clearInterval(timeUpdateRef.current);
        setAudioCurrentTimeMs(0);
        setIsAISpeaking(true);

        // ── Method 1: Unlocked <audio> element (best MP3 compatibility) ──
        try {
            const audio = unlockedAudioRef.current ?? new Audio();
            unlockedAudioRef.current = audio;
            audio.pause();
            audio.currentTime = 0;
            audio.src = audioUrl;
            audio.load();
            audioRef.current = audio;
            audio.onended = () => {
                setIsAISpeaking(false);
                setCanStartAnswer(true);
                setAudioCurrentTimeMs(0);
            };
            audio.onerror = () => {
                setIsAISpeaking(false);
                setCanStartAnswer(true);
            };
            await audio.play();
            console.log('[TTS] Playing via <audio> element, voice:', voicePreferenceRef.current);
            return;
        } catch (e) {
            console.warn('[TTS] <audio>.play() failed:', e);
        }

        // ── Method 2: AudioContext ──
        const ctx = audioCtxRef.current;
        if (ctx) {
            try {
                await ctx.resume();
                const response = await fetch(audioUrl);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                currentSourceRef.current = source;
                source.onended = () => {
                    setIsAISpeaking(false);
                    setCanStartAnswer(true);
                };
                source.start(0);
                console.log('[TTS] Playing via AudioContext, duration:', audioBuffer.duration.toFixed(1) + 's');
                return;
            } catch (e) {
                console.warn('[TTS] AudioContext failed:', e);
            }
        }

        // ── Method 3: Web Speech API (with correct gender) ──
        if (questionText && 'speechSynthesis' in window) {
            console.log('[TTS] Falling back to Web Speech API, gender:', voicePreferenceRef.current);
            speakWithBrowser(questionText, () => {});
            return;
        }

        // ── Method 4: Simulate ──
        console.log('[TTS] Simulating speaking for', durationSeconds, 's');
        simulateSpeaking(durationSeconds);
    }, [simulateSpeaking, speakWithBrowser]);

    // ── Recording (Tiêu chí 3.1 → 3.9) ──────────────────────────────────────

    // Live STT: Deepgram SDK WebSocket — interim_results → từng từ real-time.
    // Fallback: HTTP polling nếu WebSocket fail.
    const startLiveSTT = useCallback((stream: MediaStream) => {
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token') || '';
        const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const dgUrl = `${wsProto}//${window.location.host}/ws/deepgram-stt?lang=vi${token ? `&token=${encodeURIComponent(token)}` : ''}`;

        let dgReady = false;
        let chunkRec: MediaRecorder | null = null;
        const dgWs = new WebSocket(dgUrl);
        wsSTTRef.current = dgWs;

        dgWs.onopen = () => console.log('[DG-WS] Connected');

        dgWs.onmessage = (ev) => {
            try {
                const msg = JSON.parse(ev.data as string);
                console.log('[DG-WS] Received message:', msg.type, msg);
                
                if (msg.type === 'ready') {
                    dgReady = true;
                    console.log('[DG-WS] Deepgram ready ✓ - Starting audio stream...');
                    
                    // Start streaming audio ONLY after Deepgram is ready
                    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                        ? 'audio/webm;codecs=opus'
                        : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';

                    console.log('[DG-WS] Using audio format:', mimeType || 'default');

                    chunkRec = new MediaRecorder(stream, mimeType ? { mimeType } : {});
                    let chunkCount = 0;
                    let totalBytes = 0;
                    
                    chunkRec.ondataavailable = async (ev) => {
                        if (ev.data.size < 50 || dgWs.readyState !== WebSocket.OPEN) return;
                        try { 
                            chunkCount++;
                            totalBytes += ev.data.size;
                            await dgWs.send(await ev.data.arrayBuffer()); 
                            if (chunkCount % 10 === 0) {
                                console.log(`[DG-WS] Sent ${chunkCount} chunks (${totalBytes} bytes total)`);
                            }
                        } catch (e) {
                            console.error('[DG-WS] Failed to send audio chunk:', e);
                        }
                    };
                    chunkRec.start(100); // 100ms chunks
                    (chunkAccumRef as any)._liveRecorder = chunkRec;
                    console.log('[STT] Deepgram SDK streaming started (100ms chunks)');
                    
                } else if (msg.type === 'transcript') {
                    const text = msg.text || '';
                    const accumulated = msg.accumulated || '';
                    const isFinal = msg.is_final;
                    
                    console.log(`[DG-WS] ${isFinal ? 'FINAL' : 'INTERIM'} transcript:`, text.slice(0, 50));
                    
                    if (isFinal) {
                        // Final: update confirmed text, clear interim
                        setLiveTranscript(accumulated);
                        liveTranscriptRef.current = accumulated;
                        setInterimTranscript('');
                        console.log('[DG-WS] ✓ Final transcript saved:', accumulated.slice(0, 80));
                    } else {
                        // Interim: only update preview
                        setInterimTranscript(text);
                        console.log('[DG-WS] → Interim preview:', text.slice(0, 80));
                    }
                } else if (msg.type === 'error') {
                    console.error('[DG-WS] Error from server:', msg.message);
                    setErrorMessage(`Lỗi STT: ${msg.message}`);
                    if (!dgReady) startHttpSTT(stream);
                }
            } catch (e) {
                console.error('[DG-WS] Failed to parse message:', e);
            }
        };

        dgWs.onerror = (err) => {
            console.error('[DG-WS] WebSocket error:', err);
            setErrorMessage('Lỗi kết nối Deepgram. Đang chuyển sang phương thức dự phòng...');
            if (!dgReady) { 
                console.warn('[DG-WS] fail → HTTP fallback'); 
                startHttpSTT(stream); 
            }
        };
        
        dgWs.onclose = (ev) => { 
            dgReady = false; 
            console.log('[DG-WS] Connection closed:', ev.code, ev.reason);
            
            // Only show error if NOT user-initiated close or timeout
            // 1000 = normal, 1001 = going away, 1005 = no status, 1011 = Deepgram timeout
            if (ev.code !== 1000 && ev.code !== 1001 && ev.code !== 1005 && ev.code !== 1011) {
                // Abnormal closure (1006 = connection lost)
                if (ev.code === 1006) {
                    console.error('[DG-WS] Connection lost (1006) - Deepgram may have timed out');
                    setErrorMessage('Kết nối Deepgram bị mất. Đang chuyển sang phương thức dự phòng...');
                    // Auto fallback to HTTP STT
                    if (isRecordingRef.current) {
                        console.log('[DG-WS] Auto-switching to HTTP STT fallback');
                        startHttpSTT(stream);
                    }
                } else {
                    setErrorMessage(`Kết nối Deepgram bị đóng (code ${ev.code}). Vui lòng thử lại.`);
                }
            } else if (ev.code === 1011) {
                // Deepgram timeout - normal when user stops speaking
                console.log('[DG-WS] Deepgram timeout (user stopped speaking)');
            } else {
                // Normal close - clear any existing errors
                console.log('[DG-WS] Normal close, clearing errors');
            }
        };
    }, []);

    // HTTP polling: ghi 1.5s → WAV → Deepgram (~300ms) → transcript mỗi ~1.8s
    const startHttpSTT = useCallback((stream: MediaStream) => {
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token') || '';
        let sttAccumText = '';
        let pending = 0;

        const transcribeBlob = async (blob: Blob) => {
            if (blob.size < 1000 || pending >= 2) return;
            pending++;
            try {
                const wav = await blobToWav16k(blob);
                const fd = new FormData();
                fd.append('audio_file', wav, 'chunk.wav');
                fd.append('lang', 'vi');
                const res = await fetch('/api/interview/voice/stt-live', {
                    method: 'POST', body: fd,
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                if (!res.ok) return;
                const data = await res.json();
                const text = (data.text || '').trim();
                if (text && isRecordingRef.current) {
                    // Deduplicate: skip if new text is substring of last chunk
                    const lastChunk = sttAccumText.split(' ').slice(-8).join(' ').toLowerCase();
                    if (!lastChunk || !text.toLowerCase().startsWith(lastChunk)) {
                        sttAccumText = sttAccumText ? sttAccumText + ' ' + text : text;
                    }
                    setLiveTranscript(sttAccumText);
                    liveTranscriptRef.current = sttAccumText;
                }
            } catch { /* ignore */ } finally { pending--; }
        };

        const runCycle = () => {
            if (!isRecordingRef.current) return;
            const rec = new MediaRecorder(stream, mimeType ? { mimeType } : {});
            const chunks: Blob[] = [];
            rec.ondataavailable = ev => { if (ev.data.size > 0) chunks.push(ev.data); };
            rec.onstop = () => {
                if (isRecordingRef.current) runCycle();  // next cycle starts immediately
                transcribeBlob(new Blob(chunks, { type: mimeType || 'audio/webm' }));
            };
            rec.start();
            (chunkAccumRef as any)._liveRecorder = rec;
            // 1.5s cycle — Deepgram responds in ~300ms, total ~1.8s refresh
            chunkSttTimerRef.current = setTimeout(() => {
                try { if (rec.state !== 'inactive') rec.stop(); } catch { /* ignore */ }
            }, 1500);
        };
        runCycle();
    }, []);

    const startRecording = async () => {
        setErrorMessage('');
        const config = deviceConfig ?? JSON.parse(sessionStorage.getItem('voiceDeviceConfig') || '{}');

        try {
            // Use specific microphone if configured, otherwise use default
            const audioConstraints: MediaTrackConstraints = config?.microphoneId
                ? { deviceId: { exact: config.microphoneId } }
                : { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 };

            const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints })
                .catch(async () => {
                    return navigator.mediaDevices.getUserMedia({ audio: true });
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

            recorder.start(100);
            setIsRecording(true);
            isRecordingRef.current = true;
            recordingStartTimeRef.current = Date.now();

            if ('speechSynthesis' in window) window.speechSynthesis.cancel();

            // ── Live transcript via Deepgram WebSocket ──
            setLiveTranscript('');
            setInterimTranscript('');
            setIsEditingTranscript(false);
            liveTranscriptRef.current = '';
            startLiveSTT(stream);

        } catch (err: any) {
            const msg = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
                ? 'Trình duyệt chưa được cấp quyền truy cập microphone. Vui lòng cho phép microphone trong cài đặt trình duyệt.'
                : err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError'
                    ? 'Không tìm thấy microphone. Vui lòng kết nối microphone và thử lại.'
                    : 'Không thể bắt đầu ghi âm. Vui lòng kiểm tra microphone và thử lại.';
            setErrorMessage(msg);
        }
    };

    const stopRecording = () => {
        isRecordingRef.current = false;  // signal live STT cycles to stop
        
        // Clear any error messages when user stops recording
        setErrorMessage('');
        
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
        // Stop current live STT recorder
        const lr = (chunkAccumRef as any)._liveRecorder;
        if (lr && lr.state !== 'inactive') {
            try { lr.stop(); } catch { /* ignore */ }
        }
        (chunkAccumRef as any)._liveRecorder = null;
        // Cancel pending STT timer
        if (chunkSttTimerRef.current) { clearTimeout(chunkSttTimerRef.current); chunkSttTimerRef.current = null; }
        // Cleanup legacy refs
        if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch { } recognitionRef.current = null; }
        if (wsSTTRef.current) {
            try {
                if (wsSTTRef.current.readyState === WebSocket.OPEN) {
                    wsSTTRef.current.send('stop'); // signal Deepgram CloseStream
                }
                wsSTTRef.current.close();
            } catch { /* ignore */ }
            wsSTTRef.current = null;
        }
        chunkAccumRef.current = [];
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
            if (currentQuestion?.id && /^\d+$/.test(currentQuestion.id)) {
                formData.append('message_id', currentQuestion.id);
            }
            // Gửi transcript (Deepgram real-time, user có thể đã sửa) làm final answer
            const transcriptToSend = liveTranscriptRef.current.trim();
            if (transcriptToSend) {
                formData.append('text_answer', transcriptToSend);
                console.log('[Voice] Sending transcript:', transcriptToSend.slice(0, 80));
            } else {
                console.log('[Voice] No transcript — backend will use Deepgram STT on full audio');
            }
            setIsEditingTranscript(false);

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
                setPendingQuestion(nextQ);
                if (result.ai_response.progress) {
                    setProgress(nextProgress);
                }
                // 9.4: Save state after each question
                saveSessionState(sessionId, nextQ, nextProgress, voicePreference);
                // Reset STT retry on success
                setSttRetryCount(0);
                setShowTextFallback(false);

                // Always use fetchAndPlayTTS for consistent voice and fresh audio
                await fetchAndPlayTTS(nextQ);
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
                setPendingQuestion(nextQ);
                if (result.ai_response.progress) setProgress(nextProgress);
                saveSessionState(sessionId, nextQ, nextProgress, voicePreference);

                // Clear transcript trước khi AI đọc câu hỏi mới
                setLiveTranscript('');
                liveTranscriptRef.current = '';

                // Always use fetchAndPlayTTS for consistent voice and fresh audio
                await fetchAndPlayTTS(nextQ);
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

        // 1. Create & resume AudioContext INSIDE user gesture — stays unlocked forever
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            ctx.resume().catch(() => {});
            audioCtxRef.current = ctx;
        } catch { /* AudioContext not supported */ }

        // 2. Unlock <audio> element fallback
        const ua = new Audio();
        ua.volume = 1;
        ua.muted = false;
        ua.play().catch(() => {});
        unlockedAudioRef.current = ua;

        // 3. Unlock video
        if (videoRef.current) {
            const v = videoRef.current;
            v.play().then(() => { v.pause(); v.currentTime = 0; }).catch(() => {});
        }

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
        <div className="min-h-screen flex flex-col bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white relative overflow-x-hidden font-['Plus_Jakarta_Sans']">

            <div className="absolute inset-0 bg-dot-pattern pointer-events-none z-0 opacity-60" />
            
            {/* Ambient background orbs */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-indigo-400/20 blur-[120px]" />
                <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full bg-purple-400/20 blur-[120px]" />
            </div>

            {/* Yêu cầu 6.1, 6.2: Rules Modal */}
            {showRulesModal && (
                <RulesModal
                    onConfirm={handleRulesConfirm}
                    onCancel={handleRulesCancel}
                />
            )}

            {/* Loading spinner khi đang load câu hỏi đầu tiên */}
            {isLoadingQuestion && !showRulesModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-4">
                        {/* Spinner */}
                        <div className="relative w-20 h-20">
                            <div className="absolute inset-0 rounded-full border-4 border-indigo-200/30"></div>
                            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-500 animate-spin"></div>
                        </div>
                        {/* Text */}
                        <div className="text-white text-center">
                            <p className="text-lg font-semibold mb-1">Đang chuẩn bị câu hỏi...</p>
                            <p className="text-sm text-white/60">Vui lòng đợi trong giây lát</p>
                        </div>
                    </div>
                </div>
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
                <div className="flex items-center gap-2 glass bg-white/60 dark:bg-white/10 rounded-full px-4 py-2 border border-gray-200/50 dark:border-white/20 shadow-sm">
                    <div className="flex gap-1">
                        {Array.from({ length: Math.min(progress.total, 15) }).map((_, i) => (
                            <div key={i}
                                className={`h-1.5 rounded-full transition-all duration-300 ${i < progress.current ? 'bg-indigo-500 w-4' : 'bg-gray-300 dark:bg-white/20 w-2'
                                    }`} />
                        ))}
                    </div>
                    <span className="text-gray-700 dark:text-white/80 text-xs font-bold ml-1" data-testid="progress-indicator">
                        {progress.current}/{progress.total}
                    </span>
                </div>

                {/* Voice selector + question type */}
                <div className="flex items-center gap-3">
                    <div className="glass bg-white/80 dark:bg-indigo-500/80 rounded-full px-4 py-1.5 border border-indigo-100 dark:border-indigo-400/40 shadow-sm">
                        <span className="text-indigo-700 dark:text-white text-xs font-bold uppercase tracking-wide" data-testid="question-type">
                            {currentQuestion?.type || '...'}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 glass bg-white/60 dark:bg-white/10 rounded-full px-3 py-2 border border-gray-200/50 dark:border-white/20 shadow-sm">
                        <span className="text-gray-500 dark:text-white/50 text-xs font-semibold uppercase tracking-wider">Giọng:</span>
                        <button
                            onClick={() => handleVoicePreferenceChange('female')}
                            type="button"
                            className={`px-3 py-0.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${voicePreference === 'female'
                                ? 'bg-pink-500 text-white shadow-md shadow-pink-500/30'
                                : 'text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-white/10'
                                }`}
                            data-testid="voice-female-btn"
                        >Nữ</button>
                        <button
                            onClick={() => handleVoicePreferenceChange('male')}
                            type="button"
                            className={`px-3 py-0.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${voicePreference === 'male'
                                ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30'
                                : 'text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-white/10'
                                }`}
                            data-testid="voice-male-btn"
                        >Nam</button>
                    </div>
                </div>
            </div>

            {/* ── Main content: 1:1 interview room ── */}
            <div className="relative z-10 flex flex-col items-center min-h-screen pt-16 pb-6 px-4 gap-4"
                style={{ maxWidth: 640, margin: '0 auto', width: '100%' }}>

                {/* ── AI Interviewer (photo + video khi đọc) ── */}
                <div className="w-full flex-shrink-0">
                    <div className="relative w-full rounded-3xl overflow-hidden"
                        style={{
                            aspectRatio: '4/3',
                            background: '#0d0d1a',
                            border: isAISpeaking ? '2px solid rgba(99,102,241,0.9)' : '2px solid rgba(255,255,255,0.08)',
                            boxShadow: isAISpeaking ? '0 0 40px rgba(99,102,241,0.4)' : '0 8px 40px rgba(0,0,0,0.6)',
                            transition: 'border-color 0.3s, box-shadow 0.3s',
                        }}
                        data-testid="ai-avatar">

                        {/* Static photo */}
                        <img
                            src={`https://pub-8df5715d271b42d6bf03e5ecd279f612.r2.dev/interview/avatars/${voicePreference === 'male' ? 'anhNam' : 'anhNu'}.png`}
                            alt="AI Interviewer"
                            className="absolute inset-0 w-full h-full object-cover object-top"
                        />
                        {/* Video overlays when speaking */}
                        <video
                            ref={videoRef}
                            src={`https://pub-8df5715d271b42d6bf03e5ecd279f612.r2.dev/interview/videos/${voicePreference === 'male' ? 'nam' : 'nu'}.mp4`}
                            muted playsInline preload="auto"
                            className="absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-400"
                            style={{ opacity: isAISpeaking ? 1 : 0 }}
                            onEnded={() => {
                                if (isAISpeaking && videoRef.current) {
                                    videoRef.current.currentTime = 0;
                                    videoRef.current.play().catch(() => {});
                                }
                            }}
                        />

                        {/* Gradient bottom for readability */}
                        <div className="absolute bottom-0 left-0 right-0 h-1/3 pointer-events-none"
                            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)' }} />

                        {/* AI label */}
                        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full"
                            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
                            <span className="text-indigo-300 text-[11px] font-bold uppercase tracking-widest">AI INTERVIEWER</span>
                            {isAISpeaking && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
                        </div>

                        {/* Waveform when speaking */}
                        {isAISpeaking && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-end gap-1 px-4 py-2.5 rounded-2xl"
                                style={{ background: 'rgba(99,102,241,0.5)', backdropFilter: 'blur(6px)' }}>
                                {[0.5,0.9,0.6,1,0.7,0.9,0.5,0.8,0.6,1,0.7].map((h,i) => (
                                    <div key={i} className="w-1.5 bg-white rounded-full"
                                        style={{ height:`${h*24}px`, animation:`soundBar 0.65s ease-in-out infinite alternate`, animationDelay:`${i*0.08}s` }} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Question text ── */}
                <div className="w-full">
                    <QuestionBubble
                        question={currentQuestion}
                        isAISpeaking={isAISpeaking}
                        audioCurrentTimeMs={audioCurrentTimeMs}
                    />
                </div>

                {/* ── User panel: audio-room style ── */}
                <div className="w-full rounded-3xl overflow-hidden glass bg-white/40 dark:bg-[#12162a]/80 border border-gray-200/50 dark:border-white/10 shadow-xl">

                    {/* ── Avatar area ── */}
                    <div className="relative px-6 pt-5 pb-4 bg-gray-50/60 dark:bg-[#1a1f35]/60 border-b border-gray-200/50 dark:border-white/5">

                        {/* RECORDING badge top-left */}
                        {isRecording && (
                            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                                style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)' }}>
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-red-400 text-[11px] font-bold uppercase tracking-wider">RECORDING...</span>
                            </div>
                        )}

                        {/* Status badge top-left when not recording */}
                        {!isRecording && (
                            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full"
                                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <span className={`text-[11px] font-semibold ${canStartAnswer && !isAISpeaking ? 'text-green-400' : 'text-white/40'}`}>
                                    {isAISpeaking ? 'Đang nghe...' : canStartAnswer ? 'Sẵn sàng' : 'Chờ...'}
                                </span>
                            </div>
                        )}

                        {/* Settings / Mic toggle top-right */}
                        <div className="absolute top-3 right-3">
                            {!isRecording ? (
                                <button onClick={startRecording} type="button"
                                    disabled={!canStartAnswer || isAISpeaking}
                                    className="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer relative"
                                    style={{
                                        background: canStartAnswer && !isAISpeaking ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.06)',
                                        border: canStartAnswer && !isAISpeaking ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.12)',
                                    }}
                                    data-testid="start-answer-btn">
                                    <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 text-indigo-300" fill="currentColor">
                                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                                    </svg>
                                </button>
                            ) : (
                                <button onClick={stopRecording} type="button"
                                    className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
                                    style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', animation: 'micGlow 1.2s ease-in-out infinite' }}
                                    data-testid="stop-answer-btn">
                                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-red-400" fill="currentColor">
                                        <path d="M6 6h12v12H6z" />
                                    </svg>
                                </button>
                            )}
                        </div>

                        {/* Silhouette centered */}
                        <div className="flex justify-center items-center py-4">
                            <div className="relative">
                                {/* Outer glow ring when recording */}
                                {isRecording && (
                                    <div className="absolute inset-0 rounded-full animate-ping opacity-20"
                                        style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)', transform: 'scale(1.8)' }} />
                                )}
                                {/* Person silhouette */}
                                <div className="w-24 h-24 rounded-full flex items-center justify-center glass bg-white/60 dark:bg-white/10 border border-gray-200/50 dark:border-white/20 shadow-inner">
                                    <svg viewBox="0 0 24 24" className="w-14 h-14 text-indigo-500 dark:text-white/40" fill="currentColor">
                                        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Waveform bars bottom */}
                        <div className="flex items-end justify-center gap-1 h-8" data-testid="recording-visual-indicator">
                            {isRecording ? (
                                [0.4,0.7,1,0.5,0.9,0.6,1,0.7,0.5,0.8,0.4,0.9,0.6,0.8,0.5,0.7,1,0.6,0.9,0.4].map((h,i) => (
                                    <div key={i} className="w-1.5 rounded-full"
                                        style={{
                                            height: `${h * 28}px`,
                                            background: `linear-gradient(to top, #10b981, #34d399)`,
                                            opacity: 0.7 + h * 0.3,
                                            animation: `soundBar 0.5s ease-in-out infinite alternate`,
                                            animationDelay: `${i * 0.05}s`,
                                        }} />
                                ))
                            ) : (
                                // Static flat bars when not recording
                                Array.from({length: 20}).map((_,i) => (
                                    <div key={i} className="w-1.5 rounded-full"
                                        style={{ height: '3px', background: 'rgba(255,255,255,0.15)' }} />
                                ))
                            )}
                        </div>
                    </div>

                    {/* ── Live Transcript ── */}
                    <div className="px-5 py-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-500 dark:text-white/50" fill="currentColor">
                                    <path d="M3 18h13v-2H3v2zm0-5h10v-2H3v2zm0-7v2h13V6H3zm18 9.59L17.42 12 21 8.41 19.59 7l-5 5 5 5L21 15.59z" />
                                </svg>
                                <span className="text-gray-700 dark:text-white/70 text-sm font-bold uppercase tracking-wider">Live Transcript</span>
                                {isRecording && (
                                    <span className="flex items-center gap-1 text-[10px] bg-green-500/20 text-green-300 border border-green-500/30 px-2 py-0.5 rounded-full font-semibold">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                        Đang ghi
                                    </span>
                                )}
                                {isEditingTranscript && (
                                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
                                        Đang sửa
                                    </span>
                                )}
                            </div>
                            {liveTranscript && !isEditingTranscript && (
                                <div className="flex items-center gap-2">
                                    {/* Edit button */}
                                    <button
                                        className="flex items-center gap-1 text-amber-400 text-xs font-semibold hover:text-amber-300 transition-colors"
                                        onClick={() => setIsEditingTranscript(true)}
                                        title="Sửa transcript"
                                    >
                                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
                                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                                        </svg>
                                        Sửa
                                    </button>
                                    {/* Clear button */}
                                    <button
                                        className="flex items-center gap-1 text-white/30 text-xs font-semibold hover:text-white/60 transition-colors"
                                        onClick={() => { 
                                            // Clear local state
                                            setLiveTranscript(''); 
                                            setInterimTranscript(''); 
                                            liveTranscriptRef.current = '';
                                            
                                            // Reset WebSocket to clear backend accumulated text
                                            if (wsSTTRef.current && wsSTTRef.current.readyState === WebSocket.OPEN) {
                                                try {
                                                    wsSTTRef.current.close();
                                                } catch { /* ignore */ }
                                            }
                                            
                                            // Restart STT if still recording
                                            if (isRecordingRef.current && audioStreamRef.current) {
                                                console.log('[Clear] Restarting STT after clear');
                                                setTimeout(() => {
                                                    if (audioStreamRef.current) {
                                                        startLiveSTT(audioStreamRef.current);
                                                    }
                                                }, 100);
                                            }
                                        }}
                                    >
                                        <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor">
                                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                                        </svg>
                                        Xoá
                                    </button>
                                </div>
                            )}
                            {isEditingTranscript && (
                                <div className="flex items-center gap-2">
                                    <button
                                        className="text-xs font-semibold text-green-400 hover:text-green-300 transition-colors"
                                        onClick={() => setIsEditingTranscript(false)}
                                    >
                                        ✓ Xong
                                    </button>
                                    <button
                                        className="text-xs font-semibold text-white/30 hover:text-white/60 transition-colors"
                                        onClick={() => { setIsEditingTranscript(false); }}
                                    >
                                        Huỷ
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Edit mode — textarea */}
                        {isEditingTranscript ? (
                            <textarea
                                autoFocus
                                value={liveTranscript}
                                onChange={e => {
                                    setLiveTranscript(e.target.value);
                                    liveTranscriptRef.current = e.target.value;
                                }}
                                className="w-full min-h-[80px] rounded-xl px-4 py-3 text-sm leading-relaxed resize-none outline-none font-medium glass bg-amber-50/80 dark:bg-amber-900/10 border border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-100 focus:ring-2 focus:ring-amber-400"
                                placeholder="Nhập lại câu trả lời..."
                            />
                        ) : (
                        <div className={`min-h-[60px] rounded-xl px-4 py-3 text-[15px] leading-relaxed relative glass font-medium transition-all duration-300 ${isRecording ? 'bg-indigo-50/80 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-500/40 shadow-inner' : 'bg-white/60 dark:bg-white/5 border border-gray-200/50 dark:border-white/10'}`}>
                            {(liveTranscript || interimTranscript) ? (
                                <span>
                                    {liveTranscript && (
                                        <span className="text-gray-900 dark:text-white/90">{liveTranscript}</span>
                                    )}
                                    {interimTranscript && (
                                        <span className="text-gray-500 dark:text-white/40 italic">
                                            {liveTranscript ? ' ' : ''}{interimTranscript}
                                        </span>
                                    )}
                                </span>
                            ) : isRecording ? (
                                <span className="flex items-center gap-2 text-indigo-500 dark:text-indigo-400/80 italic font-bold">
                                    <span className="flex gap-1">
                                        {[0,1,2].map(i => (
                                            <span key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-bounce"
                                                style={{ animationDelay: `${i * 0.15}s` }} />
                                        ))}
                                    </span>
                                    Đang nghe...
                                </span>
                            ) : (
                                <span className="text-gray-400 dark:text-white/30 italic font-semibold">
                                    {canStartAnswer ? 'Nhấn mic để bắt đầu trả lời.' : 'Chờ AI đọc xong câu hỏi...'}
                                </span>
                            )}
                        </div>
                        )}

                        {/* Large mic button centered */}
                        {!isRecording && canStartAnswer && !isAISpeaking && (
                            <button onClick={startRecording} type="button"
                                className="mt-4 w-full py-3 rounded-2xl font-bold text-sm text-white transition-all cursor-pointer flex items-center justify-center gap-2 relative overflow-hidden"
                                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}
                                data-testid="start-answer-btn-2">
                                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                                </svg>
                                Bắt đầu trả lời
                            </button>
                        )}
                    </div>
                </div>

                {/* STT fallback */}
                {showTextFallback && (
                    <div className="w-full" data-testid="text-fallback-input">
                        <div className="rounded-2xl p-5 border border-white/15"
                            style={{ background: 'rgba(10,10,30,0.9)', backdropFilter: 'blur(10px)' }}>
                            <p className="text-white/60 text-sm mb-3">Không nhận dạng được. Nhập câu trả lời:</p>
                            <textarea data-testid="fallback-textarea" value={textFallbackValue}
                                onChange={e => setTextFallbackValue(e.target.value)}
                                className="w-full rounded-xl p-3 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder-white/25"
                                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                                rows={3} placeholder="Nhập câu trả lời..." />
                            <button data-testid="fallback-submit-btn" onClick={handleTextFallbackSubmit} type="button"
                                className="mt-3 bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-6 rounded-xl text-sm transition-colors cursor-pointer">
                                Gửi
                            </button>
                        </div>
                    </div>
                )}

                {/* Error toast */}
                {errorMessage && (
                    <div className="fixed bottom-6 left-4 right-4 max-w-lg mx-auto rounded-2xl p-4 z-50 flex items-center gap-3"
                        style={{ background: 'rgba(220,38,38,0.9)', backdropFilter: 'blur(8px)', border: '1px solid rgba(239,68,68,0.5)' }}>
                        <span className="text-white text-sm font-medium flex-1" data-testid="error-message">{errorMessage}</span>
                    </div>
                )}
            </div>

            {/* Exit button */}
            <div className="absolute bottom-5 left-5 z-30">
                <button
                    onClick={() => setShowExitModal(true)}
                    type="button"
                    className="flex items-center gap-2 glass bg-white/60 dark:bg-white/10 hover:bg-red-50 dark:hover:bg-red-500/20 text-gray-700 dark:text-white/60 hover:text-red-600 dark:hover:text-red-400 text-sm font-bold py-2.5 px-5 rounded-full border border-gray-200/50 dark:border-white/20 hover:border-red-200 dark:hover:border-red-500/40 transition-all duration-300 cursor-pointer shadow-sm"
                    data-testid="exit-btn"
                >
                    ✕ Thoát phòng
                </button>
            </div>

            {/* Exit confirmation modal */}
            {showExitModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
                    <div className="relative w-full max-w-sm rounded-3xl overflow-hidden"
                        style={{
                            background: 'linear-gradient(145deg, #1e1b4b 0%, #1a1f35 100%)',
                            border: '1px solid rgba(239,68,68,0.3)',
                            boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(239,68,68,0.1)',
                        }}>
                        {/* Top accent */}
                        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #ef4444, #dc2626)' }} />

                        <div className="px-7 pt-7 pb-6">
                            {/* Icon */}
                            <div className="flex justify-center mb-5">
                                <div className="w-16 h-16 rounded-full flex items-center justify-center"
                                    style={{ background: 'rgba(239,68,68,0.12)', border: '2px solid rgba(239,68,68,0.3)' }}>
                                    <svg viewBox="0 0 24 24" className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                </div>
                            </div>

                            <h3 className="text-white text-xl font-bold text-center mb-2">Thoát phỏng vấn?</h3>
                            <p className="text-white/50 text-sm text-center leading-relaxed mb-7">
                                Phiên phỏng vấn sẽ bị huỷ hoàn toàn.<br />Tiến độ hiện tại sẽ không được lưu.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowExitModal(false)}
                                    type="button"
                                    className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white/70 hover:text-white transition-all cursor-pointer"
                                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
                                >
                                    Tiếp tục
                                </button>
                                <button
                                    onClick={async () => {
                                        setShowExitModal(false);
                                        if (isRecordingRef.current) stopRecording();
                                        rulesMonitorRef.current?.stopMonitoring();
                                        if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
                                        try { sessionStorage.removeItem('voiceInterviewState'); } catch { /* noop */ }
                                        if (sessionId) {
                                            authFetch(`/api/interview/voice/session/${sessionId}/terminate`, { method: 'POST' })
                                                .catch(() => { /* non-blocking */ });
                                        }
                                        navigate('/interview/selection');
                                    }}
                                    type="button"
                                    className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white transition-all cursor-pointer"
                                    style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 4px 16px rgba(239,68,68,0.35)' }}
                                >
                                    Thoát ngay
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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

