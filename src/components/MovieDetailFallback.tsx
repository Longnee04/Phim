'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { MovieDetailResponse, MovieItem } from '@/types/movie';
import { getMovieDetail } from '@/lib/api';
import MovieDetailClient from '@/components/MovieDetailClient';

interface MovieDetailFallbackProps {
  slug: string;
  relatedMovies?: MovieItem[];
}

export default function MovieDetailFallback({ slug, relatedMovies = [] }: MovieDetailFallbackProps) {
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
        if (res && res.movie) {
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
          minHeight: '80vh',
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
            width: '50px',
            height: '50px',
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
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>
          Đang tải dữ liệu phim...
        </h2>
        <p style={{ color: 'var(--t2, #a3a3a3)', fontSize: '0.88rem', maxWidth: '420px' }}>
          Hệ thống đang kết nối trực tiếp đến nguồn phim tốc độ cao, vui lòng đợi giây lát.
        </p>
      </div>
    );
  }

  if (failed || !data || !data.movie) {
    return (
      <div
        style={{
          minHeight: '80vh',
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
          <i className="fas fa-film"></i>
        </div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '10px' }}>
          Không tìm thấy phim
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
          Bộ phim bạn đang tìm kiếm hiện không khả dụng hoặc đã thay đổi đường dẫn. Bạn có thể thử tìm kiếm phim khác hoặc quay lại trang chủ.
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
            <span>Tìm Kiếm Phim Khác</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <MovieDetailClient
      movie={data.movie}
      episodes={data.episodes || []}
      relatedMovies={relatedMovies}
    />
  );
}
