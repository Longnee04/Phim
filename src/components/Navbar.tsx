'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { MovieItem } from '@/types/movie';
import { getImageUrl, searchMovies } from '@/lib/api';

const GENRES = [
  { name: 'Hành Động', slug: 'hanh-dong' },
  { name: 'Tình Cảm', slug: 'tinh-cam' },
  { name: 'Hài Hước', slug: 'hai-huoc' },
  { name: 'Cổ Trang', slug: 'co-trang' },
  { name: 'Tâm Lý', slug: 'tam-ly' },
  { name: 'Hình Sự', slug: 'hinh-su' },
  { name: 'Chiến Tranh', slug: 'chien-tranh' },
  { name: 'Thể Thao', slug: 'the-thao' },
  { name: 'Võ Thuật', slug: 'vo-thuat' },
  { name: 'Viễn Tưởng', slug: 'vien-tuong' },
  { name: 'Phiêu Lưu', slug: 'phieu-luu' },
  { name: 'Khoa Học', slug: 'khoa-hoc' },
  { name: 'Kinh Dị', slug: 'kinh-di' },
  { name: 'Âm Nhạc', slug: 'am-nhac' },
  { name: 'Thần Thoại', slug: 'than-thoai' },
  { name: 'Tài Liệu', slug: 'tai-lieu' },
  { name: 'Gia Đình', slug: 'gia-dinh' },
  { name: 'Chính Kịch', slug: 'chinh-kich' },
  { name: 'Bí Ẩn', slug: 'bi-an' },
  { name: 'Học Đường', slug: 'hoc-duong' },
  { name: 'Kinh Điển', slug: 'kinh-dien' },
  { name: 'Anime', slug: 'anime' },
];

const COUNTRIES = [
  { name: 'Trung Quốc', slug: 'trung-quoc' },
  { name: 'Hàn Quốc', slug: 'han-quoc' },
  { name: 'Nhật Bản', slug: 'nhat-ban' },
  { name: 'Thái Lan', slug: 'thai-lan' },
  { name: 'Âu Mỹ', slug: 'au-my' },
  { name: 'Đài Loan', slug: 'dai-loan' },
  { name: 'Hồng Kông', slug: 'hong-kong' },
  { name: 'Ấn Độ', slug: 'an-do' },
  { name: 'Anh', slug: 'anh' },
  { name: 'Pháp', slug: 'phap' },
  { name: 'Canada', slug: 'canada' },
  { name: 'Đức', slug: 'duc' },
  { name: 'Tây Ban Nha', slug: 'tay-ban-nha' },
  { name: 'Thổ Nhĩ Kỳ', slug: 'tho-nhi-ky' },
  { name: 'Hà Lan', slug: 'ha-lan' },
  { name: 'Indonesia', slug: 'indonesia' },
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

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
      router.push(`/tim-kiem?q=${encodeURIComponent(keyword.trim())}`);
    }
  };

  return (
    <>
      <nav className={`nav ${isScrolled ? 'nav--solid' : ''}`} id="navbar">
        {/* ==================== LEFT: LOGO + RECTANGULAR SEARCH BOX + MENU (TIGHT, CONTINUOUS) ==================== */}
        <div className="nav__left" style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 auto', minWidth: 0 }}>
          {/* Mobile hamburger */}
          <button
            className="nav__mobile-toggle"
            type="button"
            aria-label="Menu"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
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
          <div ref={searchContainerRef} className="nav__search-box-left" style={{ width: '230px', minWidth: '190px', flexShrink: 0 }}>
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
                            borderRadius: '6px',
                            flexShrink: 0,
                            background: '#111',
                          }}
                        />

                        {/* Info Column */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* Vietnamese Name (Mint Green / White) */}
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

          {/* Navigation Menu Right Next to Search Box */}
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

        {/* ==================== RIGHT: NOTIFICATION BELL ONLY ==================== */}
        <div className="nav__right" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {/* Notification Bell */}
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

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            background: 'rgba(10, 10, 15, 0.98)',
            padding: '80px 24px 40px',
            overflowY: 'auto',
          }}
        >
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: '1.4rem',
              cursor: 'pointer',
            }}
          >
            <i className="fas fa-times"></i>
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '1.1rem', fontWeight: 700 }}>
            <Link href="/" onClick={() => setIsMobileMenuOpen(false)} style={{ color: '#fff', textDecoration: 'none' }}>
              Trang chủ
            </Link>
            <Link href="/danh-sach/phim-bo" onClick={() => setIsMobileMenuOpen(false)} style={{ color: '#fff', textDecoration: 'none' }}>
              Phim Bộ
            </Link>
            <Link href="/danh-sach/phim-le" onClick={() => setIsMobileMenuOpen(false)} style={{ color: '#fff', textDecoration: 'none' }}>
              Phim Lẻ
            </Link>
            <Link href="/danh-sach/hoat-hinh" onClick={() => setIsMobileMenuOpen(false)} style={{ color: '#fff', textDecoration: 'none' }}>
              Hoạt Hình
            </Link>
            <Link href="/danh-sach/tv-shows" onClick={() => setIsMobileMenuOpen(false)} style={{ color: '#fff', textDecoration: 'none' }}>
              TV Shows
            </Link>
            <Link href="/danh-sach-cua-toi" onClick={() => setIsMobileMenuOpen(false)} style={{ color: '#fff', textDecoration: 'none' }}>
              Danh sách của tôi
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
