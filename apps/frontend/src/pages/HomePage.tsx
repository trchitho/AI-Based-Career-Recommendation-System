import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ThemeToggle from '../components/ThemeToggle';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useAppSettings } from '../contexts/AppSettingsContext';
import { useAuth } from '../contexts/AuthContext';
import AppLogo from '../components/common/AppLogo';

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
        <div className="min-h-screen bg-[#F5EFE7] dark:bg-gray-900 relative overflow-hidden transition-colors duration-300">
            {/* Decorative circles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute w-64 h-64 -top-32 -left-32 bg-[#E8DCC8] dark:bg-gray-800 rounded-full opacity-50"></div>
                <div className="absolute w-96 h-96 top-20 right-10 bg-[#D4C4B0] dark:bg-gray-800 rounded-full opacity-30"></div>
                <div className="absolute w-48 h-48 bottom-20 left-1/4 bg-[#E8DCC8] dark:bg-gray-800 rounded-full opacity-40"></div>
            </div>

            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-[999999] bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center space-x-8">
                            <AppLogo size="sm" showText={true} linkTo="/home" />
                            {isAuthenticated && (
                                <div className="hidden md:flex space-x-1">
                                    <Link to="/assessment" className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200">Assessment</Link>
                                    <Link to="/blog" className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200">Blog</Link>
                                    <Link to="/careers" className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200">Careers</Link>
                                    <Link to="/profile" className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200">Profile</Link>
                                    <Link to="/pricing" className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200">Pricing</Link>
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
                                            className="px-4 py-2 bg-[#4A7C59]/20 dark:bg-green-600/20 text-[#4A7C59] dark:text-green-400 border border-[#4A7C59]/50 dark:border-green-600/50 rounded-lg hover:bg-[#4A7C59]/30 dark:hover:bg-green-600/30 transition-colors text-sm font-medium"
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
                                        className="px-6 py-2 bg-[#4A7C59] dark:bg-green-600 text-white rounded-lg font-medium hover:bg-[#3d6449] dark:hover:bg-green-700 transition-all duration-200 shadow-lg"
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
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
                <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
                    <div>
                        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
                            Discover <span className="text-[#4A7C59] dark:text-green-500">who you</span><br />
                            <span className="text-[#4A7C59] dark:text-green-500">truly are</span> with the<br />
                            Personality test
                        </h1>
                        <p className="text-lg text-gray-700 dark:text-gray-300 mb-8">
                            With this test, you will find out your exact personality type.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link
                                to={isAuthenticated ? '/dashboard' : '/assessment'}
                                className="px-8 py-3 bg-[#4A7C59] dark:bg-green-600 text-white rounded-lg font-medium hover:bg-[#3d6449] dark:hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span>Male</span>
                            </Link>
                            <Link
                                to={isAuthenticated ? '/dashboard' : '/assessment'}
                                className="px-8 py-3 bg-[#D4A5A5] dark:bg-pink-400 text-white rounded-lg font-medium hover:bg-[#c89595] dark:hover:bg-pink-500 transition-colors flex items-center justify-center space-x-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span>Female</span>
                            </Link>
                        </div>
                    </div>
                    <div className="relative">
                        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center space-x-3">
                                    <div className="w-12 h-12 bg-[#4A7C59] dark:bg-green-600 rounded-full flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">Total score</div>
                                        <div className="text-2xl font-bold text-gray-900 dark:text-white">449,995</div>
                                    </div>
                                </div>
                                <div className="flex space-x-2">
                                    <div className="w-3 h-3 bg-[#4A7C59] dark:bg-green-600 rounded-full"></div>
                                    <div className="w-3 h-3 bg-[#D4A5A5] dark:bg-pink-400 rounded-full"></div>
                                    <div className="w-3 h-3 bg-[#7B9EA8] dark:bg-blue-400 rounded-full"></div>
                                    <div className="w-3 h-3 bg-[#E8B86D] dark:bg-yellow-400 rounded-full"></div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Openness</span>
                                    <div className="flex-1 mx-4 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-[#4A7C59] dark:bg-green-600 rounded-full" style={{width: '75%'}}></div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Conscientiousness</span>
                                    <div className="flex-1 mx-4 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-[#D4A5A5] dark:bg-pink-400 rounded-full" style={{width: '60%'}}></div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Extraversion</span>
                                    <div className="flex-1 mx-4 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-[#7B9EA8] dark:bg-blue-400 rounded-full" style={{width: '85%'}}></div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Agreeableness</span>
                                    <div className="flex-1 mx-4 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-[#E8B86D] dark:bg-yellow-400 rounded-full" style={{width: '70%'}}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Features Grid */}
                <div className="grid md:grid-cols-3 gap-8 mt-20">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                        <div className="w-14 h-14 bg-[#4A7C59] dark:bg-green-600 rounded-xl flex items-center justify-center mb-6">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Personality Report</h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            A highly individualized report with your exact personality type, strengths and weaknesses.
                        </p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                        <div className="w-14 h-14 bg-[#4A7C59] dark:bg-green-600 rounded-xl flex items-center justify-center mb-6">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Daily Challenges</h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            Exclusive features to help you grow and develop your personality every day.
                        </p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                        <div className="w-14 h-14 bg-[#4A7C59] dark:bg-green-600 rounded-xl flex items-center justify-center mb-6">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Certificates</h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            Upon completion of the test, you will receive a certificate to share on LinkedIn.
                        </p>
                    </div>
                </div>

                {/* How It Works Section */}
                <div className="mt-32">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">How It Works</h2>
                        <p className="text-lg text-gray-600 dark:text-gray-400">Three simple steps to discover your personality</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="relative flex">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center shadow-lg flex-1 flex flex-col">
                                <div className="w-16 h-16 bg-[#4A7C59] dark:bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <span className="text-2xl font-bold text-white">1</span>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Prepare yourself</h3>
                                <p className="text-gray-600 dark:text-gray-400 flex-grow">
                                    Complete our comprehensive assessment covering personality traits and career interests.
                                </p>
                            </div>
                            <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                                <svg className="w-8 h-8 text-[#4A7C59] dark:text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </div>
                        </div>

                        <div className="relative flex">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center shadow-lg flex-1 flex flex-col">
                                <div className="w-16 h-16 bg-[#4A7C59] dark:bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <span className="text-2xl font-bold text-white">2</span>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Complete the test</h3>
                                <p className="text-gray-600 dark:text-gray-400 flex-grow">
                                    Receive insights matched to your unique personality and interests.
                                </p>
                            </div>
                            <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                                <svg className="w-8 h-8 text-[#4A7C59] dark:text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </div>
                        </div>

                        <div className="flex">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center shadow-lg flex-1 flex flex-col">
                                <div className="w-16 h-16 bg-[#4A7C59] dark:bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <span className="text-2xl font-bold text-white">3</span>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Retrieve your insights</h3>
                                <p className="text-gray-600 dark:text-gray-400 flex-grow">
                                    Access your personalized report and start your journey of self-discovery.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Statistics Section */}
                <div className="mt-32">
                    <div className="grid md:grid-cols-4 gap-8">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center shadow-lg">
                            <div className="text-4xl font-bold text-[#4A7C59] dark:text-green-500 mb-2">500K+</div>
                            <div className="text-gray-600 dark:text-gray-400">Tests Completed</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center shadow-lg">
                            <div className="text-4xl font-bold text-[#4A7C59] dark:text-green-500 mb-2">98%</div>
                            <div className="text-gray-600 dark:text-gray-400">Satisfaction Rate</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center shadow-lg">
                            <div className="text-4xl font-bold text-[#4A7C59] dark:text-green-500 mb-2">150+</div>
                            <div className="text-gray-600 dark:text-gray-400">Career Paths</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center shadow-lg">
                            <div className="text-4xl font-bold text-[#4A7C59] dark:text-green-500 mb-2">24/7</div>
                            <div className="text-gray-600 dark:text-gray-400">AI Support</div>
                        </div>
                    </div>
                </div>

                {/* Testimonials Section */}
                <div className="mt-32">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">What Our Users Say</h2>
                        <p className="text-lg text-gray-600 dark:text-gray-400">Real stories from people who found their path</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg">
                            <div className="flex items-center mb-4">
                                {[...Array(5)].map((_, i) => (
                                    <svg key={i} className="w-5 h-5 text-[#E8B86D] dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                ))}
                            </div>
                            <p className="text-gray-700 dark:text-gray-300 mb-6">
                                "This test helped me understand my strengths and find a career path that truly fits my personality. Highly recommended!"
                            </p>
                            <div className="flex items-center">
                                <div className="w-12 h-12 bg-[#4A7C59] dark:bg-green-600 rounded-full flex items-center justify-center text-white font-bold">
                                    SN
                                </div>
                                <div className="ml-4">
                                    <div className="font-semibold text-gray-900 dark:text-white">Sarah Nguyen</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">Software Engineer</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg">
                            <div className="flex items-center mb-4">
                                {[...Array(5)].map((_, i) => (
                                    <svg key={i} className="w-5 h-5 text-[#E8B86D] dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                ))}
                            </div>
                            <p className="text-gray-700 dark:text-gray-300 mb-6">
                                "The insights were incredibly accurate. I finally understand why certain careers appeal to me more than others."
                            </p>
                            <div className="flex items-center">
                                <div className="w-12 h-12 bg-[#D4A5A5] dark:bg-pink-400 rounded-full flex items-center justify-center text-white font-bold">
                                    MC
                                </div>
                                <div className="ml-4">
                                    <div className="font-semibold text-gray-900 dark:text-white">Michael Chen</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">Marketing Manager</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg">
                            <div className="flex items-center mb-4">
                                {[...Array(5)].map((_, i) => (
                                    <svg key={i} className="w-5 h-5 text-[#E8B86D] dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                ))}
                            </div>
                            <p className="text-gray-700 dark:text-gray-300 mb-6">
                                "A game-changer for my career planning. The personalized roadmap gave me clear direction and actionable steps."
                            </p>
                            <div className="flex items-center">
                                <div className="w-12 h-12 bg-[#7B9EA8] dark:bg-blue-400 rounded-full flex items-center justify-center text-white font-bold">
                                    EP
                                </div>
                                <div className="ml-4">
                                    <div className="font-semibold text-gray-900 dark:text-white">Emily Patel</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">UX Designer</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CTA Section */}
                <div className="mt-32 bg-gradient-to-br from-[#4A7C59] to-[#3d6449] dark:from-green-600 dark:to-green-700 rounded-3xl p-12 text-center shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute w-64 h-64 -top-32 -left-32 bg-white rounded-full"></div>
                        <div className="absolute w-96 h-96 top-20 right-10 bg-white rounded-full"></div>
                    </div>
                    <div className="relative z-10">
                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                            Ready to Discover Your Personality?
                        </h2>
                        <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
                            Join thousands who have discovered their true personality type and found their perfect career path.
                        </p>
                        <Link
                            to={isAuthenticated ? '/dashboard' : '/assessment'}
                            className="inline-flex items-center space-x-2 px-10 py-4 bg-white text-[#4A7C59] dark:text-green-600 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all duration-200 shadow-lg"
                        >
                            <span>{isAuthenticated ? 'Continue Your Journey' : 'Start Personality Test'}</span>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </Link>
                    </div>
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
