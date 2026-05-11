import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes safely, resolving conflicts.
 * Use this everywhere instead of raw string concatenation.
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
