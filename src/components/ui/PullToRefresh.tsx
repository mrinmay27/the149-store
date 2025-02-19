import React, { useState, useRef, useEffect } from 'react';
import { haptics } from '@/lib/haptics';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const threshold = 80; // Distance required to trigger refresh

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let startY = 0;
    let isAtTop = false;

    const handleTouchStart = (e: TouchEvent) => {
      isAtTop = window.scrollY === 0;
      if (isAtTop) {
        startY = e.touches[0].clientY;
        touchStartY.current = startY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isAtTop || isRefreshing) return;

      const touch = e.touches[0];
      const distance = touch.clientY - startY;

      if (distance > 0) {
        // Add resistance to the pull
        const newDistance = Math.min(distance * 0.5, threshold * 1.5);
        setPullDistance(newDistance);

        // Provide haptic feedback at threshold
        if (newDistance >= threshold && pullDistance < threshold) {
          haptics.light();
        }
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        haptics.success();
        
        try {
          await onRefresh();
        } catch (error) {
          console.error('Refresh failed:', error);
          haptics.error();
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isRefreshing, pullDistance, onRefresh]);

  return (
    <div
      ref={containerRef}
      style={{ 
        minHeight: '100%', 
        position: 'relative',
        overflowX: 'hidden',
        touchAction: 'pan-x pinch-zoom'
      }}
    >
      {(pullDistance > 0 || isRefreshing) && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: `${Math.max(pullDistance, isRefreshing ? threshold : 0)}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: isRefreshing ? 'none' : 'height 0.2s ease',
            backgroundColor: 'rgba(0, 0, 0, 0.05)',
            overflow: 'hidden',
            pointerEvents: 'none'
          }}
        >
          <div
            className={`w-6 h-6 border-2 border-primary border-t-transparent rounded-full ${
              isRefreshing ? 'animate-spin' : ''
            }`}
            style={{
              transform: isRefreshing ? 'none' : `rotate(${(pullDistance / threshold) * 360}deg)`,
              transition: 'transform 0.2s ease'
            }}
          />
        </div>
      )}
      <div 
        style={{ 
          transform: `translateY(${Math.max(pullDistance, isRefreshing ? threshold : 0)}px)`,
          transition: pullDistance === 0 ? 'transform 0.2s ease' : 'none',
          willChange: 'transform'
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh; 