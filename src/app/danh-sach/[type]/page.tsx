import { notFound } from 'next/navigation';
import { getMoviesByType, getImageUrl } from '@/lib/api';
import BrowseMoviesView from '@/components/BrowseMoviesView';

export const revalidate = 180;

interface BrowseTypePageProps {
  params: Promise<{
    type: string;
  }>;
  searchParams: Promise<{
    page?: string;
    sort?: string;
    year?: string;
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
  const { page, sort, year } = await searchParams;
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

      <BrowseMoviesView
        initialMovies={movies}
        currentPage={currentPage}
        totalPages={totalPages}
        basePath={`/danh-sach/${type}`}
        initialSort={sort}
        initialYear={year}
      />
    </section>
  );
}
