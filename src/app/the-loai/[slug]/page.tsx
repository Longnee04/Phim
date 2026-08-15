import { notFound } from 'next/navigation';
import { getMoviesByGenre, getImageUrl } from '@/lib/api';
import BrowseCard from '@/components/BrowseCard';
import { Pagination } from '@/components/Pagination';

export const revalidate = 180;

interface GenrePageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    page?: string;
  }>;
}

const GENRE_TITLES: Record<string, string> = {
  'hanh-dong': 'Phim Hành Động',
  'tinh-cam': 'Phim Tình Cảm',
  'hai-huoc': 'Phim Hài Hước',
  'co-trang': 'Phim Cổ Trang',
  'tam-ly': 'Phim Tâm Lý',
  'hinh-su': 'Phim Hình Sự',
  'chien-tranh': 'Phim Chiến Tranh',
  'the-thao': 'Phim Thể Thao',
  'vo-thuat': 'Phim Võ Thuật',
  'vien-tuong': 'Phim Viễn Tưởng',
  'phieu-luu': 'Phim Phiêu Lưu',
  'khoa-hoc': 'Phim Khoa Học',
  'kinh-di': 'Phim Kinh Dị',
  'am-nhac': 'Phim Âm Nhạc',
  'than-thoai': 'Phim Thần Thoại',
  'tai-lieu': 'Phim Tài Liệu',
  'gia-dinh': 'Phim Gia Đình',
  'chinh-kich': 'Phim Chính Kịch',
  'bi-an': 'Phim Bí Ẩn',
  'hoc-duong': 'Phim Học Đường',
  'kinh-dien': 'Phim Kinh Điển',
  'anime': 'Phim Anime Nhật Bản',
};

export default async function GenrePage({ params, searchParams }: GenrePageProps) {
  const { slug } = await params;
  const { page } = await searchParams;
  const currentPage = page ? parseInt(page, 10) || 1 : 1;

  const data = await getMoviesByGenre(slug, currentPage);

  if (!data || !data.data || !data.data.items) {
    notFound();
  }

  const movies = data.data.items;
  const title = GENRE_TITLES[slug] || data.data.titlePage || `Thể loại: ${slug}`;
  const totalItems = data.data.params?.pagination?.totalItems || (movies.length > 0 ? 200 : 0);
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

      <div className="browse__grid" id="browse-grid">
        {movies.map((movie) => (
          <BrowseCard key={movie.slug} movie={movie} />
        ))}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        basePath={`/the-loai/${slug}`}
      />
    </section>
  );
}
