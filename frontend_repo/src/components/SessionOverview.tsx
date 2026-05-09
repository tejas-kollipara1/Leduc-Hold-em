import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCasino } from '../context/CasinoContext';
import { ProfitChart } from './ProfitChart';
import { X, TrendingUp, TrendingDown, Clock, Award } from 'lucide-react';

export const SessionOverview = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { history } = useCasino();

  const totalHands = isOpen ? history.length : 0;
  const netProfit = isOpen ? history.reduce((acc, item) => acc + item.net, 0) : 0;
  const wins = isOpen ? history.filter(item => item.outcome === 'WIN').length : 0;
  const winRate = totalHands > 0 ? ((wins / totalHands) * 100).toFixed(1) : '0.0';
  const largestLoss = isOpen && history.length > 0 ? Math.min(0, ...history.map(item => item.net)) : 0;

  // Favorite Game Logic
  const favGame = useMemo(() => {
    if (!isOpen || history.length === 0) return 'NONE';
    const counts: Record<string, number> = {};
    history.forEach(h => { counts[h.game] = (counts[h.game] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }, [history, isOpen]);

  // Balance history for the chart
  const balanceTrend = useMemo(() => {
    if (!isOpen) return [];
    return history.slice().reverse().map(h => h.balanceAfter);
  }, [history, isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(2, 0, 5, 0.95)',
          backdropFilter: 'blur(15px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '40px'
        }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="glass-panel"
          style={{
            width: '100%', maxWidth: '900px', maxHeight: '90vh',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 0 100px rgba(0,0,0,0.8)'
          }}
        >
          {/* Header */}
          <div style={{ padding: '30px 40px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 className="title-font" style={{ fontSize: '1.8rem', letterSpacing: '4px', marginBottom: '4px' }}>SESSION OVERVIEW</h2>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', fontFamily: 'Orbitron' }}>
                Today · {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,68,102,0.1)', color: '#ff4466', padding: '6px 14px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff4466', boxShadow: '0 0 8px #ff4466' }} />
                    LIVE
                </div>
                <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                   <X size={24} />
                </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '40px' }}>
            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '40px', marginBottom: '40px' }}>
              
              {/* Net Profit */}
              <div style={{ borderLeft: '2px solid rgba(255,255,255,0.05)', paddingLeft: '24px' }}>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', letterSpacing: '2px', marginBottom: '8px', textTransform: 'uppercase' }}>Net Profit</div>
                <div style={{ color: netProfit >= 0 ? '#00f5d4' : '#ff4466', fontSize: '2.5rem', fontWeight: 800, fontFamily: 'Orbitron' }}>
                   {netProfit >= 0 ? '+' : ''}${Math.abs(netProfit).toLocaleString()}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: netProfit >= 0 ? '#00f5d4' : '#ff4466', marginTop: '4px' }}>
                    {netProfit >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    <span>{netProfit >= 0 ? 'Exceeding' : 'Below'} daily target</span>
                </div>
              </div>

               {/* Win Rate */}
               <div style={{ borderLeft: '2px solid rgba(255,255,255,0.05)', paddingLeft: '24px' }}>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', letterSpacing: '2px', marginBottom: '8px', textTransform: 'uppercase' }}>Win Rate</div>
                <div style={{ color: '#ffbe0b', fontSize: '2.5rem', fontWeight: 800, fontFamily: 'Orbitron' }}>
                   {winRate}%
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
                    <Award size={14} />
                    <span>Based on {totalHands} interactions</span>
                </div>
              </div>

               {/* Favorite Game */}
               <div style={{ borderLeft: '2px solid rgba(255,255,255,0.05)', paddingLeft: '24px' }}>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', letterSpacing: '2px', marginBottom: '8px', textTransform: 'uppercase' }}>Favorite Game</div>
                <div style={{ color: '#00f5d4', fontSize: '2rem', fontWeight: 800, fontFamily: 'Orbitron' }}>
                   {favGame}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
                    <TrendingUp size={14} />
                    <span>Most Played Title</span>
                </div>
              </div>

              {/* Hands Played */}
              <div style={{ borderLeft: '2px solid rgba(255,255,255,0.05)', paddingLeft: '24px' }}>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', letterSpacing: '2px', marginBottom: '8px', textTransform: 'uppercase' }}>Hands Played</div>
                <div style={{ color: '#00ccff', fontSize: '2.5rem', fontWeight: 800, fontFamily: 'Orbitron' }}>
                   {totalHands}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
                    <Clock size={14} />
                    <span>Session Active</span>
                </div>
              </div>

              {/* Largest Loss */}
              <div style={{ borderLeft: '2px solid rgba(255,255,255,0.05)', paddingLeft: '24px' }}>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', letterSpacing: '2px', marginBottom: '8px', textTransform: 'uppercase' }}>Largest Loss</div>
                <div style={{ color: '#ff4466', fontSize: '2.5rem', fontWeight: 800, fontFamily: 'Orbitron' }}>
                   -${Math.abs(largestLoss).toLocaleString()}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
                    <span>Recovered: {netProfit > 0 ? 'YES' : 'NO'}</span>
                </div>
              </div>

            </div>

            {/* Profit Chart */}
            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '16px', padding: '30px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '40px' }}>
               <ProfitChart data={balanceTrend} />
            </div>

            {/* Transactions Table */}
            <div>
              <table style={{ width: '100%', borderCollapse: 'collapse', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
                <thead>
                   <tr style={{ textAlign: 'left', color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '12px', letterSpacing: '2px' }}>#</th>
                      <th style={{ padding: '12px', letterSpacing: '2px' }}>Game</th>
                      <th style={{ padding: '12px', letterSpacing: '2px' }}>Bet</th>
                      <th style={{ padding: '12px', letterSpacing: '2px', textAlign: 'center' }}>Outcome</th>
                      <th style={{ padding: '12px', letterSpacing: '2px', textAlign: 'right' }}>Net</th>
                      <th style={{ padding: '12px', letterSpacing: '2px', textAlign: 'center' }}>AI Advisory</th>
                      <th style={{ padding: '12px', letterSpacing: '2px', textAlign: 'center' }}>Followed</th>
                   </tr>
                </thead>
                <tbody>
                   {history.map((item, i) => (
                     <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '16px 12px', color: 'rgba(255,255,255,0.3)', fontFamily: 'Orbitron' }}>#{totalHands - i}</td>
                        <td style={{ padding: '16px 12px', fontWeight: 600 }}>{item.game}</td>
                        <td style={{ padding: '16px 12px', fontFamily: 'Orbitron' }}>${item.bet.toLocaleString()}</td>
                        <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                           <span style={{ 
                             padding: '4px 10px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800,
                             background: item.outcome === 'WIN' ? 'rgba(0,245,212,0.15)' : item.outcome === 'LOSS' ? 'rgba(255,68,102,0.15)' : 'rgba(255,190,11,0.15)',
                             color: item.outcome === 'WIN' ? '#00f5d4' : item.outcome === 'LOSS' ? '#ff4466' : '#ffbe0b',
                             border: `1px solid ${item.outcome === 'WIN' ? '#00f5d444' : item.outcome === 'LOSS' ? '#ff446644' : '#ffbe0b44'}`
                           }}>
                             {item.outcome}
                           </span>
                        </td>
                        <td style={{ padding: '16px 12px', textAlign: 'right', fontWeight: 700, color: item.net >= 0 ? '#00f5d4' : '#ff4466', fontFamily: 'Orbitron' }}>
                           {item.net >= 0 ? '+' : ''}{item.net.toLocaleString()}
                        </td>
                        <td style={{ padding: '16px 12px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                           {item.aiAdvice}
                        </td>
                        <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                            {item.followedAdvice ? (
                              <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,245,212,0.2)', color: '#00f5d4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontSize: '0.7rem' }}>✓</div>
                            ) : (
                              <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(255,68,102,0.2)', color: '#ff4466', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontSize: '0.7rem' }}>✕</div>
                            )}
                        </td>
                     </tr>
                   ))}
                </tbody>
              </table>
              {history.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.2)', letterSpacing: '4px' }}>
                  NO ACTIVITY RECORDED
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
