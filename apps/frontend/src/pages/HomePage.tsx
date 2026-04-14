import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/layout/MainLayout';
import api from '../lib/api';
import { useApiCallTracker } from '../hooks/useApiCallTracker';

// --- TYPES ---
interface PublicStats {
    totalAssessments: number;
    totalCareerPaths: number;
    totalCareerInfo: number;
    satisfactionRate: number;
}

const HomePage = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [stats, setStats] = useState<PublicStats | null>(null);

    // API call tracking and duplicate prevention
    const { trackCall } = useApiCallTracker('HomePage');
    const hasLoadedRef = useRef(false);

    const fetchStats = useCallback(async () => {
        if (hasLoadedRef.current) {
            console.log('⚠️ [HomePage] Duplicate stats load attempt prevented');
            return;
        }

        hasLoadedRef.current = true;
        console.log('🔄 [HomePage] Loading app stats...');

        try {
            trackCall('/api/app/stats');
            const response = await api.get('/api/app/stats');
            setStats(response.data);
            console.log('✅ [HomePage] App stats loaded successfully:', response.data);
        } catch (error) {
            console.error('❌ [HomePage] Failed to fetch public stats:', error);
            // Use fallback stats
            setStats({
                totalAssessments: 150,
                totalCareerPaths: 50,
                totalCareerInfo: 20000,
                satisfactionRate: 98
            });
            hasLoadedRef.current = false; // Reset on error to allow retry
        }
    }, [trackCall]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    return (
        <MainLayout>
            {/* Hero Section */}
            <section className="relative pt-20 pb-32 overflow-hidden bg-white dark:bg-gray-900">
                {/* Animated Background */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                    <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 dark:bg-purple-900 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-70 animate-pulse"></div>
                    <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 dark:bg-yellow-900 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-70 animate-pulse animation-delay-2000"></div>
                    <div className="absolute -bottom-8 left-20 w-72 h-72 bg-green-300 dark:bg-green-900 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-70 animate-pulse animation-delay-4000"></div>
                </div>

                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <div className="flex flex-col items-center justify-center gap-4 mb-8">
                        <span className="relative px-4 py-1.5 rounded-full bg-white/50 dark:bg-gray-800/50 border border-green-200 dark:border-green-800 backdrop-blur-sm text-sm font-bold inline-block mb-4 shadow-sm hover:scale-105 transition-transform cursor-default">
                            ✨ New AI Engine v2.0 Released
                        </span>

                        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-6 leading-[1.1] drop-shadow-sm">
                            Build your future with <br className="hidden md:block" />
                            <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">Intelligent Career Pathing</span>
                        </h1>

                        <p className="text-xl text-gray-600 dark:text-gray-400 mb-10 leading-relaxed max-w-2xl mx-auto font-medium">
                            Discover your ideal career path with AI-powered personality assessments, personalized recommendations, and detailed roadmaps.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-5 w-full">
                            <Link
                                to="/assessment"
                                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-green-600 rounded-full hover:bg-green-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 relative overflow-hidden group"
                            >
                                Start Assessment
                                <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </Link>
                            <Link
                                to="/careers"
                                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-600 bg-white/80 border border-gray-200 rounded-full hover:bg-white hover:border-gray-300 dark:bg-gray-800/80 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-800 transition-all backdrop-blur-sm shadow-sm hover:shadow-md"
                            >
                                <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                Explore Careers
                            </Link>
                        </div>
                    </div>

                    {/* Stats Preview */}
                    <div className="relative mt-16 mx-auto max-w-4xl">
                        <div className="relative bg-white/60 dark:bg-gray-800/60 backdrop-filter backdrop-blur-lg rounded-2xl p-6 md:p-8 shadow-2xl border border-white/20 dark:border-gray-700/20">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-gray-800/50">
                                <div className="flex flex-col items-center justify-center p-2">
                                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 mb-3 shadow-inner">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </div>
                                    <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">98%</div>
                                    <div className="text-sm font-medium text-gray-500">Success Rate</div>
                                </div>
                                <div className="flex flex-col items-center justify-center p-2">
                                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center text-green-600 mb-3 shadow-inner">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">20K+</div>
                                    <div className="text-sm font-medium text-gray-500">Career Data</div>
                                </div>
                                <div className="flex flex-col items-center justify-center p-2">
                                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center text-purple-600 mb-3 shadow-inner">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">&lt; 10min</div>
                                    <div className="text-sm font-medium text-gray-500">Assessment Time</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 bg-gray-50 dark:bg-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            Why Choose CareerBridge AI?
                        </h2>
                        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                            Our AI-powered platform provides comprehensive career guidance tailored to your unique personality and goals.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 mb-4">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">AI-Powered Assessment</h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                Advanced personality analysis using RIASEC and Big Five models to understand your unique traits and preferences.
                            </p>
                        </div>

                        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center text-green-600 mb-4">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Personalized Recommendations</h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                Get tailored career suggestions based on your assessment results, skills, and market trends.
                            </p>
                        </div>

                        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center text-purple-600 mb-4">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Detailed Roadmaps</h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                Step-by-step career development plans with skills, education, and experience requirements.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-green-600">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                        Ready to Discover Your Perfect Career?
                    </h2>
                    <p className="text-xl text-green-100 mb-8 max-w-2xl mx-auto">
                        Join thousands of professionals who have found their ideal career path with CareerBridge AI.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            to="/assessment"
                            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-green-600 bg-white rounded-full hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
                        >
                            Start Free Assessment
                            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </Link>
                        <Link
                            to="/careers"
                            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white border-2 border-white rounded-full hover:bg-white hover:text-green-600 transition-all"
                        >
                            Explore Careers
                        </Link>
                    </div>
                </div>
            </section>
        </MainLayout>
    );
};

export default HomePage;