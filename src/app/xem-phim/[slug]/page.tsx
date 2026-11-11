import { getMovieDetail } from '@/lib/api';
import WatchClient from '@/components/WatchClient';
import WatchFallback from '@/components/WatchFallback';

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
  if (!data || !data.movie) {
    const formattedTitle = slug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    return { title: `Đang xem: ${formattedTitle} - Full HD Vietsub | LPHIM` };
  }

  return {
    title: `Đang xem: ${data.movie.name} - Full HD Vietsub | LPHIM`,
    description: `Xem phim ${data.movie.name} chất lượng cao trực tuyến miễn phí tại LPhim`,
  };
}

export default async function WatchPage({ params, searchParams }: WatchPageProps) {
  const { slug } = await params;
  const { tap, server } = await searchParams;
  const data = await getMovieDetail(slug);
  const serverIndex = server ? parseInt(server, 10) || 0 : 0;

  if (!data || !data.movie || !data.episodes || data.episodes.length === 0) {
    // If SSR on Vercel is blocked by Cloudflare (NguonC 403 on datacenter IPs),
    // fallback to client-side fetch directly in the user's browser where CORS is enabled.
    return (
      <WatchFallback
        slug={slug}
        initialTapSlug={tap}
        initialServerIndex={serverIndex}
      />
    );
  }

  return (
    <WatchClient
      movie={data.movie}
      episodes={data.episodes}
      initialTapSlug={tap}
      initialServerIndex={serverIndex}
    />
  );
}
