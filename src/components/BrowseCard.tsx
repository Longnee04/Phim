'use client';

import React from 'react';
import { MovieItem } from '@/types/movie';
import { getImageUrl } from '@/lib/api';
import { useModal } from '@/context/ModalContext';

interface BrowseCardProps {
  movie: MovieItem;
}

export function BrowseCard({ movie }: BrowseCardProps) {
  const { openModal } = useModal();
  const poster = getImageUrl(movie.poster_url || movie.thumb_url);

  return (
    <div
      className="browse__card"
      onClick={() => openModal(movie.slug, false)}
    >
      <img
        src={poster}
        alt={movie.name}
        loading="lazy"
      />
      <div className="browse__card-info">
        <div className="browse__card-name">{movie.name}</div>
        <div className="browse__card-meta">
          {movie.quality && <span className="browse__card-badge">{movie.quality}</span>}
          <span>{movie.year || '2026'}</span>
          {movie.lang && <span>{movie.lang}</span>}
        </div>
      </div>
      <div className="browse__card-play">
        <i className="fas fa-play"></i>
      </div>
    </div>
  );
}

export default BrowseCard;
