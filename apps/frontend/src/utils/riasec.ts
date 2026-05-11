/**
 * RIASEC utilities for consistent label display across the app
 */

// RIASEC letter → full name mapping (tiếng Việt)
export const RIASEC_LABEL_MAP: Record<string, string> = {
    R: 'Kỹ Thuật',
    I: 'Nghiên Cứu',
    A: 'Nghệ Thuật',
    S: 'Xã Hội',
    E: 'Kinh Doanh',
    C: 'Nghiệp Vụ',
    realistic: 'Kỹ Thuật',
    investigative: 'Nghiên Cứu',
    artistic: 'Nghệ Thuật',
    social: 'Xã Hội',
    enterprising: 'Kinh Doanh',
    conventional: 'Nghiệp Vụ',
};

/**
 * Convert RIASEC letter/key to full display name
 * @param value - RIASEC letter (R/I/A/S/E/C) or key (realistic/investigative/...)
 * @returns Full display name (e.g., "Realistic", "Investigative")
 */
export function getRIASECFullName(value: string | undefined | null): string {
    if (!value) return 'N/A';
    const key = value.trim();
    return RIASEC_LABEL_MAP[key] || RIASEC_LABEL_MAP[key.toUpperCase()] || key.toUpperCase();
}

/**
 * Convert RIASEC tag to display format
 * Tags can be single letter (R) or combinations (RC, RI, etc.)
 * @param tag - RIASEC tag (e.g., "R", "RC", "RI")
 * @returns Display format (e.g., "Realistic", "Realistic-Conventional")
 */
export function getRIASECTagDisplay(tag: string | undefined | null): string {
    if (!tag) return '';
    const trimmed = tag.trim().toUpperCase();

    // Single letter
    if (trimmed.length === 1) {
        return RIASEC_LABEL_MAP[trimmed] || trimmed;
    }

    // Combination (e.g., "RC" → "Realistic-Conventional")
    const parts = trimmed.split('').map(letter => RIASEC_LABEL_MAP[letter] || letter);
    return parts.join('-');
}
