'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

/**
 * useDraggableScroll
 * Enables butter-smooth drag-to-scroll on Desktop (mouse)
 * and frictionless momentum swipe on Mobile (touch).
 */
export function useDraggableScroll<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const isDragging = useRef(false);
  const [isGrabbing, setIsGrabbing] = useState(false);

  useEffect(() => {
    const slider = ref.current;
    if (!slider) return;

    const handleMouseDown = (e: MouseEvent) => {
      // Only handle left mouse click
      if (e.button !== 0) return;
      isDown.current = true;
      isDragging.current = false;
      startX.current = e.pageX - slider.offsetLeft;
      scrollLeft.current = slider.scrollLeft;
      setIsGrabbing(true);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown.current) return;
      const x = e.pageX - slider.offsetLeft;
      const walk = (x - startX.current) * 1.4; // smooth swipe multiplier

      if (Math.abs(walk) > 5) {
        isDragging.current = true;
      }

      slider.scrollLeft = scrollLeft.current - walk;
    };

    const handleMouseUp = () => {
      isDown.current = false;
      setIsGrabbing(false);
      // Small timeout so click handlers know we dragged
      setTimeout(() => {
        isDragging.current = false;
      }, 50);
    };

    const handleMouseLeave = () => {
      isDown.current = false;
      setIsGrabbing(false);
      isDragging.current = false;
    };

    // Prevent accidental clicks on movie cards when user was dragging/swiping
    const handleClickCapture = (e: MouseEvent) => {
      if (isDragging.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    slider.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    slider.addEventListener('mouseleave', handleMouseLeave);
    slider.addEventListener('click', handleClickCapture, true);

    return () => {
      slider.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      slider.removeEventListener('mouseleave', handleMouseLeave);
      slider.removeEventListener('click', handleClickCapture, true);
    };
  }, []);

  const scroll = useCallback((direction: 'left' | 'right') => {
    if (ref.current) {
      const { scrollLeft: currentLeft, clientWidth } = ref.current;
      const scrollAmount = Math.max(300, clientWidth * 0.75);
      ref.current.scrollTo({
        left: direction === 'left' ? currentLeft - scrollAmount : currentLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  }, []);

  return { ref, scroll, isGrabbing };
}
