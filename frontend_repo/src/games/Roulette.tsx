import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCasino } from '../context/CasinoContext';
import { playClick, playBet, playWin, playLose, playSpinNoise } from '../utils/audio';
import { ParticleShower } from '../components/ParticleShower';
import { AmbientMotes } from '../components/AmbientMotes';

/* ─── Constants ──────────────────────────── */
const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36,
  11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9,
  22, 18, 29, 7, 28, 12, 35, 3, 26,
];
const RED_NUMBERS  = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
const NUM_POCKETS  = WHEEL_ORDER.length;
const POCKET_ANGLE = (Math.PI * 2) / NUM_POCKETS;

const pocketColor = (n: number) =>
  n === 0 ? '#1a9e4e' : RED_NUMBERS.includes(n) ? '#c0392b' : '#1a1a1a';

const lighten = (hex: string, a: number) => {
  if (!hex.startsWith('#')) return '#555';
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${Math.min(255,((n>>16)&0xff)+Math.round(255*a))},${Math.min(255,((n>>8)&0xff)+Math.round(255*a))},${Math.min(255,(n&0xff)+Math.round(255*a))})`;
};
const darken = (hex: string, a: number) => {
  if (!hex.startsWith('#')) return '#111';
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${Math.max(0,((n>>16)&0xff)-Math.round(255*a))},${Math.max(0,((n>>8)&0xff)-Math.round(255*a))},${Math.max(0,(n&0xff)-Math.round(255*a))})`;
};

const BETS = [
  { label: 'RED',    accent: '#c0392b',             mult: 2, check: (n:number) => RED_NUMBERS.includes(n) },
  { label: 'BLACK',  accent: '#555',                mult: 2, check: (n:number) => n !== 0 && !RED_NUMBERS.includes(n) },
  { label: 'EVEN',   accent: 'var(--neon-cyan)',    mult: 2, check: (n:number) => n !== 0 && n % 2 === 0 },
  { label: 'ODD',    accent: 'var(--neon-purple)',  mult: 2, check: (n:number) => n !== 0 && n % 2 !== 0 },
  { label: '1–18',   accent: 'var(--neon-gold)',    mult: 2, check: (n:number) => n >= 1 && n <= 18 },
  { label: '19–36',  accent: 'var(--neon-magenta)', mult: 2, check: (n:number) => n >= 19 && n <= 36 },
  { label: '0',      accent: '#1a9e4e',             mult: 5, check: (n:number) => n === 0 },
];

/* ─── Canvas drawing ─────────────────────── */
function drawWheel(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, angle: number) {
  ctx.save();
  ctx.translate(cx, cy);

  // Dark wood outer rim
  const rimG = ctx.createRadialGradient(0, 0, R * 0.9, 0, 0, R * 1.1);
  rimG.addColorStop(0, '#4a2a08'); rimG.addColorStop(1, '#0e0500');
  ctx.beginPath(); ctx.arc(0, 0, R * 1.08, 0, Math.PI*2);
  ctx.fillStyle = rimG; ctx.fill();

  // Gold outer border
  ctx.beginPath(); ctx.arc(0, 0, R * 1.06, 0, Math.PI*2);
  ctx.strokeStyle = '#d4af37'; ctx.lineWidth = R * 0.04; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, R * 1.02, 0, Math.PI*2);
  ctx.strokeStyle = 'rgba(255,220,80,0.3)'; ctx.lineWidth = R * 0.01; ctx.stroke();

  ctx.rotate(angle);

  // Pockets
  WHEEL_ORDER.forEach((num, i) => {
    const sa = i * POCKET_ANGLE - POCKET_ANGLE / 2;
    const ea = sa + POCKET_ANGLE;
    const ma = sa + POCKET_ANGLE / 2;
    const base = pocketColor(num);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, R * 0.97, sa, ea);
    ctx.closePath();

    const g = ctx.createRadialGradient(
      Math.cos(ma)*R*0.55, Math.sin(ma)*R*0.55, 1,
      Math.cos(ma)*R*0.78, Math.sin(ma)*R*0.78, R * 0.26
    );
    g.addColorStop(0, lighten(base, 0.3));
    g.addColorStop(1, darken(base, 0.2));
    ctx.fillStyle = g; ctx.fill();

    // Gold fret line
    ctx.beginPath();
    ctx.moveTo(Math.cos(sa)*R*0.58, Math.sin(sa)*R*0.58);
    ctx.lineTo(Math.cos(sa)*R*0.98, Math.sin(sa)*R*0.98);
    ctx.strokeStyle = '#d4af37'; ctx.lineWidth = R * 0.014; ctx.stroke();

    // Diamond pin
    const px = Math.cos(sa)*R*0.99, py = Math.sin(sa)*R*0.99;
    ctx.beginPath(); ctx.arc(px, py, R * 0.02, 0, Math.PI*2);
    const dg = ctx.createRadialGradient(px-1, py-1, 0.5, px, py, R*0.02);
    dg.addColorStop(0, '#fff9c4'); dg.addColorStop(1, '#b8860b');
    ctx.fillStyle = dg; ctx.fill();

    // Number text
    ctx.save();
    ctx.translate(Math.cos(ma)*R*0.8, Math.sin(ma)*R*0.8);
    ctx.rotate(ma + Math.PI/2);
    ctx.fillStyle = '#fff';
    ctx.font = `900 ${R*0.08}px Orbitron, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 5;
    ctx.fillText(String(num), 0, 0);
    ctx.restore();
  });

  // Ball track ring
  ctx.beginPath(); ctx.arc(0, 0, R * 0.63, 0, Math.PI*2);
  ctx.strokeStyle = 'rgba(212,175,55,0.5)'; ctx.lineWidth = R * 0.015; ctx.stroke();

  // Hub
  const hR = R * 0.29;
  // Spokes
  for (let s = 0; s < 12; s++) {
    const a = (s/12)*Math.PI*2;
    const sg = ctx.createLinearGradient(Math.cos(a)*hR, Math.sin(a)*hR, Math.cos(a)*R*0.61, Math.sin(a)*R*0.61);
    sg.addColorStop(0, 'rgba(212,175,55,0.9)');
    sg.addColorStop(1, 'rgba(212,175,55,0.08)');
    ctx.beginPath();
    ctx.moveTo(Math.cos(a)*hR, Math.sin(a)*hR);
    ctx.lineTo(Math.cos(a)*R*0.61, Math.sin(a)*R*0.61);
    ctx.strokeStyle = sg; ctx.lineWidth = R*0.022; ctx.stroke();
  }

  // Hub circle
  const hg = ctx.createRadialGradient(-hR*0.25, -hR*0.25, hR*0.05, 0, 0, hR);
  hg.addColorStop(0, '#8a4aee'); hg.addColorStop(0.5, '#2e0a60'); hg.addColorStop(1, '#06010e');
  ctx.beginPath(); ctx.arc(0, 0, hR, 0, Math.PI*2);
  ctx.fillStyle = hg; ctx.fill();
  ctx.strokeStyle = '#d4af37'; ctx.lineWidth = R*0.02; ctx.stroke();

  // Inner hub ring decoration
  ctx.beginPath(); ctx.arc(0, 0, hR*0.72, 0, Math.PI*2);
  ctx.strokeStyle = 'rgba(212,175,55,0.4)'; ctx.lineWidth = R*0.007; ctx.stroke();

  // Center gem
  const cg = ctx.createRadialGradient(-4, -4, 1, 0, 0, hR*0.28);
  cg.addColorStop(0, '#fff'); cg.addColorStop(0.35, '#d4af37'); cg.addColorStop(1, '#7a5a00');
  ctx.beginPath(); ctx.arc(0, 0, hR*0.28, 0, Math.PI*2);
  ctx.fillStyle = cg; ctx.fill();

  ctx.restore();
}

function drawBall(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, angle: number) {
  const bx = cx + Math.cos(angle)*r, by = cy + Math.sin(angle)*r;
  // Shadow
  ctx.save();
  ctx.beginPath(); ctx.arc(bx+2, by+3, 10, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.filter = 'blur(4px)'; ctx.fill();
  ctx.filter = 'none'; ctx.restore();
  // Ball
  const g = ctx.createRadialGradient(bx-3.5, by-3.5, 1, bx, by, 11);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#d8d8d8'); g.addColorStop(1, '#666');
  ctx.beginPath(); ctx.arc(bx, by, 11, 0, Math.PI*2);
  ctx.fillStyle = g;
  ctx.shadowColor = 'rgba(255,255,255,0.9)'; ctx.shadowBlur = 18;
  ctx.fill(); ctx.shadowBlur = 0;
}

const norm = (a: number) => ((a % (Math.PI*2)) + Math.PI*2) % (Math.PI*2);


/* ─── Main Component ─────────────────────── */
const CANVAS_SIZE = 620;

export const Roulette = ({ onBack }: { onBack: () => void }) => {
  const { user, updateBalance, recordGame } = useCasino();
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const rafRef     = useRef<number>(0);
  const stateRef   = useRef({ 
    wheelAngle: 0, 
    ballAngle: Math.PI/2, 
    spinning: false,
    startTime: 0,
    duration: 10000,
    initialWheelAngle: 0,
    targetWheelAngle: 0,
    initialBallAngle: 0,
    targetBallAngle: 0,
    winner: null as number | null
  });
  const selBetRef  = useRef<string|null>(null);
  const betAmtRef  = useRef(50);

  const [spinning,    setSpinning]    = useState(false);
  const [result,      setResult]      = useState<number|null>(null);
  const [bet,         setBet]         = useState(50);
  const [selectedBet, setSelectedBet] = useState<string|null>(null);
  const [message,     setMessage]     = useState('SELECT A BET AND SPIN');
  const [msgType,     setMsgType]     = useState<'default'|'win'|'lose'>('default');
  const [shower,      setShower]      = useState<'win'|'lose'|null>(null);
  const [showWelcome, setShowWelcome] = useState(false);

  // Store the stop function for spin noise
  const stopNoiseRef = useRef<(() => void) | null>(null);

  useEffect(() => { 
    const hasSeen = localStorage.getItem('hasSeenRouletteWelcome');
    if (!hasSeen) {
      setShowWelcome(true);
      const t = setTimeout(() => {
        setShowWelcome(false);
        localStorage.setItem('hasSeenRouletteWelcome', 'true');
      }, 5500);
      return () => clearTimeout(t);
    }
  }, []);
  useEffect(() => { selBetRef.current  = selectedBet; }, [selectedBet]);
  useEffect(() => { betAmtRef.current  = bet;         }, [bet]);

  // Clear shower after 3.5 s
  useEffect(() => {
    if (!shower) return;
    const t = setTimeout(() => setShower(null), 3500);
    return () => clearTimeout(t);
  }, [shower]);

  /* ─ Animation loop ─ */
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width, H = canvas.height;
    const cx = W/2, cy = H/2;
    const R  = Math.min(W, H) * 0.43;
    const trackR = R * 0.995;

    const s = stateRef.current;
    ctx.clearRect(0, 0, W, H);

    // Felt glow
    const fg = ctx.createRadialGradient(cx, cy, R*0.3, cx, cy, R*1.5);
    fg.addColorStop(0, 'rgba(0,80,35,0.18)'); fg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fg; ctx.fillRect(0, 0, W, H);

    if (s.spinning) {
      const now = performance.now();
      const elapsed = now - s.startTime;
      const progress = Math.min(1, elapsed / s.duration);
      
      // Wheel: Cubic Ease Out
      const easeOutWheel = 1 - Math.pow(1 - progress, 3);
      // Ball: Quantic Ease Out (Stays fast longer, then drops suddenly)
      const easeOutBall = 1 - Math.pow(1 - progress, 4);
      
      s.wheelAngle = s.initialWheelAngle + (s.targetWheelAngle - s.initialWheelAngle) * easeOutWheel;
      s.ballAngle  = s.initialBallAngle + (s.targetBallAngle - s.initialBallAngle) * easeOutBall;

      const dynamicTrack = progress < 0.7 
        ? trackR * 0.99  // Staying on the outer rim
        : trackR * (0.99 - (progress - 0.7) * 0.3); // Dropping rapidly into pockets at the end

      if (progress >= 1.0) {
        // Animation finished!
        const winner = s.winner!;
        s.spinning = false;
        
        if (stopNoiseRef.current) { stopNoiseRef.current(); stopNoiseRef.current = null; }

        setSpinning(false);
        setResult(winner);

        // Suspense Delay of 0.5 seconds before showing UI
        setTimeout(() => {
          const bDef = BETS.find(b => b.label === selBetRef.current);
          if (bDef && bDef.check(winner)) {
            const win = betAmtRef.current * bDef.mult;
            updateBalance(win);
            setMessage(`🎉 ${winner === 0 ? 'GREEN ZERO!' : winner} — ${bDef.label} WINS!  +$${win.toLocaleString()}`);
            setMsgType('win');
            setShower('win');
            playWin();
            
            recordGame({
              game: 'Roulette',
              bet: betAmtRef.current,
              outcome: 'WIN',
              net: win - betAmtRef.current,
              aiAdvice: `Bet on ${bDef.label}`,
              followedAdvice: true
            });
          } else {
            setMessage(`💨 You lost 💔 — ball landed on ${winner}`);
            setMsgType('lose');
            setShower('lose');
            playLose();

            recordGame({
              game: 'Roulette',
              bet: betAmtRef.current,
              outcome: 'LOSS',
              net: -betAmtRef.current,
              aiAdvice: 'Try Outside Bets',
              followedAdvice: false
            });
          }
        }, 1000); 
      }

      // Drop shadow
      ctx.save();
      ctx.translate(cx, cy + R*0.06); ctx.scale(1.01, 0.15);
      ctx.beginPath(); ctx.arc(0, 0, R*1.09, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.filter = 'blur(14px)'; ctx.fill();
      ctx.filter = 'none'; ctx.restore();

      drawWheel(ctx, cx, cy, R, s.wheelAngle);
      drawBall(ctx, cx, cy, dynamicTrack, s.ballAngle);
    } else {
      ctx.save();
      ctx.translate(cx, cy + R*0.06); ctx.scale(1.01, 0.15);
      ctx.beginPath(); ctx.arc(0, 0, R*1.09, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.filter = 'blur(14px)'; ctx.fill();
      ctx.filter = 'none'; ctx.restore();
      drawWheel(ctx, cx, cy, R, s.wheelAngle);
      if (result !== null) drawBall(ctx, cx, cy, R * 0.905, s.ballAngle);
    }

    rafRef.current = requestAnimationFrame(animate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, updateBalance]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animate]);

  /* ─ Cleanup noise loop on unmount ─ */
  useEffect(() => {
     return () => { if (stopNoiseRef.current) stopNoiseRef.current(); };
  }, []);

  /* ─ Spin ─ */
  const spin = () => {
    if (!user || user.balance < bet || bet < 50) { 
      playLose(); 
      setMessage('NOT ENOUGH FUNDS!'); 
      setMsgType('lose'); 
      return; 
    }
    if (!selectedBet)                { playLose(); setMessage('PICK A BET TYPE FIRST!'); setMsgType('lose'); return; }
    if (stateRef.current.spinning)   return;
    updateBalance(-bet);
    setResult(null); setShower(null);
    setMessage('🎡 SPINNING...'); setMsgType('default');
    
    playClick();
    stopNoiseRef.current = playSpinNoise();

    // Decisions are made at the start for synchronization
    const winner = WHEEL_ORDER[Math.floor(Math.random() * NUM_POCKETS)];
    const winnerIdx = WHEEL_ORDER.indexOf(winner);
    
    const initialWheelAngle = norm(stateRef.current.wheelAngle);
    const initialBallAngle = norm(stateRef.current.ballAngle);
    
    // Target: 6 full rotations (wheel) and 10 full rotations (ball opposite)
    const wheelRotations = (Math.random() > 0.5 ? 6 : -6) * Math.PI * 2;
    const ballRotations = (wheelRotations > 0 ? -10 : 10) * Math.PI * 2;
    
    // Final wheel angle doesn't matter much as long as it's continuous
    const targetWheelAngle = initialWheelAngle + wheelRotations;
    
    // Ball must land in the correct pocket relative to the wheel
    // Final rel = ballAngle - wheelAngle = winnerIdx * POCKET_ANGLE
    const targetBallAngle = targetWheelAngle + (winnerIdx * POCKET_ANGLE) + ballRotations;

    stateRef.current = {
      ...stateRef.current,
      spinning: true,
      startTime: performance.now(),
      duration: 10000,
      initialWheelAngle,
      targetWheelAngle,
      initialBallAngle,
      targetBallAngle,
      winner
    };
    
    setSpinning(true);
  };

  const changeBet = (delta: number) => {
    playBet();
    setBet(b => clamp(b + delta));
  };

  const maxBet = Math.max(50, user?.balance || 0);
  const clamp  = (v: number) => Math.max(50, Math.min(maxBet, v));
  const msgColor = msgType === 'win' ? 'var(--neon-gold)' : msgType === 'lose' ? 'var(--neon-magenta)' : '#fff';

  return (
    <div style={{ padding: '0 32px 60px', maxWidth: '1400px', margin: '0 auto', position: 'relative' }}>

      {/* ── Game-level cyberpunk background ─ */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden', background: '#080400' }} aria-hidden>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/cyber_wheel_bg.png)', backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.5) saturate(1.3)' }} />

        {/* HUD Elements */}
        {/* Hexagon icon left */}
        <svg style={{ position:'absolute', top:'20%', left:'10%', opacity:0.15 }} width={120} height={120} viewBox="0 0 100 100">
          <polygon points="50,5 90,25 90,75 50,95 10,75 10,25" fill="none" stroke="#ffb84d" strokeWidth="1" />
          <polygon points="50,15 80,30 80,70 50,85 20,70 20,30" fill="none" stroke="#ffb84d" strokeWidth="0.5" />
          <circle cx="50" cy="50" r="5" fill="#ffb84d" />
          <text x="34" y="65" fill="#ffb84d" fontSize="6" fontFamily="monospace">SYNC.01</text>
        </svg>

        {/* Target reticle right */}
        <svg style={{ position:'absolute', top:'25%', right:'10%', opacity:0.2 }} width={100} height={100} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="30" fill="none" stroke="#ffb84d" strokeWidth="1" strokeDasharray="5,5" />
          <circle cx="50" cy="50" r="40" fill="none" stroke="#ffb84d" strokeWidth="0.5" />
          <line x1="50" y1="0" x2="50" y2="45" stroke="#ffb84d" strokeWidth="1" />
          <line x1="50" y1="55" x2="50" y2="100" stroke="#ffb84d" strokeWidth="1" />
          <line x1="0" y1="50" x2="45" y2="50" stroke="#ffb84d" strokeWidth="1" />
          <line x1="55" y1="50" x2="100" y2="50" stroke="#ffb84d" strokeWidth="1" />
          <text x="55" y="45" fill="#ffb84d" fontSize="6" fontFamily="monospace">LVL.MAX</text>
        </svg>

        {/* Text bloc right */}
        <div style={{ position:'absolute', top:'40%', right:'8%', opacity:0.25, color:'#ffb84d', fontFamily:'monospace', fontSize:'0.55rem', lineHeight:'1.8' }}>
          <div>SYS_OP: NORMAL</div>
          <div>NET_LATENCY: 12ms</div>
          <div>CORE_TEMP: 45C</div>
          <div>-------------</div>
          <div>AWAITING SPIN</div>
        </div>

        {/* Flowing background particles */}
        <AmbientMotes count={100} primaryColor="#ffddaa" secondaryColor="#ff8800" />
      </div>

      {/* Particle shower overlay */}
      <ParticleShower type={shower} />

      {/* Welcome popup */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div initial={{ opacity:0, scale:0.75 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:1.15 }}
            transition={{ type:'spring', bounce:0.45 }}
            style={{ position:'fixed', inset:0, zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center',
              background:'rgba(0,0,0,0.85)', backdropFilter:'blur(25px)' }}>
            <div className="glass-panel elevation-2"
              style={{ position:'relative', padding:'50px 70px', textAlign:'center', border:'2px solid var(--neon-cyan)',
                boxShadow:'0 0 100px rgba(0,245,212,0.4), 0 0 200px rgba(241,91,181,0.2)' }}>
              <button onClick={() => setShowWelcome(false)}
                className="neon-text-cyan"
                style={{ position:'absolute', top:'15px', right:'20px', background:'transparent', border:'none',
                  fontSize:'1.8rem', cursor:'pointer', fontFamily:'sans-serif' }}>✕</button>
              <div style={{ fontSize:'4rem', marginBottom:'12px' }}>🎡</div>
              <h1 className="cinzel-font neon-text-cyan" style={{ fontSize:'2.8rem', marginBottom:'16px' }}>
                HOW TO PLAY
              </h1>
              <div className="orbitron-font" style={{ color:'var(--text-secondary)', fontSize:'1.1rem', lineHeight: '2.2', textAlign:'left', background:'rgba(0,0,0,0.5)', padding:'30px', borderRadius:'12px' }}>
                <div style={{color:'#fff'}}>1. Select a Bet Amount (Min $50).</div>
                <div style={{color:'#fff'}}>2. Choose your Bet Type below the wheel.</div>
                <div style={{color:'#fff'}}>3. Hit SPIN to roll fate.</div>
                <div style={{color:'var(--neon-gold)', marginTop:'12px', textAlign:'center', fontWeight:700, textShadow:'0 0 10px rgba(255,190,11,0.5)'}}>
                  LAND ON GREEN ZERO FOR A 5X PAYOUT!
                </div>
              </div>
              <div style={{ marginTop:'36px', display:'flex', justifyContent:'center', gap:'10px' }}>
                {[0,1,2,3].map(i => (
                  <motion.div key={i} animate={{ scale:[1,1.5,1], opacity:[0.4,1,0.4] }}
                    transition={{ duration:1, delay:i*0.25, repeat:Infinity }}
                    style={{ width:10, height:10, borderRadius:'50%',
                      background:['var(--neon-gold)','var(--neon-magenta)','var(--neon-cyan)','var(--neon-purple)'][i] }} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back */}
      <button onClick={onBack} className="neon-button gold" style={{ marginBottom:'28px' }}>← LOBBY</button>

      {/* Instruction Button */}
      <button onClick={() => setShowWelcome(true)} className="neon-button"
        style={{ position:'fixed', bottom:'24px', left:'24px', zIndex:50, borderRadius:'50%', 
          width:'50px', height:'50px', display:'flex', alignItems:'center', justifyContent:'center', 
          padding:0, fontSize:'1.4rem', fontFamily:'Cinzel', 
          border:'1px solid var(--neon-cyan)', color:'var(--neon-cyan)',
          boxShadow:'0 0 10px rgba(0,245,212,0.3)' }}>
        ?
      </button>

      {/* Title block */}
      <div style={{ textAlign:'center', marginBottom:'36px', position:'relative', zIndex:1 }}>
        <div className="dancing-font" style={{ color:'var(--neon-cyan)', fontSize:'1.5rem', marginBottom:'6px', letterSpacing:'4px' }}>
          ✦ Where Fate Spins ✦
        </div>
        <h1 className="cinzel-font" style={{
          fontSize:'5.2rem', lineHeight:1, letterSpacing:'6px',
          background:'linear-gradient(135deg, #ffd700 0%, #ffbe0b 30%, #f15bb5 65%, #9b5de5 100%)',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
          filter:'drop-shadow(0 0 40px rgba(255,190,11,0.6)) drop-shadow(0 0 80px rgba(241,91,181,0.3))',
        }}>
          CYBER WHEEL
        </h1>
        <div className="orbitron-font" style={{ color:'var(--neon-cyan)', fontSize:'0.72rem', letterSpacing:'10px', marginTop:'10px',
          textShadow:'0 0 10px var(--neon-cyan)' }}>
          THE HOUSE ALWAYS WINS // OR DOES IT?
        </div>
        <div style={{ height:'2px', width:'320px', margin:'16px auto 0',
          background:'linear-gradient(90deg, transparent, var(--neon-gold), var(--neon-magenta), var(--neon-cyan), transparent)',
          boxShadow:'0 0 16px rgba(255,190,11,0.6), 0 0 32px rgba(241,91,181,0.3)' }} />
      </div>

      <div style={{ display:'flex', gap:'40px', alignItems:'flex-start', flexWrap:'wrap', justifyContent:'center', position:'relative', zIndex:1 }}>

        {/* ── Wheel Area ─ */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'24px', flexShrink:0, position:'relative' }}>

          <div style={{ perspective:'1000px', perspectiveOrigin:'50% 15%', position: 'relative', zIndex: 1,
            filter:'drop-shadow(0 50px 80px rgba(0,0,0,1)) drop-shadow(0 0 40px rgba(212,175,55,0.35))' }}>
            <div style={{ transform:'rotateX(20deg)', transformStyle:'preserve-3d' }}>
              <canvas ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE}
                style={{ borderRadius:'50%', display:'block' }} />
            </div>
          </div>

          {/* Result badge */}
          <AnimatePresence mode="wait">
            {result !== null ? (
              <motion.div key={result} initial={{ scale:0.5, opacity:0, rotateY:180 }} animate={{ scale:1, opacity:1, rotateY:0 }}
                className="glass-panel elevation-2"
                style={{ padding:'18px 60px', textAlign:'center', minWidth:'220px',
                  border:`2px solid ${pocketColor(result)}`,
                  boxShadow:`0 0 50px ${pocketColor(result)}aa, 0 0 100px ${pocketColor(result)}44` }}>
                <div className="orbitron-font" style={{ color:'rgba(255,255,255,0.45)', fontSize:'0.65rem', letterSpacing:'5px', marginBottom:'4px' }}>RESULT</div>
                <div className="orbitron-font" style={{ fontSize:'4rem', fontWeight:900, color:'#fff',
                  textShadow:`0 0 30px ${pocketColor(result)}, 0 0 60px ${pocketColor(result)}` }}>{result}</div>
                <div className="cinzel-font" style={{ fontSize:'0.85rem', color:pocketColor(result), letterSpacing:'3px' }}>
                  {result === 0 ? '◆ GREEN ZERO' : RED_NUMBERS.includes(result) ? '◆ RED' : '◆ BLACK'}
                </div>
              </motion.div>
            ) : (
              <motion.div key="await" className="glass-panel" style={{ padding:'20px 44px', textAlign:'center' }}>
                <span className="orbitron-font" style={{ color:'var(--text-secondary)', fontSize:'0.8rem', letterSpacing:'3px' }}>
                  {spinning ? 'SPINNING...' : 'AWAITING SPIN'}
                </span>
              </motion.div>
            )} 
          </AnimatePresence>
        </div>

        {/* ── Controls ─ */}
        <div style={{ flex:1, minWidth:'300px', maxWidth:'440px', display:'flex', flexDirection:'column', gap:'20px' }}>

          {/* Message bar */}
          <motion.div key={message} initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
            className="glass-panel"
            style={{ padding:'18px 24px', textAlign:'center', border:`1px solid ${msgColor}44`,
              boxShadow:msgType==='win'?'0 0 35px rgba(255,190,11,0.25)':msgType==='lose'?'0 0 20px rgba(255,68,102,0.15)':'none' }}>
            <div className="cinzel-font" style={{ fontSize:'1.15rem', color:msgColor,
              textShadow:msgType==='win'?'0 0 25px var(--neon-gold)':'none' }}>{message}</div>
          </motion.div>

          {/* Bet type */}
          <div className="glass-panel" style={{ padding:'22px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
              <span className="orbitron-font" style={{ color:'var(--text-secondary)', fontSize:'0.7rem', letterSpacing:'3px' }}>BET TYPE</span>
              <span className="dancing-font" style={{ color:'#1a9e4e', fontSize:'1.1rem' }}>Zero = 5× reward!</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px' }}>
              {BETS.map(b => {
                const sel = selectedBet === b.label;
                return (
                  <motion.button key={b.label} whileTap={{ scale:0.93 }}
                    onClick={() => { if (!spinning) { playClick(); setSelectedBet(b.label); } }}
                    disabled={spinning}
                    style={{
                      padding:'16px 6px', borderRadius:'12px', cursor:spinning?'not-allowed':'pointer',
                      border:`2px solid ${b.accent}`,
                      background:sel ? b.accent : 'rgba(0,0,0,0.6)',
                      color:sel&&b.label!=='BLACK'?'#000':'#fff',
                      fontFamily:'Cinzel, serif', fontWeight:700, fontSize:'0.95rem',
                      boxShadow:sel?`0 0 28px ${b.accent}bb`:'none',
                      transition:'all 0.16s ease',
                    }}>
                    {b.label}
                    <div style={{ fontFamily:'Orbitron,sans-serif', fontSize:'0.6rem', marginTop:'4px',
                      color:sel&&b.label!=='BLACK'?'rgba(0,0,0,0.55)':'rgba(255,255,255,0.4)', letterSpacing:'1px' }}>
                      ×{b.mult}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Bet amount */}
          <div className="glass-panel" style={{ padding:'20px 22px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'12px' }}>
              <span className="orbitron-font" style={{ color:'var(--text-secondary)', fontSize:'0.7rem', letterSpacing:'3px' }}>BET AMOUNT</span>
              <span style={{ color:'var(--text-secondary)', fontSize:'0.75rem' }}>Min $50 · Max ${maxBet.toLocaleString()}</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <button onClick={() => changeBet(-50)} className="neon-button"
                disabled={spinning||bet<=50} style={{ padding:'10px 10px', fontSize:'0.85rem' }}>−50</button>
              <button onClick={() => changeBet(-10)} className="neon-button"
                disabled={spinning||bet<=50} style={{ padding:'10px 10px', fontSize:'0.85rem' }}>−10</button>
              <div style={{ flex:1, textAlign:'center' }}>
                <div className="orbitron-font neon-text-gold" style={{ fontSize:'2rem', fontWeight:900 }}>${bet}</div>
                <div style={{ height:'4px', background:'rgba(255,255,255,0.07)', borderRadius:'2px', marginTop:'6px', overflow:'hidden' }}>
                  <motion.div animate={{ width:`${((bet-50)/Math.max(1,maxBet-50))*100}%` }}
                    style={{ height:'100%', borderRadius:'2px',
                      background:'linear-gradient(90deg, var(--neon-gold), var(--neon-magenta))',
                      boxShadow:'0 0 8px var(--neon-gold)', transition:'width 0.2s' }} />
                </div>
              </div>
              <button onClick={() => changeBet(10)} className="neon-button"
                disabled={spinning||bet>=maxBet} style={{ padding:'10px 10px', fontSize:'0.85rem' }}>+10</button>
              <button onClick={() => changeBet(50)} className="neon-button"
                disabled={spinning||bet>=maxBet} style={{ padding:'10px 10px', fontSize:'0.85rem' }}>+50</button>
            </div>
            {/* Quick bets */}
            <div style={{ display:'flex', gap:'7px', marginTop:'12px' }}>
              {[50,100,500,1000].filter(v => v <= maxBet).map(v => (
                <button key={v} onClick={() => { if (!spinning) { playBet(); setBet(clamp(v)); } }} disabled={spinning}
                  className="dancing-font"
                  style={{ flex:1, padding:'8px 4px', borderRadius:'9px', fontSize:'0.9rem', fontWeight:700,
                    border:`1px solid ${bet===v?'var(--neon-gold)':'rgba(255,255,255,0.1)'}`,
                    background:bet===v?'rgba(255,190,11,0.18)':'rgba(0,0,0,0.45)',
                    color:bet===v?'var(--neon-gold)':'var(--text-secondary)', cursor:'pointer',
                    transition:'all 0.15s', fontFamily:'Dancing Script, cursive' }}>
                  ${v}
                </button>
              ))}
              <button onClick={() => { if (!spinning) { playBet(); setBet(Math.max(50, maxBet)); } }} disabled={spinning}
                style={{ flex:1, padding:'8px 4px', borderRadius:'9px', fontSize:'0.85rem', fontWeight:800,
                  border:'1px solid var(--neon-magenta)', background:bet===maxBet?'rgba(241,91,181,0.18)':'rgba(0,0,0,0.45)',
                  color:'var(--neon-magenta)', cursor:'pointer', fontFamily:'Cinzel,serif', letterSpacing:'1px' }}>
                MAX
              </button>
            </div>
          </div>

          {/* Spin button */}
          <motion.button whileHover={{ scale:spinning?1:1.03 }} whileTap={{ scale:0.97 }}
            onClick={spin} disabled={spinning||!selectedBet}
            className="neon-button gold"
            style={{ padding:'26px', fontSize:'1.6rem', letterSpacing:'4px',
              fontFamily:'Cinzel, serif',
              opacity:spinning||!selectedBet?0.45:1,
              boxShadow:!spinning&&selectedBet
                ?'0 0 50px rgba(255,190,11,0.45), 0 0 90px rgba(255,190,11,0.15)' : 'none' }}>
            {spinning ? '🎡  FATE IS DECIDING...' : '🎡  SPIN THE WHEEL'}
          </motion.button>
        </div>
      </div>
    </div>
  );
};
