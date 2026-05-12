/**
 * VietnamWorks Job Categories Service
 * Service for interacting with VietnamWorks job categories API
 */

import apiClient from '../lib/api-client';

// Types
export interface VietnamWorksCategory {
  id: number;
  name: string;
  slug: string;
  vietnamese_name: string;
  category_group: string;
  description?: string;
  vietnamworks_url?: string;
  is_active: boolean;
  sort_order: number;
}

export interface CategoryGroup {
  group_name: string;
  category_count: number;
  categories: VietnamWorksCategory[];
}

export interface CareerCategoryMapping {
  career_id: number;
  vietnamworks_category_id: number;
  confidence_score: number;
  mapping_method: string;
  category_name?: string;
  category_slug?: string;
  career_title_en?: string;
  career_title_vi?: string;
}

export interface VietnamWorksStats {
  categories: {
    total: number;
    active: number;
    groups: number;
  };
  mappings: {
    total: number;
    avg_confidence: number;
    high_confidence: number;
  };
}

export interface AutoMappingResult {
  careers_processed: number;
  mappings_created: number;
  min_confidence_used: number;
}

// Service class
class VietnamWorksService {
  private readonly baseUrl = '/api/vietnamworks';

  /**
   * Get all VietnamWorks categories with pagination and filtering
   */
  async getCategories(params?: {
    skip?: number;
    limit?: number;
    group?: string;
    active_only?: boolean;
  }): Promise<VietnamWorksCategory[]> {
    const response = await apiClient.get<VietnamWorksCategory[]>(`${this.baseUrl}/categories`, {
      params: {
        skip: params?.skip || 0,
        limit: params?.limit || 100,
        group: params?.group,
        active_only: params?.active_only ?? true,
      },
    });
    return response.data;
  }

  /**
   * Get category groups with their categories
   */
  async getCategoryGroups(activeOnly: boolean = true): Promise<CategoryGroup[]> {
    const response = await apiClient.get<CategoryGroup[]>(`${this.baseUrl}/categories/groups`, {
      params: { active_only: activeOnly },
    });
    return response.data;
  }

  /**
   * Get category by ID
   */
  async getCategoryById(categoryId: number): Promise<VietnamWorksCategory> {
    const response = await apiClient.get<VietnamWorksCategory>(`${this.baseUrl}/categories/${categoryId}`);
    return response.data;
  }

  /**
   * Get category by slug
   */
  async getCategoryBySlug(slug: string): Promise<VietnamWorksCategory> {
    const response = await apiClient.get<VietnamWorksCategory>(`${this.baseUrl}/categories/slug/${slug}`);
    return response.data;
  }

  /**
   * Search categories by name
   */
  async searchCategories(query: string, limit: number = 20): Promise<VietnamWorksCategory[]> {
    const response = await apiClient.get<VietnamWorksCategory[]>(`${this.baseUrl}/categories/search`, {
      params: { q: query, limit },
    });
    return response.data;
  }

  /**
   * Get career mappings for a specific career
   */
  async getCareerMappings(careerId: number, minConfidence: number = 0.0): Promise<CareerCategoryMapping[]> {
    const response = await apiClient.get<CareerCategoryMapping[]>(`${this.baseUrl}/mapping/career/${careerId}`, {
      params: { min_confidence: minConfidence },
    });
    return response.data;
  }

  /**
   * Get career mappings for a specific category
   */
  async getCategoryMappings(categoryId: number, minConfidence: number = 0.0, limit: number = 50): Promise<CareerCategoryMapping[]> {
    const response = await apiClient.get<CareerCategoryMapping[]>(`${this.baseUrl}/mapping/category/${categoryId}`, {
      params: { min_confidence: minConfidence, limit },
    });
    return response.data;
  }

  /**
   * Get VietnamWorks statistics
   */
  async getStats(): Promise<VietnamWorksStats> {
    const response = await apiClient.get<VietnamWorksStats>(`${this.baseUrl}/stats`);
    return response.data;
  }

  /**
   * Auto-map careers to categories
   */
  async autoMapCareers(minConfidence: number = 0.7, limit: number = 100): Promise<AutoMappingResult> {
    const response = await apiClient.post<AutoMappingResult>(`${this.baseUrl}/mapping/auto`, null, {
      params: { min_confidence: minConfidence, limit },
    });
    return response.data;
  }

  /**
   * Get all category group names (for dropdown/filter options)
   */
  async getCategoryGroupNames(): Promise<string[]> {
    const groups = await this.getCategoryGroups(true);
    return groups.map(group => group.group_name).sort();
  }

  /**
   * Get categories by group name
   */
  async getCategoriesByGroup(groupName: string): Promise<VietnamWorksCategory[]> {
    return this.getCategories({ group: groupName });
  }

  /**
   * Search categories with debounced input (for autocomplete)
   */
  createSearchFunction(debounceMs: number = 300) {
    let timeoutId: NodeJS.Timeout;
    
    return (query: string, callback: (results: VietnamWorksCategory[]) => void) => {
      clearTimeout(timeoutId);
      
      if (query.length < 2) {
        callback([]);
        return;
      }
      
      timeoutId = setTimeout(async () => {
        try {
          const results = await this.searchCategories(query);
          callback(results);
        } catch (error) {
          console.error('Search error:', error);
          callback([]);
        }
      }, debounceMs);
    };
  }

  /**
   * Format category for display
   */
  formatCategory(category: VietnamWorksCategory): string {
    return category.vietnamese_name || category.name;
  }

  /**
   * Get popular categories (based on mappings or usage)
   */
  async getPopularCategories(limit: number = 10): Promise<VietnamWorksCategory[]> {
    // This could be enhanced to use actual popularity metrics
    // For now, return categories with most mappings
    const response = await apiClient.get<VietnamWorksCategory[]>(`${this.baseUrl}/categories`, {
      params: { 
        limit, 
        active_only: true,
        // Sort by popularity would need backend support
      },
    });
    return response.data;
  }

  /**
   * Get related categories for a given category
   */
  async getRelatedCategories(categoryId: number, limit: number = 5): Promise<VietnamWorksCategory[]> {
    try {
      // Get the category first
      const category = await this.getCategoryById(categoryId);
      
      // Get other categories from the same group
      const sameGroupCategories = await this.getCategoriesByGroup(category.category_group);
      
      // Filter out the current category and limit results
      return sameGroupCategories
        .filter(cat => cat.id !== categoryId)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting related categories:', error);
      return [];
    }
  }
}

// Export singleton instance
export const vietnamworksService = new VietnamWorksService();

// Types are already exported when declared above
