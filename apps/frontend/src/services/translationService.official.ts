// Translation Service - Sử dụng Google Cloud Translation API (Chính thức)
import axios from 'axios';

// Cần có Google Cloud API Key
const GOOGLE_TRANSLATE_API_KEY = import.meta.env['VITE_GOOGLE_TRANSLATE_API_KEY'] || '';

class OfficialTranslationService {
  private cache: Map<string, string> = new Map();
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Dịch text sử dụng Google Cloud Translation API
  async translateText(text: string, targetLang: string = 'vi'): Promise<string> {
    if (!text || targetLang === 'en') return text;
    if (!this.apiKey) {
      console.warn('Google Translate API key not found');
      return text;
    }

    // Check cache
    const cacheKey = `${text}_${targetLang}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const response = await axios.post(
        `https://translation.googleapis.com/language/translate/v2?key=${this.apiKey}`,
        {
          q: text,
          source: 'en',
          target: targetLang,
          format: 'text',
        }
      );

      const translated = response.data.data.translations[0].translatedText;
      
      // Cache kết quả
      this.cache.set(cacheKey, translated);
      
      return translated;
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  }

  // Dịch nhiều text cùng lúc (tối ưu hơn)
  async translateBatch(texts: string[], targetLang: string = 'vi'): Promise<string[]> {
    if (targetLang === 'en' || !this.apiKey) return texts;

    try {
      const response = await axios.post(
        `https://translation.googleapis.com/language/translate/v2?key=${this.apiKey}`,
        {
          q: texts,
          source: 'en',
          target: targetLang,
          format: 'text',
        }
      );

      return response.data.data.translations.map((t: any) => t.translatedText);
    } catch (error) {
      console.error('Batch translation error:', error);
      return texts;
    }
  }

  // Dịch object với nhiều field
  async translateObject<T extends Record<string, any>>(
    obj: T,
    fields: (keyof T)[],
    targetLang: string = 'vi'
  ): Promise<T> {
    if (targetLang === 'en') return obj;

    const translated = { ...obj };
    const textsToTranslate: string[] = [];
    const fieldMap: (keyof T)[] = [];

    // Collect all texts to translate
    for (const field of fields) {
      if (typeof obj[field] === 'string') {
        textsToTranslate.push(obj[field] as string);
        fieldMap.push(field);
      }
    }

    // Translate all at once
    const translatedTexts = await this.translateBatch(textsToTranslate, targetLang);

    // Map back to object
    translatedTexts.forEach((text, index) => {
      (translated as any)[fieldMap[index]] = text;
    });

    return translated;
  }

  // Dịch array of objects (tối ưu với batch)
  async translateArray<T extends Record<string, any>>(
    items: T[],
    fields: (keyof T)[],
    targetLang: string = 'vi'
  ): Promise<T[]> {
    if (targetLang === 'en') return items;

    // Collect all texts from all items
    const allTexts: string[] = [];
    const textMap: Array<{ itemIndex: number; field: keyof T }> = [];

    items.forEach((item, itemIndex) => {
      fields.forEach(field => {
        if (typeof item[field] === 'string') {
          allTexts.push(item[field] as string);
          textMap.push({ itemIndex, field });
        }
      });
    });

    // Translate all texts at once
    const translatedTexts = await this.translateBatch(allTexts, targetLang);

    // Create translated items
    const translatedItems = items.map(item => ({ ...item }));

    // Map translated texts back
    translatedTexts.forEach((text, index) => {
      const mapping = textMap[index];
      if (mapping) {
        const { itemIndex, field } = mapping;
        (translatedItems[itemIndex] as any)[field] = text;
      }
    });

    return translatedItems;
  }

  clearCache() {
    this.cache.clear();
  }
}

export const officialTranslationService = new OfficialTranslationService(GOOGLE_TRANSLATE_API_KEY);
export default officialTranslationService;
