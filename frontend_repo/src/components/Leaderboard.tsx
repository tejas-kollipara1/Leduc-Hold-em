import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, X } from 'lucide-react';
import { useCasino } from '../context/CasinoContext';
import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface LeaderboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Leaderboard = ({ isOpen, onClose }: LeaderboardProps) => {
  const { user } = useCasino();
  const [top10, setTop10] = useState<{name: string, score: number}[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    if (!supabase || !isSupabaseConfigured()) {
      const mockLeaders = [
        { name: 'NeonShark', score: 18400000 },
        { name: 'CyberPro', score: 12500400 },
        { name: 'Glitch', score: 8400000 },
        { name: 'LuckyCharm', score: 6200500 },
        { name: 'HighRoller99', score: 4100200 },
        { name: 'JackpotAI', score: 3800000 }
      ];
      const allLeaders = [...mockLeaders];
      if (user && !allLeaders.find(l => l.name === user.username)) {
        allLeaders.push({ name: user.username, score: user.balance });
      }
      allLeaders.sort((a, b) => b.score - a.score);
      setTop10(allLeaders.slice(0, 10));
      return;
    }

    const fetchLeaders = async () => {
      const { data, error } = await supabase!
        .from('profiles')
        .select('username, balance')
        .order('balance', { ascending: false })
        .limit(10);
      
      if (data && !error) {
        setTop10(data.map(p => ({ name: p.username, score: p.balance })));
      }
    };

    fetchLeaders();

    const channel = supabase!.channel('leaderboard_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchLeaders();
      })
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [isOpen, user]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(25px)',
          WebkitBackdropFilter: 'blur(25px)',
          zIndex: 999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50, rotateX: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50, rotateX: -20 }}
            transition={{ type: 'spring', bounce: 0.4 }}
            className="glass-panel elevation-2 scene-3d"
            style={{ padding: '32px 48px', width: '100%', maxWidth: '600px', maxHeight: '95vh', display: 'flex', flexDirection: 'column', position: 'relative', border: '1px solid var(--neon-magenta)' }}
          >
            <button 
              onClick={onClose}
              style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.3s' }}
              onMouseOver={(e) => e.currentTarget.style.color = 'var(--neon-magenta)'}
              onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              <X size={28} />
            </button>

            <div className="flex-center flex-col" style={{ marginBottom: '24px', flexShrink: 0 }}>
              <motion.div
                 animate={{ rotateY: 360 }}
                 transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
              >
                <Trophy size={56} color="var(--neon-magenta)" style={{ marginBottom: '16px', filter: 'drop-shadow(0 0 15px var(--neon-magenta))' }} />
              </motion.div>
              <h2 className="title-font neon-text-cyan" style={{ fontSize: '3rem' }}>GLOBAL RANKS</h2>
              <p style={{ color: 'var(--neon-purple)', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '8px' }}>Hall of Fame</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', paddingRight: '10px' }}>
              {top10.map((leader, index) => {
                const isUser = leader.name === user?.username;
                return (
                  <motion.div 
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '20px 24px',
                      background: isUser ? 'linear-gradient(90deg, rgba(241, 91, 181, 0.2), rgba(0, 245, 212, 0.2))' : 'rgba(0,0,0,0.6)',
                      border: `1px solid ${isUser ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.05)'}`,
                      borderLeft: `4px solid ${isUser ? 'var(--neon-magenta)' : index < 3 ? 'var(--neon-gold)' : 'var(--text-secondary)'}`,
                      borderRadius: '12px',
                      boxShadow: isUser ? '0 5px 20px rgba(0, 245, 212, 0.2), inset 0 2px 10px rgba(241, 91, 181, 0.1)' : 'inset 0 2px 5px rgba(0,0,0,0.5)'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                      <span className="title-font" style={{ 
                        color: index < 3 ? 'var(--neon-gold)' : 'var(--text-secondary)',
                        fontSize: '1.2rem',
                        width: '30px'
                      }}>
                        #{index + 1}
                      </span>
                      <span style={{ fontWeight: isUser ? 800 : 500, color: isUser ? '#fff' : 'var(--text-secondary)', fontSize: '1.2rem', letterSpacing: '1px' }}>
                        {leader.name} {isUser && <span style={{ color: 'var(--neon-cyan)', fontSize: '0.9rem', marginLeft: '8px' }}>(YOU)</span>}
                      </span>
                    </div>
                    <span className="neon-text-gold" style={{ fontWeight: 800, fontSize: '1.2rem' }}>
                      ${leader.score.toLocaleString()}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
