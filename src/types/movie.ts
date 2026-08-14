export interface MovieItem {
  _id?: string;
  name: string;
  slug: string;
  origin_name?: string;
  content?: string;
  type?: string;
  status?: string;
  thumb_url: string;
  poster_url: string;
  is_copyright?: boolean;
  sub_docquyen?: boolean;
  chieurap?: boolean;
  trailer_url?: string;
  time?: string;
  episode_current?: string;
  episode_total?: string;
  quality?: string;
  lang?: string;
  notify?: string;
  showtimes?: string;
  year?: number;
  view?: number;
  actor?: string[];
  director?: string[];
  category?: { id: string; name: string; slug: string }[];
  country?: { id: string; name: string; slug: string }[];
}

export interface MovieServerEpisode {
  name: string;
  slug: string;
  filename: string;
  link_embed: string;
  link_m3u8: string;
}

export interface MovieServer {
  server_name: string;
  server_data: MovieServerEpisode[];
}

export interface MovieDetailResponse {
  status: boolean;
  msg: string;
  movie: MovieItem;
  episodes: MovieServer[];
}

export interface MovieListResponse {
  status: string;
  msg: string;
  data: {
    seoOnPage?: any;
    breadCrumb?: any[];
    titlePage?: string;
    items: MovieItem[];
    params?: {
      pagination?: {
        totalItems: number;
        totalItemsPerPage: number;
        currentPage: number;
        pageRanges: number;
      };
    };
  };
}
