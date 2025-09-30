import React, { useEffect, useState, useRef } from 'react';
import './ErrorPopup.css';

interface ErrorPopupProps {
  message: string;
  position: { x: number; y: number };
  onComplete: () => void;
}

export const ErrorPopup: React.FC<ErrorPopupProps> = ({
  message,
  position,
  onComplete,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [rotation] = useState(() => (Math.random() - 0.5) * 20); // Random rotation between -10 and 10 degrees
  const animationRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);

  // Update the ref when onComplete changes
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Easing function for smooth animation
  const easeOutCubic = (t: number): number => {
    return 1 - Math.pow(1 - t, 3);
  };

  useEffect(() => {
    // Start fade out after 1 second (shorter duration)
    const fadeTimer = setTimeout(() => {
      setIsVisible(false);
    }, 1000);

    // Complete animation after 1.5 seconds total (shorter)
    const completeTimer = setTimeout(() => {
      onCompleteRef.current();
    }, 1500);

    // Smooth animation loop for floating effect
    const startTime = Date.now();
    const duration = 1500; // 1.5 seconds (shorter)

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const rawProgress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(rawProgress);

      setAnimationProgress(easedProgress);

      if (rawProgress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []); // Empty dependency array - only run once on mount

  // Calculate floating animation values with smooth easing
  const translateY = animationProgress * -40; // Float up 40px
  const scale = 1 + Math.sin(animationProgress * Math.PI) * 0.15; // Smooth scale up and down

  return (
    <div
      className={`error-popup ${isVisible ? 'visible' : 'fading'}`}
      style={{
        left: position.x,
        top: position.y,
        transform: `rotate(${rotation}deg) translateY(${translateY}px) scale(${scale})`,
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.5s ease-out',
      }}
    >
      <span className="error-icon">✕</span>
      {message}
    </div>
  );
};
