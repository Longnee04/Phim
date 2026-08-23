import { notFound } from 'next/navigation';
import { getMoviesByType, getImageUrl } from '@/lib/api';
import BrowseCard from '@/components/BrowseCard';
import { Pagination } from '@/components/Pagination';

export const revalidate = 180;

interface BrowseTypePageProps {
  params: Promise<{
    type: string;
  }>;
  searchParams: Promise<{
    page?: string;
  }>;
}

const TYPE_TITLES: Record<string, string> = {
  'phim-bo': 'Phim Bộ',
  'phim-le': 'Phim Lẻ',
  'hoat-hinh': 'Hoạt Hình & Anime',
  'tv-shows': 'TV Shows',
  'phim-moi-cap-nhat': 'Phim Mới Cập Nhật',
};

export default async function BrowseTypePage({ params, searchParams }: BrowseTypePageProps) {
  const { type } = await params;
  const { page } = await searchParams;
  const currentPage = page ? parseInt(page, 10) || 1 : 1;

  const data = await getMoviesByType(type, currentPage);

  if (!data || !data.data || !data.data.items) {
    notFound();
  }

  const movies = data.data.items;
  const title = TYPE_TITLES[type] || data.data.titlePage || 'Danh sách phim';
  const totalItems = data.data.params?.pagination?.totalItems || 200;
  const totalPages = Math.max(1, data.data.params?.pagination?.pageRanges || Math.ceil(totalItems / 20));
  const heroBackdrop = movies[0] ? getImageUrl(movies[0].thumb_url || movies[0].poster_url) : '';

  return (
    <section className="browse" id="browse" style={{ display: 'block', paddingTop: 68 }}>
      <div className="browse__hero" id="browse-hero">
        <div
          className="browse__hero-bg"
          id="browse-hero-bg"
          style={{ backgroundImage: `url(${heroBackdrop})` }}
        ></div>
        <div className="browse__hero-gradient"></div>
        <div className="browse__hero-content">
          <h1 className="browse__hero-title" id="browse-title">{title}</h1>
          <p className="browse__hero-count" id="browse-count">Tổng cộng {totalItems} bộ phim</p>
        </div>
      </div>

      <div className="browse__toolbar">
        <div className="browse__sort">
          <label>Sắp xếp: </label>
          <select id="browse-sort" className="browse__sort-select">
            <option value="default">Mặc định</option>
            <option value="name">Tên A-Z</option>
            <option value="year">Năm mới nhất</option>
          </select>
        </div>
        <span className="browse__page-indicator" id="browse-page-indicator">
          Trang {currentPage} / {totalPages}
        </span>
      </div>

      {/* Top Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        basePath={`/danh-sach/${type}`}
        isTop={true}
      />

      <div className="browse__grid" id="browse-grid">
        {movies.map((movie) => (
          <BrowseCard key={movie.slug} movie={movie} />
        ))}
      </div>

      {/* Bottom Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        basePath={`/danh-sach/${type}`}
      />
    </section>
  );
}
