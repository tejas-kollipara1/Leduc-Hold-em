

export const AnimatedBackground = () => {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      
      {/* Deep dark gradient base */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, #050010 0%, #0a0025 30%, #080018 60%, #02000d 100%)',
      }} />

      {/* Retro grid floor */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '55%',
        background: `
          linear-gradient(rgba(241, 91, 181, 0.15) 1px, transparent 1px),
          linear-gradient(90deg, rgba(241, 91, 181, 0.15) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        transform: 'perspective(600px) rotateX(60deg)',
        transformOrigin: 'center bottom',
        maskImage: 'linear-gradient(to bottom, transparent 0%, black 40%, black 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 40%, black 100%)',
      }} />

      {/* Top ceiling grid */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: '30%',
        background: `
          linear-gradient(rgba(0, 245, 212, 0.08) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 245, 212, 0.08) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        transform: 'perspective(400px) rotateX(-50deg)',
        transformOrigin: 'center top',
        maskImage: 'linear-gradient(to top, transparent 0%, black 60%)',
        WebkitMaskImage: 'linear-gradient(to top, transparent 0%, black 60%)',
      }} />

      {/* Magenta horizon line glow */}
      <div style={{
        position: 'absolute', bottom: '44%', left: 0, right: 0,
        height: '2px',
        background: 'linear-gradient(90deg, transparent, var(--neon-magenta), var(--neon-cyan), var(--neon-purple), var(--neon-magenta), transparent)',
        boxShadow: '0 0 20px var(--neon-magenta), 0 0 60px rgba(241, 91, 181, 0.5), 0 0 120px rgba(155, 93, 229, 0.3)',
        animation: 'horizonPulse 5s ease-in-out infinite',
      }} />

      {/* Blob 1 — Large magenta glow top-left */}
      <div style={{
        position: 'absolute', top: '-10%', left: '-10%',
        width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(241,91,181,0.22) 0%, transparent 70%)',
        animation: 'floatBlob1 15s ease-in-out infinite',
      }} />

      {/* Blob 2 — Large cyan glow top-right */}
      <div style={{
        position: 'absolute', top: '-5%', right: '-10%',
        width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(0,245,212,0.18) 0%, transparent 70%)',
        animation: 'floatBlob2 18s ease-in-out infinite',
      }} />

      {/* Blob 3 — Purple mid-screen */}
      <div style={{
        position: 'absolute', top: '30%', left: '35%',
        width: '700px', height: '500px',
        background: 'radial-gradient(ellipse, rgba(155,93,229,0.15) 0%, transparent 70%)',
        animation: 'floatBlob3 12s ease-in-out infinite',
      }} />

      {/* Blob 4 — Gold bottom */}
      <div style={{
        position: 'absolute', bottom: '-15%', right: '20%',
        width: '400px', height: '400px',
        background: 'radial-gradient(circle, rgba(255,190,11,0.12) 0%, transparent 70%)',
        animation: 'floatBlob4 20s ease-in-out infinite',
      }} />

      {/* Scanlines overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
        pointerEvents: 'none',
      }} />

      {/* Floating particles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          width: `${2 + Math.random() * 3}px`,
          height: `${2 + Math.random() * 3}px`,
          borderRadius: '50%',
          background: ['var(--neon-cyan)', 'var(--neon-magenta)', 'var(--neon-purple)', 'var(--neon-gold)'][i % 4],
          boxShadow: `0 0 6px ${['var(--neon-cyan)', 'var(--neon-magenta)', 'var(--neon-purple)', 'var(--neon-gold)'][i % 4]}`,
          animation: `floatParticle${(i % 4) + 1} ${8 + Math.random() * 10}s ease-in-out ${Math.random() * 5}s infinite`,
          opacity: 0.8,
        }} />
      ))}

      {/* Corner accent lines top-left */}
      <div style={{ position: 'absolute', top: 0, left: 0 }}>
        <svg width="200" height="200" viewBox="0 0 200 200" fill="none">
          <path d="M0 0 L150 0" stroke="url(#g1)" strokeWidth="1" />
          <path d="M0 0 L0 150" stroke="url(#g2)" strokeWidth="1" />
          <defs>
            <linearGradient id="g1" x1="0" y1="0" x2="150" y2="0">
              <stop offset="0%" stopColor="var(--neon-cyan)" stopOpacity="0.8" />
              <stop offset="100%" stopColor="var(--neon-cyan)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="g2" x1="0" y1="0" x2="0" y2="150">
              <stop offset="0%" stopColor="var(--neon-cyan)" stopOpacity="0.8" />
              <stop offset="100%" stopColor="var(--neon-cyan)" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Corner accent lines bottom-right */}
      <div style={{ position: 'absolute', bottom: 0, right: 0 }}>
        <svg width="200" height="200" viewBox="0 0 200 200" fill="none">
          <path d="M200 200 L50 200" stroke="url(#g3)" strokeWidth="1" />
          <path d="M200 200 L200 50" stroke="url(#g4)" strokeWidth="1" />
          <defs>
            <linearGradient id="g3" x1="200" y1="200" x2="50" y2="200">
              <stop offset="0%" stopColor="var(--neon-magenta)" stopOpacity="0.8" />
              <stop offset="100%" stopColor="var(--neon-magenta)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="g4" x1="200" y1="200" x2="200" y2="50">
              <stop offset="0%" stopColor="var(--neon-magenta)" stopOpacity="0.8" />
              <stop offset="100%" stopColor="var(--neon-magenta)" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <style>{`
        @keyframes horizonPulse {
          0%, 100% { opacity: 0.6; transform: scaleX(1); }
          50% { opacity: 1; transform: scaleX(1.02); }
        }
        @keyframes floatBlob1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(60px, 40px) scale(1.1); }
          66% { transform: translate(-30px, 80px) scale(0.9); }
        }
        @keyframes floatBlob2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-80px, 60px) scale(1.15); }
        }
        @keyframes floatBlob3 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.8; }
          33% { transform: translate(50px, -40px) scale(1.1); opacity: 1; }
          66% { transform: translate(-40px, 30px) scale(0.85); opacity: 0.6; }
        }
        @keyframes floatBlob4 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-60px, -50px) scale(1.2); }
        }
        @keyframes floatParticle1 {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.8; }
          50% { transform: translateY(-30px) translateX(10px); opacity: 0.2; }
        }
        @keyframes floatParticle2 {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.5; }
          50% { transform: translateY(-50px) translateX(-20px); opacity: 1; }
        }
        @keyframes floatParticle3 {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.7; }
          50% { transform: translateY(-20px) translateX(30px); opacity: 0.3; }
        }
        @keyframes floatParticle4 {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.4; }
          75% { transform: translateY(-40px) translateX(-15px); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
};
