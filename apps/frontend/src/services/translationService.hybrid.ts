// Hybrid Translation Service - Ưu tiên backend, fallback sang frontend
import api from '../lib/api';
import translationService from './translationService';

class HybridTranslationService {
  private cache: Map<string, string> = new Map();

  // Dịch text - Ưu tiên backend
  async translateText(text: string, targetLang: string = 'vi'): Promise<string> {
    if (!text || targetLang === 'en') return text;

    // Check cache
    const cacheKey = `${text}_${targetLang}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      // Thử gọi backend trước
      const response = await api.post('/api/translate', {
        text,
        targetLang,
      });

      const translated = response.data.translatedText;
      this.cache.set(cacheKey, translated);
      return translated;
    } catch (error) {
      // Nếu backend lỗi, fallback sang frontend translation
      console.warn('Backend translation failed, using frontend fallback');
      return translationService.translateText(text, targetLang);
    }
  }

  // Dịch batch
  async translateBatch(texts: string[], targetLang: string = 'vi'): Promise<string[]> {
    if (targetLang === 'en') return texts;

    try {
      const response = await api.post('/api/translate/batch', {
        texts,
        targetLang,
      });

      return response.data.translations;
    } catch (error) {
      console.warn('Backend batch translation failed, using frontend fallback');
      return translationService.translateBatch(texts, targetLang);
    }
  }

  // Dịch object
  async translateObject<T extends Record<string, any>>(
    obj: T,
    fields: (keyof T)[],
    targetLang: string = 'vi'
  ): Promise<T> {
    if (targetLang === 'en') return obj;

    const translated = { ...obj };
    
    for (const field of fields) {
      if (typeof obj[field] === 'string') {
        const translatedText = await this.translateText(obj[field] as string, targetLang);
        (translated as any)[field] = translatedText;
      }
    }

    return translated;
  }

  // Dịch array
  async translateArray<T extends Record<string, any>>(
    items: T[],
    fields: (keyof T)[],
    targetLang: string = 'vi'
  ): Promise<T[]> {
    if (targetLang === 'en') return items;

    const promises = items.map(item => this.translateObject(item, fields, targetLang));
    return Promise.all(promises);
  }

  clearCache() {
    this.cache.clear();
  }
}

export const hybridTranslationService = new HybridTranslationService();
export default hybridTranslationService;
