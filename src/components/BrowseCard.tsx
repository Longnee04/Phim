'use client';

import React from 'react';
import Link from 'next/link';
import { MovieItem } from '@/types/movie';
import { getImageUrl } from '@/lib/api';

interface BrowseCardProps {
  movie: MovieItem;
}

export function BrowseCard({ movie }: BrowseCardProps) {
  const poster = getImageUrl(movie.poster_url || movie.thumb_url);

  return (
    <Link
      href={`/phim/${movie.slug}`}
      className="browse__card"
      style={{
        display: 'block',
        position: 'relative',
        borderRadius: '10px',
        overflow: 'hidden',
        background: '#181822',
        aspectRatio: '2/3',
        textDecoration: 'none',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s, border-color 0.3s',
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

      {/* Top Badges */}
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
        {movie.quality && (
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
        )}

        {movie.episode_current && (
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
        )}
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
    </Link>
  );
}

export default BrowseCard;
