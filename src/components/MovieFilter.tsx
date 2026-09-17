'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FILTER_TYPES, GENRES, COUNTRIES, FILTER_YEARS, SORT_OPTIONS } from '@/lib/constants';

interface MovieFilterProps {
  initialKeyword?: string;
  initialType?: string;
  initialGenre?: string;
  initialCountry?: string;
  initialYear?: string;
  initialSort?: string;
}

export default function MovieFilter({
  initialKeyword = '',
  initialType = 'all',
  initialGenre = 'all',
  initialCountry = 'all',
  initialYear = 'all',
  initialSort = 'time',
}: MovieFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [keyword, setKeyword] = useState(initialKeyword);
  const [type, setType] = useState(initialType);
  const [genre, setGenre] = useState(initialGenre);
  const [country, setCountry] = useState(initialCountry);
  const [year, setYear] = useState(initialYear);
  const [sort, setSort] = useState(initialSort);
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  // Sync state with URL params when searchParams change
  useEffect(() => {
    setKeyword(searchParams.get('q') || '');
    setType(searchParams.get('type') || 'all');
    setGenre(searchParams.get('genre') || 'all');
    setCountry(searchParams.get('country') || 'all');
    setYear(searchParams.get('year') || 'all');
    setSort(searchParams.get('sort') || 'time');
  }, [searchParams]);

  const handleApplyFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const params = new URLSearchParams();

    if (keyword.trim()) params.set('q', keyword.trim());
    if (type && type !== 'all') params.set('type', type);
    if (genre && genre !== 'all') params.set('genre', genre);
    if (country && country !== 'all') params.set('country', country);
    if (year && year !== 'all') params.set('year', year);
    if (sort && sort !== 'time') params.set('sort', sort);

    router.push(`/tim-kiem?${params.toString()}`);
  };

  const handleResetFilter = () => {
    setKeyword('');
    setType('all');
    setGenre('all');
    setCountry('all');
    setYear('all');
    setSort('time');
    router.push('/tim-kiem');
  };

  const removeSingleFilter = (key: 'q' | 'type' | 'genre' | 'country' | 'year' | 'sort') => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    params.delete('page'); // Reset to page 1

    if (key === 'q') setKeyword('');
    if (key === 'type') setType('all');
    if (key === 'genre') setGenre('all');
    if (key === 'country') setCountry('all');
    if (key === 'year') setYear('all');
    if (key === 'sort') setSort('time');

    router.push(`/tim-kiem${params.toString() ? `?${params.toString()}` : ''}`);
  };

  // Active filters count
  const activeCount = [
    keyword.trim() ? 1 : 0,
    type !== 'all' ? 1 : 0,
    genre !== 'all' ? 1 : 0,
    country !== 'all' ? 1 : 0,
    year !== 'all' ? 1 : 0,
    sort !== 'time' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const getTypeName = (slug: string) => FILTER_TYPES.find((t) => t.slug === slug)?.name || slug;
  const getGenreName = (slug: string) => GENRES.find((g) => g.slug === slug)?.name || slug;
  const getCountryName = (slug: string) => COUNTRIES.find((c) => c.slug === slug)?.name || slug;
  const getYearName = (slug: string) => FILTER_YEARS.find((y) => y.slug === slug)?.name || slug;
  const getSortName = (slug: string) => SORT_OPTIONS.find((s) => s.slug === slug)?.name || slug;

  return (
    <div
      className="movie-filter-box"
      style={{
        background: 'var(--surface, #181818)',
        border: '1px solid var(--border, #333)',
        borderRadius: '12px',
        padding: '20px 24px',
        marginBottom: '28px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
      }}
    >
      {/* Header & Toggle for Mobile */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: isOpenMobile ? '16px' : '0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(229,9,20,0.15)',
              border: '1px solid rgba(229,9,20,0.3)',
              color: 'var(--red, #e50914)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
            }}
          >
            <i className="fas fa-filter"></i>
          </div>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: 0 }}>
              Bộ Lọc Phim
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--t2, #a3a3a3)', margin: 0 }}>
              Tìm kiếm phim chính xác theo thể loại, quốc gia, năm và định dạng
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={handleResetFilter}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'var(--t2, #a3a3a3)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <i className="fas fa-rotate-left"></i>
              <span>Đặt lại</span>
            </button>
          )}

          {/* Mobile toggle dropdown button */}
          <button
            type="button"
            className="filter-mobile-toggle-btn"
            onClick={() => setIsOpenMobile(!isOpenMobile)}
            style={{
              background: 'rgba(229,9,20,0.15)',
              border: '1px solid rgba(229,9,20,0.3)',
              color: 'var(--red, #e50914)',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'none',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>{isOpenMobile ? 'Thu gọn' : `Mở bộ lọc (${activeCount})`}</span>
            <i className={`fas fa-chevron-${isOpenMobile ? 'up' : 'down'}`}></i>
          </button>
        </div>
      </div>

      {/* Main Filter Fields Form */}
      <form
        onSubmit={handleApplyFilter}
        className={`filter-form-grid ${isOpenMobile ? 'filter-form-grid--open' : ''}`}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px',
          marginTop: '16px',
        }}
      >
        {/* 1. Keyword Input */}
        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--t3, #888)', fontWeight: 700, marginBottom: '6px' }}>
            <i className="fas fa-search" style={{ marginRight: 6, color: 'var(--red, #e50914)' }}></i>
            Từ Khóa
          </label>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tên phim, diễn viên..."
            style={{
              width: '100%',
              height: '38px',
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '6px',
              padding: '0 12px',
              color: '#fff',
              fontSize: '0.82rem',
              outline: 'none',
            }}
          />
        </div>

        {/* 2. Type Selector */}
        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--t3, #888)', fontWeight: 700, marginBottom: '6px' }}>
            <i className="fas fa-layer-group" style={{ marginRight: 6, color: '#38bdf8' }}></i>
            Định Dạng
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{
              width: '100%',
              height: '38px',
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '6px',
              padding: '0 10px',
              color: '#fff',
              fontSize: '0.82rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {FILTER_TYPES.map((t) => (
              <option key={t.slug} value={t.slug} style={{ background: '#1a1a24', color: '#fff' }}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Genre Selector */}
        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--t3, #888)', fontWeight: 700, marginBottom: '6px' }}>
            <i className="fas fa-film" style={{ marginRight: 6, color: '#f59e0b' }}></i>
            Thể Loại
          </label>
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            style={{
              width: '100%',
              height: '38px',
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '6px',
              padding: '0 10px',
              color: '#fff',
              fontSize: '0.82rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {GENRES.map((g) => (
              <option key={g.slug} value={g.slug} style={{ background: '#1a1a24', color: '#fff' }}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Country Selector */}
        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--t3, #888)', fontWeight: 700, marginBottom: '6px' }}>
            <i className="fas fa-globe" style={{ marginRight: 6, color: '#4ade80' }}></i>
            Quốc Gia
          </label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            style={{
              width: '100%',
              height: '38px',
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '6px',
              padding: '0 10px',
              color: '#fff',
              fontSize: '0.82rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {COUNTRIES.map((c) => (
              <option key={c.slug} value={c.slug} style={{ background: '#1a1a24', color: '#fff' }}>
                {c.flag ? `${c.flag} ` : ''}
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* 5. Year Selector */}
        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--t3, #888)', fontWeight: 700, marginBottom: '6px' }}>
            <i className="fas fa-calendar-days" style={{ marginRight: 6, color: '#ec4899' }}></i>
            Năm Phát Hành
          </label>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            style={{
              width: '100%',
              height: '38px',
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '6px',
              padding: '0 10px',
              color: '#fff',
              fontSize: '0.82rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {FILTER_YEARS.map((y) => (
              <option key={y.slug} value={y.slug} style={{ background: '#1a1a24', color: '#fff' }}>
                {y.name}
              </option>
            ))}
          </select>
        </div>

        {/* 6. Sort Selector */}
        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--t3, #888)', fontWeight: 700, marginBottom: '6px' }}>
            <i className="fas fa-arrow-down-wide-short" style={{ marginRight: 6, color: '#a855f7' }}></i>
            Sắp Xếp
          </label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            style={{
              width: '100%',
              height: '38px',
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '6px',
              padding: '0 10px',
              color: '#fff',
              fontSize: '0.82rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.slug} value={s.slug} style={{ background: '#1a1a24', color: '#fff' }}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Submit Button */}
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button
            type="submit"
            style={{
              width: '100%',
              height: '38px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, var(--red, #e50914) 0%, #b20710 100%)',
              color: '#fff',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 16px rgba(229,9,20,0.4)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
          >
            <i className="fas fa-filter"></i>
            <span>Lọc Phim</span>
          </button>
        </div>
      </form>

      {/* Active Filter Badges */}
      {activeCount > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--t3, #888)', fontWeight: 600 }}>
            Đang lọc theo:
          </span>

          {keyword.trim() && (
            <span
              onClick={() => removeSingleFilter('q')}
              style={{
                background: 'rgba(229,9,20,0.15)',
                border: '1px solid rgba(229,9,20,0.3)',
                color: '#fff',
                padding: '3px 10px',
                borderRadius: '16px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>Từ khóa: "{keyword}"</span>
              <i className="fas fa-times" style={{ fontSize: '0.65rem' }}></i>
            </span>
          )}

          {type !== 'all' && (
            <span
              onClick={() => removeSingleFilter('type')}
              style={{
                background: 'rgba(56,189,248,0.15)',
                border: '1px solid rgba(56,189,248,0.3)',
                color: '#38bdf8',
                padding: '3px 10px',
                borderRadius: '16px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{getTypeName(type)}</span>
              <i className="fas fa-times" style={{ fontSize: '0.65rem' }}></i>
            </span>
          )}

          {genre !== 'all' && (
            <span
              onClick={() => removeSingleFilter('genre')}
              style={{
                background: 'rgba(245,158,11,0.15)',
                border: '1px solid rgba(245,158,11,0.3)',
                color: '#f59e0b',
                padding: '3px 10px',
                borderRadius: '16px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{getGenreName(genre)}</span>
              <i className="fas fa-times" style={{ fontSize: '0.65rem' }}></i>
            </span>
          )}

          {country !== 'all' && (
            <span
              onClick={() => removeSingleFilter('country')}
              style={{
                background: 'rgba(74,222,128,0.15)',
                border: '1px solid rgba(74,222,128,0.3)',
                color: '#4ade80',
                padding: '3px 10px',
                borderRadius: '16px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{getCountryName(country)}</span>
              <i className="fas fa-times" style={{ fontSize: '0.65rem' }}></i>
            </span>
          )}

          {year !== 'all' && (
            <span
              onClick={() => removeSingleFilter('year')}
              style={{
                background: 'rgba(236,72,153,0.15)',
                border: '1px solid rgba(236,72,153,0.3)',
                color: '#ec4899',
                padding: '3px 10px',
                borderRadius: '16px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>Năm {getYearName(year)}</span>
              <i className="fas fa-times" style={{ fontSize: '0.65rem' }}></i>
            </span>
          )}

          {sort !== 'time' && (
            <span
              onClick={() => removeSingleFilter('sort')}
              style={{
                background: 'rgba(168,85,247,0.15)',
                border: '1px solid rgba(168,85,247,0.3)',
                color: '#a855f7',
                padding: '3px 10px',
                borderRadius: '16px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{getSortName(sort)}</span>
              <i className="fas fa-times" style={{ fontSize: '0.65rem' }}></i>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
