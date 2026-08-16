'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useWatchHistory } from '@/hooks/useWatchHistory';
import { getImageUrl } from '@/lib/api';
import { useDraggableScroll } from '@/hooks/useDraggableScroll';

export function ContinueWatching() {
  const router = useRouter();
  const { history, isLoaded, removeFromHistory } = useWatchHistory();
  const { ref: sliderRef, scroll, isGrabbing } = useDraggableScroll<HTMLDivElement>();

  if (!isLoaded || history.length === 0) return null;

  const formatTime = (seconds: number) => {
    if (!seconds || seconds <= 0) return '';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <section className="row continue-watching-section" style={{ display: 'block', margin: '20px 0 36px' }}>
      <div className="row__header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 var(--row-pad, 24px)', marginBottom: '14px' }}>
        <h2 className="row__title" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <i className="fas fa-clock-rotate-left" style={{ color: 'var(--red, #e50914)' }}></i>
          <span>Tiếp tục xem</span>
        </h2>
        <span style={{ fontSize: '0.8rem', color: 'var(--t2, #a3a3a3)' }}>
          {history.length} phim đang xem dở
        </span>
      </div>

      <div className="row__slider-wrap" style={{ position: 'relative' }}>
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
          style={{
            overflowX: 'auto',
            scrollBehavior: 'smooth',
            padding: '10px var(--row-pad, 24px)',
            WebkitOverflowScrolling: 'touch',
            cursor: isGrabbing ? 'grabbing' : 'grab',
            userSelect: 'none',
          }}
        >
          <div className="row__track" style={{ display: 'flex', gap: '14px' }}>
            {history.map((item) => {
              const poster = getImageUrl(item.poster_url || item.thumb_url);
              const progressPct =
                item.duration > 0
                  ? Math.min(100, Math.max(5, (item.current_time / item.duration) * 100))
                  : item.current_time > 0
                  ? 40
                  : 15;

              const targetUrl = `/xem-phim/${item.slug}${
                item.episode_slug ? `?tap=${item.episode_slug}&server=${item.server_index || 0}` : ''
              }`;

              return (
                <div
                  key={item.slug}
                  className="continue-card"
                  style={{
                    position: 'relative',
                    flex: '0 0 200px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    background: '#181818',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                    cursor: 'pointer',
                    transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05) translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 16px 36px rgba(0,0,0,0.9)';
                    e.currentTarget.style.zIndex = '5';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1) translateY(0)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.6)';
                    e.currentTarget.style.zIndex = '1';
                  }}
                  onClick={() => router.push(targetUrl)}
                >
                  {/* Poster Image Container */}
                  <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden' }}>
                    <img
                      src={poster}
                      alt={item.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center center' }}
                    />

                    {/* Dark gradient overlay */}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 100%)',
                      }}
                    />

                    {/* Quick Play Icon in Center */}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          background: 'rgba(229,9,20,0.85)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1rem',
                          boxShadow: '0 4px 16px rgba(229,9,20,0.6)',
                          transition: 'transform 0.2s',
                        }}
                      >
                        <i className="fas fa-play" style={{ marginLeft: '2px' }}></i>
                      </div>
                    </div>

                    {/* Remove button at Top-Right */}
                    <button
                      type="button"
                      title="Xóa khỏi danh sách xem dở"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeFromHistory(item.slug);
                      }}
                      style={{
                        position: 'absolute',
                        top: '6px',
                        right: '6px',
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.7)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        zIndex: 10,
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--red, #e50914)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(0,0,0,0.7)';
                      }}
                    >
                      <i className="fas fa-times"></i>
                    </button>

                    {/* Progress Bar at Bottom of Poster */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '4px',
                        background: 'rgba(255,255,255,0.3)',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${progressPct}%`,
                          background: 'var(--red, #e50914)',
                          borderRadius: '0 2px 2px 0',
                        }}
                      />
                    </div>
                  </div>

                  {/* Card Info Area */}
                  <div style={{ padding: '10px 12px' }}>
                    <div
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: '#fff',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                        marginBottom: '4px',
                      }}
                    >
                      {item.name}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.75rem',
                        color: 'var(--t2, #a3a3a3)',
                      }}
                    >
                      <span style={{ color: '#46d369', fontWeight: 700 }}>
                        {item.episode_name || 'Tập 01'}
                      </span>
                      {item.current_time > 0 && (
                        <span>{formatTime(item.current_time)}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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
