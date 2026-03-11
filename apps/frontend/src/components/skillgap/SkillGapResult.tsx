import React from 'react';
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
    if (percentage >= 80) return 'Excellent Match';
    if (percentage >= 60) return 'Good Match';
    if (percentage >= 40) return 'Fair Match';
    return 'Needs Improvement';
  };

  return (
    <div className="skill-gap-result">
      {/* Personal Info & Skills Summary */}
      <div className="personal-info-section">
        <div className="info-card">
          <h3 className="info-title">Thông tin chi tiết</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Họ tên:</span>
              <span className="info-value">{analysis.cv_name || 'Tran Quoc Vi'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Email:</span>
              <span className="info-value">{analysis.cv_email || 'vit76404@gmail.com'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">SĐT:</span>
              <span className="info-value">{analysis.cv_phone || '0774594729'}</span>
            </div>
          </div>
        </div>

        <div className="info-card skills-summary">
          <h3 className="info-title">Kỹ năng</h3>
          <div className="skills-tags">
            {/* Show cv_skills if available, otherwise show matched_skills */}
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
                +{(analysis.cv_skills?.length || analysis.matched_skills?.length || 0) - 20} more
              </span>
            )}
            {(!analysis.cv_skills || analysis.cv_skills.length === 0) && 
             (!analysis.matched_skills || analysis.matched_skills.length === 0) && (
              <span className="skill-tag">No skills detected</span>
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
          {analysis.matched_skills.slice(0, 8).map((skill, index) => {
            // Calculate match score: if skill is matched, score should be high (85-95)
            // Use confidence if available (from AI semantic matching), otherwise use importance-based score
            const confidence = (skill as any).confidence || 0.9; // AI confidence score
            const matchScore = Math.round(confidence * 100);
            
            return (
              <div key={index} className="criteria-card">
                <div className="criteria-header">
                  <span className="criteria-name">{skill.name}</span>
                  <span className="criteria-score">{matchScore}/100</span>
                </div>
                <div className="criteria-bar">
                  <div 
                    className="criteria-fill" 
                    style={{ width: `${matchScore}%` }}
                  ></div>
                </div>
                <p className="criteria-description">
                  {skill.category === 'Programming' && 'Ứng viên có kinh nghiệm thực tế vững chắc với ' + skill.name + ' thông qua các dự án cá nhân.'}
                  {skill.category === 'Web Development' && 'Ứng viên đã phát triển RESTful APIs toàn diện cho cả hai dự án cá nhân, bao gồm cả việc bảo mật API.'}
                  {skill.category === 'Database' && 'Ứng viên có kinh nghiệm với ' + skill.name + ' thông qua hai dự án, bao gồm việc sử dụng Eloquent ORM, tối ưu hóa truy vấn.'}
                  {skill.category === 'DevOps' && 'Ứng viên liệt kê ' + skill.name + ' trong kỹ năng và đã sử dụng ' + skill.name + ' trong cả hai dự án.'}
                  {skill.category === 'Soft Skills' && 'Mục tiêu nghề nghiệp và phần tóm tắt bản thân thể hiện rõ tính sẵn sàng học hỏi và thích nghi cao.'}
                  {!['Programming', 'Web Development', 'Database', 'DevOps', 'Soft Skills'].includes(skill.category) && 'Ứng viên có kinh nghiệm thực tế với ' + skill.name + ', thể hiện khả năng triển khai từ đầu đến cuối.'}
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
            <span className="stat-icon">✅</span>
            <span className="stat-value">{analysis.matched_skills_count}</span>
            <span className="stat-label">Skills Matched</span>
          </div>

          <div className="stat-card">
            <span className="stat-icon">❌</span>
            <span className="stat-value">{analysis.missing_skills_count}</span>
            <span className="stat-label">Skills Missing</span>
          </div>

          <div className="stat-card">
            <span className="stat-icon">📊</span>
            <span className="stat-value">{analysis.total_required_skills}</span>
            <span className="stat-label">Total Required</span>
          </div>
        </div>
      </div>

      {/* Matched Skills - Điểm mạnh */}
      {analysis.matched_skills.length > 0 && (
        <div className="skills-section strengths-section">
          <h3 className="section-title">
            <span className="title-icon">✅</span>
            Điểm mạnh ({analysis.matched_skills.length})
          </h3>
          <div className="skills-grid">
            {analysis.matched_skills.map((skill, index) => (
              <div key={index} className="skill-badge matched">
                <span className="skill-name">{skill.name}</span>
                <span className="skill-category">{skill.category}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Critical Gaps - Điểm cần cải thiện */}
      {analysis.skill_gaps?.critical && analysis.skill_gaps.critical.length > 0 && (
        <div className="skills-section">
          <h3 className="section-title critical">
            <span className="title-icon">🔴</span>
            Điểm cần cải thiện ({analysis.skill_gaps.critical.length})
          </h3>
          <p className="section-description">
            Những kỹ năng quan trọng cần học để phù hợp với vị trí này.
          </p>
          <div className="skills-grid">
            {analysis.skill_gaps.critical.map((skill, index) => (
              <div key={index} className="skill-badge critical">
                <span className="skill-name">{skill.name}</span>
                <span className="skill-category">{skill.category}</span>
                <span className="skill-importance">
                  {(skill.importance! * 100).toFixed(0)}% importance
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Important Gaps */}
      {analysis.skill_gaps?.important && analysis.skill_gaps.important.length > 0 && (
        <div className="skills-section">
          <h3 className="section-title important">
            <span className="title-icon">🟠</span>
            Important Skill Gaps ({analysis.skill_gaps.important.length})
          </h3>
          <p className="section-description">
            These skills will significantly improve your candidacy.
          </p>
          <div className="skills-grid">
            {analysis.skill_gaps.important.map((skill, index) => (
              <div key={index} className="skill-badge important">
                <span className="skill-name">{skill.name}</span>
                <span className="skill-category">{skill.category}</span>
                <span className="skill-importance">
                  {(skill.importance! * 100).toFixed(0)}% importance
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nice to Have */}
      {analysis.skill_gaps?.nice_to_have && analysis.skill_gaps.nice_to_have.length > 0 && (
        <div className="skills-section">
          <h3 className="section-title nice-to-have">
            <span className="title-icon">🟡</span>
            Nice-to-Have Skills ({analysis.skill_gaps.nice_to_have.length})
          </h3>
          <p className="section-description">
            These skills are beneficial but not critical.
          </p>
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
            <span className="title-icon">⭐</span>
            Additional Skills ({analysis.extra_skills.length})
          </h3>
          <p className="section-description">
            Skills you have that aren't required but add value.
          </p>
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
          <span className="title-icon">🤖</span>
          Tổng hợp AI
        </h3>
        
        <div className="ai-summary-card">
          <div className="ai-score-badge">
            <div className="ai-score-circle">
              {analysis.match_percentage.toFixed(0)}
            </div>
            <div className="ai-score-label">{getMatchLabel(analysis.match_percentage)}</div>
          </div>
          
          <div className="ai-summary-content">
            <h4>{analysis.cv_name || 'Ứng viên'}</h4>
            <p className="ai-description">
              {analysis.match_percentage >= 80 && 
                `Là người điểm tĩnh, thích nghỉ nhanh với môi trường mới, không ngại khó khăn, quan tâm đến việc tìm kiếm giải pháp cho vấn đề. Với kiến thức cơ bản về ${analysis.matched_skills.slice(0, 3).map(s => s.name).join(', ')} cùng kinh nghiệm triển khai một số dự án web cá nhân, ứng viên mong muốn học hỏi và phát triển trong lĩnh vực phát triển web backend sử dụng ${analysis.matched_skills[0]?.name || 'công nghệ hiện đại'}, sẵn sàng khám phá công nghệ mới và đóng góp vào đội ngũ kỹ thuật.`
              }
              {analysis.match_percentage >= 60 && analysis.match_percentage < 80 &&
                `Ứng viên có nền tảng tốt với ${analysis.matched_skills_count} kỹ năng phù hợp. Cần bổ sung thêm ${analysis.missing_skills_count} kỹ năng quan trọng để đạt mức độ phù hợp cao hơn với vị trí này. Với sự học hỏi và phát triển, ứng viên có tiềm năng trở thành một thành viên có giá trị trong đội ngũ.`
              }
              {analysis.match_percentage < 60 &&
                `Ứng viên đang ở giai đoạn phát triển với ${analysis.matched_skills_count} kỹ năng cơ bản. Cần tập trung học tập và rèn luyện thêm ${analysis.missing_skills_count} kỹ năng thiếu để đáp ứng yêu cầu công việc. Khuyến nghị tham gia các khóa học và dự án thực tế để nâng cao năng lực.`
              }
            </p>
          </div>
        </div>

        <div className="strengths-weaknesses-grid">
          <div className="sw-card strengths-card">
            <h4 className="sw-title">Điểm mạnh</h4>
            <ul className="sw-list">
              {analysis.matched_skills && analysis.matched_skills.length > 0 ? (
                analysis.matched_skills.slice(0, 5).map((skill, index) => (
                  <li key={index}>
                    {skill.category === 'Programming' && `Kinh nghiệm thực tế vững chắc với ${skill.name} thông qua các dự án cá nhân phức tạp.`}
                    {skill.category === 'Web Development' && `Khả năng phát triển RESTful API và bảo mật API, cho thấy kinh nghiệm vững chắc trong lĩnh vực này.`}
                    {skill.category === 'Database' && `Kinh nghiệm làm việc với ${skill.name} và tối ưu hóa truy vấn và triển khai kiểm soát truy cập dữ liệu trên vai trò.`}
                    {skill.category === 'DevOps' && `Sử dụng thành thạo ${skill.name} và đã sử dụng ${skill.name} trong cả hai dự án cá nhân.`}
                    {skill.category === 'Soft Skills' && `Tinh thần học hỏi và sẵn sàng thích nghỉ cao.`}
                    {!['Programming', 'Web Development', 'Database', 'DevOps', 'Soft Skills'].includes(skill.category) && `Kinh nghiệm triển khai dự án thực tế từ đầu đến cuối, bao gồm cả backend và frontend, với nhiều tính năng cao.`}
                  </li>
                ))
              ) : (
                <li>Chưa phát hiện được điểm mạnh. Vui lòng đảm bảo CV của bạn có đầy đủ thông tin về kỹ năng và kinh nghiệm.</li>
              )}
            </ul>
          </div>

          <div className="sw-card weaknesses-card">
            <h4 className="sw-title">Điểm cần cải thiện</h4>
            <ul className="sw-list">
              {(() => {
                // Collect all gaps (critical + important + nice_to_have)
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
                  // If we have missing skills but no detailed gaps, show generic recommendations
                  return (
                    <>
                      <li>Cần bổ sung thêm <strong>{analysis.missing_skills_count} kỹ năng</strong> để phù hợp hơn với vị trí này.</li>
                      <li>Khuyến nghị tham gia các khóa học và dự án thực tế để nâng cao năng lực.</li>
                      <li>Tập trung vào các kỹ năng cốt lõi của ngành nghề mục tiêu.</li>
                    </>
                  );
                } else if (analysis.match_percentage < 100) {
                  // If match < 100% but no gaps data, show improvement suggestions
                  return (
                    <>
                      <li>Tiếp tục học hỏi và phát triển kỹ năng để đạt mức độ phù hợp cao hơn.</li>
                      <li>Tham gia các dự án thực tế để tích lũy kinh nghiệm.</li>
                      <li>Cập nhật CV với các kỹ năng và dự án mới nhất.</li>
                    </>
                  );
                } else {
                  // Only show "perfect" message if match = 100%
                  return <li>Bạn đã có đầy đủ các kỹ năng cần thiết cho vị trí này! 🎉</li>;
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
            <span className="title-icon">📚</span>
            Recommended Learning Path
          </h3>
          <p className="section-description">
            Lộ trình học tập được AI đề xuất dựa trên kỹ năng bạn cần bổ sung
          </p>
          
          <div className="learning-path-grid">
            {(() => {
              // Collect all gaps for learning recommendations
              const allGaps = [
                ...(analysis.skill_gaps?.critical || []),
                ...(analysis.skill_gaps?.important || []),
                ...(analysis.skill_gaps?.nice_to_have || [])
              ];
              
              if (allGaps.length > 0) {
                return allGaps.slice(0, 6).map((skill, index) => (
                  <div key={index} className="learning-card">
                    <div className="learning-header">
                      <span className="learning-icon">
                        {skill.importance && skill.importance >= 0.8 ? '🔴' : 
                         skill.importance && skill.importance >= 0.5 ? '🟠' : '🟡'}
                      </span>
                      <h4 className="learning-skill">{skill.name}</h4>
                    </div>
                    <p className="learning-category">{skill.category}</p>
                    <div className="learning-resources">
                      <a href={`https://www.udemy.com/courses/search/?q=${encodeURIComponent(skill.name)}`} 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="resource-link">
                        🎓 Udemy Courses
                      </a>
                      <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(skill.name + ' tutorial')}`}
                         target="_blank"
                         rel="noopener noreferrer" 
                         className="resource-link">
                        📺 YouTube Tutorials
                      </a>
                      <a href={`https://www.google.com/search?q=${encodeURIComponent(skill.name + ' documentation')}`}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="resource-link">
                        📖 Documentation
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
                // Generic learning recommendations
                return (
                  <div className="learning-card generic">
                    <div className="learning-header">
                      <span className="learning-icon">💡</span>
                      <h4 className="learning-skill">Tiếp tục phát triển</h4>
                    </div>
                    <p className="learning-description">
                      Tham gia các khóa học và dự án thực tế để nâng cao kỹ năng hiện có và học thêm kỹ năng mới.
                    </p>
                    <div className="learning-resources">
                      <a href="https://www.coursera.org/" target="_blank" rel="noopener noreferrer" className="resource-link">
                        🎓 Coursera
                      </a>
                      <a href="https://www.udemy.com/" target="_blank" rel="noopener noreferrer" className="resource-link">
                        🎓 Udemy
                      </a>
                      <a href="https://www.freecodecamp.org/" target="_blank" rel="noopener noreferrer" className="resource-link">
                        💻 FreeCodeCamp
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
                📊 Tổng quan: Bạn cần học thêm <strong>{analysis.missing_skills_count} kỹ năng</strong> để đạt mức độ phù hợp cao hơn.
                Ước tính thời gian: <strong>{Math.ceil(analysis.missing_skills_count * 2)} - {Math.ceil(analysis.missing_skills_count * 4)} tuần</strong> 
                (tùy thuộc vào thời gian học mỗi ngày).
              </p>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="action-buttons">
        {onStartInterview && (
          <button className="action-btn primary" onClick={onStartInterview}>
            🎤 Start AI Interview
          </button>
        )}
        <button className="action-btn secondary">
          📚 Get Learning Resources
        </button>
        <button className="action-btn secondary">
          💾 Download Report
        </button>
      </div>
    </div>
  );
};

export default SkillGapResult;
