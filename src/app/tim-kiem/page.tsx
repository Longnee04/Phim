import React from 'react';
import { filterSearchMovies } from '@/lib/api';
import BrowseCard from '@/components/BrowseCard';
import { Pagination } from '@/components/Pagination';
import MovieFilter from '@/components/MovieFilter';

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    type?: string;
    genre?: string;
    country?: string;
    year?: string;
    sort?: string;
    page?: string;
  }>;
}

export async function generateMetadata({ searchParams }: SearchPageProps) {
  const { q, genre, country, year } = await searchParams;
  const parts: string[] = [];
  if (q) parts.push(`"${q}"`);
  if (genre && genre !== 'all') parts.push(`Thể loại: ${genre}`);
  if (country && country !== 'all') parts.push(`Quốc gia: ${country}`);
  if (year && year !== 'all') parts.push(`Năm: ${year}`);

  const title = parts.length > 0 ? `Tìm kiếm: ${parts.join(' • ')} | LPhim` : 'Bộ Lọc & Tìm Kiếm Phim | LPhim';
  return { title };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const {
    q = '',
    type = 'all',
    genre = 'all',
    country = 'all',
    year = 'all',
    sort = 'time',
    page = '1',
  } = await searchParams;

  const keyword = q ? decodeURIComponent(q).trim() : '';
  const currentPage = page ? parseInt(page, 10) || 1 : 1;

  const data = await filterSearchMovies({
    keyword,
    type,
    genre,
    country,
    year,
    sort,
    page: currentPage,
    limit: 24,
  });

  const movies = data?.data?.items || [];
  const totalItems = data?.data?.params?.pagination?.totalItems || movies.length;
  const totalPages = Math.max(1, data?.data?.params?.pagination?.pageRanges || Math.ceil(totalItems / 24));

  // Build pagination base URL preserving all active filter query params
  const queryParams = new URLSearchParams();
  if (keyword) queryParams.set('q', keyword);
  if (type && type !== 'all') queryParams.set('type', type);
  if (genre && genre !== 'all') queryParams.set('genre', genre);
  if (country && country !== 'all') queryParams.set('country', country);
  if (year && year !== 'all') queryParams.set('year', year);
  if (sort && sort !== 'time') queryParams.set('sort', sort);

  const basePaginationPath = `/tim-kiem?${queryParams.toString()}`;

  const hasActiveFilters = !!(
    keyword ||
    (type && type !== 'all') ||
    (genre && genre !== 'all') ||
    (country && country !== 'all') ||
    (year && year !== 'all') ||
    (sort && sort !== 'time')
  );

  return (
    <section className="browse" id="browse" style={{ display: 'block', paddingTop: 80, minHeight: '80vh' }}>
      <div style={{ padding: '0 var(--row-pad, 24px)' }}>
        {/* Interactive Movie Filter Component */}
        <MovieFilter
          initialKeyword={keyword}
          initialType={type}
          initialGenre={genre}
          initialCountry={country}
          initialYear={year}
          initialSort={sort}
        />

        {/* Results Header */}
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: '#fff' }}>
              {keyword
                ? `Kết quả tìm kiếm cho: "${keyword}"`
                : hasActiveFilters
                ? 'Danh Sách Phim Đã Lọc'
                : 'Tất Cả Phim Mới Cập Nhật'}
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--t2, #a3a3a3)', marginTop: 4, margin: 0 }}>
              Tìm thấy <strong style={{ color: 'var(--red, #e50914)' }}>{totalItems}</strong> bộ phim phù hợp
              {totalPages > 1 ? ` (Trang ${currentPage} / ${totalPages})` : ''}
            </p>
          </div>
        </div>

        {/* Top Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            basePath={basePaginationPath}
            isTop={true}
          />
        )}

        {/* Movies Grid */}
        {movies.length > 0 ? (
          <div className="browse__grid" id="browse-grid">
            {movies.map((movie) => (
              <BrowseCard key={movie.slug} movie={movie} />
            ))}
          </div>
        ) : (
          <div className="browse__empty" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <i className="fas fa-filter-circle-xmark" style={{ fontSize: '2.5rem', color: '#666', marginBottom: 16 }}></i>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: 8 }}>
              Không tìm thấy phim phù hợp với bộ lọc đã chọn
            </h3>
            <span style={{ fontSize: '0.85rem', color: '#888', display: 'block', maxWidth: '480px', margin: '0 auto 20px' }}>
              Hãy thử chọn lại thể loại khác, bỏ bớt điều kiện năm phát hành hoặc quốc gia để tìm thấy nhiều phim hơn.
            </span>
          </div>
        )}

        {/* Bottom Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            basePath={basePaginationPath}
          />
        )}
      </div>
    </section>
  );
}
