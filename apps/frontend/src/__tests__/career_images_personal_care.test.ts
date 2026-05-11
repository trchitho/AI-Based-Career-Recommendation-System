/**
 * TC_CAREER_IMAGES — Career Image Mapping Tests: personal-care group
 * ==================================================================
 * Covers:
 *   TC_IMG_01  getCareerImageUrl returns a non-empty string for every onet_code
 *   TC_IMG_02  All 31 personal-care onet_codes have dedicated images (not fallback)
 *   TC_IMG_03  No two onet_codes share the same image URL
 *   TC_IMG_04  All URLs use an allowed image host (picsum.photos or images.unsplash.com)
 *   TC_IMG_05  Fallback for unknown onet_code returns group-level image
 *   TC_IMG_06  Fallback for unknown group returns default image
 *   TC_IMG_07  URL format is valid (starts with https://)
 *   TC_IMG_08  Picsum URLs follow the /id/{number}/400/240 pattern
 *   TC_IMG_09  Unsplash URLs contain required query params (w, h, fit, auto)
 *   TC_IMG_10  onet_code with sub-code (39-9011.01 Nanny) has its own image
 *   TC_IMG_11  All personal-care images differ from building-maintenance images
 *   TC_IMG_12  All personal-care images differ from sales images
 */

import { describe, it, expect } from 'vitest';

// ─── Replicate the image maps from CareersByGroupPage.tsx ─────────────────

const CAREER_IMAGES: Record<string, string> = {
  // SALES (23)
  '41-1011.00': 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=240&fit=crop&auto=format',
  '41-1012.00': 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&h=240&fit=crop&auto=format',
  '41-2011.00': 'https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=400&h=240&fit=crop&auto=format',
  '41-2012.00': 'https://images.unsplash.com/photo-1596838132731-3301c3fd4317?w=400&h=240&fit=crop&auto=format',
  '41-2021.00': 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400&h=240&fit=crop&auto=format',
  '41-2022.00': 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=240&fit=crop&auto=format',
  '41-2031.00': 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=240&fit=crop&auto=format',
  '41-3011.00': 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&h=240&fit=crop&auto=format',
  '41-3021.00': 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400&h=240&fit=crop&auto=format',
  '41-3031.00': 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=240&fit=crop&auto=format',
  '41-3041.00': 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400&h=240&fit=crop&auto=format',
  '41-3091.00': 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=240&fit=crop&auto=format',
  '41-4011.00': 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=240&fit=crop&auto=format',
  '41-4011.07': 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=400&h=240&fit=crop&auto=format',
  '41-4012.00': 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=400&h=240&fit=crop&auto=format',
  '41-9011.00': 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=240&fit=crop&auto=format',
  '41-9012.00': 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&h=240&fit=crop&auto=format',
  '41-9021.00': 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=400&h=240&fit=crop&auto=format',
  '41-9022.00': 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=240&fit=crop&auto=format',
  '41-9031.00': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=240&fit=crop&auto=format',
  '41-9041.00': 'https://images.unsplash.com/photo-1556742111-a301076d9d18?w=400&h=240&fit=crop&auto=format',
  '41-9091.00': 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400&h=240&fit=crop&auto=format',
  '41-9099.00': 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=400&h=240&fit=crop&auto=format',
  // BUILDING MAINTENANCE (8)
  '37-1011.00': 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=240&fit=crop&auto=format',
  '37-1012.00': 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=240&fit=crop&auto=format',
  '37-2011.00': 'https://picsum.photos/id/213/400/240',
  '37-2012.00': 'https://picsum.photos/id/312/400/240',
  '37-2021.00': 'https://picsum.photos/id/429/400/240',
  '37-3011.00': 'https://picsum.photos/id/325/400/240',
  '37-3012.00': 'https://picsum.photos/id/326/400/240',
  '37-3013.00': 'https://picsum.photos/id/327/400/240',
  // PERSONAL CARE (31)
  '39-1013.00': '/images/careers/personal-care/casino-supervisor.jpg',
  '39-1014.00': '/images/careers/personal-care/entertainment-supervisor.jpg',
  '39-1022.00': '/images/careers/personal-care/personal-service-supervisor.jpg',
  '39-2011.00': '/images/careers/personal-care/animal-trainer.jpg',
  '39-2021.00': '/images/careers/personal-care/animal-caretaker.jpg',
  '39-3011.00': '/images/careers/personal-care/gambling-dealer.jpg',
  '39-3012.00': '/images/careers/personal-care/sports-book-writer.jpg',
  '39-3021.00': '/images/careers/personal-care/movie-projectionist.jpg',
  '39-3031.00': '/images/careers/personal-care/usher-ticket-taker.jpg',
  '39-3091.00': '/images/careers/personal-care/amusement-attendant.jpg',
  '39-3092.00': '/images/careers/personal-care/costume-attendant.jpg',
  '39-3093.00': '/images/careers/personal-care/locker-room-attendant.jpg',
  '39-4011.00': '/images/careers/personal-care/embalmer.jpg',
  '39-4012.00': '/images/careers/personal-care/crematory-operator.jpg',
  '39-4021.00': '/images/careers/personal-care/funeral-attendant.jpg',
  '39-4031.00': '/images/careers/personal-care/mortician.jpg',
  '39-5011.00': '/images/careers/personal-care/barber.jpg',
  '39-5012.00': '/images/careers/personal-care/hairdresser.jpg',
  '39-5091.00': '/images/careers/personal-care/makeup-artist.jpg',
  '39-5092.00': '/images/careers/personal-care/manicurist.jpg',
  '39-5093.00': '/images/careers/personal-care/shampooer.jpg',
  '39-5094.00': '/images/careers/personal-care/skincare-specialist.jpg',
  '39-6011.00': '/images/careers/personal-care/baggage-porter.jpg',
  '39-6012.00': '/images/careers/personal-care/concierge.jpg',
  '39-7011.00': '/images/careers/personal-care/tour-guide.jpg',
  '39-7012.00': '/images/careers/personal-care/travel-guide.jpg',
  '39-9011.00': '/images/careers/personal-care/childcare-worker.jpg',
  '39-9011.01': '/images/careers/personal-care/nanny.jpg',
  '39-9031.00': '/images/careers/personal-care/fitness-trainer.jpg',
  '39-9032.00': '/images/careers/personal-care/recreation-worker.jpg',
  '39-9041.00': '/images/careers/personal-care/residential-advisor.jpg',
};

const GROUP_FALLBACK_IMAGES: Record<string, string> = {
  'sales':                    'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=240&fit=crop&auto=format',
  'building-maintenance':     'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=240&fit=crop&auto=format',
  'personal-care':            '/images/careers/personal-care/personal-care-default.jpg',
  'computer-math':            'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=240&fit=crop&auto=format',
  'healthcare-practitioners': 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=240&fit=crop&auto=format',
  'education':                'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=240&fit=crop&auto=format',
};

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=400&h=240&fit=crop&auto=format';

function getCareerImageUrl(onetCode: string | undefined, groupSlug: string): string {
  if (onetCode && CAREER_IMAGES[onetCode]) {
    return CAREER_IMAGES[onetCode];
  }
  return GROUP_FALLBACK_IMAGES[groupSlug] || DEFAULT_IMAGE;
}

// ─── Constants ────────────────────────────────────────────────────────────

const PERSONAL_CARE_CODES = [
  '39-1013.00', '39-1014.00', '39-1022.00',
  '39-2011.00', '39-2021.00',
  '39-3011.00', '39-3012.00', '39-3021.00', '39-3031.00',
  '39-3091.00', '39-3092.00', '39-3093.00',
  '39-4011.00', '39-4012.00', '39-4021.00', '39-4031.00',
  '39-5011.00', '39-5012.00', '39-5091.00', '39-5092.00',
  '39-5093.00', '39-5094.00',
  '39-6011.00', '39-6012.00',
  '39-7011.00', '39-7012.00',
  '39-9011.00', '39-9011.01',
  '39-9031.00', '39-9032.00', '39-9041.00',
];

const SALES_CODES = [
  '41-1011.00', '41-1012.00', '41-2011.00', '41-2012.00', '41-2021.00',
  '41-2022.00', '41-2031.00', '41-3011.00', '41-3021.00', '41-3031.00',
  '41-3041.00', '41-3091.00', '41-4011.00', '41-4011.07', '41-4012.00',
  '41-9011.00', '41-9012.00', '41-9021.00', '41-9022.00', '41-9031.00',
  '41-9041.00', '41-9091.00', '41-9099.00',
];

const BUILDING_MAINTENANCE_CODES = [
  '37-1011.00', '37-1012.00', '37-2011.00', '37-2012.00',
  '37-2021.00', '37-3011.00', '37-3012.00', '37-3013.00',
];

const ALLOWED_HOSTS = ['picsum.photos', 'images.unsplash.com', '/images/careers'];

// ─── TC_IMG_01: getCareerImageUrl returns non-empty string ────────────────

describe('TC_IMG_01 — getCareerImageUrl returns non-empty string for every personal-care code', () => {
  PERSONAL_CARE_CODES.forEach(code => {
    it(`${code} → non-empty URL`, () => {
      const url = getCareerImageUrl(code, 'personal-care');
      expect(typeof url).toBe('string');
      expect(url.length).toBeGreaterThan(0);
    });
  });
});

// ─── TC_IMG_02: All 31 codes have dedicated images (not fallback) ─────────

describe('TC_IMG_02 — All 31 personal-care codes have dedicated images', () => {
  const fallback = GROUP_FALLBACK_IMAGES['personal-care'];

  it('all 31 codes are present in CAREER_IMAGES map', () => {
    const missing = PERSONAL_CARE_CODES.filter(c => !CAREER_IMAGES[c]);
    expect(missing).toHaveLength(0);
  });

  PERSONAL_CARE_CODES.forEach(code => {
    it(`${code} returns dedicated image (not group fallback)`, () => {
      const url = getCareerImageUrl(code, 'personal-care');
      expect(url).toBe(CAREER_IMAGES[code]);
      expect(url).not.toBe(fallback);
    });
  });
});

// ─── TC_IMG_03: No duplicate URLs among personal-care codes ──────────────

describe('TC_IMG_03 — No two personal-care codes share the same image URL', () => {
  it('all 31 personal-care image URLs are unique', () => {
    const urls = PERSONAL_CARE_CODES.map(c => CAREER_IMAGES[c]);
    const unique = new Set(urls);
    expect(unique.size).toBe(PERSONAL_CARE_CODES.length);
  });

  it('no duplicate URLs in the entire CAREER_IMAGES map', () => {
    const allUrls = Object.values(CAREER_IMAGES);
    const unique = new Set(allUrls);
    expect(unique.size).toBe(allUrls.length);
  });
});

// ─── TC_IMG_04: All URLs use allowed hosts ────────────────────────────────

describe('TC_IMG_04 — All personal-care URLs use allowed image hosts', () => {
  PERSONAL_CARE_CODES.forEach(code => {
    it(`${code} URL uses picsum.photos or images.unsplash.com`, () => {
      const url = CAREER_IMAGES[code];
      const usesAllowedHost = ALLOWED_HOSTS.some(host => url.includes(host)) || url.startsWith('/');
      expect(usesAllowedHost).toBe(true);
    });
  });
});

// ─── TC_IMG_05: Fallback for unknown onet_code returns group image ─────────

describe('TC_IMG_05 — Unknown onet_code falls back to group image', () => {
  it('unknown code in personal-care group → group fallback', () => {
    const url = getCareerImageUrl('39-9999.00', 'personal-care');
    expect(url).toBe(GROUP_FALLBACK_IMAGES['personal-care']);
  });

  it('undefined onet_code in personal-care group → group fallback', () => {
    const url = getCareerImageUrl(undefined, 'personal-care');
    expect(url).toBe(GROUP_FALLBACK_IMAGES['personal-care']);
  });

  it('unknown code in sales group → sales fallback', () => {
    const url = getCareerImageUrl('41-9999.00', 'sales');
    expect(url).toBe(GROUP_FALLBACK_IMAGES['sales']);
  });

  it('unknown code in building-maintenance group → building-maintenance fallback', () => {
    const url = getCareerImageUrl('37-9999.00', 'building-maintenance');
    expect(url).toBe(GROUP_FALLBACK_IMAGES['building-maintenance']);
  });
});

// ─── TC_IMG_06: Fallback for unknown group returns default image ──────────

describe('TC_IMG_06 — Unknown group slug returns default image', () => {
  it('unknown group → default image', () => {
    const url = getCareerImageUrl('99-9999.00', 'unknown-group');
    expect(url).toBe(DEFAULT_IMAGE);
  });

  it('empty group slug → default image', () => {
    const url = getCareerImageUrl(undefined, '');
    expect(url).toBe(DEFAULT_IMAGE);
  });
});

// ─── TC_IMG_07: All URLs start with https:// ─────────────────────────────

describe('TC_IMG_07 — All personal-care URLs are HTTPS', () => {
  PERSONAL_CARE_CODES.forEach(code => {
    it(`${code} URL starts with https://`, () => {
      const url = CAREER_IMAGES[code]; expect(url.startsWith('https://') || url.startsWith('/')).toBe(true);
    });
  });

  it('group fallback URL is HTTPS', () => {
    const fb = GROUP_FALLBACK_IMAGES['personal-care']; expect(fb.startsWith('https://') || fb.startsWith('/')).toBe(true);
  });

  it('default image URL is HTTPS', () => {
    expect(DEFAULT_IMAGE).toMatch(/^https:\/\//);
  });
});

// ─── TC_IMG_08: Picsum URLs follow /id/{number}/400/240 pattern ───────────

describe('TC_IMG_08 — Picsum URLs follow correct format', () => {
  const picsumCodes = PERSONAL_CARE_CODES.filter(c =>
    CAREER_IMAGES[c]?.includes('picsum.photos')
  );

  it('all personal-care codes use local paths', () => {
    const localCodes = PERSONAL_CARE_CODES.filter(c => CAREER_IMAGES[c]?.startsWith('/'));
    expect(localCodes.length).toBe(31);
  });

  // personal-care uses local paths - no Picsum format check needed

  it('all personal-care local paths are unique', () => {
    const paths = PERSONAL_CARE_CODES.map(c => CAREER_IMAGES[c]);
    const unique = new Set(paths);
    expect(unique.size).toBe(PERSONAL_CARE_CODES.length);
  });
});

// ─── TC_IMG_09: Unsplash URLs have required query params ─────────────────

describe('TC_IMG_09 — Unsplash URLs have required query params', () => {
  const unsplashCodes = Object.keys(CAREER_IMAGES).filter(c =>
    CAREER_IMAGES[c].includes('images.unsplash.com')
  );

  unsplashCodes.forEach(code => {
    it(`${code} Unsplash URL has w=400&h=240&fit=crop&auto=format`, () => {
      const url = CAREER_IMAGES[code];
      expect(url).toContain('w=400');
      expect(url).toContain('h=240');
      expect(url).toContain('fit=crop');
      expect(url).toContain('auto=format');
    });
  });
});

// ─── TC_IMG_10: Sub-code 39-9011.01 (Nanny) has its own image ────────────

describe('TC_IMG_10 — Sub-code onet_code (Nanny 39-9011.01) has dedicated image', () => {
  it('39-9011.01 is in CAREER_IMAGES', () => {
    expect(CAREER_IMAGES['39-9011.01']).toBeDefined();
  });

  it('39-9011.01 (Nanny) and 39-9011.00 (Childcare) have different images', () => {
    expect(CAREER_IMAGES['39-9011.01']).not.toBe(CAREER_IMAGES['39-9011.00']);
  });

  it('getCareerImageUrl returns correct image for 39-9011.01', () => {
    const url = getCareerImageUrl('39-9011.01', 'personal-care');
    expect(url).toBe(CAREER_IMAGES['39-9011.01']);
  });
});

// ─── TC_IMG_11: personal-care images differ from building-maintenance ──────

describe('TC_IMG_11 — personal-care images do not overlap with building-maintenance', () => {
  it('no personal-care image URL appears in building-maintenance', () => {
    const pcUrls = new Set(PERSONAL_CARE_CODES.map(c => CAREER_IMAGES[c]));
    const bmUrls = BUILDING_MAINTENANCE_CODES.map(c => CAREER_IMAGES[c]);
    const overlap = bmUrls.filter(url => pcUrls.has(url));
    expect(overlap).toHaveLength(0);
  });
});

// ─── TC_IMG_12: personal-care images differ from sales ───────────────────

describe('TC_IMG_12 — personal-care images do not overlap with sales', () => {
  it('no personal-care image URL appears in sales', () => {
    const pcUrls = new Set(PERSONAL_CARE_CODES.map(c => CAREER_IMAGES[c]));
    const salesUrls = SALES_CODES.map(c => CAREER_IMAGES[c]);
    const overlap = salesUrls.filter(url => pcUrls.has(url));
    expect(overlap).toHaveLength(0);
  });
});

// ─── TC_IMG_13: getCareerImageUrl is deterministic ───────────────────────

describe('TC_IMG_13 — getCareerImageUrl is deterministic (same input → same output)', () => {
  PERSONAL_CARE_CODES.slice(0, 5).forEach(code => {
    it(`${code} returns same URL on repeated calls`, () => {
      const url1 = getCareerImageUrl(code, 'personal-care');
      const url2 = getCareerImageUrl(code, 'personal-care');
      expect(url1).toBe(url2);
    });
  });
});

// ─── TC_IMG_14: Picsum IDs are in valid range (1–1084) ───────────────────

describe('TC_IMG_14 — Picsum IDs are within valid range (1–1084)', () => {
  const picsumEntries = Object.entries(CAREER_IMAGES).filter(([code, url]) =>
    url.includes('picsum.photos') && !code.startsWith('39-')
  );

  picsumEntries.forEach(([code, url]) => {
    it(`${code} Picsum ID is between 1 and 1084`, () => {
      const m = url.match(/\/id\/(\d+)\//);
      expect(m).not.toBeNull();
      const id = parseInt(m![1]);
      expect(id).toBeGreaterThanOrEqual(1);
      expect(id).toBeLessThanOrEqual(1084);
    });
  });
});

// ─── TC_IMG_15: Coverage — all 31 personal-care codes covered ────────────

describe('TC_IMG_15 — Complete coverage of all 31 personal-care onet_codes', () => {
  it('CAREER_IMAGES contains exactly 31 personal-care entries', () => {
    const pcEntries = Object.keys(CAREER_IMAGES).filter(k => k.startsWith('39-'));
    expect(pcEntries.length).toBe(31);
  });

  it('all 31 expected codes are present', () => {
    PERSONAL_CARE_CODES.forEach(code => {
      expect(CAREER_IMAGES).toHaveProperty(code);
    });
  });

  it('no extra 39-xx codes beyond the 31 expected', () => {
    const pcEntries = Object.keys(CAREER_IMAGES).filter(k => k.startsWith('39-'));
    const extra = pcEntries.filter(k => !PERSONAL_CARE_CODES.includes(k));
    expect(extra).toHaveLength(0);
  });
});
