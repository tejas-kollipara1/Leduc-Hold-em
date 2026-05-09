import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ParticleShower } from '../components/ParticleShower';
import { AmbientMotes } from '../components/AmbientMotes';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';

const isRed = (suit: string) => suit === '♥' || suit === '♦';

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

export const LeducVisualizer = ({ onBack }: { onBack: () => void }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("START SESSION TO BEGIN VISUALIZATION");
  const [sessionActive, setSessionActive] = useState(false);
  const [currentStep, setCurrentStep] = useState<any>(null);
  const [opponentStyle, setOpponentStyle] = useState('random');
  const [stats, setStats] = useState<any>(null);

  const API_URL = 'http://localhost:5001/api';

  const startSession = async () => {
    setLoading(true);
    try {
      await fetch(`${API_URL}/start_session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: 'oa', opponent: opponentStyle })
      });
      setSessionActive(true);
      setCurrentStep(null);
      setMessage(`SESSION STARTED. BOT IS PLAYING AGAINST ${opponentStyle.toUpperCase()}`);
    } catch (e) {
      setMessage("SERVER ERROR. IS FLASK RUNNING?");
    }
    setLoading(false);
  };

  const playHand = async () => {
    if (loading || !sessionActive) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/play_hand`, { method: 'POST' });
      const data = await res.json();
      
      // Step through animations smoothly
      setMessage("SIMULATING HAND...");
      let delay = 0;
      data.steps.forEach((step: any, idx: number) => {
          setTimeout(() => {
              setCurrentStep(step);
              if (step.type === 'showdown') {
                 setMessage(`HAND FINISHED. AGENT PAYOFF: ${step.payoff}`);
              } else if (step.type === 'action') {
                 setMessage(`${step.player.toUpperCase()} PLAYS: ${step.action}`);
              }
          }, delay);
          delay += 1000; // 1 second per action animation
      });
      
      setTimeout(() => {
          setStats(data.stats); // Update stats for graph AFTER hand finishes
          setLoading(false);
      }, delay);

    } catch (e) {
      setMessage("SERVER ERROR.");
      setLoading(false);
    }
  };

  const styleValueMap: any = { 'random': 0, 'tight': 1, 'aggressive': 2 };
  
  // Format graph data comprehensively avoiding any runtime exception
  let cumulativeReward = 0;
  const graphData = (stats?.rewards || []).map((r: number, idx: number) => {
      cumulativeReward += r;
      const st = stats?.styles ? stats.styles[idx] : 'random';
      return {
          hand: idx + 1,
          reward: cumulativeReward,
          style: styleValueMap[st] !== undefined ? styleValueMap[st] : 0,
          styleLabel: st || 'random'
      };
  });

  return (
    <div style={{ padding: '0 20px 60px', maxWidth: '1400px', margin: '0 auto', position: 'relative' }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/poker_bg.png)', backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.2) saturate(1.4)' }} />
        <AmbientMotes count={30} primaryColor="#9b5de5" secondaryColor="#f15bb5" />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button onClick={onBack} className="neon-button magenta" style={{ padding: '10px 20px' }}>← LOBBY</button>
          <h1 className="title-font" style={{ fontSize: '2.5rem', lineHeight: 1, color: '#fff', textShadow: '0 0 30px rgba(155,93,229,0.5)' }}>
            RL AGENT <span style={{ color: 'var(--neon-magenta)' }}>VISUALIZER HUB</span>
          </h1>
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          position: 'relative', background: 'radial-gradient(ellipse at 50% 50%, rgba(30,10,50,0.7) 0%, rgba(10,5,30,0.8) 50%, rgba(5,5,15,0.95) 100%)',
          borderRadius: '25% 25% 35% 35%', border: '3px solid rgba(155,93,229,0.3)',
          boxShadow: '0 0 60px rgba(155,93,229,0.1), inset 0 0 80px rgba(0,0,0,0.8), 0 0 200px rgba(0,0,0,0.9)',
          padding: '40px 30px', minHeight: '550px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
        }}>
           
           {/* Opponent Top */}
           <div style={{ alignSelf: 'center', marginBottom: '10px' }}>
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '20px 30px', borderRadius: '16px', background: 'rgba(0,0,0,0.6)', border: `1px solid rgba(255,68,102,0.5)` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1.6rem' }}>👾</span>
                    <span className="title-font" style={{ color: '#ff4466', letterSpacing: '2px' }}>{opponentStyle.toUpperCase()} OPPONENT</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {currentStep ? (
                        currentStep.type === 'showdown' ? <CardView card={currentStep.opp_card} /> : <CardView hidden={true} /> 
                    ) : <div style={{ width: 120, height: 80, color: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>OPPONENT CARD</div>}
                </div>
             </div>
           </div>

           {/* Community Board */}
           <div style={{ textAlign: 'center' }}>
             <div style={{ color: 'var(--neon-magenta)', fontSize: '0.85rem', letterSpacing: '4px' }}>PUBLIC CARD</div>
             <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', minHeight: '120px', marginTop: '16px' }}>
                {currentStep && currentStep.public_card ? <CardView card={currentStep.public_card} /> : <div style={{ width: 75, height: 110, border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.1)', fontSize: '2rem' }}>?</div>}
             </div>
           </div>

           {/* AI Agent Bottom */}
           <div style={{ alignSelf: 'center', marginBottom: '10px' }}>
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '20px 30px', borderRadius: '16px', background: 'rgba(0,0,0,0.6)', border: `1px solid #00f5d4` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1.6rem' }}>🤖</span>
                    <span className="title-font" style={{ color: '#00f5d4', letterSpacing: '2px' }}>OA AGENT</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {currentStep && currentStep.agent_card ? (
                        <CardView card={currentStep.agent_card} highlight={currentStep.type === 'action' && currentStep.player === 'agent'} />
                    ) : <div style={{ width: 120, height: 80, color: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: '2px' }}>AGENT CARD</div>}
                </div>
             </div>
           </div>

        </div>

        {/* GRAPHS PANEL */}
        {stats && graphData.length > 0 && (
            <div style={{ 
                marginTop: '30px', display: 'flex', gap: '20px', flexWrap: 'wrap',
                background: 'rgba(10,5,30,0.8)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(155,93,229,0.3)'
            }}>
                <div style={{ flex: '1 1 45%', minWidth: '300px', height: '250px' }}>
                    <div style={{ color: '#00f5d4', fontSize: '0.9rem', letterSpacing: '2px', marginBottom: '10px', textAlign: 'center' }}>OA CUMULATIVE REWARD</div>
                    <ResponsiveContainer width="100%" height="85%">
                        <LineChart data={graphData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="hand" stroke="rgba(255,255,255,0.4)" fontSize={12} />
                            <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} />
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid #00f5d4', color: '#fff' }} />
                            <Line type="monotone" dataKey="reward" stroke="#00f5d4" strokeWidth={3} dot={{ r: 3, fill: '#00f5d4' }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div style={{ flex: '1 1 45%', minWidth: '300px', height: '250px' }}>
                    <div style={{ color: '#ff4466', fontSize: '0.9rem', letterSpacing: '2px', marginBottom: '10px', textAlign: 'center' }}>PERCEIVED OPPONENT STYLE</div>
                    <ResponsiveContainer width="100%" height="85%">
                        <AreaChart data={graphData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="hand" stroke="rgba(255,255,255,0.4)" fontSize={12} />
                            <YAxis 
                                domain={[0, 2]} 
                                ticks={[0, 1, 2]} 
                                tickFormatter={(val) => val === 0 ? 'Random' : val === 1 ? 'Tight' : 'Aggr.'}
                                stroke="rgba(255,255,255,0.4)" fontSize={12} 
                                width={70}
                            />
                            <Tooltip formatter={(val: any, name: any, props: any) => [props?.payload?.styleLabel?.toUpperCase() || 'UNKNOWN', 'Style']} contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid #ff4466', color: '#fff' }} />
                            <Area type="stepAfter" dataKey="style" stroke="#ff4466" fill="#ff4466" fillOpacity={0.2} strokeWidth={3} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        )}

        <motion.div key={message} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="title-font" style={{ textAlign: 'center', margin: '20px 0', fontSize: '1.6rem', color: '#fff', textShadow: '0 0 15px rgba(255,255,255,0.5)' }}>
          {message}
        </motion.div>

        {/* Controls */}
        <div style={{ flex: 1, minWidth: '300px' }}>
            <div className="glass-panel" style={{ padding: '24px 32px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '14px', flexWrap: 'wrap', border: '1px solid rgba(155,93,229,0.3)' }}>
              
              {!sessionActive ? (
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                   <select 
                      value={opponentStyle} 
                      onChange={(e) => setOpponentStyle(e.target.value)}
                      style={{ padding: '12px 20px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: '1px solid #ff4466', borderRadius: '8px', fontSize: '1.2rem', fontFamily: 'Orbitron' }}
                   >
                     <option value="random">RANDOM OPPONENT</option>
                     <option value="tight">TIGHT OPPONENT</option>
                     <option value="aggressive">AGGRESSIVE OPPONENT</option>
                   </select>

                   <button onClick={startSession} disabled={loading} className="neon-button magenta" style={{ fontSize: '1.4rem', padding: '14px 60px', borderRadius: '99px' }}>START SESSION</button>
                </div>
              ) : (
                 <button onClick={playHand} disabled={loading} className="neon-button cyan" style={{ padding: '14px 60px', fontSize: '1.2rem', borderRadius: '99px' }}>AUTO-PLAY NEXT HAND</button>
              )}
            </div>
        </div>
      </div>
    </div>
  );
};
