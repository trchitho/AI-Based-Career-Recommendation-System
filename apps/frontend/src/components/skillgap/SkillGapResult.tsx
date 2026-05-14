import React, { useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  CheckCircle, XCircle, BarChart2, AlertCircle, AlertTriangle,
  Star, Bot, Mic, Download, Target, Circle
} from 'lucide-react';
import { SkillGapAnalysis } from '../../types/skillGap';
import { translateSkillCategory, translateSkillName } from '../../utils/skillTranslation';
import './SkillGapResult.css';

interface SkillGapResultProps {
  analysis: SkillGapAnalysis;
  onStartInterview?: () => void;
}

interface JobCriterion {
  name: string;
  category: string;
  importance: number;
  score: number;
  status: 'matched' | 'missing';
  evidence?: string;
  matchType?: string;
}

const SkillGapResult: React.FC<SkillGapResultProps> = ({ analysis, onStartInterview }) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const getMatchColor = (percentage: number) => {
    if (percentage >= 80) return '#10b981';
    if (percentage >= 60) return '#f59e0b';
    if (percentage >= 40) return '#f97316';
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

  const catalogSkillName = (name?: string) => translateSkillName(name);
  const catalogSkillCategory = (category?: string) => translateSkillCategory(category);

  const getCriterionLabel = (score: number) => {
    if (score >= 80) return 'Đáp ứng tốt';
    if (score >= 55) return 'Đáp ứng một phần';
    if (score > 0) return 'Bằng chứng yếu';
    return 'Chưa có bằng chứng';
  };

  const buildJobCriteria = (): JobCriterion[] => {
    const byName = new Map<string, JobCriterion>();

    (analysis.matched_skills || []).forEach((skill: any) => {
      const jobSkill = skill.onet_skill || skill.job_skill || skill.name;
      const key = String(jobSkill).toLowerCase();
      const matchType = skill.match_type || 'semantic';
      const confidence = Number(skill.confidence ?? 0.75);
      const genericJobSkill = ['programming', 'science', 'systems analysis'].includes(String(jobSkill).toLowerCase());
      const cappedScore = Math.round(Math.min(confidence * 100, matchType === 'direct' ? 90 : genericJobSkill ? 55 : 70));

      byName.set(key, {
        name: jobSkill,
        category: skill.onet_category || skill.job_category || skill.category || 'Kỹ năng nghề',
        importance: Number(skill.importance ?? 0.5),
        score: cappedScore,
        status: 'matched',
        evidence: skill.name,
        matchType,
      });
    });

    [
      ...(analysis.skill_gaps?.critical || []),
      ...(analysis.skill_gaps?.important || []),
      ...(analysis.skill_gaps?.nice_to_have || []),
    ].forEach((skill: any) => {
      const key = String(skill.name).toLowerCase();
      if (!byName.has(key)) {
        byName.set(key, {
          name: skill.name,
          category: skill.category || 'Kỹ năng nghề',
          importance: Number(skill.importance ?? 0.5),
          score: 0,
          status: 'missing',
        });
      }
    });

    return Array.from(byName.values())
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'missing' ? -1 : 1;
        return b.importance - a.importance;
      })
      .slice(0, 8);
  };

  const handleDownloadReport = async () => {
    const reportElement = document.getElementById('skill-gap-report');
    if (!reportElement || isDownloading) return;

    setIsDownloading(true);
    document.body.classList.add('skill-report-exporting');

    try {
      await new Promise(resolve => window.setTimeout(resolve, 120));
      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#f8fafc',
        logging: false,
        windowWidth: reportElement.scrollWidth,
        windowHeight: reportElement.scrollHeight,
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pageContentHeight = pageHeight - margin * 2;

      let heightLeft = imgHeight;
      let position = margin;
      const imageData = canvas.toDataURL('image/png', 1.0);

      pdf.addImage(imageData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= pageContentHeight;

      while (heightLeft > 0) {
        position = margin - (imgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imageData, 'PNG', margin, position, imgWidth, imgHeight);
        heightLeft -= pageContentHeight;
      }

      const date = new Date().toISOString().slice(0, 10);
      const fileBase = (analysis.cv_name || analysis.cv_filename || `skill-gap-${analysis.id}`)
        .replace(/[\\/:*?"<>|]+/g, '-')
        .replace(/\s+/g, '-')
        .slice(0, 80);
      pdf.save(`bao-cao-phan-tich-ky-nang-${fileBase}-${date}.pdf`);
    } finally {
      document.body.classList.remove('skill-report-exporting');
      setIsDownloading(false);
    }
  };

  // Deduplicate matched_skills by name (keep first occurrence = highest importance)
  const uniqueMatchedSkills = analysis.matched_skills.filter(
    (skill, index, self) => index === self.findIndex(s => s.name.toLowerCase() === skill.name.toLowerCase())
  );
  const jobCriteria = buildJobCriteria();

  return (
    <div id="skill-gap-report" className="skill-gap-result">
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
          Đánh giá theo tiêu chí nghề/JD
        </h3>
        <p className="section-description">
          Các tiêu chí bên dưới là kỹ năng yêu cầu của nghề trong catalog. CV chỉ được dùng làm bằng chứng đáp ứng từng tiêu chí, nên kỹ năng ngoài nghề sẽ không được xem là tiêu chí chính.
        </p>
        <div className="criteria-grid">
          {jobCriteria.map((criterion, index) => {
            const score = criterion.score;
            return (
              <div key={index} className={`criteria-card ${criterion.status}`}>
                <div className="criteria-header">
                  <span className="criteria-name">{catalogSkillName(criterion.name)}</span>
                  <span className="criteria-score" style={{ color: getMatchColor(score) }}>
                    {score}%
                  </span>
                </div>
                <div className="criteria-meta">
                  <span>{catalogSkillCategory(criterion.category)}</span>
                  <span>{Math.round(criterion.importance * 100)}% quan trọng</span>
                </div>
                <div className="criteria-bar">
                  <div
                    className="criteria-fill"
                    style={{ width: `${score}%`, backgroundColor: getMatchColor(score) }}
                  />
                </div>
                <p className="criteria-description">
                  {criterion.status === 'matched'
                    ? `${getCriterionLabel(score)}. Bằng chứng trong CV: ${criterion.evidence}.`
                    : 'Chưa tìm thấy bằng chứng rõ ràng trong CV cho tiêu chí này.'}
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
                <span className="skill-name">{catalogSkillName(skill.name)}</span>
                <span className="skill-category">{catalogSkillCategory(skill.category)}</span>
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
                <span className="skill-name">{catalogSkillName(skill.name)}</span>
                <span className="skill-category">{catalogSkillCategory(skill.category)}</span>
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
                <span className="skill-name">{catalogSkillName(skill.name)}</span>
                <span className="skill-category">{catalogSkillCategory(skill.category)}</span>
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
                <span className="skill-name">{catalogSkillName(skill.name)}</span>
                <span className="skill-category">{catalogSkillCategory(skill.category)}</span>
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
              {(() => {
                const pct = analysis.match_percentage;
                const matched = uniqueMatchedSkills.slice(0, 3).map(s => s.name).join(', ');
                const critical = analysis.skill_gaps?.critical?.slice(0, 2).map((s: any) => catalogSkillName(s.name)).join(', ') || '';
                const totalGaps = (analysis.skill_gaps?.critical?.length || 0) + (analysis.skill_gaps?.important?.length || 0);
                if (pct >= 80)
                  return `CV phù hợp ở mức xuất sắc với vị trí này. Ứng viên đã đáp ứng ${analysis.matched_skills_count}/${analysis.total_required_skills} kỹ năng yêu cầu${matched ? `, bao gồm: ${matched}` : ''}. ${totalGaps > 0 ? `Cần bổ sung thêm ${totalGaps} kỹ năng để hoàn thiện hồ sơ.` : 'Hồ sơ rất cạnh tranh cho vị trí này.'}`;
                if (pct >= 60)
                  return `CV có nền tảng tốt với ${analysis.matched_skills_count} kỹ năng phù hợp${matched ? ` (${matched})` : ''}. Cần bổ sung thêm ${totalGaps} kỹ năng quan trọng${critical ? ` như: ${critical}` : ''} để tăng tính cạnh tranh.`;
                if (pct >= 30)
                  return `Ứng viên đang ở giai đoạn phát triển. Đã có ${analysis.matched_skills_count} kỹ năng cơ bản phù hợp. Cần tập trung học thêm ${totalGaps} kỹ năng${critical ? ` quan trọng như: ${critical}` : ''} để đáp ứng yêu cầu công việc.`;
                return `CV cần được cải thiện đáng kể. Hiện chỉ đáp ứng ${analysis.matched_skills_count}/${analysis.total_required_skills} yêu cầu. Khuyến nghị học thêm các kỹ năng cốt lõi${critical ? ` như: ${critical}` : ''} trước khi ứng tuyển.`;
              })()}
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
                      Cần học thêm kỹ năng <strong>{catalogSkillName(skill.name)}</strong> ({catalogSkillCategory(skill.category)})
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

      {/* Action Buttons */}
      <div className="action-buttons">
        {onStartInterview && (
          <button className="action-btn primary" onClick={onStartInterview}>
            <Mic size={16} /> Bắt đầu phỏng vấn AI
          </button>
        )}
        <button className="action-btn secondary" onClick={handleDownloadReport} disabled={isDownloading}>
          <Download size={16} /> {isDownloading ? 'Đang tạo báo cáo...' : 'Tải xuống báo cáo'}
        </button>
      </div>
    </div>
  );
};

export default SkillGapResult;
