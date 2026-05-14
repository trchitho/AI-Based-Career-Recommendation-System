import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Loader2, Mic, MicOff, Send, Clock, User, Bot, CheckCircle, XCircle, AlertCircle, Timer, Users, Brain, Code, MessageSquare, Target, Lightbulb, FileText, ChevronDown, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { interviewService } from '../services/interviewService';
import ScoreTooltip from '../components/interview/ScoreTooltip';
import STARMethodGuide from '../components/interview/STARMethodGuide';
import MainLayout from '../components/layout/MainLayout';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
    id: number;
    role: 'interviewer' | 'candidate';
    content: string;
    timestamp: string;
    score?: number;
    detailedScores?: { technical: number; logic: number; communication: number; experience: number; attitude: number };
    scoreReasoning?: { technical: string; logic: string; communication: string; experience: string; attitude: string };
    feedback?: string;
    strengths?: string[];
    weaknesses?: string[];
    suggestion?: string;
    questionType?: string;
    questionNumber?: number;
}

interface SessionState {
    sessionId: number;
    jobTitle: string;
    status: 'active' | 'completed';
    currentQuestion: string;
    questionNumber: number;
    questionType: string;
    questionCount: number; // Total number of questions in this session
    skillsContext: Array<{ skill_name: string; skill_type: string; importance: number; level: number }>;
    hardSkills?: Array<{ skill_name: string; importance: number }>;
}

// ─── Per-question time limits (seconds) ───────────────────────────────────────
function getTimeLimit(questionType: string, questionLength: number): number {
    const base: Record<string, number> = {
        warm_up: 90, technical: 180, behavioral: 150, situational: 150, closing: 60,
    };
    const b = base[questionType] ?? 120;
    // Add 30s for every 100 chars of question length beyond 100
    const extra = Math.floor(Math.max(0, questionLength - 100) / 100) * 30;
    return Math.min(b + extra, 300); // cap at 5 min
}

// ─── Toast ────────────────────────────────────────────────────────────────────
interface ToastItem { id: number; type: 'success' | 'error' | 'info'; message: string }

const ToastContainer: React.FC<{ toasts: ToastItem[]; onRemove: (id: number) => void }> = ({ toasts, onRemove }) => (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        {toasts.map(t => (
            <div key={t.id}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium pointer-events-auto transition-all
                    ${t.type === 'success' ? 'bg-indigo-800 text-white' : t.type === 'error' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}
            >
                {t.type === 'success' ? <CheckCircle className="h-4 w-4 shrink-0" /> :
                    t.type === 'error' ? <XCircle className="h-4 w-4 shrink-0" /> :
                        <AlertCircle className="h-4 w-4 shrink-0" />}
                <span>{t.message}</span>
                <button onClick={() => onRemove(t.id)} className="ml-2 opacity-70 hover:opacity-100"></button>
            </div>
        ))}
    </div>
);

// ─── Inline UI primitives ─────────────────────────────────────────────────────
const Card: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties }> = ({ children, className = '', style }) => (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`} style={style}>{children}</div>
);
const CardHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">{children}</div>
);
const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <h3 className={`text-lg font-semibold text-gray-900 dark:text-gray-100 ${className}`}>{children}</h3>
);
const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`px-6 py-4 ${className}`}>{children}</div>
);
const Btn: React.FC<{ children: React.ReactNode; onClick?: () => void; disabled?: boolean; variant?: 'default' | 'outline' | 'danger'; size?: 'default' | 'sm'; className?: string; type?: 'button' | 'submit' }> =
    ({ children, onClick, disabled = false, variant = 'default', size = 'default', className = '', type = 'button' }) => {
        const v = variant === 'outline' ? 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            : variant === 'danger' ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-blue-600 text-white hover:bg-blue-700';
        const s = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm';
        return (
            <button type={type} onClick={onClick} disabled={disabled}
                className={`inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${v} ${s} ${className}`}>
                {children}
            </button>
        );
    };
const Badge: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>{children}</span>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const BASE_R2 = 'https://pub-8df5715d271b42d6bf03e5ecd279f612.r2.dev';

const InterviewPage: React.FC = () => {
    const { jobId } = useParams<{ jobId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    // Gender / avatar / video from navigation state
    const navState = (location.state as any) || {};
    const interviewerGender: 'male' | 'female' = navState.interviewerGender || 'female';
    const avatarUrl = interviewerGender === 'male'
        ? `${BASE_R2}/interview/avatars/anhNam.png`
        : `${BASE_R2}/interview/avatars/anhNu.png`;
    const videoUrl = interviewerGender === 'male'
        ? `${BASE_R2}/interview/videos/nam.mp4`
        : `${BASE_R2}/interview/videos/nu.mp4`;

    const [showVideo, setShowVideo] = useState(false);

    const [session, setSession] = useState<SessionState | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentAnswer, setCurrentAnswer] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [audioDuration, setAudioDuration] = useState<number | null>(null);
    const [elapsedTime, setElapsedTime] = useState(0);       // total session time
    const [questionTime, setQuestionTime] = useState(0);     // time spent on current question
    const [timeLimit, setTimeLimit] = useState(90);          // per-question limit
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const [showAbandonModal, setShowAbandonModal] = useState(false);
    const pendingAbandonRef = useRef<(() => void) | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingStartRef = useRef<number>(0);
    const startedRef = useRef(false);
    const sessionStartRef = useRef<Date | null>(null);
    const questionStartRef = useRef<Date>(new Date());
    const autoSubmitRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const autoSubmittedRef = useRef(false);
    const currentAnswerRef = useRef(''); // Add ref to track current answer
    const isLoadingRef = useRef(false);
    const timeLimitRef = useRef(90);
    const handleSubmitRef = useRef<(auto?: boolean) => void>(() => { });
    const sessionRef = useRef<SessionState | null>(null); // Track session for event handlers

    // Keep currentAnswerRef in sync with currentAnswer for timer access
    useEffect(() => {
        currentAnswerRef.current = currentAnswer;
    }, [currentAnswer]);

    // Keep sessionRef in sync for event handlers (avoid stale closure)
    useEffect(() => {
        sessionRef.current = session;
    }, [session]);

    // ── Toast helpers ──────────────────────────────────────────────────────────
    const addToast = useCallback((type: ToastItem['type'], message: string) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, type, message }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    }, []);
    const removeToast = useCallback((id: number) => setToasts(prev => prev.filter(t => t.id !== id)), []);

    // ── Timers ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!session || session.status !== 'active') return;
        const iv = setInterval(() => {
            if (isLoadingRef.current) return; // pause timer while waiting for response
            if (sessionStartRef.current)
                setElapsedTime(Math.floor((Date.now() - sessionStartRef.current.getTime()) / 1000));
            const qt = Math.floor((Date.now() - questionStartRef.current.getTime()) / 1000);
            setQuestionTime(qt);

            const remaining = timeLimitRef.current - qt;

            // Warning notifications at specific intervals
            if (remaining === 60 && !autoSubmittedRef.current) {
                addToast('info', '⏰ Còn 1 phút! Hãy hoàn thiện câu trả lời của bạn.');
            } else if (remaining === 30 && !autoSubmittedRef.current) {
                addToast('info', '⚠️ Còn 30 giây! Chuẩn bị gửi câu trả lời.');
            } else if (remaining === 10 && !autoSubmittedRef.current) {
                addToast('info', '🚨 Còn 10 giây! Hệ thống sẽ tự động gửi.');
            }

            // Auto-submit check inside interval to avoid stale closure issues
            if (qt >= timeLimitRef.current && !autoSubmittedRef.current && !isLoadingRef.current) {
                autoSubmittedRef.current = true;
                const hasTypedAnswer = currentAnswerRef.current.trim().length > 0;

                if (hasTypedAnswer) {
                    addToast('info', `⏰ Hết thời gian! Đã tự động gửi câu trả lời của bạn (${currentAnswerRef.current.trim().length} ký tự).`);
                } else {
                    addToast('info', '⏰ Hết thời gian! Tự động chuyển sang câu hỏi tiếp theo.');
                }

                handleSubmitRef.current(true);
            }
        }, 1000);
        return () => clearInterval(iv);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.status, session?.questionNumber]);

    // ── Scroll ─────────────────────────────────────────────────────────────────
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const [showScrollButton, setShowScrollButton] = useState(false);

    // Check if user is near bottom of chat
    const checkScrollPosition = useCallback(() => {
        if (chatContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 50; // Within 50px of bottom
            setShowScrollButton(!isNearBottom);
        }
    }, []);

    // COMPLETELY DISABLE auto-scroll - only manual scroll
    // NO automatic scrolling when messages change - user has full control

    // Manual scroll to bottom function
    const scrollToBottom = useCallback(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, []);

    // ── Init ───────────────────────────────────────────────────────────────────
    useEffect(() => {
        // Scroll to top when component mounts - ONLY ONCE
        if (!startedRef.current) {
            window.scrollTo(0, 0);
        }

        if (jobId && user && !startedRef.current) {
            startedRef.current = true;

            // Kiểm tra xem có session data từ InterviewSelectionPage không
            const sessionData = location.state?.sessionData;
            if (sessionData) {
                loadSessionFromData(sessionData);
            } else {
                const urlParams = new URLSearchParams(window.location.search);
                const existingSessionId = urlParams.get('session');
                if (existingSessionId) {
                    loadExistingSession(parseInt(existingSessionId));
                } else {
                    startInterview();
                }
            }
        } else if (jobId && !user) {
            navigate('/login', { state: { from: `/interview/${jobId}`, message: 'Vui lòng đăng nhập để bắt đầu phỏng vấn' } });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [jobId, user]);

    // ── Back/Unload handlers (dùng sessionRef để tránh stale closure) ──────────
    useEffect(() => {
        // Push state để bắt popstate khi user nhấn back
        window.history.pushState(null, '', window.location.href);

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (sessionRef.current?.status === 'active') {
                e.preventDefault();
                e.returnValue = 'Bạn có chắc chắn muốn thoát? Buổi phỏng vấn sẽ bị hủy.';
                // Gọi abandon với keepalive để đảm bảo gửi được khi tab đóng
                if (sessionRef.current?.sessionId) {
                    const token = localStorage.getItem('accessToken') || '';
                    fetch(`/api/interview/abandon/${sessionRef.current.sessionId}`, {
                        method: 'POST',
                        keepalive: true,
                        headers: { 'Authorization': `Bearer ${token}` }
                    }).catch(() => { /* ignore */ });
                }
                return e.returnValue;
            }
        };

        const handlePopState = () => {
            if (sessionRef.current?.status === 'active') {
                // Đẩy lại state để giữ user ở trang hiện tại
                window.history.pushState(null, '', window.location.href);
                // Show custom modal instead of window.confirm
                pendingAbandonRef.current = () => {
                    const sid = sessionRef.current?.sessionId;
                    if (sid) {
                        interviewService.abandonInterview(sid)
                            .catch(() => { /* ignore */ })
                            .finally(() => navigate('/interview'));
                    } else {
                        navigate('/interview');
                    }
                };
                setShowAbandonModal(true);
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('popstate', handlePopState);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Mount once — dùng sessionRef nên không cần deps

    // ── Load existing session (từ InterviewSelectionPage navigate) ─────────────
    const loadExistingSession = async (sessionId: number) => {
        if (!jobId) return;
        setIsLoading(true);
        try {
            const history = await interviewService.getInterviewHistory(sessionId);
            const sess = history.session;

            // Load hard skills
            let hardSkills: Array<{ skill_name: string; importance: number }> = [];
            try {
                const jobInfo = await interviewService.getJobInfo(jobId);
                hardSkills = jobInfo.hard_skills.map(s => ({ skill_name: s.skill_name, importance: s.importance }));
            } catch { /* ignore */ }

            // Lấy câu hỏi hiện tại (câu hỏi cuối cùng của interviewer chưa có câu trả lời)
            const messages = history.messages;
            const lastInterviewerMsg = [...messages].reverse().find(m => m.role === 'interviewer' && m.question_type !== 'greeting');
            const currentQuestion = lastInterviewerMsg?.content || '';
            const questionNumber = lastInterviewerMsg?.question_number || 1;
            const questionType = lastInterviewerMsg?.question_type || 'warm_up';

            const limit = getTimeLimit(questionType, currentQuestion.length);
            setTimeLimit(limit);
            timeLimitRef.current = limit;
            questionStartRef.current = new Date();
            sessionStartRef.current = new Date();

            setSession({
                sessionId: sess.id,
                jobTitle: sess.job_title,
                status: sess.status as 'active' | 'completed',
                currentQuestion,
                questionNumber,
                questionType,
                // Lấy question_count từ session (backend trả về), fallback về URL params, rồi mới dùng default
                questionCount: sess.question_count ?? parseInt(new URLSearchParams(window.location.search).get('questions') || '5'),
                skillsContext: (sess as any).skills_context || [],
                hardSkills,
            });

            // Map messages từ history
            setMessages(messages.map((m, idx) => ({
                id: m.id || idx + 1,
                role: m.role as 'interviewer' | 'candidate',
                content: m.content,
                timestamp: m.timestamp,
                score: m.score,
                detailedScores: m.detailed_scores as any,
                feedback: m.feedback,
                strengths: m.strengths,
                weaknesses: m.weaknesses,
                suggestion: m.suggestion,
                questionType: m.question_type,
                questionNumber: m.question_number,
            })));

        } catch (err: any) {
            console.error('Failed to load existing session:', err);
            // Fallback: gọi startInterview() nếu không load được session
            addToast('error', 'Không thể tải phiên phỏng vấn. Đang tạo phiên mới...');
            startInterview();
        } finally {
            setIsLoading(false);
        }
    };

    // ── Load session from data (từ InterviewSelectionPage state) ─────────────────
    const loadSessionFromData = async (sessionData: any) => {
        if (!jobId) return;
        setIsLoading(true);
        try {
            // Load job details for hard skills
            let hardSkills: Array<{ skill_name: string; importance: number }> = [];
            try {
                const jobInfo = await interviewService.getJobInfo(jobId);
                hardSkills = jobInfo.hard_skills.map(s => ({ skill_name: s.skill_name, importance: s.importance }));
            } catch { /* ignore */ }

            const limit = getTimeLimit('warm_up', sessionData.first_question.length);
            setTimeLimit(limit);
            questionStartRef.current = new Date();
            sessionStartRef.current = new Date();

            setSession({
                sessionId: sessionData.session_id,
                jobTitle: sessionData.job_title,
                status: 'active',
                currentQuestion: sessionData.first_question,
                questionNumber: 1,
                questionType: 'warm_up',
                questionCount: sessionData.question_count,
                skillsContext: sessionData.skills_context,
                hardSkills,
            });
            setMessages([
                { id: 1, role: 'interviewer', content: sessionData.greeting, timestamp: new Date().toISOString(), questionType: 'greeting', questionNumber: 0 },
                { id: 2, role: 'interviewer', content: sessionData.first_question, timestamp: new Date().toISOString(), questionType: 'warm_up', questionNumber: 1 },
            ]);
        } catch (err: any) {
            console.error('Failed to load session from data:', err);
            addToast('error', 'Không thể tải phiên phỏng vấn. Đang tạo phiên mới...');
            startInterview();
        } finally {
            setIsLoading(false);
        }
    };

    // ── Start interview ────────────────────────────────────────────────────────
    const startInterview = async () => {
        if (!jobId) return;
        setIsLoading(true);
        try {
            // Check if URL has invalid ONET code format
            // Valid format: XX-XXXX.XX (e.g., 27-2099.00)
            const validOnetPattern = /^\d{2}-\d{4}\.\d{2}$/;
            if (!validOnetPattern.test(jobId)) {
                console.log(`Invalid ONET code format in URL: ${jobId} (expected format: XX-XXXX.XX)`);
                throw new Error('Invalid ONET code format');
            }

            console.log(`Starting interview for job ID: ${jobId}`);

            // Get question count from URL params or use default
            const urlParams = new URLSearchParams(window.location.search);
            const questionCount = parseInt(urlParams.get('questions') || '7');

            const res = await interviewService.startInterview(jobId, questionCount);
            // Load job details for hard skills
            let hardSkills: Array<{ skill_name: string; importance: number }> = [];
            try {
                const jobInfo = await interviewService.getJobInfo(jobId);
                hardSkills = jobInfo.hard_skills.map(s => ({ skill_name: s.skill_name, importance: s.importance }));
            } catch { /* ignore */ }

            const limit = getTimeLimit('warm_up', res.first_question.length);
            setTimeLimit(limit);
            questionStartRef.current = new Date();
            sessionStartRef.current = new Date();

            setSession({
                sessionId: res.session_id,
                jobTitle: res.job_title,
                status: 'active',
                currentQuestion: res.first_question,
                questionNumber: 1,
                questionType: 'warm_up',
                questionCount: res.question_count, // Store the actual question count from backend
                skillsContext: res.skills_context,
                hardSkills,
            });
            setMessages([
                { id: 1, role: 'interviewer', content: res.greeting, timestamp: new Date().toISOString(), questionType: 'greeting', questionNumber: 0 },
                { id: 2, role: 'interviewer', content: res.first_question, timestamp: new Date().toISOString(), questionType: 'warm_up', questionNumber: 1 },
            ]);
        } catch (err: any) {
            if (err?.response?.status === 401) {
                navigate('/login', { state: { from: `/interview/${jobId}`, message: 'Phiên đăng nhập đã hết hạn.' } });
            } else {
                addToast('error', 'Không thể bắt đầu phỏng vấn. Vui lòng thử lại.');
                navigate('/interview');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // ── Abandon interview (called via modal confirm) ───────────────────────────
    // Triggered by pendingAbandonRef in the custom modal — not called directly

    const handleSubmit = async (auto = false) => {
        if (!session) return;

        // If auto-submit, use the current typed answer (even if empty)
        const answer = currentAnswer.trim();

        // Prevent double submit
        if (isLoadingRef.current) return;

        if (autoSubmitRef.current) clearTimeout(autoSubmitRef.current);
        isLoadingRef.current = true;
        setIsLoading(true);

        const userMsgId = Date.now();

        // Better message content for auto-submit
        let displayContent = answer;
        if (auto) {
            if (answer.length > 0) {
                displayContent = `${answer} (Tự động gửi do hết thời gian)`;
            } else {
                displayContent = '(Hết thời gian - Chưa nhập câu trả lời)';
            }
        } else if (!answer) {
            displayContent = '(Không trả lời)';
        }

        const userMsg: Message = {
            id: userMsgId,
            role: 'candidate',
            content: displayContent,
            timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, userMsg]);
        setCurrentAnswer('');

        try {
            const res = await interviewService.submitAnswer({
                session_id: session.sessionId,
                answer: answer || '', // Send the actual answer (can be empty)
                has_audio: audioDuration !== null,
                audio_duration: audioDuration,
                is_skipped: false, // Never set is_skipped = true from frontend
            });
            setAudioDuration(null);

            // Update the candidate message with evaluation data (correct position)
            if (res.evaluation && res.evaluation.score !== null && res.evaluation.score !== undefined) {
                setMessages(prev => prev.map(m => m.id === userMsgId ? {
                    ...m,
                    score: res.evaluation!.score,
                    detailedScores: res.evaluation!.detailed_scores,
                    scoreReasoning: (res.evaluation as any).score_reasoning,
                    feedback: res.evaluation!.feedback,
                    strengths: res.evaluation!.strengths,
                    weaknesses: res.evaluation!.weaknesses,
                    suggestion: res.evaluation!.suggestion,
                } : m));
            }

            // Hiển thị HR acknowledgment như HR message riêng (cho jd_qualification và closing)
            if (res.hr_acknowledgment) {
                setMessages(prev => [...prev, {
                    id: Date.now() + 1,
                    role: 'interviewer',
                    content: res.hr_acknowledgment!,
                    timestamp: new Date().toISOString(),
                    questionType: 'closing_response',  // Luôn dùng closing_response → tag "Câu trả lời"
                    questionNumber: res.question_number,
                }]);
            }

            if (res.status === 'continue') {
                const nextLimit = getTimeLimit(res.question_type || 'technical', (res.next_question || '').length);
                timeLimitRef.current = nextLimit;
                setTimeLimit(nextLimit);
                setQuestionTime(0);
                questionStartRef.current = new Date();
                autoSubmittedRef.current = false;

                // Chỉ thêm next_question nếu khác với hr_acknowledgment (tránh duplicate)
                if (res.next_question && res.next_question !== res.hr_acknowledgment) {
                    setMessages(prev => [...prev, {
                        id: Date.now() + 2,
                        role: 'interviewer',
                        content: res.next_question!,
                        timestamp: new Date().toISOString(),
                        questionType: res.question_type || 'technical',
                        questionNumber: res.question_number || 2,
                    }]);
                }
                setSession(prev => prev ? { ...prev, currentQuestion: res.next_question!, questionNumber: res.question_number!, questionType: res.question_type! } : null);
            } else if (!res.next_question && res.status !== 'completed') {
                // Backend failed to generate next question — retry once
                addToast('error', 'Không thể tạo câu hỏi tiếp theo. Vui lòng thử lại.');
            } else {
                setSession(prev => prev ? { ...prev, status: 'completed' } : null);
                setMessages(prev => [...prev, {
                    id: Date.now() + 2,
                    role: 'interviewer',
                    content: 'Phỏng vấn đã hoàn thành! Cảm ơn bạn đã tham gia.',
                    timestamp: new Date().toISOString(),
                    questionType: 'closing',
                }]);
                addToast('success', 'Phỏng vấn hoàn thành!');
            }
        } catch (err: any) {
            if (err?.response?.status === 401) {
                navigate('/login', { state: { from: `/interview/${session?.sessionId}`, message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' } });
            } else {
                addToast('error', 'Lỗi khi gửi câu trả lời. Vui lòng thử lại.');
            }
        } finally {
            isLoadingRef.current = false;
            setIsLoading(false);
        }
    };

    // Keep handleSubmitRef in sync
    useEffect(() => { handleSubmitRef.current = handleSubmit; });

    // ── Recording ──────────────────────────────────────────────────────────────
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
            const mr = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = mr;
            audioChunksRef.current = [];
            recordingStartRef.current = Date.now();

            mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };

            mr.onstop = () => {
                const duration = (Date.now() - recordingStartRef.current) / 1000;
                setAudioDuration(duration);
                stream.getTracks().forEach(t => t.stop());

                // Use Web Speech API for transcription if available
                const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                if (SpeechRecognition) {
                    // Already handled via onresult below
                } else {
                    addToast('info', `Đã ghi âm ${duration.toFixed(1)}s. Trình duyệt không hỗ trợ chuyển giọng nói thành văn bản tự động.`);
                }
            };

            // Start speech recognition simultaneously
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.lang = 'vi-VN';
                recognition.continuous = true;
                recognition.interimResults = true;
                (mr as any)._recognition = recognition;

                let finalTranscript = '';
                recognition.onresult = (event: any) => {
                    let interim = '';
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        const t = event.results[i][0].transcript;
                        if (event.results[i].isFinal) finalTranscript += t + ' ';
                        else interim = t;
                    }
                    setCurrentAnswer(finalTranscript + interim);
                };
                recognition.onerror = () => addToast('info', 'Không nhận diện được giọng nói, hãy nhập tay.');
                recognition.start();
            }

            mr.start(100);
            setIsRecording(true);
            addToast('info', 'Đang ghi âm... Nhấn dừng khi xong.');
        } catch {
            addToast('error', 'Không thể truy cập microphone. Kiểm tra quyền trình duyệt.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            const recognition = (mediaRecorderRef.current as any)._recognition;
            if (recognition) recognition.stop();
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    // ── Helpers ────────────────────────────────────────────────────────────────
    const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    const remaining = Math.max(0, timeLimit - questionTime);
    const timerPct = (remaining / timeLimit) * 100;
    const timerColor = remaining <= 30 ? 'bg-red-500' : remaining <= 60 ? 'bg-yellow-500' : 'bg-indigo-700';

    const qTypeLabel: Record<string, string> = {
        greeting: 'Chào hỏi', warm_up: 'Làm quen', technical: 'Kỹ thuật',
        behavioral: 'Hành vi', situational: 'Tình huống', closing: 'Kết thúc',
        jd_specific: 'Từ JD',
        jd_qualification: 'Bằng cấp & Ngôn ngữ',
        closing_response: 'Câu trả lời',
    };
    const qTypeColor: Record<string, string> = {
        greeting: 'bg-blue-100 text-blue-800', warm_up: 'bg-indigo-50 text-indigo-950',
        technical: 'bg-red-100 text-red-800', behavioral: 'bg-purple-100 text-purple-800',
        situational: 'bg-orange-100 text-orange-800', closing: 'bg-gray-100 text-gray-800',
        jd_specific: 'bg-yellow-100 text-yellow-800',
        jd_qualification: 'bg-teal-100 text-teal-800',
        closing_response: 'bg-gray-100 text-gray-600',
    };
    // Helper: trả về màu bg/border/text cho từng loại câu hỏi
    const qBg: Record<string, string> = {
        technical: 'bg-red-50 border-red-100', behavioral: 'bg-purple-50 border-purple-100',
        situational: 'bg-orange-50 border-orange-100', warm_up: 'bg-green-50 border-green-100',
        jd_specific: 'bg-yellow-50 border-yellow-100',
        jd_qualification: 'bg-teal-50 border-teal-100',
        closing_response: 'bg-gray-50 border-gray-100',
        default: 'bg-blue-50 border-blue-100',
    };
    const qIcon: Record<string, string> = {
        technical: 'bg-red-100 text-red-600', behavioral: 'bg-purple-100 text-purple-600',
        situational: 'bg-orange-100 text-orange-600', warm_up: 'bg-green-100 text-green-600',
        jd_specific: 'bg-yellow-100 text-yellow-600',
        jd_qualification: 'bg-teal-100 text-teal-600',
        closing_response: 'bg-gray-100 text-gray-600',
        default: 'bg-blue-100 text-blue-600',
    };
    const getQBg = (t?: string) => qBg[t || ''] || qBg.default;
    const getQIcon = (t?: string) => qIcon[t || ''] || qIcon.default;
    const getQBadge = (t?: string) => qTypeColor[t || ''] || 'bg-blue-100 text-blue-800';

    const scoreColor = (s?: number) => !s ? 'text-gray-400' : s >= 8 ? 'text-indigo-800' : s >= 6 ? 'text-yellow-600' : 'text-red-600';

    if (isLoading && !session) return (
        <MainLayout>
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-blue-600" /><p className="text-gray-600">Đang chuẩn bị phỏng vấn...</p></div>
            </div>
        </MainLayout>
    );

    return (
        <MainLayout>
            <div className="min-h-[calc(100vh-64px)] flex flex-col bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white relative overflow-x-hidden font-['Plus_Jakarta_Sans'] pb-20">

                <div className="absolute inset-0 bg-dot-pattern pointer-events-none z-0 opacity-60" />
                <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-indigo-400/10 rounded-full blur-[120px] pointer-events-none z-0" />
                <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-purple-400/10 rounded-full blur-[120px] pointer-events-none z-0" />

                <div className="relative z-10 flex flex-col h-full flex-1">
                    <ToastContainer toasts={toasts} onRemove={removeToast} />

                    {/* Top bar */}
                    <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200/50 dark:border-white/10 glass">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setShowAbandonModal(true)}
                                className="text-gray-500 hover:text-gray-900 dark:text-white/60 dark:hover:text-white transition-colors text-sm flex items-center gap-1.5 font-medium">
                                <ArrowLeft className="h-4 w-4" /> Thoát
                            </button>
                            <span className="text-gray-300 dark:text-white/30">|</span>
                            <span className="text-gray-900 dark:text-white font-bold text-sm truncate max-w-xs">{session?.jobTitle}</span>
                            {session?.questionType && (
                                <Badge className={`text-xs ${getQBadge(session.questionType)}`}>
                                    {qTypeLabel[session.questionType] || 'Câu hỏi'}
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5 text-gray-600 dark:text-white/70 text-sm font-medium">
                                <Clock className="h-3.5 w-3.5" />
                                <span className="font-mono">{fmt(elapsedTime)}</span>
                            </div>
                            <div className="text-sm text-gray-500 dark:text-white/50">
                                Câu <span className="text-gray-900 dark:text-white font-bold">{session?.questionNumber}</span>/{session?.questionCount}
                            </div>
                            <button
                                onClick={() => setShowAbandonModal(true)}
                                className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 dark:bg-red-500/20 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/30 text-xs font-semibold transition-colors border border-red-200 dark:border-red-500/30 shadow-sm">
                                Kết thúc
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-1 overflow-hidden">
                        {/* ── LEFT: AI Interviewer panel ── */}
                        <div className="hidden lg:flex flex-col items-center justify-center w-72 xl:w-80 flex-shrink-0 px-6 py-8 glass border-r border-gray-200/50 dark:border-white/10 relative">

                            {/* Avatar */}
                            <div className="relative mb-5">
                                {/* Glow ring */}
                                <div className="absolute inset-0 rounded-full animate-pulse"
                                    style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 70%)', transform: 'scale(1.3)' }} />
                                <div className="w-40 h-40 rounded-full overflow-hidden border-4 relative z-10"
                                    style={{ borderColor: 'rgba(99,102,241,0.6)', boxShadow: '0 0 30px rgba(99,102,241,0.4)' }}>
                                    {showVideo ? (
                                        <video src={videoUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                                    ) : (
                                        <img src={avatarUrl} alt="AI Interviewer" className="w-full h-full object-cover" />
                                    )}
                                </div>
                                {/* Live indicator */}
                                <div className="absolute bottom-2 right-2 z-20 flex items-center gap-1.5 px-2 py-0.5 rounded-full"
                                    style={{ background: 'rgba(16,185,129,0.9)', backdropFilter: 'blur(4px)' }}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                    <span className="text-white text-[10px] font-bold">LIVE</span>
                                </div>
                            </div>

                            <p className="text-indigo-600 dark:text-indigo-300 text-xs font-bold tracking-widest uppercase mb-1">AI INTERVIEWER</p>
                            <p className="text-gray-900 dark:text-white font-semibold text-sm mb-4">{interviewerGender === 'female' ? 'Nữ phỏng vấn viên' : 'Nam phỏng vấn viên'}</p>

                            {/* Toggle video */}
                            <button onClick={() => setShowVideo(v => !v)}
                                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium transition-colors border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/50 dark:bg-transparent rounded-full px-3 py-1">
                                {showVideo ? 'Dùng ảnh tĩnh' : 'Xem video'}
                            </button>

                            {/* Timer bar */}
                            {session?.status === 'active' && (
                                <div className="mt-8 w-full glass p-4 rounded-xl border border-gray-200/50 dark:border-white/10 shadow-sm">
                                    <div className="flex justify-between text-xs mb-2">
                                        <span className="text-gray-500 dark:text-white/60 font-medium">Thời gian câu hỏi</span>
                                        <span className={`font-mono font-bold ${remaining <= 15 ? 'text-red-500 dark:text-red-400 animate-pulse' : remaining <= 30 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-700 dark:text-white/80'}`}>
                                            {fmt(remaining)}
                                        </span>
                                    </div>
                                    <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                                        <div className={`h-full rounded-full transition-all duration-1000 ${timerColor}`}
                                            style={{ width: `${timerPct}%` }} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── RIGHT: Chat + Answer ── */}
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="flex-1 overflow-hidden flex flex-col">
                                {/* old header placeholder - removed */}
                                <div style={{ display: 'none' }}>

                                    {/* Per-question countdown bar */}
                                    {session?.status === 'active' && (
                                        <div className={`mb-4 p-3 rounded-lg border-2 transition-all duration-500 ${remaining <= 30 ? 'border-red-500 bg-red-50 dark:bg-red-900/20' :
                                            remaining <= 60 ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' :
                                                'border-gray-200 bg-gray-50 dark:bg-gray-800'
                                            }`}>
                                            <div className="flex items-center justify-between text-sm mb-2">
                                                <span className="flex items-center gap-2">
                                                    <Timer className={`h-4 w-4 ${remaining <= 30 ? 'text-red-600 animate-pulse' : remaining <= 60 ? 'text-yellow-600' : 'text-gray-600'}`} />
                                                    <span className={remaining <= 30 ? 'text-red-700 font-semibold' : remaining <= 60 ? 'text-yellow-700 font-medium' : 'text-gray-700'}>
                                                        Thời gian câu hỏi
                                                    </span>
                                                </span>
                                                <span className={`font-mono text-lg ${remaining <= 10 ? 'text-red-600 font-bold animate-pulse' :
                                                    remaining <= 30 ? 'text-red-600 font-semibold' :
                                                        remaining <= 60 ? 'text-yellow-600 font-medium' : 'text-gray-600'
                                                    }`}>
                                                    {fmt(remaining)}
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                                <div className={`h-3 rounded-full transition-all duration-1000 ${timerColor} ${remaining <= 10 ? 'animate-pulse' : ''
                                                    }`} style={{ width: `${timerPct}%` }} />
                                            </div>
                                            {remaining <= 30 && (
                                                <div className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium">
                                                    {remaining <= 10 ? '🚨 Hệ thống sẽ tự động gửi câu trả lời!' :
                                                        remaining <= 30 ? '⚠️ Thời gian sắp hết, hãy hoàn thiện câu trả lời!' : ''}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                </div>

                                {/* ── New dark chat layout ── */}
                                <div className="flex flex-col flex-1 overflow-hidden">
                                    <div className="flex-1 overflow-hidden flex flex-col">
                                        <div className="flex-1 overflow-hidden" style={{ position: 'relative' }}>
                                            <div
                                                ref={chatContainerRef}
                                                className="absolute inset-0 overflow-y-auto px-5 py-4 space-y-4"
                                                onScroll={checkScrollPosition}
                                                style={{ scrollBehavior: 'auto' }}
                                            >
                                                {messages.map(msg => (
                                                    <React.Fragment key={msg.id}>
                                                        <div className={`flex ${msg.role === 'candidate' ? 'justify-end' : 'justify-start'}`}>
                                                            {msg.role === 'interviewer' ? (
                                                                /* AI Interviewer bubble — light/dark theme */
                                                                <div className="max-w-[88%] flex gap-3 items-end">
                                                                    {/* Mini avatar */}
                                                                    <img src={avatarUrl} alt="AI" className="w-9 h-9 rounded-full object-cover flex-shrink-0 mb-1 border-2 border-white shadow-sm dark:border-indigo-500/50" />
                                                                    <div className="rounded-2xl rounded-bl-sm overflow-hidden glass border border-gray-200/50 dark:border-indigo-500/30 shadow-md">
                                                                        {/* Header */}
                                                                        <div className="px-4 py-2.5 flex items-center gap-2.5 bg-gray-50/80 dark:bg-indigo-500/10 border-b border-gray-200/50 dark:border-indigo-500/20">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="p-1.5 rounded-lg bg-white shadow-sm dark:bg-indigo-500/30 border border-gray-100 dark:border-transparent">
                                                                                    <Bot className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-300" />
                                                                                </div>
                                                                                <div>
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className="font-bold text-gray-900 dark:text-white text-sm">AI INTERVIEWER</span>
                                                                                        {msg.questionType && (
                                                                                            <Badge className={`text-xs font-medium ${getQBadge(msg.questionType)}`}>
                                                                                                {qTypeLabel[msg.questionType] || msg.questionType}
                                                                                            </Badge>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Question content */}
                                                                        <div className="px-4 py-4 bg-white/60 dark:bg-transparent">
                                                                            {msg.content ? (
                                                                                <div className="text-gray-800 dark:text-white/90 leading-relaxed text-sm">
                                                                                    {/* Enhanced question formatting with proper line breaks */}
                                                                                    {msg.content.split('\n').map((paragraph, index) => {
                                                                                        // Check if this is a question type label line
                                                                                        const isQuestionTypeLabel = paragraph.includes('**') &&
                                                                                            (paragraph.includes('câu hỏi') || paragraph.includes('question'));

                                                                                        return (
                                                                                            <div key={index} className={index > 0 ? 'mt-3' : ''}>
                                                                                                {isQuestionTypeLabel ? (
                                                                                                    // Special formatting for question type labels
                                                                                                    <div className="mb-3">
                                                                                                        <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-lg font-medium text-xs ${getQBadge(msg.questionType)} border`}>
                                                                                                            {msg.questionType === 'technical' && <Code className="h-4 w-4" />}
                                                                                                            {msg.questionType === 'behavioral' && <MessageSquare className="h-4 w-4" />}
                                                                                                            {msg.questionType === 'situational' && <Target className="h-4 w-4" />}
                                                                                                            {msg.questionType === 'warm_up' && <Lightbulb className="h-4 w-4" />}
                                                                                                            {msg.questionType === 'jd_specific' && <FileText className="h-4 w-4" />}
                                                                                                            {!msg.questionType && <MessageSquare className="h-4 w-4" />}
                                                                                                            <span>{paragraph.replace(/\*\*/g, '')}</span>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                ) : (
                                                                                                    // Regular paragraph formatting
                                                                                                    <p className="leading-relaxed text-[15px] font-medium text-gray-800 dark:text-gray-100">
                                                                                                        {paragraph}
                                                                                                    </p>
                                                                                                )}
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            ) : (
                                                                                <div className="flex items-center gap-2 text-indigo-500 dark:text-indigo-300/70 italic font-medium">
                                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                                    <span className="text-sm">Đang chuẩn bị câu hỏi...</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                /* Candidate message — right side */
                                                                <div className="max-w-[82%] flex gap-2 items-end justify-end">
                                                                    <div className="rounded-2xl rounded-br-sm px-4 py-3 text-sm shadow-md"
                                                                        style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff' }}>
                                                                        <div className="flex items-center gap-1.5 mb-1 opacity-90">
                                                                            <User className="h-3 w-3" />
                                                                            <span className="text-xs font-bold tracking-wide uppercase">Bạn</span>
                                                                        </div>
                                                                        {msg.content
                                                                            ? <p className="leading-relaxed font-medium text-[15px]">{msg.content}</p>
                                                                            : <p className="leading-relaxed italic opacity-80">Bỏ qua câu hỏi này</p>
                                                                        }
                                                                    </div>
                                                                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 mb-1 shadow-sm border border-indigo-400">
                                                                        <User className="h-4 w-4 text-white" />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Eval card directly under candidate message - only when scored */}
                                                        {msg.role === 'candidate' && msg.score !== undefined && msg.score !== null && (
                                                            <div className="w-full glass bg-white/70 dark:bg-gray-800/60 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl p-5 text-sm shadow-sm mt-3">
                                                                <div className="flex items-center justify-between mb-4">
                                                                    <span className="font-bold text-gray-900 dark:text-white">Đánh giá câu trả lời</span>
                                                                    <span className={`text-xl font-black ${scoreColor(msg.score)}`}>{msg.score?.toFixed(1)}/10</span>
                                                                </div>

                                                                {msg.detailedScores && (
                                                                    <div className="space-y-3 mb-4">
                                                                        {([
                                                                            { key: 'technical' as const, label: 'Kỹ năng chuyên môn' },
                                                                            { key: 'logic' as const, label: 'Tư duy logic' },
                                                                            { key: 'communication' as const, label: 'Giao tiếp' },
                                                                            { key: 'experience' as const, label: 'Kinh nghiệm thực tế' },
                                                                            { key: 'attitude' as const, label: 'Thái độ' },
                                                                        ]).map(({ key, label }) => {
                                                                            const s = msg.detailedScores![key];
                                                                            const reason = msg.scoreReasoning?.[key];
                                                                            return (
                                                                                <div key={key} className="bg-white/60 dark:bg-gray-900/40 rounded-xl p-3 border border-gray-100 dark:border-gray-700/50">
                                                                                    <div className="flex items-center justify-between mb-1.5">
                                                                                        <span className="font-semibold text-gray-800 dark:text-gray-200 text-xs">{label}</span>
                                                                                        <div className="flex items-center gap-1">
                                                                                            <span className={`font-bold text-sm ${scoreColor(s)}`}>{s}/10</span>
                                                                                            <ScoreTooltip score={s || 0} skillName={label} />
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-2 overflow-hidden">
                                                                                        <div className={`h-1.5 rounded-full ${(s ?? 0) >= 8 ? 'bg-indigo-600 dark:bg-indigo-500' : (s ?? 0) >= 6 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                                                            style={{ width: `${(s ?? 0) * 10}%` }} />
                                                                                    </div>
                                                                                    {reason && <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed font-medium">{reason}</p>}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}

                                                                {msg.feedback && (
                                                                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-xl p-3 mb-3">
                                                                        <p className="text-xs font-bold text-blue-800 dark:text-blue-300 mb-1">Nhận xét tổng thể</p>
                                                                        <p className="text-xs text-blue-700 dark:text-blue-200 leading-relaxed">{msg.feedback}</p>
                                                                    </div>
                                                                )}

                                                                <div className="grid grid-cols-2 gap-3 mb-3">
                                                                    {msg.strengths && msg.strengths.length > 0 && (
                                                                        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-xl p-3">
                                                                            <p className="text-xs font-bold text-indigo-900 dark:text-indigo-300 mb-2"> Điểm mạnh</p>
                                                                            {msg.strengths.map((s, i) => <p key={i} className="text-xs text-indigo-800 dark:text-indigo-200 mb-1 leading-relaxed">• {s}</p>)}
                                                                        </div>
                                                                    )}
                                                                    {msg.weaknesses && msg.weaknesses.length > 0 && (
                                                                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-xl p-3">
                                                                            <p className="text-xs font-bold text-red-800 dark:text-red-300 mb-2"> Cần cải thiện</p>
                                                                            {msg.weaknesses.map((w, i) => <p key={i} className="text-xs text-red-700 dark:text-red-200 mb-1 leading-relaxed">• {w}</p>)}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {msg.suggestion && (
                                                                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800/30 rounded-xl p-3">
                                                                        <p className="text-xs font-bold text-yellow-800 dark:text-yellow-400 mb-1"> Gợi ý</p>
                                                                        <p className="text-xs text-yellow-700 dark:text-yellow-200 leading-relaxed">{msg.suggestion}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Suggestion-only card for skipped questions */}
                                                        {msg.role === 'candidate' && (msg.score === undefined || msg.score === null) && msg.suggestion && (
                                                            <div className="w-full glass bg-yellow-50/90 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/30 rounded-2xl p-4 text-sm mt-3 shadow-sm">
                                                                <p className="text-xs font-bold text-yellow-800 dark:text-yellow-400 mb-1"> Gợi ý cho câu hỏi này</p>
                                                                <p className="text-xs text-yellow-700 dark:text-yellow-200 leading-relaxed font-medium">{msg.suggestion}</p>
                                                            </div>
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                            </div>

                                            {/* Scroll to bottom button */}
                                            {showScrollButton && (
                                                <div className="absolute bottom-20 right-6 z-10">
                                                    <button
                                                        onClick={scrollToBottom}
                                                        className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg transition-all duration-200 hover:scale-105 animate-bounce"
                                                        title="Cuộn xuống tin nhắn mới nhất"
                                                    >
                                                        <ChevronDown className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            )}

                                            {/* Input */}
                                            {session?.status === 'active' && (
                                                <div className="border-t border-gray-200/50 dark:border-white/10 px-6 py-4 space-y-3 glass bg-white/50 dark:bg-gray-900/50">
                                                    {/* Loading indicator */}
                                                    {isLoading && (
                                                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/20 shadow-sm w-max">
                                                            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                                                            <span>Đang chấm điểm và chuẩn bị câu hỏi tiếp theo...</span>
                                                        </div>
                                                    )}
                                                    <textarea
                                                        value={currentAnswer}
                                                        onChange={e => setCurrentAnswer(e.target.value)}
                                                        onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleSubmit(); }}
                                                        placeholder="Nhập câu trả lời... (Ctrl+Enter để gửi)"
                                                        disabled={isLoading}
                                                        rows={3}
                                                        className="w-full px-5 py-3 rounded-2xl text-[15px] font-medium focus:outline-none resize-none glass bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500/50 shadow-inner"
                                                    />
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <button className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${isRecording ? 'bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/40' : 'glass bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                                                onClick={isRecording ? stopRecording : startRecording} disabled={isLoading}>
                                                                {isRecording ? <><MicOff className="h-4 w-4" />Dừng</> : <><Mic className="h-4 w-4" />Ghi âm</>}
                                                            </button>
                                                            {isRecording && <span className="text-sm font-medium text-red-500 dark:text-red-400 animate-pulse">● Đang ghi...</span>}
                                                            {audioDuration && !isRecording && <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400"> {audioDuration.toFixed(1)}s</span>}
                                                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{currentAnswer.length} ký tự</span>
                                                        </div>
                                                        <button onClick={() => handleSubmit()} disabled={isLoading}
                                                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0"
                                                            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff' }}>
                                                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                                            Gửi trả lời
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Sidebar — progress + skills */}
                                    <div className="w-64 xl:w-72 flex-shrink-0 flex flex-col gap-4 p-5 overflow-y-auto glass border-l border-gray-200/50 dark:border-white/10 relative">
                                        {/* Progress */}
                                        <div className="rounded-2xl p-5 glass bg-white/60 dark:bg-gray-800/40 border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
                                            <p className="text-gray-500 dark:text-white/50 text-xs font-bold uppercase tracking-widest mb-3">Tiến độ</p>
                                            <div className="flex justify-between text-sm text-gray-900 dark:text-white mb-2">
                                                <span className="text-gray-600 dark:text-white/70 font-medium">Câu hỏi</span>
                                                <span className="font-bold">{Math.min(session?.questionNumber || 0, session?.questionCount || 5)}/{session?.questionCount || 5}</span>
                                            </div>
                                            <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                                <div className="h-full rounded-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-500"
                                                    style={{ width: `${Math.min(((session?.questionNumber || 0) / (session?.questionCount || 5)) * 100, 100)}%` }} />
                                            </div>
                                            <p className="text-gray-500 dark:text-white/40 text-xs mt-3 font-medium">Tổng thời gian: <span className="font-mono">{fmt(elapsedTime)}</span></p>
                                        </div>

                                        {/* Skills Section */}
                                        {session?.skillsContext && session.skillsContext.length > 0 && (
                                            <div className="rounded-2xl p-5 glass bg-white/60 dark:bg-gray-800/40 border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
                                                <p className="text-gray-500 dark:text-white/50 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-1.5">
                                                    <Brain className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> Kỹ năng đánh giá
                                                </p>
                                                <div className="space-y-2">
                                                    {(session.skillsContext as any[]).slice(0, 8).map((skill: any, index: number) => (
                                                        <div key={index} className="flex items-center justify-between text-sm">
                                                            <span className="text-gray-700 dark:text-white/80 truncate flex-1 mr-2 font-medium">{skill.skill_name}</span>
                                                            <span className={`font-bold shrink-0 ${skill.is_hard_skill ? 'text-orange-600 dark:text-orange-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                                                                {(skill.importance || 0).toFixed(1)}/5
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Tips */}
                                        <div className="rounded-2xl p-5 glass bg-white/60 dark:bg-gray-800/40 border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
                                            <p className="text-gray-500 dark:text-white/50 text-xs font-bold uppercase tracking-widest mb-3">Gợi ý</p>
                                            <ul className="text-sm space-y-2 text-gray-700 dark:text-white/70 font-medium">
                                                <li className="flex items-start gap-2"><span className="text-indigo-500">•</span> Nói chậm, rõ ràng và tự tin</li>
                                                <li className="flex items-start gap-2"><span className="text-indigo-500">•</span> Dùng ví dụ cụ thể với số liệu</li>
                                                <li className="flex items-start gap-2"><span className="text-indigo-500">•</span> Thái độ tích cực và học hỏi</li>
                                                <li className="flex items-start gap-2"><span className="text-indigo-500">•</span> Hỏi lại nếu không hiểu</li>
                                            </ul>
                                        </div>

                                        {/* Completed actions */}
                                        {session?.status === 'completed' && (
                                            <div className="space-y-3 mt-4">
                                                <button className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/40 hover:-translate-y-0.5"
                                                    style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}
                                                    onClick={() => navigate(`/interview/results/${session.sessionId}`)}>
                                                    Xem kết quả chi tiết
                                                </button>
                                                <button className="w-full py-3 rounded-xl font-bold text-sm transition-all glass bg-white/50 dark:bg-gray-800/50 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-700 hover:bg-white/80 dark:hover:bg-gray-700 shadow-sm"
                                                    onClick={() => navigate('/dashboard')}>
                                                    Về Dashboard
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Abandon Confirmation Modal ─────────────────────────────────── */}
                {showAbandonModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                    <XCircle className="h-5 w-5 text-red-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Hủy buổi phỏng vấn?</h2>
                                    <p className="text-sm text-gray-500">Hành động này không thể hoàn tác</p>
                                </div>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                                Buổi phỏng vấn sẽ được đánh dấu là <span className="font-semibold text-red-600">"Đã hủy"</span> và bạn sẽ được chuyển về trang danh sách phỏng vấn.
                            </p>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => { setShowAbandonModal(false); pendingAbandonRef.current = null; }}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Tiếp tục phỏng vấn
                                </button>
                                <button
                                    onClick={() => { setShowAbandonModal(false); pendingAbandonRef.current?.(); pendingAbandonRef.current = null; }}
                                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    Xác nhận hủy
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout >
    );
};

export default InterviewPage;
