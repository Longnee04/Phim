'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Hls from 'hls.js';
import { MovieItem, MovieServer } from '@/types/movie';
import { useWatchHistory } from '@/hooks/useWatchHistory';
import { getImageUrl } from '@/lib/api';

interface WatchClientProps {
  movie: MovieItem;
  episodes: MovieServer[];
  initialTapSlug?: string;
  initialServerIndex?: number;
}

const SOURCES = [
  { id: 'kkphim', name: 'KKPhim - Vietsub', ping: '167ms', isLive: true },
  { id: 'daophim', name: 'Daophim - Song Ngữ #1', ping: '255ms', isLive: true },
  { id: 'vsmov', name: 'VSMov - Vietsub #1', ping: 'Không kết nối', isLive: false },
  { id: 'nguonc', name: 'NguonC - Vietsub #1', ping: 'Không kết nối', isLive: false },
];

export default function WatchClient({
  movie,
  episodes: initialEpisodes,
  initialTapSlug,
  initialServerIndex = 0,
}: WatchClientProps) {
  const [currentSource, setCurrentSource] = useState('kkphim');
  const [selectedServerIndex, setSelectedServerIndex] = useState(initialServerIndex);
  const [serverEpisodes, setServerEpisodes] = useState(() => {
    const s = initialEpisodes[initialServerIndex] || initialEpisodes[0];
    return s?.server_data || [];
  });

  const [selectedEpSlug, setSelectedEpSlug] = useState<string>(() => {
    if (initialTapSlug) return initialTapSlug;
    const s = initialEpisodes[initialServerIndex] || initialEpisodes[0];
    return s?.server_data?.[0]?.slug || '';
  });

  // Toggles
  const [autoNext, setAutoNext] = useState(true);
  const [skipIntro, setSkipIntro] = useState(true);
  const [theaterMode, setTheaterMode] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [userRating, setUserRating] = useState<string | null>(null);

  // Video State
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [useEmbed, setUseEmbed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showResumeBanner, setShowResumeBanner] = useState(false);

  const { addToHistory, getMovieProgress } = useWatchHistory();
  const progress = getMovieProgress(movie.slug);

  const currentEpisode =
    serverEpisodes.find((ep) => ep.slug === selectedEpSlug) || serverEpisodes[0];
  const currentEpIndex = serverEpisodes.findIndex((ep) => ep.slug === selectedEpSlug);
  const hasNextEpisode = currentEpIndex >= 0 && currentEpIndex < serverEpisodes.length - 1;

  const m3u8Url = currentEpisode?.link_m3u8;
  const embedUrl = currentEpisode?.link_embed || (m3u8Url ? `https://player.phimapi.com/player/?url=${encodeURIComponent(m3u8Url)}` : '');

  // Check saved progress
  useEffect(() => {
    if (progress && progress.current_time > 15 && (!progress.duration || progress.current_time / progress.duration < 0.92)) {
      setShowResumeBanner(true);
    }
  }, [progress]);

  const resumePlayback = () => {
    if (videoRef.current && progress?.current_time) {
      videoRef.current.currentTime = progress.current_time;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      setShowResumeBanner(false);
    }
  };

  // Video time formatting
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleNextEp = useCallback(() => {
    if (hasNextEpisode) {
      const nextEp = serverEpisodes[currentEpIndex + 1];
      setSelectedEpSlug(nextEp.slug);
    }
  }, [hasNextEpisode, currentEpIndex, serverEpisodes]);

  // HLS stream management
  useEffect(() => {
    if (useEmbed) {
      setLoading(false);
      return;
    }

    const video = videoRef.current;
    if (!m3u8Url) {
      if (embedUrl) setUseEmbed(true);
      setLoading(false);
      return;
    }

    if (!video) return;
    setLoading(true);

    const fallbackTimeout = setTimeout(() => {
      if (video.readyState < 2 && embedUrl) {
        console.warn('HLS stall > 3s, using official player embed');
        setUseEmbed(true);
        setLoading(false);
      }
    }, 3000);

    if (Hls.isSupported()) {
      if (hlsRef.current) hlsRef.current.destroy();

      const hls = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        maxBufferSize: 60 * 1024 * 1024,
        enableWorker: true,
        startFragPrefetch: true,
      });

      hlsRef.current = hls;
      hls.loadSource(m3u8Url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        clearTimeout(fallbackTimeout);
        setLoading(false);
        video.play().then(() => setIsPlaying(true)).catch(() => {
          video.muted = true;
          setIsMuted(true);
          video.play().then(() => setIsPlaying(true)).catch(() => {});
        });
      });

      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          clearTimeout(fallbackTimeout);
          if (embedUrl) setUseEmbed(true);
          setLoading(false);
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = m3u8Url;
      video.addEventListener('loadedmetadata', () => {
        clearTimeout(fallbackTimeout);
        setLoading(false);
        video.play().then(() => setIsPlaying(true)).catch(() => {});
      });
    } else if (embedUrl) {
      clearTimeout(fallbackTimeout);
      setUseEmbed(true);
      setLoading(false);
    }

    return () => {
      clearTimeout(fallbackTimeout);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [m3u8Url, embedUrl, useEmbed]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  const seek = (seconds: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + seconds));
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
    setDuration(v.duration || 0);

    if (v.buffered.length > 0) {
      setBuffered(v.buffered.end(v.buffered.length - 1));
    }

    if (currentEpisode && v.duration > 0) {
      addToHistory({
        slug: movie.slug,
        name: movie.name,
        poster_url: movie.poster_url || '',
        thumb_url: movie.thumb_url || '',
        episode_slug: currentEpisode.slug,
        episode_name: currentEpisode.name.startsWith('Tập') ? currentEpisode.name : `Tập ${currentEpisode.name}`,
        server_index: selectedServerIndex,
        current_time: v.currentTime,
        duration: v.duration,
      });
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh', color: '#fff', paddingTop: '65px', paddingBottom: '60px' }}>
      <div style={{ maxWidth: theaterMode ? '100%' : '1440px', margin: '0 auto', padding: '0 24px' }}>
        
        {/* Main Grid: Left Video / Right Info */}
        <div style={{ display: 'grid', gridTemplateColumns: theaterMode ? '1fr' : 'minmax(0, 1fr) 350px', gap: '28px', alignItems: 'start' }}>
          
          {/* Left Column: Player, Toggles & Sources */}
          <div>
            {/* Video Box */}
            <div
              ref={containerRef}
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '16/9',
                background: '#000',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
              }}
            >
              {useEmbed && embedUrl ? (
                <iframe
                  src={embedUrl}
                  allowFullScreen
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title={movie.name}
                />
              ) : (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    onClick={togglePlay}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={autoNext ? handleNextEp : undefined}
                    onCanPlay={() => setLoading(false)}
                    onLoadedData={() => setLoading(false)}
                    onWaiting={() => setLoading(true)}
                    onPlaying={() => { setLoading(false); setIsPlaying(true); }}
                    onPause={() => { setLoading(false); setIsPlaying(false); }}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />

                  {/* Big Center Play Icon when paused */}
                  {!isPlaying && !loading && (
                    <div
                      onClick={togglePlay}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        background: 'rgba(0,0,0,0.3)',
                      }}
                    >
                      <div
                        style={{
                          width: 68,
                          height: 68,
                          borderRadius: '50%',
                          border: '2px solid rgba(255,255,255,0.7)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(0,0,0,0.4)',
                          transition: 'transform 0.2s',
                        }}
                      >
                        <i className="fas fa-play" style={{ color: '#fff', fontSize: '1.5rem', marginLeft: 4 }}></i>
                      </div>
                    </div>
                  )}

                  {/* Loading Spinner */}
                  {loading && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 10,
                      }}
                    >
                      <div className="vip-spinner"></div>
                    </div>
                  )}

                  {/* "Xem tiếp tại..." Floating Badge */}
                  {showResumeBanner && (
                    <div
                      onClick={resumePlayback}
                      style={{
                        position: 'absolute',
                        bottom: 60,
                        right: 20,
                        background: 'rgba(255, 255, 255, 0.95)',
                        color: '#000',
                        padding: '8px 16px',
                        borderRadius: 6,
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                        zIndex: 15,
                      }}
                    >
                      <span>Xem tiếp tại {formatTime(progress?.current_time || 0)}</span>
                      <i className="fas fa-forward-step"></i>
                    </div>
                  )}

                  {/* Player Controls Bar (DaoPhim Style) */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: '16px 14px 10px',
                      background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, transparent 100%)',
                      zIndex: 20,
                    }}
                  >
                    {/* Progress Bar */}
                    <div
                      onClick={(e) => {
                        const v = videoRef.current;
                        if (!v || !v.duration) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        v.currentTime = ((e.clientX - rect.left) / rect.width) * v.duration;
                      }}
                      style={{
                        position: 'relative',
                        width: '100%',
                        height: 5,
                        background: 'rgba(255,255,255,0.2)',
                        borderRadius: 3,
                        cursor: 'pointer',
                        marginBottom: 10,
                      }}
                    >
                      <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${bufferedPercent}%`, background: 'rgba(255,255,255,0.4)', borderRadius: 3 }} />
                      <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${progressPercent}%`, background: 'var(--red, #e50914)', borderRadius: 3 }} />
                    </div>

                    {/* Bottom Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <button type="button" onClick={togglePlay} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                          <i className={`fas fa-${isPlaying ? 'pause' : 'play'}`}></i>
                        </button>
                        <button type="button" onClick={() => seek(-10)} title="Lùi 10s" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                          <i className="fas fa-rotate-left"></i>
                        </button>
                        <button type="button" onClick={() => seek(10)} title="Tua 10s" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                          <i className="fas fa-rotate-right"></i>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (videoRef.current) {
                              videoRef.current.muted = !videoRef.current.muted;
                              setIsMuted(videoRef.current.muted);
                            }
                          }}
                          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
                        >
                          <i className={`fas fa-${isMuted ? 'volume-xmark' : 'volume-high'}`}></i>
                        </button>
                        <span style={{ fontSize: '0.78rem', color: '#ccc' }}>
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <button
                          type="button"
                          onClick={() => setUseEmbed(!useEmbed)}
                          style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            color: '#fff',
                            borderRadius: 4,
                            padding: '2px 8px',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                          }}
                        >
                          CC
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (!document.fullscreenElement) {
                              containerRef.current?.requestFullscreen().catch(() => {});
                            } else {
                              document.exitFullscreen().catch(() => {});
                            }
                          }}
                          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
                        >
                          <i className="fas fa-expand"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Quick Action Toggles Bar (DaoPhim Style) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
                padding: '14px 4px',
                fontSize: '0.82rem',
                color: '#a1a1aa',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {/* Left Toggles */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <button
                  type="button"
                  onClick={() => setAutoNext(!autoNext)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: autoNext ? '#fff' : '#71717a',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontWeight: 600,
                  }}
                >
                  <span>Chuyển tập</span>
                  <span style={{ background: autoNext ? '#fbbf24' : '#3f3f46', color: '#000', fontSize: '0.68rem', fontWeight: 800, padding: '1px 6px', borderRadius: 4 }}>
                    {autoNext ? 'ON' : 'OFF'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSkipIntro(!skipIntro)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: skipIntro ? '#fff' : '#71717a',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontWeight: 600,
                  }}
                >
                  <span>Bỏ qua giới thiệu</span>
                  <span style={{ background: skipIntro ? '#fbbf24' : '#3f3f46', color: '#000', fontSize: '0.68rem', fontWeight: 800, padding: '1px 6px', borderRadius: 4 }}>
                    {skipIntro ? 'ON' : 'OFF'}
                  </span>
                </button>
              </div>

              {/* Right Options */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('open-feedback'))}
                  style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <i className="fas fa-flag"></i> Báo lỗi
                </button>

                <button
                  type="button"
                  onClick={() => setTheaterMode(!theaterMode)}
                  style={{ background: 'none', border: 'none', color: theaterMode ? '#fff' : '#a1a1aa', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <span>Rạp phim</span>
                  <span style={{ background: theaterMode ? '#fbbf24' : '#3f3f46', color: '#000', fontSize: '0.68rem', fontWeight: 800, padding: '1px 6px', borderRadius: 4 }}>
                    {theaterMode ? 'ON' : 'OFF'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    alert('Đã sao chép liên kết xem phim!');
                  }}
                  style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <i className="fas fa-tower-broadcast"></i> Xem chung
                </button>
              </div>
            </div>

            {/* Source & Episodes Selection Box (DaoPhim Style) */}
            <div
              style={{
                marginTop: 20,
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 14,
                padding: '16px 20px',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.92rem', color: '#fff' }}>
                  <i className="fas fa-bars-staggered" style={{ color: '#fbbf24' }}></i>
                  <span>Bản Full</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#a1a1aa' }}>
                  <span>Rút gọn</span>
                  <button
                    type="button"
                    onClick={() => setIsCompact(!isCompact)}
                    style={{
                      width: 34,
                      height: 18,
                      borderRadius: 10,
                      background: isCompact ? '#fbbf24' : '#3f3f46',
                      border: 'none',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: 2,
                        left: isCompact ? 18 : 2,
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        background: '#fff',
                        transition: 'left 0.2s',
                      }}
                    />
                  </button>
                </div>
              </div>

              {/* 4 Sources Row */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                {SOURCES.map((s) => {
                  const isActive = currentSource === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        if (s.isLive) {
                          setCurrentSource(s.id);
                          if (s.id === 'daophim') setUseEmbed(true);
                          else setUseEmbed(false);
                        }
                      }}
                      style={{
                        background: isActive ? '#c084fc' : 'rgba(255, 255, 255, 0.05)',
                        color: isActive ? '#000' : '#d4d4d8',
                        border: '1px solid ' + (isActive ? '#c084fc' : 'rgba(255, 255, 255, 0.08)'),
                        padding: '6px 14px',
                        borderRadius: 20,
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: s.isLive ? 'pointer' : 'not-allowed',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        opacity: s.isLive ? 1 : 0.6,
                      }}
                    >
                      <span>{s.name}</span>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          background: isActive ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.1)',
                          color: isActive ? '#000' : s.isLive ? '#facc15' : '#71717a',
                          padding: '1px 5px',
                          borderRadius: 8,
                        }}
                      >
                        • {s.ping}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Episodes List Row */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {serverEpisodes.map((ep, idx) => {
                  const isSelected = (currentEpisode?.slug || selectedEpSlug) === ep.slug;
                  return (
                    <button
                      key={ep.slug || idx}
                      type="button"
                      onClick={() => setSelectedEpSlug(ep.slug)}
                      style={{
                        background: isSelected ? '#fbbf24' : 'rgba(255,255,255,0.06)',
                        color: isSelected ? '#000' : '#fff',
                        border: '1px solid ' + (isSelected ? '#fbbf24' : 'rgba(255,255,255,0.08)'),
                        padding: '8px 18px',
                        borderRadius: 8,
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      {isSelected && <i className="fas fa-play" style={{ fontSize: '0.7rem' }}></i>}
                      <span>{ep.name.startsWith('Tập') ? ep.name : ep.name === 'Full' ? 'Full' : `Tập ${ep.name}`}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Movie Info & Emoji Reactions (Exact DaoPhim Card) */}
          {!theaterMode && (
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 16,
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              {/* Header Title */}
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 4px', color: '#fff' }}>
                  {movie.name} – {currentEpisode?.name || 'Full'}
                </h2>
                <p style={{ fontSize: '0.8rem', color: '#a1a1aa', margin: '0 0 10px' }}>
                  {movie.origin_name}
                </p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ background: '#0d9488', color: '#fff', fontSize: '0.68rem', fontWeight: 800, padding: '2px 6px', borderRadius: 4 }}>
                    {movie.quality || 'HD'}
                  </span>
                  <span style={{ background: '#7c3aed', color: '#fff', fontSize: '0.68rem', fontWeight: 800, padding: '2px 6px', borderRadius: 4 }}>
                    🔤 {movie.lang || 'SONG NGỮ'}
                  </span>
                  <span style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.68rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>
                    {serverEpisodes.length || 1} Tập
                  </span>
                  <span style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.68rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>
                    {movie.year || '2026'}
                  </span>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#71717a', margin: '8px 0 0' }}>
                  • SINGLE • {movie.time || '107 phút'}
                </p>
              </div>

              {/* Short description */}
              <div style={{ fontSize: '0.8rem', color: '#9ca3af', lineHeight: 1.6, maxHeight: 110, overflowY: 'auto' }}>
                {movie.content ? movie.content.replace(/<[^>]*>?/gm, '') : 'Bộ phim xoay quanh những tình tiết kịch tính và hấp dẫn.'}
              </div>

              {/* Chi tiết button */}
              <Link
                href={`/phim/${movie.slug}`}
                style={{
                  background: '#fff',
                  color: '#000',
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'inline-block',
                  width: 'fit-content',
                }}
              >
                Chi tiết
              </Link>

              {/* Rating & Emojis Box (DaoPhim Style) */}
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 700 }}>
                    <span>😍</span> <span>{userRating ? '10 / 10' : '0 / 10'}</span>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: '#2dd4bf', fontWeight: 600 }}>Đánh giá</span>
                </div>

                <p style={{ fontSize: '0.75rem', color: '#a1a1aa', textAlign: 'center', margin: '0 0 10px' }}>
                  Bạn nghĩ gì về phim này?
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, textAlign: 'center' }}>
                  {[
                    { label: 'Tệ', emoji: '😭' },
                    { label: 'Tạm', emoji: '😐' },
                    { label: 'Hay', emoji: '😊' },
                    { label: 'Thích', emoji: '🥰' },
                    { label: 'Tuyệt', emoji: '😍' },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setUserRating(item.label)}
                      style={{
                        background: userRating === item.label ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255,255,255,0.03)',
                        border: '1px solid ' + (userRating === item.label ? '#fbbf24' : 'transparent'),
                        borderRadius: 8,
                        padding: '6px 2px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>{item.emoji}</span>
                      <span style={{ fontSize: '0.65rem', color: userRating === item.label ? '#fbbf24' : '#a1a1aa' }}>
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
