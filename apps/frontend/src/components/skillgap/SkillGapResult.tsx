import React, { useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  CheckCircle, XCircle, BarChart2, AlertCircle, AlertTriangle,
  Star, Bot, Mic, Download, Target
} from 'lucide-react';
import { SkillGapAnalysis } from '../../types/skillGap';
import { translateSkillCategory, translateSkillName } from '../../utils/skillTranslation';
import './SkillGapResult.css';

interface SkillGapResultProps {
  analysis: SkillGapAnalysis;
  onStartInterview?: () => void;
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

  const catalogSkillName = (name?: string) => translateSkillName(name);
  const catalogSkillCategory = (category?: string) => translateSkillCategory(category);

  const getPriorityLabel = (importance?: number) => {
    if ((importance || 0) >= 0.8) return 'Ưu tiên rất cao';
    if ((importance || 0) >= 0.65) return 'Ưu tiên cao';
    if ((importance || 0) >= 0.5) return 'Ưu tiên vừa';
    return 'Bổ trợ';
  };

  const getKsaTypeLabel = (type?: string) => {
    if (type === 'knowledge') return 'Kiến thức';
    if (type === 'ability') return 'Năng lực';
    return 'Kỹ năng';
  };

  const getSkillDescription = (skill: { description_vn?: string; description_en?: string }) => (
    skill.description_vn || skill.description_en || ''
  );

  const getSkillAction = (skill: { name: string; category?: string; importance?: number }, level: 'critical' | 'important' | 'nice' | 'extra') => {
    const name = catalogSkillName(skill.name).toLowerCase();
    const category = catalogSkillCategory(skill.category);
    if (level === 'extra') {
      return `Đây là kỹ năng đang có trong CV, thuộc nhóm ${category.toLowerCase()}, không phải yêu cầu chính của nghề mục tiêu.`;
    }
    if (name.includes('lắng nghe') || name.includes('giao tiếp') || name.includes('nhạy bén xã hội')) {
      return 'Bổ sung ví dụ chăm sóc, tư vấn, phối hợp với bệnh nhân/đồng đội để chứng minh năng lực này.';
    }
    if (name.includes('phán đoán') || name.includes('quyết định') || name.includes('tư duy') || name.includes('giải quyết')) {
      return 'Chuẩn bị 1-2 tình huống thực tế: vấn đề, cách đánh giá lựa chọn, quyết định và kết quả.';
    }
    if (category.toLowerCase().includes('quản lý')) {
      return 'Thể hiện bằng trải nghiệm sắp xếp lịch, phân bổ nguồn lực, theo dõi tiến độ hoặc ưu tiên công việc.';
    }
    return 'Cần có bằng chứng cụ thể trong CV: khóa học, chứng chỉ, dự án, ca làm việc hoặc trách nhiệm đã đảm nhiệm.';
  };

  const priorityText = (items: string[]) => {
    const filtered = items.filter(Boolean);
    if (filtered.length === 0) return 'Ba kỹ năng quan trọng nhất';
    return filtered.join(', ');
  };

  const inferCvSkillDomain = (skills: Array<{ name?: string; category?: string }>) => {
    const text = skills.map((s) => `${s.name || ''} ${s.category || ''}`).join(' ').toLowerCase();
    if (/react|frontend|backend|node|express|typescript|javascript|api|database|postgres|mongodb|spring|fastapi|fullstack/.test(text)) {
      if (/react|frontend/.test(text) && /backend|node|express|api|database|spring|fastapi/.test(text)) return 'IT/Phần mềm - Fullstack';
      if (/backend|node|express|api|database|spring|fastapi/.test(text)) return 'IT/Phần mềm - Backend';
      if (/react|frontend|typescript|javascript/.test(text)) return 'IT/Phần mềm - Frontend';
      return 'IT/Phần mềm';
    }
    if (/ai|nlp|machine learning|data|pandas|numpy|model|vector/.test(text)) return 'AI / Dữ liệu';
    return 'ngoài nghề mục tiêu';
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
  const criticalGaps = analysis.skill_gaps?.critical || [];
  const importantGaps = analysis.skill_gaps?.important || [];
  const niceToHaveGaps = analysis.skill_gaps?.nice_to_have || [];
  const allGaps = [...criticalGaps, ...importantGaps, ...niceToHaveGaps];
  const computedMissingCount = allGaps.length;
  const computedTotalRequired = uniqueMatchedSkills.length + computedMissingCount;
  const computedMatchedCount = uniqueMatchedSkills.length;
  const computedCoverage = computedTotalRequired > 0
    ? (computedMatchedCount / computedTotalRequired) * 100
    : analysis.match_percentage;
  const extraSkills = analysis.extra_skills || [];
  const cvSkillDomain = inferCvSkillDomain([...(analysis.cv_skills || []), ...extraSkills]);

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

      {/* Overview Section */}
      <div className="result-overview">
        <div className="overview-card main-score">
          <div className="score-circle" style={{ borderColor: getMatchColor(analysis.match_percentage) }}>
            <span className="score-number">{analysis.match_percentage.toFixed(1)}%</span>
            <span className="score-label">{getMatchLabel(analysis.match_percentage)}</span>
          </div>
          <p className="score-caption">
            Điểm có trọng số theo mức độ quan trọng của từng kỹ năng. Tỷ lệ đếm thuần: {computedCoverage.toFixed(1)}%.
          </p>
        </div>

        <div className="overview-stats">
          <div className="stat-card">
            <span className="stat-icon"><CheckCircle size={22} color="#10b981" /></span>
            <span className="stat-value">{computedMatchedCount}</span>
            <span className="stat-label">Kỹ năng phù hợp</span>
          </div>

          <div className="stat-card">
            <span className="stat-icon"><XCircle size={22} color="#ef4444" /></span>
            <span className="stat-value">{computedMissingCount}</span>
            <span className="stat-label">Kỹ năng còn thiếu</span>
          </div>

          <div className="stat-card">
            <span className="stat-icon"><BarChart2 size={22} color="#6366f1" /></span>
            <span className="stat-value">{computedTotalRequired}</span>
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
      {criticalGaps.length > 0 && (
        <div className="skills-section">
          <h3 className="section-title critical">
            <span className="title-icon"><AlertCircle size={18} color="#dc2626" /></span>
            Điểm cần cải thiện ({criticalGaps.length})
          </h3>
          <p className="section-description">Những kỹ năng quan trọng cần học để phù hợp với vị trí này.</p>
          <div className="skills-grid">
            {criticalGaps.map((skill, index) => (
              <div key={index} className="skill-badge critical">
                <span className="skill-name">{catalogSkillName(skill.name)}</span>
                <span className="skill-category">{catalogSkillCategory(skill.category)}</span>
                <span className="skill-importance">{(skill.importance! * 100).toFixed(0)}% mức độ quan trọng</span>
                {getSkillDescription(skill) && (
                  <p className="skill-description">{getSkillDescription(skill)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Important Gaps */}
      {importantGaps.length > 0 && (
        <div className="skills-section skills-section-featured important-section">
          <h3 className="section-title important">
            <span className="title-icon"><AlertTriangle size={18} color="#ea580c" /></span>
            Khoảng cách kỹ năng quan trọng ({importantGaps.length})
          </h3>
          <p className="section-description">
            Đây là nhóm nên ưu tiên trước vì ảnh hưởng trực tiếp đến khả năng vượt qua lọc CV và phỏng vấn chuyên môn.
          </p>
          <div className="skills-grid insight-grid">
            {importantGaps.map((skill, index) => (
              <div key={index} className="skill-badge skill-insight-card important">
                <div className="skill-card-top">
                  <span className="skill-priority">{getPriorityLabel(skill.importance)}</span>
                  <span className="skill-weight">{((skill.importance || 0) * 100).toFixed(0)}%</span>
                </div>
                <span className="skill-name">{catalogSkillName(skill.name)}</span>
                <span className="skill-category">{getKsaTypeLabel(skill.ksa_type)} - {catalogSkillCategory(skill.category)}</span>
                {getSkillDescription(skill) && (
                  <p className="skill-description">{getSkillDescription(skill)}</p>
                )}
                <p className="skill-action">{getSkillAction(skill, 'important')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nice to Have */}
      {niceToHaveGaps.length > 0 && (
        <div className="skills-section skills-section-featured nice-section">
          <h3 className="section-title nice-to-have">
            <span className="title-icon"><Target size={18} color="#ca8a04" /></span>
            Kỹ năng nên có ({niceToHaveGaps.length})
          </h3>
          <p className="section-description">
            Nhóm này không phải điều kiện loại trực tiếp, nhưng giúp CV trông đầy đủ hơn khi bạn đã xử lý các khoảng cách quan trọng.
          </p>
          <div className="skills-grid compact-insight-grid">
            {niceToHaveGaps.map((skill, index) => (
              <div key={index} className="skill-badge skill-insight-card nice-to-have">
                <div className="skill-card-top">
                  <span className="skill-priority">{getPriorityLabel(skill.importance)}</span>
                  <span className="skill-weight">{((skill.importance || 0) * 100).toFixed(0)}%</span>
                </div>
                <span className="skill-name">{catalogSkillName(skill.name)}</span>
                <span className="skill-category">{getKsaTypeLabel(skill.ksa_type)} - {catalogSkillCategory(skill.category)}</span>
                {getSkillDescription(skill) && (
                  <p className="skill-description">{getSkillDescription(skill)}</p>
                )}
                <p className="skill-action">{getSkillAction(skill, 'nice')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extra Skills */}
      {extraSkills.length > 0 && (
        <div className="skills-section skills-section-featured extra-section">
          <h3 className="section-title extra">
            <span className="title-icon"><Star size={18} color="#f59e0b" /></span>
            Kỹ năng ngoài nghề mục tiêu trong CV: {cvSkillDomain} ({extraSkills.length})
          </h3>
          <p className="section-description">
            Đây là các kỹ năng hệ thống đọc được từ CV của bạn nhưng không thuộc yêu cầu chính của nghề đang so sánh. Chúng được giữ để bạn hiểu hồ sơ hiện tại nghiêng về ngành nào, không dùng để tính thiếu kỹ năng của nghề mục tiêu.
          </p>
          <div className="scope-note">
            Ví dụ: nếu nghề mục tiêu là Biên tập viên phim và video nhưng CV có Pandas, NumPy, Postman, hệ thống sẽ xem đó là tín hiệu CV thuộc hướng IT/Dữ liệu, không phải kỹ năng cần học cho nghề biên tập phim.
          </div>
          <div className="skills-grid compact-insight-grid">
            {extraSkills.map((skill, index) => (
              <div key={index} className="skill-badge skill-insight-card extra">
                <span className="skill-name">{catalogSkillName(skill.name)}</span>
                <span className="skill-category">{catalogSkillCategory(skill.category)}</span>
                <p className="skill-action">{getSkillAction(skill, 'extra')}</p>
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
                const priority = [...criticalGaps, ...importantGaps].slice(0, 3).map((s: any) => catalogSkillName(s.name)).join(', ');
                const topCategory = allGaps[0]?.category ? catalogSkillCategory(allGaps[0].category) : '';
                if (pct >= 80)
                  return `CV đang phù hợp ở mức cao. Ứng viên có ${computedMatchedCount}/${computedTotalRequired} kỹ năng yêu cầu${matched ? `, nổi bật là: ${matched}` : ''}. Bước tiếp theo là bổ sung bằng chứng định lượng trong CV và chuẩn bị ví dụ phỏng vấn cho các kỹ năng còn thiếu${priority ? `: ${priority}` : ''}.`;
                if (pct >= 60)
                  return `CV có nền tảng dùng được nhưng chưa đủ mạnh để cạnh tranh. Hiện ghi nhận ${computedMatchedCount}/${computedTotalRequired} kỹ năng phù hợp${matched ? ` (${matched})` : ''}. Nên ưu tiên hoàn thiện nhóm ${topCategory || 'kỹ năng cốt lõi'} và đưa minh chứng cụ thể cho ${priority || 'các kỹ năng quan trọng nhất'} trước khi ứng tuyển.`;
                if (pct >= 30)
                  return `Ứng viên đang ở giai đoạn phát triển cho nghề mục tiêu. Tỷ lệ đáp ứng theo số lượng là ${computedCoverage.toFixed(1)}%, còn thiếu ${computedMissingCount} kỹ năng. Hãy chọn 3 kỹ năng đầu tiên trong nhóm quan trọng${priority ? ` (${priority})` : ''}, học theo tình huống thực tế, rồi cập nhật CV bằng ví dụ công việc hoặc chứng chỉ.`;
                return `CV chưa đủ sát với nghề mục tiêu. Hệ thống chỉ tìm thấy ${computedMatchedCount}/${computedTotalRequired} kỹ năng yêu cầu trong CV, vì vậy chưa nên dựa vào các kỹ năng ngoài ngành để kết luận phù hợp. Lộ trình thực tế là xử lý trước ${Math.min(5, computedMissingCount)} kỹ năng nền tảng${priority ? ` như: ${priority}` : ''}, sau đó bổ sung minh chứng vào CV và luyện trả lời phỏng vấn theo từng kỹ năng.`;
              })()}
            </p>
          </div>
        </div>

        <div className="ai-plan-grid">
          <div className="ai-plan-card">
            <span className="ai-plan-kicker">Ưu tiên 7 ngày</span>
            <strong>{[...criticalGaps, ...importantGaps][0] ? catalogSkillName([...criticalGaps, ...importantGaps][0].name) : 'Củng cố CV'}</strong>
            <p>Chọn một kỹ năng có trọng số cao nhất, học khái niệm nền, ghi lại ví dụ áp dụng và thêm bằng chứng vào CV.</p>
          </div>
          <div className="ai-plan-card">
            <span className="ai-plan-kicker">Ưu tiên 30 ngày</span>
            <strong>{priorityText([...criticalGaps, ...importantGaps].slice(0, 3).map((s: any) => catalogSkillName(s.name)))}</strong>
            <p>Hoàn thành nhóm kỹ năng quan trọng đầu tiên, mỗi kỹ năng cần có ít nhất một minh chứng thực tế hoặc khóa học liên quan.</p>
          </div>
          <div className="ai-plan-card">
            <span className="ai-plan-kicker">Rủi ro khi ứng tuyển</span>
            <strong>{computedMissingCount > computedMatchedCount ? 'Thiếu bằng chứng nghề nghiệp' : 'Cần làm rõ kinh nghiệm'}</strong>
            <p>Nhà tuyển dụng có thể loại CV nếu các kỹ năng quan trọng chỉ xuất hiện chung chung hoặc không có tình huống chứng minh.</p>
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
                if (allGaps.length > 0) {
                  return allGaps.slice(0, 5).map((skill, index) => (
                    <li key={index}>
                      Cần học thêm kỹ năng <strong>{catalogSkillName(skill.name)}</strong> ({catalogSkillCategory(skill.category)})
                      {skill.importance && skill.importance >= 0.8 && ' - Rất quan trọng'}
                      {skill.importance && skill.importance >= 0.5 && skill.importance < 0.8 && ' - Quan trọng'}
                      {skill.importance && skill.importance < 0.5 && ' - Nên có'}
                    </li>
                  ));
                } else if (computedMissingCount > 0) {
                  return (
                    <>
                      <li>Cần bổ sung thêm <strong>{computedMissingCount} kỹ năng</strong> để phù hợp hơn.</li>
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
