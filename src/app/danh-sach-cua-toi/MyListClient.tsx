'use client';

import React from 'react';
import Link from 'next/link';
import { useMyList } from '@/hooks/useMyList';
import BrowseCard from '@/components/BrowseCard';

export default function MyListClient() {
  const { list, isLoaded } = useMyList();

  if (!isLoaded) {
    return (
      <div style={{ padding: '120px 0', textAlign: 'center', color: 'var(--t2)' }}>
        Đang tải danh sách của bạn...
      </div>
    );
  }

  return (
    <section className="browse" id="browse" style={{ display: 'block', paddingTop: 80, minHeight: '70vh' }}>
      <div style={{ padding: '0 var(--row-pad)', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>
          <i className="fas fa-heart" style={{ color: 'var(--red)', marginRight: 10 }}></i>
          Danh sách của tôi
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--t2)', marginTop: 4 }}>
          Các bộ phim bạn đã lưu để xem sau ({list.length} phim)
        </p>
      </div>

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
        <div className="browse__empty">
          <i className="fas fa-film"></i>
          <p>Danh sách xem sau đang trống</p>
          <span>Hãy bấm nút <b>+ Thêm vào danh sách</b> trên bất kỳ bộ phim nào bạn yêu thích.</span>
          <div style={{ marginTop: 20 }}>
            <Link
              href="/"
              className="btn btn--play"
              style={{ display: 'inline-flex' }}
            >
              <i className="fas fa-compass"></i> Khám phá phim ngay
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
