import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Loader2, FileText, Upload, X, CheckCircle, ChevronDown, ChevronUp, Mic } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { interviewService, CareerLevel } from '../services/interviewService';
import QuestionCountSelector from '../components/interview/QuestionCountSelector';
import STARMethodGuide from '../components/interview/STARMethodGuide';
import LevelCard from '../components/interview/LevelCard';
import MainLayout from '../components/layout/MainLayout';
import './InterviewSelectionPage.css';

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
    const { user } = useAuth();

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
                    level_slug: selectedLevel?.slug
                }));
                navigate('/interview/device-test');
                return;
            }

            const response = await interviewService.startInterview(
                jobId,
                selectedQuestionCount,
                jdId ?? undefined,
                selectedLevel?.slug
            );
            // Pass session data để InterviewPage không cần gọi startInterview lại
            navigate(`/interview/${jobId}?questions=${selectedQuestionCount}`, {
                state: {
                    sessionData: response,
                    jdId: jdId ?? undefined,
                    levelSlug: selectedLevel?.slug
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
                <div className="interview-loading-container">
                    <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 interview-loading-spinner" />
                        <p className="interview-loading-text">Đang tải thông tin nghề nghiệp...</p>
                    </div>
                </div>
            </MainLayout>
        );
    }

    if (error || !jobInfo) {
        return (
            <MainLayout>
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="text-center max-w-md">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                            <p className="text-red-800 mb-4">{error || 'Không thể tải thông tin nghề nghiệp. Vui lòng thử lại.'}</p>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => {
                                        setRetryCount(0);
                                        loadingRef.current = false;
                                        loadJobInfo();
                                    }}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Thử lại
                                </button>
                                <button
                                    onClick={() => navigate('/interview')}
                                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    Quay lại danh sách phỏng vấn
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
            <div className="interview-selection-page py-8">
                <div className="max-w-4xl mx-auto px-4">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-8 interview-selection-header">
                        <button
                            onClick={() => navigate(-1)}
                            className="interview-back-button"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <div>
                            <h1 className="interview-selection-title">Chuẩn bị phỏng vấn AI</h1>
                            <p className="interview-selection-subtitle">{jobInfo.title}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Question Count Selection */}
                            <div className="interview-card">
                                <QuestionCountSelector
                                    selectedCount={selectedQuestionCount}
                                    onSelect={setSelectedQuestionCount}
                                    hasJD={!!jdId}
                                />
                            </div>

                            {/* Level Selection */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Chọn cấp bậc nghề nghiệp</h3>
                                <p className="text-sm text-gray-600 mb-6">
                                    Chọn cấp bậc phù hợp để AI có thể điều chỉnh độ khó câu hỏi phỏng vấn
                                </p>

                                {levelsLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                                        <span className="ml-2 text-gray-600">Đang tải cấp bậc...</span>
                                    </div>
                                ) : levelsError ? (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                        <p className="text-red-600 text-sm">{levelsError}</p>
                                        <button
                                            onClick={loadCareerLevels}
                                            className="mt-2 text-sm text-red-700 hover:text-red-800 underline"
                                        >
                                            Thử lại
                                        </button>
                                    </div>
                                ) : careerLevels.length > 0 ? (
                                    <div className="w-full">
                                        {/* Dynamic Grid Layout */}
                                        <div
                                            className="level-cards-dynamic-grid"
                                            data-count={careerLevels.length}
                                        >
                                            {careerLevels.map((level) => (
                                                <div
                                                    key={level.id}
                                                    className="level-card-wrapper"
                                                >
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
                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                                        <p className="text-gray-600 text-sm">Không tìm thấy cấp bậc cho nghề này</p>
                                    </div>
                                )}
                            </div>

                            {/* JD Upload Block */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
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
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
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
                            <STARMethodGuide />

                            {/* Interview Mode Selection */}
                            <div
                                data-testid="interview-mode-selection"
                                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                            >
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Chọn hình thức phỏng vấn</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        data-testid="interview-mode-text"
                                        onClick={() => setInterviewMode('text')}
                                        className={`flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-colors cursor-pointer ${interviewMode === 'text'
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 bg-white hover:border-gray-300'
                                            }`}
                                    >
                                        <FileText className={`h-8 w-8 ${interviewMode === 'text' ? 'text-blue-600' : 'text-gray-400'}`} />
                                        <div className="text-center">
                                            <p className={`font-medium text-sm ${interviewMode === 'text' ? 'text-blue-700' : 'text-gray-700'}`}>
                                                Phỏng vấn Text
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">Trả lời bằng bàn phím</p>
                                        </div>
                                    </button>
                                    <button
                                        data-testid="interview-mode-voice"
                                        onClick={() => setInterviewMode('voice')}
                                        className={`flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-colors cursor-pointer ${interviewMode === 'voice'
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 bg-white hover:border-gray-300'
                                            }`}
                                    >
                                        <Mic className={`h-8 w-8 ${interviewMode === 'voice' ? 'text-blue-600' : 'text-gray-400'}`} />
                                        <div className="text-center">
                                            <p className={`font-medium text-sm ${interviewMode === 'voice' ? 'text-blue-700' : 'text-gray-700'}`}>
                                                Phỏng vấn Giọng nói
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">Trả lời bằng microphone</p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Start Button */}
                            <div className="interview-card">
                                <div className="text-center">
                                    <h3 className="interview-card-title mb-2">
                                        Sẵn sàng bắt đầu?
                                    </h3>
                                    <p className="text-gray-600 mb-2">
                                        {(() => {
                                            const total = selectedQuestionCount + (jdId ? jdQuestionsCount : 0) + 1; // +1 cho closing
                                            const duration = total <= 5 ? '10-15' : total <= 7 ? '15-20' : total <= 9 ? '20-25' : total <= 11 ? '25-30' : '30-40';
                                            const levelText = selectedLevel ? ` cho cấp ${selectedLevel.name}` : '';
                                            return jdId
                                                ? `Phỏng vấn sẽ có ${total} câu hỏi (${selectedQuestionCount} cơ bản + ${jdQuestionsCount} từ JD + 1 kết thúc)${levelText}, khoảng ${duration} phút.`
                                                : `Phỏng vấn sẽ có ${total} câu hỏi (${selectedQuestionCount} cơ bản + 1 kết thúc)${levelText}, khoảng ${duration} phút.`;
                                        })()}
                                    </p>
                                    {selectedLevel && (
                                        <p className="text-xs text-blue-600 mb-2">
                                            Câu hỏi được điều chỉnh cho cấp bậc: <strong>{selectedLevel.name}</strong>
                                        </p>
                                    )}
                                    {jdId && (
                                        <p className="text-xs text-purple-600 mb-4">
                                            Câu hỏi sẽ được cá nhân hóa theo JD bạn đã cung cấp.
                                        </p>
                                    )}
                                    <button
                                        onClick={handleStartInterview}
                                        disabled={isStarting || !selectedLevel}
                                        className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 mx-auto"
                                    >
                                        {isStarting ? (
                                            <>
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                                Đang khởi tạo...
                                            </>
                                        ) : !selectedLevel ? (
                                            <>
                                                <X className="h-5 w-5" />
                                                Vui lòng chọn cấp bậc
                                            </>
                                        ) : (
                                            <>
                                                <Play className="h-5 w-5" />
                                                Bắt đầu phỏng vấn
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Job Skills Preview */}
                            {jobInfo.soft_skills.length > 0 && (
                                <div className="interview-card">
                                    <h3 className="interview-card-title mb-4">Kỹ năng mềm được đánh giá</h3>
                                    <div className="space-y-0">
                                        {jobInfo.soft_skills.slice(0, 5).map((skill, index) => (
                                            <div
                                                key={index}
                                                className="interview-skill-item"
                                            >
                                                <span className="interview-skill-name">
                                                    {skill.skill_name}
                                                </span>
                                                <span className="interview-skill-score soft">
                                                    {skill.importance.toFixed(1)}/5
                                                </span>

                                                {/* Hover Tooltip */}
                                                <div className="interview-skill-tooltip">
                                                    <div className="font-medium mb-1">{skill.skill_name}</div>
                                                    <div className="text-gray-300">
                                                        Mức độ quan trọng: <span className="text-blue-300 font-medium">{skill.importance.toFixed(1)}/5</span>
                                                    </div>
                                                    <div className="text-gray-300">
                                                        Loại: <span className="text-blue-300 font-medium">{skill.skill_type}</span>
                                                    </div>
                                                    {/* Arrow */}
                                                    <div className="interview-skill-tooltip-arrow"></div>
                                                </div>
                                            </div>
                                        ))}
                                        {jobInfo.soft_skills.length > 5 && (
                                            <p className="text-xs interview-card-text mt-2">
                                                +{jobInfo.soft_skills.length - 5} kỹ năng khác
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {jobInfo.hard_skills.length > 0 && (
                                <div className="interview-card">
                                    <h3 className="interview-card-title mb-4">Kỹ năng chuyên ngành</h3>
                                    <div className="space-y-0">
                                        {jobInfo.hard_skills.slice(0, 5).map((skill, index) => (
                                            <div
                                                key={index}
                                                className="interview-skill-item"
                                            >
                                                <span className="interview-skill-name">
                                                    {skill.skill_name}
                                                </span>
                                                <span className="interview-skill-score hard">
                                                    {skill.importance.toFixed(1)}/5
                                                </span>

                                                {/* Hover Tooltip */}
                                                <div className="interview-skill-tooltip">
                                                    <div className="font-medium mb-1">{skill.skill_name}</div>
                                                    <div className="text-gray-300">
                                                        Mức độ quan trọng: <span className="text-orange-300 font-medium">{skill.importance.toFixed(1)}/5</span>
                                                    </div>
                                                    <div className="text-gray-300">
                                                        Loại: <span className="text-orange-300 font-medium">{skill.skill_type}</span>
                                                    </div>
                                                    {/* Arrow */}
                                                    <div className="interview-skill-tooltip-arrow"></div>
                                                </div>
                                            </div>
                                        ))}
                                        {jobInfo.hard_skills_total > 5 && (
                                            <p className="text-xs interview-card-text mt-2">
                                                +{jobInfo.hard_skills_total - 5} kỹ năng khác
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Tips */}
                            <div className="interview-tips-card">
                                <h3 className="interview-tips-title">💡 Lời khuyên</h3>
                                <ul className="interview-tips-list">
                                    <li className="interview-tips-item">• Chuẩn bị sẵn 2-3 câu chuyện thành công</li>
                                    <li className="interview-tips-item">• Nói chậm, rõ ràng và tự tin</li>
                                    <li className="interview-tips-item">• Sử dụng ví dụ cụ thể, có số liệu</li>
                                    <li className="interview-tips-item">• Thể hiện thái độ tích cực và học hỏi</li>
                                    <li className="interview-tips-item">• Đừng ngại hỏi lại nếu không hiểu câu hỏi</li>
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
