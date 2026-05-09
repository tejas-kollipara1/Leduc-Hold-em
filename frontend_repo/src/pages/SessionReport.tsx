import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useCasino } from '../context/CasinoContext';
import { AmbientMotes } from '../components/AmbientMotes';
import { ProfitChart } from '../components/ProfitChart';

export const SessionReport = ({ onBack }: { onBack: () => void }) => {
  const { history, isCloud } = useCasino();

  const stats = useMemo(() => {
    if (history.length === 0) return null;

    // 1. Basic Metrics
    const totalGames = history.length;
    const wins = history.filter(h => h.outcome === 'WIN').length;
    const winRate = ((wins / totalGames) * 100).toFixed(1);
    const totalNet = history.reduce((acc, h) => acc + h.net, 0);

    // 2. Streaks
    let currentStreak = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].outcome === 'WIN') currentStreak++;
      else if (history[i].outcome === 'LOSS') break;
    }

    let maxStreak = 0;
    let tempStreak = 0;
    history.forEach(h => {
      if (h.outcome === 'WIN') {
        tempStreak++;
        if (tempStreak > maxStreak) maxStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    });

    // 3. Peak Performance
    const largestWin = Math.max(...history.map(h => h.net), 0);
    const largestLoss = Math.min(...history.map(h => h.net), 0);

    // 4. Game Ratios (Matrix)
    const gameData: Record<string, { wins: number; total: number; net: number; color: string }> = {};
    const COLORS: Record<string, string> = {
      'Slotopia': 'var(--neon-magenta)',
      'Roulette': 'var(--neon-gold)',
      'Blackjack': 'var(--neon-cyan)',
      'Poker': 'var(--neon-purple)',
      'Dice Destiny': 'var(--neon-blue)',
    };

    history.forEach(h => {
      if (!gameData[h.game]) gameData[h.game] = { wins: 0, total: 0, net: 0, color: COLORS[h.game] || '#fff' };
      gameData[h.game].total++;
      if (h.outcome === 'WIN') gameData[h.game].wins++;
      gameData[h.game].net += h.net;
    });

    // 5. Mastery Map (Radar) — Dynamic metrics
    // LUCK: Win rate in guessing/luck-based games (Slots, Roulette, Dice)
    const luckGames = history.filter(h => ['Slotopia', 'Roulette', 'Dice Destiny'].includes(h.game));
    const luckScore = luckGames.length > 0
      ? 15 + (luckGames.filter(h => h.outcome === 'WIN').length / luckGames.length) * 85
      : 10;

    // STRATEGY: Win rate in skill-based games (Poker, Blackjack)
    const stratGames = history.filter(h => ['Poker', 'Blackjack'].includes(h.game));
    const stratScore = stratGames.length > 0
      ? 15 + (stratGames.filter(h => h.outcome === 'WIN').length / stratGames.length) * 85
      : 10;

    // STAKES: How aggressively the player bets (avg bet relative to $1000 benchmark)
    const avgBet = history.length > 0
      ? history.reduce((sum, h) => sum + h.bet, 0) / history.length
      : 0;
    const stakesScore = Math.min(100, 10 + (avgBet / 1000) * 90);

    const mastery = [luckScore, stratScore, stakesScore];

    const trend = history.slice().reverse().map(h => h.balanceAfter);

    return {
      totalGames, winRate, totalNet, currentStreak, maxStreak, largestWin, largestLoss,
      gameData: Object.entries(gameData),
      mastery,
      trend
    };
  }, [history]);

  if (!stats) {
    return (
      <div style={{ height: '90vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
        <AmbientMotes count={40} />
        <h2 className="orbitron-font neon-text-cyan" style={{ letterSpacing: '8px' }}>INITIALIZING TERMINAL...</h2>
        <p className="dancing-font" style={{ color: 'rgba(255,255,255,0.4)' }}>No session data found in buffer.</p>
        <button onClick={onBack} className="neon-button">← RETURN TO LOBBY</button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', padding: '40px 20px 100px', backgroundColor: '#020005' }}>
      <AmbientMotes count={150} />
      
      {/* ── HUD BACKGROUND ELEMENTS ── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '10%', left: '5%', width: '40%', height: '1px', background: 'linear-gradient(90deg, var(--neon-cyan), transparent)', opacity: 0.2 }} />
        <div style={{ position: 'absolute', bottom: '15%', right: '5%', width: '30%', height: '1px', background: 'linear-gradient(270deg, var(--neon-magenta), transparent)', opacity: 0.2 }} />
        <div style={{ position: 'absolute', right: '10%', top: '20%', width: '1px', height: '60%', background: 'linear-gradient(180deg, var(--neon-purple), transparent)', opacity: 0.1 }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1300px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '60px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '20px' }}>
          <div>
            <div className="orbitron-font" style={{ color: 'var(--neon-cyan)', fontSize: '0.8rem', letterSpacing: '10px' }}>SESSION ARCHIVE // UNIT_001</div>
            <h1 className="cinzel-font" style={{ fontSize: '4rem', color: '#fff', textShadow: '0 0 20px rgba(255,255,255,0.3)' }}>FATE REPORT</h1>
          </div>
          <button onClick={onBack} className="neon-button cyan" style={{ padding: '12px 30px' }}>EXIT TERMINAL</button>
        </div>

        {/* Top Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '40px' }}>
          <HUDCard label="WIN RATE" value={`${stats.winRate}%`} color="var(--neon-cyan)" icon="🎯" />
          <HUDCard label="NET PROFIT" value={`$${stats.totalNet.toLocaleString()}`} color={stats.totalNet >= 0 ? 'var(--neon-gold)' : 'var(--neon-magenta)'} icon="💰" />
          <HUDCard label="CURRENT STREAK" value={`${stats.currentStreak} WINS`} color="var(--neon-gold)" icon="🔥" />
          <HUDCard label="MAX STREAK" value={`${stats.maxStreak} WINS`} color="var(--neon-magenta)" icon="🏆" />
        </div>

        {/* Main Content Area */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px' }}>
          
          {/* Left Column: Charts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            {/* Profit Trajectory */}
            <div className="glass-panel" style={{ padding: '30px', border: '1px solid rgba(255,255,255,0.05)' }}>
               <div className="orbitron-font" style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '4px', marginBottom: '20px' }}>FINANCIAL TRAJECTORY</div>
               <div style={{ height: '240px' }}>
                 <ProfitChart data={stats.trend} />
               </div>
            </div>

            {/* Peak Performance */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
               <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid var(--neon-gold)' }}>
                 <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', marginBottom: '8px' }}>LARGEST SINGLE WIN</div>
                 <div className="orbitron-font neon-text-gold" style={{ fontSize: '2rem' }}>+${stats.largestWin.toLocaleString()}</div>
               </div>
               <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid var(--neon-magenta)' }}>
                 <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', marginBottom: '8px' }}>LARGEST SESSION LOSS</div>
                 <div className="orbitron-font" style={{ fontSize: '2rem', color: 'var(--neon-magenta)' }}>-${Math.abs(stats.largestLoss).toLocaleString()}</div>
               </div>
            </div>

          </div>

          {/* Right Column: Mastery & Ratios */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            {/* Fate Mastery Radar */}
            <div className="glass-panel" style={{ padding: '30px', border: '1px solid var(--neon-purple)', height: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
               <div className="orbitron-font" style={{ width: '100%', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '4px', marginBottom: '30px' }}>FATE MASTERY MAP</div>
               <RadarChart data={stats.mastery} labels={['LUCK', 'STRATEGY', 'STAKES']} />
            </div>

            {/* Win-Loss Ratios per Game */}
            <div className="glass-panel" style={{ padding: '30px' }}>
               <div className="orbitron-font" style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '4px', marginBottom: '20px' }}>GAME PERFORMANCE MATRIX</div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                 {stats.gameData.map(([name, d]) => (
                   <div key={name}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '6px' }}>
                       <span style={{ color: d.color }}>{name}</span>
                       <span style={{ color: 'rgba(255,255,255,0.5)' }}>{(d.wins/d.total*100).toFixed(0)}% WIN RATE</span>
                     </div>
                     <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${(d.wins/d.total)*100}%` }}
                         style={{ height: '100%', background: d.color, boxShadow: `0 0 10px ${d.color}` }} 
                       />
                     </div>
                   </div>
                 ))}
               </div>
            </div>

          </div>

        </div>


        {/* Footer Log */}
        <div className="glass-panel" style={{ marginTop: '20px', padding: '15px 25px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: isCloud ? 'var(--neon-cyan)' : 'var(--neon-gold)', animation: 'pulse 1.5s infinite' }} />
          <div className="orbitron-font" style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '2px' }}>
            TERMINAL STATUS: ONLINE // DATA UPLINK: {isCloud ? 'SUPABASE CLOUD ☁' : 'LOCAL STORAGE'} // ARCHIVE SYNCED @ {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

const HUDCard = ({ label, value, color, icon }: { label: string; value: string; color: string; icon: string }) => (
  <div className="glass-panel" style={{ padding: '24px', border: '1px solid rgba(255,255,255,0.05)', borderBottom: `4px solid ${color}` }}>
    <div style={{ fontSize: '1.2rem', marginBottom: '10px' }}>{icon}</div>
    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '3px', marginBottom: '8px' }}>{label}</div>
    <div className="orbitron-font" style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff' }}>{value}</div>
  </div>
);

const RadarChart = ({ data, labels }: { data: number[]; labels: string[] }) => {
  // data is normalized 0-100
  const cx = 100, cy = 100, r = 80;
  const points = data.map((val, i) => {
    const angle = (Math.PI * 2 * i) / data.length - Math.PI / 2;
    const dist = (val / 100) * r;
    return { x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist };
  });

  const path = `M ${points[0].x},${points[0].y} ` + points.slice(1).map(p => `L ${p.x},${p.y}`).join(' ') + ' Z';

  return (
    <svg viewBox="0 0 200 200" style={{ width: '280px', height: '280px', overflow: 'visible' }}>
      <defs>
        <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(155, 93, 229, 0.4)" />
          <stop offset="100%" stopColor="rgba(155, 93, 229, 0)" />
        </radialGradient>
      </defs>
      {/* Background circles */}
      {[20, 40, 60, 80].map(rad => (
        <circle key={rad} cx={cx} cy={cy} r={rad} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      ))}
      {/* Axes */}
      {labels.map((_, i) => {
         const angle = (Math.PI * 2 * i) / data.length - Math.PI / 2;
         return <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(angle)*r} y2={cy + Math.sin(angle)*r} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />;
      })}
      {/* Labels */}
      {labels.map((l, i) => {
         const angle = (Math.PI * 2 * i) / data.length - Math.PI / 2;
         const dist = r + 25;
         return (
           <text key={l} x={cx + Math.cos(angle)*dist} y={cy + Math.sin(angle)*dist} 
                 className="orbitron-font" fill="rgba(255,255,255,0.4)" fontSize="10" textAnchor="middle" alignmentBaseline="middle">
             {l}
           </text>
         );
      })}
      {/* Data shape */}
      <motion.path 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        d={path} fill="url(#radarFill)" stroke="var(--neon-purple)" strokeWidth="2" strokeLinejoin="round" 
        style={{ filter: 'drop-shadow(0 0 8px var(--neon-purple))' }}
      />
      {/* Points */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#fff" style={{ filter: 'drop-shadow(0 0 5px var(--neon-purple))' }} />
      ))}
    </svg>
  );
};
