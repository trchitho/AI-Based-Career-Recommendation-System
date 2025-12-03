/**
 * Format currency to VND
 */
export const formatVND = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

/**
 * Format number with thousand separators
 */
export const formatNumber = (amount: number): string => {
  return amount.toLocaleString('vi-VN');
};

/**
 * Parse VND string to number
 */
export const parseVND = (vndString: string): number => {
  return parseInt(vndString.replace(/[^\d]/g, ''), 10) || 0;
};
