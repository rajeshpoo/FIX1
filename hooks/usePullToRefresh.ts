// FIX: Import React to provide the namespace for React.TouchEvent
import React, { useState, useRef, useCallback } from 'react';
import { hapticFeedback } from '../utils/haptics';

export const PULL_THRESHOLD = 80; // px to trigger refresh

/**
 * A custom React hook to implement "Pull to Refresh" functionality.
 * @param onRefresh The async function to call when a refresh is triggered.
 */
export const usePullToRefresh = (onRefresh: () => Promise<any>) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullPosition, setPullPosition] = useState(0);
  const touchStartRef = useRef(0);
  const isPullingRef = useRef(false);
  const scrollableRef = useRef<HTMLDivElement | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    scrollableRef.current = e.currentTarget;
    if (scrollableRef.current.scrollTop === 0) {
      isPullingRef.current = true;
      touchStartRef.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!isPullingRef.current) return;
    
    const deltaY = e.touches[0].clientY - touchStartRef.current;
    
    if (deltaY < 0) {
      // If user starts scrolling up, cancel the pull
      isPullingRef.current = false;
      setPullPosition(0);
      return;
    }

    // Prevent native scroll/overscroll behavior while pulling
    e.preventDefault();

    // Use a resistance function to make the pull feel more natural
    const resistedPull = Math.pow(deltaY, 0.85);
    setPullPosition(resistedPull);
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;

    if (pullPosition > PULL_THRESHOLD) {
      hapticFeedback();
      setIsRefreshing(true);
      setPullPosition(60); // Keep indicator visible at a fixed position
      try {
        await onRefresh();
      } catch (err) {
        console.error("Refresh failed", err);
      } finally {
        // Smoothly animate out after refresh is complete
        setTimeout(() => {
          setIsRefreshing(false);
          setPullPosition(0);
        }, 300);
      }
    } else {
      // Animate out if threshold not met
      setPullPosition(0);
    }
  }, [pullPosition, onRefresh]);

  return {
    isRefreshing,
    pullPosition,
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
};