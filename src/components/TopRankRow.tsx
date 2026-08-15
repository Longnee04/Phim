'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { MovieItem } from '@/types/movie';
import { getImageUrl } from '@/lib/api';

interface TopRankRowProps {
  title: string;
  movies: MovieItem[];
}

export default function TopRankRow({ title, movies }: TopRankRowProps) {
  const sliderRef = useRef<HTMLDivElement>(null);

  if (!movies || movies.length === 0) return null;

  const top10 = movies.slice(0, 10);

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
    <section className="row row--top10" id="section-top10">
      <div className="row__header">
        <h2 className="row__title">{title}</h2>
        <div className="row__pagination-dots">
          <span className="row__dot active" />
          <span className="row__dot" />
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
          style={{ overflowX: 'auto', scrollBehavior: 'smooth' }}
        >
          <div className="row__track" style={{ display: 'flex', gap: 12 }}>
            {top10.map((movie, idx) => {
              const rank = idx + 1;
              const poster = getImageUrl(movie.poster_url || movie.thumb_url);

              return (
                <Link
                  key={movie.slug}
                  href={`/phim/${movie.slug}`}
                  className="top10-card"
                  style={{ textDecoration: 'none' }}
                >
                  <div className="top10-card__number">{rank}</div>
                  <img
                    className="top10-card__poster"
                    src={poster}
                    alt={movie.name}
                    loading="lazy"
                    style={{ objectFit: 'cover', objectPosition: 'center center' }}
                  />
                </Link>
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
