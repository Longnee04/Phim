'use client';

import React from 'react';
import Link from 'next/link';

const HEADER_GENRES = [
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

const HEADER_COUNTRIES = [
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

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenFeedback = (e: React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('open-feedback'));
  };

  return (
    <footer
      style={{
        background: '#0e0e10',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        padding: '40px var(--row-pad, 4%) 30px',
        color: '#8e8e93',
        fontSize: '0.85rem',
        marginTop: '60px',
        position: 'relative',
      }}
    >
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {/* Logo */}
        <div style={{ marginBottom: 28 }}>
          <Link
            href="/"
            style={{
              fontSize: '1.6rem',
              fontWeight: 800,
              color: '#fff',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              letterSpacing: 1,
            }}
          >
            <i className="fas fa-film" style={{ color: 'var(--red, #e50914)' }}></i>
            <span>L<span style={{ color: 'var(--red, #e50914)' }}>PHIM</span></span>
          </Link>
        </div>

        {/* 2 Columns: Thể Loại & Quốc Gia matching Header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 36,
            marginBottom: 36,
          }}
        >
          {/* Column 1: Thể Loại Phim */}
          <div>
            <h4
              style={{
                color: '#fff',
                fontSize: '0.88rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 16,
              }}
            >
              THỂ LOẠI PHIM
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {HEADER_GENRES.map((g) => (
                <Link
                  key={g.slug}
                  href={`/the-loai/${g.slug}`}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#a0a0a5',
                    padding: '5px 12px',
                    borderRadius: 20,
                    fontSize: '0.78rem',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(229, 9, 20, 0.18)';
                    e.currentTarget.style.borderColor = 'var(--red, #e50914)';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.color = '#a0a0a5';
                  }}
                >
                  {g.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Column 2: Quốc Gia */}
          <div>
            <h4
              style={{
                color: '#fff',
                fontSize: '0.88rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 16,
              }}
            >
              QUỐC GIA
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {HEADER_COUNTRIES.map((c) => (
                <Link
                  key={c.slug}
                  href={`/quoc-gia/${c.slug}`}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#a0a0a5',
                    padding: '5px 12px',
                    borderRadius: 20,
                    fontSize: '0.78rem',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(229, 9, 20, 0.18)';
                    e.currentTarget.style.borderColor = 'var(--red, #e50914)';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.color = '#a0a0a5';
                  }}
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Separator */}
        <div style={{ height: 1, background: 'rgba(255, 255, 255, 0.06)', margin: '24px 0' }} />

        {/* Bottom Nav Links, Báo Lỗi Góp Ý & Back-To-Top Button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, fontWeight: 600, alignItems: 'center' }}>
            <Link
              href="/"
              style={{ color: '#fff', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--red, #e50914)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#fff')}
            >
              Giới Thiệu
            </Link>
            <Link
              href="/"
              style={{ color: '#fff', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--red, #e50914)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#fff')}
            >
              DMCA
            </Link>
            <Link
              href="/"
              style={{ color: '#fff', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--red, #e50914)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#fff')}
            >
              Chính sách bảo mật
            </Link>
            <button
              onClick={handleOpenFeedback}
              id="footer-feedback-btn"
              type="button"
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                padding: 0,
                cursor: 'pointer',
                fontSize: 'inherit',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--red, #e50914)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#fff')}
            >
              <i className="fas fa-comment-dots" style={{ color: 'var(--red, #e50914)' }}></i>
              Báo lỗi & Góp ý
            </button>
          </div>

          {/* Back to top button */}
          <button
            onClick={scrollToTop}
            type="button"
            title="Lên đầu trang"
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--red, #e50914)';
              e.currentTarget.style.borderColor = 'var(--red, #e50914)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <i className="fas fa-chevron-up"></i>
          </button>
        </div>

        {/* Text and Copyright */}
        <div style={{ fontSize: '0.8rem', lineHeight: 1.6, color: '#6e6e73' }}>
          <p style={{ margin: '0 0 6px 0' }}>
            Xem phim online tại LPHIM với chất lượng 4K / HD, Vietsub, thuyết minh, lồng tiếng và song ngữ. Phim mới được cập nhật mỗi ngày.
          </p>
          <p style={{ margin: 0 }}>
            &copy; {new Date().getFullYear()} LPHIM. Cảm ơn bạn đã đồng hành cùng cộng đồng yêu phim.
          </p>
        </div>
      </div>
    </footer>
  );
}
