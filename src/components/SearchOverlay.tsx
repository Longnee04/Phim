'use client';

import React, { useState, useEffect, useRef } from 'react';
import { searchMovies, getMoviesByType, getImageUrl } from '@/lib/api';
import { MovieItem } from '@/types/movie';
import { useModal } from '@/context/ModalContext';

export default function SearchOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'year'>('all');
  const [results, setResults] = useState<MovieItem[]>([]);
  const [historyTags, setHistoryTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { openModal } = useModal();
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('lphim_search_history') || '[]');
      if (Array.isArray(saved)) setHistoryTags(saved);
    } catch (e) {
      console.error(e);
    }

    const handleOpenSearch = (e: CustomEvent) => {
      setIsOpen(true);
      if (e.detail?.keyword) {
        setKeyword(e.detail.keyword);
        triggerSearch(e.detail.keyword, searchType);
      }
    };

    window.addEventListener('open-search-overlay' as any, handleOpenSearch);
    return () => {
      window.removeEventListener('open-search-overlay' as any, handleOpenSearch);
    };
  }, [searchType]);

  const saveHistory = (kw: string) => {
    if (!kw || kw.trim().length < 2) return;
    const clean = kw.trim();
    const next = [clean, ...historyTags.filter((h) => h !== clean)].slice(0, 10);
    setHistoryTags(next);
    try {
      localStorage.setItem('lphim_search_history', JSON.stringify(next));
    } catch (e) {}
  };

  const removeHistoryTag = (tag: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = historyTags.filter((h) => h !== tag);
    setHistoryTags(next);
    try {
      localStorage.setItem('lphim_search_history', JSON.stringify(next));
    } catch (e) {}
  };

  const triggerSearch = async (kw: string, type: 'all' | 'year') => {
    if (!kw.trim() || kw.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      let res;
      if (type === 'year') {
        res = await searchMovies(kw, 36);
      } else {
        res = await searchMovies(kw, 36);
      }

      const items = res?.data?.items || [];
      setResults(items);
      if (items.length > 0) {
        saveHistory(kw);
      }
    } catch (err) {
      console.error('Search error', err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (val: string) => {
    setKeyword(val);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (val.trim().length >= 2) {
      debounceTimer.current = setTimeout(() => {
        triggerSearch(val, searchType);
      }, 400);
    } else {
      setResults([]);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setKeyword('');
    setResults([]);
  };

  if (!isOpen) return null;

  return (
    <section className="search-overlay" id="search-overlay" style={{ display: 'block' }}>
      <div className="search-overlay__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, marginRight: 16 }}>
          <div className="nav__search open" style={{ flex: 1, maxWidth: 500 }}>
            <i className="fas fa-search" style={{ color: 'var(--t2)', marginLeft: 12 }}></i>
            <input
              type="text"
              className="nav__search-input"
              style={{ width: '100%', opacity: 1, paddingLeft: 8 }}
              placeholder="Nhập tên phim, diễn viên hoặc năm phát hành..."
              autoFocus
              value={keyword}
              onChange={(e) => handleInputChange(e.target.value)}
            />
          </div>
        </div>

        <div className="search-overlay__tabs">
          <button
            className={`search-tab ${searchType === 'all' ? 'active' : ''}`}
            type="button"
            onClick={() => {
              setSearchType('all');
              if (keyword.length >= 2) triggerSearch(keyword, 'all');
            }}
          >
            <i className="fas fa-search"></i> Tất cả
          </button>
          <button
            className={`search-tab ${searchType === 'year' ? 'active' : ''}`}
            type="button"
            onClick={() => {
              setSearchType('year');
              if (keyword.length >= 2) triggerSearch(keyword, 'year');
            }}
          >
            <i className="fas fa-calendar"></i> Năm
          </button>
        </div>

        <button
          className="search-overlay__close"
          id="search-close"
          type="button"
          aria-label="Đóng tìm kiếm"
          onClick={handleClose}
        >
          <i className="fas fa-times"></i>
        </button>
      </div>

      {/* History tags */}
      {historyTags.length > 0 && !keyword && (
        <div className="search-overlay__history" id="search-history-tags" style={{ display: 'flex' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--t2)', alignSelf: 'center', marginRight: 4 }}>
            Tìm kiếm gần đây:
          </span>
          {historyTags.map((tag) => (
            <span
              key={tag}
              className="search-history-tag"
              onClick={() => {
                setKeyword(tag);
                triggerSearch(tag, searchType);
              }}
            >
              {tag}
              <i
                className="fas fa-times"
                onClick={(e) => removeHistoryTag(tag, e)}
                style={{ marginLeft: 6, fontSize: '0.7rem', opacity: 0.7 }}
              ></i>
            </span>
          ))}
        </div>
      )}

      {/* Results Title */}
      {keyword.trim().length >= 2 && (
        <div style={{ padding: '0 var(--row-pad)', margin: '16px 0 8px', color: 'var(--t2)', fontSize: '0.9rem' }}>
          {isLoading ? (
            <span>Đang tìm kiếm phim...</span>
          ) : results.length > 0 ? (
            <span>
              Kết quả cho: <b style={{ color: '#fff' }}>"{keyword}"</b> ({results.length} phim)
            </span>
          ) : (
            <span>Không tìm thấy phim phù hợp cho: <b>"{keyword}"</b></span>
          )}
        </div>
      )}

      {/* Grid results */}
      {results.length > 0 && (
        <div className="search-overlay__grid" id="search-grid">
          {results.map((movie) => (
            <div
              key={movie.slug}
              className="search-card"
              onClick={() => openModal(movie.slug, false)}
            >
              <img
                src={getImageUrl(movie.poster_url || movie.thumb_url)}
                alt={movie.name}
                loading="lazy"
              />
              <div className="search-card__name">{movie.name}</div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && keyword.trim().length >= 2 && results.length === 0 && (
        <div className="search-overlay__empty" id="search-empty" style={{ display: 'block' }}>
          <i className="fas fa-search"></i>
          <p>Không tìm thấy phim phù hợp.</p>
          <span>Hãy thử với từ khóa khác (ví dụ: tên phim không dấu, năm phát hành...)</span>
        </div>
      )}
    </section>
  );
}
