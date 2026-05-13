import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
    const num = parseFloat(value);
    const { count, countRef } = useCounter(isNaN(num) ? 0 : num);

    if (isNaN(num)) return (
        <div className="text-white">
            <div className="text-4xl md:text-5xl font-extrabold mb-2 font-mono">{value}</div>
            <div className="text-indigo-100 font-medium">{label}</div>
        </div>
    );

    return (
        <div ref={countRef} className="text-white group hover:-translate-y-1 transition-transform duration-300">
            <div className="text-4xl md:text-5xl font-extrabold mb-2 font-mono tabular-nums text-transparent bg-clip-text bg-gradient-to-b from-white to-indigo-50">
                {count.toLocaleString()}{suffix}
            </div>
            <div className="text-indigo-100 font-medium group-hover:text-white transition-colors">{label}</div>
        </div>
    );
};

const AccordionItem = ({ question, answer }: { question: string, answer: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-gray-200 dark:border-gray-800 last:border-0">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center justify-between py-5 text-left text-lg font-semibold text-gray-900 dark:text-white hover:text-indigo-700 transition-colors group"
            >
                <span className="group-hover:translate-x-1 transition-transform">{question}</span>
                <span className={`transform transition-transform duration-300 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/30 text-gray-500 group-hover:text-indigo-800 ${isOpen ? 'rotate-180' : ''}`}>
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

    const [stats, setStats] = useState<PublicStats | null>(null);
    const [showContactForm, setShowContactForm] = useState(false);
    const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', message: '' });
    const [contactLoading, setContactLoading] = useState(false);
    const [contactResult, setContactResult] = useState<{ success: boolean; message: string } | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('/api/app/stats');
                setStats(response.data);
            } catch {
                setStats({ totalAssessments: 150, totalCareerPaths: 50, totalCareerInfo: 20000, satisfactionRate: 98 });
            }
        };
        fetchStats();
    }, []);

    const handleContactSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setContactLoading(true);
        setContactResult(null);
        if (!contactForm.name.trim() || contactForm.name.trim().length < 2) {
            setContactResult({ success: false, message: 'Please enter your name (at least 2 characters).' });
            setContactLoading(false); return;
        }
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(contactForm.email.trim())) {
            setContactResult({ success: false, message: 'Please enter a valid email address.' });
            setContactLoading(false); return;
        }
        if (!contactForm.message.trim() || contactForm.message.trim().length < 10) {
            setContactResult({ success: false, message: 'Message must be at least 10 characters.' });
            setContactLoading(false); return;
        }
        try {
            const response = await api.post('/api/app/contact', contactForm);
            setContactResult(response.data);
            if (response.data.success) {
                setContactForm({ name: '', email: '', phone: '', message: '' });
                setTimeout(() => { setShowContactForm(false); setContactResult(null); }, 3000);
            }
        } catch {
            setContactResult({ success: false, message: 'Failed to send. Please email careersystemai@gmail.com' });
        } finally {
            setContactLoading(false);
        }
    };

    const testimonials = [
        { name: 'Sarah Nguyen', role: 'Software Engineer', text: "The insights were incredibly accurate. I finally understand why certain careers appeal to me.", initial: 'S', gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)' },
        { name: 'Michael Chen', role: 'Product Manager', text: "A game-changer for my career planning. The roadmap gave me clear direction.", initial: 'M', gradient: 'linear-gradient(135deg, #3b82f6, #06b6d4)' },
        { name: 'Emily Patel', role: 'UX Designer', text: "Highly recommended for anyone feeling stuck in their current role.", initial: 'E', gradient: 'linear-gradient(135deg, #ec4899, #8b5cf6)' },
        { name: 'David Kim', role: 'Data Scientist', text: "The AI analysis is spot on. It helped me pivot my career successfully.", initial: 'D', gradient: 'linear-gradient(135deg, #06b6d4, #22c55e)' },
        { name: 'Lisa Wang', role: 'Marketing Lead', text: "Simple, intuitive, and effective. Best career tool I've used.", initial: 'L', gradient: 'linear-gradient(135deg, #f59e0b, #fb923c)' },
    ];
    const row1 = [...testimonials, ...testimonials];
    const row2 = [...testimonials].reverse().concat([...testimonials].reverse());

    const faqs = [
        { q: t('home.faq.q1'), a: t('home.faq.a1') },
        { q: t('home.faq.q2'), a: t('home.faq.a2') },
        { q: t('home.faq.q3'), a: t('home.faq.a3') },
        { q: t('home.faq.q4'), a: t('home.faq.a4') },
    ];

    return (
        <div className="w-full">

            <style>{`
                @keyframes scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
                @keyframes scroll-reverse { 0% { transform: translateX(-50%); } 100% { transform: translateX(0); } }
                @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
                @keyframes blob {
                    0% { transform: scale(1); }
                    33% { transform: scale(1.15); }
                    66% { transform: scale(0.9); }
                    100% { transform: scale(1); }
                }
                @keyframes shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }

                .animate-scroll { animation: scroll 40s linear infinite; }
                .animate-scroll-reverse { animation: scroll-reverse 40s linear infinite; }
                .animate-fade-in-up { animation: fade-in-up 0.8s ease-out both; }
                .animate-blob { animation: blob 7s ease-in-out infinite; }
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

                .bg-grid-pattern {
                    background-image:
                        linear-gradient(to right, rgba(99, 102, 241, 0.05) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(99, 102, 241, 0.05) 1px, transparent 1px);
                    background-size: 40px 40px;
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
            `}</style>

            <main className="w-full">
                {/* --- HERO SECTION --- */}
                <section className="relative pt-24 pb-20" style={{ background: 'var(--neu-bg)', overflow: 'clip' }}>
                    {/* Background blobs — contained strictly inside section */}
                    <div className="absolute inset-0 pointer-events-none z-0" style={{ overflow: 'hidden' }}>
                        <div className="bg-grid-pattern absolute inset-0 opacity-[0.6]"></div>
                        <div className="absolute top-0 left-0 w-64 h-64 bg-purple-300 dark:bg-purple-900 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-2xl opacity-50 animate-blob"></div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-300 dark:bg-yellow-900 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-2xl opacity-50 animate-blob animation-delay-2000"></div>
                        <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-indigo-300 dark:bg-indigo-950 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-2xl opacity-50 animate-blob animation-delay-4000"></div>
                    </div>

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

                            {/* LEFT — text */}
                            <div>
                                <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold text-indigo-700 bg-white border border-indigo-200 shadow-sm mb-6">
                                    {t('home.badge')}
                                </span>

                                <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-6 leading-tight">
                                    {t('home.hero.title')}{' '}
                                    <em className="not-italic text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-600">
                                        {t('home.hero.titleHighlight')}
                                    </em>{' '}
                                    {t('home.hero.titleSuffix', 'trajectory with precision.')}
                                </h1>

                                <p className="text-base sm:text-lg text-gray-500 dark:text-gray-400 mb-10 leading-relaxed">
                                    {t('home.hero.subtitle')}
                                </p>

                                <div className="flex flex-col sm:flex-row items-start gap-4">
                                    <Link to="/assessment" className="inline-flex items-center justify-center px-7 py-3.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 relative overflow-hidden group uppercase tracking-wide">
                                        {t('home.hero.cta')}
                                        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                    </Link>
                                    <Link to="/careers" className="inline-flex items-center justify-center px-6 py-3 text-sm font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm uppercase tracking-wide">
                                        {t('home.hero.exploreBtn')}
                                    </Link>
                                </div>
                            </div>

                            {/* RIGHT — dashboard mockup */}
                            <div className="relative">
                                <div className="relative rounded-2xl overflow-hidden shadow-2xl" style={{ background: 'linear-gradient(135deg,#0f172a 0%, #1e2d4a 100%)' }}>
                                    <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10">
                                        <span className="w-2.5 h-2.5 rounded-full bg-red-400 opacity-80"></span>
                                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 opacity-80"></span>
                                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 opacity-80"></span>
                                        <span className="ml-3 text-xs text-white/40 font-mono tracking-widest">• CAREER AI</span>
                                    </div>
                                    <div className="p-6">
                                        <div className="flex items-end justify-between h-36 gap-1.5 mb-4">
                                            {[35, 55, 42, 70, 58, 85, 65, 90, 72, 80, 60, 95].map((h, i) => (
                                                <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: i >= 9 ? 'rgba(56,189,248,0.9)' : `rgba(56,189,248,${0.25 + i * 0.04})` }}></div>
                                            ))}
                                        </div>
                                        <div className="flex justify-between text-xs text-white/30 font-mono">
                                            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => (
                                                <span key={m}>{m.slice(0, 1)}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Floating badge — only on larger screens */}
                                <div className="hidden md:block absolute -bottom-4 right-4 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-xl border border-gray-100 dark:border-gray-700">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <svg className="w-3.5 h-3.5 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Market Pulse</span>
                                    </div>
                                    <div className="text-xl font-extrabold text-gray-900 dark:text-white">+12.4%</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">AI Ethics roles demand</div>
                                </div>
                            </div>
                        </div>

                        {/* 3 feature mini-cards */}
                        <div className="mt-16 pb-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
                            {[
                                {
                                    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
                                    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
                                    title: t('home.features.assessment.title'),
                                    desc: t('home.features.assessment.shortDesc', 'Deep-dive cognitive and technical evaluation to uncover your hidden competitive edges.'),
                                },
                                {
                                    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
                                    color: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-400',
                                    title: t('home.features.skillGap.title'),
                                    desc: t('home.features.skillGap.shortDesc', 'Real-time data scraping from global sectors to identify emerging talent vacuums.'),
                                },
                                {
                                    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
                                    color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
                                    title: 'Mentor Network',
                                    desc: t('home.features.mentor.shortDesc', 'Direct access to industry architects who have already navigated the paths you seek.'),
                                },
                            ].map((card, i) => (
                                <div key={i} className="glass-card rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${card.color} group-hover:scale-110 transition-transform`}>
                                        {card.icon}
                                    </div>
                                    <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1.5">{card.title}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{card.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* --- FEATURE CLOUD --- */}
                <div className="border-y border-gray-200 dark:border-gray-700/50 py-10 relative" style={{ background: 'var(--neu-bg)', overflow: 'hidden' }}>
                    <div className="absolute inset-y-0 left-0 w-24 z-10 pointer-events-none" style={{ background: 'linear-gradient(to right, var(--neu-bg), transparent)' }}></div>
                    <div className="absolute inset-y-0 right-0 w-24 z-10 pointer-events-none" style={{ background: 'linear-gradient(to left, var(--neu-bg), transparent)' }}></div>
                    <div className="flex animate-scroll" style={{ width: 'max-content' }}>
                        {[...Array(2)].map((_, i) => (
                            <div key={i} className="flex gap-16 px-8 items-center">
                                {['Đánh Giá RIASEC', 'Phân Tích Big Five', 'Gợi Ý Nghề Nghiệp AI', 'Lộ Trình Học Tập', '900+ Nghề Nghiệp', 'Phân Tích Khoảng Cách Kỹ Năng', 'Trợ Lý AI', 'Báo Cáo PDF'].map((text, idx) => (
                                    <span key={idx} className="text-base font-bold tracking-wide text-gray-400 hover:text-indigo-700 dark:text-gray-500 dark:hover:text-indigo-400 select-none transition-colors duration-300 whitespace-nowrap uppercase">
                                        {text}
                                    </span>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/* --- PREMIUM AI SAAS DASHBOARD SECTION --- */}
                <section className="py-24 relative overflow-hidden bg-white dark:bg-gray-900">
                    {/* Ambient lighting effects */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full opacity-30 dark:opacity-20 blur-[120px]" style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.3) 0%, transparent 70%)' }}></div>
                        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] rounded-full opacity-25 dark:opacity-15 blur-[100px]" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)' }}></div>
                        <div className="absolute bottom-0 left-1/3 w-[450px] h-[450px] rounded-full opacity-20 dark:opacity-10 blur-[90px]" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.2) 0%, transparent 70%)' }}></div>
                    </div>

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        {/* Header */}
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight text-gray-900 dark:text-white">
                                Tất cả những gì bạn cần để{' '}
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600">
                                    tỏa sáng trong sự nghiệp
                                </span>
                            </h2>
                            <p className="text-lg text-gray-600 dark:text-gray-400">
                                Nền tảng kết hợp AI tiên tiến và chiến lược nghề nghiệp để đưa kiến chúng đề mang lại lộ trình cá nhân hóa.
                            </p>
                        </div>

                        {/* 2-Column Premium Card Layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                            {/* LEFT COLUMN - Large Career Assessment Card */}
                            <div className="lg:row-span-2 group">
                                <div className="h-full rounded-3xl p-8 relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/80 dark:border-gray-700/80 shadow-lg dark:shadow-purple-900/20"
                                    style={{
                                        boxShadow: '0 8px 32px rgba(124, 58, 237, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)'
                                    }}>

                                    {/* Ambient glow */}
                                    <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-40 dark:opacity-30 blur-[80px] group-hover:opacity-60 dark:group-hover:opacity-50 transition-opacity duration-500"
                                        style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)' }}></div>

                                    <div className="relative z-10 h-full flex flex-col">
                                        {/* Icon badge */}
                                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300"
                                            style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' }}>
                                            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>

                                        {/* Title */}
                                        <h3 className="text-3xl font-bold mb-3 text-gray-900 dark:text-white">
                                            Đánh giá nghề nghiệp bằng AI
                                        </h3>
                                        <p className="text-base mb-4 text-gray-600 dark:text-gray-400">
                                            Khám phá con đường nghề nghiệp lý tưởng với bài đánh giá toàn diện RIASEC & Big Five được hỗ trợ bởi phân tích AI tiên tiến.
                                        </p>

                                        {/* Analytics Widget */}
                                        <div className="rounded-2xl p-6 relative overflow-hidden group-hover:scale-[1.02] transition-transform duration-500 bg-gradient-to-br from-gray-50 to-purple-50/50 dark:from-gray-900/50 dark:to-purple-950/30 border border-purple-200/20 dark:border-purple-800/20"
                                            style={{
                                                boxShadow: '0 4px 20px rgba(124, 58, 237, 0.06)'
                                            }}>

                                            {/* RIASEC Badge */}
                                            <div className="flex items-center gap-4 mb-6">
                                                <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg"
                                                    style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)' }}>
                                                    R
                                                </div>
                                                <div className="flex-1">
                                                    <div className="h-2 rounded-full mb-2 bg-gray-200 dark:bg-gray-700" style={{ width: '100%' }}>
                                                        <div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #8B5CF6 0%, #A78BFA 100%)', width: '75%' }}></div>
                                                    </div>
                                                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400">Realistic</div>
                                                </div>
                                            </div>

                                            {/* Progress Bars */}
                                            <div className="space-y-3">
                                                {[
                                                    { label: 'Realistic', width: '75%', color: 'linear-gradient(90deg, #EF4444 0%, #F87171 100%)' },
                                                    { label: 'Investigative', width: '85%', color: 'linear-gradient(90deg, #F59E0B 0%, #FBBF24 100%)' },
                                                    { label: 'Artistic', width: '60%', color: 'linear-gradient(90deg, #8B5CF6 0%, #A78BFA 100%)' },
                                                    { label: 'Social', width: '90%', color: 'linear-gradient(90deg, #3B82F6 0%, #60A5FA 100%)' }
                                                ].map((item, i) => (
                                                    <div key={i} className="flex items-center gap-3">
                                                        <span className="text-xs font-medium w-24 text-gray-600 dark:text-gray-400">{item.label}</span>
                                                        <div className="flex-1 h-2.5 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                                                            <div className="h-full rounded-full transition-all duration-1000" style={{ background: item.color, width: item.width }}></div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Match Badge */}
                                            <div className="absolute bottom-6 right-6 px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 bg-white/90 dark:bg-gray-800/90 border border-purple-300/30 dark:border-purple-700/30">
                                                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#8B5CF6' }}></div>
                                                <span className="text-sm font-bold text-purple-700 dark:text-purple-400">Match: 95%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT TOP - Skill Gap Analysis Card */}
                            <div className="group">
                                <div className="h-full rounded-3xl p-8 relative overflow-visible transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 bg-white/95 dark:bg-gray-800/95 backdrop-blur-2xl border border-gray-200/90 dark:border-gray-700/90 shadow-lg dark:shadow-purple-900/20"
                                    style={{
                                        boxShadow: '0 8px 32px rgba(124, 58, 237, 0.12), 0 2px 8px rgba(139, 92, 246, 0.08)'
                                    }}>

                                    {/* Multi-layer ambient glow */}
                                    <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full opacity-30 dark:opacity-20 blur-[80px] group-hover:opacity-50 dark:group-hover:opacity-35 transition-all duration-700"
                                        style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.5) 0%, rgba(167,139,250,0.3) 40%, transparent 70%)' }}></div>
                                    <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-25 dark:opacity-15 blur-[60px] group-hover:opacity-40 dark:group-hover:opacity-25 transition-all duration-700"
                                        style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.4) 0%, transparent 70%)', animationDelay: '0.2s' }}></div>

                                    <div className="relative z-10">
                                        {/* Icon badge with enhanced glow */}
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300"
                                            style={{
                                                background: 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)',
                                                boxShadow: '0 4px 16px rgba(236, 72, 153, 0.3), 0 2px 8px rgba(139, 92, 246, 0.2)'
                                            }}>
                                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                        </div>

                                        {/* Title */}
                                        <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                                            Phân tích khoảng cách kỹ năng
                                        </h3>
                                        <p className="text-sm mb-6 text-gray-600 dark:text-gray-400">
                                            Xác định các kỹ năng còn thiếu cho nghề nghiệp mơ ước của bạn.
                                        </p>

                                        {/* Enhanced Energy Orb Visualization */}
                                        <div className="relative flex items-center justify-center py-10">
                                            {/* Center glowing orb with multiple layers */}
                                            <div className="relative w-28 h-28 flex items-center justify-center">
                                                {/* Outer bloom layers */}
                                                <div className="absolute -inset-8 rounded-full opacity-15 animate-pulse"
                                                    style={{
                                                        background: 'radial-gradient(circle, rgba(139,92,246,0.8) 0%, rgba(167,139,250,0.4) 30%, transparent 70%)',
                                                        filter: 'blur(30px)',
                                                        animationDuration: '3s'
                                                    }}></div>
                                                <div className="absolute -inset-4 rounded-full opacity-20 animate-pulse"
                                                    style={{
                                                        background: 'radial-gradient(circle, rgba(139,92,246,0.7) 0%, rgba(167,139,250,0.3) 40%, transparent 70%)',
                                                        filter: 'blur(20px)',
                                                        animationDuration: '2.5s',
                                                        animationDelay: '0.3s'
                                                    }}></div>
                                                <div className="absolute inset-0 rounded-full opacity-25 animate-pulse"
                                                    style={{
                                                        background: 'radial-gradient(circle, rgba(139,92,246,0.6) 0%, transparent 70%)',
                                                        filter: 'blur(15px)',
                                                        animationDuration: '2s',
                                                        animationDelay: '0.6s'
                                                    }}></div>

                                                {/* Animated dashed orbit rings */}
                                                <svg className="absolute w-36 h-36 opacity-30 group-hover:opacity-50 transition-opacity duration-500" style={{ animation: 'spin 20s linear infinite' }}>
                                                    <circle cx="72" cy="72" r="70" fill="none" stroke="#A78BFA" strokeWidth="2" strokeDasharray="8 8" />
                                                </svg>
                                                <svg className="absolute w-48 h-48 opacity-20 group-hover:opacity-35 transition-opacity duration-500" style={{ animation: 'spin 30s linear infinite reverse' }}>
                                                    <circle cx="96" cy="96" r="94" fill="none" stroke="#C4B5FD" strokeWidth="2" strokeDasharray="8 8" />
                                                </svg>
                                                <svg className="absolute w-60 h-60 opacity-10 group-hover:opacity-20 transition-opacity duration-500" style={{ animation: 'spin 40s linear infinite' }}>
                                                    <circle cx="120" cy="120" r="118" fill="none" stroke="#DDD6FE" strokeWidth="1" strokeDasharray="6 6" />
                                                </svg>

                                                {/* Center icon with enhanced styling */}
                                                <div className="relative w-20 h-20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-500"
                                                    style={{
                                                        background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                                                        boxShadow: '0 8px 32px rgba(124, 58, 237, 0.4), 0 4px 16px rgba(139, 92, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
                                                    }}>
                                                    <svg className="w-10 h-10 text-white drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                    </svg>
                                                </div>

                                                {/* Floating feature icons with enhanced styling and animations */}
                                                <div className="absolute -top-4 -right-4 w-11 h-11 rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300"
                                                    style={{
                                                        background: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
                                                        boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4), 0 2px 8px rgba(96, 165, 250, 0.3)'
                                                    }}>
                                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                    </svg>
                                                </div>
                                                <div className="absolute -bottom-4 -left-4 w-11 h-11 rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:translate-y-1 transition-all duration-300"
                                                    style={{
                                                        background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
                                                        boxShadow: '0 4px 20px rgba(245, 158, 11, 0.4), 0 2px 8px rgba(251, 191, 36, 0.3)'
                                                    }}>
                                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <div className="absolute top-1/2 -translate-y-1/2 -right-10 w-11 h-11 rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:translate-x-1 transition-all duration-300"
                                                    style={{
                                                        background: 'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)',
                                                        boxShadow: '0 4px 20px rgba(236, 72, 153, 0.4), 0 2px 8px rgba(244, 114, 182, 0.3)'
                                                    }}>
                                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                                    </svg>
                                                </div>
                                                <div className="absolute top-1/2 -translate-y-1/2 -left-10 w-11 h-11 rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:-translate-x-1 transition-all duration-300"
                                                    style={{
                                                        background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
                                                        boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4), 0 2px 8px rgba(167, 139, 250, 0.3)'
                                                    }}>
                                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Enhanced Recommendation Banner */}
                                        <div className="mt-4 rounded-xl p-4 flex items-center gap-3 group-hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 border border-purple-300/25 dark:border-purple-700/25 shadow-sm dark:shadow-purple-900/10">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                                style={{
                                                    background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                                                    boxShadow: '0 2px 8px rgba(124, 58, 237, 0.3)'
                                                }}>
                                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                            <p className="text-sm font-semibold text-purple-700 dark:text-purple-400">
                                                Bổ sung kỹ năng - Rút ngắn khoảng cách - Đạt mục tiêu nhanh hơn!
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT BOTTOM - Career Roadmap Card */}
                            <div className="group">
                                <div className="h-full rounded-3xl p-8 relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/80 dark:border-gray-700/80 shadow-lg dark:shadow-blue-900/20"
                                    style={{
                                        boxShadow: '0 8px 32px rgba(124, 58, 237, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)'
                                    }}>

                                    {/* Ambient glow */}
                                    <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full opacity-40 dark:opacity-30 blur-[60px] group-hover:opacity-60 dark:group-hover:opacity-50 transition-opacity duration-500"
                                        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.4) 0%, transparent 70%)' }}></div>

                                    <div className="relative z-10">
                                        {/* Icon badge */}
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-lg"
                                            style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)' }}>
                                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                            </svg>
                                        </div>

                                        {/* Title */}
                                        <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                                            Lộ trình nghề nghiệp
                                        </h3>
                                        <p className="text-sm mb-6 text-gray-600 dark:text-gray-400">
                                            Lộ trình học tập cá nhân hóa dẫn đến thành công.
                                        </p>

                                        {/* Step Progress Tracker */}
                                        <div className="rounded-xl p-6 flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border border-blue-200/20 dark:border-blue-800/20">
                                            <div className="flex items-center gap-3">
                                                {[1, 2, 3, 4].map((step) => (
                                                    <div key={step} className="flex items-center">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-lg transition-all duration-300 ${step <= 2 ? 'scale-110' : ''}`}
                                                            style={step <= 2 ? {
                                                                background: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
                                                                color: '#ffffff'
                                                            } : {
                                                                background: '#E5E7EB',
                                                                color: '#9CA3AF'
                                                            }}>
                                                            {step}
                                                        </div>
                                                        {step < 4 && (
                                                            <div className={`w-8 h-1.5 rounded-full mx-1 transition-all duration-300`}
                                                                style={step < 2 ? {
                                                                    background: 'linear-gradient(90deg, #3B82F6 0%, #60A5FA 100%)'
                                                                } : {
                                                                    background: '#E5E7EB'
                                                                }}></div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </section>

                {/* --- OLD BENTO GRID (HIDDEN FOR REFERENCE) --- */}
                <section className="hidden py-24 bg-gray-50 dark:bg-gray-800/50 relative overflow-hidden">
                    <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-indigo-200/20 dark:bg-indigo-950/20 rounded-full blur-[120px] pointer-events-none"></div>

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight">
                                {t('home.features.sectionTitle')} <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 to-violet-700">{t('home.features.sectionHighlight')}</span>
                            </h2>
                            <p className="text-lg text-gray-500 dark:text-gray-400">{t('home.features.sectionSubtitle')}</p>
                        </div>

                    </div>
                </section>

                {/* --- HOW IT WORKS --- */}
                <section className="py-24 relative overflow-hidden bg-gray-50 dark:bg-gray-900">
                    {/* Decorative background blobs — same palette as MentorMatchingPage */}
                    <div className="absolute inset-0 pointer-events-none z-0">
                        <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-gray-100/80 dark:from-gray-800/80 to-transparent"></div>
                        <div className="absolute -top-32 -left-24 w-[500px] h-[500px] rounded-full opacity-40 dark:opacity-25 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.25) 0%, transparent 70%)', filter: 'blur(80px)' }}></div>
                        <div className="absolute -top-16 -right-32 w-[450px] h-[450px] rounded-full opacity-35 dark:opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(147,197,253,0.22) 0%, transparent 70%)', filter: 'blur(90px)' }}></div>
                        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full opacity-30 dark:opacity-15 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(196,181,253,0.2) 0%, transparent 70%)', filter: 'blur(100px)' }}></div>
                        <div className="absolute bottom-10 right-10 w-[350px] h-[350px] rounded-full opacity-25 dark:opacity-12 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(186,230,253,0.2) 0%, transparent 70%)', filter: 'blur(80px)' }}></div>
                        {/* Subtle decorative rings */}
                        <div className="absolute top-[5%] left-[-5%] w-[600px] h-[600px] border border-purple-200/20 dark:border-purple-800/10 rounded-full pointer-events-none"></div>
                        <div className="absolute bottom-[5%] right-[-8%] w-[500px] h-[500px] border border-blue-200/20 dark:border-blue-800/10 rounded-full pointer-events-none"></div>
                        {/* Tiny stars */}
                        <div className="absolute top-[15%] right-[12%] text-purple-300/30 dark:text-purple-600/20 text-2xl pointer-events-none select-none">✦</div>
                        <div className="absolute top-[55%] left-[8%] text-blue-300/25 dark:text-blue-600/15 text-xl pointer-events-none select-none">✦</div>
                        <div className="absolute bottom-[20%] right-[18%] text-violet-200/30 dark:text-violet-600/15 text-lg pointer-events-none select-none">✦</div>
                    </div>

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="mb-20 text-center">
                            <span className="text-indigo-700 dark:text-indigo-400 font-bold tracking-wider uppercase text-sm bg-white/70 dark:bg-gray-800/70 border border-indigo-100 dark:border-indigo-800 px-4 py-1.5 rounded-full shadow-sm backdrop-blur-sm">{t('home.howItWorks.label')}</span>
                            <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white mt-4">{t('home.howItWorks.title')}</h2>
                            <p className="text-lg text-gray-500 dark:text-gray-400 mt-4 max-w-2xl mx-auto">{t('home.howItWorks.subtitle')}</p>
                        </div>

                        <div className="relative">
                            {/* Vertical timeline line */}
                            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 -translate-x-1/2 pointer-events-none" style={{ width: "3px", borderRadius: "999px", background: "linear-gradient(to bottom, #8b5cf6 0%, #3b82f6 30%, #10b981 65%, #f59e0b 100%)", boxShadow: "0 0 16px rgba(139,92,246,.3)" }}></div>
                            {[
                                { title: t('home.howItWorks.step1.title'), desc: t('home.howItWorks.step1.desc'), icon: "1", align: "left", gradient: "linear-gradient(135deg, #8b5cf6, #6366f1)", glow: "rgba(139,92,246,0.2)" },
                                { title: t('home.howItWorks.step2.title'), desc: t('home.howItWorks.step2.desc'), icon: "2", align: "right", gradient: "linear-gradient(135deg, #3b82f6, #06b6d4)", glow: "rgba(59,130,246,0.2)" },
                                { title: t('home.howItWorks.step3.title'), desc: t('home.howItWorks.step3.desc'), icon: "3", align: "left", gradient: "linear-gradient(135deg, #10b981, #14b8a6)", glow: "rgba(16,185,129,0.2)" },
                                { title: t('home.howItWorks.step4.title'), desc: t('home.howItWorks.step4.desc'), icon: "4", align: "right", gradient: "linear-gradient(135deg, #fb923c, #f59e0b)", glow: "rgba(251,146,60,0.2)" }
                            ].map((step, idx) => (
                                <div key={idx} className="relative mb-12 group">
                                    {/* Desktop: 3-column grid — card | circle | card */}
                                    <div className="hidden md:grid md:grid-cols-[5fr_auto_5fr] md:items-center md:gap-0">
                                        {/* Left slot */}
                                        {step.align === 'left' ? (
                                            <div className="pr-12 text-right">
                                                <div className="p-8 rounded-2xl relative overflow-hidden inline-block w-full hover:-translate-y-1 transition-all duration-300 bg-white/75 dark:bg-gray-800/75 backdrop-blur-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-lg dark:shadow-purple-900/10">
                                                    <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-indigo-400 to-violet-500 transform scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-bottom rounded-r-2xl"></div>
                                                    <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-60 dark:opacity-40 pointer-events-none" style={{ background: `radial-gradient(circle, ${step.glow} 0%, transparent 70%)` }}></div>
                                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{step.title}</h3>
                                                    <p className="text-gray-500 dark:text-gray-400">{step.desc}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div></div>
                                        )}
                                        {/* Center: step circle */}
                                        <div className="flex items-center justify-center z-10" style={{ width: "56px" }}>
                                            <div style={{ width: "46px", height: "46px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", fontWeight: 700, fontSize: "17px", border: "3px solid rgba(255,255,255,0.9)", boxShadow: `0 0 0 4px ${step.glow}, 0 4px 16px rgba(0,0,0,0.15)`, background: step.gradient, flexShrink: 0 }}>
                                                {step.icon}
                                            </div>
                                        </div>
                                        {/* Right slot */}
                                        {step.align === 'right' ? (
                                            <div className="pl-12">
                                                <div className="p-8 rounded-2xl relative overflow-hidden hover:-translate-y-1 transition-all duration-300 bg-white/75 dark:bg-gray-800/75 backdrop-blur-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-lg dark:shadow-purple-900/10">
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-400 to-violet-500 transform scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-bottom rounded-l-2xl"></div>
                                                    <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full opacity-60 dark:opacity-40 pointer-events-none" style={{ background: `radial-gradient(circle, ${step.glow} 0%, transparent 70%)` }}></div>
                                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{step.title}</h3>
                                                    <p className="text-gray-500 dark:text-gray-400">{step.desc}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div></div>
                                        )}
                                    </div>

                                    {/* Mobile: simple vertical list */}
                                    <div className="flex md:hidden items-start gap-4">
                                        <div style={{ width: "40px", height: "40px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#ffffff", fontWeight: 700, fontSize: "16px", border: "3px solid rgba(255,255,255,0.9)", boxShadow: `0 0 0 3px ${step.glow}, 0 4px 12px rgba(0,0,0,0.15)`, background: step.gradient }}>
                                            {step.icon}
                                        </div>
                                        <div className="flex-1 p-6 rounded-2xl bg-white/75 dark:bg-gray-800/75 backdrop-blur-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-lg dark:shadow-purple-900/10">
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{step.title}</h3>
                                            <p className="text-gray-500 dark:text-gray-400 text-sm">{step.desc}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* --- STATISTICS --- */}
                <section className="py-20 bg-indigo-800 dark:bg-indigo-950 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 dark:opacity-5"></div>
                    <div className="absolute -top-40 -right-40 w-96 h-96 bg-white dark:bg-indigo-400 opacity-10 dark:opacity-5 rounded-full blur-[100px]"></div>
                    <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white dark:bg-indigo-400 opacity-10 dark:opacity-5 rounded-full blur-[100px]"></div>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                            <CounterItem value={`${stats?.totalAssessments ?? 150}`} suffix="+" label={t('home.stats.assessments')} />
                            <CounterItem value={`${stats?.totalCareerPaths ?? 50}`} suffix="+" label={t('home.stats.careerPaths')} />
                            <CounterItem value={`${Math.round((stats?.totalCareerInfo ?? 20000) / 1000)}`} suffix="K+" label={t('home.stats.careerData')} />
                        </div>
                    </div>
                </section>

                {/* --- TESTIMONIALS --- */}
                <section className="py-24" style={{ background: 'var(--neu-bg)', overflow: 'hidden' }}>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 text-center">
                        <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-4">{t('home.testimonials.title')}</h2>
                    </div>
                    <div className="relative">
                        <div className="absolute top-0 left-0 h-full w-16 bg-gradient-to-r from-white dark:from-gray-900 to-transparent z-10 pointer-events-none"></div>
                        <div className="absolute top-0 right-0 h-full w-16 bg-gradient-to-l from-white dark:from-gray-900 to-transparent z-10 pointer-events-none"></div>
                        <div className="flex animate-scroll gap-6 mb-6" style={{ width: 'max-content' }}>
                            {row1.map((item, idx) => (
                                <div key={`r1-${idx}`} className="w-80 bg-gray-50 dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 flex-shrink-0 hover:bg-white dark:hover:bg-gray-700 hover:shadow-lg transition-all duration-300">
                                    <div className="flex items-center mb-4">
                                        <div style={{ width: "40px", height: "40px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#ffffff", fontWeight: 700, fontSize: "14px", background: item.gradient }}>{item.initial}</div>
                                        <div className="ml-3">
                                            <div className="font-bold text-gray-900 dark:text-white text-sm">{item.name}</div>
                                            <div className="text-xs text-gray-500">{item.role}</div>
                                        </div>
                                        <div className="ml-auto flex gap-0.5 text-yellow-400 text-xs">{[...Array(5)].map((_, i) => <span key={i}>★</span>)}</div>
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-300 italic text-sm leading-relaxed">"{item.text}"</p>
                                </div>
                            ))}
                        </div>
                        <div className="flex animate-scroll-reverse gap-6" style={{ width: 'max-content' }}>
                            {row2.map((item, idx) => (
                                <div key={`r2-${idx}`} className="w-80 bg-gray-50 dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 flex-shrink-0 hover:bg-white dark:hover:bg-gray-700 hover:shadow-lg transition-all duration-300">
                                    <div className="flex items-center mb-4">
                                        <div style={{ width: "40px", height: "40px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#ffffff", fontWeight: 700, fontSize: "14px", background: item.gradient }}>{item.initial}</div>
                                        <div className="ml-3">
                                            <div className="font-bold text-gray-900 dark:text-white text-sm">{item.name}</div>
                                            <div className="text-xs text-gray-500">{item.role}</div>
                                        </div>
                                        <div className="ml-auto flex gap-0.5 text-yellow-400 text-xs">{[...Array(5)].map((_, i) => <span key={i}>★</span>)}</div>
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-300 italic text-sm leading-relaxed">"{item.text}"</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* --- FAQ --- */}
                <section className="py-24 bg-gray-50 dark:bg-gray-800/50">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4">{t('home.faq.title')}</h2>
                            <p className="text-gray-500 dark:text-gray-400">{t('home.faq.subtitle')}</p>
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

                {/* --- CTA & CONTACT --- */}
                <section className="py-24 relative overflow-hidden bg-white dark:bg-gray-900">
                    <div className="max-w-5xl mx-auto px-4 relative z-10">
                        {/* CTA Card */}
                        <div className="bg-gradient-to-br from-indigo-800 to-indigo-900 dark:from-indigo-950 dark:to-indigo-900 rounded-[2.5rem] p-12 md:p-20 shadow-2xl relative overflow-hidden group mb-16">
                            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>
                            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-black opacity-20 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>
                            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 relative z-10 text-center">{t('home.cta.title')}</h2>
                            <p className="text-indigo-100 text-lg mb-10 max-w-2xl mx-auto relative z-10 text-center">{t('home.cta.subtitle')}</p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
                                <Link to="/assessment" className="px-8 py-4 bg-white text-indigo-900 rounded-full font-bold hover:bg-gray-100 hover:scale-105 transition-all shadow-lg text-center">
                                    {t('home.cta.btn')}
                                </Link>
                            </div>
                        </div>

                        {/* Contact */}
                        <div className="bg-white dark:bg-gray-800 rounded-[2rem] p-8 md:p-12 shadow-xl border border-gray-100 dark:border-gray-700">
                            <div className="text-center mb-8">
                                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">{t('home.contact.title')}</h3>
                                <p className="text-gray-600 dark:text-gray-400">{t('home.contact.subtitle')}</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    {[
                                        { icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />, bg: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-800', label: 'Email', val: 'careersystemai@gmail.com', href: 'mailto:careersystemai@gmail.com' },
                                        { icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />, bg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600', label: t('home.contact.responseTime'), val: t('home.contact.responseTimeValue') },
                                        { icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />, bg: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600', label: t('home.contact.support'), val: t('home.contact.supportValue') },
                                    ].map((r, i) => (
                                        <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                            <div className={`w-12 h-12 ${r.bg} rounded-full flex items-center justify-center`}>
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">{r.icon}</svg>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">{r.label}</p>
                                                {r.href ? <a href={r.href} className="text-gray-900 dark:text-white font-semibold hover:text-indigo-800 transition-colors">{r.val}</a> : <p className="text-gray-900 dark:text-white font-semibold">{r.val}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-gradient-to-br from-indigo-50 to-indigo-50 dark:from-indigo-950/20 dark:to-indigo-950/20 rounded-2xl p-6 border border-indigo-100 dark:border-indigo-800">
                                    {!showContactForm ? (
                                        <div className="flex flex-col justify-center items-center h-full">
                                            <div className="text-6xl mb-4"></div>
                                            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('home.contact.sendTitle')}</h4>
                                            <p className="text-gray-600 dark:text-gray-400 text-center mb-6">{t('home.contact.sendDesc')}</p>
                                            <button onClick={() => setShowContactForm(true)} className="px-8 py-4 bg-gradient-to-r from-indigo-800 to-indigo-800 hover:from-indigo-900 hover:to-violet-700 text-white font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg">
                                                {t('home.contact.btn')}
                                            </button>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleContactSubmit} className="space-y-4">
                                            {[
                                                { label: t('home.contact.nameLabel'), key: 'name', type: 'text', ph: t('home.contact.namePlaceholder') },
                                                { label: t('home.contact.emailLabel'), key: 'email', type: 'email', ph: t('home.contact.emailPlaceholder') },
                                                { label: t('home.contact.phoneLabel'), key: 'phone', type: 'tel', ph: t('home.contact.phonePlaceholder') },
                                            ].map(f => (
                                                <div key={f.key}>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{f.label}</label>
                                                    <input type={f.type} value={(contactForm as any)[f.key]} onChange={e => setContactForm({ ...contactForm, [f.key]: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-600 focus:border-transparent" placeholder={f.ph} />
                                                </div>
                                            ))}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('home.contact.messageLabel')}</label>
                                                <textarea required rows={3} value={contactForm.message} onChange={e => setContactForm({ ...contactForm, message: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-600 focus:border-transparent resize-none" placeholder={t('home.contact.messagePlaceholder')} />
                                            </div>
                                            {contactResult && (
                                                <div className={`p-3 rounded-lg text-sm ${contactResult.success ? 'bg-indigo-50 text-indigo-900' : 'bg-red-100 text-red-700'}`}>{contactResult.message}</div>
                                            )}
                                            <div className="flex gap-3">
                                                <button type="button" onClick={() => { setShowContactForm(false); setContactResult(null); }} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">{t('common.cancel')}</button>
                                                <button type="submit" disabled={contactLoading} className="flex-1 px-4 py-2 bg-indigo-800 hover:bg-indigo-900 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                                    {contactLoading ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>{t('home.contact.sending')}</> : t('home.contact.sendBtn')}
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default HomePage;
