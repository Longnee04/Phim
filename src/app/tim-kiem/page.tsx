import { searchMovies } from '@/lib/api';
import BrowseCard from '@/components/BrowseCard';
import { Pagination } from '@/components/Pagination';

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
  }>;
}

export async function generateMetadata({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  return {
    title: q ? `Kết quả tìm kiếm cho "${q}" | LPhim` : 'Tìm kiếm phim | LPhim',
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q, page } = await searchParams;
  const keyword = q ? decodeURIComponent(q).trim() : '';
  const currentPage = page ? parseInt(page, 10) || 1 : 1;

  const data = keyword ? await searchMovies(keyword, 24, currentPage) : null;
  const movies = data?.data?.items || [];
  const totalItems = data?.data?.params?.pagination?.totalItems || movies.length;
  const totalPages = Math.max(1, data?.data?.params?.pagination?.pageRanges || Math.ceil(totalItems / 24));

  return (
    <section className="browse" id="browse" style={{ display: 'block', paddingTop: 80, minHeight: '80vh' }}>
      <div style={{ padding: '0 var(--row-pad, 24px)', marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>
          {keyword ? `Kết quả tìm kiếm cho: "${keyword}"` : 'Tìm kiếm phim'}
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--t2, #a3a3a3)', marginTop: 4 }}>
          {movies.length > 0
            ? `Tìm thấy ${totalItems} bộ phim phù hợp ${totalPages > 1 ? `(Trang ${currentPage}/${totalPages})` : ''}`
            : 'Nhập từ khóa hoặc năm phát hành trên thanh tìm kiếm'}
        </p>
      </div>

      {totalPages > 1 && keyword && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          basePath={`/tim-kiem?q=${encodeURIComponent(keyword)}`}
          isTop={true}
        />
      )}

      {movies.length > 0 ? (
        <div className="browse__grid" id="browse-grid">
          {movies.map((movie) => (
            <BrowseCard key={movie.slug} movie={movie} />
          ))}
        </div>
      ) : (
        <div className="browse__empty">
          <i className="fas fa-search"></i>
          <p>Không tìm thấy phim phù hợp.</p>
          <span>Hãy thử với từ khóa khác (ví dụ: tên phim, diễn viên hoặc thể loại)</span>
        </div>
      )}

      {totalPages > 1 && keyword && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          basePath={`/tim-kiem?q=${encodeURIComponent(keyword)}`}
        />
      )}
    </section>
  );
}
