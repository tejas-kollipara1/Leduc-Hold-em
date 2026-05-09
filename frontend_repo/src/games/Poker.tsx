import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCasino } from '../context/CasinoContext';
import { createDeck, evaluateHand } from './pokerLogic';
import { playClick, playChip, playWin, playLose, playCardFlip, playCardShuffle } from '../utils/audio';
import { ParticleShower } from '../components/ParticleShower';
import { AmbientMotes } from '../components/AmbientMotes';

/* ═══════════════════════════════════════════════════════════
   TYPES & CONSTANTS
   ═══════════════════════════════════════════════════════════ */
type Card = { suit: string; value: string; numValue: number };
type Phase = 'ANTE' | 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN';

interface PlayerState {
  id: string;
  name: string;
  avatar: string;
  color: string;
  hand: Card[];
  chips: number;
  currentBet: number;
  folded: boolean;
  actionMessage: string;
  isBot: boolean;
}

const BOTS = [
  { id: 'bot1', name: 'NEONSHARK', avatar: '🦈', color: '#00f5d4' },
  { id: 'bot2', name: 'CYBERPRO',  avatar: '🤖', color: '#f15bb5' },
  { id: 'bot3', name: 'GLITCH',    avatar: '👾', color: '#9b5de5' },
  { id: 'bot4', name: 'SYNAPSE',   avatar: '🧠', color: '#ffbe0b' },
  { id: 'bot5', name: 'VOID',      avatar: '🌌', color: '#ff4466' },
];

/* ═══════════════════════════════════════════════════════════
   CARD RENDERING (Shared style with Blackjack)
   ═══════════════════════════════════════════════════════════ */
const isRed = (suit: string) => suit === '♥' || suit === '♦';

const PIP_LAYOUTS: Record<number, [number, number][]> = {
  2:  [[0.5,0.25],[0.5,0.75]],
  3:  [[0.5,0.2],[0.5,0.5],[0.5,0.8]],
  4:  [[0.3,0.25],[0.7,0.25],[0.3,0.75],[0.7,0.75]],
  5:  [[0.3,0.2],[0.7,0.2],[0.5,0.5],[0.3,0.8],[0.7,0.8]],
  6:  [[0.3,0.2],[0.7,0.2],[0.3,0.5],[0.7,0.5],[0.3,0.8],[0.7,0.8]],
  7:  [[0.3,0.2],[0.7,0.2],[0.5,0.35],[0.3,0.5],[0.7,0.5],[0.3,0.8],[0.7,0.8]],
  8:  [[0.3,0.15],[0.7,0.15],[0.3,0.38],[0.7,0.38],[0.5,0.5],[0.3,0.62],[0.7,0.62],[0.5,0.85]],
  9:  [[0.3,0.15],[0.7,0.15],[0.3,0.35],[0.7,0.35],[0.5,0.5],[0.3,0.65],[0.7,0.65],[0.3,0.85],[0.7,0.85]],
  10: [[0.3,0.12],[0.7,0.12],[0.3,0.3],[0.7,0.3],[0.5,0.21],[0.3,0.52],[0.7,0.52],[0.5,0.7],[0.3,0.82],[0.7,0.82]],
};
const FACE_ICONS: Record<string, string> = { 'J': '💂', 'Q': '👸', 'K': '🤴' };

const CardFace = ({ card, w }: { card: Card; w: number }) => {
  const suitColor = isRed(card.suit) ? '#d32f2f' : '#111';
  const pipSize = Math.max(w * 0.18, 10);

  if (card.value === 'A') {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 4, left: 6, fontSize: w * 0.16, fontWeight: 900, color: suitColor }}>A</div>
        <div style={{ fontSize: w * 0.55, color: suitColor }}>{card.suit}</div>
        <div style={{ position: 'absolute', bottom: 4, right: 6, fontSize: w * 0.16, fontWeight: 900, color: suitColor, transform: 'rotate(180deg)' }}>A</div>
      </div>
    );
  }
  if (['J','Q','K'].includes(card.value)) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 3, left: 5, fontSize: w * 0.15, fontWeight: 900, color: suitColor, lineHeight: 1 }}>{card.value}<br/><span style={{ fontSize: w * 0.13 }}>{card.suit}</span></div>
        <div style={{ fontSize: w * 0.45, lineHeight: 1 }}>{FACE_ICONS[card.value]}</div>
        <div style={{ position: 'absolute', bottom: 3, right: 5, fontSize: w * 0.15, fontWeight: 900, color: suitColor, transform: 'rotate(180deg)', lineHeight: 1 }}>{card.value}<br/><span style={{ fontSize: w * 0.13 }}>{card.suit}</span></div>
      </div>
    );
  }
  const num = parseInt(card.value);
  const positions = PIP_LAYOUTS[num] || [];
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 3, left: 5, fontSize: w * 0.15, fontWeight: 900, color: suitColor, lineHeight: 1 }}>{card.value}<br/><span style={{ fontSize: w * 0.13 }}>{card.suit}</span></div>
      {positions.map(([x, y], i) => (
        <div key={i} style={{ position: 'absolute', left: `${x * 100}%`, top: `${y * 100}%`, transform: 'translate(-50%, -50%)', fontSize: pipSize, color: suitColor, lineHeight: 1 }}>{card.suit}</div>
      ))}
      <div style={{ position: 'absolute', bottom: 3, right: 5, fontSize: w * 0.15, fontWeight: 900, color: suitColor, transform: 'rotate(180deg)', lineHeight: 1 }}>{card.value}<br/><span style={{ fontSize: w * 0.13 }}>{card.suit}</span></div>
    </div>
  );
};

const CardView = ({ card, hidden, delay = 0, small = false, highlight = false }: { card: Card; hidden?: boolean; delay?: number; small?: boolean; highlight?: boolean }) => {
  const w = small ? 55 : 75;
  const h = small ? 80 : 110;

  return (
    <motion.div
      initial={{ y: -60, rotateY: 180, opacity: 0, scale: 0.5 }}
      animate={{ y: highlight ? -10 : 0, rotateY: 0, opacity: 1, scale: 1 }}
      transition={{ type: 'spring', bounce: 0.35, delay, duration: 0.6 }}
      style={{
        width: w, height: h, borderRadius: '8px',
        background: hidden
          ? 'linear-gradient(135deg, #0a0028 0%, #00f5d4 50%, #0a0028 100%)' // Cyan tech pattern back
          : 'linear-gradient(180deg, #ffffff 0%, #f5f3f7 100%)',
        border: hidden ? '2px solid rgba(0,245,212,0.6)' : highlight ? '2px solid var(--neon-gold)' : '1px solid rgba(200,200,200,0.5)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        margin: '0 -8px', position: 'relative',
        boxShadow: hidden ? '0 8px 25px rgba(0,245,212,0.3)' : highlight ? '0 0 20px var(--neon-gold)' : '0 8px 20px rgba(0,0,0,0.4)',
        overflow: 'hidden', flexShrink: 0,
      }}
    >
      {hidden ? (
        <>
          <div style={{ position: 'absolute', inset: 4, borderRadius: '4px', border: '1px solid rgba(0,245,212,0.3)', background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,245,212,0.1) 4px, rgba(0,245,212,0.1) 8px)' }} />
          <div style={{ fontSize: w * 0.3, color: 'rgba(0,245,212,0.6)', textShadow: '0 0 10px rgba(0,245,212,0.4)' }}>♦</div>
        </>
      ) : <CardFace card={card} w={w} />}
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
export const Poker = ({ onBack }: { onBack: () => void }) => {
  const { user, updateBalance, recordGame } = useCasino();

  const [deck, setDeck] = useState<Card[]>([]);
  const [community, setCommunity] = useState<Card[]>([]);
  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [phase, setPhase] = useState<Phase>('ANTE');
  const [pot, setPot] = useState(0);
  const [ante, setAnte] = useState(100);
  const [callAmount, setCallAmount] = useState(0);
  const [activeTurn, setActiveTurn] = useState(0);
  const [actionsThisRound, setActionsThisRound] = useState(0);
  const [botBusy, setBotBusy] = useState(false);
  const [message, setMessage] = useState('PLACE ANTE TO PLAY');
  const [shower, setShower] = useState<'win'|'lose'|null>(null);
  
  // AI Copilot Mode
  const [aiMode, setAiMode] = useState(true);
  const [aiProb, setAiProb] = useState(0);
  const [aiAdvice, setAiAdvice] = useState('—');
  const [showHelp, setShowHelp] = useState(false);
  const [handInvestment, setHandInvestment] = useState(0);

  // Initialize
  useEffect(() => {
    if (user && players.length === 0) {
      setPlayers([
        { id: 'player', name: user.username, avatar: '🎩', color: 'var(--neon-gold)', hand: [], chips: user.balance, currentBet: 0, folded: false, actionMessage: '', isBot: false },
        ...BOTS.map(b => ({ ...b, hand: [], chips: 50000 + Math.floor(Math.random()*30000), currentBet: 0, folded: false, actionMessage: '', isBot: true }))
      ]);
    }
  }, [user]);

  // Sync player chips with global balance outside of game ticks
  useEffect(() => {
    if (user && players[0] && phase === 'ANTE') {
      if (players[0].chips !== user.balance) {
        setPlayers(prev => prev.map((p,i) => i===0 ? { ...p, chips: user.balance } : p));
      }
    }
  }, [user, phase]);

  // AI Logic calculation
  useEffect(() => {
    if (phase === 'ANTE' || players.length === 0) { setAiProb(0); setAiAdvice('—'); return; }
    const p1 = players[0];
    if (p1.folded) { setAiProb(0); setAiAdvice('FOLDED'); return; }
    const score = evaluateHand(p1.hand, community).score;
    // Map new thousands-based scoring logic down to a 0-99 percentage
    let prob = 5;
    if (score < 20000) prob = 5 + (score / 14) * 15;
    else if (score < 30000) prob = 30 + ((score - 20200) / 1200) * 30;
    else if (score < 40000) prob = 60 + ((score - 30200) / 1200) * 15;
    else if (score < 60000) prob = 75 + ((score - 40200) / 1200) * 10;
    else prob = 90 + Math.random() * 9;
    
    prob = Math.min(99, Math.max(5, Math.floor(prob)));
    setAiProb(prob);
    
    const cost = callAmount - p1.currentBet;
    if (prob > 75) setAiAdvice('RAISE STRONG');
    else if (prob > 40) setAiAdvice(cost > 0 ? 'CALL' : 'CHECK');
    else if (prob > 20) setAiAdvice(cost > ante * 2 ? 'FOLD' : 'CALL CAREFULLY');
    else setAiAdvice(cost > 0 ? 'FOLD' : 'CHECK');
  }, [players, community, phase, callAmount, ante]);

  // Clear shower
  useEffect(() => {
    if (shower) { const t = setTimeout(() => setShower(null), 3500); return () => clearTimeout(t); }
  }, [shower]);

  // Flow control: Next Phase when all active players have matched callAmount
  useEffect(() => {
    if (phase === 'ANTE' || phase === 'SHOWDOWN') return; 
    const active = players.filter(p => !p.folded);
    if (active.length <= 1) return; // Win by fold, handled elsewhere

    const allCalled = active.every(p => p.currentBet === callAmount);
    if (allCalled && !botBusy && actionsThisRound >= active.length) {
      setBotBusy(true); // lock while advancing
      setTimeout(advancePhase, 800);
    }
  }, [players, callAmount, botBusy, phase, actionsThisRound]);

  // Bot Turn execution
  useEffect(() => {
    if (['ANTE','SHOWDOWN'].includes(phase) || botBusy) return;
    const p = players[activeTurn];
    if (!p) return;
    if (p.folded) { setActiveTurn(i => (i + 1) % players.length); return; }
    if (!p.isBot) return;

    // Check if phase needs to advance (all called and it's our turn)
    const active = players.filter(pl => !pl.folded);
    active.every(pl => pl.currentBet === callAmount);
    
    // We only trigger bot action if phase is ongoing
    setBotBusy(true);
    const delay = 1000 + Math.random() * 800;
    const timer = setTimeout(() => {
      runBot(activeTurn);
    }, delay);
    return () => clearTimeout(timer);
  }, [activeTurn, phase]);


  const runBot = (idx: number) => {
    const p = players[idx];
    const score = evaluateHand(p.hand, community).score;
    const cost  = callAmount - p.currentBet;
    let action: 'CALL'|'FOLD'|'RAISE' = 'CALL';
    
    // Aggressive AI
    const hasBetHeavily = p.currentBet > ante * 3; // Prevent infinite re-raise loops
    
    if (phase === 'PREFLOP' && cost <= 0) action = 'CALL';
    else if (score < 15 && cost > 0 && Math.random() > 0.85) action = 'FOLD'; // rarely fold early
    else if (score >= 200 && !hasBetHeavily && Math.random() > 0.5) action = 'RAISE'; 
    else if (score > 15 && !hasBetHeavily && Math.random() > 0.8) action = 'RAISE'; // occasional bluff
    else action = (cost > p.chips * 0.7) ? 'FOLD' : 'CALL'; // Default fallback

    if (action === 'FOLD') {
      setPlayers(prev => prev.map((pl, i) => i === idx ? { ...pl, folded: true, actionMessage: 'FOLDS' } : pl));
      playClick();
    } else if (action === 'RAISE') {
      const raiseAmt = cost + ante * 2;
      setPlayers(prev => prev.map((pl, i) => i === idx ? { ...pl, chips: pl.chips - raiseAmt, currentBet: pl.currentBet + raiseAmt, actionMessage: `RAISES $${raiseAmt}` } : pl));
      setPot(prev => prev + raiseAmt);
      setCallAmount(p.currentBet + raiseAmt);
      playChip();
    } else {
      if (cost > 0) {
        setPlayers(prev => prev.map((pl, i) => i === idx ? { ...pl, chips: pl.chips - cost, currentBet: callAmount, actionMessage: 'CALLS' } : pl));
        setPot(prev => prev + cost);
        playChip();
      } else {
        setPlayers(prev => prev.map((pl, i) => i === idx ? { ...pl, actionMessage: 'CHECKS' } : pl));
        playClick();
      }
    }
    
    // Check remaining
    setTimeout(() => {
      setPlayers(prev => {
        const active = prev.filter(_pl => !_pl.folded);
        if (active.length === 1) {
          setTimeout(() => {
            if (!active[0].isBot) {
              updateBalance(pot);
              setMessage(`🎉 OPPONENTS FOLDED. YOU WIN $${pot}!`);
              setPhase('SHOWDOWN'); setShower('win'); playWin();
              recordGame({ game:'Poker', bet: handInvestment, outcome: 'WIN', net: pot-handInvestment, aiAdvice, followedAdvice: aiMode });
            } else {
              setMessage(`${active[0].name} WINS $${pot} BY FOLD!`);
              setPhase('SHOWDOWN'); playLose();
              recordGame({ game:'Poker', bet: handInvestment, outcome: 'LOSS', net: -handInvestment, aiAdvice, followedAdvice: aiMode });
            }
          }, 500); 
        }
        return prev;
      });
      setActionsThisRound(a => a + 1);
      setActiveTurn(i => (i + 1) % players.length);
      setBotBusy(false);
    }, 400);
  };

  /* ─── Dealing & Advancing Phases ─── */
  const advancePhase = () => {
    // Reset bets round
    setPlayers(prev => prev.map(p => ({ ...p, currentBet: 0, actionMessage: '' })));
    setCallAmount(0);
    setActionsThisRound(0); // reset
    setActiveTurn(0); // Player acts first on flop/turn/river
    setBotBusy(false);

    let addedCards = 0;
    if (phase === 'PREFLOP') { setPhase('FLOP'); addedCards = 3; setMessage('THE FLOP'); }
    else if (phase === 'FLOP') { setPhase('TURN'); addedCards = 1; setMessage('THE TURN'); }
    else if (phase === 'TURN') { setPhase('RIVER'); addedCards = 1; setMessage('THE RIVER'); }
    else if (phase === 'RIVER') { 
      setTimeout(() => {
        resolveShowdown(); 
      }, 500);
      return; 
    }

    const newCards = deck.slice(0, addedCards);
    setDeck(deck.slice(addedCards));
    
    // Deal animation
    playCardShuffle();
    newCards.forEach((c, i) => {
      setTimeout(() => {
        playCardFlip();
        setCommunity(prev => [...prev, c]);
      }, i * 300);
    });
  };

  const deal = () => {
    if (!user || user.balance < ante || ante < 10) { setMessage('NOT ENOUGH FUNDS!'); playLose(); return; }
    playClick(); playCardShuffle(); updateBalance(-ante);

    const d = createDeck();
    let ci = 0;
    
    // Animate hole cards sequentially
    const newPlayers = players.map(p => ({ ...p, hand: [], folded: false, currentBet: ante, actionMessage: 'ANTE IN', chips: p.chips - ante }));
    setPlayers(newPlayers);
    setPot(ante * newPlayers.length);
    setCallAmount(ante);
    setHandInvestment(ante);
    setCommunity([]);
    setPhase('PREFLOP');
    setMessage('DEALING...');
    setShower(null);
    setActionsThisRound(0); // reset
    setBotBusy(true); // lock bots from acting while getting cards
    setActiveTurn(0); // Player acts first pre flop
    
    // Deal 2 cards to all 6 players = 12 cards total.
    for (let c = 0; c < 2; c++) {
      for (let p = 0; p < players.length; p++) {
        // start deal from player
        const targetP = p;
        const cardIndex = ci++;
        setTimeout(() => {
           playCardFlip();
           setPlayers(prev => prev.map((pl, i) => i === targetP ? { ...pl, hand: [...pl.hand, d[cardIndex]] } : pl));
        }, (c * players.length + p) * 150);
      }
    }
    
    setDeck(d.slice(ci));
    setTimeout(() => { 
        setBotBusy(false); 
        setMessage('YOUR TURN');
    }, 12 * 150 + 400);
  };

  const playerAction = (act: 'FOLD'|'CALL'|'RAISE') => {
    if (!user || activeTurn !== 0) return;
    const p = players[0];
    const cost = callAmount - p.currentBet;
    
    if (act === 'FOLD') {
      playClick();
      setPlayers(prev => prev.map((pl, i) => i === 0 ? { ...pl, folded: true, actionMessage: 'FOLDED' } : pl));
      setMessage('YOU FOLDED.');
      
      // If we fold and only 1 bot is left, they win.
      const remainingActive = players.filter((pl, i) => i !== 0 && !pl.folded);
      if (remainingActive.length === 1) {
          setTimeout(() => {
            setMessage(`${remainingActive[0].name} WINS $${pot} BY FOLD!`);
            setPhase('SHOWDOWN'); playLose();
            recordGame({ game:'Poker', bet: handInvestment, outcome: 'LOSS', net: -handInvestment, aiAdvice, followedAdvice: aiMode });
          }, 500);
      }
    } else if (act === 'RAISE') {
      const raise = cost + ante * 2;
      if (user.balance < raise) {
        setMessage('NOT ENOUGH FUNDS TO RAISE!');
        setShower('lose');
        playLose();
        return;
      }
      playChip(); updateBalance(-raise);
      setHandInvestment(prev => prev + raise);
      setPlayers(prev => prev.map((pl, i) => i === 0 ? { ...pl, chips: pl.chips - raise, currentBet: pl.currentBet + raise, actionMessage: `RAISES $${raise}` } : pl));
      setPot(prev => prev + raise);
      setCallAmount(p.currentBet + raise);
    } else {
      if (cost > 0) {
        if (user.balance < cost) {
          setMessage('NOT ENOUGH FUNDS TO CALL!');
          setShower('lose');
          playLose();
          return;
        }
        playChip(); updateBalance(-cost);
        setHandInvestment(prev => prev + cost);
        setPlayers(prev => prev.map((pl, i) => i === 0 ? { ...pl, chips: pl.chips - cost, currentBet: callAmount, actionMessage: 'CALLS' } : pl));
        setPot(prev => prev + cost);
      } else {
        playClick();
        setPlayers(prev => prev.map((pl, i) => i === 0 ? { ...pl, actionMessage: 'CHECKS' } : pl));
      }
    }
    setActionsThisRound(a => a + 1);
    setActiveTurn( (activeTurn + 1) % players.length );
    
    
    // Auto-advance is now robustly handled by the useEffect watching actionsThisRound
  };

  const resolveShowdown = () => {
    setPhase('SHOWDOWN');
    const active = players.filter(p => !p.folded);
    let best = active[0];
    let bestScore = -1;
    let evalMessage = '';

    active.forEach(p => {
      const res = evaluateHand(p.hand, community);
      if (res.score > bestScore) {
        bestScore = res.score;
        best = p;
        evalMessage = res.name;
      }
    });

    if (best.id === 'player') {
      updateBalance(pot);
      setMessage(`🎉 YOU WIN $${pot} WITH ${evalMessage.toUpperCase()}`);
      setShower('win'); playWin();
      recordGame({ game:'Poker', bet: handInvestment, outcome: 'WIN', net: pot-handInvestment, aiAdvice, followedAdvice: aiMode });
    } else {
      setMessage(`💔 ${best.name} WINS WITH ${evalMessage.toUpperCase()}`);
      setShower('lose'); playLose();
      recordGame({ game:'Poker', bet: handInvestment, outcome: 'LOSS', net: -handInvestment, aiAdvice, followedAdvice: aiMode });
    }
    // ensure all player hands are revealed by setting dummy action message for active players
    setPlayers(prev => prev.map(pl => !pl.folded ? { ...pl, actionMessage: evaluateHand(pl.hand, community).name } : pl));
  };


  return (
    <div style={{ padding: '0 20px 60px', maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
      {/* ── FUTURISTIC BACKGROUND ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/poker_bg.png)', backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.3) saturate(1.4)' }} />
        <AmbientMotes count={40} primaryColor="var(--neon-purple)" secondaryColor="var(--neon-cyan)" />
      </div>

      <ParticleShower type={shower} />

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button onClick={onBack} className="neon-button magenta" style={{ padding: '10px 20px' }}>← LOBBY</button>
          <h1 className="title-font" style={{ fontSize: '2.5rem', lineHeight: 1, color: '#fff', textShadow: '0 0 30px rgba(155,93,229,0.5)' }}>
            POKER <span style={{ color: 'var(--neon-magenta)' }}>TEXAS HOLD'EM</span>
          </h1>
        </div>

        {/* AI MODE TOGGLE */}
        <div onClick={() => { setAiMode(!aiMode); playClick(); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', background: aiMode ? 'rgba(155,93,229,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${aiMode ? 'var(--neon-purple)' : 'rgba(255,255,255,0.1)'}`, transition: 'all 0.3s' }}>
          <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '2px' }}>AI COPILOT</span>
          <div style={{ width: '44px', height: '24px', borderRadius: '12px', background: aiMode ? 'var(--neon-purple)' : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'all 0.3s', boxShadow: aiMode ? '0 0 12px rgba(155,93,229,0.4)' : 'none' }}>
            <motion.div animate={{ x: aiMode ? 22 : 2 }} transition={{ type: 'spring' }} style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px' }} />
          </div>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: aiMode ? 'var(--neon-purple)' : 'rgba(255,255,255,0.3)', letterSpacing: '1px' }}>{aiMode ? 'ON' : 'OFF'}</span>
        </div>
      </div>

      {/* ── AI HUD (Absolute right) ── */}
      <AnimatePresence>
        {aiMode && (
          <motion.div initial={{ opacity: 0, x: 50, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 50, scale: 0.9 }}
            style={{ position: 'absolute', right: '0px', bottom: '150px', zIndex: 10, width: '260px' }}>
            <div className="glass-panel" style={{ padding: '24px', border: '1px solid var(--neon-purple)', boxShadow: '0 10px 40px rgba(0,0,0,0.8), 0 0 30px rgba(155,93,229,0.15)', backdropFilter: 'blur(16px)', background: 'rgba(5,5,15,0.7)' }}>
              <h3 className="title-font" style={{ color: 'var(--neon-magenta)', marginBottom: '6px', fontSize: '0.9rem', letterSpacing: '3px' }}>🧠 AI COPILOT</h3>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', marginBottom: '20px' }}>Texas Hold'em Analysis</p>
              
              <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>WIN PROB.</span>
                  <span style={{ fontWeight: 800, color: aiProb > 50 ? 'var(--neon-cyan)' : 'var(--neon-gold)' }}>{aiProb}%</span>
                </div>
                <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <motion.div animate={{ width: `${aiProb}%`, background: aiProb > 50 ? '#00f5d4' : aiProb > 25 ? '#ffbe0b' : '#ff4466' }} style={{ height: '100%', borderRadius: '4px' }} />
                </div>
              </div>
              
              <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '10px', padding: '14px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', letterSpacing: '2px', marginBottom: '6px' }}>SUGGESTED</div>
                <motion.div key={aiAdvice} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="title-font" style={{ fontSize: '1.2rem', color: aiAdvice.includes('FOLD') ? '#ff4466' : 'var(--neon-cyan)', textShadow: '0 0 10px currentColor' }}>
                  {phase === 'ANTE' || phase === 'SHOWDOWN' ? '—' : aiAdvice}
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Casino Table — Cyan/Purple Hexagon */}
        <div style={{
          position: 'relative',
          background: 'radial-gradient(ellipse at 50% 50%, rgba(30,10,50,0.7) 0%, rgba(10,5,30,0.8) 50%, rgba(5,5,15,0.95) 100%)',
          borderRadius: '25% 25% 35% 35%', // slight hexagonal taper
          border: '3px solid rgba(155,93,229,0.3)',
          boxShadow: '0 0 60px rgba(155,93,229,0.1), inset 0 0 80px rgba(0,0,0,0.8), 0 0 200px rgba(0,0,0,0.9)',
          padding: '40px 30px', minHeight: '650px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
        }}>
           {/* Animated Edge */}
           <div style={{ position: 'absolute', inset: '-3px', borderRadius: 'inherit', border: '2px solid transparent', background: 'linear-gradient(90deg, #9b5de5, #00f5d4, #f15bb5, #9b5de5)', backgroundSize: '400% 100%', animation: 'tableGlow 5s linear infinite', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor' as any, padding: '4px', pointerEvents: 'none' }} />
           
           {/* Grid Pattern */}
           <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(60deg, transparent, transparent 30px, rgba(155,93,229,0.02) 30px, rgba(155,93,229,0.02) 32px), repeating-linear-gradient(-60deg, transparent, transparent 30px, rgba(0,245,212,0.02) 30px, rgba(0,245,212,0.02) 32px)', borderRadius: 'inherit', pointerEvents: 'none' }} />
           
           <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', opacity: 0.05, pointerEvents: 'none' }}>
             <div className="title-font" style={{ fontSize: '4rem', letterSpacing: '10px' }}>POKER</div>
           </div>

           {/* ── BOTS (Top Row) ── */}
           <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '0 20px', marginTop: '10px' }}>
             {[players[2], players[3], players[4]].map((p, idx) => {
               if (!p) return null;
               const pIndex = idx + 2;
               const isActive = activeTurn === pIndex && phase !== 'SHOWDOWN' && phase !== 'ANTE';
               return (
                 <div key={p.id} style={{
                   display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                   padding: '12px 18px', borderRadius: '16px', background: 'rgba(0,0,0,0.5)',
                   border: `1px solid ${isActive ? p.color : 'rgba(255,255,255,0.05)'}`,
                   boxShadow: isActive ? `0 0 20px ${p.color}44` : 'none',
                   opacity: p.folded ? 0.3 : 1, transition: 'all 0.3s', width: '130px', zIndex: 3
                 }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                     <span style={{ fontSize: '1.4rem' }}>{p.avatar}</span>
                     <span style={{ color: p.color, fontSize: '0.8rem', fontWeight: 800 }}>{p.name}</span>
                   </div>
                   {p.actionMessage && <span style={{ color: p.folded ? '#ff4466' : '#fff', fontSize: '0.65rem', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{p.actionMessage}</span>}
                   <div className="orbitron-font" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>${p.chips.toLocaleString()}</div>
                   <div style={{ display: 'flex' }}>
                     {p.hand.length > 0 ? p.hand.map((c, ci) => <CardView key={ci} card={c} small hidden={phase !== 'SHOWDOWN'} />) : <div style={{ width: 80, height: 60 }} />}
                   </div>
                 </div>
               )
             })}
           </div>

           {/* ── MIDDLE TIER (Community + Side Bots) ── */}
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', zIndex: 2, padding: '0 10px' }}>
             {/* Left Bot */}
             {players[1] && (() => {
               const p = players[1];
               const isActive = activeTurn === 1 && phase !== 'SHOWDOWN' && phase !== 'ANTE';
               return (
                 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '12px 18px', borderRadius: '16px', background: 'rgba(0,0,0,0.5)', border: `1px solid ${isActive ? p.color : 'rgba(255,255,255,0.05)'}`, boxShadow: isActive ? `0 0 20px ${p.color}44` : 'none', opacity: p.folded ? 0.3 : 1, transition: 'all 0.3s', width: '130px' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ fontSize: '1.4rem' }}>{p.avatar}</span><span style={{ color: p.color, fontSize: '0.8rem', fontWeight: 800 }}>{p.name}</span></div>
                   {p.actionMessage && <span style={{ color: p.folded ? '#ff4466' : '#fff', fontSize: '0.65rem', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{p.actionMessage}</span>}
                   <div className="orbitron-font" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>${p.chips.toLocaleString()}</div>
                   <div style={{ display: 'flex' }}>{p.hand.length > 0 ? p.hand.map((c, ci) => <CardView key={ci} card={c} small hidden={phase !== 'SHOWDOWN'} />) : <div style={{ width: 80, height: 60 }} />}</div>
                 </div>
               );
             })()}

             <div style={{ textAlign: 'center' }}>
               <div style={{ marginBottom: '16px' }}>
                 <div style={{ color: 'var(--neon-magenta)', fontSize: '0.75rem', letterSpacing: '4px' }}>TOTAL POT</div>
                 <div className="orbitron-font" style={{ fontSize: '2.5rem', fontWeight: 900, color: '#fff', textShadow: '0 0 20px rgba(255,255,255,0.4)' }}>
                   ${pot.toLocaleString()}
                 </div>
               </div>
               <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', minHeight: '120px' }}>
                  {community.map((c, i) => <CardView key={`com-${i}`} card={c} />)}
                  {phase !== 'ANTE' && community.length === 0 && <div style={{ width: '100%', color: 'rgba(255,255,255,0.2)', letterSpacing: '3px', marginTop: '40px' }}>AWAITING FLOP...</div>}
               </div>
             </div>

             {/* Right Bot */}
             {players[5] && (() => {
               const p = players[5];
               const isActive = activeTurn === 5 && phase !== 'SHOWDOWN' && phase !== 'ANTE';
               return (
                 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '12px 18px', borderRadius: '16px', background: 'rgba(0,0,0,0.5)', border: `1px solid ${isActive ? p.color : 'rgba(255,255,255,0.05)'}`, boxShadow: isActive ? `0 0 20px ${p.color}44` : 'none', opacity: p.folded ? 0.3 : 1, transition: 'all 0.3s', width: '130px' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ fontSize: '1.4rem' }}>{p.avatar}</span><span style={{ color: p.color, fontSize: '0.8rem', fontWeight: 800 }}>{p.name}</span></div>
                   {p.actionMessage && <span style={{ color: p.folded ? '#ff4466' : '#fff', fontSize: '0.65rem', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{p.actionMessage}</span>}
                   <div className="orbitron-font" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>${p.chips.toLocaleString()}</div>
                   <div style={{ display: 'flex' }}>{p.hand.length > 0 ? p.hand.map((c, ci) => <CardView key={ci} card={c} small hidden={phase !== 'SHOWDOWN'} />) : <div style={{ width: 80, height: 60 }} />}</div>
                 </div>
               );
             })()}
           </div>

           {/* ── PLAYER (Bottom) ── */}
           {players[0] && (
             <div style={{ alignSelf: 'center', marginBottom: '10px' }}>
               <div style={{
                 display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                 padding: '20px 30px', borderRadius: '16px', background: 'rgba(0,0,0,0.6)',
                 border: `1px solid ${activeTurn === 0 && !players[0].folded && phase !== 'ANTE' ? 'var(--neon-gold)' : 'rgba(255,255,255,0.1)'}`,
                 boxShadow: activeTurn === 0 && !players[0].folded && phase !== 'ANTE' ? '0 0 30px rgba(255,190,11,0.2)' : 'none',
                 opacity: players[0].folded ? 0.4 : 1
               }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                   <span style={{ fontSize: '1.6rem' }}>{players[0].avatar}</span>
                   <span className="title-font" style={{ color: 'var(--neon-gold)', letterSpacing: '2px' }}>YOU</span>
                   <span className="orbitron-font" style={{ color: '#fff' }}>${players[0].chips.toLocaleString()}</span>
                   {players[0].actionMessage && <span style={{ color: '#00f5d4', fontSize: '0.75rem', padding: '4px 8px', background: 'rgba(0,245,212,0.1)', borderRadius: '6px' }}>{players[0].actionMessage}</span>}
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'center' }}>
                   {players[0].hand.length > 0 ? (
                     players[0].hand.map((c, i) => <CardView key={i} card={c} highlight={activeTurn === 0 && phase !== 'ANTE'} />)
                   ) : <div style={{ width: 120, height: 80, color: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: '2px' }}>YOUR HAND</div>}
                 </div>
               </div>
             </div>
           )}
        </div>

        <motion.div key={message} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="title-font" style={{ textAlign: 'center', margin: '20px 0', fontSize: '1.6rem', color: '#fff', textShadow: '0 0 15px rgba(255,255,255,0.5)' }}>
          {message}
        </motion.div>

        {/* ── CONTROLS ── */}
        <div style={{ flex: 1, minWidth: '300px' }}>
            <div className="glass-panel" style={{ padding: '24px 32px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '14px', flexWrap: 'wrap', border: '1px solid rgba(255,255,255,0.06)' }}>
              
              {phase === 'ANTE' && (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {[{amt:10, c:'#f15bb5'}, {amt:50, c:'#00f5d4'}, {amt:100, c:'#ffbe0b'}, {amt:500, c:'#9b5de5'}, {amt:1000, c:'#f15bb5'}, {amt:5000, c:'#00f5d4'}].map(({amt, c}) => (
                      <button key={amt} onClick={() => { playChip(); setAnte(a => Math.min(a + amt, user?.balance || a + amt)); }}
                        style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: `2px dashed ${c}`, color: '#fff', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer' }}>
                        +{amt >= 1000 ? `${amt/1000}k` : amt}
                      </button>
                    ))}
                    <button onClick={() => { playChip(); setAnte(Math.max(10, user?.balance || 10)); }} style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: '2px solid var(--neon-gold)', color: 'var(--neon-gold)', fontSize: '0.8rem', fontWeight: 900, cursor: 'pointer' }}>MAX</button>
                    <button onClick={() => { playClick(); setAnte(10); }} style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}>CLR</button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '24px', width: '100%', justifyContent: 'center' }}>
                     <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(155,93,229,0.3))' }} />
                     <div style={{ padding: '12px 36px', textAlign: 'center', background: 'rgba(0,0,0,0.6)', borderRadius: '16px', border: '1px solid rgba(155,93,229,0.3)', boxShadow: 'inset 0 0 20px rgba(155,93,229,0.1)' }}>
                       <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', letterSpacing: '4px' }}>ANTE (MIN: $10)</div>
                       <div className="orbitron-font" style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--neon-magenta)' }}>${ante.toLocaleString()}</div>
                     </div>
                     <div style={{ flex: 1, height: '1px', background: 'linear-gradient(-90deg, transparent, rgba(155,93,229,0.3))' }} />
                  </div>
                  <button onClick={deal} className="neon-button magenta" style={{ fontSize: '1.4rem', padding: '18px 80px', marginTop: '10px', borderRadius: '99px' }}>DEAL CARDS</button>
                </div>
              )}

              {phase !== 'ANTE' && phase !== 'SHOWDOWN' && activeTurn === 0 && !players[0].folded && (
                 <div style={{ display: 'flex', gap: '20px' }}>
                   <button onClick={() => playerAction('FOLD')} className="neon-button" style={{ padding: '14px 40px', fontSize: '1.2rem', color: '#ff4466', borderColor: '#ff4466' }}>FOLD</button>
                   <button onClick={() => playerAction('CALL')} className="neon-button cyan" style={{ padding: '14px 40px', fontSize: '1.2rem' }}>
                     {callAmount - players[0].currentBet > 0 ? `CALL $${callAmount - players[0].currentBet}` : 'CHECK'}
                   </button>
                   <button onClick={() => playerAction('RAISE')} className="neon-button gold" style={{ padding: '14px 40px', fontSize: '1.2rem' }}>RAISE TO ${callAmount + ante * 2}</button>
                 </div>
              )}

              {phase !== 'ANTE' && phase !== 'SHOWDOWN' && (activeTurn !== 0 || players[0].folded) && (
                 <div style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '3px' }}>WAITING FOR OPPONENTS...</div>
              )}

              {phase === 'SHOWDOWN' && (
                 <button onClick={() => { playClick(); setPhase('ANTE'); setCommunity([]); setPot(0); setPlayers(players.map(p => ({...p, hand:[], actionMessage:''}))); }} className="neon-button magenta" style={{ padding: '16px 50px', fontSize: '1.2rem' }}>PLAY NEXT ROUND</button>
              )}
            </div>
        </div>
      </div>

      {/* Instruction Button */}
      <button onClick={() => setShowHelp(true)} className="neon-button"
        style={{ position:'fixed', bottom:'24px', left:'24px', zIndex:50, borderRadius:'50%', 
          width:'50px', height:'50px', display:'flex', alignItems:'center', justifyContent:'center', 
          padding:0, fontSize:'1.4rem', fontFamily:'Cinzel', 
          border:'1px solid var(--neon-purple)', color:'var(--neon-purple)',
          boxShadow:'0 0 10px rgba(155,93,229,0.3)' }}>
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
              style={{ position:'relative', padding:'50px 70px', textAlign:'center', border:'2px solid var(--neon-purple)',
                boxShadow:'0 0 100px rgba(155,93,229,0.4), 0 0 200px rgba(241,91,181,0.2)' }}>
              <button onClick={() => setShowHelp(false)}
                className="neon-text-purple"
                style={{ position:'absolute', top:'15px', right:'20px', background:'transparent', border:'none',
                  fontSize:'1.8rem', cursor:'pointer', fontFamily:'sans-serif', color:'var(--neon-purple)' }}>✕</button>
              <div style={{ fontSize:'4rem', marginBottom:'12px' }}>🃏</div>
              <h1 className="cinzel-font neon-text-purple" style={{ fontSize:'2.8rem', marginBottom:'16px', color:'var(--neon-purple)' }}>
                HOW TO PLAY POKER
              </h1>
              <div className="orbitron-font" style={{ color:'var(--text-secondary)', fontSize:'1.1rem', lineHeight: '2.2', textAlign:'left', background:'rgba(0,0,0,0.5)', padding:'30px', borderRadius:'12px' }}>
                <div style={{color:'#fff'}}>1. ANTE UP: Place your starting bet to enter the round.</div>
                <div style={{color:'#fff'}}>2. HOLE CARDS: You receive 2 private cards.</div>
                <div style={{color:'#fff'}}>3. THE BOARD: 5 community cards are dealt (Flop, Turn, River).</div>
                <div style={{color:'#fff'}}>4. ACTION: Choose to FOLD, CALL, or RAISE each round.</div>
                <div style={{color:'var(--neon-purple)', marginTop:'12px', textAlign:'center', fontWeight:700, textShadow:'0 0 10px rgba(155,93,229,0.5)'}}>
                  AI COPILOT: WATCH THE HUD FOR WIN PROBABILITY!
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
