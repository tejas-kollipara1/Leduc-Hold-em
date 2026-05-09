import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCasino } from '../context/CasinoContext';
import { ParticleShower } from '../components/ParticleShower';
import { AmbientMotes } from '../components/AmbientMotes';

// Helper to determine text colour of suit
const isRed = (suit: string) => suit === '♥' || suit === '♦';

// Standard 6-card Leduc Deck Card Component
const CardFace = ({ rank, suit, w }: { rank: string, suit: string, w: number }) => {
  const suitColor = isRed(suit) ? '#d32f2f' : '#111';
  let faceIcon = '🃏';
  if (rank === 'J') faceIcon = '💂';
  if (rank === 'Q') faceIcon = '👸';
  if (rank === 'K') faceIcon = '🤴';

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 3, left: 5, fontSize: w * 0.15, fontWeight: 900, color: suitColor, lineHeight: 1 }}>{rank}<br/><span style={{ fontSize: w * 0.13 }}>{suit}</span></div>
      <div style={{ fontSize: w * 0.45, lineHeight: 1 }}>{faceIcon}</div>
      <div style={{ position: 'absolute', bottom: 3, right: 5, fontSize: w * 0.15, fontWeight: 900, color: suitColor, transform: 'rotate(180deg)', lineHeight: 1 }}>{rank}<br/><span style={{ fontSize: w * 0.13 }}>{suit}</span></div>
    </div>
  );
};

const CardView = ({ card, hidden, delay = 0, small = false, highlight = false }: any) => {
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
          ? 'linear-gradient(135deg, #0a0028 0%, #00f5d4 50%, #0a0028 100%)'
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
      ) : card ? <CardFace rank={card.rank} suit={card.suit} w={w} /> : null}
    </motion.div>
  );
};


export const LeducPoker = ({ onBack }: { onBack: () => void }) => {
  const { user, updateBalance } = useCasino();
  const [gameState, setGameState] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("PRESS NEW GAME TO PLAY LEDUC HOLD'EM");
  const [shower, setShower] = useState<'win'|'lose'|null>(null);

  const API_URL = 'http://localhost:5001/api/interactive';

  const startGame = async () => {
    setLoading(true);
    setShower(null);
    try {
      const res = await fetch(`${API_URL}/start`, { method: 'POST' });
      const data = await res.json();
      setGameState(data);
      setMessage("YOUR TURN");
    } catch (e) {
      setMessage("SERVER ERROR. IS FLASK RUNNING?");
    }
    setLoading(false);
  };

  const playAction = async (action: 'CALL' | 'RAISE' | 'FOLD') => {
    if (gameState?.is_over || loading) return;
    setLoading(true);
    // Cost calculation (Leduc relies on server for payoff)
    try {
      // Deduct a generic 1 chip per call/raise locally to reflect visually instantly
      if (action !== 'FOLD') updateBalance(-1);

      const res = await fetch(`${API_URL}/act`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: action })
      });
      const data = await res.json();
      
      setGameState(data);
      
      if (data.is_over) {
        if (data.payoff_human > 0) {
            setMessage(`YOU WIN ${data.payoff_human} CHIPS!`);
            setShower('win');
            updateBalance(data.payoff_human + 1); // add back the optimistic deduction
        } else if (data.payoff_human < 0) {
            setMessage(`YOU LOSE ${Math.abs(data.payoff_human)} CHIPS.`);
            setShower('lose');
        } else {
            setMessage("IT'S A TIE!");
        }
      } else {
        setMessage(data.agent_action ? `AGENT PLAYED: ${data.agent_action}` : "YOUR TURN");
      }

    } catch (e) {
      setMessage("SERVER ERROR.");
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '0 20px 60px', maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/poker_bg.png)', backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.2) saturate(1.4)' }} />
        <AmbientMotes count={30} primaryColor="#f15bb5" secondaryColor="#00f5d4" />
      </div>

      <ParticleShower type={shower} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button onClick={onBack} className="neon-button magenta" style={{ padding: '10px 20px' }}>← LOBBY</button>
          <h1 className="title-font" style={{ fontSize: '2.5rem', lineHeight: 1, color: '#fff', textShadow: '0 0 30px rgba(0,245,212,0.5)' }}>
            LEDUC <span style={{ color: 'var(--neon-cyan)' }}>HOLD'EM</span> (vs OA Agent)
          </h1>
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          position: 'relative', background: 'radial-gradient(ellipse at 50% 50%, rgba(30,10,50,0.7) 0%, rgba(10,5,30,0.8) 50%, rgba(5,5,15,0.95) 100%)',
          borderRadius: '25% 25% 35% 35%', border: '3px solid rgba(0,245,212,0.3)',
          boxShadow: '0 0 60px rgba(0,245,212,0.1), inset 0 0 80px rgba(0,0,0,0.8), 0 0 200px rgba(0,0,0,0.9)',
          padding: '40px 30px', minHeight: '550px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
        }}>
           
           {/* Agent Top */}
           <div style={{ alignSelf: 'center', marginBottom: '10px' }}>
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '20px 30px', borderRadius: '16px', background: 'rgba(0,0,0,0.6)', border: `1px solid rgba(241,91,181,0.5)` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1.6rem' }}>🤖</span>
                    <span className="title-font" style={{ color: '#f15bb5', letterSpacing: '2px' }}>OA AGENT</span>
                </div>
                {gameState && gameState.classifier && (
                    <div style={{ 
                        color: gameState.classifier.label === 'aggressive' ? '#ff4466' : (gameState.classifier.label === 'tight' ? '#f15bb5' : '#00f5d4'), 
                        fontSize: '0.8rem', padding: '4px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px' 
                    }}>
                        Agent's Perceived Opponent Style: <b>{gameState.classifier.label.toUpperCase()}</b>
                    </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {gameState ? (
                        gameState.is_over ? <CardView card={gameState.agent_card_revealed} /> : <CardView hidden={true} /> 
                    ) : <div style={{ width: 120, height: 80, color: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>AGENT CARD</div>}
                </div>
             </div>
           </div>

           {/* Community Board */}
           <div style={{ textAlign: 'center' }}>
             <div style={{ color: 'var(--neon-magenta)', fontSize: '0.85rem', letterSpacing: '4px' }}>POT</div>
             <div className="orbitron-font" style={{ fontSize: '2.5rem', fontWeight: 900, color: '#fff', textShadow: '0 0 20px rgba(255,255,255,0.4)', marginBottom: '16px' }}>
               {gameState ? `${gameState.pot} CHIPS` : "0 CHIPS"}
             </div>
             <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', minHeight: '120px' }}>
                {gameState && gameState.public_card ? <CardView card={gameState.public_card} /> : <div style={{ width: 75, height: 110, border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.1)', fontSize: '2rem' }}>?</div>}
             </div>
           </div>

           {/* Player Bottom */}
           <div style={{ alignSelf: 'center', marginBottom: '10px' }}>
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '20px 30px', borderRadius: '16px', background: 'rgba(0,0,0,0.6)', border: `1px solid var(--neon-gold)` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1.6rem' }}>🎩</span>
                    <span className="title-font" style={{ color: 'var(--neon-gold)', letterSpacing: '2px' }}>YOU</span>
                    <span className="orbitron-font" style={{ color: '#fff' }}>${user?.balance.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {gameState && gameState.human_card ? (
                        <CardView card={gameState.human_card} highlight={!gameState.is_over} />
                    ) : <div style={{ width: 120, height: 80, color: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: '2px' }}>YOUR HAND</div>}
                </div>
             </div>
           </div>

        </div>

        <motion.div key={message} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="title-font" style={{ textAlign: 'center', margin: '20px 0', fontSize: '1.6rem', color: '#fff', textShadow: '0 0 15px rgba(255,255,255,0.5)' }}>
          {message}
        </motion.div>

        {/* Controls */}
        <div style={{ flex: 1, minWidth: '300px' }}>
            <div className="glass-panel" style={{ padding: '24px 32px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '14px', flexWrap: 'wrap', border: '1px solid rgba(0,245,212,0.3)' }}>
              
              {!gameState || gameState.is_over ? (
                <button onClick={startGame} disabled={loading} className="neon-button cyan" style={{ fontSize: '1.4rem', padding: '18px 80px', borderRadius: '99px' }}>{gameState ? "PLAY AGAIN" : "START LEDUC HOLD'EM"}</button>
              ) : (
                 <div style={{ display: 'flex', gap: '20px' }}>
                   <button onClick={() => playAction('FOLD')} disabled={loading || gameState.whose_turn !== 'human'} className="neon-button" style={{ padding: '14px 40px', fontSize: '1.2rem', color: '#ff4466', borderColor: '#ff4466' }}>FOLD</button>
                   <button onClick={() => playAction('CALL')} disabled={loading || gameState.whose_turn !== 'human'} className="neon-button cyan" style={{ padding: '14px 40px', fontSize: '1.2rem' }}>CALL</button>
                   <button onClick={() => playAction('RAISE')} disabled={loading || gameState.whose_turn !== 'human'} className="neon-button gold" style={{ padding: '14px 40px', fontSize: '1.2rem' }}>RAISE</button>
                 </div>
              )}
            </div>
        </div>
      </div>
    </div>
  );
};
