'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

/**
 * useDraggableScroll
 * Enables butter-smooth drag-to-scroll on Desktop (mouse)
 * and leaves native touch scrolling 100% free and responsive on Mobile.
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

    // Only attach mouse drag on devices with a mouse cursor (pointer: fine)
    const isMouseDevice = window.matchMedia('(pointer: fine)').matches;
    if (!isMouseDevice) return;

    const handleMouseDown = (e: MouseEvent) => {
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
      const walk = (x - startX.current) * 1.5;

      if (Math.abs(walk) > 6) {
        isDragging.current = true;
      }

      slider.scrollLeft = scrollLeft.current - walk;
    };

    const handleMouseUp = () => {
      isDown.current = false;
      setIsGrabbing(false);
      setTimeout(() => {
        isDragging.current = false;
      }, 50);
    };

    const handleMouseLeave = () => {
      isDown.current = false;
      setIsGrabbing(false);
      isDragging.current = false;
    };

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
      const scrollAmount = Math.max(220, clientWidth * 0.7);
      ref.current.scrollTo({
        left: direction === 'left' ? currentLeft - scrollAmount : currentLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  }, []);

  return { ref, scroll, isGrabbing };
}
