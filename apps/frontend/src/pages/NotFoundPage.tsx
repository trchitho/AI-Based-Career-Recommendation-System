import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Home, Briefcase, Users, HelpCircle, ArrowLeft } from 'lucide-react';

/* ── Suggested quick-links ─────────────────────────────────── */
const SUGGESTIONS = [
  { icon: <Briefcase size={22} />, label: 'Nghề nghiệp',    path: '/careers' },
  { icon: <Users size={22} />,     label: 'Mentor Matching', path: '/mentor-matching' },
  { icon: <HelpCircle size={22} />,label: 'AI Assistant',   path: '/dashboard' },
];

/* ── Animated 404 digit ──────────────────────────────────────── */
const AnimatedDigit: React.FC<{ char: string; delay: number }> = ({ char, delay }) => (
  <span
    style={{
      display: 'inline-block',
      fontSize: 'clamp(5rem, 15vw, 9rem)',
      fontWeight: 900,
      lineHeight: 1,
      letterSpacing: '-0.05em',
      color: 'transparent',
      WebkitTextStroke: '2px',
      WebkitTextStrokeColor: 'e5e7eb',
      animation: `float 3s ease-in-out ${delay}s infinite`,
      userSelect: 'none',
    }}
  >
    {char}
  </span>
);

/* ════════════════════════════════════════════════════════════ */
const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  /* Animate in on mount */
  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/careers?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch(e as any);
  };

  return (
    <>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-12px); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin-slow {
          to { transform: rotate(360deg); }
        }
        .nf-fade-up { animation: fadeUp 0.6s ease both; }
        .nf-fade-up-1 { animation: fadeUp 0.6s 0.1s ease both; }
        .nf-fade-up-2 { animation: fadeUp 0.6s 0.2s ease both; }
        .nf-fade-up-3 { animation: fadeUp 0.6s 0.3s ease both; }
        .nf-fade-up-4 { animation: fadeUp 0.6s 0.4s ease both; }
        .nf-fade-up-5 { animation: fadeUp 0.6s 0.5s ease both; }
        .nf-suggestion:hover { background: f5f3ff; border-color: c4b5fd; transform: translateY(-2px); }
        .nf-suggestion:hover .nf-icon { color: 7c3aed; }
        .nf-search:focus { outline: none; border-color: 7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,0.12); }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, f8f7ff 0%, ede9fe 40%, f0f9ff 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '2rem 1.5rem',
        fontFamily: "'Inter Tight', 'Plus Jakarta Sans', -apple-system, sans-serif",
        opacity: isVisible ? 1 : 0, transition: 'opacity 0.3s ease',
        position: 'relative', overflow: 'hidden',
      }}>

        {/* Background decorative circles */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: 'rgba(124,58,237,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(99,102,241,0.06)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 520, width: '100%', textAlign: 'center', position: 'relative', zIndex: 1 }}>

          {/* Animated 404 */}
          <div className="nf-fade-up" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.1em' }}>
            <AnimatedDigit char="4" delay={0} />
            {/* Sad face icon in the middle */}
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{
                width: 'clamp(4.5rem, 12vw, 7.5rem)',
                height: 'clamp(4.5rem, 12vw, 7.5rem)',
                borderRadius: '50%',
                border: '3px solid e5e7eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'fff',
                boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
              }}>
                <HelpCircle size={40} strokeWidth={1.5} color="#9ca3af" />
              </div>
            </div>
            <AnimatedDigit char="4" delay={0.4} />
          </div>

          {/* Title */}
          <h1 className="nf-fade-up-1" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.25rem)', fontWeight: 800, color: '#1e1b4b', margin: '0 0 0.75rem', letterSpacing: '-0.025em', lineHeight: 1.15 }}>
            Page Not Found
          </h1>

          {/* Subtitle */}
          <p className="nf-fade-up-2" style={{ fontSize: '0.9375rem', color: '#6b7280', margin: '0 0 2rem', lineHeight: 1.65, maxWidth: 380, marginLeft: 'auto', marginRight: 'auto' }}>
            Oops! Trang bạn đang tìm không tồn tại hoặc đã bị di chuyển.
            {location.pathname !== '/' && (
              <><br /><code style={{ fontSize: '0.8rem', color: '#9ca3af', background: '#f3f4f6', padding: '2px 7px', borderRadius: 6, marginTop: 4, display: 'inline-block' }}>{location.pathname}</code></>
            )}
          </p>

          {/* Search bar */}
          <form className="nf-fade-up-3" onSubmit={handleSearch} style={{ marginBottom: '1.25rem' }}>
            <div style={{ position: 'relative', maxWidth: 380, margin: '0 auto' }}>
              <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
              <input
                className="nf-search"
                type="text"
                placeholder="Tìm kiếm nghề nghiệp, mentor, bài viết..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{
                  width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem',
                  border: '1.5px solid e5e7eb', borderRadius: 12,
                  fontSize: '0.9rem', color: '#1f2937', background: 'fff',
                  boxSizing: 'border-box', transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
              />
            </div>
          </form>

          {/* Back to Dashboard button */}
          <div className="nf-fade-up-3" style={{ marginBottom: '2.5rem' }}>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.75rem 1.75rem',
                background: 'linear-gradient(135deg, 4f46e5, 7c3aed)',
                color: 'fff', border: 'none', borderRadius: 12,
                fontWeight: 700, fontSize: '0.9375rem', cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(79,70,229,0.35)',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(79,70,229,0.45)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(79,70,229,0.35)'; }}
            >
              <Home size={16} />
              Back to Dashboard
            </button>
          </div>

          {/* Divider */}
          <div className="nf-fade-up-4" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              Suggested Destinations
            </span>
            <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
          </div>

          {/* Suggestion cards */}
          <div className="nf-fade-up-5" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {SUGGESTIONS.map(s => (
              <button
                key={s.path}
                className="nf-suggestion"
                onClick={() => navigate(s.path)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                  padding: '1rem 1.25rem', background: 'fff',
                  border: '1.5px solid e5e7eb', borderRadius: 14,
                  cursor: 'pointer', minWidth: 100, transition: 'all 0.2s',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}
              >
                <span className="nf-icon" style={{ color: '#6b7280', transition: 'color 0.2s' }}>{s.icon}</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>{s.label}</span>
              </button>
            ))}
          </div>

          {/* Go back link */}
          <div className="nf-fade-up-5" style={{ marginTop: '1.75rem' }}>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer text-gray-400 text-sm underline underline-offset-2 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft size={14} /> Quay lại trang trước
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotFoundPage;
