import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Play, Loader2, FileText, Upload, X, CheckCircle, ChevronDown, ChevronUp, Mic, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { interviewService, CareerLevel } from '../services/interviewService';
import QuestionCountSelector from '../components/interview/QuestionCountSelector';
import STARMethodGuide from '../components/interview/STARMethodGuide';
import LevelCard from '../components/interview/LevelCard';
import MainLayout from '../components/layout/MainLayout';
interface JobInfo {
    id: string;
    title: string;
    soft_skills: Array<{
        skill_name: string;
        skill_type: string;
        importance: number;
        level: number;
    }>;
    hard_skills: Array<{
        skill_name: string;
        skill_type: string;
        importance: number;
        level: number;
    }>;
    hard_skills_total: number;
}

const InterviewSelectionPage: React.FC = () => {
    const { jobId } = useParams<{ jobId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    // CV-based interview context from SkillGapPage navigation
    const cvState = (location.state as any) || {};
    const skillGapAnalysisId: number | null = cvState.skill_gap_analysis_id || null;
    const hasCvData: boolean = !!cvState.cv_based && !!skillGapAnalysisId;
    // Normalize cv_skills: may be string[] or {name, category}[]
    const cvSkills: string[] = (cvState.cv_skills || []).map((s: any) =>
        typeof s === 'string' ? s : (s?.name || s?.skill_name || '')
    ).filter(Boolean);
    const matchPct: number = cvState.match_percentage || 0;
    const cvGaps = cvState.skill_gaps || {};
    const criticalGaps: string[] = ((cvGaps?.critical || []).map((s: any) => typeof s === 'string' ? s : s?.name).filter(Boolean)).slice(0, 5);
    const importantGaps: string[] = ((cvGaps?.important || []).map((s: any) => typeof s === 'string' ? s : s?.name).filter(Boolean)).slice(0, 3);

    // Interview direction: 'job' = Hướng 1 (tiêu chuẩn), 'cv' = Hướng 2 (từ CV)
    const [interviewDirection, setInterviewDirection] = useState<'job' | 'cv'>(hasCvData ? 'cv' : 'job');
    const isCvBased = interviewDirection === 'cv' && hasCvData;

    const [jobInfo, setJobInfo] = useState<JobInfo | null>(null);
    const [selectedQuestionCount, setSelectedQuestionCount] = useState(7);
    const [isLoading, setIsLoading] = useState(true);
    const [isStarting, setIsStarting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const loadingRef = useRef(false);

    // Level selection state
    const [careerLevels, setCareerLevels] = useState<CareerLevel[]>([]);
    const [selectedLevel, setSelectedLevel] = useState<CareerLevel | null>(null);
    const [levelsLoading, setLevelsLoading] = useState(false);
    const [levelsError, setLevelsError] = useState<string | null>(null);

    // Interview mode state
    const [interviewMode, setInterviewMode] = useState<'text' | 'voice'>('text');
    // Interviewer gender
    const [interviewerGender, setInterviewerGender] = useState<'female' | 'male'>('female');

    // JD state
    const [jdExpanded, setJdExpanded] = useState(false);
    const [jdMode, setJdMode] = useState<'text' | 'file'>('text');
    const [jdText, setJdText] = useState('');
    const [jdFile, setJdFile] = useState<File | null>(null);
    const [jdId, setJdId] = useState<number | null>(null);
    const [jdUploading, setJdUploading] = useState(false);
    const [jdError, setJdError] = useState<string | null>(null);
    const [jdExtracted, setJdExtracted] = useState<{
        required_skills: string[];
        tools: string[];
        responsibilities: string[];
        training_program: string[];
        qualifications: string[];
        experience_level: string;
        domain: string;
        company_name: string;
        location: string;
        benefits: string[];
    } | null>(null);
    const [jdQuestionsCount, setJdQuestionsCount] = useState(2);
    // accordion state cho từng section
    const [jdOpen, setJdOpen] = useState<Record<string, boolean>>({
        skills: false, tools: false, responsibilities: false, training: false, qualifications: false
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Scroll to top when component mounts
        window.scrollTo(0, 0);

        if (!user) {
            navigate('/login', {
                state: {
                    from: `/interview/${jobId}`,
                    message: 'Vui lòng đăng nhập để bắt đầu phỏng vấn'
                }
            });
            return;
        }

        if (jobId) {
            // Tránh double call trong React StrictMode
            if (!loadingRef.current) {
                loadingRef.current = true;
                loadJobInfo();
            }
        }
    }, [jobId, user, navigate]);

    const loadJobInfo = async (retry = false) => {
        if (!jobId) return;

        try {
            if (!retry) {
                setIsLoading(true);
                setError(null);
            }

            // Check if URL has invalid ONET code format
            // Valid format: XX-XXXX.XX (e.g., 27-2099.00)
            // Invalid formats: XX-XXXX-XX, XX-XXXX-X, etc.
            const validOnetPattern = /^\d{2}-\d{4}\.\d{2}$/;
            if (!validOnetPattern.test(jobId)) {
                console.log(`Invalid ONET code format in URL: ${jobId} (expected format: XX-XXXX.XX)`);
                setError('Không thể tải thông tin nghề nghiệp. Vui lòng thử lại.');
                return;
            }

            console.log(`Loading job info for: ${jobId} (attempt ${retryCount + 1})`);
            const info = await interviewService.getJobInfo(jobId);
            setJobInfo(info);
            setRetryCount(0); // Reset retry count on success

            // Load career levels after job info is loaded with small delay to avoid race condition
            console.log(`📋 Job info loaded, now loading career levels...`);
            setTimeout(() => {
                loadCareerLevels();
            }, 100); // Small delay to ensure job info is fully set
        } catch (err: any) {
            console.error('Error loading job info:', err);

            // Retry logic for timeout errors
            if (err.code === 'ECONNABORTED' && retryCount < 2) {
                console.log(`Retrying... (${retryCount + 1}/2)`);
                setRetryCount(prev => prev + 1);
                setTimeout(() => loadJobInfo(true), 2000); // Retry after 2 seconds
                return;
            }

            setError('Không thể tải thông tin nghề nghiệp. Vui lòng thử lại.');
        } finally {
            if (!retry || retryCount >= 2) {
                setIsLoading(false);
            }
        }
    };

    const loadCareerLevels = async () => {
        if (!jobId) return;

        try {
            console.log(`🔍 Loading career levels for job: ${jobId}`);
            setLevelsLoading(true);
            setLevelsError(null);

            const levelsData = await interviewService.getCareerLevels(jobId);
            console.log(`✅ Career levels loaded:`, levelsData);
            setCareerLevels(levelsData.levels);

            // Don't auto-select any level - let user choose
            // User must manually select a level before starting interview
        } catch (err: any) {
            console.error('❌ Error loading career levels:', err);
            console.error('Error details:', {
                message: err.message,
                status: err.response?.status,
                data: err.response?.data
            });
            setLevelsError('Không thể tải cấp bậc nghề nghiệp. Vui lòng thử lại.');
        } finally {
            setLevelsLoading(false);
        }
    };

    const handleStartInterview = async () => {
        if (!jobId || !user) return;

        try {
            setIsStarting(true);

            const validOnetPattern = /^\d{2}-\d{4}\.\d{2}$/;
            if (!validOnetPattern.test(jobId)) {
                throw new Error('Invalid ONET code format');
            }

            if (interviewMode === 'voice') {
                sessionStorage.setItem('voiceInterviewParams', JSON.stringify({
                    job_id: jobId,
                    question_count: selectedQuestionCount,
                    jd_id: jdId,
                    level_slug: selectedLevel?.slug,
                    // CV-based interview: pass skill_gap_analysis_id if Hướng 2 was selected
                    skill_gap_analysis_id: isCvBased ? (skillGapAnalysisId ?? null) : null,
                }));
                // Save gender for VoiceInterviewPage to use as voice preference
                sessionStorage.setItem('interviewerGender', interviewerGender);
                navigate('/interview/device-test');
                return;
            }

            // Only send skillGapAnalysisId when user explicitly chose Hướng 2 (CV-based)
            const response = await interviewService.startInterview(
                jobId,
                selectedQuestionCount,
                jdId ?? undefined,
                selectedLevel?.slug,
                isCvBased ? (skillGapAnalysisId ?? undefined) : undefined,
            );
            navigate(`/interview/${jobId}?questions=${selectedQuestionCount}`, {
                state: {
                    sessionData: response,
                    jdId: jdId ?? undefined,
                    levelSlug: selectedLevel?.slug,
                    interviewerGender,
                    // CV-based context pass-through
                    isCvBased,
                    skillGapAnalysisId,
                }
            });
        } catch (err: any) {
            if (err?.response?.status === 401) {
                navigate('/login', { state: { from: `/interview/${jobId}`, message: 'Phiên đăng nhập đã hết hạn.' } });
            } else {
                setError('Không thể bắt đầu phỏng vấn. Vui lòng thử lại.');
            }
        } finally {
            setIsStarting(false);
        }
    };

    const handleSubmitJD = async () => {
        if (!jobId) return;
        setJdUploading(true);
        setJdError(null);
        try {
            let res;
            if (jdMode === 'text') {
                if (jdText.trim().length < 50) {
                    setJdError('Nội dung JD phải có ít nhất 50 ký tự.');
                    setJdUploading(false);
                    return;
                }
                res = await interviewService.submitJDManual(jobId, jdText.trim());
            } else {
                if (!jdFile) {
                    setJdError('Vui lòng chọn file PDF hoặc DOCX.');
                    setJdUploading(false);
                    return;
                }
                res = await interviewService.uploadJDFile(jdFile, jobId);
            }
            setJdId(res.jd_id);
            setJdExtracted(res.extracted_data as any);
            setJdQuestionsCount(res.jd_questions_count ?? 2);
        } catch (e: any) {
            setJdError(e?.response?.data?.detail || 'Không thể xử lý JD. Vui lòng thử lại.');
        } finally {
            setJdUploading(false);
        }
    };

    const handleClearJD = () => {
        setJdId(null);
        setJdExtracted(null);
        setJdQuestionsCount(2);
        setJdText('');
        setJdFile(null);
        setJdError(null);
    };

    // Helper: render skills phân nhóm
    const renderSkillsGrouped = (skills: string[]) => {
        if (!skills.length) return null;
        const renderTags = (items: string[], color: string) => items.length > 0 ? (
            <div className="flex flex-wrap gap-1">
                {items.map((s, i) => <span key={i} className={`px-1.5 py-0.5 rounded text-xs border ${color}`}>{s}</span>)}
            </div>
        ) : null;
        const long = skills.filter(s => s.length > 35);
        const short = skills.filter(s => s.length <= 35);
        const webGroup = short.filter(s => /html|css|js\b|javascript|jquery|ajax|bootstrap|jsp|servlet|mvc/i.test(s));
        const javaGroup = short.filter(s => /\bjava\b|jdbc|oop|jpa|spring|hibernate/i.test(s) && !webGroup.includes(s));
        const dbGroup = short.filter(s => /\bsql\b|database|nosql|redis|mongo|orm/i.test(s) && !webGroup.includes(s) && !javaGroup.includes(s));
        const other = short.filter(s => !webGroup.includes(s) && !javaGroup.includes(s) && !dbGroup.includes(s));
        const hasGroups = javaGroup.length > 0 || webGroup.length > 0 || dbGroup.length > 0;
        return (
            <div className="pt-1 space-y-2">
                {long.length > 0 && (
                    <div className="space-y-1">
                        {long.map((s, i) => (
                            <div key={i} className="bg-white border border-green-100 rounded px-2 py-1 text-xs text-gray-700 leading-relaxed">
                                <span className="text-green-600 font-bold mr-1">•</span>{s}
                            </div>
                        ))}
                    </div>
                )}
                {javaGroup.length > 0 && (
                    <div>
                        <p className="text-xs text-gray-400 mb-1">Java / Backend</p>
                        {renderTags(javaGroup, 'bg-orange-50 border-orange-200 text-orange-700')}
                    </div>
                )}
                {webGroup.length > 0 && (
                    <div>
                        <p className="text-xs text-gray-400 mb-1">Web / Frontend</p>
                        {renderTags(webGroup, 'bg-blue-50 border-blue-200 text-blue-700')}
                    </div>
                )}
                {dbGroup.length > 0 && (
                    <div>
                        <p className="text-xs text-gray-400 mb-1">Database</p>
                        {renderTags(dbGroup, 'bg-purple-50 border-purple-200 text-purple-700')}
                    </div>
                )}
                {other.length > 0 && (
                    <div>
                        {hasGroups && <p className="text-xs text-gray-400 mb-1">Khác</p>}
                        {renderTags(other, 'bg-white border-green-200 text-green-700')}
                    </div>
                )}
            </div>
        );
    };

    if (isLoading) {
        return (
            <MainLayout>
                <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                    <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
                        <p className="text-gray-500 font-medium">Đang tải thông tin nghề nghiệp...</p>
                    </div>
                </div>
            </MainLayout>
        );
    }

    if (error || !jobInfo) {
        return (
            <MainLayout>
                <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                    <div className="text-center max-w-md px-4">
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
                            <p className="text-red-800 dark:text-red-300 mb-4">{error || 'Không thể tải thông tin nghề nghiệp. Vui lòng thử lại.'}</p>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => {
                                        setRetryCount(0);
                                        loadingRef.current = false;
                                        loadJobInfo();
                                    }}
                                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold"
                                >
                                    Thử lại
                                </button>
                                <button
                                    onClick={() => navigate('/interview')}
                                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm font-semibold"
                                >
                                    Quay lại
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="min-h-[calc(100vh-64px)] py-10 px-4 bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white relative overflow-x-hidden font-['Plus_Jakarta_Sans'] pb-20">

                <div className="absolute inset-0 bg-dot-pattern pointer-events-none z-0 opacity-60" />
                <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-indigo-400/10 rounded-full blur-[120px] pointer-events-none z-0" />
                <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-purple-400/10 rounded-full blur-[120px] pointer-events-none z-0" />

                <div className="max-w-4xl mx-auto relative z-10">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-8">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2.5 rounded-xl glass border border-gray-200 dark:border-gray-700 hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all hover:-translate-y-0.5 shadow-sm"
                        >
                            <ArrowLeft className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-1">Chuẩn bị phỏng vấn AI</h1>
                            <p className="text-gray-500 dark:text-gray-400 font-medium">{jobInfo.title}</p>
                        </div>
                    </div>

                    {/* ── 2-Direction Selector ── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {/* Hướng 1: Job-based */}
                        <motion.button
                            whileHover={{ y: -2, scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            type="button"
                            onClick={() => setInterviewDirection('job')}
                            className={`text-left p-5 rounded-2xl border-2 transition-all ${interviewDirection === 'job'
                                ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-900/20 shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20 ring-1 ring-indigo-400/30'
                                : 'border-gray-200 dark:border-gray-700/60 bg-white/50 dark:bg-gray-800/40 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50/30'
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${interviewDirection === 'job' ? 'bg-indigo-600' : 'bg-gray-100'}`}>
                                    <Briefcase className={`h-5 w-5 ${interviewDirection === 'job' ? 'text-white' : 'text-gray-500'}`} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${interviewDirection === 'job' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>Hướng 1</span>
                                    </div>
                                    <p className={`font-bold text-sm ${interviewDirection === 'job' ? 'text-indigo-900' : 'text-gray-800'}`}>Phỏng vấn theo Nghề nghiệp</p>
                                    <p className="text-xs text-gray-500 mt-1">Câu hỏi tiêu chuẩn theo ngành nghề. AI kiểm tra kiến thức nền tảng và quy trình làm việc.</p>
                                </div>
                            </div>
                        </motion.button>

                        {/* Hướng 2: CV-based */}
                        <motion.button
                            whileHover={hasCvData ? { y: -2, scale: 1.01 } : {}}
                            whileTap={hasCvData ? { scale: 0.98 } : {}}
                            type="button"
                            onClick={() => hasCvData ? setInterviewDirection('cv') : undefined}
                            className={`text-left p-5 rounded-2xl border-2 transition-all relative ${!hasCvData ? 'opacity-60 cursor-not-allowed border-gray-200 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/30'
                                : interviewDirection === 'cv' ? 'border-cyan-500 bg-cyan-50/70 dark:bg-cyan-900/20 shadow-lg shadow-cyan-100 dark:shadow-cyan-900/20 ring-1 ring-cyan-400/30'
                                    : 'border-gray-200 dark:border-gray-700/60 bg-white/50 dark:bg-gray-800/40 hover:border-cyan-300 dark:hover:border-cyan-600 hover:bg-cyan-50/30 cursor-pointer'
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${interviewDirection === 'cv' && hasCvData ? 'bg-cyan-600' : 'bg-gray-100'}`}>
                                    <FileText className={`h-5 w-5 ${interviewDirection === 'cv' && hasCvData ? 'text-white' : 'text-gray-500'}`} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${interviewDirection === 'cv' && hasCvData ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-100 text-gray-500'}`}>Hướng 2</span>
                                        {hasCvData && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">✓ Có CV</span>}
                                    </div>
                                    <p className={`font-bold text-sm ${interviewDirection === 'cv' && hasCvData ? 'text-cyan-900' : 'text-gray-800'}`}>Phỏng vấn từ CV cá nhân</p>
                                    {hasCvData ? (
                                        <div className="mt-1.5">
                                            <p className="text-xs text-gray-500 mb-1.5">AI hỏi "xoáy" vào kỹ năng đã có trong CV và kỹ năng cần bổ sung.</p>
                                            <div className="flex flex-wrap gap-1 mb-1">
                                                {cvSkills.slice(0, 3).map(s => <span key={s} className="text-[10px] bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded-full font-medium">✓ {s}</span>)}
                                                {criticalGaps.slice(0, 2).map(s => <span key={s} className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium">+ {s}</span>)}
                                            </div>
                                            <p className="text-[10px] text-cyan-600 font-semibold">Phù hợp: {matchPct.toFixed(0)}%</p>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-400 mt-1">Cần phân tích CV trước. Vào <strong>Phân tích Kỹ năng</strong> để upload CV.</p>
                                    )}
                                </div>
                            </div>
                        </motion.button>
                    </div>

                    {/* ── CV-based Detail (shown when direction=cv) ── */}
                    {isCvBased && (criticalGaps.length > 0 || importantGaps.length > 0) && (
                        <div className="mb-6 rounded-2xl p-5 border border-cyan-200" style={{ background: 'linear-gradient(135deg,#f0fdfa,#ecfdf5)' }}>
                            <p className="text-xs font-bold text-cyan-700 uppercase tracking-wider mb-3">AI sẽ hỏi về:</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs font-semibold text-gray-600 mb-2">Kỹ năng đã có → Câu hỏi xoáy sâu</p>
                                    <div className="space-y-1">
                                        {cvSkills.slice(0, 4).map(s => (
                                            <div key={s} className="flex items-center gap-2 text-xs text-gray-700">
                                                <span className="w-4 h-4 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0">✓</span>
                                                <span>{s}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-600 mb-2">Kỹ năng còn thiếu → Câu hỏi bổ sung</p>
                                    <div className="space-y-1">
                                        {[...criticalGaps, ...importantGaps].slice(0, 4).map(s => (
                                            <div key={s} className="flex items-center gap-2 text-xs text-gray-700">
                                                <span className="w-4 h-4 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center text-[10px] font-bold flex-shrink-0">+</span>
                                                <span>{s}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Question Count Selection */}
                            <div className="glass rounded-[24px] p-6 border border-white/40 dark:border-gray-700/50 shadow-xl">
                                <QuestionCountSelector
                                    selectedCount={selectedQuestionCount}
                                    onSelect={setSelectedQuestionCount}
                                    hasJD={!!jdId}
                                />
                            </div>

                            {/* Level Selection - Enhanced with Strong Contrast */}
                            <div className="rounded-[24px] border-[3px] border-indigo-400/70 dark:border-indigo-500/60 shadow-[0_20px_60px_rgba(99,102,241,0.25)] dark:shadow-[0_20px_60px_rgba(99,102,241,0.4)] p-8 bg-white dark:bg-gray-800 relative overflow-hidden">
                                {/* Decorative glow - more subtle */}
                                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-400/8 dark:bg-indigo-500/15 rounded-full blur-3xl -z-10" />
                                <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-400/8 dark:bg-purple-500/15 rounded-full blur-3xl -z-10" />

                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2.5 bg-indigo-500 dark:bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/30">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-2xl font-black text-gray-900 dark:text-white">Chọn cấp bậc nghề nghiệp</h3>
                                </div>
                                <p className="text-base text-gray-700 dark:text-gray-300 mb-7 font-semibold">
                                    Chọn cấp bậc phù hợp để AI có thể điều chỉnh độ khó câu hỏi phỏng vấn
                                </p>

                                {levelsLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="h-6 w-6 animate-spin text-indigo-600 dark:text-indigo-400" />
                                        <span className="ml-2 text-gray-700 dark:text-gray-300 font-semibold">Đang tải cấp bậc...</span>
                                    </div>
                                ) : levelsError ? (
                                    <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-800/50 rounded-xl p-5">
                                        <p className="text-red-700 dark:text-red-400 text-sm font-bold">{levelsError}</p>
                                        <button
                                            onClick={loadCareerLevels}
                                            className="mt-3 text-sm text-red-700 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline font-bold"
                                        >
                                            Thử lại
                                        </button>
                                    </div>
                                ) : careerLevels.length > 0 ? (
                                    <div className="w-full">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {careerLevels.map((level) => (
                                                <div key={level.id} className="w-full">
                                                    <LevelCard
                                                        level={level}
                                                        isSelected={selectedLevel?.id === level.id}
                                                        onSelect={setSelectedLevel}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-gray-100 dark:bg-gray-700/60 border-2 border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center">
                                        <p className="text-gray-700 dark:text-gray-300 text-sm font-bold">Không tìm thấy cấp bậc cho nghề này</p>
                                    </div>
                                )}
                            </div>

                            {/* JD Upload Block */}
                            <div className="glass rounded-[24px] border border-white/40 dark:border-gray-700/50 shadow-xl overflow-hidden">
                                {/* Header - always visible */}
                                <button
                                    onClick={() => setJdExpanded(v => !v)}
                                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <FileText className="h-5 w-5 text-purple-600" />
                                        <div className="text-left">
                                            <p className="font-semibold text-gray-900 text-sm">
                                                Thêm Job Description (tùy chọn)
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {jdId
                                                    ? '✓ Đã thêm JD — câu hỏi sẽ sát với yêu cầu thực tế'
                                                    : 'Giúp AI hỏi đúng yêu cầu của công ty bạn ứng tuyển'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {jdId && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Đã thêm</span>}
                                        {jdExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                                    </div>
                                </button>

                                {/* Expandable content */}
                                {jdExpanded && (
                                    <div className="px-6 pb-6 border-t border-gray-100">
                                        {/* Đã upload thành công */}
                                        {jdId && jdExtracted ? (
                                            <div className="mt-4">
                                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                                                    {/* Header */}
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                                            <p className="text-sm font-medium text-green-800">JD đã được phân tích thành công</p>
                                                        </div>
                                                        <button onClick={handleClearJD} className="text-gray-400 hover:text-red-500 transition-colors">
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </div>

                                                    {/* Badges: level, location */}
                                                    <div className="flex flex-wrap gap-2 text-xs">
                                                        {jdExtracted.experience_level && (
                                                            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                                                                Level: {jdExtracted.experience_level}
                                                            </span>
                                                        )}
                                                        {jdExtracted.location && (
                                                            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                                                📍 {jdExtracted.location}
                                                            </span>
                                                        )}
                                                        {jdExtracted.company_name && (
                                                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                                                🏢 {jdExtracted.company_name}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Helper accordion section */}
                                                    {[
                                                        {
                                                            key: 'skills',
                                                            label: `Kỹ năng yêu cầu (${jdExtracted.required_skills?.length || 0})`,
                                                            content: renderSkillsGrouped(jdExtracted.required_skills || []),
                                                        },
                                                        {
                                                            key: 'tools',
                                                            label: `Công cụ/Framework (${jdExtracted.tools?.length || 0})`,
                                                            content: jdExtracted.tools?.length > 0 ? (
                                                                <div className="flex flex-wrap gap-1 pt-1">
                                                                    {jdExtracted.tools.map((t, i) => (
                                                                        <span key={i} className="bg-white border border-blue-200 text-blue-700 px-1.5 py-0.5 rounded text-xs">{t}</span>
                                                                    ))}
                                                                </div>
                                                            ) : null
                                                        },
                                                        {
                                                            key: 'responsibilities',
                                                            label: 'Nhiệm vụ chính',
                                                            content: jdExtracted.responsibilities?.length > 0 ? (
                                                                <ul className="pt-1 space-y-0.5">
                                                                    {jdExtracted.responsibilities.map((r, i) => (
                                                                        <li key={i} className="text-gray-600 text-xs">• {r}</li>
                                                                    ))}
                                                                </ul>
                                                            ) : null
                                                        },
                                                        {
                                                            key: 'training',
                                                            label: 'Chương trình đào tạo',
                                                            content: jdExtracted.training_program?.length > 0 ? (
                                                                <ul className="pt-1 space-y-0.5">
                                                                    {jdExtracted.training_program.map((t, i) => (
                                                                        <li key={i} className="text-gray-600 text-xs">• {t}</li>
                                                                    ))}
                                                                </ul>
                                                            ) : null
                                                        },
                                                        {
                                                            key: 'qualifications',
                                                            label: 'Yêu cầu ứng viên',
                                                            content: jdExtracted.qualifications?.length > 0 ? (
                                                                <ul className="pt-1 space-y-0.5">
                                                                    {jdExtracted.qualifications.map((q, i) => (
                                                                        <li key={i} className="text-gray-600 text-xs">• {q}</li>
                                                                    ))}
                                                                </ul>
                                                            ) : null
                                                        },
                                                    ].filter(s => s.content).map(section => (
                                                        <div key={section.key} className="border border-green-100 rounded-md bg-white overflow-hidden">
                                                            <button
                                                                onClick={() => setJdOpen(prev => ({ ...prev, [section.key]: !prev[section.key] }))}
                                                                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-green-800 hover:bg-green-50 transition-colors"
                                                            >
                                                                <span>{section.label}</span>
                                                                {jdOpen[section.key]
                                                                    ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" />
                                                                    : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                                                                }
                                                            </button>
                                                            {jdOpen[section.key] && (
                                                                <div className="px-3 pb-2">{section.content}</div>
                                                            )}
                                                        </div>
                                                    ))}

                                                    {/* JD questions count — dynamic */}
                                                    <p className="text-purple-600 text-xs font-medium">
                                                        AI sẽ dành {jdQuestionsCount} câu hỏi về yêu cầu cụ thể trong JD này.
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mt-4 space-y-4">
                                                {/* Tab chọn mode */}
                                                <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
                                                    <button
                                                        onClick={() => setJdMode('text')}
                                                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${jdMode === 'text' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                                    >
                                                        Nhập text
                                                    </button>
                                                    <button
                                                        onClick={() => setJdMode('file')}
                                                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${jdMode === 'file' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                                    >
                                                        Upload file
                                                    </button>
                                                </div>

                                                {/* Text mode */}
                                                {jdMode === 'text' && (
                                                    <textarea
                                                        value={jdText}
                                                        onChange={e => setJdText(e.target.value)}
                                                        placeholder="Dán nội dung Job Description vào đây... (tối thiểu 50 ký tự)"
                                                        rows={6}
                                                        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white/60 dark:bg-gray-800/60 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 resize-none text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
                                                    />
                                                )}

                                                {/* File mode */}
                                                {jdMode === 'file' && (
                                                    <div>
                                                        <input
                                                            ref={fileInputRef}
                                                            type="file"
                                                            accept=".pdf,.doc,.docx"
                                                            className="hidden"
                                                            onChange={e => setJdFile(e.target.files?.[0] || null)}
                                                        />
                                                        {jdFile ? (
                                                            <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                                                <FileText className="h-5 w-5 text-purple-600 shrink-0" />
                                                                <span className="text-sm text-gray-700 truncate flex-1">{jdFile.name}</span>
                                                                <button onClick={() => setJdFile(null)} className="text-gray-400 hover:text-red-500">
                                                                    <X className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => fileInputRef.current?.click()}
                                                                className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 hover:bg-purple-50 transition-colors"
                                                            >
                                                                <Upload className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                                                                <p className="text-sm text-gray-600">Chọn file PDF hoặc DOCX</p>
                                                                <p className="text-xs text-gray-400 mt-1">Tối đa 10MB</p>
                                                            </button>
                                                        )}
                                                    </div>
                                                )}

                                                {jdError && <p className="text-xs text-red-600">{jdError}</p>}

                                                <button
                                                    onClick={handleSubmitJD}
                                                    disabled={jdUploading || (jdMode === 'text' ? jdText.trim().length < 50 : !jdFile)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    {jdUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                                    {jdUploading ? 'Đang phân tích...' : 'Phân tích JD'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* STAR Method Guide */}
                            <div className="glass rounded-[24px] overflow-hidden border border-white/40 dark:border-gray-700/50 shadow-xl">
                                <STARMethodGuide />
                            </div>

                            {/* Interview Mode Selection */}
                            <div
                                data-testid="interview-mode-selection"
                                className="glass rounded-[24px] border border-white/40 dark:border-gray-700/50 shadow-xl p-6"
                            >
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Chọn hình thức phỏng vấn</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        data-testid="interview-mode-text"
                                        onClick={() => setInterviewMode('text')}
                                        className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all cursor-pointer ${interviewMode === 'text'
                                            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 shadow-md'
                                            : 'border-white/40 dark:border-gray-700/50 bg-white/40 dark:bg-gray-800/40 hover:border-indigo-300 dark:hover:border-indigo-600'
                                            }`}
                                    >
                                        <FileText className={`h-8 w-8 ${interviewMode === 'text' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`} />
                                        <div className="text-center">
                                            <p className={`font-bold text-sm ${interviewMode === 'text' ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                                Phỏng vấn Text
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">Trả lời bằng bàn phím</p>
                                        </div>
                                    </button>
                                    <button
                                        data-testid="interview-mode-voice"
                                        onClick={() => setInterviewMode('voice')}
                                        className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all cursor-pointer ${interviewMode === 'voice'
                                            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 shadow-md'
                                            : 'border-gray-200 dark:border-gray-700/60 bg-white/40 dark:bg-gray-800/40 hover:border-indigo-300 dark:hover:border-indigo-600'
                                            }`}
                                    >
                                        <Mic className={`h-8 w-8 ${interviewMode === 'voice' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`} />
                                        <div className="text-center">
                                            <p className={`font-bold text-sm ${interviewMode === 'voice' ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                                Phỏng vấn Giọng nói
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">Trả lời bằng microphone</p>
                                        </div>
                                    </button>
                                </div>

                                {/* Gender selector */}
                                <div className="mt-5">
                                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Chọn hình ảnh người phỏng vấn</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        {(['female', 'male'] as const).map(g => (
                                            <button key={g} onClick={() => setInterviewerGender(g)}
                                                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${interviewerGender === g
                                                    ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-900/20 shadow-md'
                                                    : 'border-gray-200 dark:border-gray-700/60 bg-white/40 dark:bg-gray-800/40 hover:border-indigo-300 dark:hover:border-indigo-600'
                                                    }`}>
                                                <img
                                                    src={`https://pub-8df5715d271b42d6bf03e5ecd279f612.r2.dev/interview/avatars/${g === 'female' ? 'anhNu' : 'anhNam'}.png`}
                                                    alt={g} className={`w-16 h-16 rounded-full object-cover border-2 shadow-md transition-all ${interviewerGender === g ? 'border-indigo-400 shadow-indigo-200' : 'border-white/60'
                                                        }`}
                                                />
                                                <span className={`text-xs font-bold ${interviewerGender === g ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-500 dark:text-gray-400'
                                                    }`}>
                                                    {g === 'female' ? 'Nữ' : 'Nam'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Start Button */}
                            <div className="glass rounded-[24px] border border-white/40 dark:border-gray-700/50 shadow-xl p-8 text-center">
                                <div className="flex items-center justify-center gap-2 mb-4">
                                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${isCvBased ? 'bg-cyan-100 text-cyan-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                        {isCvBased ? '📄 Hướng 2: CV cá nhân' : '💼 Hướng 1: Theo nghề nghiệp'}
                                    </span>
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3">Sẵn sàng bắt đầu?</h3>
                                <p className="text-gray-600 dark:text-gray-400 font-medium mb-4 max-w-lg mx-auto">
                                    {isCvBased
                                        ? `AI sẽ đặt ${selectedQuestionCount + 1} câu hỏi dựa trên CV của bạn: hỏi sâu về kỹ năng đã có và kỹ năng cần bổ sung${selectedLevel ? ` (cấp ${selectedLevel.name})` : ''}.`
                                        : (() => {
                                            const total = selectedQuestionCount + (jdId ? jdQuestionsCount : 0) + 1;
                                            const duration = total <= 5 ? '10-15' : total <= 7 ? '15-20' : total <= 9 ? '20-25' : total <= 11 ? '25-30' : '30-40';
                                            const levelText = selectedLevel ? ` cho cấp ${selectedLevel.name}` : '';
                                            return jdId
                                                ? `Phỏng vấn sẽ có ${total} câu hỏi (${selectedQuestionCount} cơ bản + ${jdQuestionsCount} từ JD + 1 kết thúc)${levelText}, khoảng ${duration} phút.`
                                                : `Phỏng vấn sẽ có ${total} câu hỏi (${selectedQuestionCount} cơ bản + 1 kết thúc)${levelText}, khoảng ${duration} phút.`;
                                        })()
                                    }
                                </p>
                                {selectedLevel && !isCvBased && (
                                    <p className="text-xs text-blue-600 mb-2">
                                        Câu hỏi được điều chỉnh cho cấp bậc: <strong>{selectedLevel.name}</strong>
                                    </p>
                                )}
                                {jdId && !isCvBased && (
                                    <p className="text-xs text-purple-600 mb-4">
                                        Câu hỏi sẽ được cá nhân hóa theo JD bạn đã cung cấp.
                                    </p>
                                )}
                                <button
                                    onClick={handleStartInterview}
                                    disabled={isStarting || !selectedLevel}
                                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-10 py-4 rounded-2xl font-bold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center justify-center gap-3 w-full sm:w-auto mx-auto mt-6"
                                >
                                    {isStarting ? (
                                        <>
                                            <Loader2 className="h-6 w-6 animate-spin" />
                                            Đang khởi tạo...
                                        </>
                                    ) : !selectedLevel ? (
                                        <>
                                            <X className="h-6 w-6" />
                                            Vui lòng chọn cấp bậc
                                        </>
                                    ) : (
                                        <>
                                            <Play className="h-6 w-6" />
                                            Bắt đầu phỏng vấn
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Job Skills Preview */}
                            {jobInfo.soft_skills.length > 0 && (
                                <div className="glass rounded-[24px] border border-white/40 dark:border-gray-700/50 shadow-xl p-6">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Kỹ năng mềm</h3>
                                    <div className="space-y-3">
                                        {jobInfo.soft_skills.slice(0, 5).map((skill, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-white/50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                                                <span className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate pr-2">
                                                    {skill.skill_name}
                                                </span>
                                                <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 rounded-lg">
                                                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                                                    {skill.importance.toFixed(1)}/5
                                                </span>
                                            </div>
                                        ))}
                                        {jobInfo.soft_skills.length > 5 && (
                                            <p className="text-xs text-center text-gray-500 dark:text-gray-400 font-medium pt-2 border-t border-gray-100 dark:border-gray-700/50">
                                                +{jobInfo.soft_skills.length - 5} kỹ năng khác
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {jobInfo.hard_skills.length > 0 && (
                                <div className="glass rounded-[24px] border border-white/40 dark:border-gray-700/50 shadow-xl p-6">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Kỹ năng chuyên môn</h3>
                                    <div className="space-y-3">
                                        {jobInfo.hard_skills.slice(0, 5).map((skill, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-white/50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                                                <span className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate pr-2">
                                                    {skill.skill_name}
                                                </span>
                                                <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 rounded-lg">
                                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                                    {skill.importance.toFixed(1)}/5
                                                </span>
                                            </div>
                                        ))}
                                        {jobInfo.hard_skills_total > 5 && (
                                            <p className="text-xs text-center text-gray-500 dark:text-gray-400 font-medium pt-2 border-t border-gray-100 dark:border-gray-700/50">
                                                +{jobInfo.hard_skills_total - 5} kỹ năng khác
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Tips */}
                            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-[24px] border border-indigo-100 dark:border-indigo-800/50 shadow-lg p-6">
                                <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-300 mb-4 flex items-center gap-2">
                                    <span className="text-xl">💡</span> Lời khuyên
                                </h3>
                                <ul className="space-y-3">
                                    {['Chuẩn bị sẵn 2-3 câu chuyện thành công', 'Nói chậm, rõ ràng và tự tin', 'Sử dụng ví dụ cụ thể, có số liệu', 'Thể hiện thái độ tích cực và học hỏi', 'Đừng ngại hỏi lại nếu không hiểu câu hỏi'].map((tip, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                            <span className="text-indigo-500 mt-0.5">•</span>
                                            {tip}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default InterviewSelectionPage;
