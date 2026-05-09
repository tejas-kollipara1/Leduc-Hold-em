// Simple Web Audio API Synthesizer for Casino Sounds

const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
let audioCtx: AudioContext | null = null;

const getCtx = () => {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

export const playClick = () => {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    // A crisp, glassy high-pitched tick
    osc.type = 'sine';
    osc.frequency.setValueAtTime(3500, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.03);
    
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.03);
  } catch (e) {
    // ignore
  }
};

export const playBet = () => {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    // A soft, warm UI bubble pop (using sine instead of harsh square)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.06);
    
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  } catch (e) {
    // ignore
  }
};
export const playChip = () => {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    
    // High-pitched ceramic chip clack
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(3200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1500, ctx.currentTime + 0.05);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1800, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.05);
    
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    
    osc.start();
    osc2.start();
    osc.stop(ctx.currentTime + 0.05);
    osc2.stop(ctx.currentTime + 0.05);
  } catch (e) {
    // ignore
  }
};

export const playCardFlip = () => {
  try {
    const ctx = getCtx();
    
    // We use a noise buffer for the "swish" of a card
    const bufferSize = ctx.sampleRate * 0.1; // 100ms
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        // Brown noise approximation
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2)); 
    }
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    // Filter to make it sound like thick paper snapping
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(4000, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    noise.start();
  } catch (e) {
    // ignore
  }
};

export const playCardShuffle = () => {
  // A shuffle is just a rapid sequence of flips
  for (let i = 0; i < 8; i++) {
    setTimeout(playCardFlip, i * 40 + Math.random() * 10);
  }
};
export const playWin = () => {
  try {
    const audio = new Audio('/freesound_community-goodresult-82807.mp3');
    audio.volume = 0.6;
    audio.play().catch(() => {});
  } catch (e) {
    // ignore
  }
};

export const playLose = () => {
  try {
    const audio = new Audio('/mixkit-player-losing-or-failing-2042.wav');
    audio.volume = 0.6;
    audio.play().catch(() => {});
  } catch (e) {
    // ignore
  }
};

// Returns a function to stop the noise if interupted (e.g. leaving page)
export const playSpinNoise = (): () => void => {
  try {
    const audio = new Audio('/spinopel-a-roulette-ball-429831.mp3');
    audio.loop = false; // We want the specific 8.2s climax to play once
    audio.volume = 0.5;
    audio.play().catch(() => {});
    
    return () => {
      try {
        // We only pause if forced (like leaving the game)
        // Normally, we let the 8.2s clip finish for atmospheric effect
        audio.pause();
      } catch (e) {
         // ignore
      }
    };
  } catch (e) {
    return () => {}; 
  }
};

export const playSlotSpin = (rate: number = 1.0): () => void => {
  try {
    const audio = new Audio('/floraphonic-jackpot-slot-machine-coin-loop-4-216032.mp3');
    audio.loop = true;
    audio.volume = 0.6;
    audio.playbackRate = rate;
    audio.play().catch(() => {});
    
    return () => {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch (e) {
         // ignore
      }
    };
  } catch (e) {
    return () => {};
  }
};

// Simulates the erratic clattering of dice on a felt table
export const playDiceRoll = (): () => void => {
  try {
    const ctx = getCtx();
    const activeSources: (OscillatorNode | AudioBufferSourceNode)[] = [];
    
    const playClack = () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(100 + Math.random() * 200, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
      activeSources.push(osc);
    };

    const interval = setInterval(playClack, 100);
    
    return () => {
      clearInterval(interval);
      activeSources.forEach(s => { try { s.stop(); } catch(e){} });
    };
  } catch (e) {
    return () => {};
  }
};

export const playReelStop = () => {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    // A heavy, percussive mechanical "thud"
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {
    // ignore
  }
};
