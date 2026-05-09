import { GameCard } from '../components/GameCard';

import { useEffect, useState, useCallback, useRef } from 'react';

import { AmbientMotes } from '../components/AmbientMotes';

export const Lobby = ({ onSelectGame }: { onSelectGame: (id: string) => void }) => {

  const [isMuted, setIsMuted] = useState(false);

  // Wrap onSelectGame: proceed
  const handleSelectGame = useCallback((id: string) => {
    onSelectGame(id);
  }, [onSelectGame]);



  // ── Lobby audio: create once, pause/play on mute toggle ──
  const lobbyAudioRef = useRef<HTMLAudioElement | null>(null);

  // A helper to safely attempt playback
  const attemptPlay = useCallback(() => {
    if (lobbyAudioRef.current && !isMuted) {
      lobbyAudioRef.current.play().catch(e => {
        console.warn("Lobby audio blocked, will retry on interaction:", e);
      });
    }
  }, [isMuted]);

  useEffect(() => {
    const audio = new Audio('/the_mountain-casino-158087.mp3');
    audio.loop = true;
    audio.volume = 0.5; // Slightly lower for atmosphere
    lobbyAudioRef.current = audio;

    attemptPlay();

    // Listen for any click to try and resume (backup for strict browsers)
    const handleInteraction = () => {
      if (audio.paused && !isMuted) attemptPlay();
      window.removeEventListener('mousedown', handleInteraction);
    };
    window.addEventListener('mousedown', handleInteraction);

    return () => {
      audio.pause();
      audio.src = '';
      lobbyAudioRef.current = null;
      window.removeEventListener('mousedown', handleInteraction);
    };
  }, [attemptPlay]);

  useEffect(() => {
    const audio = lobbyAudioRef.current;
    if (!audio) return;
    if (isMuted) {
      audio.pause();
    } else {
      attemptPlay();
    }
  }, [isMuted, attemptPlay]);

  const games = [
    { id: 'leduc_vis', title: 'RL VISUALIZER', description: 'Watch: AI Agent VS Aggressive Bot', color: '#00f5d4', img: '/poker.png' }
  ];

  return (
    <>
      <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>

        {/* ── High-Fidelity HDR Background ── */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden',
          background: '#020002'
        }}>
          {/* Main Background Image */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'url(/Gemini_Generated_Image_893jlh893jlh893j.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'saturate(1.2) contrast(1.1) brightness(1.0)', // Restored
            transform: 'scale(1.01)',
          }} />

          {/* Global Glow Overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(circle at center, transparent 20%, rgba(2,0,5,0.7) 100%)',
            mixBlendMode: 'multiply'
          }} />

          {/* Enhanced Sparkles/3D Motes */}
          <AmbientMotes count={180} />

          {/* Deep Vignette Overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(circle at center, transparent -10%, rgba(0,0,0,0.95) 105%)',
            pointerEvents: 'none'
          }} />
        </div>

        {/* ── Content ── */}
        <div style={{ position: 'relative', zIndex: 1, padding: '20px 20px 60px', minHeight: 'calc(100vh - 120px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          
          {/* Game grid - 1 column, centered, larger */}
          {games.map((game, index) => (
            <div key={game.id} style={{
              position: 'relative',
              width: '500px',
              transform: 'scale(1.2)',
              margin: '0 auto'
            }}>
              {/* High-Intensity Neon Frame for ALL cards now */}
              <div style={{
                position: 'absolute', inset: '-8px',
                borderRadius: '20px',
                padding: '4px',
                background: `linear-gradient(90deg, ${game.color}, var(--neon-magenta), ${game.color})`,
                backgroundSize: '300% 300%',
                animation: 'neonSweep 4s linear infinite',
                filter: 'blur(8px) brightness(1.2)',
                opacity: 0.5,
                zIndex: 0
              }} />
              <GameCard
                title={game.title}
                description={game.description}
                imageColor={game.color}
                imgUrl={game.img}
                onClick={() => handleSelectGame(game.id)}
                delay={index * 0.1}
              />
            </div>
          ))}

          <style>{`
          @keyframes neonSweep {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}</style>
        </div>
      </div>

      {/* ── Mute/Unmute Toggle (Localized) ── */}
      <button
        onClick={() => setIsMuted(!isMuted)}
        style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 100,
          background: 'rgba(0,0,0,0.5)', border: '1px solid var(--neon-gold)',
          borderRadius: '50%', width: '48px', height: '48px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--neon-gold)', boxShadow: '0 0 18px rgba(255,190,11,0.3)',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.3s',
        }}
      >
        <span style={{ fontSize: '1.3rem' }}>{isMuted ? '🔇' : '🔊'}</span>
      </button>
    </>
  );
};
