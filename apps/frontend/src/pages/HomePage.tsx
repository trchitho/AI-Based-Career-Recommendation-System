import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ThemeToggle from '../components/ThemeToggle';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useAppSettings } from '../contexts/AppSettingsContext';
import { useAuth } from '../contexts/AuthContext';

const HomePage = () => {
    const { t } = useTranslation();
    const app = useAppSettings();
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const isAuthenticated = Boolean(user);
    const isAdmin = user?.role === 'admin';

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-purple-900 relative overflow-hidden transition-colors duration-300">
            {/* Animated background particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute w-96 h-96 -top-48 -left-48 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 dark:opacity-10 animate-pulse"></div>
                <div className="absolute w-96 h-96 -bottom-48 -right-48 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 dark:opacity-10 animate-pulse delay-1000"></div>
                <div className="absolute w-96 h-96 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-5 dark:opacity-5 animate-pulse delay-500"></div>
            </div>

            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-[999999] bg-white/80 dark:bg-gray-800/50 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700/50 transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center space-x-8">
                            <Link to="/home" className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <span className="text-xl font-bold text-gray-900 dark:text-white">
                                    {app.app_title || 'CareerBridge AI'}
                                </span>
                            </Link>
                            {isAuthenticated && (
                                <div className="hidden md:flex space-x-1">
                                    <Link to="/dashboard" className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200">Dashboard</Link>
                                    <Link to="/assessment" className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200">Assessment</Link>
                                    <Link to="/blog" className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200">Blog</Link>
                                    <Link to="/careers" className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200">Careers</Link>
                                    <Link to="/profile" className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200">Profile</Link>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center space-x-4">
                            <LanguageSwitcher />
                            <ThemeToggle />
                            {isAuthenticated ? (
                                <>
                                    <span className="text-gray-700 dark:text-gray-300 text-sm hidden sm:block">{user?.email}</span>
                                    {isAdmin && (
                                        <Link
                                            to="/admin"
                                            className="px-4 py-2 bg-purple-500/20 text-purple-700 dark:text-purple-200 border border-purple-400/50 rounded-lg hover:bg-purple-500/30 transition-colors text-sm font-medium"
                                        >
                                            Admin Dashboard
                                        </Link>
                                    )}
                                    <button
                                        onClick={handleLogout}
                                        className="px-4 py-2 bg-gray-200/50 dark:bg-gray-700/50 hover:bg-gray-300/50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg transition-all duration-200 flex items-center space-x-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                        <span>{t('common.logout')}</span>
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link
                                        to="/login"
                                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
                                    >
                                        {t('auth.signIn')}
                                    </Link>
                                    <Link
                                        to="/assessment"
                                        className="px-6 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-medium hover:from-purple-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-purple-500/50"
                                    >
                                        {t('auth.signUp')}
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
                <div className="text-center mb-16">
                    <h1 className="text-6xl md:text-7xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-purple-700 dark:from-purple-400 dark:to-purple-600">
                            {t('home.hero.title')}
                        </span>
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-10 max-w-3xl mx-auto">
                        {t('home.hero.subtitle')}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Link
                            to={isAuthenticated ? '/dashboard' : '/assessment'}
                            className="px-8 py-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-bold text-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 shadow-2xl hover:shadow-purple-500/50 flex items-center space-x-2"
                        >
                            <span>{isAuthenticated ? 'Go to Dashboard' : 'Start Free Assessment'}</span>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </Link>
                        <Link
                            to={isAuthenticated ? '/careers' : '/login'}
                            className="px-8 py-4 bg-white/80 dark:bg-gray-800/50 backdrop-blur-xl border border-gray-300 dark:border-gray-700/50 text-gray-900 dark:text-white rounded-xl font-bold text-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all duration-200 shadow-lg"
                        >
                            {isAuthenticated ? 'Explore Careers' : 'Sign In'}
                        </Link>
                    </div>
                </div>

                {/* Features Grid */}
                <div className="grid md:grid-cols-3 gap-8 mt-20">
                    <div className="bg-white/90 dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700/50 p-8 hover:border-purple-500/50 transition-all duration-300 group shadow-xl">
                        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-500/50 group-hover:scale-110 transition-transform duration-300">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">AI-Powered Analysis</h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            Advanced machine learning algorithms analyze your responses to provide accurate career recommendations tailored to your unique profile.
                        </p>
                    </div>

                    <div className="bg-white/90 dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700/50 p-8 hover:border-purple-500/50 transition-all duration-300 group shadow-xl">
                        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-500/50 group-hover:scale-110 transition-transform duration-300">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Scientific Assessments</h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            Combines RIASEC career interest inventory and Big Five personality assessment for comprehensive insights into your career preferences.
                        </p>
                    </div>

                    <div className="bg-white/90 dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700/50 p-8 hover:border-purple-500/50 transition-all duration-300 group shadow-xl">
                        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-500/50 group-hover:scale-110 transition-transform duration-300">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Personalized Roadmaps</h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            Get customized learning paths and skill development roadmaps to help you achieve your career goals step by step.
                        </p>
                    </div>
                </div>

                {/* How It Works Section */}
                <div className="mt-32">
                    <div className="text-center mb-16">
                        <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">How It Works</h2>
                        <p className="text-xl text-gray-600 dark:text-gray-400">Three simple steps to discover your ideal career</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="relative">
                            <div className="bg-white/90 dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700/50 p-8 text-center shadow-xl">
                                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-purple-500/50">
                                    <span className="text-3xl font-bold text-white">1</span>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Take Assessment</h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Complete our comprehensive 15-minute assessment covering personality traits and career interests.
                                </p>
                            </div>
                            <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                                <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="bg-white/90 dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700/50 p-8 text-center shadow-xl">
                                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-purple-500/50">
                                    <span className="text-3xl font-bold text-white">2</span>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Get Results</h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Receive AI-powered career recommendations matched to your unique personality and interests.
                                </p>
                            </div>
                            <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                                <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </div>
                        </div>

                        <div className="bg-white/90 dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700/50 p-8 text-center shadow-xl">
                            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-purple-500/50">
                                <span className="text-3xl font-bold text-white">3</span>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Start Learning</h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                Follow your personalized roadmap with curated resources and milestones to achieve your career goals.
                            </p>
                        </div>
                    </div>
                </div>

                {/* CTA Section */}
                <div className="mt-32 bg-gradient-to-r from-purple-100 to-purple-200 dark:from-purple-500/20 dark:to-purple-600/20 backdrop-blur-xl rounded-3xl border border-purple-300 dark:border-purple-500/30 p-12 text-center shadow-2xl">
                    <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                        Ready to Find Your Perfect Career?
                    </h2>
                    <p className="text-xl text-gray-700 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
                        Join thousands of professionals who have discovered their ideal career path with CareerBridge AI.
                    </p>
                    <Link
                        to={isAuthenticated ? '/dashboard' : '/assessment'}
                        className="inline-flex items-center space-x-2 px-10 py-5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-bold text-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-200 shadow-2xl hover:shadow-purple-500/50"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>{isAuthenticated ? 'Continue Your Journey' : 'Get Started Free'}</span>
                    </Link>
                </div>
            </div>

            {/* Footer */}
            <footer className="relative z-10 border-t border-gray-300 dark:border-gray-800 mt-20">

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-sm text-gray-800 dark:text-gray-100 text-left">
                    {app.footer_html ? (
                        <div className="app-footer" dangerouslySetInnerHTML={{ __html: app.footer_html }} />
                    ) : (
                        <div>© 2025 CareerBridge AI</div>
                    )}
                </div>
            </footer>
        </div>
    );
};

export default HomePage;
