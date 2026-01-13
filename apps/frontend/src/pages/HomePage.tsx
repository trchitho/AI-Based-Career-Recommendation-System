import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ThemeToggle from '../components/ThemeToggle';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

// --- TYPES ---
interface PublicStats {
    totalAssessments: number;
    totalCareerPaths: number;
    totalCareerInfo: number;
    satisfactionRate: number;
}

// --- SUB-COMPONENTS & HOOKS ---

// Hook để chạy số nhảy (Counter Animation)
const useCounter = (end: number, duration: number = 2000) => {
    const [count, setCount] = useState(0);
    const countRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry && entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );
        if (countRef.current) observer.observe(countRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!isVisible) return;
        let start = 0;
        const increment = end / (duration / 16);
        const timer = setInterval(() => {
            start += increment;
            if (start >= end) {
                setCount(end);
                clearInterval(timer);
            } else {
                setCount(Math.floor(start));
            }
        }, 16);
        return () => clearInterval(timer);
    }, [end, duration, isVisible]);

    return { count, countRef };
};

const CounterItem = ({ value, label, suffix = '' }: { value: string, label: string, suffix?: string }) => {
    // Tách số và chữ (ví dụ: '1M+' -> 1000000 và '+')
    // Để đơn giản demo, ta giả định value là số hoặc số kèm k/M
    const parseValue = (val: string) => {
        if (val.includes('k')) return { num: parseFloat(val) * 1000, suf: 'k+' };
        if (val.includes('M')) return { num: parseFloat(val) * 1000000, suf: 'M+' };
        if (val.includes('%')) return { num: parseFloat(val), suf: '%' };
        if (val.includes('<')) return { num: 2, suf: 'min' }; // Hardcode cho case < 2min
        return { num: parseFloat(val), suf: suffix };
    };

    const { num, suf } = parseValue(value);
    // Nếu không parse được số (ví dụ '24/7'), hiển thị text gốc
    if (isNaN(num)) return (
        <div className="text-white">
            <div className="text-4xl md:text-5xl font-extrabold mb-2 font-mono">{value}</div>
            <div className="text-green-100 font-medium">{label}</div>
        </div>
    );

    const { count, countRef } = useCounter(num);

    return (
        <div ref={countRef} className="text-white group hover:-translate-y-1 transition-transform duration-300">
            <div className="text-4xl md:text-5xl font-extrabold mb-2 font-mono tabular-nums text-transparent bg-clip-text bg-gradient-to-b from-white to-green-100">
                {value.includes('<') ? '< ' : ''}{count.toLocaleString()}{suf}
            </div>
            <div className="text-green-100 font-medium group-hover:text-white transition-colors">{label}</div>
        </div>
    );
};

const AccordionItem = ({ question, answer }: { question: string, answer: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-gray-200 dark:border-gray-800 last:border-0">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center justify-between py-5 text-left text-lg font-semibold text-gray-900 dark:text-white hover:text-green-500 transition-colors group"
            >
                <span className="group-hover:translate-x-1 transition-transform">{question}</span>
                <span className={`transform transition-transform duration-300 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 group-hover:bg-green-100 dark:group-hover:bg-green-900/30 text-gray-500 group-hover:text-green-600 ${isOpen ? 'rotate-180' : ''}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </span>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-40 opacity-100 mb-5' : 'max-h-0 opacity-0'}`}>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed pr-12">{answer}</p>
            </div>
        </div>
    );
};

const HomePage = () => {
    const { t } = useTranslation();
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // --- PUBLIC STATS ---
    const [stats, setStats] = useState<PublicStats | null>(null);

    // --- CONTACT FORM ---
    const [showContactForm, setShowContactForm] = useState(false);
    const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', message: '' });
    const [contactLoading, setContactLoading] = useState(false);
    const [contactResult, setContactResult] = useState<{ success: boolean; message: string } | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('/api/app/stats');
                setStats(response.data);
            } catch (error) {
                console.error('Failed to fetch public stats:', error);
                // Use fallback stats
                setStats({
                    totalAssessments: 150,
                    totalCareerPaths: 50,
                    totalCareerInfo: 20000,
                    satisfactionRate: 98
                });
            }
        };
        fetchStats();
    }, []);

    const handleContactSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setContactLoading(true);
        setContactResult(null);

        // Validate Name
        if (!contactForm.name.trim()) {
            setContactResult({ success: false, message: 'Please enter your name.' });
            setContactLoading(false);
            return;
        }
        if (contactForm.name.trim().length < 2) {
            setContactResult({ success: false, message: 'Name must be at least 2 characters long.' });
            setContactLoading(false);
            return;
        }
        if (contactForm.name.trim().length > 100) {
            setContactResult({ success: false, message: 'Name must be less than 100 characters.' });
            setContactLoading(false);
            return;
        }

        // Validate Email
        if (!contactForm.email.trim()) {
            setContactResult({ success: false, message: 'Please enter your email address.' });
            setContactLoading(false);
            return;
        }
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(contactForm.email.trim())) {
            setContactResult({ success: false, message: 'Please enter a valid email address (e.g., example@domain.com).' });
            setContactLoading(false);
            return;
        }
        if (contactForm.email.trim().length > 254) {
            setContactResult({ success: false, message: 'Email address is too long.' });
            setContactLoading(false);
            return;
        }
        // Check for common typos in email domains
        const emailDomain = contactForm.email.split('@')[1]?.toLowerCase();
        const commonTypos: Record<string, string> = {
            'gmial.com': 'gmail.com',
            'gmal.com': 'gmail.com',
            'gamil.com': 'gmail.com',
            'gmail.con': 'gmail.com',
            'gmail.co': 'gmail.com',
            'hotmal.com': 'hotmail.com',
            'hotmai.com': 'hotmail.com',
            'yaho.com': 'yahoo.com',
            'yahooo.com': 'yahoo.com',
        };
        if (emailDomain && commonTypos[emailDomain]) {
            setContactResult({ success: false, message: `Did you mean ${contactForm.email.split('@')[0]}@${commonTypos[emailDomain]}?` });
            setContactLoading(false);
            return;
        }

        // Validate Phone (optional but if provided, must be valid)
        if (contactForm.phone.trim()) {
            // Remove all non-digit characters for validation
            const phoneDigits = contactForm.phone.replace(/\D/g, '');

            if (phoneDigits.length < 9) {
                setContactResult({ success: false, message: 'Phone number must have at least 9 digits.' });
                setContactLoading(false);
                return;
            }
            if (phoneDigits.length > 15) {
                setContactResult({ success: false, message: 'Phone number is too long (max 15 digits).' });
                setContactLoading(false);
                return;
            }
            // Check for valid phone format (allows +, spaces, dashes, parentheses)
            const phoneRegex = /^[\d\s\-+()]+$/;
            if (!phoneRegex.test(contactForm.phone)) {
                setContactResult({ success: false, message: 'Phone number contains invalid characters. Use only digits, +, -, (), or spaces.' });
                setContactLoading(false);
                return;
            }
            // Vietnam phone validation (if starts with 0 or +84)
            if (phoneDigits.startsWith('84') || phoneDigits.startsWith('0')) {
                const vnPhone = phoneDigits.startsWith('84') ? phoneDigits.slice(2) : phoneDigits.slice(1);
                if (vnPhone.length !== 9) {
                    setContactResult({ success: false, message: 'Vietnamese phone number must have 10 digits (e.g., 0901234567).' });
                    setContactLoading(false);
                    return;
                }
            }
        }

        // Validate Message
        if (!contactForm.message.trim()) {
            setContactResult({ success: false, message: 'Please enter your message.' });
            setContactLoading(false);
            return;
        }
        if (contactForm.message.trim().length < 10) {
            setContactResult({ success: false, message: 'Message must be at least 10 characters long.' });
            setContactLoading(false);
            return;
        }
        if (contactForm.message.trim().length > 2000) {
            setContactResult({ success: false, message: 'Message is too long (max 2000 characters).' });
            setContactLoading(false);
            return;
        }

        try {
            const response = await api.post('/api/app/contact', contactForm);
            setContactResult(response.data);
            if (response.data.success) {
                setContactForm({ name: '', email: '', phone: '', message: '' });
                setTimeout(() => {
                    setShowContactForm(false);
                    setContactResult(null);
                }, 3000);
            }
        } catch (error: unknown) {
            // Handle different error types
            let errorMessage = 'Failed to send message. Please try again.';

            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as { response?: { status?: number; data?: { message?: string; detail?: string } } };
                const status = axiosError.response?.status;
                const data = axiosError.response?.data;

                if (status === 400) {
                    errorMessage = data?.message || data?.detail || 'Invalid form data. Please check your inputs.';
                } else if (status === 422) {
                    errorMessage = 'Invalid email format. Please enter a valid email address.';
                } else if (status === 429) {
                    errorMessage = 'Too many requests. Please wait a moment and try again.';
                } else if (status === 500) {
                    errorMessage = 'Server error. Please try again later or email us directly at careersystemai@gmail.com';
                } else if (status === 503) {
                    errorMessage = 'Service temporarily unavailable. Please try again later.';
                } else if (status === 404) {
                    errorMessage = 'Service not available. Please email us directly at careersystemai@gmail.com';
                }
            } else if (error instanceof Error) {
                if (error.message.includes('Network Error') || error.message.includes('ERR_NETWORK')) {
                    errorMessage = 'Network error. Please check your internet connection and try again.';
                } else if (error.message.includes('timeout')) {
                    errorMessage = 'Request timed out. Please try again.';
                }
            }

            setContactResult({ success: false, message: errorMessage });
        } finally {
            setContactLoading(false);
        }
    };

    // --- LOGIC ---
    const isAuthenticated = Boolean(user);
    const isAdmin = user?.role === 'admin';
    const displayName = user?.email?.split('@')[0] || 'User';

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = isAuthenticated
        ? ['Dashboard', 'Assessment', 'Blog', 'Careers', 'Pricing']
        : ['Assessment', 'Blog', 'Careers', 'Pricing'];

    // --- DATA ---
    const testimonials = [
        { name: 'Sarah Nguyen', role: 'Software Engineer', text: "The insights were incredibly accurate. I finally understand why certain careers appeal to me.", initial: 'S', color: 'bg-indigo-500' },
        { name: 'Michael Chen', role: 'Product Manager', text: "A game-changer for my career planning. The roadmap gave me clear direction.", initial: 'M', color: 'bg-emerald-500' },
        { name: 'Emily Patel', role: 'UX Designer', text: "Highly recommended for anyone feeling stuck in their current role.", initial: 'E', color: 'bg-purple-500' },
        { name: 'David Kim', role: 'Data Scientist', text: "The AI analysis is spot on. It helped me pivot my career successfully.", initial: 'D', color: 'bg-blue-500' },
        { name: 'Lisa Wang', role: 'Marketing Lead', text: "Simple, intuitive, and effective. Best career tool I've used.", initial: 'L', color: 'bg-pink-500' },
    ];
    const row1 = [...testimonials, ...testimonials];
    const row2 = [...testimonials].reverse().concat([...testimonials].reverse());

    const faqs = [
        { q: "Is CareerBridge suitable for beginners?", a: "Absolutely! Whether you're a fresh graduate or an experienced professional looking to pivot, our AI adapts to your level." },
        { q: "How does the AI analysis work?", a: "We analyze your personality traits, interests, and skills against thousands of career paths and market trends to find your perfect match." },
        { q: "What assessments are included?", a: "Our platform includes RIASEC (Holland Codes) and Big Five personality assessments, providing comprehensive career insights." },
        { q: "Is my data secure?", a: "Security is our priority. Your personal data is encrypted and never shared with third parties without consent." },
    ];

    const ModernLogo = () => (
        <Link to="/home" className="flex items-center gap-2 group">
            <span className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white group-hover:opacity-80 transition-opacity">
                career<span className="text-green-500">bridge</span><span className="text-green-500 text-3xl leading-none">.</span>
            </span>
        </Link>
    );

    return (
        <div className="min-h-screen bg-white dark:bg-gray-900 font-['Plus_Jakarta_Sans'] text-gray-900 dark:text-white selection:bg-green-100 selection:text-green-900 overflow-x-hidden">

            {/* --- CSS INJECTION --- */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
                
                /* Animations */
                @keyframes scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
                @keyframes scroll-reverse { 0% { transform: translateX(-50%); } 100% { transform: translateX(0); } }
                @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
                @keyframes blob { 
                    0% { transform: translate(0px, 0px) scale(1); } 
                    33% { transform: translate(30px, -50px) scale(1.1); } 
                    66% { transform: translate(-20px, 20px) scale(0.9); } 
                    100% { transform: translate(0px, 0px) scale(1); } 
                }
                @keyframes shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }

                .animate-scroll { animation: scroll 40s linear infinite; }
                .animate-scroll-reverse { animation: scroll-reverse 40s linear infinite; }
                .animate-fade-in-up { animation: fade-in-up 0.8s ease-out forwards; opacity: 0; }
                .animate-blob { animation: blob 7s infinite; }
                .animation-delay-2000 { animation-delay: 2s; }
                .animation-delay-4000 { animation-delay: 4s; }
                
                .animate-shimmer {
                    background: linear-gradient(90deg, rgba(34,197,94,0) 0%, rgba(34,197,94,0.1) 50%, rgba(34,197,94,0) 100%);
                    background-size: 200% 100%;
                    animation: shimmer 3s infinite linear;
                }

                .text-shimmer {
                    background: linear-gradient(to right, #166534 20%, #4ade80 40%, #4ade80 60%, #166534 80%);
                    background-size: 200% auto;
                    color: transparent;
                    -webkit-background-clip: text;
                    background-clip: text;
                    animation: shimmer 5s linear infinite;
                }
                .dark .text-shimmer {
                    background: linear-gradient(to right, #4ade80 20%, #ffffff 40%, #ffffff 60%, #4ade80 80%);
                    background-size: 200% auto;
                    color: transparent;
                    -webkit-background-clip: text;
                    background-clip: text;
                }

                .group:hover .animate-scroll, .group:hover .animate-scroll-reverse { animation-play-state: paused; }

                /* Patterns & Glass */
                .bg-grid-pattern {
                    background-image: 
                        linear-gradient(to right, rgba(34, 197, 94, 0.05) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(34, 197, 94, 0.05) 1px, transparent 1px);
                    background-size: 40px 40px;
                    mask-image: radial-gradient(circle at center, black 40%, transparent 100%);
                }
                .glass-card {
                    background: rgba(255, 255, 255, 0.6);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.5);
                    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.05);
                }
                .dark .glass-card {
                    background: rgba(17, 24, 39, 0.6);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
                }
                
                /* Custom UI shapes for Bento Grid */
                .skeleton-line {
                    height: 8px;
                    border-radius: 4px;
                    background: #e5e7eb;
                }
                .dark .skeleton-line { background: #374151; }
            `}</style>

            {/* --- HEADER --- */}
            <header className="sticky top-0 z-50 w-full bg-white/70 dark:bg-gray-900/70 backdrop-blur-lg border-b border-gray-100 dark:border-gray-800 transition-all duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center py-4">
                    <div className="flex-shrink-0">
                        <ModernLogo />
                    </div>

                    <nav className="hidden md:flex items-center gap-8">
                        {navItems.map((item) => (
                            <NavLink
                                key={item}
                                to={`/${item.toLowerCase()}`}
                                className={({ isActive }) => `text-[15px] font-medium transition-all duration-200 relative hover:text-green-600 dark:hover:text-green-400 ${isActive
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-gray-600 dark:text-gray-300'
                                    }`}
                            >
                                {({ isActive }) => (
                                    <>
                                        {item}
                                        {isActive && <span className="absolute -bottom-6 left-0 right-0 h-0.5 bg-green-500 rounded-t-full shadow-[0_-2px_10px_rgba(34,197,94,0.5)]"></span>}
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </nav>

                    <div className="flex items-center gap-5">
                        <div className="hidden lg:flex items-center gap-3 pr-3 border-r border-gray-200 dark:border-gray-700">
                            <LanguageSwitcher />
                            <ThemeToggle />
                        </div>

                        {isAuthenticated ? (
                            <div className="flex items-center gap-3 animate-fade-in-up">
                                {isAdmin && (
                                    <Link to="/admin" className="hidden lg:inline-flex px-3 py-1 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-full dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 hover:scale-105 transition-transform">
                                        Admin
                                    </Link>
                                )}
                                <div className="flex items-center gap-2 cursor-default group">
                                    <div className="w-9 h-9 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 rounded-full flex items-center justify-center text-green-700 dark:text-green-300 font-bold text-sm border-2 border-green-200 dark:border-green-700 group-hover:border-green-400 transition-colors">
                                        {displayName.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="hidden sm:block text-sm font-semibold max-w-[100px] truncate group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">{displayName}</span>
                                </div>
                                <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-full transition-all">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <Link to="/login" className="hidden sm:block text-[15px] font-semibold text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-full transition-all">
                                    {t('auth.signIn')}
                                </Link>
                                <Link to="/assessment" className="relative inline-flex items-center justify-center px-6 py-2.5 overflow-hidden font-bold text-white transition-all duration-300 bg-green-600 rounded-full group hover:bg-green-600 ring-offset-2 focus:ring-2 ring-green-400 ease focus:outline-none">
                                    <span className="absolute right-0 w-8 h-32 -mt-12 transition-all duration-1000 transform translate-x-12 bg-white opacity-10 rotate-12 group-hover:-translate-x-40 ease"></span>
                                    <span className="relative">Get started</span>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main>
                {/* --- HERO SECTION --- */}
                <section className="relative pt-20 pb-32 overflow-hidden bg-white dark:bg-gray-900">
                    {/* Animated Background Blobs */}
                    <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                        <div className="bg-grid-pattern absolute w-full h-full opacity-[0.6]"></div>
                        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 dark:bg-purple-900 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-70 animate-blob"></div>
                        <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 dark:bg-yellow-900 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
                        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-green-300 dark:bg-green-900 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
                    </div>

                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                        <div className="flex flex-col items-center justify-center gap-4 mb-8 animate-fade-in-up">
                            <span className="relative px-4 py-1.5 rounded-full bg-white/50 dark:bg-gray-800/50 border border-green-200 dark:border-green-800 backdrop-blur-sm text-sm font-bold inline-block mb-4 shadow-sm hover:scale-105 transition-transform cursor-default">
                                <span className="text-shimmer">✨ New AI Engine v2.0 Released</span>
                            </span>

                            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-6 leading-[1.1] drop-shadow-sm">
                                Build your future with <br className="hidden md:block" />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 via-emerald-500 to-teal-500 animate-gradient-x">Intelligent Career Pathing</span>
                            </h1>

                            <p className="text-xl text-gray-600 dark:text-gray-400 mb-10 leading-relaxed max-w-2xl mx-auto font-medium">
                                Discover your ideal career path with AI-powered personality assessments, personalized recommendations, and detailed roadmaps.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-5 w-full">
                                <Link to="/assessment" className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-green-600 rounded-full hover:bg-green-700 transition-all shadow-[0_10px_20px_-10px_rgba(22,163,74,0.5)] hover:shadow-[0_20px_20px_-10px_rgba(22,163,74,0.6)] hover:-translate-y-1 relative overflow-hidden group">
                                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1s_infinite]"></span>
                                    Start Assessment
                                    <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                </Link>
                                <Link to="/careers" className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-600 bg-white/80 border border-gray-200 rounded-full hover:bg-white hover:border-gray-300 dark:bg-gray-800/80 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-800 transition-all backdrop-blur-sm shadow-sm hover:shadow-md">
                                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                    Explore Careers
                                </Link>
                            </div>
                        </div>

                        {/* Floating Stats UI Preview */}
                        <div className="relative mt-16 mx-auto max-w-4xl animate-fade-in-up delay-300 group perspective-1000">
                            <div className="absolute -inset-1 bg-gradient-to-r from-green-400 via-blue-500 to-purple-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                            <div className="relative glass-card rounded-2xl p-6 md:p-8 shadow-2xl transform transition-transform duration-500 hover:rotate-x-2">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-gray-800/50">
                                    <div className="flex flex-col items-center justify-center p-2">
                                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 mb-3 shadow-inner"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg></div>
                                        <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">98%</div>
                                        <div className="text-sm font-medium text-gray-500">Success Rate</div>
                                    </div>
                                    <div className="flex flex-col items-center justify-center p-2">
                                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center text-green-600 mb-3 shadow-inner"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg></div>
                                        <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">20K+</div>
                                        <div className="text-sm font-medium text-gray-500">Career Data</div>
                                    </div>
                                    <div className="flex flex-col items-center justify-center p-2">
                                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center text-purple-600 mb-3 shadow-inner"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                                        <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">&lt; 10min</div>
                                        <div className="text-sm font-medium text-gray-500">Assessment Time</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* --- FEATURE CLOUD --- */}
                <div className="border-y border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 py-10 overflow-hidden relative">
                    <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white dark:from-gray-900 to-transparent z-10"></div>
                    <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-white dark:from-gray-900 to-transparent z-10"></div>
                    <div className="flex w-max animate-scroll hover:pause">
                        {[...Array(2)].map((_, i) => (
                            <div key={i} className="flex gap-20 px-12 items-center">
                                {[
                                    'RIASEC Assessment',
                                    'Big Five Analysis',
                                    'AI Career Matching',
                                    'Learning Roadmaps',
                                    '900+ Careers',
                                    'Skill Gap Analysis',
                                    'AI Assistant',
                                    'PDF Reports'
                                ].map((text, idx) => (
                                    <span key={idx} className="text-xl font-bold tracking-wide text-gray-400 hover:text-green-600 dark:text-gray-500 dark:hover:text-green-400 select-none transition-colors duration-300 whitespace-nowrap uppercase">
                                        {text}
                                    </span>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/* --- BENTO GRID FEATURES --- */}
                <section className="py-24 bg-gray-50 dark:bg-gray-800/50 relative overflow-hidden">
                    <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-green-200/20 dark:bg-green-900/20 rounded-full blur-[120px] pointer-events-none"></div>

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight">Everything you need to <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-emerald-700">excel in your career</span></h2>
                            <p className="text-lg text-gray-500 dark:text-gray-400">Our platform combines advanced AI with proven career strategies to give you the competitive edge.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-6 grid-rows-2 gap-6 h-auto md:h-[650px]">
                            {/* Feature 1: Large - Career Assessment */}
                            <div className="md:col-span-4 md:row-span-2 bg-white dark:bg-gray-800 rounded-[2rem] p-8 border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden group hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
                                <div className="absolute top-0 right-0 w-96 h-96 bg-green-500/10 rounded-full blur-[80px] -mr-20 -mt-20 group-hover:bg-green-500/20 transition-colors duration-500"></div>
                                <div className="relative z-10 h-full flex flex-col">
                                    <div className="w-14 h-14 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform duration-300">
                                        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">AI Career Assessment</h3>
                                    <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">Discover your ideal career path with our comprehensive RIASEC & Big Five personality assessments powered by advanced AI analysis.</p>

                                    {/* Abstract UI Representation - Assessment Visual */}
                                    <div className="mt-auto relative w-full h-64 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-inner transform group-hover:scale-[1.02] transition-transform duration-500 flex flex-col gap-4 overflow-hidden">
                                        <div className="flex items-center gap-4 mb-2">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold">R</div>
                                            <div className="flex flex-col gap-2">
                                                <div className="w-32 h-3 bg-green-300 dark:bg-green-600 rounded-full"></div>
                                                <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                                            </div>
                                            <div className="ml-auto w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                                                <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
                                            </div>
                                        </div>
                                        <div className="w-full h-px bg-gray-200 dark:bg-gray-700 my-1"></div>
                                        {/* RIASEC Progress Bars */}
                                        <div className="space-y-2">
                                            {[{ l: 'Realistic', w: '75%', c: 'bg-red-400' }, { l: 'Investigative', w: '85%', c: 'bg-yellow-400' }, { l: 'Artistic', w: '60%', c: 'bg-green-400' }, { l: 'Social', w: '90%', c: 'bg-blue-400' }].map((item, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-500 w-20">{item.l}</span>
                                                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                        <div className={`h-full ${item.c} rounded-full`} style={{ width: item.w }}></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Floating Badge */}
                                        <div className="absolute bottom-6 right-6 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 flex items-center gap-2 animate-bounce">
                                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                            <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Match: 95%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Feature 2: Small - Skills */}
                            <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-[2rem] p-8 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden relative">
                                <div className="absolute -right-10 -top-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all"></div>
                                <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm group-hover:rotate-12 transition-transform">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Skill Gap Analysis</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Identify missing skills for your dream career.</p>
                                {/* Abstract Chart */}
                                <div className="flex items-end justify-between h-24 px-2 pb-2">
                                    {[40, 70, 50, 90, 60].map((h, i) => (
                                        <div key={i} className="w-1/6 bg-gray-100 dark:bg-gray-700 rounded-t-md relative overflow-hidden group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 transition-colors" style={{ height: `${h}%` }}>
                                            <div className="absolute bottom-0 left-0 w-full bg-purple-500 transition-all duration-1000 ease-out" style={{ height: '0%', animation: `grow ${1 + i * 0.2}s forwards` }}></div>
                                        </div>
                                    ))}
                                    <style>{`@keyframes grow { to { height: 100%; } }`}</style>
                                </div>
                            </div>

                            {/* Feature 3: Small - Career Roadmap */}
                            <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-[2rem] p-8 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden relative">
                                <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all"></div>
                                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm group-hover:-rotate-12 transition-transform">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Career Roadmaps</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Personalized learning paths to success.</p>
                                {/* Abstract Roadmap Animation */}
                                <div className="relative w-full h-24 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                                    <div className="flex items-center gap-3">
                                        {[1, 2, 3, 4].map((step) => (
                                            <div key={step} className="flex items-center">
                                                <div className={`w-8 h-8 rounded-full ${step <= 2 ? 'bg-blue-500 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-500'} flex items-center justify-center text-xs font-bold`}>{step}</div>
                                                {step < 4 && <div className={`w-6 h-1 ${step < 2 ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* --- HOW IT WORKS (Timeline) --- */}
                <section className="py-24 bg-white dark:bg-gray-900 relative">
                    <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-gray-50 dark:from-gray-800/50 to-transparent"></div>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="mb-20 text-center">
                            <span className="text-green-500 font-bold tracking-wider uppercase text-sm bg-green-50 dark:bg-green-900/30 px-3 py-1 rounded-full">Workflow</span>
                            <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white mt-4">How CareerBridge works</h2>
                            <p className="text-lg text-gray-500 dark:text-gray-400 mt-4 max-w-2xl mx-auto">Our AI-powered platform guides you through a comprehensive career discovery journey</p>
                        </div>

                        <div className="relative">
                            {/* Line connecting steps */}
                            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-100 dark:bg-gray-800 -translate-x-1/2"></div>

                            {[
                                { title: "Complete Assessment", desc: "Take our comprehensive RIASEC & Big Five personality assessments to discover your work style, interests, and strengths.", icon: "1", align: "left" },
                                { title: "Get AI Analysis", desc: "Our advanced AI engine analyzes your profile against thousands of career paths and market trends to find your perfect match.", icon: "2", align: "right" },
                                { title: "Explore Career Paths", desc: "Browse personalized career recommendations with detailed roadmaps, required skills, and salary insights.", icon: "3", align: "left" },
                                { title: "Build Your Roadmap", desc: "Get a customized learning path with courses, certifications, and milestones to achieve your career goals.", icon: "4", align: "right" }
                            ].map((step, idx) => (
                                <div key={idx} className={`relative flex items-center justify-between mb-16 ${step.align === 'right' ? 'flex-row-reverse' : ''} group`}>
                                    <div className="hidden md:block w-5/12"></div>
                                    <div className="absolute left-0 md:left-1/2 top-0 md:-translate-x-1/2 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold border-4 border-white dark:border-gray-900 z-10 shadow-lg group-hover:scale-110 group-hover:bg-green-400 transition-all duration-300">
                                        {step.icon}
                                    </div>
                                    <div className={`w-full md:w-5/12 pl-16 md:pl-0 ${step.align === 'left' ? 'md:pr-10 md:text-right' : 'md:pl-10'}`}>
                                        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                                            <div className={`absolute top-0 w-1 h-full bg-green-500 ${step.align === 'left' ? 'right-0' : 'left-0'} transform scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-bottom`}></div>
                                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{step.title}</h3>
                                            <p className="text-gray-500 dark:text-gray-400">{step.desc}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* --- STATISTICS (Animated Counter) --- */}
                <section className="py-20 bg-green-600 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    <div className="absolute -top-40 -right-40 w-96 h-96 bg-white opacity-10 rounded-full blur-[100px]"></div>
                    <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white opacity-10 rounded-full blur-[100px]"></div>

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                            <CounterItem
                                value={`${stats?.totalAssessments ?? 0}+`}
                                label="Assessments Completed"
                            />
                            <CounterItem
                                value={`${stats?.totalCareerPaths ?? 0}+`}
                                label="Career Paths Created"
                            />
                            <CounterItem
                                value={`${Math.round((stats?.totalCareerInfo ?? 20000) / 1000)}K+`}
                                label="Career Data Points"
                            />
                        </div>
                    </div>
                </section>

                {/* --- TESTIMONIALS --- */}
                <section className="py-24 bg-white dark:bg-gray-900 overflow-hidden">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 text-center">
                        <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-4">Loved by professionals</h2>
                    </div>

                    <div className="relative group hover:cursor-grab active:cursor-grabbing">
                        {/* Gradient Masks */}
                        <div className="absolute top-0 left-0 h-full w-24 bg-gradient-to-r from-white dark:from-gray-900 to-transparent z-10 pointer-events-none"></div>
                        <div className="absolute top-0 right-0 h-full w-24 bg-gradient-to-l from-white dark:from-gray-900 to-transparent z-10 pointer-events-none"></div>

                        <div className="flex w-max animate-scroll gap-6 mb-6">
                            {row1.map((item, idx) => (
                                <div key={`r1-${idx}`} className="w-[380px] bg-gray-50 dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700 flex-shrink-0 hover:bg-white dark:hover:bg-gray-700 hover:shadow-lg transition-all duration-300">
                                    <div className="flex items-center mb-4">
                                        <div className={`w-10 h-10 ${item.color} rounded-full flex items-center justify-center text-white font-bold shadow-md`}>{item.initial}</div>
                                        <div className="ml-3">
                                            <div className="font-bold text-gray-900 dark:text-white">{item.name}</div>
                                            <div className="text-xs text-gray-500">{item.role}</div>
                                        </div>
                                        <div className="ml-auto flex gap-0.5 text-yellow-400 text-xs">
                                            {[...Array(5)].map((_, i) => <span key={i}>★</span>)}
                                        </div>
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-300 italic text-sm leading-relaxed">"{item.text}"</p>
                                </div>
                            ))}
                        </div>
                        <div className="flex w-max animate-scroll-reverse gap-6">
                            {row2.map((item, idx) => (
                                <div key={`r2-${idx}`} className="w-[380px] bg-gray-50 dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700 flex-shrink-0 hover:bg-white dark:hover:bg-gray-700 hover:shadow-lg transition-all duration-300">
                                    <div className="flex items-center mb-4">
                                        <div className={`w-10 h-10 ${item.color} rounded-full flex items-center justify-center text-white font-bold shadow-md`}>{item.initial}</div>
                                        <div className="ml-3">
                                            <div className="font-bold text-gray-900 dark:text-white">{item.name}</div>
                                            <div className="text-xs text-gray-500">{item.role}</div>
                                        </div>
                                        <div className="ml-auto flex gap-0.5 text-yellow-400 text-xs">
                                            {[...Array(5)].map((_, i) => <span key={i}>★</span>)}
                                        </div>
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-300 italic text-sm leading-relaxed">"{item.text}"</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* --- FAQ SECTION --- */}
                <section className="py-24 bg-gray-50 dark:bg-gray-800/50">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4">Frequently Asked Questions</h2>
                            <p className="text-gray-500 dark:text-gray-400">Everything you need to know about CareerBridge.</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                            <div className="space-y-2">
                                {faqs.map((faq, idx) => (
                                    <AccordionItem key={idx} question={faq.q} answer={faq.a} />
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* --- PRE-FOOTER CTA & CONTACT --- */}
                <section className="py-24 relative overflow-hidden">
                    <div className="absolute inset-0 bg-white dark:bg-gray-900"></div>
                    <div className="max-w-5xl mx-auto px-4 relative z-10">
                        {/* CTA Card */}
                        <div className="bg-gradient-to-br from-green-600 to-teal-800 rounded-[2.5rem] p-12 md:p-20 shadow-2xl relative overflow-hidden group mb-16">
                            {/* Decorative circles */}
                            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>
                            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-black opacity-20 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>

                            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 relative z-10 text-center">Ready to launch your career?</h2>
                            <p className="text-green-100 text-lg mb-10 max-w-2xl mx-auto relative z-10 text-center">Join thousands of professionals who have found their dream jobs using CareerBridge AI.</p>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
                                <Link to="/assessment" className="px-8 py-4 bg-white text-green-700 rounded-full font-bold hover:bg-gray-100 hover:scale-105 transition-all shadow-lg text-center">
                                    Get Started for Free
                                </Link>
                            </div>
                        </div>

                        {/* Contact Developer Section */}
                        <div className="bg-white dark:bg-gray-800 rounded-[2rem] p-8 md:p-12 shadow-xl border border-gray-100 dark:border-gray-700">
                            <div className="text-center mb-8">
                                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">Contact Developer</h3>
                                <p className="text-gray-600 dark:text-gray-400">Have questions or feedback? We'd love to hear from you!</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Contact Info */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                                            <a href="mailto:careersystemai@gmail.com" className="text-gray-900 dark:text-white font-semibold hover:text-green-600 transition-colors">
                                                careersystemai@gmail.com
                                            </a>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Response Time</p>
                                            <p className="text-gray-900 dark:text-white font-semibold">Within 24 hours</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-600">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Support</p>
                                            <p className="text-gray-900 dark:text-white font-semibold">Technical & Career Guidance</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Contact Form */}
                                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-6 border border-green-100 dark:border-green-800">
                                    {!showContactForm ? (
                                        <div className="flex flex-col justify-center items-center h-full">
                                            <div className="text-6xl mb-4">💬</div>
                                            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Send us a message</h4>
                                            <p className="text-gray-600 dark:text-gray-400 text-center mb-6">Click below to send us a message directly.</p>
                                            <button
                                                onClick={() => setShowContactForm(true)}
                                                className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                </svg>
                                                Contact Developer
                                            </button>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleContactSubmit} className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={contactForm.name}
                                                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                                    placeholder="Your name"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                                                <input
                                                    type="email"
                                                    required
                                                    value={contactForm.email}
                                                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                                    placeholder="your@email.com"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone (optional)</label>
                                                <input
                                                    type="tel"
                                                    value={contactForm.phone}
                                                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                                    placeholder="Your phone number"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
                                                <textarea
                                                    required
                                                    rows={3}
                                                    value={contactForm.message}
                                                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                                                    placeholder="Your message..."
                                                />
                                            </div>

                                            {contactResult && (
                                                <div className={`p-3 rounded-lg text-sm ${contactResult.success ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                    {contactResult.message}
                                                </div>
                                            )}

                                            <div className="flex gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowContactForm(false);
                                                        setContactResult(null);
                                                    }}
                                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={contactLoading}
                                                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                >
                                                    {contactLoading ? (
                                                        <>
                                                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                            Sending...
                                                        </>
                                                    ) : 'Send Message'}
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* --- FOOTER --- */}
                <footer className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 pt-16 pb-8">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
                            <div className="col-span-2 lg:col-span-2">
                                <ModernLogo />
                                <p className="mt-4 text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-xs">
                                    CareerBridge AI helps you build professional resumes, analyze your skills, and find your perfect career path using advanced artificial intelligence.
                                </p>
                            </div>

                            {/* (Giữ nguyên các cột link footer...) */}
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-white mb-4">Product</h4>
                                <ul className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
                                    <li><Link to="/features" className="hover:text-green-500 transition-colors">Features</Link></li>
                                    <li><Link to="/pricing" className="hover:text-green-500 transition-colors">Pricing</Link></li>
                                    <li><Link to="/assessment" className="hover:text-green-500 transition-colors">Assessment</Link></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-white mb-4">Resources</h4>
                                <ul className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
                                    <li><Link to="/blog" className="hover:text-green-500 transition-colors">Blog</Link></li>
                                    <li><Link to="/guide" className="hover:text-green-500 transition-colors">Career Guide</Link></li>
                                    <li><Link to="/help" className="hover:text-green-500 transition-colors">Help Center</Link></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-white mb-4">Legal</h4>
                                <ul className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
                                    <li><Link to="/privacy" className="hover:text-green-500 transition-colors">Privacy</Link></li>
                                    <li><Link to="/terms" className="hover:text-green-500 transition-colors">Terms</Link></li>
                                </ul>
                            </div>
                        </div>

                        <div className="border-t border-gray-100 dark:border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                            <p className="text-sm text-gray-400">© 2025 CareerBridge AI. All rights reserved.</p>
                            <div className="flex gap-6">
                                {['Twitter', 'GitHub', 'LinkedIn', 'Discord'].map((social) => (
                                    <a key={social} href="#" className="text-gray-400 hover:text-green-500 hover:scale-110 transition-all text-sm font-medium">
                                        {social}
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    );
};

export default HomePage;