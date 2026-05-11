import { useState, useCallback } from 'react';
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

export const useTreeGrowth = () => {
  const [treeGrowth, setTreeGrowth] = useState<TreeGrowthState>({
    height: 0,
    branchCount: 0,
    leafDensity: 0,
    flowerCount: 0,
    glowIntensity: 0,
    trunkThickness: 1,
    colorPalette: ['#7CB342', '#9CCC65', '#AED581'],
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
    setTreeGrowth(prev => ({
      ...prev,
      colorPalette: colors
    }));
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
