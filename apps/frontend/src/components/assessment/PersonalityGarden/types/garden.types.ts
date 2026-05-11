// Core tree growth state
export interface TreeGrowthState {
  height: number;           // 0-100
  branchCount: number;      // 2-20
  leafDensity: number;      // 0-100
  flowerCount: number;      // 0-50
  glowIntensity: number;    // 0-1
  trunkThickness: number;   // 1-10
  colorPalette: string[];   // Based on personality
  stage: GrowthStage;
}

export type GrowthStage = 
  | 'seed'
  | 'sprout'
  | 'seedling'
  | 'young-plant'
  | 'young-tree'
  | 'blooming-tree'
  | 'personality-tree';

export interface Branch {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  thickness: number;
  angle: number;
  length: number;
  color: string;
  children?: Branch[];
}

export interface Leaf {
  id: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
  color: string;
  opacity: number;
  shape: 'round' | 'heart' | 'geometric' | 'broad';
}

export interface Flower {
  id: string;
  x: number;
  y: number;
  size: number;
  color: string;
  petalCount: number;
  bloomProgress: number; // 0-1
}

export interface ParticleEffect {
  id: string;
  type: 'sparkle' | 'leaf' | 'petal' | 'firefly' | 'butterfly';
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  rotation: number;
}

export interface NurtureElement {
  id: string;
  type: 'sunlight' | 'water' | 'fertilizer' | 'nutrients' | 'soil';
  label: string;
  emoji: string;
  value: string | number;
  color: string;
  particleColor: string;
}

export interface PersonalityTraits {
  riasec: {
    realistic: number;
    investigative: number;
    artistic: number;
    social: number;
    enterprising: number;
    conventional: number;
  };
  bigFive: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  dominantTrait: string;
  secondaryTrait: string;
}

export interface FloatingLabel {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  icon?: string;
  description?: string;
}

export type TimeOfDay = 'dawn' | 'day' | 'golden' | 'twilight';

export interface EnvironmentState {
  timeOfDay: TimeOfDay;
  skyGradient: string[];
  lightIntensity: number;
  particleDensity: number;
  weatherEffect?: 'breeze' | 'gentle-rain' | 'sparkles';
}

// RIASEC visual mapping
export interface RIASECVisual {
  trunkStyle: string;
  branchPattern: string;
  colors: string[];
  leafShape: Leaf['shape'];
  specialFeature: string;
}

export const RIASEC_VISUALS: Record<string, RIASECVisual> = {
  realistic: {
    trunkStyle: 'strong-sturdy',
    branchPattern: 'geometric-structured',
    colors: ['#8D6E63', '#A1887F', '#BCAAA4'],
    leafShape: 'broad',
    specialFeature: 'tool-shaped-fruits'
  },
  investigative: {
    trunkStyle: 'tall-elegant',
    branchPattern: 'fractal-mathematical',
    colors: ['#42A5F5', '#64B5F6', '#90CAF9'],
    leafShape: 'geometric',
    specialFeature: 'glowing-orbs'
  },
  artistic: {
    trunkStyle: 'curved-flowing',
    branchPattern: 'organic-asymmetric',
    colors: ['#9C27B0', '#BA68C8', '#CE93D8'],
    leafShape: 'round',
    specialFeature: 'rainbow-flowers'
  },
  social: {
    trunkStyle: 'welcoming-wide',
    branchPattern: 'spreading-open',
    colors: ['#FF9800', '#FFB74D', '#FFCC80'],
    leafShape: 'heart',
    specialFeature: 'butterflies-birds'
  },
  enterprising: {
    trunkStyle: 'tall-commanding',
    branchPattern: 'upward-reaching',
    colors: ['#FFD54F', '#FFF59D', '#FFF9C4'],
    leafShape: 'broad',
    specialFeature: 'crown-like-top'
  },
  conventional: {
    trunkStyle: 'balanced-symmetrical',
    branchPattern: 'orderly-structured',
    colors: ['#7CB342', '#9CCC65', '#AED581'],
    leafShape: 'round',
    specialFeature: 'organized-clusters'
  }
};

// Big Five effects
export interface BigFiveEffect {
  effect: string;
  intensity: 'low' | 'medium' | 'high';
  particles: string;
}

export const BIG_FIVE_EFFECTS: Record<string, BigFiveEffect> = {
  openness: {
    effect: 'colorful-flowers',
    intensity: 'high',
    particles: 'sparkles'
  },
  conscientiousness: {
    effect: 'symmetrical-branches',
    intensity: 'medium',
    particles: 'organized-leaves'
  },
  extraversion: {
    effect: 'bright-glow',
    intensity: 'high',
    particles: 'butterflies'
  },
  agreeableness: {
    effect: 'soft-rounded-leaves',
    intensity: 'medium',
    particles: 'gentle-breeze'
  },
  neuroticism: {
    effect: 'protective-thorns',
    intensity: 'low',
    particles: 'calm-mist'
  }
};

// Growth stage thresholds
export const GROWTH_STAGES: Record<GrowthStage, { min: number; max: number }> = {
  'seed': { min: 0, max: 0 },
  'sprout': { min: 1, max: 10 },
  'seedling': { min: 11, max: 25 },
  'young-plant': { min: 26, max: 50 },
  'young-tree': { min: 51, max: 75 },
  'blooming-tree': { min: 76, max: 99 },
  'personality-tree': { min: 100, max: 100 }
};

// Time of day based on progress
export const getTimeOfDay = (progress: number): TimeOfDay => {
  if (progress < 25) return 'dawn';
  if (progress < 50) return 'day';
  if (progress < 75) return 'golden';
  return 'twilight';
};

// Sky gradients for each time of day
export const SKY_GRADIENTS: Record<TimeOfDay, string[]> = {
  dawn: ['#FFE5B4', '#FFD4A3', '#FFC892'],
  day: ['#87CEEB', '#B0E0E6', '#E0F6FF'],
  golden: ['#FFB347', '#FFA07A', '#FF8C69'],
  twilight: ['#9B59B6', '#8E44AD', '#6C3483']
};
