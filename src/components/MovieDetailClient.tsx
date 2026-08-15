'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MovieItem, MovieServer } from '@/types/movie';
import { getImageUrl } from '@/lib/api';
import { useMyList } from '@/hooks/useMyList';
import { useWatchHistory } from '@/hooks/useWatchHistory';
import NetflixRow from '@/components/NetflixRow';

interface MovieDetailClientProps {
  movie: MovieItem;
  episodes: MovieServer[];
  relatedMovies: MovieItem[];
}

export default function MovieDetailClient({
  movie,
  episodes,
  relatedMovies,
}: MovieDetailClientProps) {
  const { isInMyList, toggleMyList } = useMyList();
  const { getMovieProgress } = useWatchHistory();

  const [selectedServerIndex, setSelectedServerIndex] = useState(0);

  const isSaved = isInMyList(movie.slug);
  const savedProgress = getMovieProgress(movie.slug);

  const currentServer = episodes[selectedServerIndex] || episodes[0];
  const serverEpisodes = currentServer?.server_data || [];

  const poster = getImageUrl(movie.poster_url || movie.thumb_url);
  const backdrop = getImageUrl(movie.thumb_url || movie.poster_url);
  const firstEpSlug = serverEpisodes[0]?.slug || 'tap-01';

  const handleBookmark = () => {
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

  const playTargetUrl = `/xem-phim/${movie.slug}${
    savedProgress?.episode_slug ? `?tap=${savedProgress.episode_slug}` : `?tap=${firstEpSlug}`
  }`;

  return (
    <div
      className="netflix-detail-view"
      style={{
        minHeight: '100vh',
        background: '#0d0d12',
        color: '#fff',
        paddingTop: '74px',
        paddingBottom: '80px',
        position: 'relative',
      }}
    >
      {/* Ambient Blurred Backdrop in Background */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '560px',
          backgroundImage: `url(${backdrop})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 20%',
          filter: 'blur(40px) brightness(0.18)',
          opacity: 0.8,
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '560px',
          background: 'linear-gradient(180deg, rgba(13,13,18,0.2) 0%, rgba(13,13,18,0.85) 60%, #0d0d12 100%)',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />

      {/* Main Content Container */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 24px',
        }}
      >
        {/* Back Link */}
        <div style={{ marginBottom: '20px' }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--t2, #a3a3a3)',
              fontSize: '0.9rem',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'color 0.2s',
            }}
          >
            <i className="fas fa-arrow-left"></i> Quay lại trang chủ
          </Link>
        </div>

        {/* ==================== 2-COLUMN HERO SHOWCASE ==================== */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '320px 1fr',
            gap: '40px',
            alignItems: 'start',
            marginBottom: '44px',
          }}
          className="detail__grid"
        >
          {/* Left Column: Poster & Action Buttons */}
          <div>
            {/* Poster Card */}
            <div
              style={{
                position: 'relative',
                borderRadius: '14px',
                overflow: 'hidden',
                boxShadow: '0 20px 50px rgba(0,0,0,0.85)',
                border: '1px solid rgba(255,255,255,0.12)',
                aspectRatio: '2/3',
                background: '#16161f',
                marginBottom: '16px',
              }}
            >
              <img
                src={poster}
                alt={movie.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />

              {/* Quality & Lang Badges Top-Left */}
              <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 6 }}>
                {movie.quality && (
                  <span
                    style={{
                      background: 'var(--red, #e50914)',
                      color: '#fff',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                    }}
                  >
                    {movie.quality}
                  </span>
                )}
                {movie.lang && (
                  <span
                    style={{
                      background: 'rgba(0,0,0,0.8)',
                      backdropFilter: 'blur(8px)',
                      color: '#fff',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      border: '1px solid rgba(255,255,255,0.15)',
                    }}
                  >
                    {movie.lang}
                  </span>
                )}
              </div>
            </div>

            {/* Play Button */}
            <Link
              href={playTargetUrl}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: '14px 20px',
                fontSize: '1rem',
                fontWeight: 800,
                borderRadius: '10px',
                background: 'linear-gradient(135deg, var(--red, #e50914) 0%, #b20710 100%)',
                color: '#fff',
                textDecoration: 'none',
                boxShadow: '0 8px 25px rgba(229,9,20,0.45)',
                marginBottom: '10px',
                boxSizing: 'border-box',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
            >
              <i className="fas fa-play" style={{ fontSize: '0.95rem' }}></i>
              <span>{savedProgress && savedProgress.current_time > 10 ? 'XEM TIẾP PHIM' : 'XEM PHIM NGAY'}</span>
            </Link>

            {/* Add to List Button */}
            <button
              type="button"
              onClick={handleBookmark}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 20px',
                fontSize: '0.9rem',
                fontWeight: 600,
                borderRadius: '10px',
                background: isSaved ? 'rgba(70,211,105,0.15)' : 'rgba(255,255,255,0.06)',
                border: '1px solid ' + (isSaved ? 'rgba(70,211,105,0.4)' : 'rgba(255,255,255,0.12)'),
                color: isSaved ? '#46d369' : '#fff',
                cursor: 'pointer',
                boxSizing: 'border-box',
                transition: 'all 0.2s',
              }}
            >
              <i className={`fas ${isSaved ? 'fa-check' : 'fa-plus'}`}></i>
              <span>{isSaved ? 'Đã lưu vào Danh sách' : 'Thêm vào Danh Sách'}</span>
            </button>
          </div>

          {/* Right Column: Title, Metadata, Synopsis & Details */}
          <div>
            {/* Title */}
            <h1
              style={{
                fontSize: 'clamp(2rem, 3.2vw, 2.8rem)',
                fontWeight: 900,
                letterSpacing: '-0.5px',
                lineHeight: 1.2,
                margin: '0 0 6px',
              }}
            >
              {movie.name}
            </h1>

            {/* Original Name */}
            {movie.origin_name && (
              <p style={{ fontSize: '1.05rem', color: 'var(--t2, #a3a3a3)', fontWeight: 500, margin: '0 0 16px' }}>
                {movie.origin_name} {movie.year ? `(${movie.year})` : ''}
              </p>
            )}

            {/* Meta Tags Row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '22px' }}>
              <span style={{ background: '#46d369', color: '#000', padding: '3px 9px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 800 }}>
                98% Trùng khớp
              </span>
              <span style={{ border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                18+
              </span>
              {movie.year && (
                <span style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 600 }}>
                  {movie.year}
                </span>
              )}
              {movie.time && (
                <span style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 600 }}>
                  <i className="fas fa-clock" style={{ marginRight: 5, opacity: 0.7 }}></i>
                  {movie.time}
                </span>
              )}
              {movie.episode_current && (
                <span style={{ background: 'rgba(229,9,20,0.15)', color: 'var(--red, #e50914)', border: '1px solid rgba(229,9,20,0.3)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 700 }}>
                  {movie.episode_current}
                </span>
              )}
            </div>

            {/* Synopsis Box */}
            <div
              style={{
                background: 'rgba(24,24,32,0.85)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                padding: '20px 24px',
                marginBottom: '20px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              }}
            >
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-align-left" style={{ color: 'var(--red, #e50914)' }}></i>
                <span>Nội dung phim</span>
              </h3>
              <p
                style={{
                  fontSize: '0.92rem',
                  lineHeight: 1.75,
                  color: '#d4d4d8',
                  margin: 0,
                }}
              >
                {movie.content
                  ? movie.content.replace(/<[^>]*>?/gm, '')
                  : 'Nội dung bộ phim đang được cập nhật.'}
              </p>
            </div>

            {/* Information & Cast Box */}
            <div
              style={{
                background: 'rgba(24,24,32,0.85)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                padding: '20px 24px',
                fontSize: '0.88rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              }}
            >
              {movie.director && movie.director.length > 0 && (
                <div>
                  <span style={{ color: 'var(--t3, #6d6d6d)', fontWeight: 600 }}>Đạo diễn:</span>
                  <div style={{ color: '#fff', fontWeight: 600, marginTop: '2px' }}>
                    {movie.director.join(', ')}
                  </div>
                </div>
              )}

              {movie.country && movie.country.length > 0 && (
                <div>
                  <span style={{ color: 'var(--t3, #6d6d6d)', fontWeight: 600 }}>Quốc gia:</span>
                  <div style={{ color: '#fff', fontWeight: 600, marginTop: '2px' }}>
                    {movie.country.map((c) => c.name).join(', ')}
                  </div>
                </div>
              )}

              {movie.actor && movie.actor.length > 0 && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <span style={{ color: 'var(--t3, #6d6d6d)', fontWeight: 600 }}>Diễn viên:</span>
                  <div style={{ color: '#fff', fontWeight: 500, marginTop: '4px', lineHeight: 1.5 }}>
                    {movie.actor.slice(0, 10).join(', ')}
                  </div>
                </div>
              )}

              {movie.category && movie.category.length > 0 && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <span style={{ color: 'var(--t3, #6d6d6d)', fontWeight: 600 }}>Thể loại:</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                    {movie.category.map((cat) => (
                      <Link
                        key={cat.id || cat.slug}
                        href={`/the-loai/${cat.slug}`}
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: 'var(--t2, #a3a3a3)',
                          padding: '4px 12px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          textDecoration: 'none',
                          transition: 'all 0.2s',
                        }}
                      >
                        {cat.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ==================== EPISODES SECTION ==================== */}
        {episodes && episodes.length > 0 && (
          <div
            style={{
              background: 'rgba(24,24,32,0.95)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '14px',
              padding: '26px 28px',
              marginBottom: '44px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
            }}
          >
            {/* Section Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-list-ul" style={{ color: 'var(--red, #e50914)' }}></i>
                <span>Danh Sách Tập Phim</span>
              </h2>
              <span style={{ fontSize: '0.82rem', color: 'var(--t2, #a3a3a3)' }}>
                Chọn tập để xem trực tiếp
              </span>
            </div>

            {/* Server tabs */}
            {episodes.map((server, sIdx) => (
              <div key={sIdx} style={{ marginBottom: sIdx < episodes.length - 1 ? '24px' : 0 }}>
                {episodes.length > 1 && (
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--red, #e50914)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <i className="fas fa-server" style={{ marginRight: 6 }}></i>
                    {server.server_name}
                  </div>
                )}

                {/* Episodes Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))',
                    gap: '10px',
                    maxHeight: '340px',
                    overflowY: 'auto',
                    paddingRight: '4px',
                  }}
                >
                  {server.server_data.map((ep, eIdx) => (
                    <Link
                      key={ep.slug || eIdx}
                      href={`/xem-phim/${movie.slug}?tap=${ep.slug}&server=${sIdx}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                        padding: '11px 8px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        textAlign: 'center',
                        textDecoration: 'none',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--red, #e50914)';
                        e.currentTarget.style.borderColor = 'var(--red, #e50914)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                        e.currentTarget.style.transform = 'none';
                      }}
                    >
                      <i className="fas fa-play" style={{ fontSize: '0.65rem', opacity: 0.7 }}></i>
                      <span>{ep.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ==================== RELATED MOVIES ==================== */}
        {relatedMovies.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <NetflixRow title="Nội dung tương tự" movies={relatedMovies} />
          </div>
        )}
      </div>
    </div>
  );
}
