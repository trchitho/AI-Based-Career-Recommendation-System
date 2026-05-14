import { useRef, useMemo } from 'react';
import { TreeGrowthState, NurtureElement } from './types/garden.types';

interface TreeCanvasProps {
  growth: TreeGrowthState;
  isAnimating?: boolean;
  selectedElement?: NurtureElement | null;
  personality?: any;
  timeOfDay?: 'morning' | 'noon' | 'afternoon' | 'evening';
}

interface BranchSegment {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  thickness: number;
  depth: number;
}

const TreeCanvas: React.FC<TreeCanvasProps> = ({
  growth,
  isAnimating,
  selectedElement,
  timeOfDay = 'morning'
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  // Generate visible roots above ground
  const generateRoots = () => {
    const roots: any[] = [];
    const baseX = 200;
    const baseY = 440; // Match pot soil level
    
    if (growth.height > 10) {
      const numRoots = Math.min(5, Math.floor(growth.height / 20) + 2);
      
      for (let i = 0; i < numRoots; i++) {
        const angle = (i / numRoots) * Math.PI - Math.PI / 2;
        const length = 30 + (growth.height / 100) * 30;
        const controlX = baseX + Math.cos(angle) * (length * 0.6);
        const controlY = baseY + 10 + Math.sin(angle) * (length * 0.3);
        const endX = baseX + Math.cos(angle) * length;
        const endY = baseY + 15 + Math.sin(angle) * (length * 0.2);
        
        roots.push({
          id: `root-${i}`,
          path: `M ${baseX} ${baseY} Q ${controlX} ${controlY} ${endX} ${endY}`,
          thickness: Math.max(2, growth.trunkThickness * 0.6)
        });
      }
    }
    
    return roots;
  };

  // Generate realistic tree branches - OPTIMIZED FOR PERFORMANCE
  const generateBranches = () => {
    const branches: BranchSegment[] = [];
    const baseX = 200;
    const baseY = 440; // Match pot soil level
    // LIMIT trunk height to prevent tree from being too tall and covering questions
    const maxTrunkHeight = 180; // Reduced from 240 to keep tree shorter
    const trunkHeight = Math.max(60, Math.min(maxTrunkHeight, (growth.height / 100) * 200));
    
    // DON'T add trunk here - add it at the END so it renders on top
    
    // Add small sprout at top even when height is low
    if (growth.height > 0 && growth.height < 15) {
      // Tiny sprout - JUST A SMALL STEM with 2 leaf branches
      const sproutY = baseY - Math.max(20, trunkHeight * 0.5); // Much shorter stem
      
      // Add tiny trunk for sprout (very thin and short)
      branches.push({
        startX: baseX,
        startY: baseY,
        endX: baseX,
        endY: sproutY,
        thickness: 3, // Very thin stem
        depth: -1 // Mark as trunk
      });
      
      // Just 2 tiny leaf branches
      branches.push({
        startX: baseX,
        startY: sproutY,
        endX: baseX - 8,
        endY: sproutY - 10,
        thickness: 2,
        depth: 0
      });
      branches.push({
        startX: baseX,
        startY: sproutY,
        endX: baseX + 8,
        endY: sproutY - 10,
        thickness: 2,
        depth: 0
      });
      
      // Return early - no complex branching for sprout stage
      return branches;
    }
    
    // Recursive branch generation - OPTIMIZED: Reduced max depth
    const generateBranch = (
      startX: number,
      startY: number,
      angle: number,
      length: number,
      thickness: number,
      depth: number,
      maxDepth: number
    ) => {
      if (depth > maxDepth || length < 8) return;
      
      const endX = startX + Math.cos(angle) * length;
      const endY = startY + Math.sin(angle) * length;
      
      branches.push({
        startX,
        startY,
        endX,
        endY,
        thickness: Math.max(1, thickness),
        depth
      });
      
      // Generate sub-branches - MORE sub-branches for fuller tree
      if (depth < maxDepth) {
        const numSubs = depth === 0 ? 4 : (depth === 1 ? 3 : 2); // Increased to 4:3:2 ratio for much fuller branching
        for (let i = 0; i < numSubs; i++) {
          const angleSpread = (Math.random() - 0.5) * (Math.PI / 2.5); // More random spread
          const newAngle = angle + angleSpread;
          const newLength = length * (0.6 + Math.random() * 0.2);
          const newThickness = thickness * 0.7;
          
          generateBranch(endX, endY, newAngle, newLength, newThickness, depth + 1, maxDepth);
        }
      }
    };
    
    // Generate main branches (only when height > 15%) - FULLER TREE
    if (growth.branchCount > 0 && growth.height >= 15) {
      const maxDepth = Math.min(3, Math.floor(growth.branchCount / 1.5)); // Keep depth 3
      const numMainBranches = Math.min(10, Math.ceil(growth.branchCount / 0.8)); // Increased from 8 to 10
      
      for (let i = 0; i < numMainBranches; i++) {
        const heightRatio = 0.4 + (i / numMainBranches) * 0.6; // Start even lower (40% instead of 50%)
        const startY = baseY - trunkHeight * heightRatio;
        // BALANCED angle distribution - alternate left/right for symmetry
        const side = i % 2 === 0 ? 1 : -1; // Alternate sides
        const angleOffset = Math.floor(i / 2) * (Math.PI / 9); // Smaller angle for more branches (π/9 instead of π/8)
        const angle = -Math.PI / 2 + (side * angleOffset) + (Math.random() - 0.5) * 0.2; // Add randomness
        const length = 20 + (growth.height / 100) * 35; // Keep same length
        const thickness = 6 - (i * 0.3); // Thinner reduction for more branches
        
        generateBranch(baseX, startY, angle, length, thickness, 0, maxDepth);
      }
    }
    
    // ADD TRUNK AT THE END - so it renders on TOP of all branches
    branches.push({
      startX: baseX,
      startY: baseY,
      endX: baseX,
      endY: baseY - Math.max(30, trunkHeight),
      thickness: Math.max(15, growth.trunkThickness * 1.5), // Thicker trunk for visibility
      depth: -1 // Trunk marker
    });
    
    return branches;
  };

  // Generate leaves DIRECTLY on branches - OPTIMIZED FOR PERFORMANCE
  const generateLeaves = (branches: BranchSegment[]) => {
    const leaves: any[] = [];
    
    // Show leaves earlier - even for tiny sprout
    if (growth.height === 0 || growth.branchCount === 0) return [];
    
    // For very early stage (0-15%), show tiny sprout leaves
    if (growth.height > 0 && growth.height < 15) {
      const baseX = 200;
      const baseY = 440; // Match pot soil level
      const trunkHeight = Math.max(30, (growth.height / 100) * 240);
      const sproutY = baseY - trunkHeight;
      
      // Only show sprout leaves if height > 5% (give branches time to appear first)
      if (growth.height > 5) {
        // 2 tiny leaves at top
        leaves.push({
          id: 'sprout-leaf-1',
          x: baseX - 8,
          y: sproutY - 10,
          size: 8,
          rotation: -45,
          color: growth.colorPalette[0],
          opacity: 0.9
        });
        leaves.push({
          id: 'sprout-leaf-2',
          x: baseX + 8,
          y: sproutY - 10,
          size: 8,
          rotation: 45,
          color: growth.colorPalette[0],
          opacity: 0.9
        });
      }
      
      return leaves;
    }
    
    // Use ALL branches except trunk - place leaves on every branch
    const allBranches = branches.filter(b => b.depth !== -1); // Exclude trunk only, keep ALL other branches
    
    if (allBranches.length === 0) return [];
    
    // Calculate leaves - PROGRESSIVE: fewer leaves at early stages
    const leafDensity = Math.max(50, growth.leafDensity);
    
    // PROGRESSIVE LEAF COUNT based on tree height
    let leavesPerBranch: number;
    if (growth.height < 15) {
      // Very early stage (câu 1-5): only 1-2 leaves per branch
      leavesPerBranch = Math.max(1, Math.min(2, Math.floor((leafDensity / 100) * 3)));
    } else if (growth.height < 40) {
      // Early-mid stage (câu 6-13): 2-3 leaves per branch
      // BUT: only add leaves to branches that have "matured"
      // Branches appear at height 15%, leaves start appearing at height 18%
      if (growth.height < 18) {
        return []; // No leaves yet, let branches show first for 1 question
      }
      leavesPerBranch = Math.max(2, Math.min(3, Math.floor((leafDensity / 100) * 5)));
    } else if (growth.height < 70) {
      // Mid-late stage (câu 14-23): 3-4 leaves per branch
      leavesPerBranch = Math.max(3, Math.min(4, Math.floor((leafDensity / 100) * 6)));
    } else {
      // Late stage (câu 24-33): 4-5 leaves per branch (full grown)
      leavesPerBranch = Math.max(4, Math.min(5, Math.floor((leafDensity / 100) * 8)));
    }
    
    console.log('[TreeCanvas] Generating leaves:', {
      height: growth.height,
      branchCount: growth.branchCount,
      leafDensity,
      totalBranches: allBranches.length,
      leavesPerBranch,
      estimatedLeaves: allBranches.length * leavesPerBranch
    });
    
    // CRITICAL FIX: Use ALL branches without limit to ensure new branches get leaves
    allBranches.forEach((branch, idx) => {
      // Place leaves ALONG the ENTIRE branch with MORE coverage
      for (let i = 0; i < leavesPerBranch; i++) {
        const t = 0.2 + (i / leavesPerBranch) * 0.8; // Start from 20% along branch to 100%
        const x = branch.startX + (branch.endX - branch.startX) * t;
        const y = branch.startY + (branch.endY - branch.startY) * t;
        
        // Larger offset perpendicular to branch for fuller appearance
        const branchAngle = Math.atan2(branch.endY - branch.startY, branch.endX - branch.startX);
        const perpAngle = branchAngle + Math.PI / 2;
        const offset = (Math.random() - 0.5) * 20; // Increased from 15 to 20 for wider spread
        
        leaves.push({
          id: `leaf-${idx}-${i}`,
          x: x + Math.cos(perpAngle) * offset,
          y: y + Math.sin(perpAngle) * offset,
          size: 9 + Math.random() * 5, // Increased from 8+4 to 9+5 for larger leaves (9-14px)
          rotation: (branchAngle * 180 / Math.PI) + (Math.random() - 0.5) * 50,
          color: growth.colorPalette[Math.floor(Math.random() * growth.colorPalette.length)],
          opacity: 0.9 + Math.random() * 0.1 // High opacity for better visibility
        });
      }
    });
    
    console.log('[TreeCanvas] Generated', leaves.length, 'leaves');
    return leaves;
  };

  // Generate flowers on branch tips
  const generateFlowers = (branches: BranchSegment[]) => {
    const flowers: any[] = [];
    
    if (growth.flowerCount === 0 || growth.height < 50) return [];
    
    // Get outermost branches
    const outerBranches = branches
      .filter(b => b.depth >= 3)
      .sort(() => Math.random() - 0.5)
      .slice(0, growth.flowerCount);
    
    outerBranches.forEach((branch, i) => {
      flowers.push({
        id: `flower-${i}`,
        x: branch.endX + (Math.random() - 0.5) * 8,
        y: branch.endY + (Math.random() - 0.5) * 8,
        size: 8 + Math.random() * 4,
        color: ['#FF69B4', '#FFB6C1', '#FFC0CB', '#FF1493', '#FF85C1'][i % 5],
        rotation: Math.random() * 360
      });
    });
    
    return flowers;
  };

  // Memoize expensive calculations to prevent re-rendering
  const roots = useMemo(() => generateRoots(), [growth.height, growth.trunkThickness]);
  const branches = useMemo(() => generateBranches(), [growth.height, growth.branchCount, growth.trunkThickness]);
  // CRITICAL: Add growth.height and growth.branchCount to force leaf regeneration when tree grows
  const leaves = useMemo(() => generateLeaves(branches), [branches, growth.leafDensity, growth.colorPalette, growth.height, growth.branchCount]);
  const flowers = useMemo(() => generateFlowers(branches), [branches, growth.flowerCount, growth.height]);

  // Generate flying birds
  const generateBirds = () => {
    if (growth.height < 40) return [];
    
    const birds = [];
    const numBirds = Math.min(5, Math.floor(growth.height / 20));
    
    for (let i = 0; i < numBirds; i++) {
      birds.push({
        id: `bird-${i}`,
        startX: -50 + (i * 100),
        y: 50 + Math.random() * 150,
        delay: i * 2,
        duration: 15 + Math.random() * 10
      });
    }
    
    return birds;
  };

  const birds = generateBirds();

  return (
    <div className="tree-canvas-container relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* ENHANCED BACKGROUND - OPTIMIZED */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating particles - REDUCED to 4 for better performance */}
        {[...Array(4)].map((_, i) => (
          <div
            key={`particle-${i}`}
            className="absolute rounded-full animate-float-particle will-change-transform"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${6 + Math.random() * 6}px`,
              height: `${6 + Math.random() * 6}px`,
              background: i % 2 === 0 ? '#FFD700' : '#90EE90',
              opacity: 0.3,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${15 + Math.random() * 10}s`,
              filter: 'blur(1px)'
            }}
          />
        ))}
        
        {/* Butterflies - Only show 1 for performance */}
        {growth.height > 30 && (
          <div
            className="absolute text-xl animate-butterfly will-change-transform"
            style={{
              left: '40%',
              top: '45%',
              animationDuration: '12s'
            }}
          >
            🦋
          </div>
        )}
        
        {/* Fireflies - REDUCED to 2 */}
        {growth.height > 60 && [...Array(2)].map((_, i) => (
          <div
            key={`firefly-${i}`}
            className="absolute w-2 h-2 rounded-full bg-yellow-300 animate-firefly will-change-transform"
            style={{
              left: `${30 + i * 30}%`,
              top: `${35 + Math.random() * 30}%`,
              animationDelay: `${Math.random() * 3}s`,
              boxShadow: '0 0 8px #FFD700'
            }}
          />
        ))}
        
        {/* Clouds - Only 1 cloud */}
        <div
          className="absolute text-5xl opacity-10 animate-cloud will-change-transform"
          style={{
            left: '-20%',
            top: '20%',
            animationDuration: '60s'
          }}
        >
          ☁️
        </div>
        
        {/* Sun/Moon - BASED ON TIME OF DAY */}
        <div className="absolute top-8 right-12 text-5xl opacity-40 animate-pulse-slow">
          {timeOfDay === 'evening' ? '🌙' : '☀️'}
        </div>
      </div>

      {/* Flying birds - REMOVED for performance */}

      <svg
        ref={svgRef}
        viewBox="0 0 400 500"
        className="w-full h-full max-w-md max-h-96"
        style={{ 
          filter: `drop-shadow(0 0 ${growth.glowIntensity * 20}px rgba(124, 179, 66, 0.5))`,
          willChange: 'filter'
        }}
      >
        <defs>
          {/* Glow filter */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          {/* Gradient for trunk with texture - DARKER */}
          <linearGradient id="trunkGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#6D4C41" />
            <stop offset="30%" stopColor="#5D4037" />
            <stop offset="60%" stopColor="#4E342E" />
            <stop offset="100%" stopColor="#3E2723" />
          </linearGradient>
          
          {/* Root gradient */}
          <linearGradient id="rootGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#6D4C41" />
            <stop offset="100%" stopColor="#4E342E" />
          </linearGradient>
          
          {/* Leaf gradient */}
          <radialGradient id="leafGradient">
            <stop offset="0%" stopColor="#9CCC65" />
            <stop offset="100%" stopColor="#7CB342" />
          </radialGradient>
          
          {/* Bark texture pattern */}
          <pattern id="barkTexture" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#4E342E" strokeWidth="0.5" opacity="0.3"/>
            <line x1="5" y1="0" x2="5" y2="10" stroke="#4E342E" strokeWidth="0.3" opacity="0.2"/>
          </pattern>
          
          {/* Pot gradient */}
          <linearGradient id="potGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#BCAAA4" />
            <stop offset="50%" stopColor="#A1887F" />
            <stop offset="100%" stopColor="#8D6E63" />
          </linearGradient>
        </defs>

        {/* Flower Pot - Beautiful 3D ceramic pot - BACK LAYER */}
        <g>
          {/* Pot shadow on ground */}
          <ellipse
            cx="200"
            cy="492"
            rx="85"
            ry="6"
            fill="#000000"
            opacity="0.2"
          />
          
          {/* Pot bottom (base) */}
          <ellipse
            cx="200"
            cy="480"
            rx="70"
            ry="8"
            fill="#5D4037"
            stroke="#4E342E"
            strokeWidth="1"
          />
          
          {/* Pot body - trapezoid shape for 3D effect */}
          <path
            d="M 130 440 L 115 480 L 285 480 L 270 440 Z"
            fill="url(#potGradient)"
            stroke="#6D4C41"
            strokeWidth="2"
          />
          
          {/* Pot body highlight (left side) */}
          <path
            d="M 135 445 L 125 470 L 135 470 Z"
            fill="white"
            opacity="0.15"
          />
          
          {/* Pot body shadow (right side) */}
          <path
            d="M 265 445 L 275 470 L 265 470 Z"
            fill="black"
            opacity="0.15"
          />
          
          {/* Decorative band on pot */}
          <path
            d="M 140 460 L 145 458 L 155 460 L 165 458 L 175 460 L 185 458 L 195 460 L 205 458 L 215 460 L 225 458 L 235 460 L 245 458 L 255 460 L 260 458"
            stroke="#D7CCC8"
            strokeWidth="2"
            fill="none"
            opacity="0.4"
          />
          
          {/* Pot shine/highlight for 3D effect */}
          <ellipse
            cx="155"
            cy="460"
            rx="15"
            ry="25"
            fill="white"
            opacity="0.1"
          />
        </g>

        {/* SEED STAGE - Only show seed when stage is 'seed' */}
        {growth.stage === 'seed' && (
          <g>
            {/* Seed in soil */}
            <ellipse
              cx="200"
              cy="435"
              rx="8"
              ry="10"
              fill={growth.colorPalette[2]}
              stroke={growth.colorPalette[0]}
              strokeWidth="2"
              opacity="0.9"
              style={{
                animation: 'pulse-slow 2s ease-in-out infinite'
              }}
            />
            {/* Seed highlight */}
            <ellipse
              cx="197"
              cy="432"
              rx="3"
              ry="4"
              fill="white"
              opacity="0.6"
            />
          </g>
        )}

        {/* TREE - Only show when stage is NOT 'seed' */}
        {growth.stage !== 'seed' && (
          <>
            {/* Roots (visible above ground) - NO ANIMATIONS */}
        {roots.map((root, index) => (
          <path
            key={root.id}
            d={root.path}
            stroke="url(#rootGradient)"
            strokeWidth={root.thickness}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity="0.8"
          />
        ))}

        {/* Branches (draw from back to front) - NO ANIMATIONS */}
        {branches.map((branch, index) => {
          const isTrunk = branch.depth === -1;
          // Darker branch colors to match trunk better
          const branchColor = branch.depth === 0 ? '#6D4C41' : (branch.depth === 1 ? '#5D4037' : '#4E342E');
          
          return (
            <g key={`branch-${index}`}>
              {/* Main branch/trunk line */}
              <line
                x1={branch.startX}
                y1={branch.startY}
                x2={branch.endX}
                y2={branch.endY}
                stroke={isTrunk ? 'url(#trunkGradient)' : branchColor}
                strokeWidth={branch.thickness}
                strokeLinecap="round"
                strokeOpacity={1}
              />
              {/* Bark texture on trunk - ENHANCED */}
              {isTrunk && (
                <>
                  {/* Dark outline for trunk - THICKER */}
                  <line
                    x1={branch.startX}
                    y1={branch.startY}
                    x2={branch.endX}
                    y2={branch.endY}
                    stroke="#2C1810"
                    strokeWidth={branch.thickness + 3}
                    strokeLinecap="round"
                    opacity="0.5"
                  />
                  {/* Bark texture */}
                  <line
                    x1={branch.startX}
                    y1={branch.startY}
                    x2={branch.endX}
                    y2={branch.endY}
                    stroke="#3E2723"
                    strokeWidth={branch.thickness - 2}
                    strokeLinecap="round"
                    opacity="0.6"
                  />
                </>
              )}
            </g>
          );
        })}

        {/* Leaves (behind flowers) - NO ANIMATIONS for performance */}
        {leaves.map((leaf, index) => (
          <g key={leaf.id} transform={`translate(${leaf.x}, ${leaf.y}) rotate(${leaf.rotation})`}>
            {/* Leaf shape - more realistic */}
            <path
              d={`M 0 0 Q ${leaf.size / 2} ${-leaf.size / 3} ${leaf.size} 0 Q ${leaf.size / 2} ${leaf.size / 3} 0 0`}
              fill={leaf.color}
              opacity={leaf.opacity}
            />
            {/* Leaf vein */}
            <line
              x1="0"
              y1="0"
              x2={leaf.size}
              y2="0"
              stroke="#558B2F"
              strokeWidth="0.5"
              opacity="0.5"
            />
          </g>
        ))}

        {/* Flowers - NO ANIMATIONS */}
        {flowers.map((flower, index) => (
          <g key={flower.id} transform={`translate(${flower.x}, ${flower.y})`}>
            {/* Flower petals */}
            {[0, 72, 144, 216, 288].map((angle, i) => (
              <ellipse
                key={i}
                cx={Math.cos((angle * Math.PI) / 180) * (flower.size / 2.5)}
                cy={Math.sin((angle * Math.PI) / 180) * (flower.size / 2.5)}
                rx={flower.size / 2.5}
                ry={flower.size / 1.8}
                fill={flower.color}
                opacity="0.9"
                transform={`rotate(${angle} ${Math.cos((angle * Math.PI) / 180) * (flower.size / 2.5)} ${Math.sin((angle * Math.PI) / 180) * (flower.size / 2.5)})`}
              />
            ))}
            {/* Flower center */}
            <circle
              cx="0"
              cy="0"
              r={flower.size / 3.5}
              fill="#FFD700"
            />
          </g>
        ))}

        {/* Particle effect when animating */}
        {isAnimating && selectedElement && (
          <g>
            {[...Array(15)].map((_, i) => (
              <circle
                key={i}
                cx={200 + (Math.random() - 0.5) * 40}
                cy={440}
                r={2 + Math.random() * 2}
                fill={selectedElement.particleColor}
                opacity="0.8"
                style={{
                  animation: `particleFloat 1.5s ease-out forwards`,
                  animationDelay: `${i * 0.08}s`
                }}
              />
            ))}
          </g>
        )}
          </>
        )}

        {/* Pot FRONT LAYER - Soil and rim (drawn AFTER tree to create depth) */}
        <g>
          {/* Soil surface - covers bottom of trunk */}
          <ellipse
            cx="200"
            cy="440"
            rx="70"
            ry="9"
            fill="#5D4037"
            stroke="#4E342E"
            strokeWidth="1"
          />
          
          {/* Pot rim (top edge) */}
          <ellipse
            cx="200"
            cy="438"
            rx="73"
            ry="10"
            fill="#BCAAA4"
            stroke="#8D6E63"
            strokeWidth="2"
          />
        </g>

        {/* Glow effect around tree */}
        {growth.glowIntensity > 0 && (
          <ellipse
            cx={200}
            cy={350 - (growth.height / 100) * 50}
            rx={120 + growth.glowIntensity * 50}
            ry={80 + growth.glowIntensity * 40}
            fill="none"
            stroke={growth.colorPalette[0]}
            strokeWidth="2"
            opacity={growth.glowIntensity * 0.2}
            filter="url(#glow)"
            className="animate-pulse"
          />
        )}
      </svg>

      {/* Stage indicator - removed, moved to GardenScenery */}

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0); }
          to { opacity: 1; transform: scale(1); }
        }
        
        @keyframes bloom {
          from { opacity: 0; transform: scale(0); }
          to { opacity: 0.9; transform: scale(1); }
        }
        
        @keyframes sway {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          50% { transform: translateX(2px) rotate(2deg); }
        }
        
        @keyframes particleFloat {
          0% { transform: translate(0, 0); opacity: 0.8; }
          100% { transform: translate(0, -100px); opacity: 0; }
        }
        
        @keyframes flyAcross {
          0% { transform: translateX(-100px); }
          100% { transform: translateX(500px); }
        }
        
        @keyframes float-particle {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(10px, -15px); }
          50% { transform: translate(-5px, -30px); }
          75% { transform: translate(-10px, -15px); }
        }
        
        @keyframes butterfly {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(30px, -20px) rotate(10deg); }
          50% { transform: translate(60px, 10px) rotate(-10deg); }
          75% { transform: translate(30px, 30px) rotate(5deg); }
        }
        
        @keyframes firefly {
          0%, 100% { opacity: 0.3; transform: translate(0, 0); }
          50% { opacity: 1; transform: translate(20px, -20px); }
        }
        
        @keyframes cloud {
          0% { transform: translateX(0); }
          100% { transform: translateX(120vw); }
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        
        .animate-float-particle {
          animation: float-particle 15s ease-in-out infinite;
        }
        
        .animate-butterfly {
          animation: butterfly 10s ease-in-out infinite;
        }
        
        .animate-firefly {
          animation: firefly 3s ease-in-out infinite;
        }
        
        .animate-cloud {
          animation: cloud 60s linear infinite;
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default TreeCanvas;
