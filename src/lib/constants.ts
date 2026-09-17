export interface FilterOption {
  name: string;
  slug: string;
  icon?: string;
  flag?: string;
}

export const FILTER_TYPES: FilterOption[] = [
  { name: 'Tất cả định dạng', slug: 'all' },
  { name: 'Phim Bộ', slug: 'phim-bo', icon: 'fa-tv' },
  { name: 'Phim Lẻ', slug: 'phim-le', icon: 'fa-film' },
  { name: 'Hoạt Hình & Anime', slug: 'hoat-hinh', icon: 'fa-dragon' },
  { name: 'TV Shows', slug: 'tv-shows', icon: 'fa-masks-theater' },
];

export const FILTER_LANGUAGES: FilterOption[] = [
  { name: 'Tất cả phiên bản', slug: 'all' },
  { name: 'Vietsub (Phụ đề)', slug: 'vietsub', icon: 'fa-closed-captioning' },
  { name: 'Thuyết Minh', slug: 'thuyet-minh', icon: 'fa-microphone' },
  { name: 'Lồng Tiếng', slug: 'long-tieng', icon: 'fa-headset' },
];

export const GENRES: FilterOption[] = [
  { name: 'Tất cả thể loại', slug: 'all' },
  { name: 'Hành Động', slug: 'hanh-dong', icon: 'fa-bolt' },
  { name: 'Tình Cảm', slug: 'tinh-cam', icon: 'fa-heart' },
  { name: 'Hài Hước', slug: 'hai-huoc', icon: 'fa-face-laugh-beam' },
  { name: 'Cổ Trang', slug: 'co-trang', icon: 'fa-fan' },
  { name: 'Tâm Lý', slug: 'tam-ly', icon: 'fa-brain' },
  { name: 'Hình Sự', slug: 'hinh-su', icon: 'fa-handcuffs' },
  { name: 'Chiến Tranh', slug: 'chien-tranh', icon: 'fa-shield' },
  { name: 'Thể Thao', slug: 'the-thao', icon: 'fa-futbol' },
  { name: 'Võ Thuật', slug: 'vo-thuat', icon: 'fa-hand-fist' },
  { name: 'Viễn Tưởng', slug: 'vien-tuong', icon: 'fa-rocket' },
  { name: 'Phiêu Lưu', slug: 'phieu-luu', icon: 'fa-compass' },
  { name: 'Khoa Học', slug: 'khoa-hoc', icon: 'fa-atom' },
  { name: 'Kinh Dị', slug: 'kinh-di', icon: 'fa-ghost' },
  { name: 'Âm Nhạc', slug: 'am-nhac', icon: 'fa-music' },
  { name: 'Thần Thoại', slug: 'than-thoai', icon: 'fa-wand-magic-sparkles' },
  { name: 'Tài Liệu', slug: 'tai-lieu', icon: 'fa-book-open' },
  { name: 'Gia Đình', slug: 'gia-dinh', icon: 'fa-house-chimney-user' },
  { name: 'Chính Kịch', slug: 'chinh-kich', icon: 'fa-masks-theater' },
  { name: 'Bí Ẩn', slug: 'bi-an', icon: 'fa-eye' },
  { name: 'Học Đường', slug: 'hoc-duong', icon: 'fa-graduation-cap' },
  { name: 'Kinh Điển', slug: 'kinh-dien', icon: 'fa-crown' },
  { name: 'Anime', slug: 'anime', icon: 'fa-dragon' },
];

export const COUNTRIES: FilterOption[] = [
  { name: 'Tất cả quốc gia', slug: 'all' },
  { name: 'Trung Quốc', slug: 'trung-quoc', flag: '🇨🇳' },
  { name: 'Hàn Quốc', slug: 'han-quoc', flag: '🇰🇷' },
  { name: 'Nhật Bản', slug: 'nhat-ban', flag: '🇯🇵' },
  { name: 'Thái Lan', slug: 'thai-lan', flag: '🇹🇭' },
  { name: 'Âu Mỹ', slug: 'au-my', flag: '🇺🇸' },
  { name: 'Đài Loan', slug: 'dai-loan', flag: '🇹🇼' },
  { name: 'Hồng Kông', slug: 'hong-kong', flag: '🇭🇰' },
  { name: 'Ấn Độ', slug: 'an-do', flag: '🇮🇳' },
  { name: 'Anh', slug: 'anh', flag: '🇬🇧' },
  { name: 'Pháp', slug: 'phap', flag: '🇫🇷' },
  { name: 'Canada', slug: 'canada', flag: '🇨🇦' },
  { name: 'Đức', slug: 'duc', flag: '🇩🇪' },
  { name: 'Tây Ban Nha', slug: 'tay-ban-nha', flag: '🇪🇸' },
  { name: 'Thổ Nhĩ Kỳ', slug: 'tho-nhi-ky', flag: '🇹🇷' },
  { name: 'Hà Lan', slug: 'ha-lan', flag: '🇳🇱' },
  { name: 'Indonesia', slug: 'indonesia', flag: '🇮🇩' },
];

export const FILTER_YEARS: FilterOption[] = [
  { name: 'Tất cả các năm', slug: 'all' },
  { name: '2026', slug: '2026' },
  { name: '2025', slug: '2025' },
  { name: '2024', slug: '2024' },
  { name: '2023', slug: '2023' },
  { name: '2022', slug: '2022' },
  { name: '2021', slug: '2021' },
  { name: '2020', slug: '2020' },
  { name: '2019', slug: '2019' },
  { name: '2018', slug: '2018' },
  { name: '2017', slug: '2017' },
  { name: '2016', slug: '2016' },
  { name: '2015', slug: '2015' },
  { name: '2010 - 2014', slug: '2010-2014' },
  { name: 'Trước 2010', slug: 'truoc-2010' },
];

export const SORT_OPTIONS: FilterOption[] = [
  { name: 'Thời gian cập nhật', slug: 'time', icon: 'fa-clock' },
  { name: 'Năm phát hành mới nhất', slug: 'year', icon: 'fa-calendar' },
  { name: 'Tên phim (A - Z)', slug: 'name', icon: 'fa-arrow-down-a-z' },
];
