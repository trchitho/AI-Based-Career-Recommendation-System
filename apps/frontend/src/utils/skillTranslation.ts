import skillAliasEnVi from '../data/skillAliasEnVi.json';

const skillAliasMap = skillAliasEnVi as Record<string, string>;

const TECHNICAL_TERMS = new Set([
  '2FA',
  'AI',
  'AI/ML',
  'Agile',
  'AWS',
  'Backend',
  'Database',
  'Docker',
  'Frontend',
  'Git',
  'GraphQL',
  'HTML',
  'JavaScript',
  'JWT',
  'Machine Learning',
  'Node.js',
  'PhoBERT',
  'PostgreSQL',
  'PyTorch',
  'React',
  'Redis',
  'REST API',
  'Security',
  'SQL',
  'SQLite',
  'TailwindCSS',
  'Tools',
  'TypeScript',
]);

const CATEGORY_TRANSLATIONS: Record<string, string> = {
  'Basic Skills': 'Kỹ năng cơ bản',
  'Database': 'Cơ sở dữ liệu',
  'Frontend': 'Frontend',
  'Methodology': 'Phương pháp làm việc',
  'Other': 'Khác',
  'People and Technology Systems': 'Con người và hệ thống công nghệ',
  'Problem Solving': 'Giải quyết vấn đề',
  'Resource Management': 'Quản lý nguồn lực',
  'Security': 'Bảo mật',
  'Social Skills': 'Kỹ năng xã hội',
  'Soft Skill': 'Kỹ năng mềm',
  'Technical Skills': 'Kỹ năng kỹ thuật',
  'Technology': 'Công nghệ',
  'Tools': 'Công cụ',
};

const SKILL_OVERRIDES: Record<string, string> = {
  'Communication': 'Giao tiếp',
  'Communication skill': 'Kỹ năng giao tiếp',
  'Problem-Solving Skill': 'Kỹ năng giải quyết vấn đề',
  'Teamwork skill': 'Kỹ năng làm việc nhóm',
  'Time Management Skill': 'Kỹ năng quản lý thời gian',
};

export function translateSkillName(name?: string): string {
  const value = (name || '').trim();
  if (!value) return '';
  if (TECHNICAL_TERMS.has(value)) return value;

  return (
    SKILL_OVERRIDES[value] ||
    skillAliasMap[value] ||
    skillAliasMap[value.replace(/\s+Skill$/i, '')] ||
    value
  );
}

export function translateSkillCategory(category?: string): string {
  const value = (category || '').trim();
  if (!value) return 'Kỹ năng';
  if (TECHNICAL_TERMS.has(value)) return value;

  return CATEGORY_TRANSLATIONS[value] || skillAliasMap[value] || value;
}

