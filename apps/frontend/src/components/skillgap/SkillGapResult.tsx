import React from 'react';
import {
  CheckCircle, XCircle, BarChart2, AlertCircle, AlertTriangle,
  Star, Bot, BookOpen, GraduationCap, Tv, Book, Lightbulb,
  Monitor, Mic, Download, Target, Circle
} from 'lucide-react';
import { SkillGapAnalysis } from '../../types/skillGap';
import './SkillGapResult.css';

interface SkillGapResultProps {
  analysis: SkillGapAnalysis;
  onStartInterview?: () => void;
}

const SkillGapResult: React.FC<SkillGapResultProps> = ({ analysis, onStartInterview }) => {
  const getMatchColor = (percentage: number) => {
    if (percentage >= 80) return '#10b981';
    if (percentage >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getMatchLabel = (percentage: number) => {
    if (percentage >= 80) return 'Xuất sắc';
    if (percentage >= 60) return 'Tốt';
    if (percentage >= 40) return 'Khá';
    return 'Cần cải thiện';
  };

  const getPriorityIcon = (importance?: number) => {
    if (importance && importance >= 0.8) return <Circle size={12} fill="#dc2626" color="#dc2626" />;
    if (importance && importance >= 0.5) return <Circle size={12} fill="#ea580c" color="#ea580c" />;
    return <Circle size={12} fill="#ca8a04" color="#ca8a04" />;
  };

  // Deduplicate matched_skills by name (keep first occurrence = highest importance)
  const uniqueMatchedSkills = analysis.matched_skills.filter(
    (skill, index, self) => index === self.findIndex(s => s.name.toLowerCase() === skill.name.toLowerCase())
  );

  return (
    <div className="skill-gap-result">
      {/* Personal Info & Skills Summary */}
      <div className="personal-info-section">
        <div className="info-card">
          <h3 className="info-title">Thông tin chi tiết</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Họ tên:</span>
              <span className="info-value">{analysis.cv_name || 'Không tìm thấy'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Email:</span>
              <span className="info-value">{analysis.cv_email || 'Không tìm thấy'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">SĐT:</span>
              <span className="info-value">{analysis.cv_phone || 'Không tìm thấy'}</span>
            </div>
          </div>
        </div>

        <div className="info-card skills-summary">
          <h3 className="info-title">Kỹ năng</h3>
          <div className="skills-tags">
            {(analysis.cv_skills && analysis.cv_skills.length > 0
              ? analysis.cv_skills
              : analysis.matched_skills
            ).slice(0, 20).map((skill, index) => (
              <span key={index} className="skill-tag">
                {skill.name}
              </span>
            ))}
            {(analysis.cv_skills?.length || analysis.matched_skills?.length || 0) > 20 && (
              <span className="skill-tag more">
                +{(analysis.cv_skills?.length || analysis.matched_skills?.length || 0) - 20} thêm
              </span>
            )}
            {(!analysis.cv_skills || analysis.cv_skills.length === 0) &&
             (!analysis.matched_skills || analysis.matched_skills.length === 0) && (
              <span className="skill-tag">Không phát hiện kỹ năng nào</span>
            )}
          </div>
        </div>
      </div>

      {/* JD Criteria Evaluation */}
      <div className="jd-criteria-section">
        <h3 className="section-title-main">
          Đánh giá theo các tiêu chí của JD
        </h3>
        <div className="criteria-grid">
          {uniqueMatchedSkills.slice(0, 8).map((skill, index) => {
            const confidence = (skill as any).confidence || 0.9;
            const score = Math.round(confidence * 100);
            return (
              <div key={index} className="criteria-item">
                <div className="criteria-header">
                  <span className="criteria-name">{skill.name}</span>
                  <span className="criteria-score" style={{ color: getMatchColor(score) }}>
                    {score}%
                  </span>
                </div>
                <div className="criteria-bar">
                  <div
                    className="criteria-fill"
                    style={{ width: `${score}%`, backgroundColor: getMatchColor(score) }}
                  />
                </div>
                <p className="criteria-description">
                  {`Ứng viên có ${score >= 90 ? 'kỹ năng xuất sắc' : score >= 75 ? 'kỹ năng tốt' : 'kinh nghiệm'} về ${skill.name}${(skill as any).onet_skill && (skill as any).onet_skill !== skill.name ? ` (khớp với yêu cầu: ${(skill as any).onet_skill})` : ''}.`}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Overview Section */}
      <div className="result-overview">
        <div className="overview-card main-score">
          <div className="score-circle" style={{ borderColor: getMatchColor(analysis.match_percentage) }}>
            <span className="score-number">{analysis.match_percentage.toFixed(1)}%</span>
            <span className="score-label">{getMatchLabel(analysis.match_percentage)}</span>
          </div>
        </div>

        <div className="overview-stats">
          <div className="stat-card">
            <span className="stat-icon"><CheckCircle size={22} color="#10b981" /></span>
            <span className="stat-value">{analysis.matched_skills_count}</span>
            <span className="stat-label">Kỹ năng phù hợp</span>
          </div>

          <div className="stat-card">
            <span className="stat-icon"><XCircle size={22} color="#ef4444" /></span>
            <span className="stat-value">{analysis.missing_skills_count}</span>
            <span className="stat-label">Kỹ năng còn thiếu</span>
          </div>

          <div className="stat-card">
            <span className="stat-icon"><BarChart2 size={22} color="#6366f1" /></span>
            <span className="stat-value">{analysis.total_required_skills}</span>
            <span className="stat-label">Tổng yêu cầu</span>
          </div>
        </div>
      </div>

      {/* Matched Skills */}
      {uniqueMatchedSkills.length > 0 && (
        <div className="skills-section strengths-section">
          <h3 className="section-title">
            <span className="title-icon"><CheckCircle size={18} color="#10b981" /></span>
            Điểm mạnh ({uniqueMatchedSkills.length})
          </h3>
          <div className="skills-grid">
            {uniqueMatchedSkills.map((skill, index) => (
              <div key={index} className="skill-badge matched">
                <span className="skill-name">{skill.name}</span>
                <span className="skill-category">{skill.category}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Critical Gaps */}
      {analysis.skill_gaps?.critical && analysis.skill_gaps.critical.length > 0 && (
        <div className="skills-section">
          <h3 className="section-title critical">
            <span className="title-icon"><AlertCircle size={18} color="#dc2626" /></span>
            Điểm cần cải thiện ({analysis.skill_gaps.critical.length})
          </h3>
          <p className="section-description">Những kỹ năng quan trọng cần học để phù hợp với vị trí này.</p>
          <div className="skills-grid">
            {analysis.skill_gaps.critical.map((skill, index) => (
              <div key={index} className="skill-badge critical">
                <span className="skill-name">{skill.name}</span>
                <span className="skill-category">{skill.category}</span>
                <span className="skill-importance">{(skill.importance! * 100).toFixed(0)}% mức độ quan trọng</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Important Gaps */}
      {analysis.skill_gaps?.important && analysis.skill_gaps.important.length > 0 && (
        <div className="skills-section">
          <h3 className="section-title important">
            <span className="title-icon"><AlertTriangle size={18} color="#ea580c" /></span>
            Khoảng cách kỹ năng quan trọng ({analysis.skill_gaps.important.length})
          </h3>
          <p className="section-description">Những kỹ năng này sẽ cải thiện đáng kể cơ hội ứng tuyển của bạn.</p>
          <div className="skills-grid">
            {analysis.skill_gaps.important.map((skill, index) => (
              <div key={index} className="skill-badge important">
                <span className="skill-name">{skill.name}</span>
                <span className="skill-category">{skill.category}</span>
                <span className="skill-importance">{(skill.importance! * 100).toFixed(0)}% mức độ quan trọng</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nice to Have */}
      {analysis.skill_gaps?.nice_to_have && analysis.skill_gaps.nice_to_have.length > 0 && (
        <div className="skills-section">
          <h3 className="section-title nice-to-have">
            <span className="title-icon"><Target size={18} color="#ca8a04" /></span>
            Kỹ năng nên có ({analysis.skill_gaps.nice_to_have.length})
          </h3>
          <p className="section-description">Những kỹ năng này có ích nhưng không bắt buộc.</p>
          <div className="skills-grid">
            {analysis.skill_gaps.nice_to_have.map((skill, index) => (
              <div key={index} className="skill-badge nice-to-have">
                <span className="skill-name">{skill.name}</span>
                <span className="skill-category">{skill.category}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extra Skills */}
      {analysis.extra_skills.length > 0 && (
        <div className="skills-section">
          <h3 className="section-title extra">
            <span className="title-icon"><Star size={18} color="#f59e0b" /></span>
            Kỹ năng bổ sung ({analysis.extra_skills.length})
          </h3>
          <p className="section-description">Những kỹ năng bạn có nhưng không bắt buộc, tuy nhiên vẫn tạo thêm giá trị.</p>
          <div className="skills-grid">
            {analysis.extra_skills.map((skill, index) => (
              <div key={index} className="skill-badge extra">
                <span className="skill-name">{skill.name}</span>
                <span className="skill-category">{skill.category}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Recommendations Section */}
      <div className="ai-recommendations-section">
        <h3 className="section-title-main">
          <span className="title-icon"><Bot size={20} color="#6366f1" /></span>
          Tổng hợp AI
        </h3>

        <div className="ai-summary-card">
          <div className="ai-score-badge">
            <div className="ai-score-circle">{analysis.match_percentage.toFixed(0)}</div>
            <div className="ai-score-label">{getMatchLabel(analysis.match_percentage)}</div>
          </div>

          <div className="ai-summary-content">
            <h4>{analysis.cv_name || 'Ứng viên'}</h4>
            <p className="ai-description">
              {analysis.match_percentage >= 80 &&
                `Là người điểm tĩnh, thích nghỉ nhanh với môi trường mới, không ngại khó khăn, quan tâm đến việc tìm kiếm giải pháp cho vấn đề. Với kiến thức cơ bản về ${uniqueMatchedSkills.slice(0, 3).map(s => s.name).join(', ')} cùng kinh nghiệm triển khai một số dự án web cá nhân, ứng viên mong muốn học hỏi và phát triển trong lĩnh vực phát triển web backend sử dụng ${uniqueMatchedSkills[0]?.name || 'công nghệ hiện đại'}, sẵn sàng khám phá công nghệ mới và đóng góp vào đội ngũ kỹ thuật.`
              }
              {analysis.match_percentage >= 60 && analysis.match_percentage < 80 &&
                `Ứng viên có nền tảng tốt với ${analysis.matched_skills_count} kỹ năng phù hợp. Cần bổ sung thêm ${analysis.missing_skills_count} kỹ năng quan trọng để đạt mức độ phù hợp cao hơn với vị trí này.`
              }
              {analysis.match_percentage < 60 &&
                `Ứng viên đang ở giai đoạn phát triển với ${analysis.matched_skills_count} kỹ năng cơ bản. Cần tập trung học tập và rèn luyện thêm ${analysis.missing_skills_count} kỹ năng thiếu để đáp ứng yêu cầu công việc.`
              }
            </p>
          </div>
        </div>

        <div className="strengths-weaknesses-grid">
          <div className="sw-card strengths-card">
            <h4 className="sw-title">Điểm mạnh</h4>
            <ul className="sw-list">
              {uniqueMatchedSkills.length > 0 ? (
                uniqueMatchedSkills.slice(0, 5).map((skill, index) => (
                  <li key={index}>
                    {`${skill.name}`}
                    {skill.importance && skill.importance >= 0.8 && ` — kỹ năng cốt lõi (${Math.round(skill.importance * 100)}% quan trọng)`}
                    {skill.importance && skill.importance >= 0.5 && skill.importance < 0.8 && ` — kỹ năng quan trọng (${Math.round(skill.importance * 100)}% quan trọng)`}
                    {(!skill.importance || skill.importance < 0.5) && ` — kỹ năng bổ sung hữu ích`}
                  </li>
                ))
              ) : (
                <li>Chưa phát hiện được điểm mạnh. Vui lòng đảm bảo CV của bạn có đầy đủ thông tin.</li>
              )}
            </ul>
          </div>

          <div className="sw-card weaknesses-card">
            <h4 className="sw-title">Điểm cần cải thiện</h4>
            <ul className="sw-list">
              {(() => {
                const allGaps = [
                  ...(analysis.skill_gaps?.critical || []),
                  ...(analysis.skill_gaps?.important || []),
                  ...(analysis.skill_gaps?.nice_to_have || [])
                ];
                if (allGaps.length > 0) {
                  return allGaps.slice(0, 5).map((skill, index) => (
                    <li key={index}>
                      Cần học thêm kỹ năng <strong>{skill.name}</strong> ({skill.category})
                      {skill.importance && skill.importance >= 0.8 && ' - Rất quan trọng'}
                      {skill.importance && skill.importance >= 0.5 && skill.importance < 0.8 && ' - Quan trọng'}
                      {skill.importance && skill.importance < 0.5 && ' - Nên có'}
                    </li>
                  ));
                } else if (analysis.missing_skills_count > 0) {
                  return (
                    <>
                      <li>Cần bổ sung thêm <strong>{analysis.missing_skills_count} kỹ năng</strong> để phù hợp hơn.</li>
                      <li>Khuyến nghị tham gia các khóa học và dự án thực tế.</li>
                      <li>Tập trung vào các kỹ năng cốt lõi của ngành nghề mục tiêu.</li>
                    </>
                  );
                } else if (analysis.match_percentage < 100) {
                  return (
                    <>
                      <li>Tiếp tục học hỏi và phát triển kỹ năng.</li>
                      <li>Tham gia các dự án thực tế để tích lũy kinh nghiệm.</li>
                      <li>Cập nhật CV với các kỹ năng và dự án mới nhất.</li>
                    </>
                  );
                } else {
                  return <li>Bạn đã có đầy đủ các kỹ năng cần thiết cho vị trí này!</li>;
                }
              })()}
            </ul>
          </div>
        </div>
      </div>

      {/* Recommended Learning Path */}
      {analysis.match_percentage < 100 && (
        <div className="learning-path-section">
          <h3 className="section-title-main">
            <span className="title-icon"><BookOpen size={20} color="#16a34a" /></span>
            Lộ trình học tập được đề xuất
          </h3>
          <p className="section-description">
            Lộ trình học tập được AI đề xuất dựa trên kỹ năng bạn cần bổ sung
          </p>

          <div className="learning-path-grid">
            {(() => {
              const allGaps = [
                ...(analysis.skill_gaps?.critical || []),
                ...(analysis.skill_gaps?.important || []),
                ...(analysis.skill_gaps?.nice_to_have || [])
              ];

              if (allGaps.length > 0) {
                return allGaps.slice(0, 6).map((skill, index) => (
                  <div key={index} className="learning-card">
                    <div className="learning-header">
                      <span className="learning-icon">{getPriorityIcon(skill.importance)}</span>
                      <h4 className="learning-skill">{skill.name}</h4>
                    </div>
                    <p className="learning-category">{skill.category}</p>
                    <div className="learning-resources">
                      <a href={`https://www.udemy.com/courses/search/?q=${encodeURIComponent(skill.name)}`}
                         target="_blank" rel="noopener noreferrer" className="resource-link">
                        <GraduationCap size={14} /> Khóa học Udemy
                      </a>
                      <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(skill.name + ' tutorial')}`}
                         target="_blank" rel="noopener noreferrer" className="resource-link">
                        <Tv size={14} /> Video YouTube
                      </a>
                      <a href={`https://www.google.com/search?q=${encodeURIComponent(skill.name + ' documentation')}`}
                         target="_blank" rel="noopener noreferrer" className="resource-link">
                        <Book size={14} /> Tài liệu
                      </a>
                    </div>
                    <div className="learning-priority">
                      {skill.importance && skill.importance >= 0.8 && (
                        <span className="priority-badge critical">Ưu tiên cao</span>
                      )}
                      {skill.importance && skill.importance >= 0.5 && skill.importance < 0.8 && (
                        <span className="priority-badge important">Ưu tiên trung bình</span>
                      )}
                      {skill.importance && skill.importance < 0.5 && (
                        <span className="priority-badge nice">Nên học</span>
                      )}
                    </div>
                  </div>
                ));
              } else {
                return (
                  <div className="learning-card generic">
                    <div className="learning-header">
                      <span className="learning-icon"><Lightbulb size={18} color="#f59e0b" /></span>
                      <h4 className="learning-skill">Tiếp tục phát triển</h4>
                    </div>
                    <p className="learning-description">
                      Tham gia các khóa học và dự án thực tế để nâng cao kỹ năng hiện có.
                    </p>
                    <div className="learning-resources">
                      <a href="https://www.coursera.org/" target="_blank" rel="noopener noreferrer" className="resource-link">
                        <GraduationCap size={14} /> Coursera
                      </a>
                      <a href="https://www.udemy.com/" target="_blank" rel="noopener noreferrer" className="resource-link">
                        <GraduationCap size={14} /> Udemy
                      </a>
                      <a href="https://www.freecodecamp.org/" target="_blank" rel="noopener noreferrer" className="resource-link">
                        <Monitor size={14} /> FreeCodeCamp
                      </a>
                    </div>
                  </div>
                );
              }
            })()}
          </div>

          {analysis.missing_skills_count > 0 && (
            <div className="learning-summary">
              <p>
                <BarChart2 size={16} style={{ display: 'inline', marginRight: 4 }} />
                Tổng quan: Bạn cần học thêm <strong>{analysis.missing_skills_count} kỹ năng</strong> để đạt mức độ phù hợp cao hơn.
                Ước tính thời gian: <strong>{Math.ceil(analysis.missing_skills_count * 2)} - {Math.ceil(analysis.missing_skills_count * 4)} tuần</strong>.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="action-buttons">
        {onStartInterview && (
          <button className="action-btn primary" onClick={onStartInterview}>
            <Mic size={16} /> Bắt đầu phỏng vấn AI
          </button>
        )}
        <button className="action-btn secondary">
          <BookOpen size={16} /> Tài nguyên học tập
        </button>
        <button className="action-btn secondary">
          <Download size={16} /> Tải xuống báo cáo
        </button>
      </div>
    </div>
  );
};

export default SkillGapResult;
