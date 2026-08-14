import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Play, Star, Clock, Calendar, Globe, Film, Tag, ArrowLeft } from 'lucide-react';
import { getMovieDetail, getImageUrl, getLatestMovies } from '@/lib/api';
import NetflixRow from '@/components/NetflixRow';
import { BookmarkButton } from '@/components/BookmarkButton';

export const revalidate = 180;

interface MovieDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: MovieDetailPageProps) {
  const { slug } = await params;
  const data = await getMovieDetail(slug);
  if (!data || !data.movie) return { title: 'Không tìm thấy phim' };

  return {
    title: `${data.movie.name} (${data.movie.origin_name || data.movie.year}) - Xem Full HD | LPHIM`,
    description: data.movie.content ? data.movie.content.replace(/<[^>]*>?/gm, '').slice(0, 160) : `Xem phim ${data.movie.name} trực tuyến miễn phí`,
  };
}

export default async function MovieDetailPage({ params }: MovieDetailPageProps) {
  const { slug } = await params;
  const data = await getMovieDetail(slug);

  if (!data || !data.movie) {
    notFound();
  }

  const { movie, episodes } = data;
  const poster = getImageUrl(movie.poster_url);
  const backdrop = getImageUrl(movie.thumb_url || movie.poster_url);

  // Phim liên quan / gợi ý
  const relatedData = await getLatestMovies(1);
  const relatedMovies = relatedData?.data?.items?.filter((m) => m.slug !== movie.slug).slice(0, 8) || [];

  return (
    <div className="relative min-h-screen">
      {/* Blurred Backdrop */}
      <div className="absolute inset-0 top-0 h-[480px] w-full overflow-hidden -z-10">
        <img
          src={backdrop}
          alt={movie.name}
          className="w-full h-full object-cover filter brightness-[0.25] blur-[8px]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-10">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại trang chủ
        </Link>

        {/* Main Info Card */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Poster & Actions */}
          <div className="md:col-span-4 lg:col-span-3 space-y-4">
            <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-[#16191e]">
              <img
                src={poster}
                alt={movie.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                {movie.quality && (
                  <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-primary text-white shadow-lg">
                    {movie.quality}
                  </span>
                )}
                {movie.lang && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-lg bg-black/70 backdrop-blur-md text-gray-200 border border-white/10">
                    {movie.lang}
                  </span>
                )}
              </div>
            </div>

            <Link
              href={`/xem-phim/${movie.slug}`}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl bg-primary hover:bg-primary-hover text-white font-extrabold text-base shadow-lg shadow-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Play className="w-5 h-5 fill-white" /> XEM PHIM NGAY
            </Link>
            <BookmarkButton
              movie={{
                slug: movie.slug,
                name: movie.name,
                origin_name: movie.origin_name,
                poster_url: movie.poster_url,
                thumb_url: movie.thumb_url,
                quality: movie.quality,
                lang: movie.lang,
                episode_current: movie.episode_current,
                year: movie.year,
              }}
              size="lg"
            />
          </div>

          {/* Details & Specs */}
          <div className="md:col-span-8 lg:col-span-9 space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight">
                {movie.name}
              </h1>
              {movie.origin_name && (
                <p className="text-lg text-primary font-semibold">
                  {movie.origin_name} {movie.year ? `(${movie.year})` : ''}
                </p>
              )}
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-[#14171d] border border-[#222834] rounded-xl flex items-center gap-3">
                <Clock className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-[11px] text-gray-400">Thời lượng</div>
                  <div className="text-xs font-bold text-white">{movie.time || 'Đang cập nhật'}</div>
                </div>
              </div>

              <div className="p-3 bg-[#14171d] border border-[#222834] rounded-xl flex items-center gap-3">
                <Film className="w-5 h-5 text-accent" />
                <div>
                  <div className="text-[11px] text-gray-400">Tập hiện tại</div>
                  <div className="text-xs font-bold text-white">{movie.episode_current || 'Full'}</div>
                </div>
              </div>

              <div className="p-3 bg-[#14171d] border border-[#222834] rounded-xl flex items-center gap-3">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <div>
                  <div className="text-[11px] text-gray-400">Năm phát hành</div>
                  <div className="text-xs font-bold text-white">{movie.year || '2026'}</div>
                </div>
              </div>

              <div className="p-3 bg-[#14171d] border border-[#222834] rounded-xl flex items-center gap-3">
                <Globe className="w-5 h-5 text-yellow-400" />
                <div>
                  <div className="text-[11px] text-gray-400">Quốc gia</div>
                  <div className="text-xs font-bold text-white">
                    {movie.country?.map((c) => c.name).join(', ') || 'Đang cập nhật'}
                  </div>
                </div>
              </div>
            </div>

            {/* Thể loại Tags */}
            {movie.category && movie.category.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <Tag className="w-4 h-4 text-gray-400 mr-1" />
                {movie.category.map((cat) => (
                  <Link
                    key={cat.id || cat.slug}
                    href={`/the-loai/${cat.slug}`}
                    className="px-3 py-1 bg-[#1a1f29] hover:bg-primary/20 hover:text-primary text-xs font-medium text-gray-300 rounded-lg border border-[#273040] transition-colors"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            )}

            {/* Nội dung phim */}
            <div className="space-y-2 bg-[#14171d]/60 border border-[#202530] p-5 rounded-2xl">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="w-1 h-4 bg-primary rounded-full" /> Nội dung phim
              </h3>
              <p className="text-sm text-gray-300 leading-relaxed font-normal">
                {movie.content ? movie.content.replace(/<[^>]*>?/gm, '') : 'Nội dung phim đang được cập nhật.'}
              </p>
            </div>

            {/* Diễn viên & Đạo diễn */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-gray-300">
              {movie.director && movie.director.length > 0 && (
                <div>
                  <span className="text-gray-400 font-medium">Đạo diễn: </span>
                  <span className="font-semibold text-white">{movie.director.join(', ')}</span>
                </div>
              )}
              {movie.actor && movie.actor.length > 0 && (
                <div>
                  <span className="text-gray-400 font-medium">Diễn viên: </span>
                  <span className="font-semibold text-white">{movie.actor.join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Danh sách tập phim xem nhanh */}
        {episodes && episodes.length > 0 && (
          <div className="space-y-4 bg-[#14171d] border border-[#222834] p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-1.5 h-5 bg-primary rounded-full" /> Danh Sách Tập Phim
            </h3>
            {episodes.map((server, sIndex) => (
              <div key={sIndex} className="space-y-2">
                <div className="text-xs font-bold text-primary uppercase tracking-wider">
                  {server.server_name}
                </div>
                <div className="flex flex-wrap gap-2">
                  {server.server_data.map((ep, eIndex) => (
                    <Link
                      key={eIndex}
                      href={`/xem-phim/${movie.slug}?tap=${ep.slug || eIndex + 1}&server=${sIndex}`}
                      className="px-4 py-2 bg-[#1c212a] hover:bg-primary text-gray-200 hover:text-white rounded-lg text-xs font-semibold border border-[#2a3240] transition-colors"
                    >
                      {ep.name.startsWith('Tập') ? ep.name : `Tập ${ep.name}`}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Phim gợi ý */}
        <NetflixRow
          title="Có Thể Bạn Cũng Thích"
          movies={relatedMovies}
        />
      </div>
    </div>
  );
}
