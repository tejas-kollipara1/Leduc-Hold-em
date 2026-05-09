import { motion } from 'framer-motion';

interface GameCardProps {
  title: string;
  description: string;
  imageColor: string;
  imgUrl: string;
  onClick: () => void;
  delay?: number;
}

export const GameCard = ({ title, description, imageColor, imgUrl, onClick, delay = 0 }: GameCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ scale: 1.04, y: -5, zIndex: 10 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        cursor: 'pointer',
        height: '250px',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '16px',
        border: `2px solid ${imageColor}`,
        boxShadow: `0 8px 30px rgba(0,0,0,0.7), 0 0 15px ${imageColor}22`,
        transition: 'all 0.3s ease',
      }}
    >
      {/* Game background image */}
      {imgUrl.startsWith('/') ? (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${imgUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.65) saturate(1.2)',
          transition: 'all 0.5s ease',
        }} className="game-card-bg" />
      ) : imgUrl === 'INTERNAL:DICE' ? (
        <div style={{
          position: 'absolute', inset: 0,
          background: '#020005',
          overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} className="game-card-bg">
          {/* Digital Felt / Deep Grid */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `linear-gradient(rgba(58,134,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(58,134,255,0.15) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
            transform: 'perspective(200px) rotateX(65deg) translateY(-30%)',
            opacity: 0.6
          }} />

          {/* Data Streams / Circuit Trails */}
          {[...Array(3)].map((_, i) => (
             <motion.div
               key={`trail-${i}`}
               animate={{ y: [-200, 400], opacity: [0, 1, 0] }}
               transition={{ duration: 4, repeat: Infinity, delay: i * 1.5, ease: "linear" }}
               style={{
                 position: 'absolute', left: `${20 + i * 30}%`, width: '2px', height: '100px',
                 background: 'linear-gradient(to bottom, transparent, var(--neon-blue), transparent)',
                 filter: 'blur(1px)'
               }}
             />
          ))}
          
          {/* Betting Zones Surface */}
          <div style={{
            position: 'absolute', 
            width: '120%', height: '150px',
            bottom: '10%',
            display: 'flex', justifyContent: 'space-around', alignItems: 'center',
            transform: 'perspective(300px) rotateX(60deg)',
            opacity: 0.8,
            zIndex: 1
          }}>
             <div style={{ border: '1px solid var(--neon-magenta)', padding: '10px 20px', borderRadius: '4px', textAlign: 'center', boxShadow: '0 0 10px var(--neon-magenta)' }}>
                <div style={{ color: 'var(--neon-magenta)', fontSize: '0.8rem', fontWeight: 900, fontFamily: 'Orbitron' }}>DOWN</div>
             </div>
             <div style={{ border: '2px solid var(--neon-gold)', padding: '15px 30px', borderRadius: '50%', textAlign: 'center', boxShadow: '0 0 20px var(--neon-gold)', background: 'rgba(255,190,11,0.05)' }}>
                <div style={{ color: 'var(--neon-gold)', fontSize: '1.2rem', fontWeight: 900, fontFamily: 'Orbitron' }}>7</div>
             </div>
             <div style={{ border: '1px solid var(--neon-blue)', padding: '10px 20px', borderRadius: '4px', textAlign: 'center', boxShadow: '0 0 10px var(--neon-blue)' }}>
                <div style={{ color: 'var(--neon-blue)', fontSize: '0.8rem', fontWeight: 900, fontFamily: 'Orbitron' }}>UP</div>
             </div>
          </div>

          {/* Central Hexagonal Deck for rolling */}
          <div style={{
            position: 'absolute',
            width: '220px', height: '120px',
            background: 'rgba(58,134,255,0.05)',
            border: '2px solid var(--neon-blue)',
            clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
            boxShadow: '0 0 40px rgba(58,134,255,0.2), inset 0 0 20px rgba(58,134,255,0.1)',
            zIndex: 2
          }} />
          
          {/* Ambient Lighting Beams */}
          {[...Array(5)].map((_, i) => (
            <motion.div 
              key={`light-beam-${i}`}
              animate={{ 
                x: i % 2 === 0 ? [-500, 500] : [500, -500],
                opacity: [0.1, 0.3, 0.1]
              }}
              transition={{ 
                duration: 4 + i, 
                repeat: Infinity, 
                ease: "linear" 
              }}
              style={{ 
                position: 'absolute', top: 0, width: '150px', height: '100%', 
                background: `linear-gradient(90deg, transparent, ${i % 2 === 0 ? 'var(--neon-blue)' : 'var(--neon-magenta)'}22, transparent)`, 
                transform: 'skewX(-25deg)', pointerEvents: 'none',
                filter: 'blur(20px)'
              }} 
            />
          ))}

          {/* Glowing HUD Orbs */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={`orb-${i}`}
              animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 2 + i % 3, repeat: Infinity }}
              style={{
                position: 'absolute',
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                width: '4px', height: '4px',
                background: i % 2 === 0 ? 'var(--neon-cyan)' : 'var(--neon-magenta)',
                borderRadius: '50%',
                boxShadow: `0 0 15px ${i % 2 === 0 ? 'var(--neon-cyan)' : 'var(--neon-magenta)'}`
              }}
            />
          ))}
        </div>
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '10rem',
          background: 'rgba(0,0,0,0.5)',
          transition: 'all 0.5s ease',
        }} className="game-card-bg">
          {imgUrl}
        </div>
      )}

      {/* Multi-color gradient overlay — bottom heavy */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(180deg, rgba(5,0,16,0.1) 0%, rgba(5,0,16,0.55) 50%, rgba(5,0,16,0.95) 100%)`,
      }} />

      {/* Top neon accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
        background: `linear-gradient(90deg, transparent, ${imageColor}, transparent)`,
        boxShadow: `0 0 12px ${imageColor}, 0 0 24px ${imageColor}`,
      }} />

      {/* Glow orb in corner */}
      <div style={{
        position: 'absolute', top: '-30px', right: '-30px',
        width: '120px', height: '120px',
        background: imageColor,
        filter: 'blur(50px)', opacity: 0.35, borderRadius: '50%',
      }} />

      {/* Content */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, padding: '32px 28px',
        zIndex: 2,
      }}>
        <h2 className="title-font" style={{
          fontSize: '2.4rem', marginBottom: '10px', color: '#fff',
          textShadow: `0 0 15px ${imageColor}, 0 0 30px ${imageColor}`,
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))',
        }}>
          {title}
        </h2>
        <p style={{
          color: 'rgba(255,255,255,0.75)', fontWeight: 500, fontSize: '1.05rem',
          textShadow: '0 2px 6px rgba(0,0,0,0.9)',
        }}>
          {description}
        </p>

        {/* Play button that appears */}
        <div style={{
          marginTop: '20px',
          display: 'inline-block',
          padding: '10px 28px',
          borderRadius: '12px',
          background: `${imageColor}11`,
          border: `2px solid ${imageColor}`,
          color: '#fff',
          fontWeight: 800,
          fontSize: '0.95rem',
          letterSpacing: '3px',
          boxShadow: `0 0 15px ${imageColor}88, inset 0 0 10px ${imageColor}44`,
          textShadow: `0 0 8px #fff`,
          transition: 'all 0.3s ease',
          fontFamily: 'Orbitron, sans-serif'
        }}>
          PLAY NOW →
        </div>
      </div>

      <style>{`
        div:hover > .game-card-bg {
          filter: brightness(0.85) saturate(1.4);
          transform: scale(1.08);
        }
      `}</style>
    </motion.div>
  );
};
