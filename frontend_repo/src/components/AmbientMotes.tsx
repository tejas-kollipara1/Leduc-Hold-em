import { useMemo } from 'react';

interface AmbientMotesProps {
  count?: number;
  primaryColor?: string;
  secondaryColor?: string;
}

export const AmbientMotes = ({ 
  count = 60, 
  primaryColor = '#ffd700', 
  secondaryColor = '#ff2d95' 
}: AmbientMotesProps) => {
  const motes = useMemo(() => {
    return [...Array(count)].map((_, i) => {
      const size = Math.random() * 4 + 1;
      const isPrimary = Math.random() > 0.4;
      return {
        id: i,
        top: '110%', // Always start from below the screen
        left: `${Math.random() * 100}%`,
        size,
        color: isPrimary ? primaryColor : secondaryColor,
        glow: isPrimary ? `rgba(${hexToRgb(primaryColor)}, 0.9)` : `rgba(${hexToRgb(secondaryColor)}, 0.9)`,
        duration: 15 + Math.random() * 25,
        delay: Math.random() * -30, // Negative delay to start animation mid-cycle
        opacity: Math.random() * 0.7 + 0.3,
        blur: size < 2 ? 0 : 1,
        z: Math.random() > 0.5 ? 2 : 0
      };
    });
  }, [count, primaryColor, secondaryColor]);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {motes.map(m => (
        <div key={m.id} style={{
          position: 'absolute',
          top: m.top,
          left: m.left,
          width: `${m.size}px`,
          height: `${m.size}px`,
          backgroundColor: m.color,
          borderRadius: '50%',
          boxShadow: `0 0 12px ${m.glow}`,
          animation: `moteFlowUp ${m.duration}s linear infinite`,
          animationDelay: `${m.delay}s`,
          opacity: m.opacity,
          filter: `blur(${m.blur}px)`,
          zIndex: m.z
        }} />
      ))}
    </div>
  );
};

// Helper to convert hex to rgb (standard RGB format for rgba)
function hexToRgb(hex: string) {
  // If it's a CSS variable, return a default fallback
  if (hex.startsWith('var')) return '255, 255, 255';
  
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}
