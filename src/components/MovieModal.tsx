'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useModal } from '@/context/ModalContext';
import { getImageUrl, getLatestMovies } from '@/lib/api';
import { useMyList } from '@/hooks/useMyList';
import { useWatchHistory } from '@/hooks/useWatchHistory';
import { MovieItem } from '@/types/movie';

export default function MovieModal() {
  const {
    isOpen,
    movie,
    episodes,
    isLoading,
    selectedServerIndex,
    closeModal,
    setSelectedServerIndex,
    openModal,
  } = useModal();

  const { isInMyList, toggleMyList } = useMyList();
  const { getMovieProgress, removeFromHistory } = useWatchHistory();

  const [userRating, setUserRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [relatedMovies, setRelatedMovies] = useState<MovieItem[]>([]);

  const isSaved = movie ? isInMyList(movie.slug) : false;

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (movie) {
        try {
          const r = localStorage.getItem(`lphim_rating_${movie.slug}`);
          if (r) setUserRating(parseInt(r, 10));
          else setUserRating(0);
        } catch (e) {
          console.error(e);
        }
      }
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, movie]);

  useEffect(() => {
    if (movie) {
      getLatestMovies(1).then((res) => {
        if (res && res.data && res.data.items) {
          setRelatedMovies(res.data.items.filter((m) => m.slug !== movie.slug).slice(0, 6));
        }
      });
    }
  }, [movie]);

  if (!isOpen) return null;

  const currentServer = episodes[selectedServerIndex] || episodes[0];
  const serverEpisodes = currentServer?.server_data || [];
  const savedProgress = movie ? getMovieProgress(movie.slug) : undefined;

  const handleRate = (stars: number) => {
    setUserRating(stars);
    if (movie) {
      try {
        localStorage.setItem(`lphim_rating_${movie.slug}`, stars.toString());
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!movie) return;
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

  const backdrop = movie ? getImageUrl(movie.thumb_url || movie.poster_url) : '';

  return (
    <div className="modal" id="modal" style={{ display: 'block' }}>
      <div className="modal__backdrop" id="modal-backdrop" onClick={closeModal}></div>
      <div className="modal__dialog">
        <button
          className="modal__close"
          id="modal-close"
          type="button"
          aria-label="Đóng"
          onClick={closeModal}
        >
          <i className="fas fa-times"></i>
        </button>

        {isLoading || !movie ? (
          <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--t2)' }}>
            <div className="vip-spinner" style={{ margin: '0 auto 16px' }}></div>
            <p>Đang tải thông tin phim...</p>
          </div>
        ) : (
          <>
            <div className="modal__hero" id="modal-hero">
              <div
                className="modal__hero-img"
                id="modal-hero-img"
                style={{ backgroundImage: `url(${backdrop})` }}
              ></div>
              <div className="modal__hero-gradient"></div>
              <div className="modal__hero-info">
                <h2 className="modal__title" id="modal-title">
                  {movie.name}
                </h2>
                <div className="modal__hero-actions">
                  <Link
                    href={`/xem-phim/${movie.slug}${savedProgress?.episode_slug ? `?tap=${savedProgress.episode_slug}` : ''}`}
                    className="btn btn--play"
                    id="modal-play-btn"
                    onClick={closeModal}
                  >
                    <i className="fas fa-play"></i> {savedProgress && savedProgress.current_time > 10 ? 'Xem tiếp' : 'Phát'}
                  </Link>
                  <button
                    className={`btn-circle ${isSaved ? 'in-list' : ''}`}
                    id="modal-mylist-btn"
                    type="button"
                    title={isSaved ? 'Đã lưu' : 'Thêm vào danh sách'}
                    onClick={handleBookmark}
                  >
                    <i className={`fas ${isSaved ? 'fa-check' : 'fa-plus'}`}></i>
                  </button>
                  {savedProgress && (
                    <button
                      className="btn-circle btn-circle--danger"
                      id="modal-remove-history-btn"
                      type="button"
                      title="Xóa khỏi lịch sử xem"
                      onClick={() => removeFromHistory(movie.slug)}
                    >
                      <i className="fas fa-trash-can"></i>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="modal__body">
              <div className="modal__meta-row">
                <span className="modal__match"><i className="fas fa-star"></i> 98%</span>
                <span className="modal__year" id="modal-year">{movie.year || '2026'}</span>
                <span className="modal__badge" id="modal-quality">{movie.quality || 'HD'}</span>
                <span className="modal__badge" id="modal-lang">{movie.lang || 'Vietsub'}</span>

                {/* Star Rating */}
                <div className="modal__rating" id="modal-rating">
                  <span className="modal__rating-label">Đánh giá của bạn:</span>
                  <div className="modal__stars" id="modal-stars">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <i
                        key={star}
                        className={`${(hoverRating || userRating) >= star ? 'fas' : 'far'} fa-star`}
                        style={{ cursor: 'pointer', color: (hoverRating || userRating) >= star ? '#ffc107' : 'inherit' }}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => handleRate(star)}
                      ></i>
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal__grid">
                <div className="modal__desc" id="modal-desc">
                  {movie.content ? movie.content.replace(/<[^>]*>?/gm, '') : 'Nội dung phim đang cập nhật.'}
                </div>
                <div className="modal__tags">
                  {movie.category && (
                    <p id="modal-genres">
                      <span className="modal__label">Thể loại: </span>
                      {movie.category.map((c) => c.name).join(', ')}
                    </p>
                  )}
                  {movie.country && (
                    <p id="modal-country">
                      <span className="modal__label">Quốc gia: </span>
                      {movie.country.map((c) => c.name).join(', ')}
                    </p>
                  )}
                  {movie.director && movie.director.length > 0 && (
                    <p>
                      <span className="modal__label">Đạo diễn: </span>
                      {movie.director.join(', ')}
                    </p>
                  )}
                  {movie.actor && movie.actor.length > 0 && (
                    <p>
                      <span className="modal__label">Diễn viên: </span>
                      {movie.actor.slice(0, 5).join(', ')}
                    </p>
                  )}
                </div>
              </div>

              {/* Servers list */}
              {episodes.length > 1 && (
                <div className="modal__servers-section" id="modal-servers-section">
                  <h3 className="modal__servers-title">
                    <i className="fas fa-server"></i> Nguồn phát (Servers):
                  </h3>
                  <div className="modal__servers-list" id="modal-servers-list">
                    {episodes.map((server, idx) => (
                      <button
                        key={idx}
                        className={`server-btn ${selectedServerIndex === idx ? 'active' : ''}`}
                        onClick={() => setSelectedServerIndex(idx)}
                      >
                        {server.server_name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Episodes Section */}
              {serverEpisodes.length > 0 && (
                <div className="modal__episodes-section" id="modal-episodes-section">
                  <div className="modal__episodes-header-row">
                    <h3 className="modal__episodes-title">Các tập ({serverEpisodes.length} tập)</h3>
                    <span className="modal__episodes-tip">
                      Chọn tập để phát trực tiếp
                    </span>
                  </div>
                  <div className="modal__episodes-list" id="modal-episodes-list">
                    {serverEpisodes.map((ep, idx) => (
                      <Link
                        key={ep.slug || idx}
                        href={`/xem-phim/${movie.slug}?tap=${ep.slug}`}
                        onClick={closeModal}
                        className="modal__ep-link"
                      >
                        {ep.name.startsWith('Tập') ? ep.name : `Tập ${ep.name}`}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Related movies */}
              {relatedMovies.length > 0 && (
                <div className="modal__related-section" id="modal-related-section">
                  <h3 className="modal__related-title">Nội dung tương tự</h3>
                  <div className="modal__related-grid" id="modal-related-grid">
                    {relatedMovies.map((rel) => (
                      <div
                        key={rel.slug}
                        className="modal__related-card"
                        onClick={() => openModal(rel.slug, false)}
                      >
                        <img
                          src={getImageUrl(rel.poster_url || rel.thumb_url)}
                          alt={rel.name}
                          className="modal__related-poster"
                        />
                        <div className="modal__related-name">{rel.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
