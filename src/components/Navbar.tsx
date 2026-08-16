'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { MovieItem } from '@/types/movie';
import { getImageUrl, searchMovies } from '@/lib/api';

const GENRES = [
  { name: 'Hành Động', slug: 'hanh-dong', icon: 'fa-bolt' },
  { name: 'Tình Cảm', slug: 'tinh-cam', icon: 'fa-heart' },
  { name: 'Hài Hước', slug: 'hai-huoc', icon: 'fa-face-laugh-beam' },
  { name: 'Cổ Trang', slug: 'co-trang', icon: 'fa-fan' },
  { name: 'Tâm Lý', slug: 'tam-ly', icon: 'fa-brain' },
  { name: 'Hình Sự', slug: 'hinh-su', icon: 'fa-handcuffs' },
  { name: 'Chiến Tranh', slug: 'chien-tranh', icon: 'fa-shield' },
  { name: 'Thể Thao', slug: 'the-thao', icon: 'fa-futbol' },
  { name: 'Võ Thuật', slug: 'vo-thuat', icon: 'fa-hand-fist' },
  { name: 'Viễn Tưởng', slug: 'vien-tuong', icon: 'fa-rocket' },
  { name: 'Phiêu Lưu', slug: 'phieu-luu', icon: 'fa-compass' },
  { name: 'Khoa Học', slug: 'khoa-hoc', icon: 'fa-atom' },
  { name: 'Kinh Dị', slug: 'kinh-di', icon: 'fa-ghost' },
  { name: 'Âm Nhạc', slug: 'am-nhac', icon: 'fa-music' },
  { name: 'Thần Thoại', slug: 'than-thoai', icon: 'fa-wand-magic-sparkles' },
  { name: 'Tài Liệu', slug: 'tai-lieu', icon: 'fa-book-open' },
  { name: 'Gia Đình', slug: 'gia-dinh', icon: 'fa-house-chimney-user' },
  { name: 'Chính Kịch', slug: 'chinh-kich', icon: 'fa-masks-theater' },
  { name: 'Bí Ẩn', slug: 'bi-an', icon: 'fa-eye' },
  { name: 'Học Đường', slug: 'hoc-duong', icon: 'fa-graduation-cap' },
  { name: 'Kinh Điển', slug: 'kinh-dien', icon: 'fa-crown' },
  { name: 'Anime', slug: 'anime', icon: 'fa-dragon' },
];

const COUNTRIES = [
  { name: 'Trung Quốc', slug: 'trung-quoc', flag: '🇨🇳' },
  { name: 'Hàn Quốc', slug: 'han-quoc', flag: '🇰🇷' },
  { name: 'Nhật Bản', slug: 'nhat-ban', flag: '🇯🇵' },
  { name: 'Thái Lan', slug: 'thai-lan', flag: '🇹🇭' },
  { name: 'Âu Mỹ', slug: 'au-my', flag: '🇺🇸' },
  { name: 'Đài Loan', slug: 'dai-loan', flag: '🇹🇼' },
  { name: 'Hồng Kông', slug: 'hong-kong', flag: '🇭🇰' },
  { name: 'Ấn Độ', slug: 'an-do', flag: '🇮🇳' },
  { name: 'Anh', slug: 'anh', flag: '🇬🇧' },
  { name: 'Pháp', slug: 'phap', flag: '🇫🇷' },
  { name: 'Canada', slug: 'canada', flag: '🇨🇦' },
  { name: 'Đức', slug: 'duc', flag: '🇩🇪' },
  { name: 'Tây Ban Nha', slug: 'tay-ban-nha', flag: '🇪🇸' },
  { name: 'Thổ Nhĩ Kỳ', slug: 'tho-nhi-ky', flag: '🇹🇷' },
  { name: 'Hà Lan', slug: 'ha-lan', flag: '🇳🇱' },
  { name: 'Indonesia', slug: 'indonesia', flag: '🇮🇩' },
];

const YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  const [keyword, setKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<MovieItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Mobile drawer accordion toggles
  const [mobileGenreOpen, setMobileGenreOpen] = useState(false);
  const [mobileCountryOpen, setMobileCountryOpen] = useState(false);
  const [mobileYearOpen, setMobileYearOpen] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
  }, [pathname]);

  // Lock background scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // Navbar background on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search autocomplete
  useEffect(() => {
    if (!keyword.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchMovies(keyword.trim(), 6);
        if (res && res.data && res.data.items) {
          setSearchResults(res.data.items);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [keyword]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (keyword.trim()) {
      setIsSearchOpen(false);
      setIsMobileMenuOpen(false);
      router.push(`/tim-kiem?q=${encodeURIComponent(keyword.trim())}`);
    }
  };

  return (
    <>
      <nav className={`nav ${isScrolled ? 'nav--solid' : ''}`} id="navbar">
        {/* ==================== LEFT: HAMBURGER + LOGO + RECTANGULAR SEARCH BOX + MENU ==================== */}
        <div className="nav__left" style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 auto', minWidth: 0 }}>
          {/* Mobile hamburger button */}
          <button
            className="nav__mobile-toggle"
            type="button"
            aria-label="Menu"
            onClick={() => setIsMobileMenuOpen(true)}
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: '1.25rem',
              cursor: 'pointer',
              padding: '6px 8px',
              borderRadius: '6px',
            }}
          >
            <i className="fas fa-bars"></i>
          </button>

          {/* Logo */}
          <Link href="/" className="nav__logo" id="nav-logo" style={{ textDecoration: 'none', marginRight: '4px', flexShrink: 0 }}>
            <i className="fas fa-play" style={{ color: 'var(--red, #e50914)' }}></i>
            <span>L</span>
            <span>PHIM</span>
          </Link>

          {/* Rectangular Search Box (Always Open, Next to Logo) */}
          <div ref={searchContainerRef} className="nav__search-box-left" style={{ width: '230px', minWidth: '160px', flexShrink: 0 }}>
            <form onSubmit={handleSearchSubmit} style={{ position: 'relative', width: '100%', margin: 0 }}>
              <i
                className="fas fa-search"
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'rgba(255, 255, 255, 0.45)',
                  fontSize: '0.82rem',
                  pointerEvents: 'none',
                }}
              />
              <input
                ref={searchInputRef}
                type="text"
                className="nav__search-input-rect"
                id="search-input"
                placeholder="Tìm phim, diễn viên..."
                autoComplete="off"
                value={keyword}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setIsSearchOpen(true);
                }}
                style={{ height: '34px', fontSize: '0.82rem' }}
              />
              {keyword && (
                <button
                  type="button"
                  onClick={() => {
                    setKeyword('');
                    setSearchResults([]);
                  }}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.5)',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    padding: 2,
                  }}
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </form>

            {/* ==================== DAOPHIM-STYLE LIVE SEARCH DROPDOWN ==================== */}
            {isSearchOpen && keyword.trim().length > 0 && (
              <div className="daophim-search-dropdown">
                {/* Results List */}
                <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                  {isSearching ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: '#a3a3a3' }}>
                      <div className="vip-spinner" style={{ margin: '0 auto 10px' }}></div>
                      <div style={{ fontSize: '0.82rem' }}>Đang tìm kiếm phim...</div>
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((item) => (
                      <div
                        key={item.slug}
                        onClick={() => {
                          setIsSearchOpen(false);
                          router.push(`/phim/${item.slug}`);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '10px 14px',
                          cursor: 'pointer',
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        {/* Thumbnail Poster */}
                        <img
                          src={getImageUrl(item.poster_url || item.thumb_url)}
                          alt={item.name}
                          style={{
                            width: '44px',
                            height: '62px',
                            objectFit: 'cover',
                            objectPosition: 'center center',
                            borderRadius: '6px',
                            flexShrink: 0,
                            background: '#111',
                          }}
                        />

                        {/* Info Column */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* Vietnamese Name */}
                          <div
                            style={{
                              fontSize: '0.88rem',
                              fontWeight: 700,
                              color: '#4ade80',
                              whiteSpace: 'nowrap',
                              textOverflow: 'ellipsis',
                              overflow: 'hidden',
                              marginBottom: '2px',
                            }}
                          >
                            {item.name}
                          </div>

                          {/* Original Name */}
                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: '#a3a3a3',
                              whiteSpace: 'nowrap',
                              textOverflow: 'ellipsis',
                              overflow: 'hidden',
                              marginBottom: '4px',
                            }}
                          >
                            {item.origin_name || item.name}
                          </div>

                          {/* Meta row & badges */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem' }}>
                            <span style={{ color: '#888' }}>
                              {item.year || 2026} • {item.quality || 'FHD'}
                            </span>
                            {item.episode_current && (
                              <span
                                style={{
                                  background: 'rgba(70,211,105,0.18)',
                                  color: '#46d369',
                                  border: '1px solid rgba(70,211,105,0.3)',
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  fontWeight: 700,
                                }}
                              >
                                {item.episode_current}
                              </span>
                            )}
                            {item.lang && (
                              <span
                                style={{
                                  background: 'rgba(139,92,246,0.18)',
                                  color: '#a78bfa',
                                  border: '1px solid rgba(139,92,246,0.3)',
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  fontWeight: 600,
                                }}
                              >
                                {item.lang}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: '#a3a3a3' }}>
                      <i className="fas fa-film" style={{ fontSize: '1.8rem', color: '#555', marginBottom: '8px', display: 'block' }}></i>
                      <div style={{ fontSize: '0.85rem' }}>Không tìm thấy phim phù hợp</div>
                    </div>
                  )}
                </div>

                {/* Bottom 'Xem Tất Cả ›' Button */}
                <div
                  style={{
                    padding: '10px 14px',
                    background: 'rgba(15,15,22,0.95)',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleSearchSubmit()}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: '0.88rem',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(16,185,129,0.4)',
                      transition: 'filter 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.1)')}
                    onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
                  >
                    <span>Xem Tất Cả</span>
                    <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem' }}></i>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Navigation Menu Links */}
          <ul className="nav__menu" id="nav-menu" style={{ display: 'flex', alignItems: 'center', gap: '3px', margin: 0, padding: 0 }}>
            <li>
              <Link href="/" className={`nav__link ${pathname === '/' ? 'active' : ''}`} id="link-home">
                Trang chủ
              </Link>
            </li>
            <li>
              <Link
                href="/danh-sach/phim-bo"
                className={`nav__link ${pathname === '/danh-sach/phim-bo' ? 'active' : ''}`}
              >
                Phim Bộ
              </Link>
            </li>
            <li>
              <Link
                href="/danh-sach/phim-le"
                className={`nav__link ${pathname === '/danh-sach/phim-le' ? 'active' : ''}`}
              >
                Phim Lẻ
              </Link>
            </li>
            <li>
              <Link
                href="/danh-sach/hoat-hinh"
                className={`nav__link ${pathname === '/danh-sach/hoat-hinh' ? 'active' : ''}`}
              >
                Hoạt Hình
              </Link>
            </li>
            <li>
              <Link
                href="/danh-sach/tv-shows"
                className={`nav__link ${pathname === '/danh-sach/tv-shows' ? 'active' : ''}`}
              >
                TV Shows
              </Link>
            </li>
            <li>
              <Link
                href="/danh-sach-cua-toi"
                className={`nav__link ${pathname === '/danh-sach-cua-toi' ? 'active' : ''}`}
                id="link-mylist"
              >
                Danh sách của tôi
              </Link>
            </li>

            {/* Thể Loại dropdown */}
            <li className="nav__dropdown">
              <a href="#" className="nav__link nav__link--dropdown" onClick={(e) => e.preventDefault()}>
                Thể Loại <i className="fas fa-caret-down"></i>
              </a>
              <div className="nav__dropdown-menu" id="dropdown-genre">
                {GENRES.map((g) => (
                  <Link key={g.slug} href={`/the-loai/${g.slug}`}>
                    {g.name}
                  </Link>
                ))}
              </div>
            </li>

            {/* Quốc Gia dropdown */}
            <li className="nav__dropdown">
              <a href="#" className="nav__link nav__link--dropdown" onClick={(e) => e.preventDefault()}>
                Quốc Gia <i className="fas fa-caret-down"></i>
              </a>
              <div className="nav__dropdown-menu" id="dropdown-country">
                {COUNTRIES.map((c) => (
                  <Link key={c.slug} href={`/quoc-gia/${c.slug}`}>
                    {c.name}
                  </Link>
                ))}
              </div>
            </li>

            {/* Năm dropdown */}
            <li className="nav__dropdown">
              <a href="#" className="nav__link nav__link--dropdown" onClick={(e) => e.preventDefault()}>
                Năm <i className="fas fa-caret-down"></i>
              </a>
              <div className="nav__dropdown-menu nav__dropdown-menu--small" id="dropdown-year">
                {YEARS.map((y) => (
                  <Link key={y} href={`/tim-kiem?q=${y}`}>
                    {y}
                  </Link>
                ))}
              </div>
            </li>
          </ul>
        </div>

        {/* ==================== RIGHT: NOTIFICATION BELL ==================== */}
        <div className="nav__right" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <button
            className="nav__notification"
            id="notification-btn"
            type="button"
            aria-label="Thông báo"
            onClick={() => window.dispatchEvent(new CustomEvent('open-changelog'))}
          >
            <i className="fas fa-bell"></i>
          </button>
        </div>
      </nav>

      {/* ==================== FULL-FEATURED MOBILE DRAWER MENU ==================== */}
      {isMobileMenuOpen && (
        <div
          className="mobile-drawer-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            animation: 'fadeIn 0.25s ease',
          }}
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            className="mobile-drawer-content"
            style={{
              width: '85%',
              maxWidth: '340px',
              height: '100%',
              background: '#12121a',
              borderRight: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '10px 0 40px rgba(0,0,0,0.8)',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 18px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(18, 18, 26, 0.95)',
                position: 'sticky',
                top: 0,
                zIndex: 10,
              }}
            >
              <Link
                href="/"
                onClick={() => setIsMobileMenuOpen(false)}
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 900,
                  color: '#fff',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <i className="fas fa-play" style={{ color: 'var(--red, #e50914)', fontSize: '1rem' }}></i>
                <span>L</span>
                <span style={{ color: 'var(--red, #e50914)' }}>PHIM</span>
              </Link>

              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)',
                  border: 'none',
                  color: '#fff',
                  fontSize: '1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                aria-label="Đóng menu"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Main Menu Links */}
            <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <Link
                href="/"
                onClick={() => setIsMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  color: pathname === '/' ? 'var(--red, #e50914)' : '#fff',
                  background: pathname === '/' ? 'rgba(229,9,20,0.12)' : 'transparent',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  textDecoration: 'none',
                }}
              >
                <i className="fas fa-house" style={{ width: '20px', color: 'var(--red, #e50914)' }}></i>
                <span>Trang Chủ</span>
              </Link>

              <Link
                href="/danh-sach/phim-bo"
                onClick={() => setIsMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  color: pathname === '/danh-sach/phim-bo' ? 'var(--red, #e50914)' : '#fff',
                  background: pathname === '/danh-sach/phim-bo' ? 'rgba(229,9,20,0.12)' : 'transparent',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  textDecoration: 'none',
                }}
              >
                <i className="fas fa-tv" style={{ width: '20px', color: '#38bdf8' }}></i>
                <span>Phim Bộ</span>
              </Link>

              <Link
                href="/danh-sach/phim-le"
                onClick={() => setIsMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  color: pathname === '/danh-sach/phim-le' ? 'var(--red, #e50914)' : '#fff',
                  background: pathname === '/danh-sach/phim-le' ? 'rgba(229,9,20,0.12)' : 'transparent',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  textDecoration: 'none',
                }}
              >
                <i className="fas fa-film" style={{ width: '20px', color: '#f59e0b' }}></i>
                <span>Phim Lẻ</span>
              </Link>

              <Link
                href="/danh-sach/hoat-hinh"
                onClick={() => setIsMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  color: pathname === '/danh-sach/hoat-hinh' ? 'var(--red, #e50914)' : '#fff',
                  background: pathname === '/danh-sach/hoat-hinh' ? 'rgba(229,9,20,0.12)' : 'transparent',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  textDecoration: 'none',
                }}
              >
                <i className="fas fa-dragon" style={{ width: '20px', color: '#ec4899' }}></i>
                <span>Hoạt Hình & Anime</span>
              </Link>

              <Link
                href="/danh-sach/tv-shows"
                onClick={() => setIsMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  color: pathname === '/danh-sach/tv-shows' ? 'var(--red, #e50914)' : '#fff',
                  background: pathname === '/danh-sach/tv-shows' ? 'rgba(229,9,20,0.12)' : 'transparent',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  textDecoration: 'none',
                }}
              >
                <i className="fas fa-masks-theater" style={{ width: '20px', color: '#a855f7' }}></i>
                <span>TV Shows</span>
              </Link>

              <Link
                href="/danh-sach-cua-toi"
                onClick={() => setIsMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  color: pathname === '/danh-sach-cua-toi' ? 'var(--red, #e50914)' : '#fff',
                  background: pathname === '/danh-sach-cua-toi' ? 'rgba(229,9,20,0.12)' : 'transparent',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  textDecoration: 'none',
                }}
              >
                <i className="fas fa-bookmark" style={{ width: '20px', color: '#4ade80' }}></i>
                <span>Tủ Phim & Xem Dở</span>
              </Link>
            </div>

            {/* Accordion: THỂ LOẠI (22 Thể Loại Đầy Đủ) */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '10px 14px' }}>
              <button
                type="button"
                onClick={() => setMobileGenreOpen(!mobileGenreOpen)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 8px',
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fas fa-layer-group" style={{ color: 'var(--red, #e50914)' }}></i>
                  <span>Thể Loại ({GENRES.length})</span>
                </span>
                <i
                  className={`fas fa-chevron-${mobileGenreOpen ? 'up' : 'down'}`}
                  style={{ fontSize: '0.8rem', color: '#888' }}
                ></i>
              </button>

              {mobileGenreOpen && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '6px',
                    padding: '8px 0 12px',
                    animation: 'fadeIn 0.2s ease',
                  }}
                >
                  {GENRES.map((g) => (
                    <Link
                      key={g.slug}
                      href={`/the-loai/${g.slug}`}
                      onClick={() => setIsMobileMenuOpen(false)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: pathname === `/the-loai/${g.slug}` ? 'var(--red, #e50914)' : 'rgba(255,255,255,0.05)',
                        color: '#fff',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      <i className={`fas ${g.icon}`} style={{ fontSize: '0.75rem', opacity: 0.7 }}></i>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Accordion: QUỐC GIA (16 Quốc Gia Đầy Đủ) */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '10px 14px' }}>
              <button
                type="button"
                onClick={() => setMobileCountryOpen(!mobileCountryOpen)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 8px',
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fas fa-globe" style={{ color: '#38bdf8' }}></i>
                  <span>Quốc Gia ({COUNTRIES.length})</span>
                </span>
                <i
                  className={`fas fa-chevron-${mobileCountryOpen ? 'up' : 'down'}`}
                  style={{ fontSize: '0.8rem', color: '#888' }}
                ></i>
              </button>

              {mobileCountryOpen && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '6px',
                    padding: '8px 0 12px',
                    animation: 'fadeIn 0.2s ease',
                  }}
                >
                  {COUNTRIES.map((c) => (
                    <Link
                      key={c.slug}
                      href={`/quoc-gia/${c.slug}`}
                      onClick={() => setIsMobileMenuOpen(false)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: pathname === `/quoc-gia/${c.slug}` ? 'var(--red, #e50914)' : 'rgba(255,255,255,0.05)',
                        color: '#fff',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>{c.flag}</span>
                      <span>{c.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Accordion: NĂM PHÁT HÀNH */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '10px 14px' }}>
              <button
                type="button"
                onClick={() => setMobileYearOpen(!mobileYearOpen)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 8px',
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fas fa-calendar" style={{ color: '#f59e0b' }}></i>
                  <span>Năm Phát Hành</span>
                </span>
                <i
                  className={`fas fa-chevron-${mobileYearOpen ? 'up' : 'down'}`}
                  style={{ fontSize: '0.8rem', color: '#888' }}
                ></i>
              </button>

              {mobileYearOpen && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '6px',
                    padding: '8px 0 12px',
                    animation: 'fadeIn 0.2s ease',
                  }}
                >
                  {YEARS.map((y) => (
                    <Link
                      key={y}
                      href={`/tim-kiem?q=${y}`}
                      onClick={() => setIsMobileMenuOpen(false)}
                      style={{
                        padding: '8px 4px',
                        borderRadius: '6px',
                        background: 'rgba(255,255,255,0.05)',
                        color: '#fff',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        textAlign: 'center',
                        textDecoration: 'none',
                      }}
                    >
                      {y}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div style={{ marginTop: 'auto', padding: '24px 18px', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
              <p style={{ fontSize: '0.78rem', color: '#666', margin: 0 }}>
                LPhim © 2026 • Xem phim HD Vietsub miễn phí
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
