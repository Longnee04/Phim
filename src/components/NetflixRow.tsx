'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { MovieItem } from '@/types/movie';
import NetflixMovieCard from './NetflixMovieCard';

interface NetflixRowProps {
  title: string;
  viewAllLink?: string;
  movies: MovieItem[];
}

export default function NetflixRow({ title, viewAllLink, movies }: NetflixRowProps) {
  const sliderRef = useRef<HTMLDivElement>(null);

  if (!movies || movies.length === 0) return null;

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
    <section className="row">
      <div className="row__header">
        {viewAllLink ? (
          <Link href={viewAllLink} className="row__title">
            {title} <i className="fas fa-chevron-right" style={{ fontSize: '0.8rem' }}></i>
          </Link>
        ) : (
          <h2 className="row__title">{title}</h2>
        )}
        <div className="row__pagination-dots">
          <span className="row__dot active" />
          <span className="row__dot" />
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
          style={{ overflowX: 'auto', scrollBehavior: 'smooth', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
        >
          <div className="row__track" style={{ display: 'flex', gap: 10 }}>
            {movies.map((movie) => (
              <NetflixMovieCard key={movie.slug} movie={movie} />
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
