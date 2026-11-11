'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { MovieDetailResponse } from '@/types/movie';
import { getMovieDetail } from '@/lib/api';
import WatchClient from '@/components/WatchClient';

interface WatchFallbackProps {
  slug: string;
  initialTapSlug?: string;
  initialServerIndex?: number;
}

export default function WatchFallback({
  slug,
  initialTapSlug,
  initialServerIndex = 0,
}: WatchFallbackProps) {
  const [data, setData] = useState<MovieDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setFailed(false);

    getMovieDetail(slug)
      .then((res) => {
        if (!isMounted) return;
        if (res && res.movie && res.episodes && res.episodes.length > 0) {
          setData(res);
        } else {
          setFailed(true);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setFailed(true);
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0f',
          color: '#fff',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            border: '4px solid rgba(255, 255, 255, 0.1)',
            borderTopColor: '#e50914',
            animation: 'spin 0.8s linear infinite',
            marginBottom: '20px',
          }}
        />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>
          Đang khởi tạo trình phát phim...
        </h2>
        <p style={{ color: 'var(--t2, #a3a3a3)', fontSize: '0.88rem', maxWidth: '420px' }}>
          Hệ thống đang tải luồng video chất lượng cao từ nguồn phát, vui lòng đợi trong giây lát.
        </p>
      </div>
    );
  }

  if (failed || !data || !data.movie || !data.episodes || data.episodes.length === 0) {
    return (
      <div
        style={{
          minHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0f',
          color: '#fff',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(229, 9, 20, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            color: '#e50914',
            fontSize: '2rem',
          }}
        >
          <i className="fas fa-circle-exclamation"></i>
        </div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '10px' }}>
          Không thể phát tập phim này
        </h1>
        <p
          style={{
            color: 'var(--t2, #a3a3a3)',
            fontSize: '0.95rem',
            maxWidth: '500px',
            marginBottom: '28px',
            lineHeight: 1.6,
          }}
        >
          Nguồn phát của bộ phim này hiện đang bảo trì hoặc chưa có tập mới. Vui lòng thử lại sau hoặc chọn phim khác.
        </p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link
            href="/"
            style={{
              background: '#e50914',
              color: '#fff',
              padding: '10px 24px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.9rem',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <i className="fas fa-house"></i>
            <span>Về Trang Chủ</span>
          </Link>
          <Link
            href="/tim-kiem"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '10px 24px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.9rem',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <i className="fas fa-search"></i>
            <span>Tìm Phim Khác</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <WatchClient
      movie={data.movie}
      episodes={data.episodes}
      initialTapSlug={initialTapSlug}
      initialServerIndex={initialServerIndex}
    />
  );
}
