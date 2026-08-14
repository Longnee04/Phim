import { notFound } from 'next/navigation';
import { getMovieDetail } from '@/lib/api';
import WatchClient from '@/components/WatchClient';

export const revalidate = 180;

interface WatchPageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    tap?: string;
    server?: string;
  }>;
}

export async function generateMetadata({ params }: WatchPageProps) {
  const { slug } = await params;
  const data = await getMovieDetail(slug);
  if (!data || !data.movie) return { title: 'Xem Phim' };

  return {
    title: `Đang xem: ${data.movie.name} - Full HD Vietsub | LPHIM`,
    description: `Xem phim ${data.movie.name} chất lượng cao trực tuyến miễn phí tại LPhim`,
  };
}

export default async function WatchPage({ params, searchParams }: WatchPageProps) {
  const { slug } = await params;
  const { tap, server } = await searchParams;
  const data = await getMovieDetail(slug);

  if (!data || !data.movie || !data.episodes || data.episodes.length === 0) {
    notFound();
  }

  const serverIndex = server ? parseInt(server, 10) || 0 : 0;

  return (
    <WatchClient
      movie={data.movie}
      episodes={data.episodes}
      initialTapSlug={tap}
      initialServerIndex={serverIndex}
    />
  );
}
