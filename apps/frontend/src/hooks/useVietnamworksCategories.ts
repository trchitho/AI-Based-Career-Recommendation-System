/**
 * React hooks for VietnamWorks Job Categories
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  vietnamworksService,
  VietnamWorksCategory,
  CategoryGroup,
  CareerCategoryMapping,
  VietnamWorksStats,
  AutoMappingResult,
} from '../services/vietnamworksService';

// Query keys
export const VIETNAMWORKS_KEYS = {
  categories: ['vietnamworks', 'categories'],
  categoryGroups: ['vietnamworks', 'categoryGroups'],
  category: (id: number) => ['vietnamworks', 'category', id],
  categoryBySlug: (slug: string) => ['vietnamworks', 'category', 'slug', slug],
  search: (query: string) => ['vietnamworks', 'search', query],
  careerMappings: (careerId: number) => ['vietnamworks', 'mapping', 'career', careerId],
  categoryMappings: (categoryId: number) => ['vietnamworks', 'mapping', 'category', categoryId],
  stats: ['vietnamworks', 'stats'],
  popular: ['vietnamworks', 'popular'],
  related: (categoryId: number) => ['vietnamworks', 'related', categoryId],
};

// Hook for getting all categories
export function useVietnamworksCategories(params?: {
  skip?: number;
  limit?: number;
  group?: string;
  active_only?: boolean;
}) {
  return useQuery({
    queryKey: [...VIETNAMWORKS_KEYS.categories, params],
    queryFn: () => vietnamworksService.getCategories(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for getting category groups
export function useCategoryGroups(activeOnly: boolean = true) {
  return useQuery({
    queryKey: [...VIETNAMWORKS_KEYS.categoryGroups, { activeOnly }],
    queryFn: () => vietnamworksService.getCategoryGroups(activeOnly),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook for getting category by ID
export function useCategory(categoryId: number) {
  return useQuery({
    queryKey: VIETNAMWORKS_KEYS.category(categoryId),
    queryFn: () => vietnamworksService.getCategoryById(categoryId),
    enabled: !!categoryId,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

// Hook for getting category by slug
export function useCategoryBySlug(slug: string) {
  return useQuery({
    queryKey: VIETNAMWORKS_KEYS.categoryBySlug(slug),
    queryFn: () => vietnamworksService.getCategoryBySlug(slug),
    enabled: !!slug,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

// Hook for searching categories
export function useCategorySearch(query: string, limit: number = 20) {
  return useQuery({
    queryKey: VIETNAMWORKS_KEYS.search(query),
    queryFn: () => vietnamworksService.searchCategories(query, limit),
    enabled: query.length >= 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Hook for career mappings
export function useCareerMappings(careerId: number, minConfidence: number = 0.0) {
  return useQuery({
    queryKey: [...VIETNAMWORKS_KEYS.careerMappings(careerId), { minConfidence }],
    queryFn: () => vietnamworksService.getCareerMappings(careerId, minConfidence),
    enabled: !!careerId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook for category mappings
export function useCategoryMappings(categoryId: number, minConfidence: number = 0.0, limit: number = 50) {
  return useQuery({
    queryKey: [...VIETNAMWORKS_KEYS.categoryMappings(categoryId), { minConfidence, limit }],
    queryFn: () => vietnamworksService.getCategoryMappings(categoryId, minConfidence, limit),
    enabled: !!categoryId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook for statistics
export function useVietnamworksStats() {
  return useQuery({
    queryKey: VIETNAMWORKS_KEYS.stats,
    queryFn: () => vietnamworksService.getStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for popular categories
export function usePopularCategories(limit: number = 10) {
  return useQuery({
    queryKey: [...VIETNAMWORKS_KEYS.popular, { limit }],
    queryFn: () => vietnamworksService.getPopularCategories(limit),
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

// Hook for related categories
export function useRelatedCategories(categoryId: number, limit: number = 5) {
  return useQuery({
    queryKey: [...VIETNAMWORKS_KEYS.related(categoryId), { limit }],
    queryFn: () => vietnamworksService.getRelatedCategories(categoryId, limit),
    enabled: !!categoryId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook for auto-mapping careers (mutation)
export function useAutoMapCareers() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: { minConfidence?: number; limit?: number }) =>
      vietnamworksService.autoMapCareers(params.minConfidence, params.limit),
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: VIETNAMWORKS_KEYS.stats });
      queryClient.invalidateQueries({ queryKey: VIETNAMWORKS_KEYS.categories });
      
      console.log('Auto-mapping completed:', data);
    },
    onError: (error) => {
      console.error('Auto-mapping failed:', error);
    },
  });
}

// Custom hook for category search with debouncing
export function useCategorySearchWithDebounce(debounceMs: number = 300) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  
  // Debounce the search query
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, debounceMs);
    
    return () => clearTimeout(timeoutId);
  }, [searchQuery, debounceMs]);
  
  // Use the search hook with debounced query
  const searchResults = useCategorySearch(debouncedQuery);
  
  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isLoading: searchResults.isLoading && debouncedQuery.length >= 2,
    results: searchResults.data || [],
  };
}

// Custom hook for category management
export function useCategoryManagement() {
  const categoriesQuery = useVietnamworksCategories();
  const groupsQuery = useCategoryGroups();
  const statsQuery = useVietnamworksStats();
  const popularQuery = usePopularCategories();
  const autoMapMutation = useAutoMapCareers();
  
  const isLoading = categoriesQuery.isLoading || groupsQuery.isLoading || statsQuery.isLoading;
  
  const getCategoryByGroup = useCallback((groupName: string) => {
    return categoriesQuery.data?.filter(cat => cat.category_group === groupName) || [];
  }, [categoriesQuery.data]);
  
  const getCategoryGroups = useMemo(() => {
    if (!groupsQuery.data) return [];
    return groupsQuery.data.map(group => group.group_name);
  }, [groupsQuery.data]);
  
  const searchCategories = useCallback((query: string) => {
    if (!categoriesQuery.data) return [];
    const lowerQuery = query.toLowerCase();
    return categoriesQuery.data.filter(cat =>
      cat.vietnamese_name.toLowerCase().includes(lowerQuery) ||
      cat.name.toLowerCase().includes(lowerQuery) ||
      cat.description?.toLowerCase().includes(lowerQuery)
    );
  }, [categoriesQuery.data]);
  
  return {
    // Data
    categories: categoriesQuery.data || [],
    groups: groupsQuery.data || [],
    stats: statsQuery.data,
    popularCategories: popularQuery.data || [],
    
    // Loading states
    isLoading,
    isCategoriesLoading: categoriesQuery.isLoading,
    isGroupsLoading: groupsQuery.isLoading,
    isStatsLoading: statsQuery.isLoading,
    
    // Actions
    getCategoryByGroup,
    getCategoryGroups,
    searchCategories,
    autoMapCareers: autoMapMutation.mutate,
    isAutoMapping: autoMapMutation.isPending,
    
    // Refetch functions
    refetchCategories: categoriesQuery.refetch,
    refetchGroups: groupsQuery.refetch,
    refetchStats: statsQuery.refetch,
  };
}

// Default export is the main hook
export default useVietnamworksCategories;
