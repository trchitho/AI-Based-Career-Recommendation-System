import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { mentorMatchingService, MentorMatch } from '../../services/mentorMatchingService';

interface Props { careerTitle: string; careerId: string; careerSlug?: string; }

const initials = (name: string) => name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();

const CareerMentorSection: React.FC<Props> = ({ careerTitle, careerId, careerSlug }) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [mentors, setMentors]   = useState<MentorMatch[]>([]);
  const [loading, setLoading]   = useState(false);
  const [loaded, setLoaded]     = useState(false);

  const toggle = async () => {
    if (!expanded && !loaded) {
      setLoading(true);
      try {
        const data = await mentorMatchingService.findMentorsForCareer(careerTitle, 3, careerSlug);
        setMentors(data); setLoaded(true);
      } catch { setMentors([]); setLoaded(true); }
      finally { setLoading(false); }
    }
    setExpanded(p => !p);
  };

  return (
    <div className="border-t pt-3 mt-3" style={{ borderColor: 'var(--neu-shadow-dark)' }}>
      {/* Toggle */}
      <button type="button" onClick={toggle}
        className="w-full flex items-center justify-between text-sm font-semibold transition-opacity hover:opacity-75 border-none bg-transparent cursor-pointer py-1"
        style={{ color: 'var(--neu-accent)' }}>
        <span className="flex items-center gap-1.5">
          <Users size={14} />
          <span>Mentor cho nghề này</span>
          {loaded && mentors.length > 0 && (
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: 'var(--neu-accent)' }}>
              {mentors.length}
            </span>
          )}
        </span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {/* Body */}
      {expanded && (
        <div className="mt-2 flex flex-col gap-2">
          {loading && (
            <div className="flex items-center gap-2 text-gray-400 text-xs py-1">
              <div className="w-3.5 h-3.5 border-2 border-gray-300 rounded-full animate-spin" style={{ borderTopColor: 'var(--neu-accent)' }} />
              Đang tìm mentor...
            </div>
          )}

          {!loading && mentors.length === 0 && (
            <div className="text-center py-2">
              <p className="text-xs mb-1" style={{ color: 'var(--neu-text-muted)' }}>Chưa có mentor cho nghề này.</p>
              <button onClick={() => navigate('/mentor-matching?tab=become-mentor')}
                className="text-xs font-medium border-none bg-transparent cursor-pointer transition-opacity hover:opacity-75"
                style={{ color: 'var(--neu-accent)' }}>
                Trở thành Mentor đầu tiên →
              </button>
            </div>
          )}

          {!loading && mentors.map(m => (
            <div key={m.mentor_id}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-colors"
              style={{ background: 'rgba(0,0,0,0.03)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background='rgba(0,0,0,0.06)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background='rgba(0,0,0,0.03)'}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: 'var(--neu-accent)' }}>
                {initials(m.mentor_name)}
              </div>
              <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--neu-text)' }}>{m.mentor_name}</span>
                <span className="text-xs truncate" style={{ color: 'var(--neu-text-muted)' }}>
                  {m.current_position}{m.company ? ` · ${m.company}` : ''}
                </span>
                {m.matching_skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {m.matching_skills.slice(0,3).map(s => (
                      <span key={s} className="text-[11px] px-1.5 py-0.5 rounded font-medium"
                        style={{ background: 'rgba(26,35,126,0.1)', color: 'var(--neu-accent)' }}>{s}</span>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: 'rgba(26,35,126,0.12)', color: 'var(--neu-accent)' }}>
                {m.compatibility_score.toFixed(0)}%
              </span>
            </div>
          ))}

          {!loading && (
            <button onClick={() => navigate('/mentor-matching')}
              className="flex items-center gap-1.5 text-xs font-medium border-none bg-transparent cursor-pointer transition-opacity hover:opacity-75 mt-1"
              style={{ color: 'var(--neu-accent)' }}>
              <ExternalLink size={13} /> Xem tất cả Mentor
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CareerMentorSection;
