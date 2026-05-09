import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VideoTransitionProps {
  src: string;
  onComplete: () => void;
  isVisible: boolean;
  startTime?: number;
  endTime?: number;
}

export const VideoTransition: React.FC<VideoTransitionProps> = ({ 
  src, 
  onComplete, 
  isVisible,
  startTime = 0,
  endTime
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isVisible && videoRef.current) {
      videoRef.current.currentTime = startTime;
      videoRef.current.play().catch(err => {
        console.error("Video playback failed:", err);
        setTimeout(onComplete, 1000);
      });
    }
  }, [isVisible, startTime, onComplete]);

  const handleTimeUpdate = () => {
    if (videoRef.current && endTime && videoRef.current.currentTime >= endTime) {
      onComplete();
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ 
            opacity: [1, 0.8, 1, 0, 1, 0],
            scale: [1, 1.05, 0.98, 1.1, 1],
            filter: [
              'none', 
              'hue-rotate(90deg) brightness(1.5)', 
              'none', 
              'invert(1) brightness(2)', 
              'none'
            ],
            transition: { duration: 0.4, times: [0, 0.2, 0.4, 0.6, 0.8, 1] }
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: '#000',
            overflow: 'hidden'
          }}
        >
          {/* Main Video */}
          <video
            ref={videoRef}
            src={src}
            onEnded={onComplete}
            onTimeUpdate={handleTimeUpdate}
            muted={false}
            autoPlay
            style={{
              width: '100%',
              height: '108vh',
              objectFit: 'cover',
              position: 'absolute',
              top: '-8vh',
              left: 0
            }}
            playsInline
          />
          
          {/* Glitch Overlay Flash */}
          <motion.div
            initial={{ opacity: 0 }}
            exit={{ 
              opacity: [0, 1, 0, 1, 0],
              backgroundColor: ['transparent', '#fff', '#0ff', '#f0f', 'transparent'],
              transition: { duration: 0.3 }
            }}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10000 }}
          />

          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.5) 100%)',
            pointerEvents: 'none'
          }} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
