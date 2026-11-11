import { getMovieDetail, getLatestMovies } from '@/lib/api';
import MovieDetailClient from '@/components/MovieDetailClient';
import MovieDetailFallback from '@/components/MovieDetailFallback';

export const revalidate = 180;

interface MovieDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: MovieDetailPageProps) {
  const { slug } = await params;
  const data = await getMovieDetail(slug);
  if (!data || !data.movie) {
    const formattedTitle = slug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    return { title: `${formattedTitle} - Xem Full HD | LPHIM` };
  }

  return {
    title: `${data.movie.name} (${data.movie.origin_name || data.movie.year}) - Xem Full HD | LPHIM`,
    description: data.movie.content
      ? data.movie.content.replace(/<[^>]*>?/gm, '').slice(0, 160)
      : `Xem phim ${data.movie.name} chất lượng cao miễn phí tại LPhim`,
  };
}

export default async function MovieDetailPage({ params }: MovieDetailPageProps) {
  const { slug } = await params;
  const data = await getMovieDetail(slug);
  const relatedData = await getLatestMovies(1);
  const relatedMovies =
    relatedData?.data?.items?.filter((m) => m.slug !== slug).slice(0, 12) || [];

  if (!data || !data.movie) {
    // If SSR on Vercel is blocked by Cloudflare (NguonC 403 on datacenter IPs),
    // fallback to client-side fetch directly in the user's browser where CORS is enabled.
    return <MovieDetailFallback slug={slug} relatedMovies={relatedMovies} />;
  }

  return (
    <MovieDetailClient
      movie={data.movie}
      episodes={data.episodes || []}
      relatedMovies={relatedMovies}
    />
  );
}
