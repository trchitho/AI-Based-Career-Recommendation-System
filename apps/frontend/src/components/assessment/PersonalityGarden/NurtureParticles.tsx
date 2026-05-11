import { useEffect, useState } from 'react';
import { NurtureElement } from './types/garden.types';

interface Particle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  delay: number;
}

interface NurtureParticlesProps {
  element: NurtureElement;
  isActive: boolean;
}

const NurtureParticles: React.FC<NurtureParticlesProps> = ({ element, isActive }) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (isActive) {
      // Generate particles
      const newParticles: Particle[] = Array.from({ length: 12 }, (_, i) => ({
        id: i,
        x: Math.random() * 100 - 50, // -50 to 50
        y: Math.random() * 100 - 50,
        rotation: Math.random() * 360,
        delay: Math.random() * 0.3
      }));
      setParticles(newParticles);
    } else {
      setParticles([]);
    }
  }, [isActive]);

  if (!isActive || particles.length === 0) return null;

  // Different animations based on element type
  const getParticleStyle = (type: NurtureElement['type'], particle: Particle) => {
    const baseStyle = {
      animationDelay: `${particle.delay}s`,
      animationDuration: '1s',
      animationFillMode: 'forwards' as const,
      animationTimingFunction: 'ease-out' as const
    };

    switch (type) {
      case 'water':
        return {
          ...baseStyle,
          animation: 'waterDrop 1s ease-out forwards',
          '@keyframes waterDrop': {
            '0%': { transform: 'translateY(-100px) scale(0)', opacity: 0 },
            '50%': { opacity: 1 },
            '100%': { transform: 'translateY(200px) scale(0.5)', opacity: 0 }
          }
        };
      case 'sunlight':
        return {
          ...baseStyle,
          animation: 'sunlightRay 1s ease-out forwards',
          '@keyframes sunlightRay': {
            '0%': { transform: 'translateY(-100px) scale(1.5)', opacity: 0 },
            '50%': { opacity: 1 },
            '100%': { transform: 'translateY(100px) scale(0.5)', opacity: 0 }
          }
        };
      case 'soil':
        return {
          ...baseStyle,
          animation: 'soilFloat 1s ease-out forwards',
          '@keyframes soilFloat': {
            '0%': { transform: 'translateY(50px) scale(0)', opacity: 0 },
            '50%': { opacity: 1 },
            '100%': { transform: `translateY(-100px) translateX(${particle.x}px) scale(0.3)`, opacity: 0 }
          }
        };
      case 'nutrients':
        return {
          ...baseStyle,
          animation: 'leafFloat 1.2s ease-out forwards',
          '@keyframes leafFloat': {
            '0%': { transform: 'scale(0) rotate(0deg)', opacity: 0 },
            '50%': { opacity: 1 },
            '100%': { transform: `translateY(-80px) translateX(${particle.x * 0.5}px) rotate(${particle.rotation}deg) scale(0.4)`, opacity: 0 }
          }
        };
      default:
        return baseStyle;
    }
  };

  return (
    <>
      <style>{`
        @keyframes waterDrop {
          0% { transform: translateY(-100px) scale(0); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(200px) scale(0.5); opacity: 0; }
        }
        @keyframes sunlightRay {
          0% { transform: translateY(-100px) scale(1.5); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(100px) scale(0.5); opacity: 0; }
        }
        @keyframes soilFloat {
          0% { transform: translateY(50px) scale(0); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(-100px) scale(0.3); opacity: 0; }
        }
        @keyframes leafFloat {
          0% { transform: scale(0) rotate(0deg); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(-80px) rotate(360deg) scale(0.4); opacity: 0; }
        }
        @keyframes burstScale {
          0% { transform: scale(0.5); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.8; }
          100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
      
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute"
            style={{
              left: `${50 + particle.x}%`,
              top: `${50 + particle.y}%`,
              ...getParticleStyle(element.type, particle)
            }}
          >
            <span className="text-2xl opacity-80 drop-shadow-lg">
              {element.emoji}
            </span>
          </div>
        ))}
        
        {/* Center burst effect */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div 
            className="text-6xl"
            style={{
              animation: 'burstScale 0.8s ease-out forwards'
            }}
          >
            {element.emoji}
          </div>
        </div>
      </div>
    </>
  );
};

export default NurtureParticles;
