import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCasino } from '../context/CasinoContext';
import { playClick, playWin, playLose, playChip, playCardFlip, playCardShuffle } from '../utils/audio';
import { ParticleShower } from '../components/ParticleShower';
import { AmbientMotes } from '../components/AmbientMotes';

/* ═══════════════════════════════════════════════════════════
   TYPES & CONSTANTS
   ═══════════════════════════════════════════════════════════ */
type Card = { suit: string; value: string; numValue: number };
type GameState = 'BETTING' | 'DEALING' | 'PLAYER_TURN' | 'BOTS_TURN' | 'DEALER_TURN' | 'RESULT';
type BotState = { id: string; name: string; avatar: string; color: string; hand: Card[]; status: string; score: number; done: boolean };

const SUITS = ['♠', '♥', '♣', '♦'];
const VALUES = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

const BOTS_CONFIG = [
  { id: 'bot1', name: 'NEONSHARK',  avatar: '🦈', color: '#00f5d4' },
  { id: 'bot2', name: 'CYBERHAND',  avatar: '🤖', color: '#f15bb5' },
  { id: 'bot3', name: 'GLITCHJACK', avatar: '👾', color: '#9b5de5' },
];

/* ═══════════════════════════════════════════════════════════
   UTILITY FUNCTIONS
   ═══════════════════════════════════════════════════════════ */
const getNumValue = (v: string) => ['J','Q','K'].includes(v) ? 10 : v === 'A' ? 11 : parseInt(v);

const createDeck = (): Card[] => {
  const deck = SUITS.flatMap(suit => VALUES.map(value => ({ suit, value, numValue: getNumValue(value) })));
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

const calcHand = (hand: Card[]) => {
  let sum = 0, aces = 0;
  hand.forEach(c => { if (c.value === 'A') aces++; sum += c.numValue; });
  while (sum > 21 && aces-- > 0) sum -= 10;
  return sum;
};

const isRed = (suit: string) => suit === '♥' || suit === '♦';

/* ═══════════════════════════════════════════════════════════
   CARD RENDERING — RICH DESIGN
   ═══════════════════════════════════════════════════════════ */

// Pip layout positions for number cards (normalized 0-1 grid)
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

  // Ace
  if (card.value === 'A') {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 4, left: 6, fontSize: w * 0.16, fontWeight: 900, color: suitColor }}>A</div>
        <div style={{ fontSize: w * 0.55, color: suitColor }}>{card.suit}</div>
        <div style={{ position: 'absolute', bottom: 4, right: 6, fontSize: w * 0.16, fontWeight: 900, color: suitColor, transform: 'rotate(180deg)' }}>A</div>
      </div>
    );
  }

  // Face cards
  if (['J','Q','K'].includes(card.value)) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 3, left: 5, fontSize: w * 0.15, fontWeight: 900, color: suitColor, lineHeight: 1 }}>
          {card.value}<br/><span style={{ fontSize: w * 0.13 }}>{card.suit}</span>
        </div>
        <div style={{ fontSize: w * 0.45, lineHeight: 1 }}>{FACE_ICONS[card.value]}</div>
        <div style={{ fontSize: w * 0.12, color: suitColor, letterSpacing: '1px', fontWeight: 800, marginTop: 2 }}>
          {card.value === 'J' ? 'JACK' : card.value === 'Q' ? 'QUEEN' : 'KING'}
        </div>
        <div style={{ position: 'absolute', bottom: 3, right: 5, fontSize: w * 0.15, fontWeight: 900, color: suitColor, transform: 'rotate(180deg)', lineHeight: 1 }}>
          {card.value}<br/><span style={{ fontSize: w * 0.13 }}>{card.suit}</span>
        </div>
      </div>
    );
  }

  // Number cards — show pips
  const num = parseInt(card.value);
  const positions = PIP_LAYOUTS[num] || [];
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 3, left: 5, fontSize: w * 0.15, fontWeight: 900, color: suitColor, lineHeight: 1 }}>
        {card.value}<br/><span style={{ fontSize: w * 0.13 }}>{card.suit}</span>
      </div>
      {positions.map(([x, y], i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${x * 100}%`, top: `${y * 100}%`,
          transform: 'translate(-50%, -50%)',
          fontSize: pipSize, color: suitColor,
          lineHeight: 1,
        }}>{card.suit}</div>
      ))}
      <div style={{ position: 'absolute', bottom: 3, right: 5, fontSize: w * 0.15, fontWeight: 900, color: suitColor, transform: 'rotate(180deg)', lineHeight: 1 }}>
        {card.value}<br/><span style={{ fontSize: w * 0.13 }}>{card.suit}</span>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   CARD VIEW COMPONENT
   ═══════════════════════════════════════════════════════════ */
const CardView = ({ card, hidden, delay = 0, small = false }: { card: Card; hidden?: boolean; delay?: number; small?: boolean }) => {
  const w = small ? 60 : 80;
  const h = small ? 90 : 120;

  return (
    <motion.div
      initial={{ y: -120, rotateY: 180, opacity: 0, scale: 0.5 }}
      animate={{ y: 0, rotateY: 0, opacity: 1, scale: 1 }}
      transition={{ type: 'spring', bounce: 0.35, delay, duration: 0.6 }}
      style={{
        width: w, height: h, borderRadius: '10px',
        background: hidden
          ? 'linear-gradient(135deg, #0a0028 0%, #1a0055 40%, #0a0028 60%, #2a0077 100%)'
          : 'linear-gradient(180deg, #ffffff 0%, #f5f3f7 100%)',
        border: hidden ? '2px solid rgba(155,93,229,0.6)' : '1px solid rgba(200,200,200,0.5)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        margin: '0 -10px', position: 'relative',
        boxShadow: hidden
          ? '0 8px 25px rgba(155,93,229,0.3), inset 0 0 20px rgba(155,93,229,0.1)'
          : '0 8px 25px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {hidden ? (
        <>
          {/* Card back pattern */}
          <div style={{
            position: 'absolute', inset: 4, borderRadius: '6px',
            border: '1px solid rgba(155,93,229,0.3)',
            background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(155,93,229,0.08) 4px, rgba(155,93,229,0.08) 8px)',
          }} />
          <div style={{
            fontSize: w * 0.3, color: 'rgba(155,93,229,0.5)',
            textShadow: '0 0 10px rgba(155,93,229,0.4)',
          }}>♠</div>
        </>
      ) : (
        <CardFace card={card} w={w} />
      )}
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════
   MAIN BLACKJACK COMPONENT
   ═══════════════════════════════════════════════════════════ */
export const Blackjack = ({ onBack }: { onBack: () => void }) => {
  const { user, updateBalance, recordGame } = useCasino();

  // Game state
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [bots, setBots] = useState<BotState[]>([]);
  const [state, setState] = useState<GameState>('BETTING');
  const [bet, setBet] = useState(100);
  const [message, setMessage] = useState('PLACE YOUR BET');
  const [msgType, setMsgType] = useState<'default'|'win'|'lose'>('default');
  const [shower, setShower] = useState<'win'|'lose'|null>(null);
  const [, setDealIdx] = useState(0);

  // AI Mode
  const [aiMode, setAiMode] = useState(true);
  const [bustRisk, setBustRisk] = useState(0);
  const [aiRec, setAiRec] = useState('—');
  const [showHelp, setShowHelp] = useState(false);

  // Refs for async bot/dealer turns
  const deckRef = useRef<Card[]>([]);
  useEffect(() => { deckRef.current = deck; }, [deck]);

  // Initialize bots
  useEffect(() => {
    setBots(BOTS_CONFIG.map(b => ({
      ...b, hand: [], status: '', score: 0, done: false,
    })));
  }, []);

  // Clear shower
  useEffect(() => {
    if (!shower) return;
    const t = setTimeout(() => setShower(null), 3500);
    return () => clearTimeout(t);
  }, [shower]);

  // AI calculations
  useEffect(() => {
    if (state !== 'PLAYER_TURN' || deck.length === 0) { setAiRec('—'); setBustRisk(0); return; }
    const score = calcHand(playerHand);
    const safe = 21 - score;
    const dangerous = deck.filter(c => !(c.value === 'A') && c.numValue > safe).length;
    const risk = Math.round((dangerous / deck.length) * 100);
    setBustRisk(risk);
    if (score >= 17) setAiRec(risk > 55 ? 'STAND' : 'HIT CAREFULLY');
    else if (risk > 70) setAiRec('STAND');
    else if (risk > 40) setAiRec('CAREFUL');
    else setAiRec('HIT');
  }, [playerHand, deck, state]);

  /* ─── DEALING ANIMATION ─────────────────────── */
  const deal = () => {
    if (!user || user.balance < bet || bet < 10) { setMessage('NOT ENOUGH FUNDS!'); playLose(); return; }
    updateBalance(-bet);
    playClick();
    playCardShuffle();

    const d = createDeck();
    // Deal order: Player, Bot1, Bot2, Bot3, Dealer x2 rounds = 10 cards
    const dealOrder = [
      { to: 'player', card: d[0] },
      { to: 'bot0',   card: d[1] },
      { to: 'bot1',   card: d[2] },
      { to: 'bot2',   card: d[3] },
      { to: 'dealer', card: d[4] },
      { to: 'player', card: d[5] },
      { to: 'bot0',   card: d[6] },
      { to: 'bot1',   card: d[7] },
      { to: 'bot2',   card: d[8] },
      { to: 'dealer', card: d[9] },
    ];

    // Reset state
    setPlayerHand([]);
    setDealerHand([]);
    setBots(prev => prev.map(b => ({ ...b, hand: [], status: '', score: 0, done: false })));
    setDeck(d.slice(10));
    deckRef.current = d.slice(10);
    setState('DEALING');
    setMessage('DEALING...');
    setMsgType('default');
    setShower(null);
    setBustRisk(0);
    setDealIdx(0);

    // Animate dealing one card at a time
    dealOrder.forEach((deal, i) => {
      setTimeout(() => {
        playCardFlip();
        if (deal.to === 'player') {
          setPlayerHand(prev => [...prev, deal.card]);
        } else if (deal.to === 'dealer') {
          setDealerHand(prev => [...prev, deal.card]);
        } else {
          const botIdx = parseInt(deal.to.replace('bot', ''));
          setBots(prev => prev.map((b, bi) =>
            bi === botIdx ? { ...b, hand: [...b.hand, deal.card] } : b
          ));
        }
        setDealIdx(i + 1);

        // After all cards dealt
        if (i === dealOrder.length - 1) {
          setTimeout(() => {
            setState('PLAYER_TURN');
            setMessage('YOUR TURN — HIT or STAND');
          }, 400);
        }
      }, 300 * (i + 1));
    });
  };

  /* ─── PLAYER ACTIONS ────────────────────────── */
  const hit = () => {
    const card = deckRef.current[0];
    const newDeck = deckRef.current.slice(1);
    const hand = [...playerHand, card];
    setPlayerHand(hand);
    setDeck(newDeck);
    deckRef.current = newDeck;
    playCardFlip();

    if (calcHand(hand) > 21) {
      setState('BOTS_TURN');
      setMessage('💥 BUST! Waiting for others...');
      setMsgType('lose');
      // Move to bots after brief pause
      setTimeout(() => runBotsTurn(newDeck), 800);
    }
  };

  const stand = () => {
    playClick();
    setState('BOTS_TURN');
    setMessage('OPPONENTS PLAYING...');
    setMsgType('default');
    setTimeout(() => runBotsTurn(deckRef.current), 600);
  };

  /* ─── BOT TURNS (sequential, animated) ──────── */
  const runBotsTurn = (currentDeck: Card[]) => {
    let dk = [...currentDeck];
    let botsCopy = bots.map(b => ({ ...b }));
    let stepDelay = 0;

    botsCopy.forEach((bot, botIdx) => {
      // Bot plays: hit while score < 17 (with slight randomness)
      const threshold = 17 + Math.floor(Math.random() * 2); // 17 or 18
      let hand = [...bot.hand];
      
      const playStep = () => {
        const score = calcHand(hand);
        if (score < threshold && score <= 21) {
          // Hit
          stepDelay += 700;
          const card = dk[0];
          dk = dk.slice(1);
          hand = [...hand, card];
          setTimeout(() => {
            playCardFlip();
            setBots(prev => prev.map((b, i) =>
              i === botIdx ? { ...b, hand: [...hand], status: 'HIT', score: calcHand(hand) } : b
            ));
          }, stepDelay);
          playStep();
        } else {
          // Stand or bust
          stepDelay += 500;
          const finalScore = calcHand(hand);
          setTimeout(() => {
            setBots(prev => prev.map((b, i) =>
              i === botIdx ? {
                ...b, hand: [...hand], done: true,
                status: finalScore > 21 ? 'BUST!' : `STAND (${finalScore})`,
                score: finalScore,
              } : b
            ));
          }, stepDelay);
        }
      };
      playStep();
    });

    // After all bots, run dealer
    setTimeout(() => {
      setDeck(dk);
      deckRef.current = dk;
      runDealerTurn(dk, botsCopy);
    }, stepDelay + 800);
  };

  /* ─── DEALER TURN ───────────────────────────── */
  const runDealerTurn = (currentDeck: Card[], _finalBots: BotState[]) => {
    setState('DEALER_TURN');
    setMessage('DEALER REVEALS...');

    let dh = [...dealerHand];
    let dk = [...currentDeck];
    let delay = 0;

    // Dealer hits while under 17
    const dealerPlay = () => {
      const score = calcHand(dh);
      if (score < 17) {
        delay += 700;
        const card = dk[0];
        dk = dk.slice(1);
        dh = [...dh, card];
        setTimeout(() => {
          playCardFlip();
          setDealerHand([...dh]);
        }, delay);
        dealerPlay();
      }
    };
    dealerPlay();

    // Resolve after dealer finishes
    setTimeout(() => {
      setDealerHand([...dh]);
      setDeck(dk);
      deckRef.current = dk;
      setTimeout(() => {
        resolveGame(dh, playerHand);
      }, 500);
    }, delay + 1000);
  };

  /* ─── RESOLVE ───────────────────────────────── */
  const resolveGame = (finalDealerHand: Card[], finalPlayerHand: Card[]) => {
    setState('RESULT');
    const dealerScore = calcHand(finalDealerHand);
    const playerScore = calcHand(finalPlayerHand);
    const dealerBusted = dealerScore > 21;
    const playerBusted = playerScore > 21;

    let outcome: 'WIN' | 'LOSS' | 'PUSH' = 'PUSH';
    let net = 0;

    if (playerBusted) {
      outcome = 'LOSS'; net = -bet;
      setMessage('💥 YOU BUSTED — DEALER WINS');
      setMsgType('lose'); setShower('lose'); playLose();
    } else if (dealerBusted) {
      outcome = 'WIN'; net = bet;
      updateBalance(bet * 2);
      setMessage('🎉 DEALER BUSTS — YOU WIN!');
      setMsgType('win'); setShower('win'); playWin();
    } else if (playerScore > dealerScore) {
      outcome = 'WIN'; net = bet;
      updateBalance(bet * 2);
      setMessage(`🎉 YOU WIN! ${playerScore} vs ${dealerScore}`);
      setMsgType('win'); setShower('win'); playWin();
    } else if (dealerScore > playerScore) {
      outcome = 'LOSS'; net = -bet;
      setMessage(`💔 DEALER WINS. ${dealerScore} vs ${playerScore}`);
      setMsgType('lose'); setShower('lose'); playLose();
    } else {
      outcome = 'PUSH'; net = 0;
      updateBalance(bet);
      setMessage(`⚖️ PUSH — Both at ${playerScore}`);
      setMsgType('default');
    }

    // Record bot results too (for flavor)
    setBots(prev => prev.map(b => {
      const bs = calcHand(b.hand);
      const busted = bs > 21;
      let result = '';
      if (busted) result = 'BUST!';
      else if (dealerBusted) result = `WIN (+$${bet})`;
      else if (bs > dealerScore) result = `WIN (+$${bet})`;
      else if (bs < dealerScore) result = 'LOST';
      else result = 'PUSH';
      return { ...b, status: result, score: bs, done: true };
    }));

    recordGame({
      game: 'Blackjack',
      bet,
      outcome,
      net,
      aiAdvice: aiRec,
      followedAdvice: aiMode,
    });
  };

  const reset = () => {
    setPlayerHand([]); setDealerHand([]);
    setBots(prev => prev.map(b => ({ ...b, hand: [], status: '', score: 0, done: false })));
    setState('BETTING'); setMessage('PLACE YOUR BET'); setMsgType('default');
    setDealIdx(0);
  };

  const msgColor = msgType === 'win' ? '#ffbe0b' : msgType === 'lose' ? '#f15bb5' : '#fff';
  const dealerScore = calcHand(dealerHand);
  const playerScore = calcHand(playerHand);
  const showDealerCards = state === 'DEALER_TURN' || state === 'RESULT';

  return (
    <div style={{ padding: '0 20px 60px', maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>

      {/* ── FUTURISTIC BACKGROUND ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(/blackjack_bg.png)',
          backgroundSize: 'cover', backgroundPosition: 'center',
          filter: 'brightness(0.4) saturate(1.3)',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(circle at 50% 40%, rgba(0,245,212,0.08) 0%, transparent 60%)',
        }} />
        <AmbientMotes count={50} primaryColor="var(--neon-cyan)" secondaryColor="var(--neon-gold)" />
      </div>

      <ParticleShower type={shower} />

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button onClick={onBack} className="neon-button cyan" style={{ padding: '10px 20px' }}>← LOBBY</button>
          <h1 className="title-font" style={{ fontSize: '2.5rem', lineHeight: 1, color: '#fff', textShadow: '0 0 30px rgba(0,245,212,0.3)' }}>
            BLACKJACK <span style={{ color: 'var(--neon-cyan)' }}>21</span>
          </h1>
        </div>

        {/* AI MODE TOGGLE */}
        <div
          onClick={() => { setAiMode(!aiMode); playClick(); }}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '10px 20px', borderRadius: '12px', cursor: 'pointer',
            background: aiMode ? 'rgba(0,245,212,0.1)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${aiMode ? 'rgba(0,245,212,0.4)' : 'rgba(255,255,255,0.1)'}`,
            transition: 'all 0.3s',
          }}
        >
          <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '2px' }}>AI COPILOT</span>
          <div style={{
            width: '44px', height: '24px', borderRadius: '12px',
            background: aiMode ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.1)',
            position: 'relative', transition: 'all 0.3s',
            boxShadow: aiMode ? '0 0 12px rgba(0,245,212,0.4)' : 'none',
          }}>
            <motion.div
              animate={{ x: aiMode ? 22 : 2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              style={{
                width: '20px', height: '20px', borderRadius: '50%',
                background: '#fff', position: 'absolute', top: '2px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              }}
            />
          </div>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: aiMode ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.3)', letterSpacing: '1px' }}>
            {aiMode ? 'ON' : 'OFF'}
          </span>
        </div>
      </div>

      {/* ── MAIN TABLE AREA ── */}
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Casino Table — Oval Felt with Neon Edge */}
        <div style={{
          position: 'relative',
          background: 'radial-gradient(ellipse at 50% 45%, rgba(0,90,55,0.5) 0%, rgba(0,50,30,0.65) 40%, rgba(5,5,18,0.95) 100%)',
          borderRadius: '50% / 28%',
          border: '3px solid rgba(0,245,212,0.2)',
          boxShadow: `
            0 0 60px rgba(0,245,212,0.12),
            0 0 120px rgba(0,245,212,0.06),
            inset 0 0 80px rgba(0,0,0,0.6),
            0 0 200px rgba(0,0,0,0.7)
          `,
          padding: '50px 40px',
          minHeight: '650px',
          overflow: 'hidden',
        }}>

          {/* Animated neon edge glow */}
          <div style={{
            position: 'absolute', inset: '-3px',
            borderRadius: '50% / 28%',
            border: '2px solid transparent',
            background: 'linear-gradient(90deg, rgba(0,245,212,0.6), rgba(155,93,229,0.8), rgba(255,190,11,0.8), rgba(0,245,212,0.6))',
            backgroundSize: '400% 100%',
            animation: 'tableGlow 4s linear infinite',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor' as any,
            maskComposite: 'exclude' as any,
            padding: '4px',
            pointerEvents: 'none',
          }} />

          {/* Table felt pattern + circuit lines + hex grid */}
          <div style={{
            position: 'absolute', inset: 0,
            background: `
              radial-gradient(circle at 50% 50%, transparent 20%, rgba(0,0,0,0.5) 100%),
              repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(0,245,212,0.03) 40px, rgba(0,245,212,0.03) 41px),
              repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(155,93,229,0.02) 40px, rgba(155,93,229,0.02) 41px)
            `,
            borderRadius: '50% / 28%',
            pointerEvents: 'none',
          }} />

          {/* Intense Neon glow blobs */}
          <div style={{ position: 'absolute', top: '10%', left: '15%', width: '300px', height: '300px', background: 'rgba(0,245,212,0.08)', filter: 'blur(80px)', borderRadius: '50%', pointerEvents: 'none', mixBlendMode: 'screen' }} />
          <div style={{ position: 'absolute', bottom: '10%', right: '15%', width: '280px', height: '280px', background: 'rgba(155,93,229,0.08)', filter: 'blur(80px)', borderRadius: '50%', pointerEvents: 'none', mixBlendMode: 'screen' }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '350px', height: '350px', background: 'rgba(255,190,11,0.04)', filter: 'blur(100px)', borderRadius: '50%', pointerEvents: 'none', mixBlendMode: 'screen' }} />
          
          {/* Edge glowing rim */}
          <div style={{
            position: 'absolute', inset: '10px',
            borderRadius: '50% / 28%',
            border: '2px solid rgba(0,245,212,0.1)',
            boxShadow: 'inset 0 0 40px rgba(0,245,212,0.05)',
            pointerEvents: 'none',
          }} />
          
          {/* Table branding */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            textAlign: 'center', pointerEvents: 'none', opacity: 0.05,
          }}>
            <div className="title-font" style={{ fontSize: '3rem', letterSpacing: '14px', color: '#fff' }}>BLACKJACK</div>
            <div style={{ fontSize: '1.1rem', letterSpacing: '10px', color: '#fff', marginTop: '4px' }}>NEON VEGAS</div>
          </div>

          {/* ── DEALER SECTION (top) ── */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
              padding: '16px 28px', borderRadius: '16px',
              background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.6rem' }}>🎩</span>
                <span className="title-font" style={{ fontSize: '1rem', letterSpacing: '3px', color: 'var(--neon-gold)' }}>DEALER</span>
                <span className="orbitron-font" style={{ fontSize: '1.2rem', fontWeight: 900, color: showDealerCards ? 'var(--neon-gold)' : 'rgba(255,255,255,0.3)' }}>
                  {showDealerCards ? dealerScore : '?'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', paddingLeft: '10px' }}>
                {dealerHand.map((c, i) => (
                  <CardView key={`d-${i}`} card={c} hidden={i === 1 && !showDealerCards} delay={state === 'DEALING' ? 0 : i * 0.15} />
                ))}
                {dealerHand.length === 0 && (
                  <div style={{ width: 160, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.1)', letterSpacing: '3px', fontSize: '0.8rem' }}>
                    AWAITING DEAL
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── DIVIDER ── */}
          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(0,245,212,0.25), rgba(255,190,11,0.2), transparent)', margin: '8px 40px', boxShadow: '0 0 8px rgba(0,245,212,0.15)' }} />

          {/* ── BOTS ROW (middle) ── */}
          <div style={{
            display: 'flex', justifyContent: 'center', gap: '36px',
            margin: '28px 0', flexWrap: 'wrap',
          }}>
            {bots.map((bot, i) => {
              const score = calcHand(bot.hand);
              const busted = score > 21 && bot.hand.length > 0;
              return (
                <motion.div
                  key={bot.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                    padding: '14px 20px', borderRadius: '14px',
                    background: 'rgba(0,0,0,0.35)',
                    border: `1px solid ${busted ? 'rgba(255,68,102,0.3)' : `${bot.color}22`}`,
                    minWidth: '160px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.3rem' }}>{bot.avatar}</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: bot.color, letterSpacing: '1px' }}>{bot.name}</span>
                    {bot.hand.length > 0 && (
                      <span className="orbitron-font" style={{
                        fontSize: '0.9rem', fontWeight: 900,
                        color: busted ? '#ff4466' : bot.color,
                      }}>{score}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', paddingLeft: '10px' }}>
                    {bot.hand.length > 0
                      ? bot.hand.map((c, ci) => (
                        <CardView key={`b${i}-${ci}`} card={c}
                          hidden={state !== 'RESULT' && state !== 'BOTS_TURN' && state !== 'DEALER_TURN'}
                          small delay={state === 'DEALING' ? 0 : ci * 0.1} />
                      ))
                      : <div style={{ width: 100, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.08)', fontSize: '0.7rem' }}>—</div>
                    }
                  </div>
                  <AnimatePresence>
                    {bot.status && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{
                          fontSize: '0.7rem', fontWeight: 800, letterSpacing: '1px',
                          color: bot.status.includes('BUST') || bot.status.includes('LOST') ? '#ff4466'
                            : bot.status.includes('WIN') ? '#00f5d4' : bot.color,
                          padding: '3px 10px', borderRadius: '6px',
                          background: bot.status.includes('BUST') || bot.status.includes('LOST')
                            ? 'rgba(255,68,102,0.15)' : bot.status.includes('WIN') ? 'rgba(0,245,212,0.15)' : 'rgba(255,255,255,0.05)',
                        }}
                      >
                        {bot.status}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          {/* ── DIVIDER ── */}
          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,190,11,0.25), rgba(0,245,212,0.2), transparent)', margin: '8px 40px', boxShadow: '0 0 8px rgba(255,190,11,0.15)' }} />

          {/* ── PLAYER SECTION (bottom) ── */}
          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <div style={{
              display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
              padding: '20px 32px', borderRadius: '16px',
              background: 'rgba(0,0,0,0.4)',
              border: `1px solid ${playerScore > 21 ? 'rgba(255,68,102,0.4)' : 'rgba(0,245,212,0.15)'}`,
              boxShadow: state === 'PLAYER_TURN' ? '0 0 30px rgba(0,245,212,0.15)' : 'none',
              transition: 'all 0.3s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '1.6rem' }}>🎰</span>
                <span className="title-font" style={{ fontSize: '1.1rem', letterSpacing: '3px', color: '#fff' }}>YOU</span>
                {playerHand.length > 0 && (
                  <motion.span
                    key={playerScore}
                    initial={{ scale: 1.3 }}
                    animate={{ scale: 1 }}
                    className="orbitron-font"
                    style={{
                      fontSize: '1.4rem', fontWeight: 900,
                      color: playerScore > 21 ? '#ff4466' : playerScore === 21 ? '#ffbe0b' : 'var(--neon-cyan)',
                      textShadow: playerScore === 21 ? '0 0 15px #ffbe0b' : 'none',
                    }}
                  >
                    {playerScore}{playerScore === 21 && ' ★'}
                  </motion.span>
                )}
                <span className="orbitron-font" style={{ fontSize: '0.9rem', color: 'var(--neon-gold)' }}>
                  ${user?.balance.toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', paddingLeft: '10px' }}>
                {playerHand.map((c, i) => (
                  <CardView key={`p-${i}`} card={c} delay={state === 'DEALING' ? 0 : i * 0.1} />
                ))}
                {playerHand.length === 0 && (
                  <div style={{ width: 160, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.1)', letterSpacing: '3px', fontSize: '0.8rem' }}>
                    YOUR CARDS
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── MESSAGE BAR ── */}
        <motion.div
          key={message}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="title-font"
          style={{
            textAlign: 'center', margin: '20px 0', fontSize: '1.6rem',
            color: msgColor, height: '44px',
            textShadow: msgType === 'win' ? '0 0 25px #ffbe0b' : msgType === 'lose' ? '0 0 20px #f15bb5' : 'none',
          }}
        >
          {message}
        </motion.div>

        {/* ── CONTROLS + AI HUD ── */}
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* Controls */}
          <div style={{ flex: 1, minWidth: '300px' }}>
            <div className="glass-panel" style={{
              padding: '24px 32px', display: 'flex', justifyContent: 'center',
              alignItems: 'center', gap: '14px', flexWrap: 'wrap',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              {state === 'BETTING' && (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                  {/* Quick Bet Chips Row */}
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {[
                      { amt: 10, color: '#f15bb5' },
                      { amt: 50, color: '#00f5d4' },
                      { amt: 100, color: '#ffbe0b' },
                      { amt: 500, color: '#9b5de5' },
                      { amt: 1000, color: '#f15bb5' },
                      { amt: 5000, color: '#00f5d4' },
                    ].map(({ amt, color }) => (
                      <button
                        key={amt}
                        onClick={() => { playChip(); setBet(b => Math.min(b + amt, user?.balance ?? amt)); }}
                        style={{
                          width: '60px', height: '60px', borderRadius: '50%',
                          background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.1), transparent), rgba(0,0,0,0.6)`,
                          border: `2px dashed ${color}`,
                          boxShadow: `0 0 15px ${color}44, inset 0 0 10px ${color}44`,
                          color: '#fff', fontSize: '0.85rem', fontWeight: 800,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 0 25px ${color}88, inset 0 0 15px ${color}88`; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 0 15px ${color}44, inset 0 0 10px ${color}44`; }}
                      >
                        +{amt >= 1000 ? `${amt/1000}k` : amt}
                      </button>
                    ))}
                    <button
                      onClick={() => { playChip(); setBet(Math.max(10, user?.balance || 10)); }}
                      style={{
                        width: '60px', height: '60px', borderRadius: '50%',
                        background: 'radial-gradient(circle at 30% 30%, rgba(255,190,11,0.2), transparent), rgba(0,0,0,0.6)',
                        border: '2px solid var(--neon-gold)', color: 'var(--neon-gold)',
                        boxShadow: '0 0 20px rgba(255,190,11,0.4), inset 0 0 15px rgba(255,190,11,0.2)',
                        fontSize: '0.8rem', fontWeight: 900, cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)'; e.currentTarget.style.boxShadow = '0 0 30px rgba(255,190,11,0.6), inset 0 0 20px rgba(255,190,11,0.4)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 0 20px rgba(255,190,11,0.4), inset 0 0 15px rgba(255,190,11,0.2)'; }}
                    >
                      MAX
                    </button>
                    <button
                      onClick={() => { playClick(); setBet(10); }}
                      style={{
                        width: '60px', height: '60px', borderRadius: '50%',
                        background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
                        color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', fontWeight: 800,
                        cursor: 'pointer', transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)'; e.currentTarget.style.color = '#fff'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
                    >
                      CLR
                    </button>
                  </div>

                  {/* Current Bet Display */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '24px', width: '100%', justifyContent: 'center' }}>
                     <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(0,245,212,0.3))' }} />
                     <div style={{ padding: '12px 36px', textAlign: 'center', background: 'rgba(0,0,0,0.6)', borderRadius: '16px', border: '1px solid rgba(0,245,212,0.3)', boxShadow: '0 0 30px rgba(0,0,0,0.8), inset 0 0 20px rgba(0,245,212,0.1)' }}>
                       <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', letterSpacing: '4px', marginBottom: '4px' }}>CURRENT BET (MIN: $10)</div>
                       <div className="neon-text-cyan orbitron-font" style={{ fontSize: '2.4rem', fontWeight: 800 }}>${bet.toLocaleString()}</div>
                     </div>
                     <div style={{ flex: 1, height: '1px', background: 'linear-gradient(-90deg, transparent, rgba(0,245,212,0.3))' }} />
                  </div>

                  <button onClick={deal} className="neon-button cyan" style={{ fontSize: '1.4rem', padding: '18px 80px', marginTop: '10px', boxShadow: '0 0 40px rgba(0,245,212,0.4)', borderRadius: '99px' }}>DEAL</button>
                </div>
              )}
              {state === 'PLAYER_TURN' && (
                <>
                  <button onClick={hit} className="neon-button cyan" style={{ padding: '16px 44px', fontSize: '1.2rem' }}>HIT</button>
                  <button onClick={stand} className="neon-button gold" style={{ padding: '16px 44px', fontSize: '1.2rem' }}>STAND</button>
                </>
              )}
              {(state === 'DEALING' || state === 'BOTS_TURN' || state === 'DEALER_TURN') && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'rgba(255,255,255,0.4)', letterSpacing: '3px' }}>
                  <motion.div
                    animate={{ opacity: [1, 0.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--neon-cyan)' }}
                  />
                  {state === 'DEALING' ? 'DEALING CARDS...' : state === 'BOTS_TURN' ? 'OPPONENTS PLAYING...' : 'DEALER REVEALS...'}
                </div>
              )}
              {state === 'RESULT' && (
                <button onClick={() => { playClick(); reset(); }} className="neon-button magenta" style={{ fontSize: '1.2rem', padding: '16px 48px' }}>
                  PLAY AGAIN
                </button>
              )}
            </div>
          </div>

          {/* AI HUD (only when AI mode is ON) */}
          <AnimatePresence>
            {aiMode && (
              <motion.div
                initial={{ opacity: 0, x: 50, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 50, scale: 0.9 }}
                style={{ 
                  position: 'absolute', right: '0px', top: '150px', zIndex: 10,
                  width: '260px'
                }}
              >
                <div className="glass-panel" style={{
                  padding: '24px', border: '1px solid rgba(0,245,212,0.3)',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.8), 0 0 30px rgba(0,245,212,0.15), inset 0 0 20px rgba(0,245,212,0.05)',
                  backdropFilter: 'blur(16px)',
                  background: 'rgba(5,5,15,0.7)',
                }}>
                  <h3 className="title-font" style={{ color: 'var(--neon-cyan)', marginBottom: '6px', fontSize: '0.9rem', letterSpacing: '3px' }}>
                    🧠 AI COPILOT
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', marginBottom: '20px', lineHeight: 1.4 }}>
                    Real-time deck analysis
                  </p>

                  {/* Bust risk */}
                  <div style={{ marginBottom: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>BUST RISK</span>
                      <span style={{ fontWeight: 800, color: bustRisk > 55 ? '#ff4466' : 'var(--neon-cyan)', fontFamily: 'Orbitron' }}>{bustRisk}%</span>
                    </div>
                    <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <motion.div
                        animate={{ width: `${bustRisk}%`, background: bustRisk > 55 ? '#ff4466' : bustRisk > 35 ? '#ffbe0b' : 'var(--neon-cyan)' }}
                        style={{ height: '100%', borderRadius: '4px' }}
                      />
                    </div>
                  </div>

                  {/* Risk segments */}
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '18px' }}>
                    {['LOW','MED','HIGH'].map((lvl, i) => (
                      <div key={lvl} style={{
                        flex: 1, padding: '5px 4px', borderRadius: '6px', textAlign: 'center',
                        fontSize: '0.65rem', fontWeight: 800, letterSpacing: '1px',
                        background: (i === 0 && bustRisk < 35) || (i === 1 && bustRisk >= 35 && bustRisk < 60) || (i === 2 && bustRisk >= 60)
                          ? ['rgba(0,245,212,0.25)','rgba(255,190,11,0.25)','rgba(255,68,102,0.25)'][i]
                          : 'rgba(255,255,255,0.03)',
                        color: ['var(--neon-cyan)','var(--neon-gold)','#ff4466'][i],
                        border: `1px solid ${['rgba(0,245,212,0.15)','rgba(255,190,11,0.15)','rgba(255,68,102,0.15)'][i]}`,
                      }}>
                        {lvl}
                      </div>
                    ))}
                  </div>

                  {/* Recommendation */}
                  <div style={{
                    background: 'rgba(0,0,0,0.5)', borderRadius: '10px', padding: '14px',
                    border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center',
                  }}>
                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', letterSpacing: '2px', marginBottom: '6px' }}>RECOMMEND</div>
                    <motion.div
                      key={aiRec}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="title-font"
                      style={{
                        fontSize: '1.5rem',
                        color: aiRec === 'STAND' ? 'var(--neon-gold)' : aiRec === 'HIT' ? 'var(--neon-cyan)' : 'var(--neon-magenta)',
                        textShadow: '0 0 15px currentColor',
                      }}
                    >
                      {state === 'PLAYER_TURN' ? aiRec : '—'}
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

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
                boxShadow:'0 0 100px rgba(0,245,212,0.4), 0 0 200px rgba(241,91,181,0.2)' }}>
              <button onClick={() => setShowHelp(false)}
                className="neon-text-cyan"
                style={{ position:'absolute', top:'15px', right:'20px', background:'transparent', border:'none',
                  fontSize:'1.8rem', cursor:'pointer', fontFamily:'sans-serif', color:'var(--neon-cyan)' }}>✕</button>
              <div style={{ fontSize:'4rem', marginBottom:'12px' }}>🃏</div>
              <h1 className="cinzel-font neon-text-cyan" style={{ fontSize:'2.8rem', marginBottom:'16px', color:'var(--neon-cyan)' }}>
                BLACKJACK GUIDE
              </h1>
              <div className="orbitron-font" style={{ color:'var(--text-secondary)', fontSize:'1.1rem', lineHeight: '2.2', textAlign:'left', background:'rgba(0,0,0,0.5)', padding:'30px', borderRadius:'12px' }}>
                <div style={{color:'#fff'}}>1. GOAL: Beat the dealer by getting as close to 21 as possible without going over.</div>
                <div style={{color:'#fff'}}>2. HIT: Request another card to increase your score.</div>
                <div style={{color:'#fff'}}>3. STAND: Keep your current total and end your turn.</div>
                <div style={{color:'#fff'}}>4. DEALER RULES: Dealer must draw cards until they reach at least 17.</div>
                <div style={{color:'var(--neon-cyan)', marginTop:'12px', textAlign:'center', fontWeight:700, textShadow:'0 0 10px rgba(0,245,212,0.5)'}}>
                  AI COPILOT: TRACKS YOUR BUST RISK IN REAL-TIME!
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
