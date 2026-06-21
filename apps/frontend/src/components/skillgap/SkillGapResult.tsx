import React, { useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  CheckCircle, XCircle, BarChart2, AlertCircle, AlertTriangle,
  Star, Bot, Mic, Download
} from 'lucide-react';
import { SkillGapAnalysis } from '../../types/skillGap';
import { translateSkillCategory, translateSkillName } from '../../utils/skillTranslation';
import './SkillGapResult.css';

interface SkillGapResultProps {
  analysis: SkillGapAnalysis;
  onStartInterview?: () => void;
  careerName?: string;
}

const SkillGapResult: React.FC<SkillGapResultProps> = ({ analysis, onStartInterview, careerName }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [showAllImprovements, setShowAllImprovements] = useState(false);

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

  const normalizeText = (value?: string) => (value || '').trim().toLowerCase();

  const getSkillEvidenceAdvice = (skill: { name: string; category?: string; ksa_type?: string }) => {
    const name = normalizeText(catalogSkillName(skill.name));
    const category = normalizeText(catalogSkillCategory(skill.category));
    if (/english|tiếng anh|language|viết|written|expression|communications|truyền thông|giao tiếp/.test(name + ' ' + category)) {
      return 'CV nên có minh chứng bằng bài viết, email/tài liệu đã soạn, chứng chỉ ngoại ngữ, nội dung truyền thông, hoặc tình huống phải truyền đạt thông tin rõ ràng cho khách hàng/đồng đội.';
    }
    if (/customer|khách hàng|service|sales|marketing|bán hàng|tư vấn/.test(name + ' ' + category)) {
      return 'CV nên mô tả rõ bạn đã giao tiếp với khách hàng nào, giới thiệu sản phẩm/dịch vụ ra sao, xử lý phản hồi thế nào và kết quả đo được như số khách hàng, tỉ lệ chuyển đổi hoặc doanh thu.';
    }
    if (/administration|management|quản lý|personnel|human resources/.test(name + ' ' + category)) {
      return 'CV nên có bằng chứng về lập kế hoạch, phân công, theo dõi tiến độ, quản lý hồ sơ/tài liệu, điều phối nguồn lực hoặc chịu trách nhiệm cho một quy trình cụ thể.';
    }
    if (/critical|tư duy|problem|giải quyết|judgment|phán đoán|decision|ra quyết định/.test(name + ' ' + category)) {
      return 'CV nên trình bày theo cấu trúc vấn đề - dữ liệu đã xem xét - phương án lựa chọn - kết quả, để nhà tuyển dụng thấy năng lực suy luận thay vì chỉ thấy một từ khóa.';
    }
    if (/attention|vision|selective|near vision|visual|chi tiết|quan sát/.test(name + ' ' + category)) {
      return 'CV nên nêu các nhiệm vụ cần quan sát chi tiết, kiểm tra lỗi, rà soát chất lượng, theo dõi tín hiệu nhỏ hoặc duy trì tập trung trong thời gian dài.';
    }
    return 'CV nên bổ sung bằng chứng cụ thể: nhiệm vụ đã làm, bối cảnh sử dụng kỹ năng, kết quả đạt được, công cụ/quy trình liên quan hoặc khóa học/chứng chỉ đáng tin cậy.';
  };

  const getExtraSkillDescription = (skill: { name: string; category?: string; description_vn?: string; description_en?: string }) => {
    if (skill.description_vn || skill.description_en) return skill.description_vn || skill.description_en || '';
    const name = normalizeText(catalogSkillName(skill.name));
    const category = normalizeText(catalogSkillCategory(skill.category));
    if (/chăm sóc khách|customer service/.test(name + ' ' + category)) {
      return 'Kỹ năng này thể hiện khả năng giao tiếp với khách hàng, lắng nghe nhu cầu, giới thiệu sản phẩm/dịch vụ phù hợp, xử lý thắc mắc và duy trì trải nghiệm tích cực trong quá trình tư vấn hoặc bán hàng.';
    }
    if (/tư vấn|bán hàng|sales|marketing|tìm kiếm khách/.test(name + ' ' + category)) {
      return 'Kỹ năng này nghiêng về nhóm kinh doanh/bán hàng: tìm khách hàng tiềm năng, tư vấn lợi ích sản phẩm, theo dõi cơ hội, thuyết phục và hỗ trợ khách ra quyết định.';
    }
    if (/giao tiếp|communication/.test(name + ' ' + category)) {
      return 'Kỹ năng này cho thấy CV có tín hiệu về trao đổi thông tin, trình bày ý tưởng, phối hợp với người khác và xử lý tình huống cần truyền đạt rõ ràng.';
    }
    if (/chụp ảnh|video|creative|làm video/.test(name + ' ' + category)) {
      return 'Kỹ năng này thuộc hướng sáng tạo nội dung: ghi hình, xử lý hình ảnh/video, lựa chọn góc nhìn, kể chuyện bằng hình ảnh và tạo sản phẩm truyền thông ngắn.';
    }
    if (/tin học|office/.test(name + ' ' + category)) {
      return 'Kỹ năng này phản ánh khả năng dùng công cụ văn phòng để soạn thảo, quản lý dữ liệu cơ bản, trình bày tài liệu và hỗ trợ công việc hành chính.';
    }
    if (/market|phân tích thị trường/.test(name + ' ' + category)) {
      return 'Kỹ năng này cho thấy khả năng quan sát thị trường, phân tích nhu cầu khách hàng, theo dõi đối thủ và dùng thông tin đó để hỗ trợ quyết định kinh doanh.';
    }
    return `Đây là kỹ năng nên bổ sung cho hướng ${cvCareerLabel}, chưa thấy xuất hiện rõ trong CV hiện tại.`;
  };

  const getSkillAction = (skill: { name: string; category?: string; importance?: number }, level: 'critical' | 'important' | 'nice' | 'extra') => {
    const name = catalogSkillName(skill.name).toLowerCase();
    const category = catalogSkillCategory(skill.category);
    if (level === 'extra') {
      return getExtraSkillDescription(skill);
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

  const inferCvCareerLabel = (skills: Array<{ name?: string; category?: string }>) => {
    const text = skills.map((s) => `${s.name || ''} ${s.category || ''}`).join(' ').toLowerCase();
    if (/react|frontend|backend|node|express|typescript|javascript|api|database|postgres|mongodb|spring|fastapi|fullstack/.test(text)) {
      if (/react|frontend/.test(text) && /backend|node|express|api|database|spring|fastapi/.test(text)) return 'Fullstack Web Developer';
      if (/backend|node|express|api|database|spring|fastapi/.test(text)) return 'Backend Developer';
      if (/react|frontend|typescript|javascript/.test(text)) return 'Frontend Developer';
      return 'Software Developer';
    }
    if (/ai|nlp|machine learning|data|pandas|numpy|model|vector/.test(text)) return 'AI/Data Developer';
    if (/customer|khách hàng|sales|bán hàng|marketing|tư vấn|thị trường/.test(text)) return 'Kinh doanh/Bán hàng - Chăm sóc khách hàng';
    if (/video|chụp ảnh|creative|media|nội dung/.test(text)) return 'Sáng tạo nội dung / Media';
    return 'Chưa đủ dữ liệu để xác định nghề trong CV';
  };

  const handleDownloadReport = async () => {
    const reportElement = document.getElementById('skill-gap-report');
    if (!reportElement || isDownloading) return;

    setIsDownloading(true);
    document.body.classList.add('skill-report-exporting');

    try {
      // Wait for DOM to settle
      await new Promise(resolve => window.setTimeout(resolve, 300));

      const canvas = await html2canvas(reportElement, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        allowTaint: true,
        onclone: (clonedDoc) => {
          // Ensure the cloned element is fully visible for capture
          const clonedEl = clonedDoc.getElementById('skill-gap-report');
          if (clonedEl) {
            clonedEl.style.overflow = 'visible';
            clonedEl.style.height = 'auto';
            clonedEl.style.maxHeight = 'none';
          }
          // Inject CSS variable fallbacks for html2canvas (it can't resolve CSS vars from :root)
          const style = clonedDoc.createElement('style');
          style.textContent = `
            :root {
              --neu-bg: #f1f5f9;
              --neu-bg-card: #ffffff;
              --neu-text: #1e293b;
              --neu-text-muted: #64748b;
              --neu-accent: #6366f1;
              --neu-btn-text: #ffffff;
              --neu-raised: 4px 4px 10px rgba(0,0,0,0.08), -2px -2px 6px rgba(255,255,255,0.6);
              --neu-raised-sm: 2px 2px 6px rgba(0,0,0,0.06), -1px -1px 4px rgba(255,255,255,0.5);
              --neu-raised-lg: 6px 6px 16px rgba(0,0,0,0.1), -3px -3px 8px rgba(255,255,255,0.7);
              --neu-pressed: inset 2px 2px 6px rgba(0,0,0,0.08), inset -2px -2px 6px rgba(255,255,255,0.5);
              --neu-pressed-sm: inset 1px 1px 4px rgba(0,0,0,0.06), inset -1px -1px 3px rgba(255,255,255,0.4);
              --color-primary: #6366f1;
              --color-success: #10b981;
            }
          `;
          clonedDoc.head.appendChild(style);
        },
      });

      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        console.error('html2canvas produced empty canvas');
        return;
      }

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pageContentHeight = pageHeight - margin * 2;

      const imageData = canvas.toDataURL('image/jpeg', 0.92);

      let heightLeft = imgHeight;
      let position = margin;

      // First page
      pdf.addImage(imageData, 'JPEG', margin, position, imgWidth, imgHeight);
      heightLeft -= pageContentHeight;

      // Additional pages
      while (heightLeft > 0) {
        position = margin - (imgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imageData, 'JPEG', margin, position, imgWidth, imgHeight);
        heightLeft -= pageContentHeight;
      }

      const date = new Date().toISOString().slice(0, 10);
      const fileBase = (analysis.cv_name || analysis.cv_filename || `skill-gap-${analysis.id}`)
        .replace(/[\\/:*?"<>|]+/g, '-')
        .replace(/\s+/g, '-')
        .slice(0, 80);
      pdf.save(`bao-cao-phan-tich-ky-nang-${fileBase}-${date}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      document.body.classList.remove('skill-report-exporting');
      setIsDownloading(false);
    }
  };

  // Deduplicate matched_skills by TRANSLATED name (avoid showing same skill in Viet + Eng)
  const seenMatchedNames = new Map<string, typeof analysis.matched_skills[0]>();
  (analysis.matched_skills || []).forEach(skill => {
    const translated = catalogSkillName(skill.name);
    const key = translated.toLowerCase().trim();
    const existing = seenMatchedNames.get(key);
    // Keep the one with higher importance
    if (!existing || (skill as any).importance > (existing as any).importance) {
      seenMatchedNames.set(key, skill);
    }
  });
  const uniqueMatchedSkills = Array.from(seenMatchedNames.values());
  const criticalGaps = analysis.skill_gaps?.critical || [];
  const importantGaps = analysis.skill_gaps?.important || [];
  const niceToHaveGaps = analysis.skill_gaps?.nice_to_have || [];
  const coreGaps = [...criticalGaps, ...importantGaps];
  const allGaps = coreGaps;
  const computedMissingCount = allGaps.length;
  const computedTotalRequired = uniqueMatchedSkills.length + computedMissingCount;
  const computedMatchedCount = uniqueMatchedSkills.length;
  const computedCoverage = computedTotalRequired > 0
    ? (computedMatchedCount / computedTotalRequired) * 100
    : analysis.match_percentage;
  const extraSkills = analysis.extra_skills || [];
  const cvCareerLabel = extraSkills[0]?.current_career || inferCvCareerLabel(analysis.cv_skills || []);
  const targetCareerLabel = careerName || extraSkills[0]?.target_career || analysis.career_id;

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
                <span className="skill-name">{catalogSkillName(skill.name)}</span>
                <span className="skill-category">{translateSkillCategory(skill.category)}</span>
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

      {/* Nice-to-have Skills - Nghề Target (hiển thị trước) */}
      {niceToHaveGaps.length > 0 && (
        <div className="skills-section skills-section-featured nice-to-have-section">
          <h3 className="section-title nice-to-have">
            <span className="title-icon"><Star size={18} color="#8b5cf6" /></span>
            Kỹ năng nên có cho nghề mục tiêu: {targetCareerLabel} ({niceToHaveGaps.length})
          </h3>
          <p className="section-description">
            Đây là các kỹ năng bổ trợ cho nghề mục tiêu đang so sánh. Không bắt buộc nhưng sẽ giúp bạn nổi bật hơn khi ứng tuyển.
          </p>
          <div className="skills-grid compact-insight-grid">
            {niceToHaveGaps.map((skill: any, index: number) => (
              <div key={index} className="skill-badge skill-insight-card nice-to-have">
                <span className="skill-name">{catalogSkillName(skill.name)}</span>
                <span className="skill-category">{catalogSkillCategory(skill.category)}</span>
                {getSkillDescription(skill) && (
                  <p className="skill-description">{getSkillDescription(skill)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extra Skills - Nghề trong CV (hiển thị sau) */}
      {extraSkills.length > 0 && (
        <div className="skills-section skills-section-featured extra-section">
          <h3 className="section-title extra">
            <span className="title-icon"><Star size={18} color="#f59e0b" /></span>
            Kỹ năng nên có cho nghề trong CV: {cvCareerLabel} ({Math.min(extraSkills.length, 10)})
          </h3>
          <p className="section-description">
            Đây là các kỹ năng hệ thống khuyến nghị bổ sung cho nghề hiện tại suy ra từ CV của bạn, không phải kỹ năng của nghề mục tiêu đang so sánh. Danh sách này đã loại các kỹ năng đã xuất hiện trong CV.
          </p>
          <div className="skills-grid compact-insight-grid">
            {extraSkills.slice(0, 10).map((skill, index) => (
              <div key={index} className="skill-badge skill-insight-card extra">
                <span className="skill-name">{catalogSkillName(skill.name)}</span>
                <span className="skill-category">{catalogSkillCategory(skill.category)}</span>
                <p className="skill-description">{getExtraSkillDescription(skill)}</p>
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
                    <strong>{catalogSkillName(skill.name)}</strong>
                    <span> — {getKsaTypeLabel(skill.ksa_type)} thuộc nhóm {catalogSkillCategory(skill.category)}{skill.importance ? `, trọng số ${Math.round(skill.importance * 100)}%` : ''}. </span>
                    <span>Đây là tín hiệu tích cực vì CV đã có bằng chứng trùng với yêu cầu nghề mục tiêu; nên giữ skill này ở phần kinh nghiệm/dự án thay vì chỉ liệt kê ở mục kỹ năng.</span>
                  </li>
                ))
              ) : (
                <li>
                  <strong>Chưa tìm thấy kỹ năng nào trong CV trùng trực tiếp với bộ yêu cầu chính của nghề mục tiêu.</strong>
                  <span> Điều này không có nghĩa CV không có giá trị; nó cho thấy hồ sơ hiện tại đang nghiêng sang hướng khác so với nghề đang so sánh. Hệ thống vì vậy không gán điểm mạnh giả, tránh làm người dùng hiểu nhầm về mức độ phù hợp.</span>
                </li>
              )}
            </ul>
          </div>

          <div className="sw-card weaknesses-card">
            <h4 className="sw-title">Điểm cần cải thiện</h4>
            <ul className="sw-list">
              {(() => {
                const improvementFocus = coreGaps;
                if (improvementFocus.length > 0) {
                  const visibleImprovements = showAllImprovements ? improvementFocus : improvementFocus.slice(0, 5);
                  return visibleImprovements.map((skill, index) => (
                    <li key={index}>
                      <strong>{catalogSkillName(skill.name)}</strong>
                      <span> — {getKsaTypeLabel(skill.ksa_type)} thuộc nhóm {catalogSkillCategory(skill.category)}{skill.importance ? `, trọng số ${Math.round(skill.importance * 100)}%` : ''}{skill.level ? `, mức độ yêu cầu ${Math.round(skill.level * 100)}%` : ''}. </span>
                      {getSkillDescription(skill) && <span>{getSkillDescription(skill)} </span>}
                      <span>{getSkillEvidenceAdvice(skill)}</span>
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
            {coreGaps.length > 5 && (
              <button
                type="button"
                className="sw-more-btn"
                onClick={() => setShowAllImprovements(prev => !prev)}
              >
                {showAllImprovements ? 'Thu gọn' : `Xem thêm ${coreGaps.length - 5} kỹ năng cần cải thiện`}
              </button>
            )}
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

      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-850/50 rounded-2xl text-center text-xs text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-800 max-w-3xl mx-auto leading-relaxed">
        * Lưu ý: Kết quả phân tích khoảng cách kỹ năng (Skill Gap) từ AI chỉ mang tính chất tham khảo hướng nghiệp và không bảo đảm cơ hội việc làm hoặc chẩn đoán tâm lý. Vui lòng thảo luận thêm với các mentor hoặc giảng viên chuyên môn để có định hướng tốt nhất.
      </div>
    </div>
  );
};

export default SkillGapResult;
