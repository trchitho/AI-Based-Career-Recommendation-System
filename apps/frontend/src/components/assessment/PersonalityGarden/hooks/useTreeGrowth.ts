import { useState, useCallback, useEffect } from 'react';
import { TreeGrowthState, GrowthStage, GROWTH_STAGES } from '../types/garden.types';

const getStageFromProgress = (progress: number): GrowthStage => {
  if (progress === 0) return 'seed';
  if (progress <= 10) return 'sprout';
  if (progress <= 25) return 'seedling';
  if (progress <= 50) return 'young-plant';
  if (progress <= 75) return 'young-tree';
  if (progress < 100) return 'blooming-tree';
  return 'personality-tree';
};

// Get initial color palette from localStorage if available
const getInitialColorPalette = (): string[] => {
  try {
    // FIRST: Try direct color storage (most reliable)
    const savedColor = localStorage.getItem('pg_tree_color');
    if (savedColor) {
      const colors = JSON.parse(savedColor);
      console.log('[useTreeGrowth] Loaded color from direct storage:', colors);
      return colors;
    }
    
    // SECOND: Try to get from current session backup
    const backupKeys = ['pg_backup_current'];
    // Also check for session-specific backups
    for (let i = 1; i <= 10; i++) {
      backupKeys.push(`pg_backup_${i}`);
    }
    
    for (const key of backupKeys) {
      const backup = localStorage.getItem(key);
      if (backup) {
        const data = JSON.parse(backup);
        if (data.selectedSeed) {
          const colorPalettes: Record<string, string[]> = {
            oak: ['#8D6E63', '#A1887F', '#BCAAA4'],
            maple: ['#D32F2F', '#F44336', '#EF5350'],
            cherry: ['#EC407A', '#F06292', '#F48FB1'],
            pine: ['#388E3C', '#4CAF50', '#66BB6A'],
            willow: ['#7CB342', '#9CCC65', '#AED581']
          };
          const colors = colorPalettes[data.selectedSeed.id] || colorPalettes.oak;
          console.log('[useTreeGrowth] Loaded color from backup:', colors, 'seed:', data.selectedSeed.id);
          return colors;
        }
      }
    }
  } catch (error) {
    console.log('[useTreeGrowth] Could not load color from localStorage:', error);
  }
  // Default to green if nothing found
  console.log('[useTreeGrowth] Using default green color');
  return ['#7CB342', '#9CCC65', '#AED581'];
};

export const useTreeGrowth = () => {
  const [treeGrowth, setTreeGrowth] = useState<TreeGrowthState>({
    height: 0,
    branchCount: 0,
    leafDensity: 0,
    flowerCount: 0,
    glowIntensity: 0,
    trunkThickness: 1,
    colorPalette: getInitialColorPalette(), // Load from localStorage
    stage: 'seed'
  });

  const growTree = useCallback((progress: number) => {
    const stage = getStageFromProgress(progress);
    
    // Calculate growth values based on progress
    const height = Math.min(100, progress);
    const branchCount = Math.floor((progress / 100) * 20);
    const leafDensity = Math.min(100, progress * 1.2);
    const flowerCount = Math.max(0, Math.floor((progress - 50) / 2));
    const glowIntensity = Math.min(1, progress / 100);
    const trunkThickness = 1 + (progress / 100) * 9;

    setTreeGrowth({
      height,
      branchCount,
      leafDensity,
      flowerCount,
      glowIntensity,
      trunkThickness,
      colorPalette: treeGrowth.colorPalette,
      stage
    });
  }, [treeGrowth.colorPalette]);

  const setColorPalette = useCallback((colors: string[]) => {
    console.log('[useTreeGrowth] Setting color palette:', colors);
    setTreeGrowth(prev => ({
      ...prev,
      colorPalette: colors
    }));
    
    // Also save to localStorage immediately for persistence
    try {
      localStorage.setItem('pg_tree_color', JSON.stringify(colors));
      console.log('[useTreeGrowth] Saved color to localStorage');
    } catch (error) {
      console.log('[useTreeGrowth] Failed to save color');
    }
  }, []);

  const resetTree = useCallback(() => {
    setTreeGrowth({
      height: 0,
      branchCount: 0,
      leafDensity: 0,
      flowerCount: 0,
      glowIntensity: 0,
      trunkThickness: 1,
      colorPalette: ['#7CB342', '#9CCC65', '#AED581'],
      stage: 'seed'
    });
  }, []);

  return {
    treeGrowth,
    growTree,
    setColorPalette,
    resetTree
  };
};
