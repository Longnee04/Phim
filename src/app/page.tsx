import { getLatestMovies, getMoviesByType, getMoviesByGenre, getMoviesByCountry, fetchRaw } from '@/lib/api';
import NetflixHero from '@/components/NetflixHero';
import NetflixRow from '@/components/NetflixRow';
import TopRankRow from '@/components/TopRankRow';
import { ContinueWatching } from '@/components/ContinueWatching';

export const revalidate = 180;

export default async function HomePage() {
  const [
    latestRes,
    seriesRes,
    singleRes,
    animeRes,
    tvShowsRes,
    vietsubRes,
    actionRes,
    koreaRes,
    japanRes,
    romanceRes,
    historicalRes,
  ] = await Promise.all([
    getLatestMovies(1),
    getMoviesByType('phim-bo', 1),
    getMoviesByType('phim-le', 1),
    getMoviesByType('hoat-hinh', 1),
    getMoviesByType('tv-shows', 1),
    getMoviesByType('phim-vietsub', 1),
    getMoviesByGenre('hanh-dong', 1),
    getMoviesByCountry('han-quoc', 1),
    getMoviesByCountry('nhat-ban', 1),
    getMoviesByGenre('tinh-cam', 1),
    getMoviesByGenre('co-trang', 1),
  ]);

  let latestMovies = latestRes?.data?.items || [];
  let seriesMovies = seriesRes?.data?.items || [];
  let singleMovies = singleRes?.data?.items || [];
  let animeMovies = animeRes?.data?.items || [];
  let tvShowsMovies = tvShowsRes?.data?.items || [];
  let vietsubMovies = vietsubRes?.data?.items || [];
  let actionMovies = actionRes?.data?.items || [];
  let koreaMovies = koreaRes?.data?.items || [];
  let japanMovies = japanRes?.data?.items || [];
  let romanceMovies = romanceRes?.data?.items || [];
  let historicalMovies = historicalRes?.data?.items || [];

  // Emergency Backup: If both NguonC & KKPhim calls returned empty in parallel, fetch directly from KKPhim single call
  if (latestMovies.length === 0 && seriesMovies.length === 0) {
    try {
      const emergencyKK = await fetchRaw<any>('https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=1');
      if (emergencyKK?.items && Array.isArray(emergencyKK.items) && emergencyKK.items.length > 0) {
        latestMovies = emergencyKK.items.map((item: any) => ({
          _id: item._id || item.slug,
          name: item.name || '',
          slug: item.slug || '',
          origin_name: item.origin_name || item.name || '',
          thumb_url: item.thumb_url?.startsWith('http') ? item.thumb_url : `https://phimimg.com/${item.thumb_url}`,
          poster_url: item.poster_url?.startsWith('http') ? item.poster_url : `https://phimimg.com/${item.poster_url}`,
          year: item.year || 2026,
          quality: item.quality || 'FHD',
          lang: item.lang || 'Vietsub',
          episode_current: item.episode_current || '',
          time: item.time || '',
          category: item.category || [],
          country: item.country || [],
          type: item.type || 'single',
          content: item.content || '',
        }));
      }
    } catch {}
  }

  // Master fallback pool to ensure the home page is never empty
  const heroMovies =
    latestMovies.length > 0
      ? latestMovies
      : seriesMovies.length > 0
      ? seriesMovies
      : singleMovies.length > 0
      ? singleMovies
      : animeMovies.length > 0
      ? animeMovies
      : [];

  const hasHero = heroMovies.length > 0;

  return (
    <div id="home-view" style={{ paddingTop: hasHero ? '0' : 'var(--nav-h, 68px)' }}>
      {/* Billboard Hero Banner with multi-slide */}
      {hasHero && <NetflixHero movies={heroMovies} />}

      {/* Main Rows Container */}
      <main
        className="rows-container"
        id="rows-container"
        style={{ marginTop: hasHero ? '-40px' : '20px', position: 'relative', zIndex: 10 }}
      >
        {/* Tiếp tục xem */}
        <ContinueWatching />

        {/* Top 10 phim hot nhất 🔥 */}
        {heroMovies.length > 0 && (
          <TopRankRow
            title="Top 10 phim hot nhất 🔥"
            movies={heroMovies}
          />
        )}

        {/* Mới cập nhật */}
        <NetflixRow
          title="Mới cập nhật"
          viewAllLink="/danh-sach/phim-moi-cap-nhat"
          movies={latestMovies.length > 0 ? latestMovies.slice(0, 16) : heroMovies.slice(0, 16)}
        />

        {/* Phim Chiếu Rạp Bom Tấn */}
        <NetflixRow
          title="Phim Chiếu Rạp & Hành Động Bom Tấn 🎬"
          viewAllLink="/the-loai/hanh-dong"
          movies={actionMovies.length > 0 ? actionMovies : singleMovies.length > 0 ? singleMovies : heroMovies}
        />

        {/* Phim Bộ đáng xem */}
        <NetflixRow
          title="Phim Bộ đáng xem"
          viewAllLink="/danh-sach/phim-bo"
          movies={seriesMovies.length > 0 ? seriesMovies : heroMovies}
        />

        {/* Phim Hàn Quốc Đặc Sắc */}
        <NetflixRow
          title="Phim Hàn Quốc Đặc Sắc 🇰🇷"
          viewAllLink="/quoc-gia/han-quoc"
          movies={koreaMovies.length > 0 ? koreaMovies : heroMovies}
        />

        {/* Phim Lẻ tuyển chọn */}
        <NetflixRow
          title="Phim Lẻ tuyển chọn"
          viewAllLink="/danh-sach/phim-le"
          movies={singleMovies.length > 0 ? singleMovies : heroMovies}
        />

        {/* Anime Nhật Bản Đỉnh Cao */}
        <NetflixRow
          title="Anime & Phim Nhật Bản Đỉnh Cao 🇯🇵"
          viewAllLink="/quoc-gia/nhat-ban"
          movies={japanMovies.length > 0 ? japanMovies : animeMovies.length > 0 ? animeMovies : heroMovies}
        />

        {/* Hoạt Hình & Anime */}
        <NetflixRow
          title="Hoạt Hình Chọn Lọc"
          viewAllLink="/danh-sach/hoat-hinh"
          movies={animeMovies.length > 0 ? animeMovies : heroMovies}
        />

        {/* Phim Tình Cảm Lãng Mạn */}
        <NetflixRow
          title="Phim Tình Cảm Lãng Mạn 💕"
          viewAllLink="/the-loai/tinh-cam"
          movies={romanceMovies.length > 0 ? romanceMovies : seriesMovies.length > 0 ? seriesMovies : heroMovies}
        />

        {/* Phim Cổ Trang */}
        <NetflixRow
          title="Phim Cổ Trang Kịch Tính ⚔️"
          viewAllLink="/the-loai/co-trang"
          movies={historicalMovies.length > 0 ? historicalMovies : seriesMovies.length > 0 ? seriesMovies : heroMovies}
        />

        {/* TV Shows */}
        <NetflixRow
          title="TV Shows & Truyền Hình Thực Tế"
          viewAllLink="/danh-sach/tv-shows"
          movies={tvShowsMovies.length > 0 ? tvShowsMovies : seriesMovies.length > 0 ? seriesMovies : heroMovies}
        />

        {/* Phim Vietsub */}
        <NetflixRow
          title="Phim Thuyết Minh / Vietsub"
          viewAllLink="/danh-sach/phim-vietsub"
          movies={vietsubMovies.length > 0 ? vietsubMovies : singleMovies.length > 0 ? singleMovies : heroMovies}
        />
      </main>
    </div>
  );
}
