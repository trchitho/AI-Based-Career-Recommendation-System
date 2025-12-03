import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ThemeToggle from '../components/ThemeToggle';
import LanguageSwitcher from '../components/LanguageSwitcher';
// Đã loại bỏ import useAppSettings để tránh cảnh báo unused
import { useAuth } from '../contexts/AuthContext';

const HomePage = () => {
    const { t } = useTranslation();
    // Đã loại bỏ biến 'app' không sử dụng
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // --- LOGIC ---
    const isAuthenticated = Boolean(user);
    const isAdmin = user?.role === 'admin';

    // FIX LỖI TS(2339): Thay vì gọi user.name (không tồn tại), ta lấy tên từ email
    const displayName = user?.email?.split('@')[0] || 'User';

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Logic hiển thị menu: Chỉ hiện Dashboard khi đã đăng nhập
    const navItems = isAuthenticated
        ? ['Dashboard', 'Assessment', 'Blog', 'Careers', 'Pricing']
        : ['Assessment', 'Blog', 'Careers', 'Pricing'];

    // --- DỮ LIỆU MẪU (Testimonials) ---
    const testimonials = [
        { name: 'Sarah Nguyen', role: 'Software Engineer', text: "The insights were incredibly accurate. I finally understand why certain careers appeal to me.", initial: 'S', color: 'bg-indigo-500' },
        { name: 'Michael Chen', role: 'Product Manager', text: "A game-changer for my career planning. The roadmap gave me clear direction.", initial: 'M', color: 'bg-emerald-500' },
        { name: 'Emily Patel', role: 'UX Designer', text: "Highly recommended for anyone feeling stuck in their current role.", initial: 'E', color: 'bg-purple-500' },
        { name: 'David Kim', role: 'Data Scientist', text: "The AI analysis is spot on. It helped me pivot my career successfully.", initial: 'D', color: 'bg-blue-500' },
        { name: 'Lisa Wang', role: 'Marketing Lead', text: "Simple, intuitive, and effective. Best career tool I've used.", initial: 'L', color: 'bg-pink-500' },
    ];
    // Tạo mảng lặp để chạy hiệu ứng marquee
    const row1 = [...testimonials, ...testimonials, ...testimonials];
    const row2 = [...testimonials].reverse().concat([...testimonials].reverse()).concat([...testimonials].reverse());

    // --- COMPONENT LOGO NỘI BỘ (Để đảm bảo giao diện đẹp mà không phụ thuộc file ngoài) ---
    const ModernLogo = () => (
        <Link to="/home" className="flex items-center gap-2 group">
            {/* Logo Text thuần túy theo phong cách Minimalist của resume.io */}
            <span className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white group-hover:opacity-80 transition-opacity">
                career<span className="text-green-500">bridge</span><span className="text-green-500 text-3xl leading-none">.</span>
            </span>
        </Link>
    );

    return (
        <div className="min-h-screen bg-white dark:bg-gray-900 font-['Plus_Jakarta_Sans'] text-gray-900 dark:text-white selection:bg-green-100 selection:text-green-900 overflow-x-hidden">

            {/* --- CSS INJECTION (Animation & Fonts) --- */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
                
                @keyframes scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
                @keyframes scroll-reverse { 0% { transform: translateX(-50%); } 100% { transform: translateX(0); } }
                @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
                
                .animate-scroll { animation: scroll 60s linear infinite; }
                .animate-scroll-reverse { animation: scroll-reverse 60s linear infinite; }
                .animate-fade-in-up { animation: fade-in-up 0.8s ease-out forwards; opacity: 0; }
                
                .delay-100 { animation-delay: 0.1s; }
                .delay-200 { animation-delay: 0.2s; }
                .delay-300 { animation-delay: 0.3s; }
                
                .group:hover .animate-scroll, .group:hover .animate-scroll-reverse { animation-play-state: paused; }
            `}</style>

            {/* --- HEADER --- */}
            <header className="sticky top-0 z-50 w-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm py-5 transition-all duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <div className="flex-shrink-0">
                        <ModernLogo />
                    </div>

                    {/* Menu chính giữa */}
                    <nav className="hidden md:flex items-center gap-8">
                        {navItems.map((item) => (
                            <NavLink
                                key={item}
                                to={`/${item.toLowerCase()}`}
                                className={({ isActive }) => `text-[15px] font-medium transition-colors duration-200 ${isActive
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                                    }`}
                            >
                                {item}
                            </NavLink>
                        ))}
                    </nav>

                    {/* Khu vực bên phải: Auth & Toggle */}
                    <div className="flex items-center gap-5">
                        <div className="hidden lg:flex items-center gap-3 pr-3 border-r border-gray-200 dark:border-gray-700">
                            <LanguageSwitcher />
                            <ThemeToggle />
                        </div>

                        {isAuthenticated ? (
                            <div className="flex items-center gap-3 animate-fade-in-up">
                                {isAdmin && (
                                    <Link to="/admin" className="hidden lg:inline-flex px-3 py-1 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-full dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                                        Admin
                                    </Link>
                                )}
                                <div className="flex items-center gap-2 cursor-default">
                                    <div className="w-9 h-9 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center text-green-700 dark:text-green-300 font-bold text-sm">
                                        {displayName.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="hidden sm:block text-sm font-semibold max-w-[100px] truncate">{displayName}</span>
                                </div>
                                <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition-colors" title="Logout">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <Link to="/login" className="hidden sm:block text-[15px] font-semibold text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full hover:border-gray-400 transition-all">
                                    {t('auth.signIn')}
                                </Link>
                                <Link to="/assessment" className="text-[15px] font-bold bg-green-500 text-white px-6 py-2.5 rounded-full hover:bg-green-600 shadow-lg shadow-green-500/20 hover:-translate-y-0.5 transition-all duration-200">
                                    Get started
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main>
                {/* --- HERO SECTION (Style giống ảnh resume.io) --- */}
                <section className="relative pt-20 pb-32 overflow-hidden bg-white dark:bg-gray-900">
                    {/* Background Glow tinh tế */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-green-500/5 rounded-full blur-[100px] pointer-events-none -z-10"></div>

                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        {/* User Avatars & Rating */}
                        <div className="flex flex-col items-center justify-center gap-2 mb-8 animate-fade-in-up">
                            <div className="flex items-center gap-3">
                                <div className="flex -space-x-3">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <img key={i} className="w-10 h-10 rounded-full border-[3px] border-white dark:border-gray-900 object-cover" src={`https://i.pravatar.cc/100?img=${i + 15}`} alt="User" />
                                    ))}
                                </div>
                                <div className="flex flex-col items-start">
                                    <div className="flex text-green-500 text-sm">★★★★★</div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Used by 10,000+ users</span>
                                </div>
                            </div>
                        </div>

                        {/* Headline: Giống hệt ảnh mẫu */}
                        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-6 leading-[1.1] animate-fade-in-up delay-100">
                            Land your dream job with <br className="hidden md:block" />
                            <span className="text-green-500">AI-powered</span> resumes.
                        </h1>
                        <p className="text-xl text-gray-600 dark:text-gray-400 mb-10 leading-relaxed max-w-2xl mx-auto font-medium animate-fade-in-up delay-200">
                            Create, edit and download professional resumes with AI-powered assistance in minutes.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-5 animate-fade-in-up delay-300">
                            <Link
                                to={isAuthenticated ? '/dashboard' : '/assessment'}
                                className="w-full sm:w-auto inline-flex items-center justify-center px-10 py-4 text-[17px] font-bold text-white bg-green-500 rounded-full hover:bg-green-600 transition-all shadow-xl shadow-green-500/20 hover:-translate-y-1"
                            >
                                <span>Get started</span>
                                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                            </Link>
                            <Link
                                to="/about"
                                className="w-full sm:w-auto inline-flex items-center justify-center px-10 py-4 text-[17px] font-bold text-gray-600 bg-transparent border border-gray-300 rounded-full hover:bg-gray-50 hover:text-gray-900 hover:border-gray-400 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-800 dark:hover:text-white transition-all"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span>Try demo</span>
                            </Link>
                        </div>

                        {/* Footer Text nhỏ */}
                        <p className="mt-16 text-sm text-gray-400 dark:text-gray-500 animate-fade-in-up delay-300">
                            Trusting by leading brands, including
                        </p>

                        {/* Brand Logos (Marquee) */}
                        <div className="mt-8 border-t border-gray-100 dark:border-gray-800 pt-8 overflow-hidden group">
                            <div className="flex w-max animate-scroll group-hover:paused">
                                {[...Array(2)].map((_, setIndex) => (
                                    <div key={setIndex} className="flex gap-16 px-10 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                                        {['Instagram', 'Framer', 'Microsoft', 'Huawei', 'Walmart', 'Spotify', 'Airbnb'].map((brand, i) => (
                                            <span key={i} className="text-2xl font-bold text-gray-500 dark:text-gray-400 cursor-default select-none font-sans">
                                                {brand}
                                            </span>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* --- FEATURES SECTION --- */}
                <section className="py-24 bg-gray-50 dark:bg-gray-800/50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-4">Features designed for you</h2>
                            <p className="text-lg text-gray-500 dark:text-gray-400">Everything you need to build a perfect resume and find your career path.</p>
                        </div>
                        <div className="grid md:grid-cols-3 gap-8">
                            {[
                                { title: 'AI Writer', desc: 'Auto-generate resume content tailored to your industry.', icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' },
                                { title: 'Resume Checker', desc: 'Get real-time feedback to improve your score.', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
                                { title: 'Cover Letters', desc: 'Create matching cover letters in seconds.', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
                            ].map((feature, idx) => (
                                <div key={idx} className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-xl flex items-center justify-center mb-6">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={feature.icon} /></svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{feature.title}</h3>
                                    <p className="text-gray-500 dark:text-gray-400 leading-relaxed">{feature.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* --- TESTIMONIALS (MARQUEE) --- */}
                <section className="py-24 bg-white dark:bg-gray-900 overflow-hidden">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 text-center">
                        <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-4">Loved by users</h2>
                    </div>

                    <div className="relative group">
                        <div className="flex w-max animate-scroll gap-6 mb-6">
                            {row1.map((item, idx) => (
                                <div key={`r1-${idx}`} className="w-[380px] bg-gray-50 dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700 flex-shrink-0">
                                    <div className="flex items-center mb-4">
                                        <div className={`w-10 h-10 ${item.color} rounded-full flex items-center justify-center text-white font-bold`}>{item.initial}</div>
                                        <div className="ml-3">
                                            <div className="font-bold text-gray-900 dark:text-white">{item.name}</div>
                                            <div className="text-xs text-gray-500">{item.role}</div>
                                        </div>
                                        <div className="ml-auto flex text-yellow-400 text-xs">★★★★★</div>
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-300 italic text-sm">"{item.text}"</p>
                                </div>
                            ))}
                        </div>
                        <div className="flex w-max animate-scroll-reverse gap-6">
                            {row2.map((item, idx) => (
                                <div key={`r2-${idx}`} className="w-[380px] bg-gray-50 dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700 flex-shrink-0">
                                    <div className="flex items-center mb-4">
                                        <div className={`w-10 h-10 ${item.color} rounded-full flex items-center justify-center text-white font-bold`}>{item.initial}</div>
                                        <div className="ml-3">
                                            <div className="font-bold text-gray-900 dark:text-white">{item.name}</div>
                                            <div className="text-xs text-gray-500">{item.role}</div>
                                        </div>
                                        <div className="ml-auto flex text-yellow-400 text-xs">★★★★★</div>
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-300 italic text-sm">"{item.text}"</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* --- FOOTER --- */}
                <footer className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 py-12">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <div className="flex justify-center mb-6">
                            <ModernLogo />
                        </div>
                        <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 mb-8 text-sm font-bold text-gray-500 dark:text-gray-400">
                            <Link to="/about" className="hover:text-green-600">About</Link>
                            <Link to="/blog" className="hover:text-green-600">Blog</Link>
                            <Link to="/contact" className="hover:text-green-600">Contact</Link>
                            <Link to="/privacy" className="hover:text-green-600">Privacy</Link>
                        </div>
                        <p className="text-sm text-gray-400">© 2025 CareerBridge AI. All rights reserved.</p>
                    </div>
                </footer>
            </main>
        </div>
    );
};

export default HomePage;