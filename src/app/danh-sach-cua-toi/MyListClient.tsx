'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useMyList } from '@/hooks/useMyList';
import { useWatchHistory } from '@/hooks/useWatchHistory';
import BrowseCard from '@/components/BrowseCard';
import { getImageUrl } from '@/lib/api';

export default function MyListClient() {
  const { list, isLoaded: listLoaded } = useMyList();
  const { history, isLoaded: historyLoaded, removeFromHistory } = useWatchHistory();
  const [activeTab, setActiveTab] = useState<'saved' | 'history'>('saved');

  if (!listLoaded || !historyLoaded) {
    return (
      <div style={{ padding: '120px 0', textAlign: 'center', color: 'var(--t2, #a3a3a3)' }}>
        <div className="vip-spinner" style={{ margin: '0 auto 16px' }}></div>
        <p>Đang tải dữ liệu của bạn...</p>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    if (!seconds || seconds <= 0) return '';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <section className="browse" id="browse" style={{ display: 'block', paddingTop: 84, minHeight: '75vh', maxWidth: '1360px', margin: '0 auto', paddingBottom: 60 }}>
      {/* Header with Tab Switcher */}
      <div style={{ padding: '0 24px', marginBottom: 28 }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, margin: '0 0 16px' }}>
          Tủ Phim Của Bạn
        </h1>

        {/* Tab Buttons */}
        <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 16 }}>
          <button
            type="button"
            onClick={() => setActiveTab('saved')}
            style={{
              padding: '8px 20px',
              borderRadius: '24px',
              border: '1px solid ' + (activeTab === 'saved' ? 'var(--red, #e50914)' : 'rgba(255,255,255,0.12)'),
              background: activeTab === 'saved' ? 'var(--red, #e50914)' : 'rgba(255,255,255,0.06)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: activeTab === 'saved' ? '0 4px 14px rgba(229,9,20,0.4)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            <i className="fas fa-heart"></i>
            <span>Đã lưu ({list.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            style={{
              padding: '8px 20px',
              borderRadius: '24px',
              border: '1px solid ' + (activeTab === 'history' ? 'var(--red, #e50914)' : 'rgba(255,255,255,0.12)'),
              background: activeTab === 'history' ? 'var(--red, #e50914)' : 'rgba(255,255,255,0.06)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: activeTab === 'history' ? '0 4px 14px rgba(229,9,20,0.4)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            <i className="fas fa-clock-rotate-left"></i>
            <span>Tiếp tục xem ({history.length})</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Saved Movies */}
      {activeTab === 'saved' && (
        <div style={{ padding: '0 24px' }}>
          {list.length > 0 ? (
            <div className="browse__grid" id="browse-grid">
              {list.map((item) => (
                <BrowseCard
                  key={item.slug}
                  movie={{
                    slug: item.slug,
                    name: item.name,
                    origin_name: item.origin_name,
                    poster_url: item.poster_url,
                    thumb_url: item.thumb_url,
                    quality: item.quality,
                    lang: item.lang,
                    episode_current: item.episode_current,
                    year: item.year,
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="browse__empty" style={{ textAlign: 'center', padding: '60px 0' }}>
              <i className="fas fa-heart-crack" style={{ fontSize: '3rem', color: '#444', marginBottom: 16 }}></i>
              <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>Danh sách xem sau đang trống</p>
              <span style={{ color: 'var(--t2, #a3a3a3)', fontSize: '0.88rem' }}>
                Hãy bấm nút <b>+ Thêm vào danh sách</b> trên bất kỳ bộ phim nào bạn yêu thích.
              </span>
              <div style={{ marginTop: 24 }}>
                <Link href="/" className="btn btn--play" style={{ display: 'inline-flex', padding: '10px 24px' }}>
                  <i className="fas fa-compass"></i> Khám phá phim ngay
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Watch History & Resume */}
      {activeTab === 'history' && (
        <div style={{ padding: '0 24px' }}>
          {history.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 16,
              }}
            >
              {history.map((item) => {
                const poster = getImageUrl(item.poster_url || item.thumb_url);
                const progressPct =
                  item.duration > 0
                    ? Math.min(100, Math.max(5, (item.current_time / item.duration) * 100))
                    : item.current_time > 0
                    ? 40
                    : 15;

                const targetUrl = `/xem-phim/${item.slug}${
                  item.episode_slug ? `?tap=${item.episode_slug}&server=${item.server_index || 0}` : ''
                }`;

                return (
                  <div
                    key={item.slug}
                    style={{
                      position: 'relative',
                      borderRadius: 10,
                      overflow: 'hidden',
                      background: '#181818',
                      border: '1px solid rgba(255,255,255,0.1)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {/* Poster */}
                    <div style={{ position: 'relative', width: '100%', aspectRatio: '16/10', background: '#000' }}>
                      <img
                        src={poster}
                        alt={item.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.8) 100%)',
                        }}
                      />

                      {/* Delete button */}
                      <button
                        type="button"
                        title="Xóa khỏi lịch sử"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeFromHistory(item.slug);
                        }}
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: 'rgba(0,0,0,0.75)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          zIndex: 5,
                        }}
                      >
                        <i className="fas fa-times"></i>
                      </button>

                      {/* Progress Bar */}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: 4,
                          background: 'rgba(255,255,255,0.3)',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${progressPct}%`,
                            background: 'var(--red, #e50914)',
                          }}
                        />
                      </div>
                    </div>

                    {/* Card Content */}
                    <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff', marginBottom: 4, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#46d369', fontWeight: 600, marginBottom: 12 }}>
                          {item.episode_name || 'Tập 01'}{item.current_time > 0 ? ` • Đã xem ${formatTime(item.current_time)}` : ''}
                        </div>
                      </div>

                      <Link
                        href={targetUrl}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          background: 'var(--red, #e50914)',
                          color: '#fff',
                          padding: '8px 12px',
                          borderRadius: 6,
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          textDecoration: 'none',
                          boxShadow: '0 4px 12px rgba(229,9,20,0.35)',
                        }}
                      >
                        <i className="fas fa-play" style={{ fontSize: '0.75rem' }}></i>
                        <span>Tiếp tục xem</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="browse__empty" style={{ textAlign: 'center', padding: '60px 0' }}>
              <i className="fas fa-clock-rotate-left" style={{ fontSize: '3rem', color: '#444', marginBottom: 16 }}></i>
              <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>Chưa có lịch sử xem phim</p>
              <span style={{ color: 'var(--t2, #a3a3a3)', fontSize: '0.88rem' }}>
                Khi bạn xem bất kỳ bộ phim nào, tiến trình xem sẽ tự động được lưu lại tại đây.
              </span>
              <div style={{ marginTop: 24 }}>
                <Link href="/" className="btn btn--play" style={{ display: 'inline-flex', padding: '10px 24px' }}>
                  <i className="fas fa-compass"></i> Khám phá phim ngay
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
