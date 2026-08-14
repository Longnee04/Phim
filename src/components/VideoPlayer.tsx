'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
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

  // Compute official player embed URL (just like DaoPhim)
  const officialPlayerUrl = React.useMemo(() => {
    if (embedUrl) return embedUrl;
    if (m3u8Url) {
      return `https://player.phimapi.com/player/?url=${encodeURIComponent(m3u8Url)}`;
    }
    return '';
  }, [m3u8Url, embedUrl]);

  // Mode: 'hls' (Direct HTML5) or 'embed' (DaoPhim / PhimAPI Official Player)
  const [playerMode, setPlayerMode] = useState<'hls' | 'embed'>('hls');
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

  // OSD Overlays
  const [seekOsdText, setSeekOsdText] = useState<string | null>(null);
  const [volumeOsd, setVolumeOsd] = useState<{ show: boolean; val: number }>({ show: false, val: 1 });
  const [centerIcon, setCenterIcon] = useState<string | null>(null);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const h = Math.floor(m / 60);
    const remM = m % 60;
    if (h > 0) {
      return `${h}:${remM < 10 ? '0' : ''}${remM}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${remM < 10 ? '0' : ''}${remM}:${s < 10 ? '0' : ''}${s}`;
  };

  const triggerCenterIndicator = (icon: 'play' | 'pause') => {
    setCenterIcon(icon);
    setTimeout(() => setCenterIcon(null), 500);
  };

  const triggerSeekOsd = (text: string) => {
    setSeekOsdText(text);
    setTimeout(() => setSeekOsdText(null), 800);
  };

  const triggerVolumeOsd = (val: number) => {
    setVolumeOsd({ show: true, val });
    setTimeout(() => setVolumeOsd({ show: false, val }), 1000);
  };

  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3500);
  };

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().then(() => setIsPlaying(true)).catch(() => {});
      triggerCenterIndicator('play');
    } else {
      v.pause();
      setIsPlaying(false);
      triggerCenterIndicator('pause');
    }
    resetControlsTimeout();
  }, [isPlaying]);

  const seekRelative = useCallback((seconds: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + seconds));
    triggerSeekOsd(seconds > 0 ? `+${seconds}s` : `${seconds}s`);
    resetControlsTimeout();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;

      const v = videoRef.current;
      if (!v || playerMode === 'embed') return;

      const key = e.key.toLowerCase();
      if (key === ' ' || key === 'k') {
        e.preventDefault();
        togglePlay();
      } else if (key === 'f') {
        e.preventDefault();
        if (!document.fullscreenElement) {
          containerRef.current?.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      } else if (key === 'm') {
        e.preventDefault();
        v.muted = !v.muted;
        setIsMuted(v.muted);
      } else if (key === 'arrowleft') {
        e.preventDefault();
        seekRelative(-10);
      } else if (key === 'arrowright') {
        e.preventDefault();
        seekRelative(10);
      } else if (key === 'arrowup') {
        e.preventDefault();
        const nextVol = Math.min(1, v.volume + 0.1);
        v.volume = nextVol;
        setVolume(nextVol);
        setIsMuted(false);
        triggerVolumeOsd(nextVol);
      } else if (key === 'arrowdown') {
        e.preventDefault();
        const nextVol = Math.max(0, v.volume - 0.1);
        v.volume = nextVol;
        setVolume(nextVol);
        triggerVolumeOsd(nextVol);
      } else if (key === 'n' && onNextEpisode) {
        e.preventDefault();
        onNextEpisode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, seekRelative, onNextEpisode, playerMode]);

  // HLS Stream Setup
  useEffect(() => {
    if (playerMode === 'embed') {
      setLoading(false);
      return;
    }

    const video = videoRef.current;

    if (!m3u8Url) {
      if (officialPlayerUrl) setPlayerMode('embed');
      setLoading(false);
      return;
    }

    if (!video) return;

    setLoading(true);

    // Auto-fallback: if HLS cannot start playback within 3.5s, switch to official embed
    const autoFallbackTimer = setTimeout(() => {
      if (video.readyState < 2) {
        console.warn('HLS stream load took > 3.5s, auto-switching to DaoPhim official player embed');
        setPlayerMode('embed');
        setLoading(false);
      }
    }, 3500);

    if (Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        maxBufferSize: 60 * 1024 * 1024,
        enableWorker: true,
        startFragPrefetch: true,
        lowLatencyMode: false,
        manifestLoadingMaxRetry: 3,
        levelLoadingMaxRetry: 3,
        fragLoadingMaxRetry: 3,
      });

      hlsRef.current = hls;
      hls.loadSource(m3u8Url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        clearTimeout(autoFallbackTimer);
        setLoading(false);
        if (initialTime && initialTime > 5) {
          video.currentTime = initialTime;
        }
        video.play().then(() => setIsPlaying(true)).catch(() => {
          video.muted = true;
          setIsMuted(true);
          video.play().then(() => setIsPlaying(true)).catch(() => {});
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          clearTimeout(autoFallbackTimer);
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // Try one load restart, then fallback to embed
              hls.startLoad();
              setTimeout(() => {
                if (video.readyState < 2 && officialPlayerUrl) {
                  setPlayerMode('embed');
                }
              }, 1500);
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              if (officialPlayerUrl) {
                setPlayerMode('embed');
              }
              setLoading(false);
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = m3u8Url;
      video.addEventListener('loadedmetadata', () => {
        clearTimeout(autoFallbackTimer);
        setLoading(false);
        if (initialTime && initialTime > 5) {
          video.currentTime = initialTime;
        }
        video.play().then(() => setIsPlaying(true)).catch(() => {});
      });
    } else if (officialPlayerUrl) {
      clearTimeout(autoFallbackTimer);
      setPlayerMode('embed');
      setLoading(false);
    }

    return () => {
      clearTimeout(autoFallbackTimer);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [m3u8Url, officialPlayerUrl, playerMode, initialTime]);

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
    setDuration(v.duration || 0);

    if (v.buffered.length > 0) {
      setBuffered(v.buffered.end(v.buffered.length - 1));
    }

    if (onTimeUpdate && v.duration > 0) {
      onTimeUpdate(v.currentTime, v.duration);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    v.currentTime = pos * v.duration;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Top Stream Mode Switcher Bar (Like DaoPhim) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 14px',
          background: 'rgba(18, 18, 26, 0.95)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          fontSize: '0.78rem',
          color: '#a1a1aa',
          borderRadius: '8px 8px 0 0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#fff' }}>
          <i className="fas fa-tower-broadcast" style={{ color: 'var(--red, #e50914)' }}></i>
          <span>Luồng Phát Phim:</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Luồng 1: HLS Direct VIP */}
          <button
            type="button"
            onClick={() => setPlayerMode('hls')}
            style={{
              background: playerMode === 'hls' ? 'var(--red, #e50914)' : 'rgba(255, 255, 255, 0.06)',
              border: '1px solid ' + (playerMode === 'hls' ? 'var(--red, #e50914)' : 'rgba(255, 255, 255, 0.15)'),
              color: '#fff',
              padding: '4px 12px',
              borderRadius: 16,
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              transition: 'all 0.2s ease',
            }}
          >
            <i className="fas fa-bolt"></i> Luồng VIP (HLS)
          </button>

          {/* Luồng 2: DaoPhim / PhimAPI Official Player */}
          {officialPlayerUrl && (
            <button
              type="button"
              onClick={() => setPlayerMode('embed')}
              style={{
                background: playerMode === 'embed' ? 'var(--red, #e50914)' : 'rgba(255, 255, 255, 0.06)',
                border: '1px solid ' + (playerMode === 'embed' ? 'var(--red, #e50914)' : 'rgba(255, 255, 255, 0.15)'),
                color: '#fff',
                padding: '4px 12px',
                borderRadius: 16,
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                transition: 'all 0.2s ease',
              }}
            >
              <i className="fas fa-shield-halved"></i> Luồng DaoPhim Player
            </button>
          )}
        </div>
      </div>

      {/* Main Video View Container */}
      {playerMode === 'embed' && officialPlayerUrl ? (
        <div
          ref={containerRef}
          className="vip-container"
          style={{
            width: '100%',
            aspectRatio: '16/9',
            background: '#000',
            position: 'relative',
            borderRadius: '0 0 8px 8px',
            overflow: 'hidden',
          }}
        >
          <iframe
            src={officialPlayerUrl}
            allowFullScreen
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            style={{ width: '100%', height: '100%', border: 'none' }}
            title={movieTitle}
          />
        </div>
      ) : (
        <div
          ref={containerRef}
          className="vip-container"
          id="vip-container"
          onMouseMove={resetControlsTimeout}
          onMouseLeave={() => isPlaying && setShowControls(false)}
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16/9',
            background: '#000',
            borderRadius: '0 0 8px 8px',
            overflow: 'hidden',
            cursor: showControls ? 'default' : 'none',
          }}
        >
          <video
            ref={videoRef}
            id="vip-video"
            playsInline
            onClick={togglePlay}
            onTimeUpdate={handleTimeUpdate}
            onEnded={onNextEpisode}
            onCanPlay={() => setLoading(false)}
            onLoadedData={() => setLoading(false)}
            onWaiting={() => setLoading(true)}
            onPlaying={() => {
              setLoading(false);
              setIsPlaying(true);
            }}
            onPause={() => {
              setLoading(false);
              setIsPlaying(false);
            }}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />

          {/* Loading Spinner with switch button */}
          {loading && (
            <div
              id="vip-loading"
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0, 0, 0, 0.7)',
                zIndex: 10,
                pointerEvents: 'all',
              }}
            >
              <div className="vip-spinner"></div>
              {officialPlayerUrl && (
                <button
                  type="button"
                  onClick={() => setPlayerMode('embed')}
                  style={{
                    background: 'var(--red, #e50914)',
                    border: 'none',
                    color: '#fff',
                    padding: '8px 16px',
                    borderRadius: 20,
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(229, 9, 20, 0.4)',
                  }}
                >
                  <i className="fas fa-play" style={{ marginRight: 6 }}></i> Chuyển sang Luồng DaoPhim Player
                </button>
              )}
            </div>
          )}

          {/* Center Icon (Play/Pause indicator) */}
          {centerIcon && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                zIndex: 15,
              }}
            >
              <div
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: '50%',
                  background: 'rgba(0, 0, 0, 0.65)',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '1.8rem',
                  animation: 'scale-up 0.3s ease',
                }}
              >
                <i className={`fas fa-${centerIcon}`}></i>
              </div>
            </div>
          )}

          {/* Seek OSD */}
          {seekOsdText && (
            <div
              style={{
                position: 'absolute',
                top: '20%',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.8)',
                padding: '8px 16px',
                borderRadius: 20,
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.9rem',
                zIndex: 20,
                pointerEvents: 'none',
              }}
            >
              {seekOsdText}
            </div>
          )}

          {/* Volume OSD */}
          {volumeOsd.show && (
            <div
              style={{
                position: 'absolute',
                top: '20%',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.8)',
                padding: '8px 16px',
                borderRadius: 20,
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.9rem',
                zIndex: 20,
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <i className="fas fa-volume-high"></i>
              <span>{Math.round(volumeOsd.val * 100)}%</span>
            </div>
          )}

          {/* Controls Overlay */}
          <div
            className="vip-controls"
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '20px 16px 12px',
              background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)',
              zIndex: 20,
              opacity: showControls ? 1 : 0,
              pointerEvents: showControls ? 'all' : 'none',
              transition: 'opacity 0.3s ease',
            }}
          >
            {/* Progress Bar */}
            <div
              className="vip-progress-wrap"
              onClick={handleProgressClick}
              style={{
                position: 'relative',
                width: '100%',
                height: 6,
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: 3,
                cursor: 'pointer',
                marginBottom: 12,
              }}
            >
              {/* Buffered */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: '100%',
                  width: `${bufferedPercent}%`,
                  background: 'rgba(255, 255, 255, 0.4)',
                  borderRadius: 3,
                }}
              />
              {/* Current Progress */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: '100%',
                  width: `${progressPercent}%`,
                  background: 'var(--red, #e50914)',
                  borderRadius: 3,
                }}
              />
            </div>

            {/* Action Controls Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#fff',
                fontSize: '0.9rem',
              }}
            >
              {/* Left Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <button
                  type="button"
                  onClick={togglePlay}
                  style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.1rem' }}
                >
                  <i className={`fas fa-${isPlaying ? 'pause' : 'play'}`}></i>
                </button>

                {onNextEpisode && (
                  <button
                    type="button"
                    onClick={onNextEpisode}
                    title="Tập tiếp theo"
                    style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
                  >
                    <i className="fas fa-forward-step"></i>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const v = videoRef.current;
                    if (!v) return;
                    v.muted = !v.muted;
                    setIsMuted(v.muted);
                  }}
                  style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
                >
                  <i className={`fas fa-${isMuted ? 'volume-xmark' : 'volume-high'}`}></i>
                </button>

                <span style={{ fontSize: '0.82rem', color: '#d4d4d8' }}>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              {/* Right Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {/* Playback speed */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#fff',
                      borderRadius: 4,
                      padding: '2px 8px',
                      fontSize: '0.75rem',
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
                        background: 'rgba(20, 20, 28, 0.95)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
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
                            const v = videoRef.current;
                            if (v) v.playbackRate = s;
                            setSpeed(s);
                            setShowSpeedMenu(false);
                          }}
                          style={{
                            background: speed === s ? 'var(--red, #e50914)' : 'none',
                            border: 'none',
                            color: '#fff',
                            padding: '4px 12px',
                            borderRadius: 4,
                            fontSize: '0.75rem',
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

                {/* Fullscreen */}
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
        </div>
      )}
    </div>
  );
}
