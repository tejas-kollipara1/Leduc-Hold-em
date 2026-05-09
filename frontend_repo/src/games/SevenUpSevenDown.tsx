import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCasino } from '../context/CasinoContext';
import { playClick, playBet, playWin, playLose, playSpinNoise } from '../utils/audio';
import { ParticleShower } from '../components/ParticleShower';
import { AmbientMotes } from '../components/AmbientMotes';

export const SevenUpSevenDown = ({ onBack }: { onBack: () => void }) => {
  const { user, updateBalance, recordGame } = useCasino();
  const [bet, setBet] = useState(100);
  const [selectedBet, setSelectedBet] = useState<'down' | 'lucky7' | 'up' | null>(null);
  
  const [isRolling, setIsRolling] = useState(false);
  const [dice1, setDice1] = useState(3);
  const [dice2, setDice2] = useState(4);
  const [resultSum, setResultSum] = useState<number|null>(null);
  const [message, setMessage] = useState('SELECT A BET AND ROLL');
  const [msgType, setMsgType] = useState<'default'|'win'|'lose'>('default');
  const [shower, setShower] = useState<'win'|'lose'|null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const stopNoiseRef = useRef<(() => void) | null>(null);
  // Snapshot refs to avoid stale closures in async callbacks
  const betRef = useRef(bet);
  const selectedBetRef = useRef(selectedBet);
  useEffect(() => { betRef.current = bet; }, [bet]);
  useEffect(() => { selectedBetRef.current = selectedBet; }, [selectedBet]);

  useEffect(() => {
    if (!shower) return;
    const t = setTimeout(() => setShower(null), 3500);
    return () => clearTimeout(t);
  }, [shower]);

  const BETS = [
    { id: 'down', label: '7 DOWN',  mult: 2, accent: 'var(--neon-magenta)', desc: 'SUM < 7' },
    { id: 'lucky7', label: 'LUCKY 7', mult: 5, accent: 'var(--neon-gold)', desc: 'SUM = 7' },
    { id: 'up',   label: '7 UP',    mult: 2, accent: 'var(--neon-blue)', desc: 'SUM > 7' }
  ];

  const handleRoll = () => {
    if (!user || user.balance < bet || bet < 10) { 
      playLose(); 
      setMessage('NOT ENOUGH FUNDS!'); 
      setMsgType('lose'); 
      return; 
    }
    if (!selectedBet) { playLose(); setMessage('PICK A BET TYPE FIRST!'); setMsgType('lose'); return; }
    if (isRolling) return;
    
    updateBalance(-bet);
    // Snapshot current bet/selectedBet BEFORE the async animation starts
    betRef.current = bet;
    selectedBetRef.current = selectedBet;
    setShower(null);
    setResultSum(null);
    setMessage('🎲 ROLLING...'); 
    setMsgType('default');
    setIsRolling(true);
    
    playClick();
    stopNoiseRef.current = playSpinNoise();

    const rolls = 15;
    let currentRoll = 0;

    const finalDice1 = Math.floor(Math.random() * 6) + 1;
    const finalDice2 = Math.floor(Math.random() * 6) + 1;
    const sum = finalDice1 + finalDice2;

    const rollInterval = setInterval(() => {
      setDice1(Math.floor(Math.random() * 6) + 1);
      setDice2(Math.floor(Math.random() * 6) + 1);
      currentRoll++;

      if (currentRoll >= rolls) {
        clearInterval(rollInterval);
        // Stop the noise precisely when the dice stop rolling
        if (stopNoiseRef.current) { 
          stopNoiseRef.current(); 
          stopNoiseRef.current = null; 
        }

        setDice1(finalDice1);
        setDice2(finalDice2);
        
        setIsRolling(false);
        setResultSum(sum);

        // Suspense Delay of 0.5 seconds before showing results
        setTimeout(() => {
          checkWin(sum);
        }, 500);
      }
    }, 70);
  };

  const checkWin = (sum: number) => {
    // Use refs to get the values that were active when roll started
    const activeBet = betRef.current;
    const activeSel = selectedBetRef.current;
    let won = false;
    let payoutMult = 0;

    if (sum < 7 && activeSel === 'down') { won = true; payoutMult = 2; } 
    else if (sum > 7 && activeSel === 'up') { won = true; payoutMult = 2; } 
    else if (sum === 7 && activeSel === 'lucky7') { won = true; payoutMult = 5; }

    const selBetInfo = BETS.find(b => b.id === activeSel);

    if (won) {
      const winnings = activeBet * payoutMult;
      updateBalance(winnings);
      setMessage(`🎉 SUM IS ${sum}! ${selBetInfo?.label} WINS!  +$${winnings.toLocaleString()}`);
      setMsgType('win');
      setShower('win');
      playWin?.();
      
      recordGame({
        game: 'Dice Destiny',
        bet: activeBet,
        outcome: 'WIN',
        net: winnings - activeBet,
        aiAdvice: 'Probabilistic Advantage',
        followedAdvice: true
      });
    } else {
      setMessage(`💨 You lost 💔 — sum was ${sum}`);
      setMsgType('lose');
      setShower('lose');
      playLose?.();
      
      recordGame({
        game: 'Dice Destiny',
        bet: activeBet,
        outcome: 'LOSS',
        net: -activeBet,
        aiAdvice: 'Variance Shift',
        followedAdvice: false
      });
    }
  };

  const changeBet = (delta: number) => {
    playBet?.();
    setBet(b => clamp(b + delta));
  };

  const maxBet = Math.max(10, user?.balance || 0);
  const clamp  = (v: number) => Math.max(10, Math.min(maxBet, v));
  const msgColor = msgType === 'win' ? 'var(--neon-gold)' : msgType === 'lose' ? '#ff4466' : 'var(--neon-cyan)';

  const renderDie = (value: number, colorClass: string) => {
    const dots = Array.from({ length: value }).map((_, i) => <div key={i} className={`dot ${colorClass}`} />);
    return <div className={`die-face val-${value}`}>{dots}</div>;
  };

  return (
    <div style={{ padding: '0 32px 60px', maxWidth: '1400px', margin: '0 auto', position: 'relative' }}>
      
      {/* ── High Fidelity Image Background ─ */}
      <div style={{ 
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden', 
        backgroundImage: 'url(/7up_bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        filter: 'brightness(0.5) contrast(1.1)',
      }}>
        <AmbientMotes count={50} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.8) 100%)' }} />
      </div>

      <ParticleShower type={shower} />

      {/* Back to Lobby */}
      <button onClick={onBack} className="neon-button cyan" style={{ marginBottom:'28px', position:'relative', zIndex:50 }}>← LOBBY</button>

      {/* Title */}
      <div style={{ textAlign:'center', marginBottom:'36px', position:'relative', zIndex:1 }}>
        <div className="dancing-font" style={{ color:'var(--neon-cyan)', fontSize:'1.5rem', marginBottom:'6px', letterSpacing:'4px' }}>
          ✦ Above & Below ✦
        </div>
        <h1 className="cinzel-font" style={{
          fontSize:'5.2rem', lineHeight:1, letterSpacing:'6px',
          background:'linear-gradient(135deg, #00f5d4 0%, #3a86ff 40%, #f15bb5 100%)',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
          filter:'drop-shadow(0 0 40px rgba(0,245,212,0.6)) drop-shadow(0 0 80px rgba(58,134,255,0.3))',
        }}>
          DICE DESTINY
        </h1>
      </div>

      <div style={{ display:'flex', gap:'40px', alignItems:'flex-start', flexWrap:'wrap', justifyContent:'center', position:'relative', zIndex:1 }}>

        {/* ── Dice Area ─ */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'24px', flexShrink:0 }}>
          <div className="glass-panel" style={{ padding: '60px', display: 'flex', gap: '30px', perspective: '1000px', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
            
            <motion.div
              animate={{
                rotateX: isRolling ? [0, 360, 720, 1080] : 0,
                rotateY: isRolling ? [0, 360, 720, 1080] : 0,
                rotateZ: isRolling ? [0, 180, 360, 540] : 0,
                scale: isRolling ? [1, 1.2, 1] : 1,
              }}
              transition={{ duration: 0.1, repeat: isRolling ? Infinity : 0, ease: 'linear' }}
              style={{
                width: '120px', height: '120px',
                background: 'linear-gradient(135deg, rgba(200,30,50,0.8), rgba(120,10,20,0.9))',
                borderRadius: '20px',
                border: '2px solid var(--neon-magenta)',
                boxShadow: '0 0 40px rgba(241,91,181,0.6), inset 0 0 20px rgba(255,255,255,0.2)',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                position: 'relative'
              }}
            >
              {renderDie(dice1, 'dot-magenta')}
            </motion.div>

            <motion.div
              animate={{
                rotateX: isRolling ? [0, -360, -720, -1080] : 0,
                rotateY: isRolling ? [0, -360, -720, -1080] : 0,
                rotateZ: isRolling ? [0, -180, -360, -540] : 0,
                scale: isRolling ? [1, 1.2, 1] : 1,
              }}
              transition={{ duration: 0.1, repeat: isRolling ? Infinity : 0, ease: 'linear' }}
              style={{
                width: '120px', height: '120px',
                background: 'linear-gradient(135deg, rgba(30,144,255,0.8), rgba(10,50,120,0.9))',
                borderRadius: '20px',
                border: '2px solid var(--neon-blue)',
                boxShadow: '0 0 40px rgba(58,134,255,0.6), inset 0 0 20px rgba(255,255,255,0.2)',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                position: 'relative'
              }}
            >
              {renderDie(dice2, 'dot-blue')}
            </motion.div>
          </div>

          <AnimatePresence mode="wait">
            {resultSum !== null && !isRolling ? (
              <motion.div initial={{ scale:0.5, opacity:0, y:-20 }} animate={{ scale:1, opacity:1, y:0 }}
                className="glass-panel elevation-2"
                style={{ padding:'18px 60px', textAlign:'center', minWidth:'220px',
                  border: `2px solid ${resultSum === 7 ? 'var(--neon-gold)' : resultSum > 7 ? 'var(--neon-blue)' : 'var(--neon-magenta)'}`,
                  boxShadow: `0 0 50px ${resultSum === 7 ? 'var(--neon-gold)' : resultSum > 7 ? 'var(--neon-blue)' : 'var(--neon-magenta)'}aa` }}>
                <div className="orbitron-font" style={{ color:'rgba(255,255,255,0.45)', fontSize:'0.65rem', letterSpacing:'5px', marginBottom:'4px' }}>TOTAL SUM</div>
                <div className="orbitron-font" style={{ fontSize:'4.5rem', fontWeight:900, color:'#fff',
                  textShadow: `0 0 30px #fff, 0 0 60px ${resultSum === 7 ? 'var(--neon-gold)' : resultSum > 7 ? 'var(--neon-blue)' : 'var(--neon-magenta)'}` }}>
                  {resultSum}
                </div>
              </motion.div>
            ) : (
               <div style={{ height: '140px' }} /> // Spacer to keep layout from shifting
            )}
          </AnimatePresence>
        </div>

        {/* ── Controls Area ─ */}
        <div style={{ flex:1, minWidth:'300px', maxWidth:'440px', display:'flex', flexDirection:'column', gap:'20px' }}>

          <motion.div key={message} initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
            className="glass-panel"
            style={{ padding:'18px 24px', textAlign:'center', border:`1px solid ${msgColor}44`,
              boxShadow:msgType==='win'?'0 0 35px rgba(255,190,11,0.25)':msgType==='lose'?'0 0 20px rgba(255,68,102,0.15)':'none' }}>
            <div className="cinzel-font" style={{ fontSize:'1.15rem', color:msgColor,
              textShadow:msgType==='win'?'0 0 25px var(--neon-gold)':'none', fontWeight: 600 }}>{message}</div>
          </motion.div>

          <div className="glass-panel" style={{ padding:'22px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
              <span className="orbitron-font" style={{ color:'var(--text-secondary)', fontSize:'0.7rem', letterSpacing:'2px' }}>BET SELECTION</span>
              <span className="dancing-font" style={{ color:'var(--neon-gold)', fontSize:'1.1rem' }}>Lucky 7 pays 5×</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px' }}>
              {BETS.map(b => {
                const sel = selectedBet === b.id;
                return (
                  <motion.button key={b.id} whileTap={{ scale:0.93 }}
                    onClick={() => { if (!isRolling) { playClick?.(); setSelectedBet(b.id as any); } }}
                    disabled={isRolling}
                    style={{
                      padding:'16px 6px', borderRadius:'12px', cursor:isRolling?'not-allowed':'pointer',
                      border:`2px solid ${b.accent}`,
                      background:sel ? b.accent : 'rgba(0,0,0,0.6)',
                      color:sel ? '#000' : '#fff',
                      fontFamily:'Cinzel, serif', fontWeight:900, fontSize:'1.1rem',
                      boxShadow:sel?`0 0 28px ${b.accent}bb`:'none',
                      transition:'all 0.16s ease',
                      display: 'flex', flexDirection: 'column', alignItems: 'center'
                    }}>
                    {b.label}
                    <div style={{ fontFamily:'Orbitron,sans-serif', fontSize:'0.55rem', marginTop:'6px', fontWeight: 'bold',
                      color:sel?'rgba(0,0,0,0.8)':'rgba(255,255,255,0.7)', letterSpacing:'1px' }}>
                      {b.desc}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="glass-panel" style={{ padding:'20px 22px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'12px' }}>
              <span className="orbitron-font" style={{ color:'var(--text-secondary)', fontSize:'0.7rem', letterSpacing:'3px' }}>BET AMOUNT</span>
              <span style={{ color:'var(--text-secondary)', fontSize:'0.75rem' }}>Min $10 · Max ${maxBet.toLocaleString()}</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <button onClick={() => changeBet(-50)} className="neon-button"
                disabled={isRolling||bet<=10} style={{ padding:'10px 10px', fontSize:'0.85rem' }}>−50</button>
              <button onClick={() => changeBet(-10)} className="neon-button"
                disabled={isRolling||bet<=10} style={{ padding:'10px 10px', fontSize:'0.85rem' }}>−10</button>
              <div style={{ flex:1, textAlign:'center' }}>
                <div className="orbitron-font neon-text-cyan" style={{ fontSize:'2rem', fontWeight:900 }}>${bet}</div>
                <div style={{ height:'4px', background:'rgba(255,255,255,0.07)', borderRadius:'2px', marginTop:'6px', overflow:'hidden' }}>
                  <motion.div animate={{ width:`${((bet-10)/Math.max(1,maxBet-10))*100}%` }}
                    style={{ height:'100%', borderRadius:'2px',
                      background:'linear-gradient(90deg, var(--neon-cyan), var(--neon-blue))',
                      boxShadow:'0 0 8px var(--neon-cyan)', transition:'width 0.2s' }} />
                </div>
              </div>
              <button onClick={() => changeBet(10)} className="neon-button"
                disabled={isRolling||bet>=maxBet} style={{ padding:'10px 10px', fontSize:'0.85rem' }}>+10</button>
              <button onClick={() => changeBet(50)} className="neon-button"
                disabled={isRolling||bet>=maxBet} style={{ padding:'10px 10px', fontSize:'0.85rem' }}>+50</button>
            </div>
            
            <div style={{ display:'flex', gap:'7px', marginTop:'12px' }}>
              {[10,100,500,1000].filter(v => v <= maxBet).map(v => (
                <button key={v} onClick={() => { if (!isRolling) { playBet?.(); setBet(clamp(v)); } }} disabled={isRolling}
                  className="dancing-font"
                  style={{ flex:1, padding:'8px 4px', borderRadius:'9px', fontSize:'0.9rem', fontWeight:700,
                    border:`1px solid ${bet===v?'var(--neon-cyan)':'rgba(255,255,255,0.1)'}`,
                    background:bet===v?'rgba(0,245,212,0.18)':'rgba(0,0,0,0.45)',
                    color:bet===v?'var(--neon-cyan)':'var(--text-secondary)', cursor:'pointer',
                    transition:'all 0.15s', fontFamily:'Dancing Script, cursive' }}>
                  ${v}
                </button>
              ))}
              <button onClick={() => { if (!isRolling) { playBet?.(); setBet(Math.max(10, maxBet)); } }} disabled={isRolling}
                style={{ flex:1, padding:'8px 4px', borderRadius:'9px', fontSize:'0.85rem', fontWeight:800,
                  border:'1px solid var(--neon-purple)', background:bet===maxBet?'rgba(155,93,229,0.18)':'rgba(0,0,0,0.45)',
                  color:'var(--neon-purple)', cursor:'pointer', fontFamily:'Cinzel,serif', letterSpacing:'1px' }}>
                MAX
              </button>
            </div>
          </div>

          <motion.button whileHover={{ scale:isRolling?1:1.03 }} whileTap={{ scale:0.97 }}
            onClick={handleRoll} disabled={isRolling||!selectedBet}
            className="neon-button cyan"
            style={{ padding:'26px', fontSize:'1.6rem', letterSpacing:'4px',
              fontFamily:'Cinzel, serif',
              opacity:isRolling||!selectedBet?0.45:1,
              boxShadow:!isRolling&&selectedBet
                ?'0 0 50px rgba(0,245,212,0.45), 0 0 90px rgba(0,245,212,0.15)' : 'none' }}>
            {isRolling ? '🎲  ROLLING...' : '🎲  ROLL DICE'}
          </motion.button>
        </div>
      </div>

      <style>{`
        .dot { width: 14px; height: 14px; border-radius: 50%; position: absolute; box-shadow: inset 0 0 5px rgba(0,0,0,0.5); }
        .dot-magenta { background: #fff; box-shadow: 0 0 10px #fff, 0 0 20px var(--neon-magenta); }
        .dot-blue { background: #fff; box-shadow: 0 0 10px #fff, 0 0 20px var(--neon-blue); }
        .die-face { width: 100%; height: 100%; position: relative; }
        .val-1 .dot:nth-child(1) { top: 50%; left: 50%; transform: translate(-50%, -50%); }
        .val-2 .dot:nth-child(1) { top: 25%; left: 25%; transform: translate(-50%, -50%); }
        .val-2 .dot:nth-child(2) { bottom: 25%; right: 25%; transform: translate(50%, 50%); }
        .val-3 .dot:nth-child(1) { top: 25%; left: 25%; transform: translate(-50%, -50%); }
        .val-3 .dot:nth-child(2) { top: 50%; left: 50%; transform: translate(-50%, -50%); }
        .val-3 .dot:nth-child(3) { bottom: 25%; right: 25%; transform: translate(50%, 50%); }
        .val-4 .dot:nth-child(1) { top: 25%; left: 25%; transform: translate(-50%, -50%); }
        .val-4 .dot:nth-child(2) { top: 25%; right: 25%; transform: translate(50%, -50%); }
        .val-4 .dot:nth-child(3) { bottom: 25%; left: 25%; transform: translate(-50%, 50%); }
        .val-4 .dot:nth-child(4) { bottom: 25%; right: 25%; transform: translate(50%, 50%); }
        .val-5 .dot:nth-child(1) { top: 20%; left: 20%; transform: translate(-50%, -50%); }
        .val-5 .dot:nth-child(2) { top: 20%; right: 20%; transform: translate(50%, -50%); }
        .val-5 .dot:nth-child(3) { top: 50%; left: 50%; transform: translate(-50%, -50%); }
        .val-5 .dot:nth-child(4) { bottom: 20%; left: 20%; transform: translate(-50%, 50%); }
        .val-5 .dot:nth-child(5) { bottom: 20%; right: 20%; transform: translate(50%, 50%); }
        .val-6 .dot:nth-child(1) { top: 20%; left: 25%; transform: translate(-50%, -50%); }
        .val-6 .dot:nth-child(2) { top: 50%; left: 25%; transform: translate(-50%, -50%); }
        .val-6 .dot:nth-child(3) { bottom: 20%; left: 25%; transform: translate(-50%, 50%); }
        .val-6 .dot:nth-child(4) { top: 20%; right: 25%; transform: translate(50%, -50%); }
        .val-6 .dot:nth-child(5) { top: 50%; right: 25%; transform: translate(50%, -50%); }
        .val-6 .dot:nth-child(6) { bottom: 20%; right: 25%; transform: translate(50%, 50%); }
      `}</style>

      {/* Instruction Button */}
      <button onClick={() => setShowHelp(true)} className="neon-button"
        style={{ position:'fixed', bottom:'24px', left:'24px', zIndex:50, borderRadius:'50%', 
          width:'50px', height:'50px', display:'flex', alignItems:'center', justifyContent:'center', 
          padding:0, fontSize:'1.4rem', fontFamily:'Cinzel', 
          border:'1px solid var(--neon-cyan)', color:'var(--neon-cyan)',
          boxShadow:'0 0 10px rgba(0,245,212,0.3)' }}>
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
              style={{ position:'relative', padding:'50px 70px', textAlign:'center', border:'2px solid var(--neon-cyan)',
                boxShadow:'0 0 100px rgba(0,245,212,0.4), 0 0 200px rgba(58,134,255,0.2)' }}>
              <button onClick={() => setShowHelp(false)}
                className="neon-text-cyan"
                style={{ position:'absolute', top:'15px', right:'20px', background:'transparent', border:'none',
                  fontSize:'1.8rem', cursor:'pointer', fontFamily:'sans-serif', color:'var(--neon-cyan)' }}>✕</button>
              <div style={{ fontSize:'4rem', marginBottom:'12px' }}>🎲</div>
              <h1 className="cinzel-font neon-text-cyan" style={{ fontSize:'2.8rem', marginBottom:'16px', color:'var(--neon-cyan)' }}>
                DICE DESTINY GUIDE
              </h1>
              <div className="orbitron-font" style={{ color:'var(--text-secondary)', fontSize:'1.1rem', lineHeight: '2.2', textAlign:'left', background:'rgba(0,0,0,0.5)', padding:'30px', borderRadius:'12px' }}>
                <div style={{color:'#fff'}}>1. BET: Select your wager amount and choose a bet type.</div>
                <div style={{color:'#fff'}}>2. 7 DOWN: Win if the sum of two dice is LESS than 7 (2x Payout).</div>
                <div style={{color:'#fff'}}>3. 7 UP: Win if the sum of two dice is MORE than 7 (2x Payout).</div>
                <div style={{color:'#fff'}}>4. LUCKY 7: Win if the sum of two dice is EXACTLY 7 (5x Payout).</div>
                <div style={{color:'var(--neon-cyan)', marginTop:'12px', textAlign:'center', fontWeight:700, textShadow:'0 0 10px rgba(0,245,212,0.5)'}}>
                  PREDICT THE TOTAL AND ROLL FOR GLORY!
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
