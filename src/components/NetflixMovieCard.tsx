'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { MovieItem } from '@/types/movie';
import { getImageUrl } from '@/lib/api';
import { useMyList } from '@/hooks/useMyList';

interface NetflixMovieCardProps {
  movie: MovieItem;
}

export default function NetflixMovieCard({ movie }: NetflixMovieCardProps) {
  const router = useRouter();
  const { isInMyList, toggleMyList } = useMyList();
  const isSaved = isInMyList(movie.slug);

  const poster = getImageUrl(movie.poster_url || movie.thumb_url);

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleMyList({
      slug: movie.slug,
      name: movie.name,
      origin_name: movie.origin_name || '',
      poster_url: movie.poster_url || '',
      thumb_url: movie.thumb_url || '',
      quality: movie.quality || '',
      lang: movie.lang || '',
      episode_current: movie.episode_current || '',
      year: movie.year || 0,
    });
  };

  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push(`/phim/${movie.slug}`);
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/xem-phim/${movie.slug}`);
  };

  return (
    <div
      className="card"
      onClick={handleCardClick}
      style={{
        position: 'relative',
        borderRadius: '10px',
        overflow: 'hidden',
        background: '#181822',
        cursor: 'pointer',
        aspectRatio: '2/3',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s, border-color 0.3s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-6px) scale(1.03)';
        e.currentTarget.style.boxShadow = '0 16px 36px rgba(229,9,20,0.25), 0 0 0 1px rgba(229,9,20,0.4)';
        e.currentTarget.style.borderColor = 'rgba(229,9,20,0.5)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.6)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
      }}
    >
      {/* Poster Image */}
      <img
        src={poster}
        alt={movie.name}
        loading="lazy"
        onError={(e) => {
          const target = e.currentTarget;
          if (movie.thumb_url && target.src !== movie.thumb_url) {
            target.src = movie.thumb_url;
          } else {
            target.src = 'https://placehold.co/300x450/141414/e50914?text=LPHIM';
          }
        }}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center center',
          display: 'block',
        }}
      />

      {/* Top Badges (Quality & Episode) */}
      <div
        style={{
          position: 'absolute',
          top: '8px',
          left: '8px',
          right: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 2,
          pointerEvents: 'none',
        }}
      >
        {movie.quality ? (
          <span
            style={{
              background: 'var(--red, #e50914)',
              color: '#fff',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '0.68rem',
              fontWeight: 800,
              boxShadow: '0 2px 6px rgba(0,0,0,0.6)',
            }}
          >
            {movie.quality}
          </span>
        ) : <span />}

        {movie.episode_current ? (
          <span
            style={{
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(6px)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#46d369',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '0.68rem',
              fontWeight: 700,
            }}
          >
            {movie.episode_current}
          </span>
        ) : null}
      </div>

      {/* ALWAYS-VISIBLE Gradient Caption at Bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '36px 10px 10px',
          background: 'linear-gradient(180deg, transparent 0%, rgba(10,10,15,0.7) 35%, rgba(10,10,15,0.98) 100%)',
          zIndex: 3,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
        }}
      >
        {/* Vietnamese Movie Title (Always Visible) */}
        <div
          style={{
            fontSize: '0.88rem',
            fontWeight: 800,
            color: '#fff',
            lineHeight: 1.3,
            marginBottom: '4px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textShadow: '0 2px 8px rgba(0,0,0,0.9)',
          }}
          title={movie.name}
        >
          {movie.name}
        </div>

        {/* Subtitle / Meta row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.72rem',
            color: 'var(--t2, #a3a3a3)',
            fontWeight: 600,
          }}
        >
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '75%' }}>
            {movie.origin_name || (movie.category?.[0]?.name || 'Phim HD')}
          </span>
          {movie.year && (
            <span style={{ color: '#888' }}>{movie.year}</span>
          )}
        </div>
      </div>
    </div>
  );
}
