'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Hls from 'hls.js';

interface VideoPlayerProps {
  m3u8Url?: string;
  embedUrl?: string;
  movieTitle: string;
  episodeName: string;
  initialTime?: number;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onNextEpisode?: () => void;
}

export default function VideoPlayer({
  m3u8Url,
  embedUrl,
  movieTitle,
  episodeName,
  initialTime = 0,
  onTimeUpdate,
  onNextEpisode,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Compute official player embed URL
  const officialPlayerUrl = useMemo(() => {
    if (embedUrl) return embedUrl;
    if (m3u8Url) return `https://player.phimapi.com/player/?url=${encodeURIComponent(m3u8Url)}`;
    return '';
  }, [m3u8Url, embedUrl]);

  // If no m3u8 stream is available, default directly to embed mode!
  const [useEmbed, setUseEmbed] = useState<boolean>(() => !m3u8Url && !!(embedUrl || officialPlayerUrl));
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
  const [showResumeToast, setShowResumeToast] = useState(initialTime > 15);

  // Synchronize useEmbed if m3u8Url changes
  useEffect(() => {
    if (!m3u8Url && officialPlayerUrl) {
      setUseEmbed(true);
    }
  }, [m3u8Url, officialPlayerUrl]);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (!videoRef.current?.paused) setShowControls(false);
    }, 3500);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      v.pause();
      setIsPlaying(false);
    }
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  const seek = useCallback((seconds: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + seconds));
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return;
      if (!videoRef.current || useEmbed) return;

      const key = e.key.toLowerCase();
      if (key === ' ' || key === 'k') { e.preventDefault(); togglePlay(); }
      else if (key === 'f') {
        e.preventDefault();
        if (!document.fullscreenElement) containerRef.current?.requestFullscreen().catch(() => {});
        else document.exitFullscreen().catch(() => {});
      }
      else if (key === 'm') {
        e.preventDefault();
        videoRef.current.muted = !videoRef.current.muted;
        setIsMuted(videoRef.current.muted);
      }
      else if (key === 'arrowleft') { e.preventDefault(); seek(-10); }
      else if (key === 'arrowright') { e.preventDefault(); seek(10); }
      else if (key === 'n' && onNextEpisode) { e.preventDefault(); onNextEpisode(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, seek, onNextEpisode, useEmbed]);

  // HLS Stream Setup
  useEffect(() => {
    if (useEmbed) {
      setLoading(false);
      return;
    }

    const video = videoRef.current;
    if (!m3u8Url) {
      if (officialPlayerUrl) setUseEmbed(true);
      setLoading(false);
      return;
    }

    if (!video) return;
    setLoading(true);

    const fallbackTimer = setTimeout(() => {
      if (video.readyState < 2 && officialPlayerUrl) {
        setUseEmbed(true);
        setLoading(false);
      }
    }, 3500);

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
        clearTimeout(fallbackTimer);
        setLoading(false);
        if (initialTime > 5) video.currentTime = initialTime;
        video.play().then(() => setIsPlaying(true)).catch(() => {
          video.muted = true;
          setIsMuted(true);
          video.play().then(() => setIsPlaying(true)).catch(() => {});
        });
      });

      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          clearTimeout(fallbackTimer);
          if (officialPlayerUrl) setUseEmbed(true);
          setLoading(false);
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = m3u8Url;
      video.addEventListener('loadedmetadata', () => {
        clearTimeout(fallbackTimer);
        setLoading(false);
        if (initialTime > 5) video.currentTime = initialTime;
        video.play().catch(() => {});
      });
    } else if (officialPlayerUrl) {
      clearTimeout(fallbackTimer);
      setUseEmbed(true);
      setLoading(false);
    }

    return () => {
      clearTimeout(fallbackTimer);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [m3u8Url, officialPlayerUrl, useEmbed, initialTime]);

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
    setDuration(v.duration || 0);
    if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1));
    if (onTimeUpdate && v.duration > 0) onTimeUpdate(v.currentTime, v.duration);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;

  // Embed mode (Iframe)
  if (useEmbed && officialPlayerUrl) {
    return (
      <div
        ref={containerRef}
        style={{ position: 'relative', width: '100%', height: '100%', background: '#000' }}
      >
        <iframe
          src={officialPlayerUrl}
          allowFullScreen
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          title={`${movieTitle} - ${episodeName}`}
        />
        {/* Toggle back to custom player if m3u8 available */}
        {m3u8Url && (
          <button
            type="button"
            onClick={() => setUseEmbed(false)}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              zIndex: 10,
            }}
          >
            <i className="fas fa-play" style={{ marginRight: 6 }}></i>
            Chuyển Player HLS
          </button>
        )}
      </div>
    );
  }

  // Custom HLS Player mode (Netflix style)
  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', height: '100%', background: '#000', overflow: 'hidden' }}
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        playsInline
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onEnded={onNextEpisode}
        onCanPlay={() => setLoading(false)}
        onLoadedData={() => setLoading(false)}
        onWaiting={() => setLoading(true)}
        onPlaying={() => { setLoading(false); setIsPlaying(true); }}
        onPause={() => { setLoading(false); setIsPlaying(false); }}
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
      />

      {/* Floating Header Overlay (Back + Title) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '16px 20px',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.85) 0%, transparent 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 20,
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>
            {movieTitle}
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--red, #e50914)', fontWeight: 700 }}>
            • {episodeName}
          </span>
        </div>

        {officialPlayerUrl && (
          <button
            type="button"
            onClick={() => setUseEmbed(true)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <i className="fas fa-arrow-up-right-from-square" style={{ marginRight: 5 }}></i>
            Embed Player
          </button>
        )}
      </div>

      {/* Center Play Overlay */}
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
            background: 'rgba(0,0,0,0.35)',
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(20,20,20,0.6)',
              color: '#fff',
              fontSize: '1.6rem',
              boxShadow: '0 8px 30px rgba(0,0,0,0.7)',
              transition: 'transform 0.2s',
            }}
          >
            <i className="fas fa-play" style={{ marginLeft: 4 }}></i>
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
            flexDirection: 'column',
            gap: 12,
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.65)',
            zIndex: 15,
          }}
        >
          <div className="vip-spinner"></div>
          {officialPlayerUrl && (
            <button
              type="button"
              onClick={() => setUseEmbed(true)}
              style={{
                background: 'var(--red, #e50914)',
                border: 'none',
                color: '#fff',
                padding: '8px 18px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(229,9,20,0.4)',
              }}
            >
              <i className="fas fa-play" style={{ marginRight: 6 }}></i>Chuyển Embed Player
            </button>
          )}
        </div>
      )}

      {/* Resume Playback Toast */}
      {showResumeToast && initialTime > 15 && (
        <div
          style={{
            position: 'absolute',
            bottom: '70px',
            right: '24px',
            background: 'rgba(20,20,28,0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '8px',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            zIndex: 40,
            boxShadow: '0 8px 30px rgba(0,0,0,0.85)',
          }}
        >
          <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>
            Tiếp tục xem từ <strong style={{ color: '#46d369' }}>{formatTime(initialTime)}</strong>?
          </div>
          <button
            type="button"
            onClick={() => {
              if (videoRef.current) {
                videoRef.current.currentTime = 0;
              }
              setShowResumeToast(false);
            }}
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Xem từ đầu
          </button>
          <button
            type="button"
            onClick={() => setShowResumeToast(false)}
            style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '2px 4px' }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      {/* Netflix Bottom Controls Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '24px 18px 14px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 60%, transparent 100%)',
          zIndex: 25,
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
      >
        {/* Progress Timeline Scrubber */}
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
            height: 6,
            background: 'rgba(255,255,255,0.25)',
            borderRadius: 3,
            cursor: 'pointer',
            marginBottom: 12,
            transition: 'height 0.15s',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              width: `${bufferedPercent}%`,
              background: 'rgba(255,255,255,0.4)',
              borderRadius: 3,
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              width: `${progressPercent}%`,
              background: 'var(--red, #e50914)',
              borderRadius: 3,
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Buttons Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.9rem' }}>
          {/* Left Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              type="button"
              onClick={togglePlay}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem' }}
            >
              <i className={`fas fa-${isPlaying ? 'pause' : 'play'}`}></i>
            </button>
            <button
              type="button"
              onClick={() => seek(-10)}
              title="Lùi 10 giây"
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.05rem' }}
            >
              <i className="fas fa-rotate-left"></i>
            </button>
            <button
              type="button"
              onClick={() => seek(10)}
              title="Tua 10 giây"
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.05rem' }}
            >
              <i className="fas fa-rotate-right"></i>
            </button>
            {onNextEpisode && (
              <button
                type="button"
                onClick={onNextEpisode}
                title="Tập tiếp theo"
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.05rem' }}
              >
                <i className="fas fa-forward-step"></i>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.muted = !videoRef.current.muted;
                  setIsMuted(videoRef.current.muted);
                }
              }}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.05rem' }}
            >
              <i className={`fas fa-${isMuted ? 'volume-xmark' : 'volume-high'}`}></i>
            </button>
            <span style={{ fontSize: '0.8rem', color: '#ccc', fontVariantNumeric: 'tabular-nums' }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                  borderRadius: 4,
                  padding: '3px 8px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {speed}x
              </button>
              {showSpeedMenu && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    right: 0,
                    marginBottom: 8,
                    background: 'rgba(20,20,28,0.98)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 8,
                    padding: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    zIndex: 30,
                  }}
                >
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        if (videoRef.current) videoRef.current.playbackRate = s;
                        setSpeed(s);
                        setShowSpeedMenu(false);
                      }}
                      style={{
                        background: speed === s ? 'var(--red, #e50914)' : 'none',
                        border: 'none',
                        color: '#fff',
                        padding: '4px 14px',
                        borderRadius: 4,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                if (!document.fullscreenElement) containerRef.current?.requestFullscreen().catch(() => {});
                else document.exitFullscreen().catch(() => {});
              }}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.1rem' }}
            >
              <i className="fas fa-expand"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
