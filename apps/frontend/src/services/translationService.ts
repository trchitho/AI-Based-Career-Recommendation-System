// Translation Service - Dịch động nội dung
import axios from 'axios';

// Sử dụng Google Translate API miễn phí (unofficial)
// Hoặc có thể thay bằng API chính thức nếu có key

class TranslationService {
  private cache: Map<string, string> = new Map();
  private currentLanguage: string = 'en';

  setLanguage(lang: string) {
    this.currentLanguage = lang;
  }

  getLanguage(): string {
    return this.currentLanguage;
  }

  // Dịch text sử dụng Google Translate API miễn phí
  async translateText(text: string, targetLang: string = 'vi'): Promise<string> {
    if (!text || targetLang === 'en') return text;

    // Check cache
    const cacheKey = `${text}_${targetLang}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      // Sử dụng Google Translate API miễn phí qua proxy
      const response = await axios.get('https://translate.googleapis.com/translate_a/single', {
        params: {
          client: 'gtx',
          sl: 'en',
          tl: targetLang,
          dt: 't',
          q: text,
        },
      });

      const translated = response.data[0][0][0];
      
      // Cache kết quả
      this.cache.set(cacheKey, translated);
      
      return translated;
    } catch (error) {
      console.error('Translation error:', error);
      return text; // Trả về text gốc nếu lỗi
    }
  }

  // Dịch nhiều text cùng lúc
  async translateBatch(texts: string[], targetLang: string = 'vi'): Promise<string[]> {
    if (targetLang === 'en') return texts;

    const promises = texts.map(text => this.translateText(text, targetLang));
    return Promise.all(promises);
  }

  // Dịch object với nhiều field
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
        // Use type assertion to bypass TypeScript strict checking
        (translated as any)[field] = translatedText;
      }
    }

    return translated;
  }

  // Dịch array of objects
  async translateArray<T extends Record<string, any>>(
    items: T[],
    fields: (keyof T)[],
    targetLang: string = 'vi'
  ): Promise<T[]> {
    if (targetLang === 'en') return items;

    const promises = items.map(item => this.translateObject(item, fields, targetLang));
    return Promise.all(promises);
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }
}

export const translationService = new TranslationService();
export default translationService;
