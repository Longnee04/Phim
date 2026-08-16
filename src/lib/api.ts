import { MovieDetailResponse, MovieItem, MovieListResponse, MovieServer } from '@/types/movie';

export type SourceType = 'nguonc' | 'kkphim' | 'ophim' | 'vsmov';

export const SOURCES: Record<SourceType, { name: string; api: string; imgCdn: string; label: string; desc: string }> = {
  nguonc: {
    name: 'NguonC',
    label: 'NguonC (Nguồn Chính)',
    desc: 'Tốc độ cao • Vietsub / Thuyết minh',
    api: 'https://phim.nguonc.com/api',
    imgCdn: 'https://phim.nguonc.com/public/images/Post/',
  },
  kkphim: {
    name: 'KKPhim',
    label: 'KKPhim (Dự phòng 1)',
    desc: 'Chất lượng HD • Full HLS',
    api: 'https://phimapi.com',
    imgCdn: 'https://phimimg.com/',
  },
  ophim: {
    name: 'OPhim',
    label: 'OPhim (Dự phòng 2)',
    desc: 'Kho phim phong phú',
    api: 'https://ophim1.com',
    imgCdn: 'https://img.ophim.live/uploads/movies/',
  },
  vsmov: {
    name: 'VSMOV',
    label: 'VSMOV (Dự phòng 3)',
    desc: 'Phim thuyết minh / lồng tiếng',
    api: 'https://vsmov.com/api',
    imgCdn: 'https://vsmov.com/storage/images/',
  },
};

const _cache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes

export function getImageUrl(path: string | undefined, source: SourceType = 'nguonc'): string {
  if (!path) return 'https://placehold.co/300x450/141414/e50914?text=LPHIM';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const clean = path.replace(/^\//, '');
  if (clean.startsWith('public/images/') || clean.startsWith('images/Post/') || clean.startsWith('images/Film/')) {
    return `https://phim.nguonc.com/public/${clean.replace(/^public\//, '')}`;
  }
  // All relative paths from KKPhim (upload/vod/..., uploads/movies/..., etc.) use phimimg.com
  return `https://phimimg.com/${clean}`;
}

/**
 * Normalize NguonC list item to MovieItem
 * In NguonC API, item.thumb_url is the 2:3 vertical poster and item.poster_url is the 16:9 backdrop
 */
function normalizeNguonCItem(item: any): MovieItem {
  const poster = item.thumb_url || item.poster_url || '';
  const thumb = item.poster_url || item.thumb_url || '';

  return {
    _id: item.id || item.slug,
    name: item.name || '',
    slug: item.slug || '',
    origin_name: item.original_name || item.name || '',
    poster_url: getImageUrl(poster, 'nguonc'),
    thumb_url: getImageUrl(thumb, 'nguonc'),
    content: item.description || '',
    quality: item.quality || 'FHD',
    lang: item.language || 'Vietsub',
    year: parseInt(item.year, 10) || 2026,
    time: item.time || '',
    episode_current: item.current_episode || '',
    episode_total: item.total_episodes || '',
  };
}

/**
 * Normalize KKPhim list item to MovieItem
 */
function normalizeKKItem(item: any): MovieItem {
  const posterPath = item.poster_url || item.thumb_url || '';
  const thumbPath = item.thumb_url || item.poster_url || '';

  const poster = getImageUrl(posterPath, 'kkphim');
  const thumb = getImageUrl(thumbPath, 'kkphim');

  return {
    _id: item._id || item.slug,
    name: item.name || '',
    slug: item.slug || '',
    origin_name: item.origin_name || item.name || '',
    poster_url: poster,
    thumb_url: thumb,
    content: item.content || item.description || '',
    quality: item.quality || 'FHD',
    lang: item.lang || 'Vietsub',
    year: item.year || 2026,
    time: item.time || '',
    episode_current: item.episode_current || '',
    episode_total: item.episode_total || '',
    type: item.type || 'series',
    category: Array.isArray(item.category) ? item.category : [],
    country: Array.isArray(item.country) ? item.country : [],
  };
}

/**
 * Normalize NguonC movie detail object
 */
function normalizeNguonCMovieDetail(data: any): MovieDetailResponse | null {
  if (!data || !data.movie) return null;
  const m = data.movie;

  const categories: { id: string; name: string; slug: string }[] = [];
  const country: { id: string; name: string; slug: string }[] = [];
  let year = 2026;
  let type = 'series';

  if (m.category && typeof m.category === 'object') {
    for (const key of Object.keys(m.category)) {
      const grp = m.category[key];
      if (grp?.group?.name === 'Thể loại' && Array.isArray(grp.list)) {
        categories.push(...grp.list.map((c: any) => ({ id: c.id || c.slug, name: c.name, slug: c.slug })));
      } else if (grp?.group?.name === 'Quốc gia' && Array.isArray(grp.list)) {
        country.push(...grp.list.map((c: any) => ({ id: c.id || c.slug, name: c.name, slug: c.slug })));
      } else if (grp?.group?.name === 'Năm' && Array.isArray(grp.list) && grp.list[0]?.name) {
        year = parseInt(grp.list[0].name, 10) || year;
      } else if (grp?.group?.name === 'Định dạng' && Array.isArray(grp.list) && grp.list[0]?.slug) {
        type = grp.list[0].slug;
      }
    }
  }

  const episodes: MovieServer[] = [];
  if (Array.isArray(m.episodes)) {
    for (const s of m.episodes) {
      const sData = (s.items || []).map((ep: any) => ({
        name: ep.name ? (ep.name.startsWith('Tập') ? ep.name : `Tập ${ep.name}`) : 'Full',
        slug: ep.slug || `tap-${ep.name}`,
        filename: `${m.name} - ${ep.name}`,
        link_embed: ep.embed || '',
        link_m3u8: ep.m3u8 || '',
      }));
      episodes.push({
        server_name: s.server_name || 'Vietsub #1',
        server_data: sData,
      });
    }
  }

  const movie: MovieItem = {
    _id: m.id || m.slug,
    name: m.name || '',
    slug: m.slug || '',
    origin_name: m.original_name || m.name || '',
    content: m.description || '',
    type,
    poster_url: getImageUrl(m.thumb_url || m.poster_url, 'nguonc'),
    thumb_url: getImageUrl(m.poster_url || m.thumb_url, 'nguonc'),
    quality: m.quality || 'FHD',
    lang: m.language || 'Vietsub',
    time: m.time || '',
    episode_current: m.current_episode || '',
    episode_total: m.total_episodes || '',
    year,
    director: m.director ? [m.director] : [],
    actor: m.casts ? m.casts.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
    category: categories,
    country,
  };

  return {
    status: true,
    msg: 'success',
    movie,
    episodes,
  };
}

/**
 * Fetch raw JSON with caching
 */
export async function fetchRaw<T>(url: string, revalidateTime: number = 180): Promise<T | null> {
  const cached = _cache.get(url);
  if (cached && Date.now() < cached.expiry) {
    return cached.data as T;
  }

  try {
    const res = await fetch(url, {
      next: { revalidate: revalidateTime },
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    _cache.set(url, { data, expiry: Date.now() + CACHE_TTL });
    return data as T;
  } catch (err) {
    console.error(`API Fetch Exception: ${url}`, err);
    return null;
  }
}

/**
 * 1. Get Latest Movies (NguonC Primary - 20 items per app page)
 */
export async function getLatestMovies(page: number = 1): Promise<MovieListResponse | null> {
  const p1 = (page - 1) * 2 + 1;
  const p2 = (page - 1) * 2 + 2;

  // Try NguonC with 2 sub-pages in parallel
  const [d1, d2] = await Promise.all([
    fetchRaw<any>(`https://phim.nguonc.com/api/films/phim-moi-cap-nhat?page=${p1}`),
    fetchRaw<any>(`https://phim.nguonc.com/api/films/phim-moi-cap-nhat?page=${p2}`),
  ]);

  if (d1 && d1.items && d1.items.length > 0) {
    const combined = [...d1.items, ...(d2?.items || [])];
    const totalItems = d1.paginate?.total_items || 300;
    const totalPages = Math.ceil(totalItems / 20);

    return {
      status: 'success',
      msg: 'success',
      data: {
        titlePage: 'Phim Mới Cập Nhật',
        items: combined.map(normalizeNguonCItem),
        params: {
          pagination: {
            totalItems,
            totalItemsPerPage: 20,
            currentPage: page,
            pageRanges: totalPages,
          },
        },
      },
    };
  }

  // Fallback to KKPhim
  const kkData = await fetchRaw<any>(`https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=${page}`);
  if (kkData && kkData.items) {
    return {
      status: 'success',
      msg: 'success',
      data: {
        titlePage: 'Phim Mới Cập Nhật',
        items: kkData.items.map(normalizeKKItem),
        params: kkData.pagination,
      },
    };
  }
  return null;
}

/**
 * 2. Get Movies By Type (phim-bo, phim-le, hoat-hinh, tv-shows - 20 items per app page)
 */
export async function getMoviesByType(type: string, page: number = 1): Promise<MovieListResponse | null> {
  const typeMap: Record<string, string> = {
    'phim-bo': 'phim-bo',
    'phim-le': 'phim-le',
    'hoat-hinh': 'hoat-hinh',
    'tv-shows': 'tv-shows',
    'phim-vietsub': 'phim-bo',
  };

  const nguoncType = typeMap[type] || type;
  const p1 = (page - 1) * 2 + 1;
  const p2 = (page - 1) * 2 + 2;

  const [d1, d2] = await Promise.all([
    fetchRaw<any>(`https://phim.nguonc.com/api/films/danh-sach/${nguoncType}?page=${p1}`),
    fetchRaw<any>(`https://phim.nguonc.com/api/films/danh-sach/${nguoncType}?page=${p2}`),
  ]);

  if (d1 && d1.items && d1.items.length > 0) {
    const combined = [...d1.items, ...(d2?.items || [])];
    const totalItems = d1.paginate?.total_items || 200;
    const totalPages = Math.ceil(totalItems / 20);

    return {
      status: 'success',
      msg: 'success',
      data: {
        titlePage:
          type === 'phim-bo'
            ? 'Phim Bộ'
            : type === 'phim-le'
            ? 'Phim Lẻ'
            : type === 'hoat-hinh'
            ? 'Hoạt Hình & Anime'
            : type === 'tv-shows'
            ? 'TV Shows'
            : 'Danh Sách Phim',
        items: combined.map(normalizeNguonCItem),
        params: {
          pagination: {
            totalItems,
            totalItemsPerPage: 20,
            currentPage: page,
            pageRanges: totalPages,
          },
        },
      },
    };
  }

  // Fallback to KKPhim
  const kkData = await fetchRaw<any>(`https://phimapi.com/v1/api/danh-sach/${type}?page=${page}&limit=24`);
  if (kkData?.data?.items) {
    return {
      status: 'success',
      msg: 'success',
      data: {
        titlePage: kkData.data.titlePage || 'Danh Sách Phim',
        items: kkData.data.items.map(normalizeKKItem),
        params: kkData.data.params,
      },
    };
  }
  return null;
}

/**
 * 3. Get Movies By Genre (20 items per app page)
 */
export async function getMoviesByGenre(genreSlug: string, page: number = 1): Promise<MovieListResponse | null> {
  const p1 = (page - 1) * 2 + 1;
  const p2 = (page - 1) * 2 + 2;

  const [d1, d2] = await Promise.all([
    fetchRaw<any>(`https://phim.nguonc.com/api/films/the-loai/${genreSlug}?page=${p1}`),
    fetchRaw<any>(`https://phim.nguonc.com/api/films/the-loai/${genreSlug}?page=${p2}`),
  ]);

  if (d1 && d1.items && d1.items.length > 0) {
    const combined = [...d1.items, ...(d2?.items || [])];
    const totalItems = d1.paginate?.total_items || 200;
    const totalPages = Math.ceil(totalItems / 20);

    return {
      status: 'success',
      msg: 'success',
      data: {
        titlePage: `Thể Loại: ${genreSlug}`,
        items: combined.map(normalizeNguonCItem),
        params: {
          pagination: {
            totalItems,
            totalItemsPerPage: 20,
            currentPage: page,
            pageRanges: totalPages,
          },
        },
      },
    };
  }

  // Fallback to KKPhim
  const kkData = await fetchRaw<any>(`https://phimapi.com/v1/api/the-loai/${genreSlug}?page=${page}&limit=24`);
  if (kkData?.data?.items) {
    return {
      status: 'success',
      msg: 'success',
      data: {
        titlePage: kkData.data.titlePage || `Thể Loại: ${genreSlug}`,
        items: kkData.data.items.map(normalizeKKItem),
        params: kkData.data.params,
      },
    };
  }
  return null;
}

/**
 * 4. Get Movies By Country (20 items per app page)
 */
export async function getMoviesByCountry(countrySlug: string, page: number = 1): Promise<MovieListResponse | null> {
  const p1 = (page - 1) * 2 + 1;
  const p2 = (page - 1) * 2 + 2;

  const [d1, d2] = await Promise.all([
    fetchRaw<any>(`https://phim.nguonc.com/api/films/quoc-gia/${countrySlug}?page=${p1}`),
    fetchRaw<any>(`https://phim.nguonc.com/api/films/quoc-gia/${countrySlug}?page=${p2}`),
  ]);

  if (d1 && d1.items && d1.items.length > 0) {
    const combined = [...d1.items, ...(d2?.items || [])];
    const totalItems = d1.paginate?.total_items || 200;
    const totalPages = Math.ceil(totalItems / 20);

    return {
      status: 'success',
      msg: 'success',
      data: {
        titlePage: `Quốc Gia: ${countrySlug}`,
        items: combined.map(normalizeNguonCItem),
        params: {
          pagination: {
            totalItems,
            totalItemsPerPage: 20,
            currentPage: page,
            pageRanges: totalPages,
          },
        },
      },
    };
  }

  // Fallback to KKPhim
  const kkData = await fetchRaw<any>(`https://phimapi.com/v1/api/quoc-gia/${countrySlug}?page=${page}&limit=24`);
  if (kkData?.data?.items) {
    return {
      status: 'success',
      msg: 'success',
      data: {
        titlePage: kkData.data.titlePage || `Quốc Gia: ${countrySlug}`,
        items: kkData.data.items.map(normalizeKKItem),
        params: kkData.data.params,
      },
    };
  }
  return null;
}

/**
 * 5. Get Movie Detail (NguonC primary, with automatic KKPhim/OPhim fallback)
 */
export async function getMovieDetail(slug: string, source: SourceType = 'nguonc'): Promise<MovieDetailResponse | null> {
  // If explicitly requesting a secondary source
  if (source === 'kkphim') {
    const data = await fetchRaw<MovieDetailResponse>(`https://phimapi.com/phim/${slug}`, 300);
    if (data?.movie) {
      data.movie.poster_url = getImageUrl(data.movie.poster_url, 'kkphim');
      data.movie.thumb_url = getImageUrl(data.movie.thumb_url, 'kkphim');
      return data;
    }
  } else if (source === 'ophim') {
    const data = await fetchRaw<MovieDetailResponse>(`https://ophim1.com/phim/${slug}`, 300);
    if (data?.movie) {
      data.movie.poster_url = getImageUrl(data.movie.poster_url, 'ophim');
      data.movie.thumb_url = getImageUrl(data.movie.thumb_url, 'ophim');
      return data;
    }
  } else if (source === 'vsmov') {
    const data = await fetchRaw<MovieDetailResponse>(`https://vsmov.com/api/phim/${slug}`, 300);
    if (data?.movie) return data;
  }

  // Primary: NguonC
  const nguoncData = await fetchRaw<any>(`https://phim.nguonc.com/api/film/${slug}`, 300);
  if (nguoncData?.movie) {
    const normalized = normalizeNguonCMovieDetail(nguoncData);
    if (normalized) return normalized;
  }

  // Fallback 1: KKPhim
  const kkData = await fetchRaw<MovieDetailResponse>(`https://phimapi.com/phim/${slug}`, 300);
  if (kkData?.movie) {
    kkData.movie.poster_url = getImageUrl(kkData.movie.poster_url, 'kkphim');
    kkData.movie.thumb_url = getImageUrl(kkData.movie.thumb_url, 'kkphim');
    return kkData;
  }

  // Fallback 2: OPhim
  const ophimData = await fetchRaw<MovieDetailResponse>(`https://ophim1.com/phim/${slug}`, 300);
  if (ophimData?.movie) {
    ophimData.movie.poster_url = getImageUrl(ophimData.movie.poster_url, 'ophim');
    ophimData.movie.thumb_url = getImageUrl(ophimData.movie.thumb_url, 'ophim');
    return ophimData;
  }

  return null;
}

/**
 * 6. Search Movies (NguonC primary)
 */
export async function searchMovies(keyword: string, limit: number = 12): Promise<MovieListResponse | null> {
  const nguoncData = await fetchRaw<any>(`https://phim.nguonc.com/api/films/search?keyword=${encodeURIComponent(keyword)}`, 60);
  if (nguoncData && nguoncData.items && nguoncData.items.length > 0) {
    return {
      status: 'success',
      msg: 'success',
      data: {
        titlePage: `Kết quả tìm kiếm: ${keyword}`,
        items: nguoncData.items.slice(0, limit).map(normalizeNguonCItem),
        params: {
          pagination: {
            totalItems: nguoncData.items.length,
            totalItemsPerPage: limit,
            currentPage: 1,
            pageRanges: 1,
          },
        },
      },
    };
  }

  // Fallback to KKPhim
  const kkData = await fetchRaw<MovieListResponse>(`https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&limit=${limit}`, 60);
  if (kkData?.data?.items) {
    return {
      ...kkData,
      data: {
        ...kkData.data,
        items: kkData.data.items.map(normalizeKKItem),
      },
    };
  }
  return null;
}

/**
 * 7. Fetch episodes from a specific source for manual stream switching
 */
export async function fetchEpisodesFromSource(
  slug: string,
  source: SourceType
): Promise<{ episodes: MovieServer[]; ok: boolean }> {
  try {
    if (source === 'nguonc') {
      const nguoncData = await fetchRaw<any>(`https://phim.nguonc.com/api/film/${slug}`, 300);
      if (nguoncData?.movie?.episodes) {
        const episodes: MovieServer[] = [];
        for (const s of nguoncData.movie.episodes) {
          const sData = (s.items || []).map((ep: any) => ({
            name: ep.name ? (ep.name.startsWith('Tập') ? ep.name : `Tập ${ep.name}`) : 'Full',
            slug: ep.slug || `tap-${ep.name}`,
            filename: `${nguoncData.movie.name} - ${ep.name}`,
            link_embed: ep.embed || '',
            link_m3u8: ep.m3u8 || '',
          }));
          episodes.push({
            server_name: s.server_name || 'Vietsub #1',
            server_data: sData,
          });
        }
        return { episodes, ok: episodes.length > 0 };
      }
      return { episodes: [], ok: false };
    }

    const detail = await getMovieDetail(slug, source);
    if (detail && detail.episodes && detail.episodes.length > 0) {
      return { episodes: detail.episodes, ok: true };
    }
    return { episodes: [], ok: false };
  } catch {
    return { episodes: [], ok: false };
  }
}
