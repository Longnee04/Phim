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
    api: 'https://ophim.cc',
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
  // All relative paths from KKPhim/OPhim use phimimg.com
  return `https://phimimg.com/${clean}`;
}

// =============================================================================
// 18+ & ADULT CONTENT RESTRICTION ENGINE
// =============================================================================
export const ADULT_GENRE_SLUGS = new Set([
  'phim-18',
  'phim-18-cong',
  '18-cong',
  '18-plus',
  'phim-cap-3',
  'cap-3',
  'hentai',
  'ecchi',
  'erotic',
  'erotica',
  'adult',
  'khieu-dam',
  'khiêudâm',
  'tinh-duc',
  'tìnhdục',
  'sex',
  'jav',
  'phim-sex',
  'nguoi-lon',
]);

const ADULT_KEYWORDS = [
  '18+',
  '18 cộng',
  '18-cong',
  '18-plus',
  'phim 18',
  'phim 18+',
  'phim-18',
  'phim sex',
  'phim-sex',
  'phim cấp 3',
  'phim cap 3',
  'cấp 3',
  'cap 3',
  'hentai',
  'ecchi',
  'erotic',
  'erotica',
  'adult',
  'khêu dâm',
  'khiêu dâm',
  'khieu dam',
  'tình dục',
  'tinh duc',
  'khỏa thân',
  'khoa than',
  'porn',
  'jav',
  'softcore',
  'hardcore',
  'gợi dục',
  'nude',
  'uncensored',
];

export function isAdultMovie(movie: any): boolean {
  if (!movie) return false;

  // 1. Check categories
  if (Array.isArray(movie.category)) {
    for (const cat of movie.category) {
      const catSlug = (cat.slug || '').toLowerCase().trim();
      const catName = (cat.name || '').toLowerCase().trim();
      if (ADULT_GENRE_SLUGS.has(catSlug)) return true;
      if (ADULT_KEYWORDS.some((kw) => catName.includes(kw) || catSlug.includes(kw))) return true;
    }
  }

  // 2. Check Name / Origin Name / Slug
  const name = (movie.name || '').toLowerCase();
  const origin = (movie.origin_name || '').toLowerCase();
  const slug = (movie.slug || '').toLowerCase();

  const titlePatterns = [
    /\b18\+\b/i,
    /\[18\+\]/i,
    /\(18\+\)/i,
    /\bphim\s*18\+?\b/i,
    /\bphim\s*cấp\s*3\b/i,
    /\bphim\s*cap\s*3\b/i,
    /\bhentai\b/i,
    /\bphim\s*sex\b/i,
    /\bkhiêu\s*dâm\b/i,
    /\bkhêu\s*dâm\b/i,
    /\btình\s*dục\b/i,
    /\bjav\b/i,
    /\buncensored\b/i,
    /\berotic\b/i,
    /\berotica\b/i,
    /\bporn\b/i,
    /\bsoftcore\b/i,
    /\bhardcore\b/i,
  ];

  for (const pattern of titlePatterns) {
    if (pattern.test(name) || pattern.test(origin) || pattern.test(slug)) {
      return true;
    }
  }

  if (
    slug.includes('phim-18') ||
    slug.includes('18-plus') ||
    slug.includes('18-cong') ||
    slug.includes('phim-cap-3') ||
    slug.includes('hentai') ||
    slug.includes('erotic')
  ) {
    return true;
  }

  return false;
}

export function filterSafeMovies<T extends MovieItem>(movies: T[]): T[] {
  if (!Array.isArray(movies)) return [];
  return movies.filter((m) => !isAdultMovie(m));
}

/**
 * Normalize NguonC list item to MovieItem
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
 * Normalize OPhim list item to MovieItem
 */
function normalizeOPhimItem(item: any): MovieItem {
  const posterPath = item.poster_url || item.thumb_url || '';
  const thumbPath = item.thumb_url || item.poster_url || '';

  const poster = getImageUrl(posterPath, 'ophim');
  const thumb = getImageUrl(thumbPath, 'ophim');

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
function normalizeNguonCMovieDetail(raw: any): MovieDetailResponse | null {
  if (!raw || !raw.movie) return null;
  const m = raw.movie;

  const categories = (m.category || []).map((c: any) => ({
    id: c.id || c.slug,
    name: c.name,
    slug: c.slug,
  }));

  const country = m.country
    ? [{ id: m.country.id || '', name: m.country.name, slug: m.country.slug }]
    : [];

  const year = m.year || 0;
  const thumb = m.thumb_url || m.poster_url || '';
  const poster = m.poster_url || m.thumb_url || '';

  let type = 'single';
  if (m.category && Array.isArray(m.category)) {
    const isSeries = m.category.some((c: any) => c.slug === 'phim-bo' || c.name === 'Phim Bộ');
    if (isSeries) type = 'series';
    const isAnime = m.category.some((c: any) => c.slug === 'hoat-hinh' || c.name === 'Hoạt Hình');
    if (isAnime) type = 'hoathinh';
  }

  const episodes: MovieServer[] = [];
  if (m.episodes && Array.isArray(m.episodes)) {
    for (const s of m.episodes) {
      const serverData = (s.items || []).map((ep: any) => ({
        name: ep.name ? (ep.name.startsWith('Tập') ? ep.name : `Tập ${ep.name}`) : 'Full',
        slug: ep.slug || `tap-${ep.name}`,
        filename: `${m.name} - ${ep.name}`,
        link_embed: ep.embed || '',
        link_m3u8: ep.m3u8 || '',
      }));
      episodes.push({
        server_name: s.server_name || 'Vietsub #1',
        server_data: serverData,
      });
    }
  }

  const movie: any = {
    _id: String(m.id || m.slug),
    name: m.name || '',
    slug: m.slug || '',
    origin_name: m.original_name || m.name || '',
    content: m.description || '',
    type,
    status: m.current_episode?.includes('Hoàn tất') || m.current_episode?.includes('Full') ? 'completed' : 'ongoing',
    thumb_url: getImageUrl(thumb, 'nguonc'),
    poster_url: getImageUrl(poster, 'nguonc'),
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
 * Fetch raw JSON with caching & timeout protection
 */
export async function fetchRaw<T>(url: string, revalidateTime: number = 300): Promise<T | null> {
  const cached = _cache.get(url);
  if (cached && Date.now() < cached.expiry) {
    return cached.data as T;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000); // 7s timeout

    const res = await fetch(url, {
      next: { revalidate: revalidateTime },
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const data = await res.json();
    _cache.set(url, { data, expiry: Date.now() + CACHE_TTL });
    return data as T;
  } catch (err) {
    return null;
  }
}

/**
 * 1. Get Latest Movies (NguonC Primary with KKPhim/OPhim Fallback) - Filtered Safe
 */
export async function getLatestMovies(page: number = 1): Promise<MovieListResponse | null> {
  // 1. Try NguonC
  try {
    const d1 = await fetchRaw<any>(`https://phim.nguonc.com/api/films/phim-moi-cap-nhat?page=${page}`);
    if (d1 && d1.items && d1.items.length > 0) {
      const safeItems = filterSafeMovies(d1.items.map(normalizeNguonCItem));
      const totalItems = d1.paginate?.total_items || 300;
      const totalPages = Math.ceil(totalItems / 20);

      return {
        status: 'success',
        msg: 'success',
        data: {
          titlePage: 'Phim Mới Cập Nhật',
          items: safeItems,
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
  } catch (e) {}

  // 2. Fallback to KKPhim
  try {
    const kkData = await fetchRaw<any>(`https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=${page}`);
    if (kkData && kkData.items && kkData.items.length > 0) {
      return {
        status: 'success',
        msg: 'success',
        data: {
          titlePage: 'Phim Mới Cập Nhật',
          items: filterSafeMovies(kkData.items.map(normalizeKKItem)),
          params: kkData.pagination,
        },
      };
    }
  } catch (e) {}

  // 3. Fallback to OPhim
  try {
    const ophimData = await fetchRaw<any>(`https://ophim.cc/danh-sach/phim-moi-cap-nhat?page=${page}`);
    if (ophimData && ophimData.items && ophimData.items.length > 0) {
      return {
        status: 'success',
        msg: 'success',
        data: {
          titlePage: 'Phim Mới Cập Nhật',
          items: filterSafeMovies(ophimData.items.map(normalizeOPhimItem)),
          params: ophimData.pagination,
        },
      };
    }
  } catch (e) {}

  return null;
}

/**
 * 2. Get Movies By Type (phim-bo, phim-le, hoat-hinh, tv-shows) - Filtered Safe
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

  // 1. Try NguonC
  try {
    const p1 = (page - 1) * 2 + 1;
    const p2 = (page - 1) * 2 + 2;

    const [d1, d2] = await Promise.all([
      fetchRaw<any>(`https://phim.nguonc.com/api/films/danh-sach/${nguoncType}?page=${p1}`),
      fetchRaw<any>(`https://phim.nguonc.com/api/films/danh-sach/${nguoncType}?page=${p2}`),
    ]);

    if (d1 && d1.items && d1.items.length > 0) {
      const combined = [...d1.items, ...(d2?.items || [])];
      const safeItems = filterSafeMovies(combined.map(normalizeNguonCItem));
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
          items: safeItems,
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
  } catch (e) {}

  // 2. Fallback to KKPhim
  try {
    const kkData = await fetchRaw<any>(`https://phimapi.com/v1/api/danh-sach/${type}?page=${page}&limit=24`);
    if (kkData?.data?.items && kkData.data.items.length > 0) {
      return {
        status: 'success',
        msg: 'success',
        data: {
          titlePage: kkData.data.titlePage || 'Danh Sách Phim',
          items: filterSafeMovies(kkData.data.items.map(normalizeKKItem)),
          params: kkData.data.params,
        },
      };
    }
  } catch (e) {}

  // 3. Fallback to OPhim
  try {
    const ophimData = await fetchRaw<any>(`https://ophim.cc/v1/api/danh-sach/${type}?page=${page}&limit=24`);
    if (ophimData?.data?.items && ophimData.data.items.length > 0) {
      return {
        status: 'success',
        msg: 'success',
        data: {
          titlePage: ophimData.data.titlePage || 'Danh Sách Phim',
          items: filterSafeMovies(ophimData.data.items.map(normalizeOPhimItem)),
          params: ophimData.data.params,
        },
      };
    }
  } catch (e) {}

  return null;
}

/**
 * 3. Get Movies By Genre - Block Adult Genres & Filter Safe
 */
export async function getMoviesByGenre(genreSlug: string, page: number = 1): Promise<MovieListResponse | null> {
  if (ADULT_GENRE_SLUGS.has(genreSlug.toLowerCase())) {
    return null; // Block adult genre endpoints entirely
  }

  // 1. Try NguonC
  try {
    const p1 = (page - 1) * 2 + 1;
    const p2 = (page - 1) * 2 + 2;

    const [d1, d2] = await Promise.all([
      fetchRaw<any>(`https://phim.nguonc.com/api/films/the-loai/${genreSlug}?page=${p1}`),
      fetchRaw<any>(`https://phim.nguonc.com/api/films/the-loai/${genreSlug}?page=${p2}`),
    ]);

    if (d1 && d1.items && d1.items.length > 0) {
      const combined = [...d1.items, ...(d2?.items || [])];
      const safeItems = filterSafeMovies(combined.map(normalizeNguonCItem));
      const totalItems = d1.paginate?.total_items || 200;
      const totalPages = Math.ceil(totalItems / 20);

      return {
        status: 'success',
        msg: 'success',
        data: {
          titlePage: `Thể Loại: ${genreSlug}`,
          items: safeItems,
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
  } catch (e) {}

  // 2. Fallback to KKPhim
  try {
    const kkData = await fetchRaw<any>(`https://phimapi.com/v1/api/the-loai/${genreSlug}?page=${page}&limit=24`);
    if (kkData?.data?.items && kkData.data.items.length > 0) {
      return {
        status: 'success',
        msg: 'success',
        data: {
          titlePage: kkData.data.titlePage || `Thể Loại: ${genreSlug}`,
          items: filterSafeMovies(kkData.data.items.map(normalizeKKItem)),
          params: kkData.data.params,
        },
      };
    }
  } catch (e) {}

  // 3. Fallback to OPhim
  try {
    const ophimData = await fetchRaw<any>(`https://ophim.cc/v1/api/the-loai/${genreSlug}?page=${page}&limit=24`);
    if (ophimData?.data?.items && ophimData.data.items.length > 0) {
      return {
        status: 'success',
        msg: 'success',
        data: {
          titlePage: ophimData.data.titlePage || `Thể Loại: ${genreSlug}`,
          items: filterSafeMovies(ophimData.data.items.map(normalizeOPhimItem)),
          params: ophimData.data.params,
        },
      };
    }
  } catch (e) {}

  return null;
}

/**
 * 4. Get Movies By Country - Filtered Safe
 */
export async function getMoviesByCountry(countrySlug: string, page: number = 1): Promise<MovieListResponse | null> {
  // 1. Try NguonC
  try {
    const p1 = (page - 1) * 2 + 1;
    const p2 = (page - 1) * 2 + 2;

    const [d1, d2] = await Promise.all([
      fetchRaw<any>(`https://phim.nguonc.com/api/films/quoc-gia/${countrySlug}?page=${p1}`),
      fetchRaw<any>(`https://phim.nguonc.com/api/films/quoc-gia/${countrySlug}?page=${p2}`),
    ]);

    if (d1 && d1.items && d1.items.length > 0) {
      const combined = [...d1.items, ...(d2?.items || [])];
      const safeItems = filterSafeMovies(combined.map(normalizeNguonCItem));
      const totalItems = d1.paginate?.total_items || 200;
      const totalPages = Math.ceil(totalItems / 20);

      return {
        status: 'success',
        msg: 'success',
        data: {
          titlePage: `Quốc Gia: ${countrySlug}`,
          items: safeItems,
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
  } catch (e) {}

  // 2. Fallback to KKPhim
  try {
    const kkData = await fetchRaw<any>(`https://phimapi.com/v1/api/quoc-gia/${countrySlug}?page=${page}&limit=24`);
    if (kkData?.data?.items && kkData.data.items.length > 0) {
      return {
        status: 'success',
        msg: 'success',
        data: {
          titlePage: kkData.data.titlePage || `Quốc Gia: ${countrySlug}`,
          items: filterSafeMovies(kkData.data.items.map(normalizeKKItem)),
          params: kkData.data.params,
        },
      };
    }
  } catch (e) {}

  // 3. Fallback to OPhim
  try {
    const ophimData = await fetchRaw<any>(`https://ophim.cc/v1/api/quoc-gia/${countrySlug}?page=${page}&limit=24`);
    if (ophimData?.data?.items && ophimData.data.items.length > 0) {
      return {
        status: 'success',
        msg: 'success',
        data: {
          titlePage: ophimData.data.titlePage || `Quốc Gia: ${countrySlug}`,
          items: filterSafeMovies(ophimData.data.items.map(normalizeOPhimItem)),
          params: ophimData.data.params,
        },
      };
    }
  } catch (e) {}

  return null;
}

/**
 * 5. Get Movie Detail (NguonC primary, with automatic KKPhim/OPhim fallback) - Block 18+ content
 */
export async function getMovieDetail(slug: string, source: SourceType = 'nguonc'): Promise<MovieDetailResponse | null> {
  // If slug is an explicit 18+ pattern, block immediately
  if (
    slug.includes('phim-18') ||
    slug.includes('18-plus') ||
    slug.includes('18-cong') ||
    slug.includes('phim-cap-3') ||
    slug.includes('hentai') ||
    slug.includes('phim-sex')
  ) {
    return null;
  }

  // If explicitly requesting a secondary source
  if (source === 'kkphim') {
    const data = await fetchRaw<MovieDetailResponse>(`https://phimapi.com/phim/${slug}`, 300);
    if (data?.movie) {
      if (isAdultMovie(data.movie)) return null;
      data.movie.poster_url = getImageUrl(data.movie.poster_url, 'kkphim');
      data.movie.thumb_url = getImageUrl(data.movie.thumb_url, 'kkphim');
      return data;
    }
  } else if (source === 'ophim') {
    const data = await fetchRaw<MovieDetailResponse>(`https://ophim.cc/phim/${slug}`, 300);
    if (data?.movie) {
      if (isAdultMovie(data.movie)) return null;
      data.movie.poster_url = getImageUrl(data.movie.poster_url, 'ophim');
      data.movie.thumb_url = getImageUrl(data.movie.thumb_url, 'ophim');
      return data;
    }
  } else if (source === 'vsmov') {
    const data = await fetchRaw<MovieDetailResponse>(`https://vsmov.com/api/phim/${slug}`, 300);
    if (data?.movie) {
      if (isAdultMovie(data.movie)) return null;
      return data;
    }
  }

  // Primary: NguonC
  try {
    const nguoncData = await fetchRaw<any>(`https://phim.nguonc.com/api/film/${slug}`, 300);
    if (nguoncData?.movie) {
      const normalized = normalizeNguonCMovieDetail(nguoncData);
      if (normalized && normalized.movie) {
        if (isAdultMovie(normalized.movie)) return null;
        return normalized;
      }
    }
  } catch (e) {}

  // Fallback 1: KKPhim
  try {
    const kkData = await fetchRaw<MovieDetailResponse>(`https://phimapi.com/phim/${slug}`, 300);
    if (kkData?.movie) {
      if (isAdultMovie(kkData.movie)) return null;
      kkData.movie.poster_url = getImageUrl(kkData.movie.poster_url, 'kkphim');
      kkData.movie.thumb_url = getImageUrl(kkData.movie.thumb_url, 'kkphim');
      return kkData;
    }
  } catch (e) {}

  // Fallback 2: OPhim
  try {
    const ophimData = await fetchRaw<MovieDetailResponse>(`https://ophim.cc/phim/${slug}`, 300);
    if (ophimData?.movie) {
      if (isAdultMovie(ophimData.movie)) return null;
      ophimData.movie.poster_url = getImageUrl(ophimData.movie.poster_url, 'ophim');
      ophimData.movie.thumb_url = getImageUrl(ophimData.movie.thumb_url, 'ophim');
      return ophimData;
    }
  } catch (e) {}

  return null;
}

/**
 * 6. Search Movies (KKPhim / NguonC) - Filtered Safe
 */
export async function searchMovies(keyword: string, limit: number = 24, page: number = 1): Promise<MovieListResponse | null> {
  const kwLower = keyword.toLowerCase();
  // If search query is explicitly searching for porn / 18+ content, block
  if (ADULT_KEYWORDS.some((kw) => kwLower.includes(kw) && kw.length > 2)) {
    return {
      status: 'success',
      msg: 'success',
      data: {
        titlePage: `Kết quả tìm kiếm: ${keyword}`,
        items: [],
        params: {
          pagination: {
            totalItems: 0,
            totalItemsPerPage: limit,
            currentPage: 1,
            pageRanges: 1,
          },
        },
      },
    };
  }

  // Try KKPhim first for rich pagination and search
  try {
    const kkData = await fetchRaw<MovieListResponse>(
      `https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&limit=${limit}&page=${page}`,
      60
    );
    if (kkData?.data?.items && kkData.data.items.length > 0) {
      return {
        ...kkData,
        data: {
          ...kkData.data,
          items: filterSafeMovies(kkData.data.items.map(normalizeKKItem)),
        },
      };
    }
  } catch (e) {}

  // Fallback to NguonC
  try {
    const nguoncData = await fetchRaw<any>(
      `https://phim.nguonc.com/api/films/search?keyword=${encodeURIComponent(keyword)}&page=${page}`,
      60
    );
    if (nguoncData && nguoncData.items && nguoncData.items.length > 0) {
      const safeItems = filterSafeMovies(nguoncData.items.map(normalizeNguonCItem));
      return {
        status: 'success',
        msg: 'success',
        data: {
          titlePage: `Kết quả tìm kiếm: ${keyword}`,
          items: safeItems.slice(0, limit),
          params: {
            pagination: {
              totalItems: safeItems.length,
              totalItemsPerPage: limit,
              currentPage: page,
              pageRanges: Math.ceil(safeItems.length / limit) || 1,
            },
          },
        },
      };
    }
  } catch (e) {}

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
        if (isAdultMovie(nguoncData.movie)) return { episodes: [], ok: false };
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
      if (isAdultMovie(detail.movie)) return { episodes: [], ok: false };
      return { episodes: detail.episodes, ok: true };
    }
    return { episodes: [], ok: false };
  } catch {
    return { episodes: [], ok: false };
  }
}
