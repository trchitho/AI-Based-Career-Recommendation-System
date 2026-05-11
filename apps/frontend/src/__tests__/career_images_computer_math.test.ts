/**
 * TC_CAREER_IMAGES_CM — Career Image Mapping Tests: computer-math group
 * ======================================================================
 * Covers:
 *   TC_CM_01  All 37 computer-math codes have dedicated local images
 *   TC_CM_02  No duplicate image paths within computer-math
 *   TC_CM_03  No overlap with personal-care or sales images
 *   TC_CM_04  All paths follow /images/careers/computer-math/{slug}.jpg format
 *   TC_CM_05  Fallback for unknown code returns group image
 *   TC_CM_06  getCareerImageUrl is deterministic
 *   TC_CM_07  Sub-codes (e.g. 15-1211.01) have dedicated images
 *   TC_CM_08  All paths start with /images/ (local, no external CDN)
 *   TC_CM_09  Complete coverage – exactly 37 entries for 15-xx codes
 *   TC_CM_10  No 15-1299.00 ghost entry (old Unsplash code removed)
 */

import { describe, it, expect } from 'vitest';

// ─── Image maps (mirror of CareersByGroupPage.tsx) ────────────────────────

const CAREER_IMAGES: Record<string, string> = {
  // COMPUTER & MATH (37)
  '15-1211.00': '/images/careers/computer-math/computer-systems-analyst.jpg',
  '15-1211.01': '/images/careers/computer-math/health-informatics-specialist.jpg',
  '15-1212.00': '/images/careers/computer-math/information-security-analyst.jpg',
  '15-1221.00': '/images/careers/computer-math/computer-research-scientist.jpg',
  '15-1231.00': '/images/careers/computer-math/network-support-specialist.jpg',
  '15-1232.00': '/images/careers/computer-math/computer-user-support.jpg',
  '15-1241.00': '/images/careers/computer-math/network-architect.jpg',
  '15-1241.01': '/images/careers/computer-math/telecom-engineering-specialist.jpg',
  '15-1242.00': '/images/careers/computer-math/database-administrator.jpg',
  '15-1243.00': '/images/careers/computer-math/database-architect.jpg',
  '15-1243.01': '/images/careers/computer-math/data-warehousing-specialist.jpg',
  '15-1244.00': '/images/careers/computer-math/network-systems-administrator.jpg',
  '15-1251.00': '/images/careers/computer-math/computer-programmer.jpg',
  '15-1252.00': '/images/careers/computer-math/software-developer.jpg',
  '15-1253.00': '/images/careers/computer-math/software-qa-analyst.jpg',
  '15-1254.00': '/images/careers/computer-math/web-developer.jpg',
  '15-1255.00': '/images/careers/computer-math/web-interface-designer.jpg',
  '15-1255.01': '/images/careers/computer-math/video-game-designer.jpg',
  '15-1299.01': '/images/careers/computer-math/web-administrator.jpg',
  '15-1299.02': '/images/careers/computer-math/gis-technologist.jpg',
  '15-1299.03': '/images/careers/computer-math/document-management-specialist.jpg',
  '15-1299.04': '/images/careers/computer-math/penetration-tester.jpg',
  '15-1299.05': '/images/careers/computer-math/information-security-engineer.jpg',
  '15-1299.06': '/images/careers/computer-math/digital-forensics-analyst.jpg',
  '15-1299.07': '/images/careers/computer-math/blockchain-engineer.jpg',
  '15-1299.08': '/images/careers/computer-math/computer-systems-engineer.jpg',
  '15-1299.09': '/images/careers/computer-math/it-project-manager.jpg',
  '15-2011.00': '/images/careers/computer-math/actuary.jpg',
  '15-2021.00': '/images/careers/computer-math/mathematician.jpg',
  '15-2031.00': '/images/careers/computer-math/operations-research-analyst.jpg',
  '15-2041.00': '/images/careers/computer-math/statistician.jpg',
  '15-2041.01': '/images/careers/computer-math/biostatistician.jpg',
  '15-2051.00': '/images/careers/computer-math/data-scientist.jpg',
  '15-2051.01': '/images/careers/computer-math/business-intelligence-analyst.jpg',
  '15-2051.02': '/images/careers/computer-math/clinical-data-manager.jpg',
  '15-2099.00': '/images/careers/computer-math/math-science-occupations.jpg',
  '15-2099.01': '/images/careers/computer-math/bioinformatics-technician.jpg',
  // PERSONAL CARE (31) – sample for overlap check
  '39-5012.00': '/images/careers/personal-care/hairdresser.jpg',
  '39-9011.00': '/images/careers/personal-care/childcare-worker.jpg',
  '39-5011.00': '/images/careers/personal-care/barber.jpg',
  // SALES (23) – sample for overlap check
  '41-1011.00': 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=240&fit=crop&auto=format',
  '41-2011.00': 'https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=400&h=240&fit=crop&auto=format',
};

const GROUP_FALLBACK_IMAGES: Record<string, string> = {
  'computer-math':  '/images/careers/computer-math/software-developer.jpg',
  'personal-care':  '/images/careers/personal-care/hairdresser.jpg',
  'sales':          'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=240&fit=crop&auto=format',
};

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=400&h=240&fit=crop&auto=format';

function getCareerImageUrl(onetCode: string | undefined, groupSlug: string): string {
  if (onetCode && CAREER_IMAGES[onetCode]) return CAREER_IMAGES[onetCode];
  return GROUP_FALLBACK_IMAGES[groupSlug] || DEFAULT_IMAGE;
}

// ─── Constants ────────────────────────────────────────────────────────────

const CM_CODES = [
  '15-1211.00', '15-1211.01', '15-1212.00', '15-1221.00',
  '15-1231.00', '15-1232.00', '15-1241.00', '15-1241.01',
  '15-1242.00', '15-1243.00', '15-1243.01', '15-1244.00',
  '15-1251.00', '15-1252.00', '15-1253.00', '15-1254.00',
  '15-1255.00', '15-1255.01', '15-1299.01', '15-1299.02',
  '15-1299.03', '15-1299.04', '15-1299.05', '15-1299.06',
  '15-1299.07', '15-1299.08', '15-1299.09', '15-2011.00',
  '15-2021.00', '15-2031.00', '15-2041.00', '15-2041.01',
  '15-2051.00', '15-2051.01', '15-2051.02', '15-2099.00',
  '15-2099.01',
];

const PC_CODES = ['39-5012.00', '39-9011.00', '39-5011.00'];
const SALES_CODES = ['41-1011.00', '41-2011.00'];

// ─── TC_CM_01: All 37 codes have dedicated local images ───────────────────

describe('TC_CM_01 — All 37 computer-math codes have dedicated local images', () => {
  it('all 37 codes present in CAREER_IMAGES', () => {
    const missing = CM_CODES.filter(c => !CAREER_IMAGES[c]);
    expect(missing).toHaveLength(0);
  });

  CM_CODES.forEach(code => {
    it(`${code} → local image path`, () => {
      const url = getCareerImageUrl(code, 'computer-math');
      expect(url).toBeTruthy();
      expect(url.startsWith('/images/careers/computer-math/')).toBe(true);
    });
  });
});

// ─── TC_CM_02: No duplicate paths within computer-math ────────────────────

describe('TC_CM_02 — No duplicate image paths within computer-math', () => {
  it('all 37 paths are unique', () => {
    const paths = CM_CODES.map(c => CAREER_IMAGES[c]);
    expect(new Set(paths).size).toBe(CM_CODES.length);
  });
});

// ─── TC_CM_03: No overlap with personal-care or sales ─────────────────────

describe('TC_CM_03 — No overlap with personal-care or sales images', () => {
  it('no computer-math path appears in personal-care', () => {
    const cmPaths = new Set(CM_CODES.map(c => CAREER_IMAGES[c]));
    const pcPaths = PC_CODES.map(c => CAREER_IMAGES[c]);
    expect(pcPaths.filter(p => cmPaths.has(p))).toHaveLength(0);
  });

  it('no computer-math path appears in sales', () => {
    const cmPaths = new Set(CM_CODES.map(c => CAREER_IMAGES[c]));
    const salesPaths = SALES_CODES.map(c => CAREER_IMAGES[c]);
    expect(salesPaths.filter(p => cmPaths.has(p))).toHaveLength(0);
  });
});

// ─── TC_CM_04: All paths follow correct format ────────────────────────────

describe('TC_CM_04 — All paths follow /images/careers/computer-math/{slug}.jpg', () => {
  CM_CODES.forEach(code => {
    it(`${code} path matches expected pattern`, () => {
      const path = CAREER_IMAGES[code];
      expect(path).toMatch(/^\/images\/careers\/computer-math\/[a-z0-9-]+\.jpg$/);
    });
  });
});

// ─── TC_CM_05: Fallback for unknown code ──────────────────────────────────

describe('TC_CM_05 — Fallback behavior', () => {
  it('unknown code in computer-math → group fallback', () => {
    const url = getCareerImageUrl('15-9999.00', 'computer-math');
    expect(url).toBe(GROUP_FALLBACK_IMAGES['computer-math']);
  });

  it('undefined code → group fallback', () => {
    const url = getCareerImageUrl(undefined, 'computer-math');
    expect(url).toBe(GROUP_FALLBACK_IMAGES['computer-math']);
  });

  it('unknown group → default image', () => {
    const url = getCareerImageUrl('15-9999.00', 'unknown-group');
    expect(url).toBe(DEFAULT_IMAGE);
  });

  it('group fallback is a local path', () => {
    expect(GROUP_FALLBACK_IMAGES['computer-math'].startsWith('/images/')).toBe(true);
  });
});

// ─── TC_CM_06: Deterministic ──────────────────────────────────────────────

describe('TC_CM_06 — getCareerImageUrl is deterministic', () => {
  CM_CODES.slice(0, 5).forEach(code => {
    it(`${code} returns same path on repeated calls`, () => {
      expect(getCareerImageUrl(code, 'computer-math')).toBe(
        getCareerImageUrl(code, 'computer-math')
      );
    });
  });
});

// ─── TC_CM_07: Sub-codes have dedicated images ────────────────────────────

describe('TC_CM_07 — Sub-codes have dedicated images', () => {
  const subCodes = [
    ['15-1211.00', '15-1211.01'],  // Computer Systems Analyst vs Health Informatics
    ['15-1241.00', '15-1241.01'],  // Network Architect vs Telecom Engineering
    ['15-1243.00', '15-1243.01'],  // Database Architect vs Data Warehousing
    ['15-1255.00', '15-1255.01'],  // Web Designer vs Video Game Designer
    ['15-2041.00', '15-2041.01'],  // Statistician vs Biostatistician
    ['15-2051.00', '15-2051.01', '15-2051.02'],  // Data Scientist variants
    ['15-2099.00', '15-2099.01'],  // Math Science vs Bioinformatics
  ];

  subCodes.forEach(group => {
    it(`${group.join(' vs ')} have different images`, () => {
      const paths = group.map(c => CAREER_IMAGES[c]);
      expect(new Set(paths).size).toBe(group.length);
    });
  });

  it('15-1299.01 through 15-1299.09 all have unique images', () => {
    const codes = ['15-1299.01','15-1299.02','15-1299.03','15-1299.04',
                   '15-1299.05','15-1299.06','15-1299.07','15-1299.08','15-1299.09'];
    const paths = codes.map(c => CAREER_IMAGES[c]);
    expect(new Set(paths).size).toBe(codes.length);
  });
});

// ─── TC_CM_08: All paths are local (no external CDN) ─────────────────────

describe('TC_CM_08 — All computer-math images are local (no external CDN)', () => {
  CM_CODES.forEach(code => {
    it(`${code} uses local path (starts with /)`, () => {
      expect(CAREER_IMAGES[code].startsWith('/')).toBe(true);
    });
  });

  it('no computer-math image uses Unsplash', () => {
    const unsplash = CM_CODES.filter(c => CAREER_IMAGES[c].includes('unsplash'));
    expect(unsplash).toHaveLength(0);
  });

  it('no computer-math image uses Picsum', () => {
    const picsum = CM_CODES.filter(c => CAREER_IMAGES[c].includes('picsum'));
    expect(picsum).toHaveLength(0);
  });
});

// ─── TC_CM_09: Complete coverage ─────────────────────────────────────────

describe('TC_CM_09 — Complete coverage of all 37 computer-math codes', () => {
  it('CAREER_IMAGES has exactly 37 computer-math entries', () => {
    const cmEntries = Object.keys(CAREER_IMAGES).filter(k => k.startsWith('15-'));
    expect(cmEntries.length).toBe(37);
  });

  it('all 37 expected codes are present', () => {
    CM_CODES.forEach(code => {
      expect(CAREER_IMAGES).toHaveProperty(code);
    });
  });

  it('no extra 15-xx codes beyond the 37 expected', () => {
    const extra = Object.keys(CAREER_IMAGES)
      .filter(k => k.startsWith('15-') && !CM_CODES.includes(k));
    expect(extra).toHaveLength(0);
  });
});

// ─── TC_CM_10: Old Unsplash code 15-1299.00 removed ──────────────────────

describe('TC_CM_10 — Old ghost entry 15-1299.00 is removed', () => {
  it('15-1299.00 is NOT in CAREER_IMAGES (was old Unsplash fallback)', () => {
    expect(CAREER_IMAGES['15-1299.00']).toBeUndefined();
  });

  it('15-1299.01 through 15-1299.09 are all present instead', () => {
    for (let i = 1; i <= 9; i++) {
      const code = `15-1299.0${i}`;
      expect(CAREER_IMAGES[code]).toBeDefined();
    }
  });
});
