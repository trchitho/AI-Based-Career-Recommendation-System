import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { mentorMatchingService, MentorMatch } from '../../services/mentorMatchingService';
import './CareerMentorSection.css';

interface Props {
  careerTitle: string;  // e.g. "Software Developers"
  careerId: string;     // for linking to skill-gap
  careerSlug?: string;  // slug for reliable DB lookup
}

const CareerMentorSection: React.FC<Props> = ({ careerTitle, careerId, careerSlug }) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [mentors, setMentors] = useState<MentorMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const toggle = async () => {
    if (!expanded && !loaded) {
      setLoading(true);
      try {
        const data = await mentorMatchingService.findMentorsForCareer(careerTitle, 3, careerSlug);
        setMentors(data);
        setLoaded(true);
      } catch {
        setMentors([]);
        setLoaded(true);
      } finally {
        setLoading(false);
      }
    }
    setExpanded(p => !p);
  };

  const initials = (name: string) =>
    name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="career-mentor-section">
      <button
        type="button"
        className="cms-toggle"
        onClick={toggle}
      >
        <span className="cms-toggle-left">
          <Users size={14} />
          <span>Mentor cho nghề này</span>
          {loaded && mentors.length > 0 && (
            <span className="cms-count">{mentors.length}</span>
          )}
        </span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div className="cms-body">
          {loading && (
            <div className="cms-loading">
              <div className="cms-spinner" />
              <span>Đang tìm mentor...</span>
            </div>
          )}

          {!loading && mentors.length === 0 && (
            <div className="cms-empty">
              <p>Chưa có mentor cho nghề này.</p>
              <button
                className="cms-link-btn"
                onClick={() => navigate('/mentor-matching?tab=become-mentor')}
              >
                Trở thành Mentor đầu tiên →
              </button>
            </div>
          )}

          {!loading && mentors.map(m => (
            <div key={m.mentor_id} className="cms-mentor-row">
              <div className="cms-avatar">{initials(m.mentor_name)}</div>
              <div className="cms-info">
                <span className="cms-name">{m.mentor_name}</span>
                <span className="cms-pos">
                  {m.current_position}{m.company ? ` · ${m.company}` : ''}
                </span>
                {m.matching_skills.length > 0 && (
                  <div className="cms-skills">
                    {m.matching_skills.slice(0, 3).map(s => (
                      <span key={s} className="cms-skill-tag">{s}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="cms-score-pill">
                {m.compatibility_score.toFixed(0)}%
              </div>
            </div>
          ))}

          {!loading && (
            <button
              className="cms-see-all"
              onClick={() => navigate('/mentor-matching')}
            >
              <ExternalLink size={13} />
              Xem tất cả Mentor
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CareerMentorSection;
