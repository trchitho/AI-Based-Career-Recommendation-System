import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import CVForm from '../components/cv/CVForm';
import CVPreview from '../components/cv/CVPreview';
import CVScoreCard from '../components/cv/CVScoreCard';
import AISuggestions from '../components/cv/AISuggestions';
import { cvService } from '../services/cvService';
import { CV } from '../types/cv';
import { calculateCVScore } from '../utils/cvHelper';
import api from '../lib/api';

const CVBuilderPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [cv, setCV] = useState<CV | null>(null);
    const [draftCV, setDraftCV] = useState<Partial<CV> | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [riasecScores, setRiasecScores] = useState<Record<string, number> | null>(null);
    const [showAI, setShowAI] = useState(true);

    useEffect(() => {
        if (id) {
            loadCV(id);
        } else {
            // Auto-fill for new CV
            autoFillNewCV();
        }
        loadAssessmentData();
    }, [id]);

    const loadAssessmentData = async () => {
        try {
            const profileResponse = await api.get('/api/users/me');
            const profile = profileResponse.data;
            const historyResponse = await api.get(`/api/users/${profile.id}/history`);
            const history = historyResponse.data;

            if (history && history.length > 0) {
                const latestAssessment = history[0];
                if (latestAssessment.riasec_scores) {
                    setRiasecScores(latestAssessment.riasec_scores);
                }
            }
        } catch (error) {
            console.log('Could not load assessment data:', error);
        }
    };

    const autoFillNewCV = async () => {
        try {
            setLoading(true);

            // Get profile data
            const profileResponse = await api.get('/api/users/me');
            const profile = profileResponse.data;

            // Get assessment history
            let careerSummary = '';
            let suggestedSkills: any[] = [];

            try {
                const historyResponse = await api.get(`/api/users/${profile.id}/history`);
                const history = historyResponse.data;

                if (history && history.length > 0) {
                    const latestAssessment = history[0];
                    const riasecScores = latestAssessment.riasec_scores;

                    if (riasecScores) {
                        // Generate career summary
                        const dimensions = Object.entries(riasecScores)
                            .sort(([, a]: any, [, b]: any) => b - a)
                            .slice(0, 3)
                            .map(([key]) => key);

                        const careerMap: Record<string, string> = {
                            realistic: 'hands-on technical work and practical problem-solving',
                            investigative: 'research, analysis, and intellectual challenges',
                            artistic: 'creative expression and innovative design',
                            social: 'helping others and collaborative teamwork',
                            enterprising:
                                'leadership, business development, and strategic initiatives',
                            conventional:
                                'organization, data management, and systematic processes',
                        };

                        const interests = dimensions
                            .map((dim) => careerMap[dim])
                            .filter(Boolean)
                            .join(', ');

                        if (interests) {
                            careerSummary = `Motivated professional with strong interests in ${interests}. Seeking opportunities to leverage my skills and passion to contribute to organizational success.`;
                        }

                        // Suggest skills based on top RIASEC dimension
                        const topDimension = dimensions[0];
                        const skillSuggestions: Record<string, string[]> = {
                            realistic: [
                                'Technical Skills',
                                'Problem Solving',
                                'Quality Control',
                            ],
                            investigative: [
                                'Data Analysis',
                                'Research Methods',
                                'Critical Thinking',
                            ],
                            artistic: ['Creative Design', 'Innovation', 'Visual Communication'],
                            social: ['Communication', 'Team Collaboration', 'Interpersonal Skills'],
                            enterprising: ['Leadership', 'Project Management', 'Strategic Planning'],
                            conventional: [
                                'Organization',
                                'Data Management',
                                'Attention to Detail',
                            ],
                        };

                        const skills = topDimension && skillSuggestions[topDimension] ? skillSuggestions[topDimension] : [];
                        suggestedSkills = skills.map((skill) => ({
                            name: skill,
                            level: 'Intermediate' as const,
                        }));
                    }
                }
            } catch (historyError) {
                console.log('Could not fetch assessment history:', historyError);
            }

            // Create initial CV with auto-filled data
            const initialCV: Partial<CV> = {
                title: 'My Professional CV',
                template: 'modern',
                personalInfo: {
                    fullName: profile.full_name || '',
                    email: profile.email || '',
                    phone: '',
                    address: '',
                    dateOfBirth: profile.date_of_birth || '',
                    linkedin: '',
                    github: '',
                    summary: careerSummary,
                },
                education: [],
                experience: [],
                skills: suggestedSkills,
                projects: [],
                certifications: [],
                languages: [],
            };

            setDraftCV(initialCV);

            // Show success message if data was auto-filled
            if (careerSummary || suggestedSkills.length > 0) {
                setTimeout(() => {
                    const message = [
                        '✨ CV auto-filled with your profile data!',
                        careerSummary ? '• Career summary generated from your assessment' : '',
                        suggestedSkills.length > 0
                            ? `• ${suggestedSkills.length} skills suggested based on your profile`
                            : '',
                    ]
                        .filter(Boolean)
                        .join('\n');

                    console.log(message);
                }, 500);
            }
        } catch (error) {
            console.error('Error auto-filling CV:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadCV = async (cvId: string) => {
        try {
            setLoading(true);
            const data = await cvService.getCV(cvId);
            setCV(data);
        } catch (err) {
            console.error('Error loading CV:', err);
            setError('Failed to load CV');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (cvData: Partial<CV>) => {
        try {
            setSaving(true);
            setError(null);

            // Update draft for immediate preview
            setDraftCV(cvData);

            if (id) {
                const updated = await cvService.updateCV(id, cvData);
                setCV(updated);
            } else {
                const created = await cvService.createCV(cvData);
                setCV(created);
                navigate(`/cv/builder/${created.id}`, { replace: true });
            }

            alert('CV saved successfully!');
        } catch (err) {
            console.error('Error saving CV:', err);
            setError('Failed to save CV');
        } finally {
            setSaving(false);
        }
    };

    const handleDraftChange = (cvData: Partial<CV>) => {
        // Update draft immediately for live preview
        setDraftCV(cvData);
    };

    const handleApplySuggestion = (type: string, value: string) => {
        if (type === 'skill') {
            const currentCV = draftCV || cv || {};
            const updatedCV = {
                ...currentCV,
                skills: [
                    ...(currentCV.skills || []),
                    { name: value, level: 'Intermediate' as const },
                ],
            };
            setDraftCV(updatedCV);
            alert(`Added "${value}" to your skills!`);
        }
    };

    const cvScore = calculateCVScore(draftCV || cv || {});

    const handleExport = async () => {
        if (!cv?.id) return;

        try {
            const blob = await cvService.exportPDF(cv.id);
            cvService.downloadPDF(blob, `${cv.title || 'CV'}.pdf`);
        } catch (err) {
            console.error('Error exporting CV:', err);
            alert('Failed to export CV');
        }
    };

    if (loading) {
        return (
            <MainLayout>
                <div className="max-w-7xl mx-auto px-4 py-12">
                    <div className="flex items-center justify-center h-64">
                        <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 border-t-green-600 rounded-full animate-spin"></div>
                    </div>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="max-w-7xl mx-auto px-4 py-12">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                                {id ? 'Edit CV' : 'Create New CV'}
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400">
                                Build your professional CV with our easy-to-use builder
                            </p>
                        </div>
                        <button
                            onClick={() => navigate('/cv')}
                            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-semibold"
                        >
                            ← Back to My CVs
                        </button>
                    </div>

                    {/* Toggle Preview */}
                    <div className="flex gap-4 ">
                        <button
                            onClick={() => setShowPreview(false)}
                            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${!showPreview
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                }`}
                        >
                            ✏️ Edit
                        </button>
                        <button
                            onClick={() => setShowPreview(true)}
                            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${showPreview
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                }`}
                        >
                            👁️ Preview
                        </button>
                        {cv && (
                            <button
                                onClick={handleExport}
                                className="ml-auto px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                            >
                                📥 Export PDF
                            </button>
                        )}
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
                        {error}
                    </div>
                )}

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Sidebar - AI & Score */}
                    {!showPreview && (
                        <div className="lg:col-span-1 space-y-6">
                            <CVScoreCard score={cvScore} />
                            {showAI && (
                                <AISuggestions
                                    riasecScores={riasecScores ?? undefined}
                                    onApplySuggestion={handleApplySuggestion}
                                />
                            )}
                        </div>
                    )}

                    {/* Main Content */}
                    <div
                        className={`${showPreview ? 'lg:col-span-3' : 'lg:col-span-2'
                            } bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8`}
                    >
                        {!showPreview ? (
                            <CVForm
                                initialData={(draftCV as CV) || cv || undefined}
                                onSave={handleSave}
                                onCancel={() => navigate('/cv')}
                                onChange={handleDraftChange}
                            />
                        ) : draftCV || cv ? (
                            <CVPreview cv={(draftCV || cv) as CV} />
                        ) : (
                            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                Start filling out your CV to see the preview
                            </div>
                        )}
                    </div>
                </div>

                {/* Saving Indicator */}
                {saving && (
                    <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Saving...
                    </div>
                )}
            </div>
        </MainLayout>
    );
};

export default CVBuilderPage;
