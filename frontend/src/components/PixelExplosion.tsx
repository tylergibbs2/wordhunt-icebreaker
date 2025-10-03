import React, { useEffect, useRef } from 'react';
import './PixelExplosion.css';

interface PixelExplosionProps {
  x: number;
  y: number;
  color: string;
  onComplete: () => void;
}

export const PixelExplosion: React.FC<PixelExplosionProps> = ({
  x,
  y,
  color,
  onComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Auto-cleanup after effect
    cleanupTimerRef.current = setTimeout(() => {
      onComplete();
    }, 400); // Match the animation duration

    return () => {
      if (cleanupTimerRef.current) {
        clearTimeout(cleanupTimerRef.current);
      }
    };
  }, [onComplete]);

  return (
    <div
      ref={containerRef}
      className="retro-glitch-effect"
      style={{
        position: 'absolute',
        left: x - 25, // Center the effect
        top: y - 25,
        width: '50px',
        height: '50px',
        pointerEvents: 'none',
        zIndex: 1000,
        backgroundColor: color,
      }}
    />
  );
};
