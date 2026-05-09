import { useMemo } from 'react';

interface Particle {
  id: number;
  left: string;
  delay: string;
  duration: string;
  size: string;
  color: string;
  emoji?: string;
  dx?: string;
}

const WIN_EMOJIS = ['💰', '💵', '💸', '🤑', '💰', '💵', '💸', '🤑', '💴', '💶', '💷', '🪙'];
const LOSE_EMOJIS = ['💨', '🌫️', '🖤', '💔', '😤', '🌑', '⚡'];
const CONFETTI_COLS = ['#ffbe0b', '#f15bb5', '#00f5d4', '#9b5de5', '#ff4466', '#ffd700'];

function makeParticles(count: number, type: 'win' | 'lose'): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${(Math.random() * 1.2).toFixed(2)}s`,
    duration: `${(1.4 + Math.random() * 1.6).toFixed(2)}s`,
    size: `${type === 'win' ? 24 + Math.floor(Math.random() * 28) : 16 + Math.floor(Math.random() * 20)}px`,
    color: type === 'win' ? CONFETTI_COLS[i % CONFETTI_COLS.length] : '#444',
    emoji: type === 'win' ? WIN_EMOJIS[i % WIN_EMOJIS.length] : LOSE_EMOJIS[i % LOSE_EMOJIS.length],
    dx: `${(Math.random() * 140 - 70).toFixed(0)}px`,
  }));
}

export const ParticleShower = ({ type }: { type: 'win' | 'lose' | null }) => {
  const particles = useMemo(() => (type ? makeParticles(type === 'win' ? 80 : 40, type) : []), [type]);

  if (!type) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 8000, overflow: 'hidden' }}>
      {particles.map((p) => (
        <div
          key={p.id}
          style={
            {
              position: 'absolute',
              top: type === 'win' ? '-60px' : 'calc(100% + 10px)',
              left: p.left,
              fontSize: p.size,
              lineHeight: 1,
              animationName: type === 'win' ? 'coinSpin' : 'smokeDrift',
              animationDuration: p.duration,
              animationDelay: p.delay,
              animationTimingFunction: type === 'win' ? 'ease-in' : 'ease-out',
              animationFillMode: 'forwards',
              '--dx': p.dx,
              userSelect: 'none',
            } as React.CSSProperties
          }
        >
          {p.emoji}
        </div>
      ))}
      <style>{`
        @keyframes coinSpin {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) translateX(var(--dx)) rotate(720deg); opacity: 0; }
        }
        @keyframes smokeDrift {
          0% { transform: translateY(0) scale(1); opacity: 0.6; }
          100% { transform: translateY(-100vh) translateX(var(--dx)) scale(3); opacity: 0; }
        }
      `}</style>
    </div>
  );
};
