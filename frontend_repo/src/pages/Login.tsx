import { useState, useRef, useEffect } from 'react';
import { useCasino } from '../context/CasinoContext';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchFortune } from '../lib/quotes';

// ── Typed alert system ──────────────────────────────────────────────────────
type AlertType = 'error' | 'warning' | 'success' | 'info';

interface Alert {
  type: AlertType;
  title: string;
  message: string;
}

const ALERT_STYLES: Record<AlertType, { border: string; glow: string; icon: string; titleColor: string; bg: string }> = {
  error:   { border: 'var(--neon-magenta)', glow: 'rgba(241,91,181,0.25)', icon: '⛔', titleColor: 'var(--neon-magenta)', bg: 'rgba(241,91,181,0.08)' },
  warning: { border: 'var(--neon-gold)',    glow: 'rgba(255,190,11,0.25)',  icon: '⚠',  titleColor: 'var(--neon-gold)',    bg: 'rgba(255,190,11,0.08)'  },
  success: { border: 'var(--neon-cyan)',    glow: 'rgba(0,245,212,0.25)',   icon: '✔',  titleColor: 'var(--neon-cyan)',    bg: 'rgba(0,245,212,0.08)'   },
  info:    { border: 'var(--neon-purple)',  glow: 'rgba(155,93,229,0.25)',  icon: 'ℹ',  titleColor: 'var(--neon-purple)',  bg: 'rgba(155,93,229,0.08)'  },
};

const AlertPopup = ({ alert, onDismiss }: { alert: Alert; onDismiss: () => void }) => {
  const s = ALERT_STYLES[alert.type];
  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ duration: 0.25 }}
      style={{
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderLeft: `4px solid ${s.border}`,
        borderRadius: '12px',
        padding: '12px 16px',
        boxShadow: `0 4px 20px ${s.glow}`,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        cursor: 'pointer',
        textAlign: 'left',
      }}
      onClick={onDismiss}
      title="Click to dismiss"
    >
      <span style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: '1px' }}>{s.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: s.titleColor, fontWeight: 700, fontSize: '0.78rem', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '2px' }}>
          {alert.title}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.82rem', lineHeight: '1.4' }}>
          {alert.message}
        </div>
      </div>
      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', flexShrink: 0 }}>✕</span>
    </motion.div>
  );
};

// ── Helpers ──────────────────────────────────────────────────────────────────
// Removed email validation as we use handles now

// Maps raw Supabase/API error messages → user-friendly typed alerts
function parseApiError(msg: string): Alert {
  const m = msg.toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid credentials') || m.includes('email not confirmed')) {
    return { type: 'error', title: 'Login Failed', message: 'Incorrect email or password. Double-check your credentials and try again.' };
  }
  if (m.includes('already registered') || m.includes('already taken') || m.includes('unique')) {
    return { type: 'warning', title: 'Account Conflict', message: 'That email or username is already registered. Try logging in instead.' };
  }
  if (m.includes('password') && m.includes('short')) {
    return { type: 'warning', title: 'Weak Password', message: 'Your password is too short. Choose something at least 6 characters long.' };
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return { type: 'warning', title: 'Slow Down', message: 'Too many attempts. Please wait a moment before trying again.' };
  }
  if (m.includes('network') || m.includes('fetch') || m.includes('failed to fetch')) {
    return { type: 'error', title: 'Connection Error', message: 'Could not reach the server. Check your internet connection.' };
  }
  if (m.includes('18') || m.includes('age') || m.includes('older')) {
    return { type: 'error', title: 'Age Restriction', message: 'You must be 18 or older to access Neon Vegas Casino.' };
  }
  if (m.includes('supabase not configured') || m.includes('cloud database')) {
    return { type: 'info', title: 'Service Offline', message: 'The database is not configured. Contact support if this persists.' };
  }
  if (m.includes('verification failed') || m.includes('birthday') || m.includes('incorrect')) {
    return { type: 'error', title: 'Verification Failed', message: 'Email or birthday did not match our records. Please try again.' };
  }
  return { type: 'error', title: 'Unexpected Error', message: msg };
}

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [alert, setAlert] = useState<Alert | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [fortune, setFortune] = useState<{text: string, author: string} | null>(null);
  // field-level errors for inline highlighting
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Birthday States & Refs
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  
  const [newPassword, setNewPassword] = useState('');
  
  const { login, loginWithGoogle, register, resetPasswordByBirthday } = useCasino();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    fetchFortune().then(setFortune);
  }, []);
  
  // ── Web Audio API Refs for Seamless Looping ──
  const audioCtx = useRef<AudioContext | null>(null);
  const gainNode = useRef<GainNode | null>(null);
  const sourceNode = useRef<AudioBufferSourceNode | null>(null);
  const isUnlocked = useRef(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 1.0;
    }

    const loadAudio = async () => {
      try {
        const response = await fetch('/Video_Editing_Request_Vegas_Style.mp4');
        const buffer = await response.arrayBuffer();
        if (!audioCtx.current) audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        const decodedBuffer = await audioCtx.current.decodeAudioData(buffer);
        gainNode.current = audioCtx.current.createGain();
        gainNode.current.gain.value = 0;
        gainNode.current.connect(audioCtx.current.destination);
        sourceNode.current = audioCtx.current.createBufferSource();
        sourceNode.current.buffer = decodedBuffer;
        sourceNode.current.loop = true;
        sourceNode.current.connect(gainNode.current);
        sourceNode.current.start(0);
      } catch (err) {
        console.error("Failed to load/decode seamless audio:", err);
      }
    };

    loadAudio();

    const unlockAudio = () => {
      if (isUnlocked.current) return;
      isUnlocked.current = true;
      if (audioCtx.current && gainNode.current) {
        if (audioCtx.current.state === 'suspended') audioCtx.current.resume();
        setIsMuted(false);
        gainNode.current.gain.setTargetAtTime(0.6, audioCtx.current.currentTime, 0.4);
      }
      window.removeEventListener('click', unlockAudio);
    };

    window.addEventListener('click', unlockAudio);
    
    return () => {
      window.removeEventListener('click', unlockAudio);
      if (sourceNode.current) try { sourceNode.current.stop(); } catch(_e){}
      if (audioCtx.current) audioCtx.current.close().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (gainNode.current && audioCtx.current) {
      const targetGain = isMuted ? 0 : 0.6;
      gainNode.current.gain.setTargetAtTime(targetGain, audioCtx.current.currentTime, 0.15);
    }
  }, [isMuted]);

  // Clear everything when switching modes
  const clearState = () => {
    setAlert(null);
    setFieldErrors({});
  };

  const showAlert = (a: Alert) => {
    setAlert(a);
    // Auto-dismiss success/info after 5s
    if (a.type === 'success' || a.type === 'info') {
      setTimeout(() => setAlert(null), 5000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);
    const errors: Record<string, string> = {};

    // ── Handle validation ──
    if (!username.trim() || username.trim().length < 3) {
      errors.email = 'Handle required (min 3 chars)';
      setFieldErrors(errors);
      showAlert({ type: 'warning', title: 'Invalid Handle', message: 'Please enter a neural handle with at least 3 characters.' });
      return;
    }

    // ── Forgot Password flow ──
    if (showForgot) {
      if (!birthDay || !birthMonth || !birthYear) {
        errors.dob = 'Birthday required';
        setFieldErrors(errors);
        showAlert({ type: 'warning', title: 'Birthday Missing', message: 'Enter your full birthday (DD / MM / YYYY) to verify your identity.' });
        return;
      }

      // Basic DOB sanity check
      const d = parseInt(birthDay), m = parseInt(birthMonth), y = parseInt(birthYear);
      if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > new Date().getFullYear()) {
        errors.dob = 'Invalid date';
        setFieldErrors(errors);
        showAlert({ type: 'error', title: 'Invalid Date', message: 'The birthday you entered is not a valid calendar date.' });
        return;
      }

      if (!newPassword || newPassword.length < 6) {
        errors.newPassword = 'Min 6 characters';
        setFieldErrors(errors);
        showAlert({ type: 'warning', title: 'Password Too Short', message: 'Your new password must be at least 6 characters long.' });
        return;
      }

      const bDate = `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`;
      try {
        const success = await resetPasswordByBirthday(username.trim(), bDate, newPassword);
        if (success) {
          setFieldErrors({});
          showAlert({ type: 'success', title: 'Password Reset!', message: 'Your credentials have been updated. You can now log in with your new password.' });
          setShowForgot(false);
          setPassword(newPassword);
          setNewPassword('');
          setBirthDay(''); setBirthMonth(''); setBirthYear('');
        } else {
          showAlert({ type: 'error', title: 'Verification Failed', message: 'Email or birthday did not match our records. Please double-check and try again.' });
        }
      } catch (err: any) {
        showAlert(parseApiError(err.message));
      }
      return;
    }

    // ── Password validation (login & register) ──
    if (password.length < 6) {
      errors.password = 'Min 6 characters';
      setFieldErrors(errors);
      showAlert({ type: 'warning', title: 'Password Too Short', message: 'Password must be at least 6 characters. Try a longer passphrase.' });
      return;
    }

    // ── Registration extra checks ──
    if (isRegistering) {
      if (!birthDay || !birthMonth || !birthYear) {
        errors.dob = 'Birthday required';
        setFieldErrors(errors);
        showAlert({ type: 'warning', title: 'Birthday Required', message: 'We need your birthday for the 18+ age verification check.' });
        return;
      }
      const d = parseInt(birthDay), m = parseInt(birthMonth), y = parseInt(birthYear);
      if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > new Date().getFullYear()) {
        errors.dob = 'Invalid date';
        setFieldErrors(errors);
        showAlert({ type: 'error', title: 'Invalid Birthday', message: 'The date you entered is not valid. Please check the day, month, and year.' });
        return;
      }
    }

    setFieldErrors({});
    try {
      if (isRegistering) {
        const bDate = `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`;
        await register(username.trim(), password, bDate);
      } else {
        await login(username.trim(), password);
      }
    } catch (err: any) {
      showAlert(parseApiError(err.message));
    }
  };

  const handleDateChange = (val: string, type: 'D' | 'M' | 'Y') => {
    const clean = val.replace(/\D/g, '');
    if (type === 'D') {
      setBirthDay(clean.slice(0, 2));
      if (clean.length === 2) monthRef.current?.focus();
    } else if (type === 'M') {
      setBirthMonth(clean.slice(0, 2));
      if (clean.length === 2) yearRef.current?.focus();
    } else if (type === 'Y') {
      setBirthYear(clean.slice(0, 4));
    }
  };

  // Shared field border style – highlights red if that field has an error
  const fieldBorder = (key: string, defaultColor: string) =>
    fieldErrors[key] ? '1.5px solid var(--neon-magenta)' : `1px solid ${defaultColor}`;

  return (
    <div className="flex-center w-full" style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      
      {/* ── Background Video Loop ── */}
      <video 
        ref={videoRef}
        src="/Video_Editing_Request_Vegas_Style.mp4" 
        autoPlay 
        loop 
        muted={true}
        playsInline
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '100vw',
          height: '100vh',
          objectFit: 'cover',
          transform: 'translate(-50%, -50%)',
          zIndex: 0,
          filter: 'brightness(1.05) saturate(1.3) contrast(1.1)'
        }} 
      />

      {/* ── Color Overlay ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: 'radial-gradient(circle at center, rgba(140, 0, 80, 0.2), rgba(0,0,0,0.85) 90%)',
        mixBlendMode: 'multiply'
      }} />

      {/* Intro State */}
      <AnimatePresence>
        {!showForm && (
          <motion.div
            key="intro-btn"
            initial={{ opacity:0, y: 40 }}
            animate={{ opacity:1, y:0 }}
            exit={{ opacity:0, y: -40, scale:0.95 }}
            transition={{ duration: 0.8 }}
            style={{ position: 'absolute', bottom: '15%', zIndex: 1, textAlign: 'center', width: '100%' }}
            className="flex flex-col items-center gap-8"
          >
            {fortune && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="max-w-xl px-6 py-4 glass-panel border-neon-purple/20"
              >
                <div className="italic text-neon-purple text-lg orbitron-font mb-2">"{fortune.text}"</div>
                <div className="text-sm text-white/40 uppercase tracking-widest">— {fortune.author} —</div>
              </motion.div>
            )}

            <motion.button 
              onClick={() => {
                setShowForm(true);
                // Explicitly unlock and play audio on this primary interaction
                if (!isUnlocked.current && audioCtx.current && gainNode.current) {
                  isUnlocked.current = true;
                  if (audioCtx.current.state === 'suspended') audioCtx.current.resume();
                  setIsMuted(false);
                  gainNode.current.gain.setTargetAtTime(0.6, audioCtx.current.currentTime, 0.4);
                }
              }}
              whileHover={{ scale: 1.05, textShadow: '0 0 20px rgba(255,190,11,1)' }}
              whileTap={{ scale: 0.95 }}
              className="neon-button gold cinzel-font"
              style={{ fontSize: '1.6rem', padding: '24px 48px', letterSpacing:'6px', boxShadow:'0 0 50px rgba(255,190,11,0.4)', background:'rgba(0,0,0,0.4)' }}
            >
              ENTER THE CASINO
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form State */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            key="login-form"
            initial={{ scale: 0.85, opacity: 0, y: 60 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', bounce: 0.45, duration: 1.1 }}
            className="glass-panel elevation-2"
            style={{
              padding: '56px 48px',
              width: '100%',
              maxWidth: '520px',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
              zIndex: 1,
              border: '1px solid rgba(255,255,255,0.15)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: '0 30px 60px rgba(0,0,0,0.8), inset 0 0 40px rgba(255,255,255,0.05)'
            }}
          >
            {/* Logo */}
            <div style={{ position: 'relative', zIndex: 1, marginBottom: '40px' }}>
              <motion.div
                animate={{ textShadow: [
                  '0 0 10px #f15bb5, 0 0 30px #f15bb5',
                  '0 0 20px #00f5d4, 0 0 60px #00f5d4',
                  '0 0 10px #9b5de5, 0 0 30px #9b5de5',
                  '0 0 10px #f15bb5, 0 0 30px #f15bb5',
                ]}}
                transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
                className="title-font"
                style={{ fontSize: '3rem', color: '#fff', lineHeight: 1.2 }}
              >
                WELCOME TO THE<br/>NEON VEGAS
              </motion.div>
              <p style={{
                color: 'var(--text-secondary)',
                marginTop: '12px',
                fontSize: '1rem',
                letterSpacing: '4px',
                textTransform: 'uppercase',
              }}>
                Enter the Grid
              </p>
            </div>

            {/* Divider */}
            <div style={{
              height: '1px', width: '100%',
              background: 'linear-gradient(90deg, transparent, var(--neon-cyan), var(--neon-purple), transparent)',
              marginBottom: '24px',
              position: 'relative', zIndex: 1,
            }} />

            {/* Google Login Section */}
            {!showForgot && (
              <div style={{ marginBottom: '24px', position: 'relative', zIndex: 1 }}>
                <motion.button
                  type="button"
                  onClick={() => loginWithGoogle()}
                  whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(0, 245, 212, 0.4)' }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(0, 245, 212, 0.5)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    transition: 'all 0.3s'
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M23.5 12.2c0-.8-.1-1.5-.2-2.2H12v4.3h6.5c-.3 1.5-1.1 2.7-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z" fill="#4285F4"/>
                    <path d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.5 1.1-4 1.1-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1C3.4 21.5 7.4 24 12 24z" fill="#34A853"/>
                    <path d="M5.4 14.3c-.2-.7-.4-1.4-.4-2.3s.2-1.6.4-2.3V6.6H1.4c-.9 1.8-1.4 3.9-1.4 6.1s.5 4.3 1.4 6.1l4-3.1z" fill="#FBBC05"/>
                    <path d="M12 4.8c1.7 0 3.3.6 4.6 1.8l3.4-3.4C17.9 1.1 15.2 0 12 0 7.4 0 3.4 2.5 1.4 6.6l4 3.1c.9-2.8 3.5-4.9 6.6-4.9z" fill="#EA4335"/>
                  </svg>
                  <span>Continue with Google</span>
                </motion.button>
                
                <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', letterSpacing: '2px' }}>OR</span>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', zIndex: 1 }}>
              
              {/* Email */}
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="NEURAL HANDLE (USERNAME)"
                  value={username}
                  onChange={e => { setUsername(e.target.value); setFieldErrors(prev => ({ ...prev, email: '' })); }}
                  style={{
                    width: '100%', padding: '16px 20px', borderRadius: '12px',
                    border: fieldBorder('email', 'rgba(0,245,212,0.3)'), background: 'rgba(0,0,0,0.65)',
                    color: 'white', fontSize: '1rem', letterSpacing: '2px', textTransform: 'uppercase',
                    boxShadow: fieldErrors.email ? '0 0 10px rgba(241,91,181,0.3)' : 'inset 0 4px 12px rgba(0,0,0,0.6)',
                    outline: 'none'
                  }}
                />
                {fieldErrors.email && (
                  <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--neon-magenta)', fontSize: '0.7rem', letterSpacing: '1px' }}>
                    {fieldErrors.email}
                  </span>
                )}
              </div>

              {/* Removed redundant public username field for registration */}

              {/* Birthday fields (register or forgot) */}
              {(isRegistering || showForgot) && (
                <div style={{ textAlign: 'left', width: '100%' }}>
                  <label style={{ color: fieldErrors.dob ? 'var(--neon-magenta)' : 'var(--neon-gold)', fontSize: '0.7rem', letterSpacing: '2px', marginLeft: '4px', textTransform: 'uppercase' }}>
                    {showForgot ? 'Verify Birthday' : 'Birth Date (DD/MM/YYYY)'}
                    {fieldErrors.dob && <span style={{ marginLeft: '8px', opacity: 0.8 }}>— {fieldErrors.dob}</span>}
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '6px', marginTop: '4px', width: '100%', boxSizing: 'border-box' }}>
                    <input 
                      ref={dayRef}
                      type="text" placeholder="DD" value={birthDay} 
                      onChange={e => { handleDateChange(e.target.value, 'D'); setFieldErrors(prev => ({ ...prev, dob: '' })); }}
                      style={{ padding: '12px 0', borderRadius: '10px', background: 'rgba(0,0,0,0.7)', border: fieldErrors.dob ? '1.5px solid var(--neon-magenta)' : '1px solid rgba(255,190,11,0.2)', color: 'white', textAlign: 'center', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box', outline: 'none' }} />
                    <input 
                      ref={monthRef}
                      type="text" placeholder="MM" value={birthMonth} 
                      onChange={e => { handleDateChange(e.target.value, 'M'); setFieldErrors(prev => ({ ...prev, dob: '' })); }}
                      style={{ padding: '12px 0', borderRadius: '10px', background: 'rgba(0,0,0,0.7)', border: fieldErrors.dob ? '1.5px solid var(--neon-magenta)' : '1px solid rgba(255,190,11,0.2)', color: 'white', textAlign: 'center', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box', outline: 'none' }} />
                    <input 
                      ref={yearRef}
                      type="text" placeholder="YYYY" value={birthYear} 
                      onChange={e => { handleDateChange(e.target.value, 'Y'); setFieldErrors(prev => ({ ...prev, dob: '' })); }}
                      style={{ padding: '12px 0', borderRadius: '10px', background: 'rgba(0,0,0,0.7)', border: fieldErrors.dob ? '1.5px solid var(--neon-magenta)' : '1px solid rgba(255,190,11,0.2)', color: 'white', textAlign: 'center', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box', outline: 'none' }} />
                  </div>
                </div>
              )}

              {/* Password / New Password */}
              {showForgot ? (
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    placeholder="NEW SECURE PASSWORD"
                    value={newPassword}
                    onChange={e => { setNewPassword(e.target.value); setFieldErrors(prev => ({ ...prev, newPassword: '' })); }}
                    style={{
                      width: '100%', padding: '16px 20px', borderRadius: '12px',
                      border: fieldBorder('newPassword', 'rgba(255,255,255,0.3)'), background: 'rgba(0,0,0,0.65)',
                      color: 'white', fontSize: '1.2rem', letterSpacing: '4px',
                      boxShadow: fieldErrors.newPassword ? '0 0 10px rgba(241,91,181,0.3)' : 'inset 0 4px 12px rgba(0,0,0,0.6)',
                      outline: 'none'
                    }}
                  />
                  {fieldErrors.newPassword && (
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--neon-magenta)', fontSize: '0.7rem', letterSpacing: '1px' }}>
                      {fieldErrors.newPassword}
                    </span>
                  )}
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    placeholder="SECURE PASSWORD"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setFieldErrors(prev => ({ ...prev, password: '' })); }}
                    style={{
                      width: '100%', padding: '16px 20px', borderRadius: '12px',
                      border: fieldBorder('password', 'rgba(241,91,181,0.3)'), background: 'rgba(0,0,0,0.65)',
                      color: 'white', fontSize: '1.2rem', letterSpacing: '4px',
                      boxShadow: fieldErrors.password ? '0 0 10px rgba(241,91,181,0.3)' : 'inset 0 4px 12px rgba(0,0,0,0.6)',
                      outline: 'none'
                    }}
                  />
                  {fieldErrors.password && (
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--neon-magenta)', fontSize: '0.7rem', letterSpacing: '1px' }}>
                      {fieldErrors.password}
                    </span>
                  )}
                </div>
              )}
              
              {/* ── Alert Pop-up ── */}
              <AnimatePresence>
                {alert && (
                  <AlertPopup alert={alert} onDismiss={() => setAlert(null)} />
                )}
              </AnimatePresence>

              <motion.button type="submit" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className={`neon-button ${showForgot ? 'gold' : isRegistering ? 'magenta' : 'cyan'}`}
                style={{ width: '100%', padding: '16px', fontSize: '1.1rem', marginTop: '10px' }}>
                {showForgot ? 'RESET PASSWORD →' : isRegistering ? 'INITIALIZE ACCOUNT →' : 'JACK IN →'}
              </motion.button>
            </form>

            {/* Recovery Toggle */}
            {!isRegistering && (
              <div style={{ marginTop: '16px' }}>
                <button 
                  type="button"
                  onClick={() => { setShowForgot(!showForgot); clearState(); }}
                  style={{ 
                    background:'none', border:'none', color:'rgba(255,255,255,0.5)', 
                    fontSize:'0.8rem', cursor:'pointer'
                  }}>
                  {showForgot ? '← Back to Login' : 'Forgot password? Verify identity'}
                </button>
              </div>
            )}

            {/* Toggle Mode */}
            <div style={{ marginTop: '24px', position: 'relative', zIndex: 1 }}>
              <button 
                type="button"
                onClick={() => { setIsRegistering(!isRegistering); setShowForgot(false); clearState(); setBirthDay(''); setBirthMonth(''); setBirthYear(''); }}
                style={{ 
                  background:'none', border:'none', color:'var(--text-secondary)', 
                  fontSize:'0.9rem', cursor:'pointer', borderBottom:'1px dashed var(--text-secondary)',
                  paddingBottom:'2px'
                }}>
                {isRegistering ? 'Already in the system? Log In' : 'New to Neon Vegas? Click to Register'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mute/Unmute Toggle Button ── */}
      <button 
        onClick={() => setIsMuted(!isMuted)}
        style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 100,
          background: 'rgba(0,0,0,0.4)', border: '1px solid var(--neon-gold)',
          borderRadius: '50%', width: '44px', height: '44px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--neon-gold)', boxShadow: '0 0 15px rgba(255,190,11,0.3)',
          transition: 'all 0.3s'
        }}
      >
        <span style={{ fontSize: '1.2rem' }}>{isMuted ? '🔇' : '🔊'}</span>
      </button>

      {/* ── Cinematic Splash Screen (Neural Link Unlocker) ── */}
      <AnimatePresence>
        {!isUnlocked.current && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, filter: 'blur(20px) brightness(2)', scale: 1.1 }}
            transition={{ duration: 0.8, ease: 'circOut' }}
            onClick={() => {
              // Explicitly unlock and play audio on click anywhere
              if (audioCtx.current && gainNode.current) {
                isUnlocked.current = true;
                if (audioCtx.current.state === 'suspended') audioCtx.current.resume();
                setIsMuted(false);
                gainNode.current.gain.setTargetAtTime(0.6, audioCtx.current.currentTime, 0.4);
                // Force a re-render to hide overlay
                setUsername(prev => prev); 
              }
            }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: '#050205',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            {/* Scanning Grid lines */}
            <div style={{ position: 'absolute', inset: 0, opacity: 0.1, background: 'linear-gradient(rgba(155,93,229,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(155,93,229,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ textAlign: 'center', zIndex: 1 }}
            >
              <div className="orbitron-font" style={{ color: 'var(--neon-purple)', fontSize: '0.8rem', letterSpacing: '8px', marginBottom: '24px' }}>
                NEURAL LINK STATUS: PENDING...
              </div>
              <div className="title-font" style={{ fontSize: '3.5rem', color: '#fff', textShadow: '0 0 20px rgba(155,93,229,0.5)', letterSpacing: '12px', marginBottom: '40px' }}>
                NEON VEGAS
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
                <div style={{ width: '60px', height: '1px', background: 'linear-gradient(90deg, transparent, var(--neon-cyan))' }} />
                <div className="cinzel-font" style={{ color: 'var(--neon-gold)', fontSize: '1.2rem', letterSpacing: '4px' }}>
                  CLICK TO CONNECT
                </div>
                <div style={{ width: '60px', height: '1px', background: 'linear-gradient(270deg, transparent, var(--neon-cyan))' }} />
              </div>
            </motion.div>

            {/* Subtle Glitch Decors */}
            <div style={{ position: 'absolute', bottom: '40px', left: '40px', color: 'rgba(255,255,255,0.1)', fontSize: '0.6rem', fontFamily: 'monospace' }}>
              LOC_ID: LAS_VEGAS_GRID_449<br/>ESTABLISHING ENCRYPTED TUNNEL...
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
