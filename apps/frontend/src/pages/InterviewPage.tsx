import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Loader2, Mic, MicOff, Send, Clock, User, Bot, CheckCircle, XCircle, AlertCircle, Timer, Users, Brain, Code, MessageSquare, Target, Lightbulb, FileText, ChevronDown } from 'lucide-react';
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
                    ${t.type === 'success' ? 'bg-green-600 text-white' : t.type === 'error' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}
            >
                {t.type === 'success' ? <CheckCircle className="h-4 w-4 shrink-0" /> :
                    t.type === 'error' ? <XCircle className="h-4 w-4 shrink-0" /> :
                        <AlertCircle className="h-4 w-4 shrink-0" />}
                <span>{t.message}</span>
                <button onClick={() => onRemove(t.id)} className="ml-2 opacity-70 hover:opacity-100">✕</button>
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
const InterviewPage: React.FC = () => {
    const { jobId } = useParams<{ jobId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

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
    const timerColor = remaining <= 30 ? 'bg-red-500' : remaining <= 60 ? 'bg-yellow-500' : 'bg-green-500';

    const qTypeLabel: Record<string, string> = {
        greeting: 'Chào hỏi', warm_up: 'Làm quen', technical: 'Kỹ thuật',
        behavioral: 'Hành vi', situational: 'Tình huống', closing: 'Kết thúc',
        jd_specific: 'Từ JD',
        jd_qualification: 'Bằng cấp & Ngôn ngữ',
        closing_response: 'Câu trả lời',
    };
    const qTypeColor: Record<string, string> = {
        greeting: 'bg-blue-100 text-blue-800', warm_up: 'bg-green-100 text-green-800',
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

    const scoreColor = (s?: number) => !s ? 'text-gray-400' : s >= 8 ? 'text-green-600' : s >= 6 ? 'text-yellow-600' : 'text-red-600';

    if (isLoading && !session) return (
        <MainLayout>
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-blue-600" /><p className="text-gray-600">Đang chuẩn bị phỏng vấn...</p></div>
            </div>
        </MainLayout>
    );

    return (
        <MainLayout>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6">
                <ToastContainer toasts={toasts} onRemove={removeToast} />
                <div className="max-w-5xl mx-auto px-4">

                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Phỏng vấn AI — {session?.jobTitle}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm text-gray-500">Câu {session?.questionNumber}</span>
                                <span className="text-gray-300">•</span>
                                {session?.questionType && (
                                    <Badge className={`text-xs font-medium ${getQBadge(session.questionType)}`}>
                                        {qTypeLabel[session.questionType] || 'Khác'}
                                    </Badge>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                                <Clock className="h-4 w-4" /><span>{fmt(elapsedTime)}</span>
                            </div>
                            <Badge className={session?.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}>
                                {session?.status === 'active' ? 'Đang diễn ra' : 'Hoàn thành'}
                            </Badge>
                        </div>
                    </div>

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

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        {/* Chat */}
                        <div className="lg:col-span-2">
                            <Card className="flex flex-col" style={{ height: 'min(900px, 88vh)' }}>
                                <CardHeader><CardTitle className="text-base">Cuộc trò chuyện</CardTitle></CardHeader>
                                <CardContent className="flex-1 flex flex-col overflow-hidden p-0 relative">
                                    <div
                                        ref={chatContainerRef}
                                        className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
                                        onScroll={checkScrollPosition}
                                        style={{ scrollBehavior: 'auto' }}
                                    >
                                        {messages.map(msg => (
                                            <React.Fragment key={msg.id}>
                                                <div className={`flex ${msg.role === 'candidate' ? 'justify-end' : 'justify-start'}`}>
                                                    {msg.role === 'interviewer' ? (
                                                        /* HR Manager Message - Enhanced styling */
                                                        <div className="max-w-[85%] bg-white border border-gray-200 rounded-xl shadow-sm">
                                                            {/* Header with role and question type */}
                                                            <div className={`px-4 py-3 rounded-t-xl border-b ${getQBg(msg.questionType)}`}>
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`p-2 rounded-lg ${getQIcon(msg.questionType)}`}>
                                                                        <Bot className="h-4 w-4" />
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-semibold text-gray-900">HR Manager</span>
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
                                                            <div className="px-4 py-4">
                                                                {msg.content ? (
                                                                    <div className="text-gray-800 leading-relaxed text-xs">
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
                                                                                        <p className="leading-relaxed text-xs">
                                                                                            {paragraph}
                                                                                        </p>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center gap-2 text-gray-500 italic">
                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                        <span>Đang chuẩn bị câu hỏi...</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        /* Candidate Message - Keep existing style */
                                                        <div className="max-w-[82%] bg-blue-600 text-white rounded-xl px-4 py-3 text-sm">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <User className="h-3.5 w-3.5" />
                                                                <span className="font-medium text-xs">Bạn</span>
                                                            </div>
                                                            {msg.content
                                                                ? <p className="leading-relaxed">{msg.content}</p>
                                                                : <p className="leading-relaxed italic opacity-60">Bỏ qua câu hỏi này</p>
                                                            }
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Eval card directly under candidate message - only when scored */}
                                                {msg.role === 'candidate' && msg.score !== undefined && msg.score !== null && (
                                                    <div className="w-full bg-white border border-blue-100 rounded-xl p-4 text-sm shadow-sm">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <span className="font-semibold text-gray-800">Đánh giá câu trả lời</span>
                                                            <span className={`text-xl font-bold ${scoreColor(msg.score)}`}>{msg.score?.toFixed(1)}/10</span>
                                                        </div>

                                                        {msg.detailedScores && (
                                                            <div className="space-y-2 mb-3">
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
                                                                        <div key={key} className="bg-gray-50 rounded-lg p-2">
                                                                            <div className="flex items-center justify-between mb-0.5">
                                                                                <span className="font-medium text-gray-700 text-xs">{label}</span>
                                                                                <div className="flex items-center gap-1">
                                                                                    <span className={`font-bold text-sm ${scoreColor(s)}`}>{s}/10</span>
                                                                                    <ScoreTooltip score={s || 0} skillName={label} />
                                                                                </div>
                                                                            </div>
                                                                            <div className="w-full bg-gray-200 rounded-full h-1 mb-1">
                                                                                <div className={`h-1 rounded-full ${(s ?? 0) >= 8 ? 'bg-green-500' : (s ?? 0) >= 6 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                                                    style={{ width: `${(s ?? 0) * 10}%` }} />
                                                                            </div>
                                                                            {reason && <p className="text-xs text-gray-500 leading-relaxed">{reason}</p>}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}

                                                        {msg.feedback && (
                                                            <div className="bg-blue-50 rounded-lg p-2 mb-2">
                                                                <p className="text-xs font-medium text-blue-800 mb-0.5">Nhận xét tổng thể</p>
                                                                <p className="text-xs text-blue-700">{msg.feedback}</p>
                                                            </div>
                                                        )}

                                                        <div className="grid grid-cols-2 gap-2 mb-2">
                                                            {msg.strengths && msg.strengths.length > 0 && (
                                                                <div className="bg-green-50 rounded-lg p-2">
                                                                    <p className="text-xs font-medium text-green-800 mb-1">✓ Điểm mạnh</p>
                                                                    {msg.strengths.map((s, i) => <p key={i} className="text-xs text-green-700">• {s}</p>)}
                                                                </div>
                                                            )}
                                                            {msg.weaknesses && msg.weaknesses.length > 0 && (
                                                                <div className="bg-red-50 rounded-lg p-2">
                                                                    <p className="text-xs font-medium text-red-800 mb-1">✗ Cần cải thiện</p>
                                                                    {msg.weaknesses.map((w, i) => <p key={i} className="text-xs text-red-700">• {w}</p>)}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {msg.suggestion && (
                                                            <div className="bg-yellow-50 rounded-lg p-2">
                                                                <p className="text-xs font-medium text-yellow-800 mb-0.5">💡 Gợi ý</p>
                                                                <p className="text-xs text-yellow-700">{msg.suggestion}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Suggestion-only card for skipped questions */}
                                                {msg.role === 'candidate' && (msg.score === undefined || msg.score === null) && msg.suggestion && (
                                                    <div className="w-full bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm">
                                                        <p className="text-xs font-medium text-yellow-800 mb-0.5">💡 Gợi ý cho câu hỏi này</p>
                                                        <p className="text-xs text-yellow-700">{msg.suggestion}</p>
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
                                        <div className="border-t px-4 py-3 space-y-2">
                                            {/* Loading indicator */}
                                            {isLoading && (
                                                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg text-sm text-blue-700">
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
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 resize-none"
                                            />
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Btn variant={isRecording ? 'danger' : 'outline'} size="sm"
                                                        onClick={isRecording ? stopRecording : startRecording} disabled={isLoading}>
                                                        {isRecording ? <><MicOff className="h-3.5 w-3.5 mr-1" />Dừng ghi âm</> : <><Mic className="h-3.5 w-3.5 mr-1" />Ghi âm</>}
                                                    </Btn>
                                                    {isRecording && <span className="text-xs text-red-600 animate-pulse">● Đang ghi...</span>}
                                                    {audioDuration && !isRecording && <span className="text-xs text-green-600">✓ {audioDuration.toFixed(1)}s</span>}
                                                    <span className="text-xs text-gray-400">{currentAnswer.length} ký tự</span>
                                                </div>
                                                <Btn onClick={() => handleSubmit()} disabled={isLoading}>
                                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                                                    Gửi
                                                </Btn>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-4">
                            <Card>
                                <CardContent className="p-5 text-center">
                                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-3 flex items-center justify-center">
                                        <Bot className="h-8 w-8 text-white" />
                                    </div>
                                    <p className="font-semibold text-gray-900 text-sm">HR Manager</p>
                                    <p className="text-xs text-gray-500">AI Interviewer</p>
                                    {session?.status === 'active' && (
                                        <div className="mt-2 flex items-center justify-center gap-1">
                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                            <span className="text-xs text-green-600">Đang hoạt động</span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Progress */}
                            <Card>
                                <CardHeader><CardTitle className="text-sm">Tiến độ</CardTitle></CardHeader>
                                <CardContent className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Câu hỏi</span>
                                        <span>{Math.min(session?.questionNumber || 0, session?.questionCount || 5)}/{session?.questionCount || 5}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                                        <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(((session?.questionNumber || 0) / (session?.questionCount || 5)) * 100, 100)}%` }} />
                                    </div>
                                    <div className="text-xs text-gray-500">Tổng thời gian: {fmt(elapsedTime)}</div>
                                </CardContent>
                            </Card>

                            {/* Enhanced Skills Section - Consistent with Results Page */}
                            {session?.skillsContext && session.skillsContext.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm flex items-center">
                                            <Brain className="h-4 w-4 mr-2 text-indigo-600" />
                                            Kỹ năng được đánh giá
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {/* Soft Skills - filter is_hard_skill === false */}
                                        {(() => {
                                            const softSkills = (session.skillsContext as any[]).filter((s: any) => s.is_hard_skill === false);
                                            const hardSkills = (session.skillsContext as any[]).filter((s: any) => s.is_hard_skill === true);
                                            return (
                                                <>
                                                    {softSkills.length > 0 && (
                                                        <div>
                                                            <h4 className="text-xs font-semibold text-gray-900 mb-2 flex items-center">
                                                                <Users className="h-3 w-3 mr-1 text-blue-600" />
                                                                Kỹ năng mềm
                                                            </h4>
                                                            <div className="space-y-1">
                                                                {softSkills.slice(0, 5).map((skill: any, index: number) => (
                                                                    <div
                                                                        key={index}
                                                                        className="flex items-center justify-between text-xs group cursor-help relative p-2 rounded-lg hover:bg-blue-50 transition-colors"
                                                                        title={`${skill.skill_name} - Mức độ quan trọng: ${(skill.importance || 0).toFixed(1)}/5`}
                                                                    >
                                                                        <span className="text-gray-700 group-hover:text-blue-700 transition-colors flex-1 mr-2 truncate">
                                                                            {skill.skill_name}
                                                                        </span>
                                                                        <span className="text-blue-600 font-medium group-hover:text-blue-700 transition-colors shrink-0">
                                                                            {(skill.importance || 0).toFixed(1)}/5
                                                                        </span>
                                                                        <div className="absolute left-0 bottom-full mb-2 w-max max-w-xs bg-gray-900 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 shadow-lg">
                                                                            <div className="font-medium mb-1">{skill.skill_name}</div>
                                                                            <div className="text-gray-300">Mức độ quan trọng: <span className="text-blue-300 font-medium">{(skill.importance || 0).toFixed(1)}/5</span></div>
                                                                            <div className="text-gray-300">Loại: <span className="text-blue-300 font-medium">{skill.skill_type}</span></div>
                                                                            <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                {softSkills.length > 5 && (
                                                                    <p className="text-xs text-gray-500 mt-2 text-center">+{softSkills.length - 5} kỹ năng khác</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {hardSkills.length > 0 && (
                                                        <div>
                                                            <h4 className="text-xs font-semibold text-gray-900 mb-2 flex items-center">
                                                                <div className="h-3 w-3 mr-1 text-orange-600">🔧</div>
                                                                Kỹ năng chuyên ngành
                                                            </h4>
                                                            <div className="space-y-1">
                                                                {hardSkills.slice(0, 5).map((skill: any, index: number) => (
                                                                    <div
                                                                        key={index}
                                                                        className="flex items-center justify-between text-xs group cursor-help relative p-2 rounded-lg hover:bg-orange-50 transition-colors"
                                                                        title={`${skill.skill_name} - Mức độ quan trọng: ${(skill.importance || 0).toFixed(1)}/5`}
                                                                    >
                                                                        <span className="text-gray-700 group-hover:text-orange-700 transition-colors flex-1 mr-2 truncate">
                                                                            {skill.skill_name}
                                                                        </span>
                                                                        <span className="text-orange-600 font-medium group-hover:text-orange-700 transition-colors shrink-0">
                                                                            {(skill.importance || 0).toFixed(1)}/5
                                                                        </span>
                                                                        <div className="absolute left-0 bottom-full mb-2 w-max max-w-xs bg-gray-900 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 shadow-lg">
                                                                            <div className="font-medium mb-1">{skill.skill_name}</div>
                                                                            <div className="text-gray-300">Mức độ quan trọng: <span className="text-orange-300 font-medium">{(skill.importance || 0).toFixed(1)}/5</span></div>
                                                                            <div className="text-gray-300">Loại: <span className="text-orange-300 font-medium">Kỹ năng chuyên ngành</span></div>
                                                                            <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                {hardSkills.length > 5 && (
                                                                    <p className="text-xs text-gray-500 mt-2 text-center">+{hardSkills.length - 5} kỹ năng khác</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Tips */}
                            <STARMethodGuide className="mb-4" />

                            <Card>
                                <CardHeader><CardTitle className="text-sm">Gợi ý thêm</CardTitle></CardHeader>
                                <CardContent>
                                    <ul className="text-xs text-gray-600 space-y-1.5">
                                        <li>• Nói chậm, rõ ràng và tự tin</li>
                                        <li>• Sử dụng ví dụ cụ thể, có số liệu</li>
                                        <li>• Thể hiện thái độ tích cực và học hỏi</li>
                                        <li>• Đừng ngại hỏi lại nếu không hiểu câu hỏi</li>
                                    </ul>
                                </CardContent>
                            </Card>

                            {/* Completed actions */}
                            {session?.status === 'completed' && (
                                <div className="space-y-2">
                                    <Btn className="w-full" onClick={() => navigate(`/interview/results/${session.sessionId}`)}>
                                        Xem kết quả chi tiết
                                    </Btn>
                                    <Btn variant="outline" className="w-full" onClick={() => navigate('/dashboard')}>
                                        Về Dashboard
                                    </Btn>
                                </div>
                            )}
                        </div>
                    </div>
                </div >
            </div >

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
        </MainLayout >
    );
};

export default InterviewPage;
