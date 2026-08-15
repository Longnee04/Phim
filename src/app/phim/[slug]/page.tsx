import { notFound } from 'next/navigation';
import { getMovieDetail, getLatestMovies } from '@/lib/api';
import MovieDetailClient from '@/components/MovieDetailClient';

export const revalidate = 180;

interface MovieDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: MovieDetailPageProps) {
  const { slug } = await params;
  const data = await getMovieDetail(slug);
  if (!data || !data.movie) return { title: 'Không tìm thấy phim - LPhim' };

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

  if (!data || !data.movie) {
    notFound();
  }

  const relatedData = await getLatestMovies(1);
  const relatedMovies =
    relatedData?.data?.items?.filter((m) => m.slug !== data.movie.slug).slice(0, 12) || [];

  return (
    <MovieDetailClient
      movie={data.movie}
      episodes={data.episodes || []}
      relatedMovies={relatedMovies}
    />
  );
}
