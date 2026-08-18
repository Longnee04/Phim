'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MovieItem, MovieServer } from '@/types/movie';
import { useWatchHistory } from '@/hooks/useWatchHistory';
import { useMyList } from '@/hooks/useMyList';
import { getImageUrl, SourceType, SOURCES } from '@/lib/api';
import VideoPlayer from '@/components/VideoPlayer';

interface WatchClientProps {
  movie: MovieItem;
  episodes: MovieServer[];
  initialTapSlug?: string;
  initialServerIndex?: number;
}

interface SourceState {
  id: SourceType;
  name: string;
  label: string;
  desc: string;
  status: 'idle' | 'loading' | 'ok' | 'error';
  ping: string;
  episodes: MovieServer[];
}

const SOURCE_CONFIG: { id: SourceType; label: string; desc: string }[] = [
  { id: 'nguonc', label: 'NguonC (Nguồn Chính)', desc: 'Tốc độ cao • Vietsub / Thuyết minh' },
  { id: 'kkphim', label: 'KKPhim (Dự phòng 1)', desc: 'Chất lượng HD • Full HLS' },
  { id: 'ophim', label: 'OPhim (Dự phòng 2)', desc: 'Kho phim phong phú' },
  { id: 'vsmov', label: 'VSMOV (Dự phòng 3)', desc: 'Thuyết minh / Lồng tiếng' },
];

export default function WatchClient({
  movie,
  episodes: initialEpisodes,
  initialTapSlug,
  initialServerIndex = 0,
}: WatchClientProps) {
  const router = useRouter();

  // Active Source (Defaults to nguonc)
  const [activeSource, setActiveSource] = useState<SourceType>('nguonc');
  const [activeServerIndex, setActiveServerIndex] = useState<number>(initialServerIndex);

  // Sources tracking state
  const [sources, setSources] = useState<SourceState[]>(() =>
    SOURCE_CONFIG.map((cfg) => ({
      id: cfg.id,
      name: SOURCES[cfg.id].name,
      label: cfg.label,
      desc: cfg.desc,
      status: cfg.id === 'nguonc' ? 'ok' : 'idle',
      ping: cfg.id === 'nguonc' ? '< 50ms' : '',
      episodes: cfg.id === 'nguonc' ? initialEpisodes : [],
    }))
  );

  // Get current server list from active source
  const currentSourceState = sources.find((s) => s.id === activeSource) || sources[0];
  const currentSourceEpisodes = currentSourceState.episodes.length > 0 ? currentSourceState.episodes : initialEpisodes;
  const currentServer = currentSourceEpisodes[activeServerIndex] || currentSourceEpisodes[0];
  const serverEpisodes = currentServer?.server_data || [];

  // Active Episode Slug
  const [selectedEpSlug, setSelectedEpSlug] = useState<string>(() => {
    if (initialTapSlug) return initialTapSlug;
    return serverEpisodes[0]?.slug || 'tap-01';
  });

  // Toggles (Iframe Embed is default as requested)
  const [autoNext, setAutoNext] = useState(true);
  const [theaterMode, setTheaterMode] = useState(false);
  const [forceEmbed, setForceEmbed] = useState(true);
  const [showServerModal, setShowServerModal] = useState(false);

  // Watch history & My List
  const { addToHistory, getMovieProgress } = useWatchHistory();
  const { isInMyList, toggleMyList } = useMyList();
  const isSaved = isInMyList(movie.slug);

  const progress = getMovieProgress(movie.slug);
  const initialTime = progress?.episode_slug === selectedEpSlug ? progress.current_time : 0;

  // Active episode object
  const currentEpisode = useMemo(() => {
    return (
      serverEpisodes.find((ep) => ep.slug === selectedEpSlug) ||
      serverEpisodes.find((ep) => ep.slug.includes(selectedEpSlug) || selectedEpSlug.includes(ep.slug)) ||
      serverEpisodes[0]
    );
  }, [serverEpisodes, selectedEpSlug]);

  const currentEpIndex = serverEpisodes.findIndex((ep) => ep.slug === currentEpisode?.slug);
  const hasNextEpisode = currentEpIndex >= 0 && currentEpIndex < serverEpisodes.length - 1;

  // Compute URLs
  const m3u8Url = currentEpisode?.link_m3u8 || '';
  const embedUrl = currentEpisode?.link_embed || (m3u8Url ? `https://player.phimapi.com/player/?url=${encodeURIComponent(m3u8Url)}` : '');

  // Fetch episodes from another source when user selects it
  const fetchSourceData = useCallback(
    async (sourceId: SourceType) => {
      setSources((prev) =>
        prev.map((s) => (s.id === sourceId ? { ...s, status: 'loading' } : s))
      );

      const startTime = Date.now();
      try {
        const res = await fetch(`/api/source?slug=${movie.slug}&source=${sourceId}`);
        const data = await res.json();
        const ping = `${Date.now() - startTime}ms`;

        setSources((prev) =>
          prev.map((s) =>
            s.id === sourceId
              ? {
                  ...s,
                  status: data.ok ? 'ok' : 'error',
                  ping: data.ok ? ping : 'Không khả dụng',
                  episodes: data.ok ? data.episodes : [],
                }
              : s
          )
        );
        return data.ok ? data.episodes : [];
      } catch {
        setSources((prev) =>
          prev.map((s) =>
            s.id === sourceId
              ? { ...s, status: 'error', ping: 'Lỗi kết nối', episodes: [] }
              : s
          )
        );
        return [];
      }
    },
    [movie.slug]
  );

  // Probe all secondary sources in background on mount
  useEffect(() => {
    SOURCE_CONFIG.filter((cfg) => cfg.id !== 'nguonc').forEach((cfg) => {
      fetchSourceData(cfg.id);
    });
  }, [fetchSourceData]);

  // Manual source switch handler
  const handleSourceSelect = async (sourceId: SourceType) => {
    let src = sources.find((s) => s.id === sourceId);
    let episodesList = src?.episodes || [];

    if (!src || src.status === 'idle' || episodesList.length === 0) {
      episodesList = await fetchSourceData(sourceId);
    }

    if (episodesList && episodesList.length > 0) {
      setActiveSource(sourceId);
      setActiveServerIndex(0);
      const newEps = episodesList[0]?.server_data || [];
      // Try to find matching episode or pick first
      const matched = newEps.find(
        (ep: any) =>
          ep.slug === selectedEpSlug ||
          ep.name === currentEpisode?.name ||
          ep.slug.replace(/\D/g, '') === selectedEpSlug.replace(/\D/g, '')
      );
      setSelectedEpSlug(matched ? matched.slug : newEps[0]?.slug || 'tap-01');
    }
  };

  // Next episode handler
  const handleNextEpisode = useCallback(() => {
    if (hasNextEpisode) {
      const nextEp = serverEpisodes[currentEpIndex + 1];
      if (nextEp) {
        setSelectedEpSlug(nextEp.slug);
      }
    }
  }, [hasNextEpisode, currentEpIndex, serverEpisodes]);

  // Watch history update
  const handleTimeUpdate = useCallback(
    (time: number, dur: number) => {
      if (currentEpisode) {
        addToHistory({
          slug: movie.slug,
          name: movie.name,
          poster_url: movie.poster_url || '',
          thumb_url: movie.thumb_url || '',
          episode_slug: currentEpisode.slug,
          episode_name: currentEpisode.name,
          server_index: activeServerIndex,
          current_time: time,
          duration: dur,
        });
      }
    },
    [movie, currentEpisode, activeServerIndex, addToHistory]
  );

  // Auto-record history on episode load
  useEffect(() => {
    if (currentEpisode && movie) {
      addToHistory({
        slug: movie.slug,
        name: movie.name,
        poster_url: movie.poster_url || '',
        thumb_url: movie.thumb_url || '',
        episode_slug: currentEpisode.slug,
        episode_name: currentEpisode.name,
        server_index: activeServerIndex,
        current_time: initialTime || 0,
        duration: 0,
      });
    }
  }, [movie.slug, currentEpisode?.slug, activeServerIndex]);

  return (
    <div
      className="netflix-watch-page"
      style={{
        background: '#0a0a0f',
        minHeight: '100vh',
        color: '#fff',
        paddingTop: '68px',
        paddingBottom: '80px',
      }}
    >
      <div
        style={{
          maxWidth: theaterMode ? '100%' : '1360px',
          margin: '0 auto',
          padding: theaterMode ? '0' : '0 24px',
          transition: 'max-width 0.3s ease, padding 0.3s ease',
        }}
      >
        {/* Top Breadcrumb & Back button */}
        {!theaterMode && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 0 16px',
              fontSize: '0.88rem',
              color: 'var(--t2, #a3a3a3)',
            }}
          >
            <Link
              href={`/phim/${movie.slug}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                color: '#e5e5e5',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'color 0.2s',
              }}
            >
              <i className="fas fa-arrow-left"></i>
              <span>{movie.name}</span>
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span
                style={{
                  background: 'rgba(229,9,20,0.15)',
                  color: 'var(--red, #e50914)',
                  border: '1px solid rgba(229,9,20,0.3)',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
              >
                <i className="fas fa-signal" style={{ marginRight: 5 }}></i>
                {SOURCES[activeSource].name} • {currentServer?.server_name || 'Server 1'}
              </span>
            </div>
          </div>
        )}

        {/* Netflix Cinema Video Player Box */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16/9',
            background: '#000',
            borderRadius: theaterMode ? '0' : '12px',
            overflow: 'hidden',
            boxShadow: '0 25px 60px rgba(0,0,0,0.9)',
            border: theaterMode ? 'none' : '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <VideoPlayer
            key={`${activeSource}-${activeServerIndex}-${selectedEpSlug}-${forceEmbed}`}
            m3u8Url={forceEmbed ? '' : m3u8Url}
            embedUrl={embedUrl}
            movieTitle={movie.name}
            episodeName={currentEpisode?.name || 'Tập 01'}
            initialTime={initialTime}
            onTimeUpdate={handleTimeUpdate}
            onNextEpisode={hasNextEpisode ? handleNextEpisode : undefined}
          />
        </div>

        {/* Player Quick Controls Bar (Netflix Dark UI) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '16px 8px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            fontSize: '0.85rem',
          }}
        >
          {/* Left Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setAutoNext(!autoNext)}
              style={{
                background: 'none',
                border: 'none',
                color: autoNext ? '#fff' : 'var(--t3, #6d6d6d)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.82rem',
              }}
            >
              <i className="fas fa-forward-step" style={{ color: autoNext ? '#46d369' : 'inherit' }}></i>
              <span>Tự chuyển tập:</span>
              <span
                style={{
                  background: autoNext ? '#46d369' : '#333',
                  color: autoNext ? '#000' : '#888',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  fontWeight: 800,
                  fontSize: '0.7rem',
                }}
              >
                {autoNext ? 'BẬT' : 'TẮT'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTheaterMode(!theaterMode)}
              style={{
                background: 'none',
                border: 'none',
                color: theaterMode ? 'var(--red, #e50914)' : 'var(--t2, #a3a3a3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.82rem',
              }}
            >
              <i className="fas fa-tv"></i>
              <span>Rạp phim: {theaterMode ? 'BẬT' : 'TẮT'}</span>
            </button>

            <button
              type="button"
              onClick={() => setForceEmbed(!forceEmbed)}
              style={{
                background: forceEmbed ? 'rgba(70,211,105,0.18)' : 'rgba(255,255,255,0.06)',
                border: '1px solid ' + (forceEmbed ? '#46d369' : 'rgba(255,255,255,0.12)'),
                color: forceEmbed ? '#46d369' : '#fff',
                padding: '4px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.78rem',
              }}
            >
              <i className="fas fa-circle-play" style={{ marginRight: 6 }}></i>
              {forceEmbed ? 'Chế độ: Iframe Embed' : 'Chế độ: Direct (HLS)'}
            </button>
          </div>

          {/* Right Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={() =>
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
                })
              }
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: isSaved ? '#46d369' : '#fff',
                padding: '6px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.8rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <i className={`fas ${isSaved ? 'fa-check' : 'fa-plus'}`}></i>
              <span>{isSaved ? 'Đã lưu' : 'Lưu phim'}</span>
            </button>

            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-feedback'))}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'var(--t2, #a3a3a3)',
                padding: '6px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.8rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <i className="fas fa-flag"></i> Báo lỗi
            </button>
          </div>
        </div>

        {/* ==================== MANUAL SOURCE & SERVER SELECTOR ==================== */}
        <div
          style={{
            background: 'var(--surface, #181818)',
            border: '1px solid var(--border, #333)',
            borderRadius: '12px',
            padding: '20px 24px',
            marginTop: '24px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', fontWeight: 800, color: '#fff' }}>
              <i className="fas fa-server" style={{ color: 'var(--red, #e50914)' }}></i>
              <span>CHỌN NGUỒN PHÁT (Đổi nguồn khi giật / lag):</span>
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--t2, #a3a3a3)' }}>
              Đang phát: <strong style={{ color: '#fff' }}>{SOURCES[activeSource].name}</strong>
            </span>
          </div>

          {/* Sources Selector Tabs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '18px' }}>
            {sources.map((src) => {
              const isActive = activeSource === src.id;
              const isAvailable = src.status === 'ok';
              const isLoading = src.status === 'loading';

              return (
                <button
                  key={src.id}
                  type="button"
                  onClick={() => handleSourceSelect(src.id)}
                  disabled={isLoading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 18px',
                    borderRadius: '30px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: '1px solid ' + (isActive ? 'var(--red, #e50914)' : 'rgba(255,255,255,0.12)'),
                    background: isActive
                      ? 'linear-gradient(135deg, var(--red, #e50914) 0%, #b20710 100%)'
                      : 'rgba(255,255,255,0.06)',
                    color: isActive ? '#fff' : 'var(--t2, #a3a3a3)',
                    boxShadow: isActive ? '0 4px 16px rgba(229,9,20,0.4)' : 'none',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  <span>{src.label}</span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      padding: '1px 6px',
                      borderRadius: '8px',
                      background: 'rgba(0,0,0,0.3)',
                      color: isAvailable ? '#4ade80' : src.status === 'error' ? '#888' : '#fbbf24',
                    }}
                  >
                    {isLoading ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : (
                      <>• {isAvailable ? src.ping || 'Sẵn sàng' : src.status === 'error' ? 'Không khả dụng' : '...'}</>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Server / Bản Chiếu Tabs (If multiple servers exist) */}
          {currentSourceEpisodes.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--t3, #6d6d6d)', fontWeight: 600, marginRight: '4px' }}>
                Bản chiếu:
              </span>
              {currentSourceEpisodes.map((server, sIdx) => (
                <button
                  key={sIdx}
                  type="button"
                  onClick={() => {
                    setActiveServerIndex(sIdx);
                    const eps = server.server_data || [];
                    if (eps.length > 0) {
                      const matched = eps.find((ep) => ep.slug === selectedEpSlug) || eps[0];
                      setSelectedEpSlug(matched.slug);
                    }
                  }}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: activeServerIndex === sIdx ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.04)',
                    border: '1px solid ' + (activeServerIndex === sIdx ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.08)'),
                    color: '#fff',
                  }}
                >
                  <i className="fas fa-layer-group" style={{ marginRight: 5, opacity: 0.7 }}></i>
                  {server.server_name}
                </button>
              ))}
            </div>
          )}

          {/* ==================== NETFLIX EPISODE SELECTOR GRID ==================== */}
          <div style={{ paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-list" style={{ color: 'var(--red, #e50914)' }}></i>
                <span>Danh Sách Tập ({serverEpisodes.length} tập)</span>
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--t3, #6d6d6d)' }}>
                Bấm vào tập để phát trực tiếp
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(85px, 1fr))',
                gap: '8px',
                maxHeight: '320px',
                overflowY: 'auto',
                paddingRight: '4px',
              }}
            >
              {serverEpisodes.map((ep, idx) => {
                const isSelected = (currentEpisode?.slug || selectedEpSlug) === ep.slug;
                return (
                  <button
                    key={ep.slug || idx}
                    type="button"
                    onClick={() => setSelectedEpSlug(ep.slug)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '10px 6px',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: '1px solid ' + (isSelected ? 'var(--red, #e50914)' : 'rgba(255,255,255,0.08)'),
                      background: isSelected ? 'var(--red, #e50914)' : 'rgba(255,255,255,0.06)',
                      color: '#fff',
                      boxShadow: isSelected ? '0 4px 14px rgba(229,9,20,0.4)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isSelected && <i className="fas fa-play" style={{ fontSize: '0.65rem' }}></i>}
                    <span>{ep.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ==================== MOVIE INFO SECTION (Netflix Layout) ==================== */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 340px',
            gap: '32px',
            marginTop: '32px',
            background: 'var(--surface, #181818)',
            border: '1px solid var(--border, #333)',
            borderRadius: '12px',
            padding: '28px',
          }}
          className="watch__info-grid"
        >
          {/* Main Details */}
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 900, margin: '0 0 4px', lineHeight: 1.2 }}>
              {movie.name} — <span style={{ color: 'var(--red, #e50914)' }}>{currentEpisode?.name || 'Tập 01'}</span>
            </h1>
            {movie.origin_name && (
              <p style={{ fontSize: '0.92rem', color: 'var(--t2, #a3a3a3)', margin: '0 0 16px', fontWeight: 500 }}>
                {movie.origin_name} {movie.year ? `(${movie.year})` : ''}
              </p>
            )}

            {/* Badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '18px' }}>
              <span style={{ background: '#46d369', color: '#000', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800 }}>
                98% Trùng khớp
              </span>
              <span style={{ border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                18+
              </span>
              <span style={{ background: '#0d9488', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                {movie.quality || 'FHD'}
              </span>
              <span style={{ background: '#7c3aed', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                {movie.lang || 'Vietsub'}
              </span>
              <span style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>
                {serverEpisodes.length} Tập
              </span>
              {movie.year && (
                <span style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>
                  {movie.year}
                </span>
              )}
            </div>

            {/* Synopsis */}
            <div style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--t2, #a3a3a3)', marginBottom: '20px' }}>
              {movie.content
                ? movie.content.replace(/<[^>]*>?/gm, '')
                : 'Nội dung bộ phim đang được đội ngũ LPhim cập nhật.'}
            </div>

            <Link
              href={`/phim/${movie.slug}`}
              className="btn btn--more"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <i className="fas fa-info-circle"></i> Xem trang chi tiết & Đánh giá
            </Link>
          </div>

          {/* Right Meta Column */}
          <div
            style={{
              borderLeft: '1px solid rgba(255,255,255,0.08)',
              paddingLeft: '24px',
              fontSize: '0.85rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
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

            {movie.actor && movie.actor.length > 0 && (
              <div>
                <span style={{ color: 'var(--t3, #6d6d6d)', fontWeight: 600 }}>Diễn viên:</span>
                <div style={{ color: '#fff', fontWeight: 500, marginTop: '2px', lineHeight: 1.5 }}>
                  {movie.actor.slice(0, 8).join(', ')}
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

            {movie.category && movie.category.length > 0 && (
              <div>
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
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textDecoration: 'none',
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
    </div>
  );
}
