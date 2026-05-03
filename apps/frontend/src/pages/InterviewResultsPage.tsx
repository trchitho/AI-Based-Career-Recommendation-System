import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Download,
    Share2,
    Star,
    TrendingUp,
    TrendingDown,
    BookOpen,
    Clock,
    Target,
    MessageSquare,
    CheckCircle,
    XCircle,
    AlertCircle,
    FileText,
    Award,
    Brain,
    Users,
    Zap,
    BarChart3,
    Briefcase,
    Settings,
    Wrench
} from 'lucide-react';
import { interviewService, InterviewHistory, InterviewFeedback } from '../services/interviewService';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Textarea } from '../components/common';
import MainLayout from '../components/layout/MainLayout';

const InterviewResultsPage: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const [history, setHistory] = useState<InterviewHistory | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showFeedbackForm, setShowFeedbackForm] = useState(false);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [feedback, setFeedback] = useState<Partial<InterviewFeedback>>({
        question_quality: 5,
        ai_accuracy: 5,
        overall_experience: 5,
        comments: '',
        suggestions: ''
    });

    useEffect(() => {
        if (sessionId) {
            loadInterviewHistory();
        }
    }, [sessionId]);

    const loadInterviewHistory = async () => {
        if (!sessionId) return;

        setIsLoading(true);
        try {
            const data = await interviewService.getInterviewHistory(parseInt(sessionId));
            setHistory(data);
        } catch (error) {
            console.error('Error loading interview history:', error);
            toast.error('Không thể tải kết quả phỏng vấn');
            navigate('/dashboard');
        } finally {
            setIsLoading(false);
        }
    };

    const submitFeedback = async () => {
        if (!sessionId) return;

        try {
            const feedbackData: InterviewFeedback = {
                session_id: parseInt(sessionId),
                question_quality: feedback.question_quality!,
                ai_accuracy: feedback.ai_accuracy!,
                overall_experience: feedback.overall_experience!
            };

            if (feedback.comments && feedback.comments.trim()) {
                feedbackData.comments = feedback.comments;
            }
            if (feedback.suggestions && feedback.suggestions.trim()) {
                feedbackData.suggestions = feedback.suggestions;
            }

            await interviewService.submitFeedback(feedbackData);

            toast.success('Cảm ơn bạn đã gửi feedback!');
            setShowFeedbackForm(false);
        } catch (error) {
            console.error('Error submitting feedback:', error);
            toast.error('Lỗi khi gửi feedback');
        }
    };

    const downloadReport = async () => {
        if (!history) return;

        setIsGeneratingPDF(true);
        try {
            // Create PDF using jsPDF
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            // Header
            pdf.setFontSize(20);
            pdf.setFont('helvetica', 'bold');
            pdf.text('BÁO CÁO KẾT QUẢ PHỎNG VẤN AI', pageWidth / 2, 20, { align: 'center' });

            // Job info
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`Nghề nghiệp: ${history.session.job_title}`, 20, 35);
            pdf.text(`Thời gian: ${new Date(history.session.started_at).toLocaleString('vi-VN')}`, 20, 45);
            pdf.text(`Trạng thái: ${history.session.status === 'completed' ? 'Hoàn thành' : 'Chưa hoàn thành'}`, 20, 55);

            // Overall score
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            pdf.text('ĐIỂM SỐ TỔNG QUAN', 20, 75);

            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`Điểm tổng: ${interviewService.formatScore(history.session.overall_score)}`, 20, 85);
            pdf.text(`Kết quả: ${interviewService.getRecommendationLabel(history.session.recommendation)}`, 20, 95);

            // Detailed scores
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            pdf.text('ĐIỂM CHI TIẾT', 20, 115);

            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'normal');
            let yPos = 125;
            const scores = [
                { label: 'Kỹ thuật', score: history.session.technical_score },
                { label: 'Giao tiếp', score: history.session.communication_score },
                { label: 'Tư duy logic', score: history.session.logic_score },
                { label: 'Kinh nghiệm', score: history.session.experience_score },
                { label: 'Thái độ', score: history.session.attitude_score }
            ];

            scores.forEach(item => {
                pdf.text(`${item.label}: ${interviewService.formatScore(item.score)}`, 20, yPos);
                yPos += 10;
            });

            // Strengths
            yPos += 10;
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            pdf.text('ĐIỂM MẠNH', 20, yPos);
            yPos += 10;

            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'normal');
            if (history.session.key_strengths && history.session.key_strengths.length > 0) {
                history.session.key_strengths.forEach(strength => {
                    pdf.text(`• ${strength}`, 20, yPos);
                    yPos += 8;
                });
            } else {
                pdf.text('Không có', 20, yPos);
                yPos += 8;
            }

            // Weaknesses
            yPos += 10;
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            pdf.text('ĐIỂM CẦN CẢI THIỆN', 20, yPos);
            yPos += 10;

            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'normal');
            if (history.session.key_weaknesses && history.session.key_weaknesses.length > 0) {
                history.session.key_weaknesses.forEach(weakness => {
                    if (yPos > pageHeight - 20) {
                        pdf.addPage();
                        yPos = 20;
                    }
                    pdf.text(`• ${weakness}`, 20, yPos);
                    yPos += 8;
                });
            } else {
                pdf.text('Không có', 20, yPos);
                yPos += 8;
            }

            // Learning recommendations
            if (history.session.learning_recommendations && history.session.learning_recommendations.length > 0) {
                yPos += 10;
                if (yPos > pageHeight - 40) {
                    pdf.addPage();
                    yPos = 20;
                }

                pdf.setFontSize(16);
                pdf.setFont('helvetica', 'bold');
                pdf.text('GỢI Ý HỌC TẬP', 20, yPos);
                yPos += 10;

                pdf.setFontSize(12);
                pdf.setFont('helvetica', 'normal');
                history.session.learning_recommendations.forEach(rec => {
                    if (yPos > pageHeight - 30) {
                        pdf.addPage();
                        yPos = 20;
                    }
                    pdf.text(`• ${rec.skill} (${interviewService.getPriorityLabel(rec.priority)})`, 20, yPos);
                    yPos += 6;
                    pdf.text(`  Thời gian: ${rec.estimated_time}`, 20, yPos);
                    yPos += 10;
                });
            }

            // Summary
            if (history.session.summary) {
                yPos += 10;
                if (yPos > pageHeight - 40) {
                    pdf.addPage();
                    yPos = 20;
                }

                pdf.setFontSize(16);
                pdf.setFont('helvetica', 'bold');
                pdf.text('TÓM TẮT', 20, yPos);
                yPos += 10;

                pdf.setFontSize(12);
                pdf.setFont('helvetica', 'normal');
                const summaryLines = pdf.splitTextToSize(history.session.summary, pageWidth - 40);
                summaryLines.forEach((line: string) => {
                    if (yPos > pageHeight - 20) {
                        pdf.addPage();
                        yPos = 20;
                    }
                    pdf.text(line, 20, yPos);
                    yPos += 6;
                });
            }

            // Footer
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'italic');
            pdf.text(`Báo cáo được tạo tự động bởi AI Career System - ${new Date().toLocaleString('vi-VN')}`,
                pageWidth / 2, pageHeight - 10, { align: 'center' });

            // Save PDF
            pdf.save(`interview-report-${history.session.job_title}-${sessionId}.pdf`);
            toast.success('Đã tải xuống báo cáo PDF');

        } catch (error) {
            console.error('Error generating PDF:', error);
            toast.error('Lỗi khi tạo báo cáo PDF');
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const shareResults = async () => {
        if (!history) return;

        const shareText = `Tôi vừa hoàn thành phỏng vấn AI cho vị trí ${history.session.job_title} với điểm ${interviewService.formatScore(history.session.overall_score)}!`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Kết quả phỏng vấn AI',
                    text: shareText,
                    url: window.location.href
                });
            } catch (error) {
                console.error('Error sharing:', error);
            }
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
            toast.success('Đã sao chép link chia sẻ');
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p>Đang tải kết quả...</p>
                </div>
            </div>
        );
    }

    if (!history) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600 mb-4">Không tìm thấy kết quả phỏng vấn</p>
                    <Button onClick={() => navigate('/dashboard')}>
                        Về Dashboard
                    </Button>
                </div>
            </div>
        );
    }

    const getRecommendationIcon = (recommendation?: string) => {
        switch (recommendation) {
            case 'PASS':
                return <CheckCircle className="h-5 w-5 text-indigo-800" />;
            case 'CONDITIONAL_PASS':
                return <AlertCircle className="h-5 w-5 text-yellow-600" />;
            case 'FAIL':
                return <XCircle className="h-5 w-5 text-red-600" />;
            default:
                return <AlertCircle className="h-5 w-5 text-gray-600" />;
        }
    };

    return (
        <MainLayout>
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none"></div>

                <div className="relative z-10 py-8">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        {/* Header */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center space-x-6">
                                    <button
                                        onClick={() => navigate('/interview')}
                                        className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        <span>Quay lại</span>
                                    </button>
                                    <div>
                                        <h1 className="text-4xl font-bold text-gray-900 mb-2">
                                            Kết quả phỏng vấn AI
                                        </h1>
                                        <div className="flex items-center space-x-4 text-gray-600">
                                            <span className="flex items-center space-x-2">
                                                <Briefcase className="h-4 w-4" />
                                                <span>{history.session.job_title}</span>
                                            </span>
                                            <span className="flex items-center space-x-2">
                                                <Clock className="h-4 w-4" />
                                                <span>{new Date(history.session.started_at).toLocaleDateString('vi-VN')}</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <button
                                        onClick={shareResults}
                                        className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                                    >
                                        <Share2 className="h-4 w-4" />
                                        <span>Chia sẻ</span>
                                    </button>
                                    <button
                                        onClick={downloadReport}
                                        disabled={isGeneratingPDF}
                                        className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm disabled:opacity-50"
                                    >
                                        {isGeneratingPDF ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                                <span>Đang tạo PDF...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Download className="h-4 w-4" />
                                                <span>Tải báo cáo PDF</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Overall Result Card */}
                            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-6">
                                        <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full">
                                            {getRecommendationIcon(history.session.recommendation)}
                                        </div>
                                        <div>
                                            <h2 className="text-4xl font-bold text-gray-900 mb-1">
                                                {interviewService.formatScore(history.session.overall_score)}
                                            </h2>
                                            <p className="text-lg text-gray-600">Điểm tổng thể</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`inline-flex items-center px-6 py-3 rounded-full text-lg font-semibold ${history.session.recommendation === 'PASS'
                                            ? 'bg-indigo-50 text-indigo-950 border border-indigo-200'
                                            : history.session.recommendation === 'CONDITIONAL_PASS'
                                                ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                                : 'bg-red-100 text-red-800 border border-red-200'
                                            }`}>
                                            {interviewService.getRecommendationLabel(history.session.recommendation)}
                                        </div>
                                    </div>
                                </div>
                                {history.session.summary && (
                                    <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                                        <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                                            <FileText className="h-5 w-5 mr-2 text-blue-600" />
                                            Tóm tắt đánh giá
                                        </h3>
                                        <p className="text-gray-700 leading-relaxed">{history.session.summary}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Main Content */}
                            <div className="lg:col-span-2 space-y-8">
                                {/* Detailed Scores */}
                                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                                    <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-8 py-6 border-b border-gray-200">
                                        <h3 className="text-2xl font-bold text-gray-900 flex items-center">
                                            <BarChart3 className="h-6 w-6 mr-3 text-indigo-600" />
                                            Điểm chi tiết
                                        </h3>
                                        <p className="text-gray-600 mt-1">Phân tích kỹ năng theo từng tiêu chí</p>
                                    </div>
                                    <div className="p-8">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {[
                                                { label: 'Kỹ thuật', score: history.session.technical_score, icon: Target, color: 'blue' },
                                                { label: 'Giao tiếp', score: history.session.communication_score, icon: MessageSquare, color: 'green' },
                                                { label: 'Tư duy logic', score: history.session.logic_score, icon: Brain, color: 'purple' },
                                                { label: 'Kinh nghiệm', score: history.session.experience_score, icon: Clock, color: 'orange' },
                                                { label: 'Thái độ', score: history.session.attitude_score, icon: Star, color: 'pink' }
                                            ].map((item, index) => (
                                                <div key={index} className="p-6 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="flex items-center space-x-3">
                                                            <div className={`p-2 rounded-lg bg-${item.color}-100`}>
                                                                <item.icon className={`h-5 w-5 text-${item.color}-600`} />
                                                            </div>
                                                            <span className="font-semibold text-gray-900">{item.label}</span>
                                                        </div>
                                                        <span className={`text-2xl font-bold ${interviewService.getScoreColor(item.score)}`}>
                                                            {interviewService.formatScore(item.score)}
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-3">
                                                        <div
                                                            className={`h-3 rounded-full bg-gradient-to-r from-${item.color}-400 to-${item.color}-600 transition-all duration-500`}
                                                            style={{ width: `${(item.score || 0) * 10}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Strengths & Weaknesses */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Strengths */}
                                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                                        <div className="bg-gradient-to-r from-indigo-50 to-indigo-50 px-6 py-5 border-b border-gray-200">
                                            <h3 className="text-xl font-bold text-gray-900 flex items-center">
                                                <TrendingUp className="h-5 w-5 mr-2 text-indigo-800" />
                                                Điểm mạnh
                                            </h3>
                                        </div>
                                        <div className="p-6">
                                            {history.session.key_strengths && history.session.key_strengths.length > 0 ? (
                                                <div className="space-y-3">
                                                    {history.session.key_strengths.map((strength, index) => (
                                                        <div key={index} className="flex items-start space-x-3 p-3 bg-indigo-50 rounded-lg">
                                                            <CheckCircle className="h-5 w-5 text-indigo-800 mt-0.5 flex-shrink-0" />
                                                            <span className="text-gray-700 leading-relaxed">{strength}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-8">
                                                    <Award className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                                                    <p className="text-gray-500">Chưa có điểm mạnh được ghi nhận</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Weaknesses */}
                                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                                        <div className="bg-gradient-to-r from-red-50 to-pink-50 px-6 py-5 border-b border-gray-200">
                                            <h3 className="text-xl font-bold text-gray-900 flex items-center">
                                                <TrendingDown className="h-5 w-5 mr-2 text-red-600" />
                                                Điểm cần cải thiện
                                            </h3>
                                        </div>
                                        <div className="p-6">
                                            {history.session.key_weaknesses && history.session.key_weaknesses.length > 0 ? (
                                                <div className="space-y-3">
                                                    {history.session.key_weaknesses.map((weakness, index) => (
                                                        <div key={index} className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
                                                            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                                                            <span className="text-gray-700 leading-relaxed">{weakness}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-8">
                                                    <Zap className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                                                    <p className="text-gray-500">Không có điểm yếu được ghi nhận</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Learning Recommendations */}
                                {history.session.learning_recommendations && history.session.learning_recommendations.length > 0 && (
                                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                                        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-8 py-6 border-b border-gray-200">
                                            <h3 className="text-2xl font-bold text-gray-900 flex items-center">
                                                <BookOpen className="h-6 w-6 mr-3 text-purple-600" />
                                                Gợi ý học tập
                                            </h3>
                                            <p className="text-gray-600 mt-1">Lộ trình phát triển kỹ năng được cá nhân hóa</p>
                                        </div>
                                        <div className="p-8">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {history.session.learning_recommendations.map((rec, index) => (
                                                    <div key={index} className="border border-gray-200 rounded-xl p-6 bg-gradient-to-br from-white to-gray-50">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <h4 className="font-bold text-gray-900 text-lg">{rec.skill}</h4>
                                                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${rec.priority === 'HIGH'
                                                                ? 'bg-red-100 text-red-800'
                                                                : rec.priority === 'MEDIUM'
                                                                    ? 'bg-yellow-100 text-yellow-800'
                                                                    : 'bg-indigo-50 text-indigo-950'
                                                                }`}>
                                                                {interviewService.getPriorityLabel(rec.priority)}
                                                            </span>
                                                        </div>
                                                        <div className="space-y-4">
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-700 mb-2">Khóa học đề xuất:</p>
                                                                <ul className="space-y-2">
                                                                    {rec.suggested_courses.map((course, courseIndex) => (
                                                                        <li key={courseIndex} className="flex items-start space-x-2">
                                                                            <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                                                                            <span className="text-sm text-gray-600">{course}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                                                                <Clock className="h-4 w-4" />
                                                                <span>Thời gian ước tính: {rec.estimated_time}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Sidebar */}
                            <div className="space-y-6">
                                {/* Session Info Card - Enhanced */}
                                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                                    <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-5 border-b border-gray-200">
                                        <h3 className="text-xl font-bold text-gray-900 flex items-center">
                                            <Settings className="h-5 w-5 mr-3 text-gray-600" />
                                            Thông tin phiên
                                        </h3>
                                        <p className="text-gray-600 mt-1 text-sm">Chi tiết về buổi phỏng vấn</p>
                                    </div>
                                    <div className="p-6">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                                        <Clock className="h-4 w-4 text-white" />
                                                    </div>
                                                    <span className="text-sm font-medium text-blue-900">Bắt đầu</span>
                                                </div>
                                                <span className="text-sm text-blue-800 font-medium">
                                                    {new Date(history.session.started_at).toLocaleString('vi-VN')}
                                                </span>
                                            </div>

                                            {history.session.completed_at && (
                                                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-50 to-indigo-50 rounded-lg">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-8 h-8 bg-indigo-700 rounded-full flex items-center justify-center">
                                                            <CheckCircle className="h-4 w-4 text-white" />
                                                        </div>
                                                        <span className="text-sm font-medium text-indigo-950">Kết thúc</span>
                                                    </div>
                                                    <span className="text-sm text-indigo-950 font-medium">
                                                        {new Date(history.session.completed_at).toLocaleString('vi-VN')}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                                                        <MessageSquare className="h-4 w-4 text-white" />
                                                    </div>
                                                    <span className="text-sm font-medium text-purple-900">Số câu hỏi</span>
                                                </div>
                                                <span className="text-sm text-purple-800 font-bold">
                                                    {history.messages.filter(m => m.role === 'interviewer' && m.question_type !== 'greeting').length}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                                                        <Target className="h-4 w-4 text-white" />
                                                    </div>
                                                    <span className="text-sm font-medium text-orange-900">Trạng thái</span>
                                                </div>
                                                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${history.session.status === 'completed'
                                                    ? 'bg-indigo-50 text-indigo-950 border border-indigo-200'
                                                    : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                                    }`}>
                                                    {history.session.status === 'completed' ? 'Hoàn thành' : 'Chưa hoàn thành'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Skills Tested - Enhanced with Hard Skills */}
                                {history.session.skills_context && history.session.skills_context.length > 0 && (
                                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-5 border-b border-gray-200">
                                            <h3 className="text-xl font-bold text-gray-900 flex items-center">
                                                <Brain className="h-5 w-5 mr-3 text-indigo-600" />
                                                Kỹ năng được đánh giá
                                            </h3>
                                            <p className="text-gray-600 mt-1 text-sm">Các kỹ năng trong buổi phỏng vấn</p>
                                        </div>
                                        <div className="p-6">
                                            {/* Soft Skills */}
                                            <div className="mb-6">
                                                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                                                    <Users className="h-4 w-4 mr-2 text-blue-600" />
                                                    Kỹ năng mềm
                                                </h4>
                                                <div className="space-y-2">
                                                    {history.session.skills_context
                                                        .filter(skill => !skill.is_hard_skill)
                                                        .slice(0, 5)
                                                        .map((skill, index) => (
                                                            <div
                                                                key={index}
                                                                className="flex items-center justify-between text-sm group cursor-help relative p-2 rounded-lg hover:bg-blue-50 transition-colors"
                                                                title={`${skill.skill_name} - Mức độ quan trọng: ${skill.importance.toFixed(1)}/5`}
                                                            >
                                                                <span className="text-gray-700 group-hover:text-blue-700 transition-colors flex-1 mr-2">
                                                                    {skill.skill_name}
                                                                </span>
                                                                <span className="text-blue-600 font-medium group-hover:text-blue-700 transition-colors">
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
                                                </div>
                                            </div>

                                            {/* Hard Skills */}
                                            <div>
                                                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                                                    <Wrench className="h-4 w-4 mr-2 text-orange-600" />
                                                    Kỹ năng chuyên ngành
                                                </h4>
                                                <div className="space-y-2">
                                                    {history.session.skills_context
                                                        .filter(skill => skill.is_hard_skill)
                                                        .slice(0, 5)
                                                        .map((skill, index) => (
                                                            <div
                                                                key={index}
                                                                className="flex items-center justify-between text-sm group cursor-help relative p-2 rounded-lg hover:bg-orange-50 transition-colors"
                                                                title={`${skill.skill_name} - Mức độ quan trọng: ${skill.importance.toFixed(1)}/5`}
                                                            >
                                                                <span className="text-gray-700 group-hover:text-orange-700 transition-colors flex-1 mr-2">
                                                                    {skill.skill_name}
                                                                </span>
                                                                <span className="text-orange-600 font-medium group-hover:text-orange-700 transition-colors">
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

                                                    {/* Show count if there are no hard skills */}
                                                    {history.session.skills_context.filter(skill => skill.is_hard_skill).length === 0 && (
                                                        <div className="text-center py-4">
                                                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                                                <Wrench className="h-6 w-6 text-gray-400" />
                                                            </div>
                                                            <p className="text-sm text-gray-500">Không có kỹ năng chuyên ngành được đánh giá</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons - Enhanced */}
                                <div className="space-y-4">
                                    <button
                                        onClick={() => navigate('/interview')}
                                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center justify-center gap-3 shadow-lg"
                                    >
                                        <Target className="h-5 w-5" />
                                        Phỏng vấn lại
                                    </button>
                                    <button
                                        onClick={() => setShowFeedbackForm(true)}
                                        className="w-full bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 px-6 py-4 rounded-xl font-semibold hover:from-gray-200 hover:to-gray-300 transition-all duration-200 flex items-center justify-center gap-3 border border-gray-300"
                                    >
                                        <Star className="h-5 w-5" />
                                        Đánh giá phỏng vấn
                                    </button>
                                </div>

                                {/* Enhanced Feedback Form */}
                                {showFeedbackForm && (
                                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                                        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 px-6 py-5 border-b border-gray-200">
                                            <h3 className="text-xl font-bold text-gray-900 flex items-center">
                                                <Star className="h-5 w-5 mr-3 text-yellow-600" />
                                                Đánh giá phỏng vấn
                                            </h3>
                                            <p className="text-gray-600 mt-1 text-sm">Chia sẻ trải nghiệm của bạn</p>
                                        </div>
                                        <div className="p-6 space-y-6">
                                            <div>
                                                <label className="text-sm font-semibold text-gray-900 mb-3 block">
                                                    Chất lượng câu hỏi
                                                </label>
                                                <select
                                                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    value={feedback.question_quality}
                                                    onChange={(e) => setFeedback(prev => ({ ...prev, question_quality: parseInt(e.target.value) }))}
                                                >
                                                    {[1, 2, 3, 4, 5].map(n => (
                                                        <option key={n} value={n}>
                                                            {n} sao {n === 5 ? '(Xuất sắc)' : n === 4 ? '(Tốt)' : n === 3 ? '(Bình thường)' : n === 2 ? '(Kém)' : '(Rất kém)'}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="text-sm font-semibold text-gray-900 mb-3 block">
                                                    Độ chính xác AI
                                                </label>
                                                <select
                                                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    value={feedback.ai_accuracy}
                                                    onChange={(e) => setFeedback(prev => ({ ...prev, ai_accuracy: parseInt(e.target.value) }))}
                                                >
                                                    {[1, 2, 3, 4, 5].map(n => (
                                                        <option key={n} value={n}>
                                                            {n} sao {n === 5 ? '(Xuất sắc)' : n === 4 ? '(Tốt)' : n === 3 ? '(Bình thường)' : n === 2 ? '(Kém)' : '(Rất kém)'}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="text-sm font-semibold text-gray-900 mb-3 block">
                                                    Trải nghiệm tổng thể
                                                </label>
                                                <select
                                                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    value={feedback.overall_experience}
                                                    onChange={(e) => setFeedback(prev => ({ ...prev, overall_experience: parseInt(e.target.value) }))}
                                                >
                                                    {[1, 2, 3, 4, 5].map(n => (
                                                        <option key={n} value={n}>
                                                            {n} sao {n === 5 ? '(Xuất sắc)' : n === 4 ? '(Tốt)' : n === 3 ? '(Bình thường)' : n === 2 ? '(Kém)' : '(Rất kém)'}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="text-sm font-semibold text-gray-900 mb-3 block">
                                                    Nhận xét chi tiết (tùy chọn)
                                                </label>
                                                <Textarea
                                                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                                    rows={4}
                                                    placeholder="Chia sẻ nhận xét của bạn về buổi phỏng vấn..."
                                                    value={feedback.comments}
                                                    onChange={(e) => setFeedback(prev => ({ ...prev, comments: e.target.value }))}
                                                />
                                            </div>

                                            <div className="flex space-x-3">
                                                <button
                                                    onClick={submitFeedback}
                                                    className="flex-1 bg-gradient-to-r from-indigo-800 to-indigo-900 text-white px-4 py-3 rounded-xl font-semibold hover:from-indigo-900 hover:to-indigo-950 transition-all duration-200"
                                                >
                                                    Gửi đánh giá
                                                </button>
                                                <button
                                                    onClick={() => setShowFeedbackForm(false)}
                                                    className="flex-1 bg-gray-100 text-gray-700 px-4 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200 border border-gray-300"
                                                >
                                                    Hủy
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default InterviewResultsPage;