'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MovieItem } from '@/types/movie';
import { getImageUrl } from '@/lib/api';
import { useMyList } from '@/hooks/useMyList';
import { useModal } from '@/context/ModalContext';

interface NetflixMovieCardProps {
  movie: MovieItem;
}

export default function NetflixMovieCard({ movie }: NetflixMovieCardProps) {
  const router = useRouter();
  const { isInMyList, toggleMyList } = useMyList();
  const { openModal } = useModal();
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
    openModal(movie.slug, false);
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/xem-phim/${movie.slug}`);
  };

  return (
    <div className="card" onClick={handleCardClick}>
      <img
        className="card__img"
        src={poster}
        alt={movie.name}
        loading="lazy"
      />

      {/* Episode label at bottom if available */}
      {movie.episode_current && (
        <div className="card__history-ep">
          {movie.episode_current}
        </div>
      )}

      {/* Expand Info Panel */}
      <div className="card__info">
        <div className="card__info-row">
          <div className="card__info-left">
            <button
              className="card__mini-btn card__mini-btn--play"
              type="button"
              title="Phát ngay"
              onClick={handlePlayClick}
            >
              <i className="fas fa-play"></i>
            </button>
            <button
              className={`card__mini-btn ${isSaved ? 'in-list' : ''}`}
              type="button"
              title={isSaved ? 'Đã lưu' : 'Thêm vào danh sách'}
              onClick={handleBookmark}
            >
              <i className={`fas ${isSaved ? 'fa-check' : 'fa-plus'}`}></i>
            </button>
          </div>
          <div className="card__info-right">
            <button
              className="card__mini-btn"
              type="button"
              title="Chi tiết"
              onClick={handleCardClick}
            >
              <i className="fas fa-chevron-down"></i>
            </button>
          </div>
        </div>

        <div className="card__info-meta">
          <span className="card__match">98% Trùng khớp</span>
          {movie.quality && <span className="card__tag">{movie.quality}</span>}
          {movie.year && <span className="card__tag">{movie.year}</span>}
        </div>

        <div className="card__info-title">{movie.name}</div>
        <div className="card__info-genres">
          {movie.category?.map((c) => c.name).join(' • ') || movie.lang || 'Vietsub'}
        </div>
      </div>
    </div>
  );
}
