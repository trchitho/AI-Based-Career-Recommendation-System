import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { cvService } from '../services/cvService';
import { CVListItem } from '../types/cv';

const CVListPage = () => {
    const navigate = useNavigate();
    const [cvs, setCVs] = useState<CVListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadCVs();
    }, []);

    const loadCVs = async () => {
        try {
            setLoading(true);
            const data = await cvService.getCVs();
            // Ensure data is an array
            if (Array.isArray(data)) {
                setCVs(data);
            } else {
                console.error('API returned non-array data:', data);
                setCVs([]);
                setError('Invalid data format received');
            }
        } catch (err) {
            console.error('Error loading CVs:', err);
            setError('Failed to load CVs');
            setCVs([]); // Ensure cvs is always an array
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this CV?')) return;

        try {
            await cvService.deleteCV(id);
            setCVs(cvs.filter((cv) => cv.id !== id));
        } catch (err) {
            console.error('Error deleting CV:', err);
            alert('Failed to delete CV');
        }
    };

    const handleExport = async (id: string, title: string) => {
        try {
            const blob = await cvService.exportPDF(id);
            cvService.downloadPDF(blob, `${title}.pdf`);
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
            <div className="max-w-4xl mx-auto px-4 py-12">
                {/* Header - Centered */}
                <div className="mb-8 text-center">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">My CVs</h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Manage your professional CVs and export them anytime
                    </p>
                    <button
                        onClick={() => navigate('/cv/builder')}
                        className="px-8 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all inline-flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create New CV
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
                        {error}
                    </div>
                )}

                {/* CV List */}
                {cvs.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 text-center">
                        <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No CVs yet</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Create your first professional CV to get started
                        </p>
                        <button
                            onClick={() => navigate('/cv/builder')}
                            className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors"
                        >
                            Create Your First CV
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 max-w-2xl mx-auto">
                        {cvs.map((cv) => (
                            <div
                                key={cv.id}
                                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-all p-6 border border-gray-100 dark:border-gray-700"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                                            {cv.title}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            Updated {new Date(cv.updatedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-semibold">
                                        {cv.template}
                                    </span>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => navigate(`/cv/builder/${cv.id}`)}
                                        className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                    >
                                        ✏️ Edit
                                    </button>
                                    <button
                                        onClick={() => handleExport(cv.id, cv.title)}
                                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                                    >
                                        📥 Export
                                    </button>
                                    <button
                                        onClick={() => handleDelete(cv.id)}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </MainLayout>
    );
};

export default CVListPage;
