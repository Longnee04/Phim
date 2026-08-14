'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { MovieItem } from '@/types/movie';
import { getImageUrl, searchMovies } from '@/lib/api';
import { useModal } from '@/context/ModalContext';

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
  { name: 'Đức', slug: 'duc' },
  { name: 'Việt Nam', slug: 'viet-nam' },
  { name: 'Thổ Nhĩ Kỳ', slug: 'tho-nhi-ky' },
  { name: 'Philippines', slug: 'philippines' },
  { name: 'Indonesia', slug: 'indonesia' },
];

const YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { openModal } = useModal();

  const [keyword, setKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<MovieItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [currentSource, setCurrentSource] = useState('KKPhim');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Search auto complete
  useEffect(() => {
    if (!keyword.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchMovies(keyword.trim(), 8);
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
    }, 250);

    return () => clearTimeout(timer);
  }, [keyword]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim()) {
      router.push(`/tim-kiem?q=${encodeURIComponent(keyword.trim())}`);
      setIsSearchOpen(false);
    }
  };

  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
    if (!isSearchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  };

  return (
    <>
      <nav className={`nav ${isScrolled ? 'nav--solid' : ''}`} id="nav">
        <div className="nav__left">
          <Link href="/" className="nav__logo" id="nav-logo">
            <i className="fas fa-film"></i>LPhim
          </Link>
          <ul className="nav__menu" id="nav-menu">
            <li>
              <Link
                href="/"
                className={`nav__link ${pathname === '/' ? 'active' : ''}`}
                id="link-home"
              >
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

        <div className="nav__right">
          <div className={`nav__search ${isSearchOpen ? 'open' : ''}`} id="nav-search">
            <button
              className="nav__search-btn"
              id="search-btn"
              type="button"
              aria-label="Tìm kiếm"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('open-search-overlay', { detail: { keyword } }));
              }}
            >
              <i className="fas fa-search"></i>
            </button>
            <input
              ref={searchInputRef}
              type="text"
              className="nav__search-input"
              id="search-input"
              placeholder="Tên phim, năm phát hành..."
              autoComplete="off"
              value={keyword}
              onFocus={() => {
                window.dispatchEvent(new CustomEvent('open-search-overlay', { detail: { keyword } }));
              }}
              onChange={(e) => {
                setKeyword(e.target.value);
                window.dispatchEvent(new CustomEvent('open-search-overlay', { detail: { keyword: e.target.value } }));
              }}
            />
            {/* Quick Autocomplete dropdown inside nav search */}
            {isSearchOpen && keyword.trim().length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  width: 320,
                  background: 'rgba(24,24,24,0.98)',
                  border: '1px solid #333',
                  borderRadius: 8,
                  boxShadow: '0 12px 40px rgba(0,0,0,0.8)',
                  zIndex: 950,
                  marginTop: 8,
                  overflow: 'hidden',
                }}
              >
                {isSearching ? (
                  <div style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#a3a3a3' }}>Đang tìm...</div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((item) => (
                    <div
                      key={item.slug}
                      onClick={() => {
                        setIsSearchOpen(false);
                        openModal(item.slug, false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 12px',
                        cursor: 'pointer',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      <img
                        src={getImageUrl(item.poster_url || item.thumb_url)}
                        alt={item.name}
                        style={{ width: 36, height: 50, objectFit: 'cover', borderRadius: 4 }}
                      />
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#a3a3a3' }}>
                          {item.origin_name} ({item.year})
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#a3a3a3' }}>Không tìm thấy phim</div>
                )}
              </div>
            )}
          </div>
          <button
            className="nav__notification"
            id="notification-btn"
            type="button"
            aria-label="Thông báo"
            onClick={() => window.dispatchEvent(new CustomEvent('open-changelog'))}
          >
            <i className="fas fa-bell"></i>
            <span className="nav__notification-badge" id="notification-badge" style={{ display: 'none' }}></span>
          </button>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="nav__mobile-toggle"
          id="mobile-menu-btn"
          type="button"
          aria-label="Menu"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <i className="fas fa-bars"></i>
        </button>
      </nav>

      {/* Mobile Sidebar */}
      <div
        className={`sidebar-overlay ${isMobileMenuOpen ? 'open' : ''}`}
        id="sidebar-overlay"
        onClick={() => setIsMobileMenuOpen(false)}
      />
      <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`} id="sidebar">
        <div className="sidebar__header">
          <h2 className="sidebar__logo"><i className="fas fa-film"></i> LPhim</h2>
          <button
            className="sidebar__close"
            id="sidebar-close"
            type="button"
            aria-label="Đóng menu"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        <nav className="sidebar__nav">
          <Link href="/" className="sidebar__link" onClick={() => setIsMobileMenuOpen(false)}>
            <i className="fas fa-home"></i> Trang chủ
          </Link>
          <Link href="/danh-sach/phim-bo" className="sidebar__link" onClick={() => setIsMobileMenuOpen(false)}>
            <i className="fas fa-tv"></i> Phim Bộ
          </Link>
          <Link href="/danh-sach/phim-le" className="sidebar__link" onClick={() => setIsMobileMenuOpen(false)}>
            <i className="fas fa-film"></i> Phim Lẻ
          </Link>
          <Link href="/danh-sach/hoat-hinh" className="sidebar__link" onClick={() => setIsMobileMenuOpen(false)}>
            <i className="fas fa-dragon"></i> Hoạt Hình
          </Link>
          <Link href="/danh-sach/tv-shows" className="sidebar__link" onClick={() => setIsMobileMenuOpen(false)}>
            <i className="fas fa-satellite-dish"></i> TV Shows
          </Link>
          <Link href="/danh-sach-cua-toi" className="sidebar__link" onClick={() => setIsMobileMenuOpen(false)}>
            <i className="fas fa-heart"></i> Danh sách của tôi
          </Link>
        </nav>
      </aside>
    </>
  );
}
