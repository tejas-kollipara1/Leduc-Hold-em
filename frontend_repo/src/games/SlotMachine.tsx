import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCasino } from '../context/CasinoContext';
import { playClick, playBet, playWin, playLose, playReelStop, playSlotSpin } from '../utils/audio';
import { ParticleShower } from '../components/ParticleShower';
import { AmbientMotes } from '../components/AmbientMotes';

/* ─── Constants ──────────────────────────── */
const SYMBOLS = [
  { emoji: '🃏', label: 'WILD',    mult3: 250, mult4: 1000, mult5: 5000, weight: 3,  isWild: true },
  { emoji: '💎', label: 'DIAMOND',  mult3: 100, mult4: 500,  mult5: 2000, weight: 10 },
  { emoji: '🎰', label: 'BAR',      mult3: 50,  mult4: 200,  mult5: 1000, weight: 15 },
  { emoji: '7️⃣',  label: 'SEVEN',    mult3: 25,  mult4: 100,  mult5: 500,  weight: 20 },
  { emoji: '🔔', label: 'BELL',     mult3: 15,  mult4: 60,   mult5: 250,  weight: 25 },
  { emoji: '🍒', label: 'CHERRY',   mult3: 10,  mult4: 40,   mult5: 150,  weight: 35 },
  { emoji: '🍉', label: 'MELON',    mult3: 8,   mult4: 30,   mult5: 100,  weight: 45 },
  { emoji: '🍋', label: 'LEMON',    mult3: 5,   mult4: 20,   mult5: 75,   weight: 55 },
  { emoji: '⭐', label: 'STAR',     mult3: 3,   mult4: 10,   mult5: 50,    weight: 70 },
];

const randomSymbol = () => {
  const totalWeight = SYMBOLS.reduce((acc, s) => acc + s.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const s of SYMBOLS) {
    if (rand < s.weight) return s;
    rand -= s.weight;
  }
  return SYMBOLS[SYMBOLS.length - 1];
};

/* ─── Particle shower ────────────────────── */





/* ─── Component ──────────────────────────── */
export const SlotMachine = ({ onBack }: { onBack: () => void }) => {
  const { user, updateBalance, recordGame } = useCasino();
  const [reels, setReels] = useState(Array(5).fill(SYMBOLS[0]));
  const [spinning, setSpinning] = useState(false);
  const [stopping, setStopping] = useState<boolean[]>(Array(5).fill(false));
  const [message, setMessage] = useState('PLACE YOUR BET & SPIN');
  const [msgType, setMsgType] = useState<'default' | 'win' | 'lose'>('default');
  const [bet, setBet] = useState(100);
  const [shower, setShower] = useState<'win'|'lose'|null>(null);
  const [spinView, setSpinView] = useState(Array(5).fill(SYMBOLS[0]));
  const [showHelp, setShowHelp] = useState(false);
  const hudSeed = useMemo(() => Math.random().toString(16).slice(2, 10), []);
  
  // Store the stop function for spin audio
  const stopSpinAudioRef = useRef<(() => void) | null>(null);

  // Clear shower after 4s
  useEffect(() => {
    if (!shower) return;
    const t = setTimeout(() => setShower(null), 4000);
    return () => clearTimeout(t);
  }, [shower]);

  // Discrete stepping animation interval
  useEffect(() => {
    if (!spinning) return;
    const interval = setInterval(() => {
      setSpinView(prev => prev.map((s, i) => stopping[i] ? randomSymbol() : s));
    }, 500); // 500ms "deliberate" steps to prevent render lag
    return () => clearTimeout(interval);
  }, [spinning, stopping]);

  const maxBet = Math.max(100, user?.balance || 0);
  
  const spin = () => {
    if (!user || user.balance < bet || bet < 100) {
      playLose();
      setMessage('NOT ENOUGH FUNDS!');
      setMsgType('lose');
      setShower('lose');
      return;
    }

    setSpinning(true);
    setStopping(Array(5).fill(true));
    updateBalance(-bet);
    setMessage('🎰 SPINNING REELS...');
    setMsgType('default');
    setShower(null);
    playClick();
    stopSpinAudioRef.current = playSlotSpin(0.5); // 0.5x speed as requested

    const finalReels = [randomSymbol(), randomSymbol(), randomSymbol(), randomSymbol(), randomSymbol()];
    
    // Staggered stop sequence
    finalReels.forEach((symbol, i) => {
      setTimeout(() => {
        setReels(prev => {
          const next = [...prev];
          next[i] = symbol;
          return next;
        });
        setStopping(prev => {
          const next = [...prev];
          next[i] = false;
          return next;
        });
        playReelStop();
        // If it's the last reel, calculate result
        if (i === 4) {
          setTimeout(() => {
            finishSpin(finalReels);
          }, 500); 
        }
      }, (i + 1) * 2000); // 2s, 4s, 6s, 8s, 10s (Total 10 seconds)
    });
  };

  const finishSpin = (results: typeof SYMBOLS) => {
    setSpinning(false);
    setSpinView(results); // Final result view
    
    // Stop the spin audio
    if (stopSpinAudioRef.current) {
      stopSpinAudioRef.current();
      stopSpinAudioRef.current = null;
    }
    
    let bestWin = 0;
    let winMsg = '';
    
    // 1. Check for 3+ matches with WILD logic
    SYMBOLS.filter(s => !s.isWild).forEach(sym => {
      // Count how many of this symbol OR Wilds we have
      const count = results.filter(r => r.emoji === sym.emoji || r.isWild).length;
      
      if (count >= 3) {
        let win = 0;
        if (count === 3) win = bet * sym.mult3;
        else if (count === 4) win = bet * sym.mult4;
        else if (count === 5) win = bet * sym.mult5;
        
        if (win > bestWin) {
          bestWin = win;
          winMsg = `🎉 ${count}x ${sym.label} (inc. Wilds)!`;
        }
      }
    });

    // 2. Check for Pure Wilds (if not already beaten by a symbol match)
    const wildCount = results.filter(r => r.isWild).length;
    if (wildCount >= 3) {
      const wildSym = SYMBOLS.find(s => s.isWild)!;
      let win = 0;
      if (wildCount === 3) win = bet * wildSym.mult3;
      else if (wildCount === 4) win = bet * wildSym.mult4;
      else if (wildCount === 5) win = bet * wildSym.mult5;
      
      if (win > bestWin) {
        bestWin = win;
        winMsg = `🃏 ${wildCount}x WILD JACKPOT!`;
      }
    }

    // 3. Special 2-match wins (if no 3+ match found)
    if (bestWin === 0) {
      const diamonds = results.filter(r => r.emoji === '💎' || r.isWild).length;
      const bars = results.filter(r => r.emoji === '🎰' || r.isWild).length;
      
      if (diamonds === 2) {
        bestWin = bet * 5;
        winMsg = '💎 2x DIAMONDS!';
      } else if (bars === 2) {
        bestWin = bet * 3;
        winMsg = '🎰 2x BARS!';
      }
    }

    if (bestWin > 0) {
      updateBalance(bestWin);
      setShower('win');
      playWin();
      setMessage(`${winMsg} +$${bestWin.toLocaleString()}`);
      setMsgType('win');
      
      recordGame({
        game: 'Slotopia',
        bet,
        outcome: 'WIN',
        net: bestWin - bet,
        aiAdvice: 'High Payout Detected',
        followedAdvice: true
      });
    } else {
      setMessage('💨 NO LUCK — TRY AGAIN 💔');
      setMsgType('lose');
      setShower('lose');
      playLose();

      recordGame({
        game: 'Slotopia',
        bet,
        outcome: 'LOSS',
        net: -bet,
        aiAdvice: 'Wait for Pattern',
        followedAdvice: false
      });
    }
  };

  const changeBet = (val: number) => {
    playBet();
    setBet(Math.max(10, Math.min(maxBet, val)));
  };

  const msgColor = msgType === 'win' ? 'var(--neon-gold)' : msgType === 'lose' ? '#ff4466' : 'var(--text-secondary)';

  return (
    <div style={{ padding: '0 32px 60px', maxWidth: '1400px', margin: '0 auto', position: 'relative' }}>
      
      {/* ── Background City Skyline (Custom for Slotopia) ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }} aria-hidden>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url("/Gemini_Generated_Image_dvykqkdvykqkdvyk (1).png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.65) contrast(1.1) saturate(0.9)', 
        }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.6) 100%)' }} />
        
        {/* Ambient Floating Motes */}
        <AmbientMotes count={40} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, rgba(0,0,0,0) 0%, rgba(0,0,0,0.8) 100%)' }} />
        
        {/* HUD Elements */}
        <div style={{ position:'absolute', top:'15%', right:'5%', opacity:0.1, color:'var(--neon-cyan)', fontFamily:'monospace', fontSize:'0.7rem' }}>
          <div>SLOT_STATUS: ACTIVE</div>
          <div>RANDOM_SEED: {hudSeed}</div>
          <div>PAYOUT_LIMIT: LVL_∞</div>
        </div>
      </div>

      <ParticleShower type={shower} />

      {/* Back */}
      <button onClick={onBack} className="neon-button magenta" style={{ marginBottom: '32px', position: 'relative', zIndex: 2 }}>
        ← LOBBY
      </button>

      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: '40px', position: 'relative', zIndex: 2 }}>
        <h1 className="cinzel-font" style={{
          fontSize: '5.5rem', lineHeight: 1, letterSpacing: '8px',
          background: 'linear-gradient(to bottom, #fff 20%, var(--neon-magenta) 50%, var(--neon-purple) 80%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 0 30px rgba(241,91,181,0.5))'
        }}>
          SLOTOPIA
        </h1>
        <div className="orbitron-font" style={{ color: 'var(--neon-cyan)', fontSize: '0.8rem', letterSpacing: '12px', marginTop: '10px' }}>
          FIVE REELS OF DESTINY
        </div>
      </div>

      {/* Machine Panel */}
      <div className="glass-panel elevation-2" style={{
        padding: '60px 40px',
        border: '1px solid var(--neon-magenta)',
        boxShadow: '0 0 80px rgba(241,91,181,0.15), 0 40px 100px rgba(0,0,0,0.9)',
        position: 'relative', overflow: 'hidden', zIndex: 2,
        maxWidth: '1100px', margin: '0 auto'
      }}>
        {/* Reels Container */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '60px' }}>
          {reels.map((sym, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <motion.div
                animate={stopping[i] ? {
                  y: [0, -100, 100, -80, 80, 0],
                  filter: ['brightness(1)', 'brightness(2)', 'brightness(1)'],
                } : { y: 0 }}
                transition={{ duration: 0.2, repeat: stopping[i] ? Infinity : 0 }}
                style={{
                  width: '150px', height: '180px',
                  background: 'linear-gradient(180deg, rgba(0,0,0,0.95), rgba(30,10,60,0.98))',
                  border: '2px solid',
                  borderColor: stopping[i] ? 'var(--neon-magenta)' : msgType === 'win' ? 'var(--neon-gold)' : 'rgba(255,255,255,0.15)',
                  borderRadius: '16px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  fontSize: '5rem',
                  boxShadow: stopping[i]
                    ? '0 0 40px rgba(241,91,181,0.4), inset 0 0 20px rgba(241,91,181,0.2)'
                    : msgType === 'win'
                      ? '0 0 40px rgba(255,190,11,0.4), inset 0 0 20px rgba(255,190,11,0.2)'
                      : 'inset 0 0 30px rgba(0,0,0,0.8)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {stopping[i] ? (
                  <div style={{ filter: 'blur(0px)' }}>
                    {spinView[i].emoji}
                  </div>
                ) : reels[i].emoji}
                
                {!stopping[i] && (
                  <span className="orbitron-font" style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '8px', letterSpacing: '2px' }}>
                    {sym.label}
                  </span>
                )}

                {/* Suspense Glow for next reel to stop */}
                {spinning && stopping[i] && !stopping[i-1] && i > 0 && (
                   <div style={{ position: 'absolute', inset: 0, border: '4px solid var(--neon-cyan)', borderRadius:'16px', boxShadow: '0 0 30px var(--neon-cyan)', animation: 'pulse 0.5s infinite' }} />
                )}
              </motion.div>
            </div>
          ))}
        </div>

        {/* Message */}
        <motion.div
          key={message}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="cinzel-font"
          style={{
            textAlign: 'center', fontSize: '2.4rem', height: '60px',
            color: msgColor,
            textShadow: msgType === 'win' ? '0 0 30px var(--neon-gold), 0 0 60px var(--neon-gold)' : 'none',
          }}
        >
          {message}
        </motion.div>
      </div>

      {/* Controls (Cyber Wheel Style) */}
      <div style={{ 
        display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '600px', margin: '40px auto 0', 
        position: 'relative', zIndex: 2 
      }}>
        
        {/* Bet Config */}
        <div className="glass-panel" style={{ padding: '24px' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span className="orbitron-font" style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', letterSpacing: '4px' }}>BET AMOUNT</span>
              <span className="orbitron-font" style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>MAX: ${maxBet.toLocaleString()}</span>
           </div>

           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={() => changeBet(bet - 100)} className="neon-button" disabled={spinning} style={{ padding: '12px' }}>−100</button>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div className="orbitron-font neon-text-cyan" style={{ fontSize: '2.5rem', fontWeight: 900 }}>${bet}</div>
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
                    <motion.div 
                      animate={{ width: `${(bet / Math.max(1, maxBet)) * 100}%` }}
                      style={{ height: '100%', background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-magenta))', boxShadow: '0 0 10px var(--neon-cyan)' }} 
                    />
                </div>
              </div>
              <button onClick={() => changeBet(bet + 100)} className="neon-button" disabled={spinning} style={{ padding: '12px' }}>+100</button>
           </div>

           {/* Quick Bets */}
           <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              {[100, 500, 1000, 5000].filter(v => v <= maxBet).map(v => (
                <button key={v} onClick={() => changeBet(v)} disabled={spinning}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: '8px', background: 'rgba(0,0,0,0.4)',
                    border: `1px solid ${bet === v ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.1)'}`,
                    color: bet === v ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                    fontFamily: 'Orbitron', fontSize: '0.8rem', cursor: 'pointer'
                  }}>
                  ${v}
                </button>
              ))}
              <button onClick={() => { if (!spinning) { playBet?.(); setBet(Math.max(10, maxBet)); } }} disabled={spinning}
                style={{ flex:1, padding:'8px 4px', borderRadius:'9px', fontSize:'0.85rem', fontWeight:800,
                  border:'1px solid var(--neon-purple)', background:bet===maxBet?'rgba(155,93,229,0.18)':'rgba(0,0,0,0.45)',
                  color:'var(--neon-purple)', cursor:'pointer', fontFamily:'Cinzel,serif', letterSpacing:'1px' }}>
                MAX
              </button>
           </div>
        </div>

        {/* Spin Button */}
        <motion.button
          whileHover={{ scale: spinning ? 1 : 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={spin}
          disabled={spinning}
          className="neon-button magenta"
          style={{
            padding: '30px', fontSize: '2rem', letterSpacing: '6px',
            fontFamily: 'Cinzel', fontWeight: 'bold',
            opacity: spinning ? 0.6 : 1,
            boxShadow: spinning ? 'none' : '0 0 50px rgba(241,91,181,0.4)'
          }}
        >
          {spinning ? 'DECIDING FATE...' : '🎰 SPIN THE SLOTS'}
        </motion.button>
      </div>

      {/* Paytable */}
      <div className="glass-panel" style={{ marginTop: '60px', padding: '32px', position: 'relative', zIndex: 2 }}>
        <h3 className="orbitron-font" style={{ marginBottom: '24px', color: 'rgba(255,255,255,0.5)', letterSpacing: '4px', fontSize: '0.9rem', textAlign: 'center' }}>PAYOUT DATA</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '20px' }}>
          {SYMBOLS.map(s => (
            <div key={s.label} style={{
              padding: '16px', borderRadius: '12px',
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.08)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>{s.emoji}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'Orbitron' }}>3x: ×{s.mult3}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--neon-gold)', fontFamily: 'Orbitron', fontWeight: 'bold' }}>5x: ×{s.mult5}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.02); }
          100% { opacity: 0.4; transform: scale(1); }
        }
        @keyframes coinSpin {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) translateX(var(--dx)) rotate(720deg); opacity: 0; }
        }
        @keyframes smokeDrift {
          0% { transform: translateY(0) scale(1); opacity: 0.6; }
          100% { transform: translateY(-100vh) translateX(var(--dx)) scale(3); opacity: 0; }
        }
        @keyframes floatAround {
          0% { transform: translate(0, 0); }
          25% { transform: translate(50px, 50px); }
          50% { transform: translate(0, 100px); }
          75% { transform: translate(-50px, 50px); }
          100% { transform: translate(0, 0); }
        }
      `}</style>

      {/* Instruction Button */}
      <button onClick={() => setShowHelp(true)} className="neon-button"
        style={{ position:'fixed', bottom:'24px', left:'24px', zIndex:50, borderRadius:'50%', 
          width:'50px', height:'50px', display:'flex', alignItems:'center', justifyContent:'center', 
          padding:0, fontSize:'1.4rem', fontFamily:'Cinzel', 
          border:'1px solid var(--neon-magenta)', color:'var(--neon-magenta)',
          boxShadow:'0 0 10px rgba(241,91,181,0.3)' }}>
        ?
      </button>

      {/* Welcome/Help popup */}
      <AnimatePresence>
        {showHelp && (
          <motion.div initial={{ opacity:0, scale:0.75 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:1.15 }}
            transition={{ type:'spring', bounce:0.45 }}
            style={{ position:'fixed', inset:0, zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center',
              background:'rgba(0,0,0,0.85)', backdropFilter:'blur(25px)' }}>
            <div className="glass-panel elevation-2"
              style={{ position:'relative', padding:'50px 70px', textAlign:'center', border:'2px solid var(--neon-magenta)',
                boxShadow:'0 0 100px rgba(241,91,181,0.4), 0 0 200px rgba(155,93,229,0.2)' }}>
              <button onClick={() => setShowHelp(false)}
                className="neon-text-magenta"
                style={{ position:'absolute', top:'15px', right:'20px', background:'transparent', border:'none',
                  fontSize:'1.8rem', cursor:'pointer', fontFamily:'sans-serif', color:'var(--neon-magenta)' }}>✕</button>
              <div style={{ fontSize:'4rem', marginBottom:'12px' }}>🎰</div>
              <h1 className="cinzel-font neon-text-magenta" style={{ fontSize:'2.8rem', marginBottom:'16px', color:'var(--neon-magenta)' }}>
                SLOTOPIA GUIDE
              </h1>
              <div className="orbitron-font" style={{ color:'var(--text-secondary)', fontSize:'1.1rem', lineHeight: '2.2', textAlign:'left', background:'rgba(0,0,0,0.5)', padding:'30px', borderRadius:'12px' }}>
                <div style={{color:'#fff'}}>1. BET: Adjust your wager amount before spinning.</div>
                <div style={{color:'#fff'}}>2. SPIN: Hit the button to rotate the 5 neon reels.</div>
                <div style={{color:'#fff'}}>3. WILD: The Joker (🃏) symbol acts as a Wild, substituting for others!</div>
                <div style={{color:'#fff'}}>4. WIN: Match 3 or more symbols across the center line to win.</div>
                <div style={{color:'var(--neon-magenta)', marginTop:'12px', textAlign:'center', fontWeight:700, textShadow:'0 0 10px rgba(241,91,181,0.5)'}}>
                  DIAMONDS & BARS PAY OUT EVEN FOR JUST 2 MATCHES!
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
