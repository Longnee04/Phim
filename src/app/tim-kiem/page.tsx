import { searchMovies } from '@/lib/api';
import BrowseCard from '@/components/BrowseCard';

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
  }>;
}

export async function generateMetadata({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  return {
    title: q ? `Kết quả tìm kiếm cho "${q}" | LPhim` : 'Tìm kiếm phim | LPhim',
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const keyword = q ? decodeURIComponent(q).trim() : '';

  const data = keyword ? await searchMovies(keyword, 36) : null;
  const movies = data?.data?.items || [];

  return (
    <section className="browse" id="browse" style={{ display: 'block', paddingTop: 80 }}>
      <div style={{ padding: '0 var(--row-pad)', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>
          {keyword ? `Kết quả tìm kiếm cho: "${keyword}"` : 'Tìm kiếm phim'}
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--t2)', marginTop: 4 }}>
          {movies.length > 0
            ? `Tìm thấy ${movies.length} bộ phim phù hợp`
            : 'Nhập từ khóa hoặc năm phát hành trên thanh tìm kiếm'}
        </p>
      </div>

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
    </section>
  );
}
