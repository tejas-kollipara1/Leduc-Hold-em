import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Bot, Minimize2, Maximize2 } from 'lucide-react';
import { useCasino } from '../context/CasinoContext';
import { getAIResponse, isAIConfigured } from '../utils/aiService';
import type { ChatMessage } from '../utils/aiService';

export const AIChatbot: React.FC = () => {
  const { user, history } = useCasino();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // External trigger listener
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-ai-chat', handleOpen);
    return () => window.removeEventListener('open-ai-chat', handleOpen);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  // Initial greeting
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'model',
        content: `Greetings, ${user?.username || 'Guest'}. I am Cyberbot, your personal VIP Concierge. How may I facilitate your experience in the matrix tonight?`
      }]);
    }
  }, [isOpen, user]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: inputValue.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    // Prepare context
    const netProfit = history.reduce((acc, h) => acc + h.net, 0);
    const winCount = history.filter(h => h.outcome === 'WIN').length;
    const userContext = `
      PLAYER_NAME: ${user?.username || 'Unknown'}
      CURRENT_BALANCE: $${user?.balance || 0}
      SESSION_STATS: ${history.length} games played, ${winCount} wins, Net Profit: $${netProfit}
      RECENT_GAMES: ${history.slice(0, 5).map(h => h.game).join(', ')}
    `;

    try {
      const response = await getAIResponse(newMessages, userContext);
      setMessages([...newMessages, { role: 'model', content: response }]);
    } catch (error: any) {
      console.error('AIChatbot Error:', error);
      setMessages([...newMessages, { role: 'model', content: "◈ ERROR: Neural signal lost. Please check your uplink configuration." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, 
            background: 'rgba(0,0,0,0.7)', 
            backdropFilter: 'blur(10px)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            zIndex: 1000 
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="glass-panel"
            style={{
              width: '800px',
              maxWidth: '90vw',
              height: isMinimized ? '80px' : '85vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: '1px solid var(--neon-purple)',
              boxShadow: '0 0 30px rgba(155, 93, 229, 0.2)',
              marginBottom: '20px',
              pointerEvents: 'auto'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '24px 30px',
              background: 'linear-gradient(90deg, rgba(155, 93, 229, 0.2), transparent)',
              borderBottom: '1px solid rgba(155, 93, 229, 0.3)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ position: 'relative' }}>
                  <Bot size={28} color="var(--neon-cyan)" />
                  <div style={{ position: 'absolute', top: -2, right: -2, width: '8px', height: '8px', borderRadius: '50%', background: isAIConfigured() ? 'var(--neon-cyan)' : 'var(--neon-magenta)', boxShadow: `0 0 8px ${isAIConfigured() ? 'var(--neon-cyan)' : 'var(--neon-magenta)'}` }} />
                </div>
                <span className="orbitron-font" style={{ fontSize: '1.4rem', letterSpacing: '4px', color: '#fff', textShadow: '0 0 10px rgba(0,245,212,0.5)' }}>CYBERBOT // VIP-AI</span>
              </div>
              <div style={{ display: 'flex', gap: '20px' }}>
                <button onClick={() => setIsMinimized(!isMinimized)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }} title="Minimize">
                  {isMinimized ? <Maximize2 size={24} /> : <Minimize2 size={24} />}
                </button>
                <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--neon-magenta)', cursor: 'pointer' }} title="Close Uplink">
                  <X size={28} />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages Area */}
                <div 
                  ref={scrollRef}
                  style={{
                    flex: 1,
                    padding: '30px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '24px'
                  }}
                >
                  {messages.map((msg, i) => (
                    <div key={i} style={{ 
                      alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '80%',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <div style={{
                        padding: '16px 24px',
                        borderRadius: '16px',
                        fontSize: '1.2rem',
                        lineHeight: '1.6',
                        background: msg.role === 'user' ? 'rgba(0, 245, 212, 0.1)' : 'rgba(155, 93, 229, 0.1)',
                        border: `1px solid ${msg.role === 'user' ? 'rgba(0, 245, 212, 0.3)' : 'rgba(155, 93, 229, 0.3)'}`,
                        color: msg.role === 'user' ? '#fff' : 'rgba(255,255,255,0.95)',
                        borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
                        borderBottomLeftRadius: msg.role === 'user' ? '16px' : '4px',
                        boxShadow: `0 4px 20px ${msg.role === 'user' ? 'rgba(0,245,212,0.1)' : 'rgba(155,93,229,0.1)'}`
                      }}>
                        {msg.content}
                      </div>
                      <div className="orbitron-font" style={{ fontSize: '0.8rem', color: msg.role === 'user' ? 'var(--neon-cyan)' : 'var(--neon-purple)', textAlign: msg.role === 'user' ? 'right' : 'left', opacity: 0.7, letterSpacing: '2px' }}>
                        {msg.role === 'user' ? user?.username.toUpperCase() : 'CYBERBOT'}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div style={{ alignSelf: 'flex-start', display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: 'rgba(0,0,0,0.4)', borderRadius: '12px', border: '1px solid var(--neon-cyan)' }}>
                      <div className="orbitron-font" style={{ fontSize: '0.9rem', color: 'var(--neon-cyan)', letterSpacing: '4px', textShadow: '0 0 10px rgba(0,245,212,0.5)', animation: 'flicker 1.5s infinite' }}>
                        DECRYPTING NEURAL SIGNAL...
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ width: '6px', height: '24px', background: 'var(--neon-cyan)', animation: 'pulse 1s infinite', boxShadow: '0 0 10px var(--neon-cyan)' }} />
                        <div style={{ width: '6px', height: '24px', background: 'var(--neon-cyan)', animation: 'pulse 1s infinite 0.2s', boxShadow: '0 0 10px var(--neon-cyan)' }} />
                        <div style={{ width: '6px', height: '24px', background: 'var(--neon-cyan)', animation: 'pulse 1s infinite 0.4s', boxShadow: '0 0 10px var(--neon-cyan)' }} />
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ padding: '30px', paddingTop: '0' }}>
                  <div style={{
                    display: 'flex',
                    gap: '15px',
                    background: 'rgba(0,0,0,0.4)',
                    padding: '12px 16px',
                    borderRadius: '16px',
                    border: '1px solid rgba(0, 245, 212, 0.2)',
                    boxShadow: 'inset 0 2px 15px rgba(0,245,212,0.05)'
                  }}>
                    <input
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Establish secure transmission..."
                      style={{
                        flex: 1,
                        background: 'none',
                        border: 'none',
                        color: '#fff',
                        fontSize: '1.1rem',
                        outline: 'none',
                        padding: '8px'
                      }}
                    />
                    <button 
                      onClick={handleSend}
                      disabled={isLoading || !inputValue.trim()}
                      style={{
                        background: 'var(--neon-cyan)',
                        border: 'none',
                        borderRadius: '12px',
                        width: '48px',
                        height: '48px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#000',
                        opacity: isLoading || !inputValue.trim() ? 0.3 : 1,
                        boxShadow: isLoading || !inputValue.trim() ? 'none' : '0 0 20px rgba(0,245,212,0.6)'
                      }}
                    >
                      <Send size={24} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    <style>{`
      @keyframes pulse {
        0%, 100% { opacity: 0.3; transform: scaleY(1); }
        50% { opacity: 1; transform: scaleY(1.3); }
      }
      @keyframes flicker {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `}</style>
    </>
  );
};

