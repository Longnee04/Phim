'use client';

import React, { useRef } from 'react';
import { useWatchHistory } from '@/hooks/useWatchHistory';
import { getImageUrl } from '@/lib/api';
import { useModal } from '@/context/ModalContext';

export function ContinueWatching() {
  const { history, isLoaded, removeFromHistory } = useWatchHistory();
  const { openModal } = useModal();
  const sliderRef = useRef<HTMLDivElement>(null);

  if (!isLoaded || history.length === 0) return null;

  const scroll = (direction: 'left' | 'right') => {
    if (sliderRef.current) {
      const { scrollLeft, clientWidth } = sliderRef.current;
      const scrollAmount = clientWidth * 0.85;
      sliderRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section className="row" id="section-history" style={{ display: 'block' }}>
      <div className="row__header">
        <h2 className="row__title">
          <i className="fas fa-clock-rotate-left"></i> Tiếp tục xem
        </h2>
        <div className="row__pagination-dots" id="dots-history">
          <span className="row__dot active" />
        </div>
      </div>

      <div className="row__slider-wrap">
        <button
          className="row__arrow row__arrow--left"
          type="button"
          aria-label="Previous"
          onClick={() => scroll('left')}
        >
          <i className="fas fa-chevron-left"></i>
        </button>

        <div
          ref={sliderRef}
          className="row__slider"
          id="slider-history"
          style={{ overflowX: 'auto', scrollBehavior: 'smooth' }}
        >
          <div className="row__track" id="track-history" style={{ display: 'flex', gap: 6 }}>
            {history.map((item) => (
              <div
                key={item.slug}
                className="card"
                onClick={() => openModal(item.slug, true)}
              >
                <button
                  className="card__remove"
                  type="button"
                  title="Xóa khỏi lịch sử xem"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removeFromHistory(item.slug);
                  }}
                >
                  <i className="fas fa-trash-can"></i>
                </button>
                <img
                  className="card__img"
                  src={getImageUrl(item.poster_url || item.thumb_url)}
                  alt={item.name}
                  loading="lazy"
                />
                <div className="card__history-ep">
                  {item.episode_name || 'Đang xem'}
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          className="row__arrow row__arrow--right"
          type="button"
          aria-label="Next"
          onClick={() => scroll('right')}
        >
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>
    </section>
  );
}
