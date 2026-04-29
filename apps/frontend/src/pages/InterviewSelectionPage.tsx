import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { interviewService } from '../services/interviewService';
import QuestionCountSelector from '../components/interview/QuestionCountSelector';
import STARMethodGuide from '../components/interview/STARMethodGuide';
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
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                    <p className="text-gray-600">Đang tải thông tin nghề nghiệp...</p>
                </div>
            </div>
        );
    }

    if (error || !jobInfo) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center max-w-md">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                        <p className="text-red-800 mb-4">{error || 'Không tìm thấy thông tin nghề nghiệp'}</p>
                        <button
                            onClick={() => navigate('/careers')}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
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
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-4xl mx-auto px-4">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-8">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Chuẩn bị phỏng vấn AI</h1>
                            <p className="text-gray-600">{jobInfo.title}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Question Count Selection */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <QuestionCountSelector
                                    selectedCount={selectedQuestionCount}
                                    onSelect={setSelectedQuestionCount}
                                />
                            </div>

                            {/* STAR Method Guide */}
                            <STARMethodGuide />

                            {/* Start Button */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <div className="text-center">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                        Sẵn sàng bắt đầu?
                                    </h3>
                                    <p className="text-gray-600 mb-6">
                                        Phỏng vấn sẽ có {selectedQuestionCount} câu hỏi và kéo dài khoảng{' '}
                                        {selectedQuestionCount <= 5 ? '10-15' :
                                            selectedQuestionCount <= 7 ? '15-20' :
                                                selectedQuestionCount <= 8 ? '20-25' :
                                                    selectedQuestionCount <= 10 ? '25-30' : '30-35'} phút.
                                    </p>
                                    <button
                                        onClick={handleStartInterview}
                                        disabled={isStarting}
                                        className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 mx-auto"
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
                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                    <h3 className="font-semibold text-gray-900 mb-4">Kỹ năng mềm được đánh giá</h3>
                                    <div className="space-y-3">
                                        {jobInfo.soft_skills.slice(0, 5).map((skill, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between group cursor-help relative"
                                                title={`${skill.skill_name} - Mức độ quan trọng: ${skill.importance.toFixed(1)}/5`}
                                            >
                                                <span className="text-sm text-gray-700 truncate flex-1 mr-2 group-hover:text-blue-600 transition-colors">
                                                    {skill.skill_name}
                                                </span>
                                                <span className="text-sm font-medium text-blue-600 shrink-0 group-hover:text-blue-700 transition-colors">
                                                    {skill.importance.toFixed(1)}/5
                                                </span>

                                                {/* Hover Tooltip */}
                                                <div className="absolute left-0 bottom-full mb-2 w-max max-w-xs bg-gray-900 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 shadow-lg">
                                                    <div className="font-medium mb-1">{skill.skill_name}</div>
                                                    <div className="text-gray-300">
                                                        Mức độ quan trọng: <span className="text-blue-300 font-medium">{skill.importance.toFixed(1)}/5</span>
                                                    </div>
                                                    <div className="text-gray-300">
                                                        Loại: <span className="text-blue-300 font-medium">{skill.skill_type}</span>
                                                    </div>
                                                    {/* Arrow */}
                                                    <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                                                </div>
                                            </div>
                                        ))}
                                        {jobInfo.soft_skills.length > 5 && (
                                            <p className="text-xs text-gray-500 mt-2">
                                                +{jobInfo.soft_skills.length - 5} kỹ năng khác
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {jobInfo.hard_skills.length > 0 && (
                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                    <h3 className="font-semibold text-gray-900 mb-4">Kỹ năng chuyên ngành</h3>
                                    <div className="space-y-3">
                                        {jobInfo.hard_skills.slice(0, 5).map((skill, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between group cursor-help relative"
                                                title={`${skill.skill_name} - Mức độ quan trọng: ${skill.importance.toFixed(1)}/5`}
                                            >
                                                <span className="text-sm text-gray-700 truncate flex-1 mr-2 group-hover:text-orange-600 transition-colors">
                                                    {skill.skill_name}
                                                </span>
                                                <span className="text-sm font-medium text-orange-600 shrink-0 group-hover:text-orange-700 transition-colors">
                                                    {skill.importance.toFixed(1)}/5
                                                </span>

                                                {/* Hover Tooltip */}
                                                <div className="absolute left-0 bottom-full mb-2 w-max max-w-xs bg-gray-900 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 shadow-lg">
                                                    <div className="font-medium mb-1">{skill.skill_name}</div>
                                                    <div className="text-gray-300">
                                                        Mức độ quan trọng: <span className="text-orange-300 font-medium">{skill.importance.toFixed(1)}/5</span>
                                                    </div>
                                                    <div className="text-gray-300">
                                                        Loại: <span className="text-orange-300 font-medium">{skill.skill_type}</span>
                                                    </div>
                                                    {/* Arrow */}
                                                    <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                                                </div>
                                            </div>
                                        ))}
                                        {jobInfo.hard_skills_total > 5 && (
                                            <p className="text-xs text-gray-500 mt-2">
                                                +{jobInfo.hard_skills_total - 5} kỹ năng khác
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Tips */}
                            <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
                                <h3 className="font-semibold text-blue-900 mb-4"> Lời khuyên</h3>
                                <ul className="text-sm text-blue-800 space-y-2">
                                    <li>• Chuẩn bị sẵn 2-3 câu chuyện thành công</li>
                                    <li>• Nói chậm, rõ ràng và tự tin</li>
                                    <li>• Sử dụng ví dụ cụ thể, có số liệu</li>
                                    <li>• Thể hiện thái độ tích cực và học hỏi</li>
                                    <li>• Đừng ngại hỏi lại nếu không hiểu câu hỏi</li>
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