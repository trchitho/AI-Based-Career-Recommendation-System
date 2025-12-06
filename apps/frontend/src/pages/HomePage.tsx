import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ThemeToggle from '../components/ThemeToggle';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useAuth } from '../contexts/AuthContext';

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
        { q: "How does the AI analysis work?", a: "We analyze thousands of job descriptions and market trends against your profile to find the perfect match." },
        { q: "Can I download my resume in PDF?", a: "Yes, you can export your resume and cover letter in PDF, Word, and TXT formats." },
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
                                Analyze your skills, generate ATS-friendly resumes, and discover career paths tailored just for you.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-5 w-full">
                                <Link to="/assessment" className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-green-600 rounded-full hover:bg-green-700 transition-all shadow-[0_10px_20px_-10px_rgba(22,163,74,0.5)] hover:shadow-[0_20px_20px_-10px_rgba(22,163,74,0.6)] hover:-translate-y-1 relative overflow-hidden group">
                                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1s_infinite]"></span>
                                    Start Assessment
                                    <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                </Link>
                                <Link to="/about" className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-600 bg-white/80 border border-gray-200 rounded-full hover:bg-white hover:border-gray-300 dark:bg-gray-800/80 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-800 transition-all backdrop-blur-sm shadow-sm hover:shadow-md">
                                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Watch Demo
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
                                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center text-green-600 mb-3 shadow-inner"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                                        <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">10k+</div>
                                        <div className="text-sm font-medium text-gray-500">Resumes Built</div>
                                    </div>
                                    <div className="flex flex-col items-center justify-center p-2">
                                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center text-purple-600 mb-3 shadow-inner"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div>
                                        <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">&lt; 2min</div>
                                        <div className="text-sm font-medium text-gray-500">Generation Time</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* --- LOGO CLOUD --- */}
                <div className="border-y border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 py-10 overflow-hidden relative">
                    <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white dark:from-gray-900 to-transparent z-10"></div>
                    <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-white dark:from-gray-900 to-transparent z-10"></div>
                    <div className="flex w-max animate-scroll hover:pause">
                        {[...Array(2)].map((_, i) => (
                            <div key={i} className="flex gap-24 px-12 items-center grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-500 cursor-pointer">
                                {['Microsoft', 'Google', 'Spotify', 'Amazon', 'Airbnb', 'Uber', 'Slack', 'Netflix'].map((brand, idx) => (
                                    <span key={idx} className="text-xl font-bold text-gray-400 hover:text-gray-900 dark:hover:text-white select-none font-sans tracking-widest">{brand}</span>
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
                            {/* Feature 1: Large - Resume Builder */}
                            <div className="md:col-span-4 md:row-span-2 bg-white dark:bg-gray-800 rounded-[2rem] p-8 border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden group hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
                                <div className="absolute top-0 right-0 w-96 h-96 bg-green-500/10 rounded-full blur-[80px] -mr-20 -mt-20 group-hover:bg-green-500/20 transition-colors duration-500"></div>
                                <div className="relative z-10 h-full flex flex-col">
                                    <div className="w-14 h-14 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform duration-300">
                                        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">AI Resume Builder</h3>
                                    <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">Create professional, ATS-optimized resumes in minutes. Our AI suggests content based on your target role.</p>

                                    {/* Abstract UI Representation - Document Visual */}
                                    <div className="mt-auto relative w-full h-64 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-inner transform group-hover:scale-[1.02] transition-transform duration-500 flex flex-col gap-4 overflow-hidden">
                                        <div className="flex items-center gap-4 mb-2">
                                            <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                                            <div className="flex flex-col gap-2">
                                                <div className="w-32 h-3 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                                                <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                                            </div>
                                            <div className="ml-auto w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                                                <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
                                            </div>
                                        </div>
                                        <div className="w-full h-px bg-gray-200 dark:bg-gray-700 my-1"></div>
                                        <div className="skeleton-line w-3/4"></div>
                                        <div className="skeleton-line w-full"></div>
                                        <div className="skeleton-line w-5/6"></div>
                                        <div className="skeleton-line w-full"></div>

                                        {/* Floating Badge */}
                                        <div className="absolute bottom-6 right-6 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 flex items-center gap-2 animate-bounce">
                                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                            <span className="text-xs font-bold text-gray-700 dark:text-gray-200">ATS Score: 98/100</span>
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
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Identify missing skills.</p>
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

                            {/* Feature 3: Small - Cover Letter */}
                            <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-[2rem] p-8 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden relative">
                                <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all"></div>
                                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm group-hover:-rotate-12 transition-transform">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Smart Cover Letters</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Matching letters instantly.</p>
                                {/* Abstract Envelope Animation */}
                                <div className="relative w-full h-24 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                                    <div className="absolute w-16 h-12 bg-white dark:bg-gray-600 rounded shadow-md transform translate-y-8 group-hover:translate-y-0 transition-transform duration-500 flex flex-col gap-1 p-2">
                                        <div className="w-full h-1 bg-gray-200 dark:bg-gray-500 rounded"></div>
                                        <div className="w-2/3 h-1 bg-gray-200 dark:bg-gray-500 rounded"></div>
                                    </div>
                                    <svg className="w-10 h-10 text-gray-400 dark:text-gray-500 z-10" fill="currentColor" viewBox="0 0 20 20"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>
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
                        </div>

                        <div className="relative">
                            {/* Line connecting steps */}
                            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-100 dark:bg-gray-800 -translate-x-1/2"></div>

                            {[
                                { title: "Complete Assessment", desc: "Take our comprehensive skills & interest assessment.", icon: "1", align: "left" },
                                { title: "Get AI Analysis", desc: "Our engine analyzes your profile against market data.", icon: "2", align: "right" },
                                { title: "Build & Apply", desc: "Generate tailored resumes and start applying with confidence.", icon: "3", align: "left" }
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
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                            {[
                                { num: '1M+', label: 'Users' },
                                { num: '500k+', label: 'Resumes Created' },
                                { num: '95%', label: 'Satisfaction' },
                                { num: '24/7', label: 'AI Availability' }
                            ].map((stat, idx) => (
                                <CounterItem key={idx} value={stat.num} label={stat.label} />
                            ))}
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

                {/* --- PRE-FOOTER CTA --- */}
                <section className="py-24 relative overflow-hidden">
                    <div className="absolute inset-0 bg-white dark:bg-gray-900"></div>
                    <div className="max-w-5xl mx-auto px-4 relative z-10 text-center">
                        <div className="bg-gradient-to-br from-green-600 to-teal-800 rounded-[2.5rem] p-12 md:p-20 shadow-2xl relative overflow-hidden group">
                            {/* Decorative circles */}
                            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>
                            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-black opacity-20 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>

                            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 relative z-10">Ready to launch your career?</h2>
                            <p className="text-green-100 text-lg mb-10 max-w-2xl mx-auto relative z-10">Join thousands of professionals who have found their dream jobs using CareerBridge AI.</p>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
                                <Link to="/assessment" className="px-8 py-4 bg-white text-green-700 rounded-full font-bold hover:bg-gray-100 hover:scale-105 transition-all shadow-lg">
                                    Get Started for Free
                                </Link>
                                <Link to="/contact" className="px-8 py-4 bg-transparent border border-white text-white rounded-full font-bold hover:bg-white/10 hover:border-transparent transition-all">
                                    Contact Sales
                                </Link>
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