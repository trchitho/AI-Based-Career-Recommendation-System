/**
 * RIASEC utilities for consistent label display across the app
 */

// RIASEC letter → full name mapping (tiếng Việt + mã gốc)
export const RIASEC_LABEL_MAP: Record<string, string> = {
    R: 'Kỹ Thuật (Realistic)',
    I: 'Nghiên Cứu (Investigative)',
    A: 'Nghệ Thuật (Artistic)',
    S: 'Xã Hội (Social)',
    E: 'Kinh Doanh (Enterprising)',
    C: 'Nghiệp Vụ (Conventional)',
    realistic: 'Kỹ Thuật (Realistic)',
    investigative: 'Nghiên Cứu (Investigative)',
    artistic: 'Nghệ Thuật (Artistic)',
    social: 'Xã Hội (Social)',
    enterprising: 'Kinh Doanh (Enterprising)',
    conventional: 'Nghiệp Vụ (Conventional)',
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
