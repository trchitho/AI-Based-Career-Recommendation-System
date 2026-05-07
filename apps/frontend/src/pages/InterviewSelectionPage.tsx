import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { interviewService } from '../services/interviewService';
import QuestionCountSelector from '../components/interview/QuestionCountSelector';
import STARMethodGuide from '../components/interview/STARMethodGuide';
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

    useEffect(() => {
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
            loadJobInfo();
        }
    }, [jobId, user, navigate]);

    const loadJobInfo = async () => {
        if (!jobId) return;

        try {
            setIsLoading(true);
            const info = await interviewService.getJobInfo(jobId);
            setJobInfo(info);
        } catch (err: any) {
            setError('Không thể tải thông tin nghề nghiệp. Vui lòng thử lại.');
            console.error('Error loading job info:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartInterview = async () => {
        if (!jobId || !user) return;

        try {
            setIsStarting(true);
            const response = await interviewService.startInterview(jobId, selectedQuestionCount);
            // Navigate to interview page with session info
            navigate(`/interview/${jobId}?session=${response.session_id}&questions=${selectedQuestionCount}`);
        } catch (err: any) {
            if (err?.response?.status === 401) {
                navigate('/login', {
                    state: {
                        from: `/interview/${jobId}`,
                        message: 'Phiên đăng nhập đã hết hạn.'
                    }
                });
            } else {
                setError('Không thể bắt đầu phỏng vấn. Vui lòng thử lại.');
            }
        } finally {
            setIsStarting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="interview-loading-container">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 interview-loading-spinner" />
                    <p className="interview-loading-text">Đang tải thông tin nghề nghiệp...</p>
                </div>
            </div>
        );
    }

    if (error || !jobInfo) {
        return (
            <div className="interview-error-container">
                <div className="text-center max-w-md">
                    <div className="interview-error-card">
                        <p className="interview-error-text mb-4">{error || 'Không tìm thấy thông tin nghề nghiệp'}</p>
                        <button
                            onClick={() => navigate('/careers')}
                            className="interview-error-button"
                        >
                            Quay lại danh sách nghề nghiệp
                        </button>
                    </div>
                </div>
            </div>
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
                                />
                            </div>

                            {/* STAR Method Guide */}
                            <STARMethodGuide />

                            {/* Start Button */}
                            <div className="interview-card">
                                <div className="text-center">
                                    <h3 className="interview-card-title mb-2">
                                        Sẵn sàng bắt đầu?
                                    </h3>
                                    <p className="interview-card-text mb-6">
                                        Phỏng vấn sẽ có {selectedQuestionCount} câu hỏi và kéo dài khoảng{' '}
                                        {selectedQuestionCount <= 5 ? '10-15' :
                                            selectedQuestionCount <= 7 ? '15-20' :
                                                selectedQuestionCount <= 8 ? '20-25' :
                                                    selectedQuestionCount <= 10 ? '25-30' : '30-35'} phút.
                                    </p>
                                    <button
                                        onClick={handleStartInterview}
                                        disabled={isStarting}
                                        className="interview-btn-primary"
                                    >
                                        {isStarting ? (
                                            <>
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                                Đang khởi tạo...
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
