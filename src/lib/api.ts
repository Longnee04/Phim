import { MovieDetailResponse, MovieListResponse } from '@/types/movie';

export type SourceType = 'kkphim' | 'ophim' | 'vsmov';

export const SOURCES = {
  kkphim: {
    name: 'KKPhim',
    api: 'https://phimapi.com',
    imgCdn: 'https://phimimg.com/',
  },
  ophim: {
    name: 'OPhim',
    api: 'https://ophim1.com',
    imgCdn: 'https://img.ophim.live/uploads/movies/',
  },
  vsmov: {
    name: 'VSMOV',
    api: 'https://vsmov.com/api',
    imgCdn: 'https://vsmov.com/storage/images/',
  },
};

const _cache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes

export function getImageUrl(path: string | undefined, source: SourceType = 'kkphim'): string {
  if (!path) return 'https://placehold.co/300x450/141414/e50914?text=LPHIM';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cdn = SOURCES[source]?.imgCdn || SOURCES.kkphim.imgCdn;
  return `${cdn}${path.replace(/^\//, '')}`;
}

export async function fetchFromApi<T>(
  endpoint: string,
  source: SourceType = 'kkphim',
  revalidateTime: number = 180
): Promise<T | null> {
  const baseUrl = SOURCES[source]?.api || SOURCES.kkphim.api;
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

  // Check in-memory cache
  const cached = _cache.get(url);
  if (cached && Date.now() < cached.expiry) {
    return cached.data as T;
  }

  try {
    const res = await fetch(url, {
      next: { revalidate: revalidateTime },
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      // If primary source fails, try fallback
      if (source !== 'ophim' && !endpoint.startsWith('http')) {
        return fetchFromApi<T>(endpoint, 'ophim', revalidateTime);
      }
      return null;
    }

    let data = await res.json();

    // Standardize structure: ensure data.items exists
    if (data && data.items && (!data.data || !data.data.items)) {
      data = {
        ...data,
        data: {
          items: data.items,
          params: data.params || {},
          titlePage: data.titlePage || '',
          ...data.data,
        },
      };
    }

    _cache.set(url, { data, expiry: Date.now() + CACHE_TTL });
    return data;
  } catch (err) {
    console.error(`API Fetch Exception: ${url}`, err);
    // Fallback to ophim
    if (source !== 'ophim' && !endpoint.startsWith('http')) {
      return fetchFromApi<T>(endpoint, 'ophim', revalidateTime);
    }
    return null;
  }
}

export async function getLatestMovies(page: number = 1, source: SourceType = 'kkphim'): Promise<MovieListResponse | null> {
  return fetchFromApi<MovieListResponse>(`/danh-sach/phim-moi-cap-nhat?page=${page}`, source);
}

export async function getMoviesByType(type: string, page: number = 1, source: SourceType = 'kkphim'): Promise<MovieListResponse | null> {
  return fetchFromApi<MovieListResponse>(`/v1/api/danh-sach/${type}?page=${page}&limit=24`, source);
}

export async function getMoviesByGenre(genreSlug: string, page: number = 1, source: SourceType = 'kkphim'): Promise<MovieListResponse | null> {
  if (genreSlug === 'anime') {
    return fetchFromApi<MovieListResponse>(`/v1/api/danh-sach/hoat-hinh?country=nhat-ban&page=${page}&limit=24`, source);
  }
  return fetchFromApi<MovieListResponse>(`/v1/api/the-loai/${genreSlug}?page=${page}&limit=24`, source);
}

export async function getMoviesByCountry(countrySlug: string, page: number = 1, source: SourceType = 'kkphim'): Promise<MovieListResponse | null> {
  return fetchFromApi<MovieListResponse>(`/v1/api/quoc-gia/${countrySlug}?page=${page}&limit=24`, source);
}

export async function getMovieDetail(slug: string, source: SourceType = 'kkphim'): Promise<MovieDetailResponse | null> {
  return fetchFromApi<MovieDetailResponse>(`/phim/${slug}`, source, 300);
}

export async function searchMovies(keyword: string, limit: number = 12, source: SourceType = 'kkphim'): Promise<MovieListResponse | null> {
  return fetchFromApi<MovieListResponse>(`/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&limit=${limit}`, source, 60);
}
