/**
 * Asset URLs Configuration
 * 
 * Centralized configuration for all static assets (images, sounds, videos, etc.)
 * 
 * Usage:
 * import { ASSETS } from '@/config/assets';
 * const soundUrl = ASSETS.sounds.success;
 */

// Determine base URL based on environment
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

// Base URLs for different environments
const BASE_URLS = {
  // Local development - serve from public folder
  local: '',
  
  // Cloudflare R2 - Public URL from upload
  cloudflare: 'https://pub-8df5715d271b42d6bf03e5ecd279f612.r2.dev',
  
  // Cloudflare Pages - if deploying to Pages
  pages: 'https://your-site.pages.dev',
};

// Choose base URL based on environment
// Changed to 'cloudflare' for production after successful upload
const CURRENT_BASE = isDevelopment ? 'local' : 'cloudflare';

const baseUrl = BASE_URLS[CURRENT_BASE];

/**
 * Asset URLs
 */
export const ASSETS = {
  /**
   * Sound Effects
   */
  sounds: {
    // Success/celebration sound - plays on hover and submit
    success: `${baseUrl}/audio/success-sound.mp3`,
    
    // Hover sound - plays when hovering over buttons
    hover: `${baseUrl}/audio/success-sound.mp3`,
    
    // Add more sounds here as needed
    // click: `${baseUrl}/audio/click-sound.mp3`,
    // error: `${baseUrl}/audio/error-sound.mp3`,
  },

  /**
   * Images
   */
  images: {
    // Add image URLs here
    // logo: `${baseUrl}/images/logo.png`,
    // hero: `${baseUrl}/images/hero.jpg`,
  },

  /**
   * Videos
   */
  videos: {
    // Add video URLs here
    // intro: `${baseUrl}/videos/intro.mp4`,
  },
};

/**
 * Helper function to get asset URL
 * @param path - Relative path from public folder
 * @returns Full URL to asset
 */
export const getAssetUrl = (path: string): string => {
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
};

/**
 * Preload assets for better performance
 * Call this in App.tsx or main entry point
 */
export const preloadAssets = () => {
  // Preload critical sounds
  Object.values(ASSETS.sounds).forEach((url) => {
    const audio = new Audio(url);
    audio.preload = 'auto';
  });

  // Preload critical images
  Object.values(ASSETS.images).forEach((url) => {
    const img = new Image();
    img.src = url;
  });
};

export default ASSETS;
