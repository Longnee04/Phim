import { getLatestMovies, getMoviesByType, getMoviesByGenre, getMoviesByCountry } from '@/lib/api';
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

  const latestMovies = latestRes?.data?.items || [];
  const seriesMovies = seriesRes?.data?.items || [];
  const singleMovies = singleRes?.data?.items || [];
  const animeMovies = animeRes?.data?.items || [];
  const tvShowsMovies = tvShowsRes?.data?.items || [];
  const vietsubMovies = vietsubRes?.data?.items || [];
  const actionMovies = actionRes?.data?.items || [];
  const koreaMovies = koreaRes?.data?.items || [];
  const japanMovies = japanRes?.data?.items || [];
  const romanceMovies = romanceRes?.data?.items || [];
  const historicalMovies = historicalRes?.data?.items || [];

  return (
    <div id="home-view">
      {/* Billboard Hero Banner with multi-slide */}
      <NetflixHero movies={latestMovies} />

      {/* Main Rows Container */}
      <main className="rows-container" id="rows-container">
        {/* Tiếp tục xem */}
        <ContinueWatching />

        {/* Top 10 phim hot nhất 🔥 */}
        {latestMovies.length > 0 && (
          <TopRankRow
            title="Top 10 phim hot nhất 🔥"
            movies={latestMovies}
          />
        )}

        {/* Mới cập nhật */}
        <NetflixRow
          title="Mới cập nhật"
          viewAllLink="/danh-sach/phim-moi-cap-nhat"
          movies={latestMovies.slice(0, 15)}
        />

        {/* Phim Chiếu Rạp Bom Tấn */}
        {actionMovies.length > 0 && (
          <NetflixRow
            title="Phim Chiếu Rạp & Hành Động Bom Tấn 🎬"
            viewAllLink="/the-loai/hanh-dong"
            movies={actionMovies}
          />
        )}

        {/* Phim Bộ đáng xem */}
        <NetflixRow
          title="Phim Bộ đáng xem"
          viewAllLink="/danh-sach/phim-bo"
          movies={seriesMovies}
        />

        {/* Phim Hàn Quốc Đặc Sắc */}
        {koreaMovies.length > 0 && (
          <NetflixRow
            title="Phim Hàn Quốc Đặc Sắc 🇰🇷"
            viewAllLink="/quoc-gia/han-quoc"
            movies={koreaMovies}
          />
        )}

        {/* Phim Lẻ tuyển chọn */}
        <NetflixRow
          title="Phim Lẻ tuyển chọn"
          viewAllLink="/danh-sach/phim-le"
          movies={singleMovies}
        />

        {/* Anime Nhật Bản Đỉnh Cao */}
        {japanMovies.length > 0 && (
          <NetflixRow
            title="Anime & Phim Nhật Bản Đỉnh Cao 🇯🇵"
            viewAllLink="/quoc-gia/nhat-ban"
            movies={japanMovies}
          />
        )}

        {/* Hoạt Hình & Anime */}
        <NetflixRow
          title="Hoạt Hình Chọn Lọc"
          viewAllLink="/danh-sach/hoat-hinh"
          movies={animeMovies}
        />

        {/* Phim Tình Cảm Lãng Mạn */}
        {romanceMovies.length > 0 && (
          <NetflixRow
            title="Phim Tình Cảm Lãng Mạn 💕"
            viewAllLink="/the-loai/tinh-cam"
            movies={romanceMovies}
          />
        )}

        {/* Phim Cổ Trang */}
        {historicalMovies.length > 0 && (
          <NetflixRow
            title="Phim Cổ Trang Kịch Tính ⚔️"
            viewAllLink="/the-loai/co-trang"
            movies={historicalMovies}
          />
        )}

        {/* TV Shows */}
        <NetflixRow
          title="TV Shows & Truyền Hình Thực Tế"
          viewAllLink="/danh-sach/tv-shows"
          movies={tvShowsMovies}
        />

        {/* Phim Vietsub */}
        <NetflixRow
          title="Phim Thuyết Minh / Vietsub"
          viewAllLink="/danh-sach/phim-vietsub"
          movies={vietsubMovies.length > 0 ? vietsubMovies : singleMovies}
        />
      </main>
    </div>
  );
}
