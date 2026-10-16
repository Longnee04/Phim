'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { MovieItem } from '@/types/movie';
import BrowseCard from '@/components/BrowseCard';
import { Pagination } from '@/components/Pagination';

interface BrowseMoviesViewProps {
  initialMovies: MovieItem[];
  currentPage: number;
  totalPages: number;
  basePath: string;
  initialSort?: string;
  initialYear?: string;
}

export default function BrowseMoviesView({
  initialMovies,
  currentPage,
  totalPages,
  basePath,
  initialSort = 'default',
  initialYear = 'all',
}: BrowseMoviesViewProps) {
  const [sortBy, setSortBy] = useState<string>(initialSort);
  const [yearFilter, setYearFilter] = useState<string>(initialYear);

  // Sync state if props change (e.g. Navigation)
  useEffect(() => {
    setSortBy(initialSort || 'default');
    setYearFilter(initialYear || 'all');
  }, [initialSort, initialYear]);

  // Update browser URL query params without reloading
  const updateUrl = (newSort: string, newYear: string) => {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      if (newSort && newSort !== 'default') {
        url.searchParams.set('sort', newSort);
      } else {
        url.searchParams.delete('sort');
      }

      if (newYear && newYear !== 'all') {
        url.searchParams.set('year', newYear);
      } else {
        url.searchParams.delete('year');
      }

      window.history.replaceState(null, '', url.toString());
    } catch {}
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSortBy(val);
    updateUrl(val, yearFilter);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setYearFilter(val);
    updateUrl(sortBy, val);
  };

  const handleReset = () => {
    setSortBy('default');
    setYearFilter('all');
    updateUrl('default', 'all');
  };

  // Process movies based on filter & sort
  const displayedMovies = useMemo(() => {
    let result = [...initialMovies];

    // 1. Filter by Year
    if (yearFilter !== 'all') {
      if (yearFilter === 'older') {
        result = result.filter((m) => (m.year ? m.year < 2020 : false));
      } else {
        const targetYear = parseInt(yearFilter, 10);
        result = result.filter((m) => m.year === targetYear);
      }
    }

    // 2. Sort
    switch (sortBy) {
      case 'name-asc':
      case 'name':
        result.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'));
        break;
      case 'name-desc':
        result.sort((a, b) => (b.name || '').localeCompare(a.name || '', 'vi'));
        break;
      case 'year-desc':
      case 'year':
        result.sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0));
        break;
      case 'year-asc':
        result.sort((a, b) => (Number(a.year) || 9999) - (Number(b.year) || 9999));
        break;
      case 'default':
      default:
        // Keep initial API order
        break;
    }

    return result;
  }, [initialMovies, sortBy, yearFilter]);

  // Compute pagination basePath preserving sort & filter query params
  const paginationBasePath = useMemo(() => {
    const params = new URLSearchParams();
    if (sortBy && sortBy !== 'default') params.set('sort', sortBy);
    if (yearFilter && yearFilter !== 'all') params.set('year', yearFilter);
    const queryString = params.toString();
    if (!queryString) return basePath;
    const sep = basePath.includes('?') ? '&' : '?';
    return `${basePath}${sep}${queryString}`;
  }, [basePath, sortBy, yearFilter]);

  const isFiltered = (sortBy && sortBy !== 'default') || (yearFilter && yearFilter !== 'all');

  return (
    <>
      {/* Toolbar with Interactive Sắp xếp & Năm */}
      <div className="browse__toolbar" style={{ flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {/* Sort Dropdown */}
          <div className="browse__sort" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label htmlFor="browse-sort" style={{ fontWeight: 600, color: 'var(--white, #fff)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fas fa-arrow-down-wide-short" style={{ color: 'var(--red, #e50914)' }}></i>
              <span>Sắp xếp:</span>
            </label>
            <select
              id="browse-sort"
              className="browse__sort-select"
              value={sortBy}
              onChange={handleSortChange}
              style={{
                background: '#1a1a24',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '0.85rem',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="default">Mặc định (Mới cập nhật)</option>
              <option value="name-asc">Tên A-Z</option>
              <option value="name-desc">Tên Z-A</option>
              <option value="year-desc">Năm mới nhất</option>
              <option value="year-asc">Năm cũ nhất</option>
            </select>
          </div>

          {/* Year Filter Dropdown */}
          <div className="browse__sort" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label htmlFor="browse-year" style={{ fontWeight: 600, color: 'var(--white, #fff)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fas fa-calendar-days" style={{ color: 'var(--red, #e50914)' }}></i>
              <span>Năm:</span>
            </label>
            <select
              id="browse-year"
              className="browse__sort-select"
              value={yearFilter}
              onChange={handleYearChange}
              style={{
                background: '#1a1a24',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '0.85rem',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="all">Tất cả các năm</option>
              <option value="2026">Năm 2026</option>
              <option value="2025">Năm 2025</option>
              <option value="2024">Năm 2024</option>
              <option value="2023">Năm 2023</option>
              <option value="2022">Năm 2022</option>
              <option value="2021">Năm 2021</option>
              <option value="2020">Năm 2020</option>
              <option value="older">Trước năm 2020</option>
            </select>
          </div>

          {/* Reset Filters Button */}
          {isFiltered && (
            <button
              type="button"
              onClick={handleReset}
              style={{
                background: 'rgba(229, 9, 20, 0.15)',
                color: '#ff4d4f',
                border: '1px solid rgba(229, 9, 20, 0.4)',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
              }}
              title="Đặt lại bộ lọc và sắp xếp"
            >
              <i className="fas fa-rotate-left"></i>
              <span>Đặt lại</span>
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isFiltered && (
            <span style={{ fontSize: '0.82rem', color: '#ff4d4f', fontWeight: 600 }}>
              (Hiển thị {displayedMovies.length} phim)
            </span>
          )}
          <span className="browse__page-indicator" id="browse-page-indicator">
            Trang {currentPage} / {totalPages}
          </span>
        </div>
      </div>

      {/* Top Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        basePath={paginationBasePath}
        isTop={true}
      />

      {/* Movies Grid or Empty State */}
      {displayedMovies.length > 0 ? (
        <div className="browse__grid" id="browse-grid">
          {displayedMovies.map((movie) => (
            <BrowseCard key={movie.slug} movie={movie} />
          ))}
        </div>
      ) : (
        <div
          className="browse__empty"
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: 'var(--t2, #a3a3a3)',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '12px',
            border: '1px dashed rgba(255,255,255,0.1)',
            margin: '20px var(--row-pad, 24px)',
          }}
        >
          <i className="fas fa-filter" style={{ fontSize: '2.5rem', marginBottom: '14px', color: '#666' }}></i>
          <p style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
            Không có phim nào phù hợp với bộ lọc đã chọn
          </p>
          <p style={{ fontSize: '0.85rem', marginBottom: '18px' }}>
            Vui lòng thử chọn năm phát hành khác hoặc đặt lại bộ lọc.
          </p>
          <button
            type="button"
            onClick={handleReset}
            style={{
              background: 'var(--red, #e50914)',
              color: '#fff',
              border: 'none',
              padding: '8px 20px',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Đặt lại bộ lọc
          </button>
        </div>
      )}

      {/* Bottom Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        basePath={paginationBasePath}
      />
    </>
  );
}
