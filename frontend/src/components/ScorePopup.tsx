import React, { useEffect, useState, useRef } from 'react';
import './ScorePopup.css';

interface ScorePopupProps {
  score: number;
  position: { x: number; y: number };
  onComplete: () => void;
}

export const ScorePopup: React.FC<ScorePopupProps> = ({
  score,
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

  // Determine score tier and effects
  const getScoreTier = (score: number) => {
    if (score >= 700) return 'legendary';
    if (score >= 500) return 'epic';
    if (score >= 400) return 'rare';
    if (score >= 300) return 'uncommon';
    return 'common';
  };

  const scoreTier = getScoreTier(score);

  // Easing function for smooth animation
  const easeOutCubic = (t: number): number => {
    return 1 - Math.pow(1 - t, 3);
  };

  useEffect(() => {
    // Start fade out after 1 second
    const fadeTimer = setTimeout(() => {
      setIsVisible(false);
    }, 1000);

    // Complete animation after 2 seconds total
    const completeTimer = setTimeout(() => {
      onCompleteRef.current();
    }, 2000);

    // Smooth animation loop for floating effect
    const startTime = Date.now();
    const duration = 2000; // 2 seconds

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
      className={`score-popup ${scoreTier} ${isVisible ? 'visible' : 'fading'}`}
      style={{
        left: position.x,
        top: position.y,
        transform: `rotate(${rotation}deg) translateY(${translateY}px) scale(${scale})`,
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.5s ease-out',
      }}
    >
      +{score}
    </div>
  );
};
