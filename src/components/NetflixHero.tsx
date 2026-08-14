'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MovieItem } from '@/types/movie';
import { getImageUrl } from '@/lib/api';
import { useModal } from '@/context/ModalContext';

interface NetflixHeroProps {
  movies?: MovieItem[];
  movie?: MovieItem;
}

const BILLBOARD_MS = 8000;

export default function NetflixHero({ movies = [], movie }: NetflixHeroProps) {
  const { openModal } = useModal();

  const heroList = movies.length > 0 ? movies.slice(0, 6) : movie ? [movie] : [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  const currentMovie = heroList[currentIndex] || heroList[0];

  // Auto rotation timer & progress bar
  useEffect(() => {
    if (heroList.length <= 1 || isPaused) return;

    const interval = 100;
    const step = (interval / BILLBOARD_MS) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentIndex((idx) => (idx + 1) % heroList.length);
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [heroList.length, isPaused, currentIndex]);

  if (!currentMovie) return null;

  const backdrop = getImageUrl(currentMovie.thumb_url || currentMovie.poster_url);

  return (
    <header
      className="billboard"
      id="billboard"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        className="billboard__bg"
        id="billboard-bg"
        style={{
          backgroundImage: `url(${backdrop})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 20%',
          opacity: 1,
        }}
      />
      <div
        className="billboard__ambient"
        id="billboard-ambient"
        style={{
          backgroundImage: `url(${backdrop})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 20%',
          opacity: 0.6,
        }}
      />
      <div className="billboard__vignette"></div>
      <div className="billboard__gradient-bottom"></div>

      <div className="billboard__content">
        <span className="billboard__badge">
          <i className="fas fa-fire-flame-curved"></i> TOP 10 hôm nay
        </span>
        <h1 className="billboard__title" id="billboard-title">
          {currentMovie.name}
        </h1>
        <p className="billboard__desc" id="billboard-desc">
          {currentMovie.content
            ? currentMovie.content.replace(/<[^>]*>?/gm, '')
            : currentMovie.origin_name || 'Khám phá ngay bộ phim bom tấn đỉnh cao với hình ảnh sắc nét và âm thanh sống động tại LPhim.'}
        </p>
        <div className="billboard__actions">
          <Link
            href={`/xem-phim/${currentMovie.slug}`}
            className="btn btn--play"
            id="billboard-play"
          >
            <i className="fas fa-play"></i> Phát
          </Link>
          <button
            className="btn btn--more"
            id="billboard-info"
            type="button"
            onClick={() => openModal(currentMovie.slug, false)}
          >
            <i className="fas fa-info-circle"></i> Thông tin khác
          </button>
        </div>
      </div>

      <div className="billboard__controls">
        {heroList.length > 1 && (
          <div className="billboard__dots" id="billboard-dots">
            {heroList.map((_, idx) => (
              <button
                key={idx}
                className={`billboard__dot ${currentIndex === idx ? 'active' : ''}`}
                type="button"
                aria-label={`Slide ${idx + 1}`}
                onClick={() => {
                  setCurrentIndex(idx);
                  setProgress(0);
                }}
              />
            ))}
          </div>
        )}
        <span className="billboard__age">18+</span>
      </div>

      <div className="billboard__timer">
        <div
          className="billboard__timer-fill"
          id="billboard-timer-fill"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </header>
  );
}
