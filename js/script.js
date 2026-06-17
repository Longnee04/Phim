/* ==========================================================
   LongPhim — Netflix Premium Clone JS (Full Featured)
   ========================================================== */

const IMG_CDN = "https://img.ophim.live/uploads/movies/";
const API = {
    new:       "https://ophim1.com/danh-sach/phim-moi-cap-nhat",
    series:    "https://ophim1.com/v1/api/danh-sach/phim-bo",
    movies:    "https://ophim1.com/v1/api/danh-sach/phim-le",
    "hoat-hinh":  "https://ophim1.com/v1/api/danh-sach/hoat-hinh",
    "tv-shows":   "https://ophim1.com/v1/api/danh-sach/tv-shows",
    vietsub:   "https://ophim1.com/v1/api/danh-sach/phim-vietsub",
    search:    "https://ophim1.com/v1/api/tim-kiem",
    detail:    "https://ophim1.com/phim/",
    genre:     "https://ophim1.com/v1/api/the-loai/",
    country:   "https://ophim1.com/v1/api/quoc-gia/",
    year:      "https://ophim1.com/v1/api/nam/",
    list:      "https://ophim1.com/v1/api/danh-sach",
};

// ══════════════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════════════
let billboardMovies = [], billboardIdx = 0, billboardTimer = null, progressIv = null;
const BILLBOARD_MS = 8000, ITEMS_PER_PAGE = 6;
const _cache = new Map();
let _modalReqId = 0, _modalAbort = null;
const sliderState = {};
let _currentModalSlug = null, _currentModalMovie = null;
let _currentEpisode = null, _currentEpisodesList = [];

let browseType = null, browseSlug = null, browsePage = 1, browseTotalPages = 1;
const BROWSE_SIZE = 24;
let browseAllItems = [];

const GENRE_NAMES = {
    'hanh-dong':'Hành Động','tinh-cam':'Tình Cảm','hai-huoc':'Hài Hước','co-trang':'Cổ Trang',
    'tam-ly':'Tâm Lý','hinh-su':'Hình Sự','chien-tranh':'Chiến Tranh','the-thao':'Thể Thao',
    'vo-thuat':'Võ Thuật','vien-tuong':'Viễn Tưởng','phieu-luu':'Phiêu Lưu','khoa-hoc':'Khoa Học',
    'kinh-di':'Kinh Dị','am-nhac':'Âm Nhạc','than-thoai':'Thần Thoại','tai-lieu':'Tài Liệu',
    'gia-dinh':'Gia Đình','chinh-kich':'Chính Kịch','bi-an':'Bí Ẩn','hoc-duong':'Học Đường',
    'kinh-dien':'Kinh Điển'
};
const COUNTRY_NAMES = {
    'trung-quoc':'Trung Quốc','han-quoc':'Hàn Quốc','nhat-ban':'Nhật Bản','thai-lan':'Thái Lan',
    'au-my':'Âu Mỹ','dai-loan':'Đài Loan','hong-kong':'Hồng Kông','an-do':'Ấn Độ',
    'anh':'Anh','phap':'Pháp','duc':'Đức','viet-nam':'Việt Nam',
    'tho-nhi-ky':'Thổ Nhĩ Kỳ','philippines':'Philippines','indonesia':'Indonesia'
};
const TYPE_NAMES = { series:'Phim Bộ', movies:'Phim Lẻ', 'hoat-hinh':'Hoạt Hình', 'tv-shows':'TV Shows', vietsub:'Phim Vietsub' };

// Helpers
const img = p => p ? (p.startsWith('http') ? p : IMG_CDN + p) : '';
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

// Check if a movie contains adult content
function isAdultMovie(m) {
    if (!m) return false;
    
    const forbiddenSubstrings = [
        '18+', '18plus', '18 plus', 'erotic', 'hentai', 'tình dục', 'tinh duc', 'cảnh nóng', 'canh nong',
        'không che', 'khong che', 'uncensored', 'censored', 'nude', 'echi', 'ecchi', 'phim người lớn', 'phim nguoi lon',
        'bạo dâm', 'bao dam', 'cuồng dâm', 'cuong dam', 'nứng', 'loạn luân', 'loan luan', 'sếch', 'phim sex',
        'kich duc', 'kích dục', 'thú dâm', 'thu dam', 'dâm đãng', 'dam dang'
    ];

    const forbiddenWholeWords = ['sex', 'jav'];

    const fieldsToSearch = [
        m.name,
        m.origin_name,
        m.slug,
        m.content
    ].filter(Boolean).map(s => s.toLowerCase());

    for (const field of fieldsToSearch) {
        for (const sub of forbiddenSubstrings) {
            if (field.includes(sub)) {
                return true;
            }
        }
        for (const word of forbiddenWholeWords) {
            const regex = new RegExp(`(^|[^a-zA-Z0-9])${word}([^a-zA-Z0-9]|$)`, 'i');
            if (regex.test(field)) {
                return true;
            }
        }
    }

    if (m.category && Array.isArray(m.category)) {
        for (const cat of m.category) {
            const catName = (cat.name || '').toLowerCase();
            const catSlug = (cat.slug || '').toLowerCase();
            for (const sub of forbiddenSubstrings) {
                if (catName.includes(sub) || catSlug.includes(sub)) {
                    return true;
                }
            }
            for (const word of forbiddenWholeWords) {
                if (catName === word || catSlug === word) {
                    return true;
                }
            }
            if (catSlug === '18' || catSlug === 'tinh-duc' || catSlug === 'phim-18' || catSlug === 'adult') {
                return true;
            }
        }
    }

    return false;
}

async function apiFetch(url, opts = {}) {
    const k = opts.signal ? null : url;
    if (k && _cache.has(k)) return _cache.get(k);
    const r = await fetch(url, opts); if (!r.ok) throw new Error(r.status);
    let d = await r.json();
    
    // Filter out adult movies from any returned lists
    if (d) {
        if (d.items && Array.isArray(d.items)) {
            d.items = d.items.filter(m => !isAdultMovie(m));
        }
        if (d.data && d.data.items && Array.isArray(d.data.items)) {
            d.data.items = d.data.items.filter(m => !isAdultMovie(m));
        }
    }

    if (k) _cache.set(k, d); 
    return d;
}
function normalizeList(raw) { return raw.items || raw.data?.items || []; }

// ══════════════════════════════════════════════════════════
//  LOCALSTORAGE MANAGER
// ══════════════════════════════════════════════════════════
const STORAGE = {
    HISTORY_KEY: 'longphim_history',
    MYLIST_KEY: 'longphim_mylist',
    RATINGS_KEY: 'longphim_ratings',
    PROGRESS_KEY: 'longphim_progress',
    MAX_HISTORY: 20,

    _get(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } },
    _set(key, arr) { localStorage.setItem(key, JSON.stringify(arr)); },

    // ---- History ----
    getHistory() { return this._get(this.HISTORY_KEY).filter(m => !isAdultMovie(m)); },
    addHistory(movie) {
        if (isAdultMovie(movie)) return;
        let list = this.getHistory();
        // Remove existing if present (move to front)
        list = list.filter(m => m.slug !== movie.slug);
        list.unshift({
            slug: movie.slug,
            name: movie.name,
            poster_url: movie.poster_url || movie.thumb_url || '',
            thumb_url: movie.thumb_url || movie.poster_url || '',
            episode: movie.episode || '',
            time: Date.now()
        });
        if (list.length > this.MAX_HISTORY) list = list.slice(0, this.MAX_HISTORY);
        this._set(this.HISTORY_KEY, list);
    },
    removeHistory(slug) {
        let list = this.getHistory().filter(m => m.slug !== slug);
        this._set(this.HISTORY_KEY, list);
    },

    // ---- My List ----
    getMyList() { return this._get(this.MYLIST_KEY).filter(m => !isAdultMovie(m)); },
    isInMyList(slug) { return this.getMyList().some(m => m.slug === slug); },
    toggleMyList(movie) {
        if (isAdultMovie(movie)) return false;
        let list = this.getMyList();
        const idx = list.findIndex(m => m.slug === movie.slug);
        if (idx !== -1) {
            list.splice(idx, 1);
            this._set(this.MYLIST_KEY, list);
            return false; // removed
        } else {
            list.unshift({
                slug: movie.slug,
                name: movie.name,
                poster_url: movie.poster_url || movie.thumb_url || '',
                thumb_url: movie.thumb_url || movie.poster_url || '',
                year: movie.year || '',
                quality: movie.quality || '',
                lang: movie.lang || ''
            });
            this._set(this.MYLIST_KEY, list);
            return true; // added
        }
    },
    removeFromMyList(slug) {
        let list = this.getMyList().filter(m => m.slug !== slug);
        this._set(this.MYLIST_KEY, list);
    },

    // ---- Ratings ----
    getRatings() { return this._get(this.RATINGS_KEY); },
    getRating(slug) {
        const list = this.getRatings();
        const found = list.find(r => r.slug === slug);
        return found ? found.rating : 0;
    },
    saveRating(slug, rating) {
        let list = this.getRatings().filter(r => r.slug !== slug);
        list.push({ slug, rating, time: Date.now() });
        this._set(this.RATINGS_KEY, list);
    },



    // ---- Watch Progress ----
    getProgress(slug) {
        try {
            const data = JSON.parse(localStorage.getItem(this.PROGRESS_KEY)) || {};
            return data[slug] || null;
        } catch { return null; }
    },
    saveProgress(slug, epName) {
        try {
            const data = JSON.parse(localStorage.getItem(this.PROGRESS_KEY)) || {};
            data[slug] = { ep: epName, time: Date.now() };
            localStorage.setItem(this.PROGRESS_KEY, JSON.stringify(data));
        } catch {}
    }
};

// ══════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initSearch();
    initModal();
    initBrowse();
    initSidebar();
    initTouchSwipe();
    initThemeToggle();
    initQualitySelector();
    if (typeof VIPPlayer !== 'undefined') VIPPlayer.init();
    loadAll();
    
    // Check for episode updates in your favorite movies in background shortly after load
    if (typeof LPSubscriptions !== 'undefined') {
        setTimeout(() => LPSubscriptions.checkNewEpisodes(), 3000);
    }
});

// ══════════════════════════════════════════════════════════
//  NAVBAR
// ══════════════════════════════════════════════════════════
function initNav() {
    window.addEventListener('scroll', () => {
        document.getElementById('nav').classList.toggle('nav--solid', scrollY > 50);
    });
}

// ══════════════════════════════════════════════════════════
//  THEME TOGGLE (Light / Dark)
// ══════════════════════════════════════════════════════════
function initThemeToggle() {
    const btn = document.getElementById('theme-toggle-btn');
    if (!btn) return;

    const applyTheme = (isLight) => {
        document.body.classList.toggle('theme-light', isLight);
        btn.innerHTML = isLight
            ? '<i class="fas fa-moon"></i>'
            : '<i class="fas fa-sun"></i>';
        btn.title = isLight
            ? 'Chuyển sang giao diện Tối'
            : 'Chuyển sang giao diện Sáng';
        localStorage.setItem('lp-theme', isLight ? 'light' : 'dark');
    };

    const saved = localStorage.getItem('lp-theme');
    if (saved === 'light') {
        applyTheme(true);
    } else if (saved === 'dark') {
        applyTheme(false);
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        applyTheme(true);
    }

    btn.addEventListener('click', () => {
        applyTheme(!document.body.classList.contains('theme-light'));
    });
}

// ══════════════════════════════════════════════════════════
//  QUALITY SELECTOR (HLS Level Switching)
// ══════════════════════════════════════════════════════════
function initQualitySelector() {
    const qualityBtn = document.getElementById('vip-btn-quality');
    const qualityMenu = document.getElementById('vip-quality-menu');
    const qualityList = document.getElementById('vip-quality-list');
    if (!qualityBtn || !qualityMenu || !qualityList) return;

    // Toggle quality menu
    qualityBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = qualityMenu.style.display !== 'none';
        qualityMenu.style.display = isOpen ? 'none' : 'block';
    });

    // Close menu when clicking elsewhere
    document.addEventListener('click', (e) => {
        if (!qualityBtn.contains(e.target) && !qualityMenu.contains(e.target)) {
            qualityMenu.style.display = 'none';
        }
    });

    // Make quality menu builder globally available for HLS manifest event
    window._buildQualityMenu = function(hls) {
        if (!hls || !hls.levels || hls.levels.length === 0) return;

        const levels = hls.levels;
        let html = '<button class="vip-quality-option active" data-level="-1">Tự động</button>';

        // Sort levels by height descending (highest quality first)
        const sorted = levels
            .map((l, i) => ({ index: i, height: l.height, bitrate: l.bitrate }))
            .filter(l => l.height > 0)
            .sort((a, b) => b.height - a.height);

        sorted.forEach(level => {
            let label = level.height + 'p';
            let badge = '';
            if (level.height >= 1080) {
                badge = '<span class="quality-badge">FHD</span>';
            } else if (level.height >= 720) {
                badge = '<span class="quality-badge">HD</span>';
            }
            html += `<button class="vip-quality-option" data-level="${level.index}">${label}${badge}</button>`;
        });

        qualityList.innerHTML = html;

        // Add click handlers
        qualityList.querySelectorAll('.vip-quality-option').forEach(opt => {
            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                const levelIdx = parseInt(opt.getAttribute('data-level'));
                
                // Update active state
                qualityList.querySelectorAll('.vip-quality-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');

                // Set HLS level
                if (hls) {
                    hls.currentLevel = levelIdx; // -1 = auto
                }

                // Update button label
                if (levelIdx === -1) {
                    qualityBtn.innerHTML = '<i class="fas fa-cog"></i>';
                } else {
                    const h = levels[levelIdx]?.height;
                    qualityBtn.innerHTML = `<i class="fas fa-cog"></i><span style="font-size:0.65rem;margin-left:2px;font-weight:700;">${h}p</span>`;
                }

                qualityMenu.style.display = 'none';
            });
        });

        // Auto-select highest quality (1080p if available)
        const best1080 = sorted.find(l => l.height >= 1080);
        if (best1080) {
            hls.currentLevel = best1080.index;
            const bestBtn = qualityList.querySelector(`[data-level="${best1080.index}"]`);
            if (bestBtn) {
                qualityList.querySelectorAll('.vip-quality-option').forEach(o => o.classList.remove('active'));
                bestBtn.classList.add('active');
                qualityBtn.innerHTML = `<i class="fas fa-cog"></i><span style="font-size:0.65rem;margin-left:2px;font-weight:700;">1080p</span>`;
            }
        }
    };
}

// ══════════════════════════════════════════════════════════
//  MOBILE SIDEBAR
// ══════════════════════════════════════════════════════════
function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const openBtn = document.getElementById('mobile-menu-btn');
    const closeBtn = document.getElementById('sidebar-close');

    const openSidebar = () => { sidebar.classList.add('open'); overlay.classList.add('open'); document.body.style.overflow = 'hidden'; };
    const closeSidebar = () => { sidebar.classList.remove('open'); overlay.classList.remove('open'); document.body.style.overflow = ''; };

    openBtn.addEventListener('click', openSidebar);
    closeBtn.addEventListener('click', closeSidebar);
    overlay.addEventListener('click', closeSidebar);

    // Sidebar nav links
    sidebar.querySelectorAll('[data-section="home"]').forEach(el => {
        el.addEventListener('click', e => { e.preventDefault(); showHome(); closeSidebar(); setActiveNav(document.getElementById('link-home')); });
    });
    sidebar.querySelectorAll('[data-browse]').forEach(el => {
        el.addEventListener('click', e => { e.preventDefault(); openBrowse('type', el.dataset.browse); closeSidebar(); clearActiveNav(); });
    });
    sidebar.querySelectorAll('[data-genre]').forEach(el => {
        el.addEventListener('click', e => { e.preventDefault(); openBrowse('genre', el.dataset.genre); closeSidebar(); clearActiveNav(); });
    });
    sidebar.querySelectorAll('[data-country]').forEach(el => {
        el.addEventListener('click', e => { e.preventDefault(); openBrowse('country', el.dataset.country); closeSidebar(); clearActiveNav(); });
    });
    sidebar.querySelectorAll('[data-year]').forEach(el => {
        el.addEventListener('click', e => { e.preventDefault(); openBrowse('year', el.dataset.year); closeSidebar(); clearActiveNav(); });
    });
    sidebar.querySelectorAll('[data-action="mylist"]').forEach(el => {
        el.addEventListener('click', e => { e.preventDefault(); openMyListPage(); closeSidebar(); });
    });
    sidebar.querySelectorAll('[data-section="live-tv"]').forEach(el => {
        el.addEventListener('click', e => { e.preventDefault(); openLiveTVPage(); closeSidebar(); setActiveNav(document.getElementById('link-livetv')); });
    });

    // Accordion toggle
    sidebar.querySelectorAll('.sidebar__accordion-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.sidebar__accordion').classList.toggle('open');
        });
    });
}

// ══════════════════════════════════════════════════════════
//  TOUCH SWIPE for sliders
// ══════════════════════════════════════════════════════════
function initTouchSwipe() {
    document.querySelectorAll('.row__slider').forEach(slider => {
        let startX = 0, startY = 0, isSwiping = false;
        slider.addEventListener('touchstart', e => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isSwiping = false;
        }, { passive: true });
        slider.addEventListener('touchmove', e => {
            const dx = Math.abs(e.touches[0].clientX - startX);
            const dy = Math.abs(e.touches[0].clientY - startY);
            if (dx > dy && dx > 10) isSwiping = true;
        }, { passive: true });
        slider.addEventListener('touchend', e => {
            if (!isSwiping) return;
            const endX = e.changedTouches[0].clientX;
            const diff = startX - endX;
            const section = slider.closest('.row');
            if (!section) return;
            const name = section.id.replace('section-', '');
            if (Math.abs(diff) > 50) {
                slideRow(name, diff > 0 ? 1 : -1);
            }
        }, { passive: true });
    });
}

// ══════════════════════════════════════════════════════════
//  SEARCH
// ══════════════════════════════════════════════════════════
function initSearch() {
    const wrap = document.getElementById('nav-search');
    const btn = document.getElementById('search-btn');
    const input = document.getElementById('search-input');
    const overlay = document.getElementById('search-overlay');
    const grid = document.getElementById('search-grid');
    const empty = document.getElementById('search-empty');
    const kw = document.getElementById('search-keyword');
    const closeB = document.getElementById('search-close');
    const suggestionsDiv = document.getElementById('search-suggestions');
    let open = false;
    let searchType = 'all';

    // Từ điển dịch thuật tên diễn viên Việt -> Anh (TMDB/OPhim index)
    const ACTOR_MAP = {
        "thành long": "Jackie Chan",
        "châu tinh trì": "Stephen Chow",
        "chân tử đan": "Donnie Yen",
        "lý liên kiệt": "Jet Li",
        "lưu đức hoa": "Andy Lau",
        "cổ thiên lạc": "Louis Koo",
        "ngô kinh": "Wu Jing",
        "châu nhuận phát": "Chow Yun Fat",
        "dương tử quỳnh": "Michelle Yeoh",
        "chương tử di": "Zhang Ziyi",
        "triệu lộ tư": "Zhao Lusi",
        "tiêu chiến": "Xiao Zhan",
        "vương nhất bác": "Wang Yibo",
        "dương mịch": "Yang Mi",
        "triệu lệ dĩnh": "Zhao Liying",
        "địch lệ nhiệt ba": "Dilraba",
        "lưu diệc phi": "Liu Yifei",
        "cúc tịnh y": "Ju Jingyi",
        "bạch lộc": "Bai Lu",
        "dương dương": "Yang Yang",
        "hứa khải": "Xu Kai",
        "trương lăng hách": "Zhang Linghe",
        "ngô lỗi": "Wu Lei",
        "ngu thư hân": "Esther Yu",
        "đặng luân": "Deng Lun",
        "nhậm gia luân": "Allen Ren",
        "thành nghị": "Cheng Yi",
        "lý hiện": "Li Xian",
        "tom cruise": "Tom Cruise",
        "robert downey jr": "Robert Downey Jr.",
        "leonardo dicaprio": "Leonardo DiCaprio",
        "brad pitt": "Brad Pitt",
        "scarlett johansson": "Scarlett Johansson",
        "chris evans": "Chris Evans",
        "chris hemsworth": "Chris Hemsworth",
        "dwayne johnson": "Dwayne Johnson",
        "johnny depp": "Johnny Depp",
        "keanu reeves": "Keanu Reeves",
        "jason statham": "Jason Statham",
        "vin diesel": "Vin Diesel",
        "will smith": "Will Smith",
        "angelina jolie": "Angelina Jolie",
        "emma watson": "Emma Watson",
        "cillian murphy": "Cillian Murphy",
        "christian bale": "Christian Bale",
        "ryan reynolds": "Ryan Reynolds",
        "hugh jackman": "Hugh Jackman",
        "tom holland": "Tom Holland",
        "zendaya": "Zendaya"
    };

    // Danh sách diễn viên nổi bật gợi ý
    const POPULAR_ACTORS = [
        { vi: "Thành Long", en: "Jackie Chan" },
        { vi: "Châu Tinh Trì", en: "Stephen Chow" },
        { vi: "Chân Tử Đan", en: "Donnie Yen" },
        { vi: "Lý Liên Kiệt", en: "Jet Li" },
        { vi: "Lưu Đức Hoa", en: "Andy Lau" },
        { vi: "Triệu Lộ Tư", en: "Zhao Lusi" },
        { vi: "Tiêu Chiến", en: "Xiao Zhan" },
        { vi: "Vương Nhất Bác", en: "Wang Yibo" },
        { vi: "Dương Mịch", en: "Yang Mi" },
        { vi: "Triệu Lệ Dĩnh", en: "Zhao Liying" },
        { vi: "Lưu Diệc Phi", en: "Liu Yifei" },
        { vi: "Jason Statham", en: "Jason Statham" },
        { vi: "Tom Cruise", en: "Tom Cruise" }
    ];

    const renderActorSuggestions = () => {
        if (searchType !== 'actor' || !suggestionsDiv) {
            if (suggestionsDiv) suggestionsDiv.hidden = true;
            return;
        }
        suggestionsDiv.hidden = false;
        suggestionsDiv.innerHTML = `
            <div class="search-overlay__suggestions-title"><i class="fas fa-fire-flame-curved" style="color:var(--red)"></i> Khám phá diễn viên nổi bật:</div>
            ${POPULAR_ACTORS.map(a => `<button class="actor-tag" data-actor-vi="${a.vi}" type="button"><i class="fas fa-user-circle"></i> ${a.vi}</button>`).join('')}
        `;
        suggestionsDiv.querySelectorAll('.actor-tag').forEach(btn => {
            btn.addEventListener('click', () => {
                input.value = btn.dataset.actorVi;
                doSearch(btn.dataset.actorVi);
                input.focus();
            });
        });
    };

    const tabs = overlay.querySelectorAll('.search-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            searchType = tab.dataset.searchType;
            if (searchType === 'actor') {
                overlay.hidden = false;
                renderActorSuggestions();
            } else {
                if (suggestionsDiv) suggestionsDiv.hidden = true;
            }
            doSearch(input.value.trim());
        });
    });

    const toggle = () => { open = !open; wrap.classList.toggle('open', open); if (open) setTimeout(() => input.focus(), 100); else { input.value = ''; closeSearch(); } };
    const closeSearch = () => {
        overlay.hidden = true;
        open = false;
        wrap.classList.remove('open');
        input.value = '';
        tabs.forEach((t, i) => t.classList.toggle('active', i === 0));
        searchType = 'all';
        if (suggestionsDiv) suggestionsDiv.hidden = true;
    };

    btn.addEventListener('click', toggle);
    closeB.addEventListener('click', closeSearch);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !overlay.hidden) closeSearch(); });

    const doSearch = debounce(async q => {
        if (q.length < 2) {
            if (searchType === 'actor') {
                overlay.hidden = false;
                kw.textContent = 'Khám phá phim theo diễn viên';
                grid.innerHTML = '';
                empty.hidden = true;
                renderActorSuggestions();
                return;
            }
            overlay.hidden = true;
            if (suggestionsDiv) suggestionsDiv.hidden = true;
            return;
        }
        overlay.hidden = false;
        
        let label = q;
        if (searchType === 'actor') {
            label = `Diễn viên "${q}"`;
            renderActorSuggestions();
        } else {
            if (suggestionsDiv) suggestionsDiv.hidden = true;
            if (searchType === 'year') label = `Năm "${q}"`;
        }
        kw.textContent = label;
        
        empty.hidden = true;
        grid.innerHTML = Array(12).fill('<div class="search-skeleton"></div>').join('');
        
        if (searchType === 'year' && isNaN(q)) {
            grid.innerHTML = '';
            empty.hidden = false;
            empty.innerHTML = `<i class="fas fa-calendar"></i><p>Vui lòng nhập năm bằng số (ví dụ: 2024)</p>`;
            return;
        }

        try {
            let url;
            if (searchType === 'year') {
                url = `${API.list}?year=${q}&limit=24`;
            } else if (searchType === 'actor') {
                const cleanQ = q.toLowerCase().trim();
                const apiQ = ACTOR_MAP[cleanQ] || q;
                url = `${API.search}?keyword=${encodeURIComponent(apiQ)}&limit=24`;
            } else {
                url = `${API.search}?keyword=${encodeURIComponent(q)}&limit=24`;
            }

            const d = await apiFetch(url);
            const items = d.data?.items || d.items || [];
            if (!items.length) {
                grid.innerHTML = '';
                empty.hidden = false;
                empty.innerHTML = `<i class="fas fa-search"></i><p>Không tìm thấy phim phù hợp.</p>`;
                return;
            }
            grid.innerHTML = '';
            items.forEach(m => {
                const c = document.createElement('div'); c.className = 'search-card';
                c.innerHTML = `<img src="${img(m.poster_url||m.thumb_url)}" alt="${m.name}" loading="lazy" onerror="this.style.opacity=.2"><div class="search-card__name">${m.name}</div>`;
                c.onclick = () => { closeSearch(); openModal(m.slug); };
                grid.appendChild(c);
            });
        } catch (err) {
            console.error('doSearch err:', err);
            grid.innerHTML = '';
            empty.hidden = false;
            empty.innerHTML = `<i class="fas fa-exclamation-circle"></i><p>Đã xảy ra lỗi khi tìm kiếm.</p>`;
        }
    }, 400);
    input.addEventListener('input', e => doSearch(e.target.value.trim()));
}

// ══════════════════════════════════════════════════════════
//  BILLBOARD
// ══════════════════════════════════════════════════════════
function initBillboard(movies) {
    billboardMovies = movies.slice(0, 10); billboardIdx = 0;
    const c = document.getElementById('billboard-dots'); c.innerHTML = '';
    billboardMovies.forEach((_, i) => {
        const d = document.createElement('button');
        d.className = 'billboard__dot' + (i === 0 ? ' active' : '');
        d.onclick = () => { billboardIdx = i; showSlide(i); startTimer(); };
        c.appendChild(d);
    });
    showSlide(0); startTimer();
    const bb = document.getElementById('billboard');
    bb.addEventListener('mouseenter', stopTimer);
    bb.addEventListener('mouseleave', () => { if (billboardMovies.length) startTimer(); });
}

function showSlide(i) {
    const m = billboardMovies[i]; if (!m) return;
    document.getElementById('billboard-bg').style.backgroundImage = `url("${img(m.poster_url||m.thumb_url)}")`;
    document.getElementById('billboard-title').textContent = m.name;
    document.getElementById('billboard-desc').textContent = '';
    apiFetch(API.detail + m.slug).then(d => {
        const t = document.createElement('div'); t.innerHTML = d.movie?.content || '';
        const el = document.getElementById('billboard-desc');
        if (el) el.textContent = t.textContent || '';
    }).catch(() => {});
    document.getElementById('billboard-play').onclick = () => openModal(m.slug, true);
    document.getElementById('billboard-info').onclick = () => openModal(m.slug);
    document.querySelectorAll('.billboard__dot').forEach((d, j) => d.classList.toggle('active', j === i));
}

function startTimer() {
    stopTimer(); let pv = 0;
    const fill = document.getElementById('billboard-timer-fill'); fill.style.width = '0%';
    progressIv = setInterval(() => { pv += 100 / (BILLBOARD_MS / 100); fill.style.width = Math.min(pv, 100) + '%'; }, 100);
    billboardTimer = setTimeout(() => { billboardIdx = (billboardIdx + 1) % billboardMovies.length; showSlide(billboardIdx); startTimer(); }, BILLBOARD_MS);
}
function stopTimer() { clearTimeout(billboardTimer); clearInterval(progressIv); }

// ══════════════════════════════════════════════════════════
//  LOAD ALL ROWS
// ══════════════════════════════════════════════════════════
async function loadAll() {
    ['track-top10','track-phim-moi','track-phim-bo','track-phim-le','track-hoat-hinh','track-tv-shows','track-vietsub'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = Array(ITEMS_PER_PAGE).fill('<div class="skeleton-card"></div>').join('');
    });

    // Render history row
    renderHistoryRow();

    try {
        const [d1,d2,d3,d4,d5,d6] = await Promise.all([
            apiFetch(API.new + '?page=1'),
            apiFetch(API.series + '?page=1&limit=24'),
            apiFetch(API.movies + '?page=1&limit=24'),
            apiFetch(API['hoat-hinh'] + '?page=1&limit=24'),
            apiFetch(API['tv-shows'] + '?page=1&limit=24').catch(() => ({items:[]})),
            apiFetch(API.vietsub + '?page=1&limit=24').catch(() => ({items:[]})),
        ]);
        const m1=normalizeList(d1), m2=normalizeList(d2), m3=normalizeList(d3),
              m4=normalizeList(d4), m5=normalizeList(d5), m6=normalizeList(d6);

        initTop10('top10', m1.slice(0, 10));
        initSlider('phim-moi', m1);
        initSlider('phim-bo', m2);
        initSlider('phim-le', m3);
        initSlider('hoat-hinh', m4);
        if (m5.length) initSlider('tv-shows', m5);
        else document.getElementById('section-tv-shows')?.remove();
        if (m6.length) initSlider('vietsub', m6);
        else document.getElementById('section-vietsub')?.remove();

        if (m1.length) initBillboard(m1);

        // Re-init touch swipe after content loads
        initTouchSwipe();

        // Gợi ý phim ngẫu nhiên sau khi tải
        if (m1.length) triggerRandomMovieSuggestion(m1);
    } catch (e) { console.error('loadAll:', e); }
}

// ══════════════════════════════════════════════════════════
//  HISTORY ROW
// ══════════════════════════════════════════════════════════
function renderHistoryRow() {
    const section = document.getElementById('section-history');
    const track = document.getElementById('track-history');
    if (!section || !track) return;

    const history = STORAGE.getHistory();
    if (!history.length) { section.style.display = 'none'; return; }

    section.style.display = '';
    track.innerHTML = '';
    history.forEach(m => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <button class="card__remove" data-remove-history="${m.slug}" type="button" title="Xóa khỏi lịch sử"><i class="fas fa-times"></i></button>
            <img class="card__img" src="${img(m.thumb_url || m.poster_url)}" alt="${m.name}" loading="lazy" onerror="this.style.opacity=.2">
            ${m.episode ? `<div class="card__history-ep">Tập ${m.episode}</div>` : ''}
        `;
        card.querySelector('.card__img').addEventListener('click', () => openModal(m.slug));
        card.querySelector('[data-remove-history]').addEventListener('click', e => {
            e.stopPropagation();
            STORAGE.removeHistory(m.slug);
            renderHistoryRow();
        });
        track.appendChild(card);
    });

    const totalPages = Math.max(1, Math.ceil(history.length / ITEMS_PER_PAGE));
    sliderState['history'] = { page: 0, totalPages, movies: history };
    renderRowDots('dots-history', totalPages, 0);
    bindArrows('history');
}

// ══════════════════════════════════════════════════════════
//  TOP 10
// ══════════════════════════════════════════════════════════
function initTop10(name, movies) {
    const track = document.getElementById('track-' + name); if (!track) return;
    const totalPages = Math.max(1, Math.ceil(movies.length / 5));
    sliderState[name] = { page: 0, totalPages, movies };
    track.innerHTML = '';
    movies.forEach((m, i) => {
        const card = document.createElement('div'); card.className = 'top10-card';
        card.innerHTML = `<span class="top10-card__number">${i+1}</span><img class="top10-card__poster" src="${img(m.poster_url||m.thumb_url)}" alt="${m.name}" loading="lazy" onerror="this.style.opacity=.2">`;
        card.addEventListener('click', () => openModal(m.slug));
        track.appendChild(card);
    });
    renderRowDots('dots-' + name, totalPages, 0);
    bindArrows(name);
}

// ══════════════════════════════════════════════════════════
//  SLIDER
// ══════════════════════════════════════════════════════════
function initSlider(name, movies) {
    const track = document.getElementById('track-' + name); if (!track) return;
    const totalPages = Math.max(1, Math.ceil(movies.length / ITEMS_PER_PAGE));
    sliderState[name] = { page: 0, totalPages, movies };
    track.innerHTML = '';
    movies.forEach(m => track.appendChild(createCard(m)));
    renderRowDots('dots-' + name, totalPages, 0);
    bindArrows(name);
}

function bindArrows(name) {
    const section = document.getElementById('section-' + name);
    if (!section) return;
    const l = section.querySelector('.row__arrow--left');
    const r = section.querySelector('.row__arrow--right');
    if (l) l.onclick = () => slideRow(name, -1);
    if (r) r.onclick = () => slideRow(name, 1);
}

function slideRow(name, dir) {
    const s = sliderState[name]; if (!s) return;
    const p = s.page + dir;
    if (p < 0 || p >= s.totalPages) return;
    s.page = p;
    document.getElementById('track-' + name).style.transform = `translateX(${-(p * 100)}%)`;
    renderRowDots('dots-' + name, s.totalPages, p);
}

function renderRowDots(id, total, active) {
    const c = document.getElementById(id); if (!c) return; c.innerHTML = '';
    for (let i = 0; i < total; i++) { const d = document.createElement('span'); d.className = 'row__dot' + (i === active ? ' active' : ''); c.appendChild(d); }
}

function createCard(movie) {
    const card = document.createElement('div'); card.className = 'card';
    const poster = img(movie.thumb_url || movie.poster_url);
    const quality = movie.quality || '', lang = movie.lang || '';
    const genres = (movie.category || []).map(g => g.name).filter(Boolean);
    const inList = STORAGE.isInMyList(movie.slug);
    card.innerHTML = `
        <img class="card__img" src="${poster}" alt="${movie.name}" loading="lazy" onerror="this.style.opacity=.2">
        <div class="card__info">
            <div class="card__info-row">
                <div class="card__info-left">
                    <button class="card__mini-btn card__mini-btn--play" data-slug="${movie.slug}" data-play="1" type="button"><i class="fas fa-play"></i></button>
                </div>
                <div class="card__info-right">
                    <button class="card__mini-btn card__mylist-btn${inList ? ' in-list' : ''}" data-mylist-slug="${movie.slug}" type="button" title="${inList ? 'Xóa khỏi danh sách' : 'Thêm vào danh sách'}"><i class="fas fa-${inList ? 'check' : 'plus'}"></i></button>
                    <button class="card__mini-btn" data-slug="${movie.slug}" type="button"><i class="fas fa-chevron-down"></i></button>
                </div>
            </div>
            <div class="card__info-meta">
                <span class="card__match">${85+Math.floor(Math.random()*14)}%</span>
                ${quality ? `<span class="card__tag">${quality}</span>` : ''}
                ${lang ? `<span class="card__tag">${lang}</span>` : ''}
            </div>
            <div class="card__info-name">${movie.name}</div>
            ${genres.length ? `<div class="card__info-genres">${genres.slice(0,3).map(g=>`<span>${g}</span>`).join('')}</div>` : ''}
        </div>`;
    card.querySelector('.card__img').addEventListener('click', () => openModal(movie.slug));
    card.querySelectorAll('[data-slug]').forEach(b => {
        b.addEventListener('click', e => { e.stopPropagation(); openModal(b.dataset.slug, b.dataset.play === '1'); });
    });
    // My List toggle on card
    const myListBtn = card.querySelector('[data-mylist-slug]');
    if (myListBtn) {
        myListBtn.addEventListener('click', e => {
            e.stopPropagation();
            const added = STORAGE.toggleMyList(movie);
            myListBtn.classList.toggle('in-list', added);
            myListBtn.innerHTML = `<i class="fas fa-${added ? 'check' : 'plus'}"></i>`;
            myListBtn.title = added ? 'Xóa khỏi danh sách' : 'Thêm vào danh sách';
        });
    }
    return card;
}

// ══════════════════════════════════════════════════════════
//  BROWSE (Category / Genre / Country / Year)
// ══════════════════════════════════════════════════════════
function initBrowse() {
    document.querySelectorAll('#nav-menu [data-section="home"]').forEach(el => {
        el.addEventListener('click', e => { e.preventDefault(); showHome(); setActiveNav(el); });
    });
    document.querySelectorAll('#nav-menu [data-browse]').forEach(el => {
        el.addEventListener('click', e => {
            e.preventDefault();
            openBrowse('type', el.dataset.browse);
            setActiveNav(el);
        });
    });
    document.querySelectorAll('#nav-menu [data-genre]').forEach(el => {
        el.addEventListener('click', e => { e.preventDefault(); openBrowse('genre', el.dataset.genre); clearActiveNav(); });
    });
    document.querySelectorAll('#nav-menu [data-country]').forEach(el => {
        el.addEventListener('click', e => { e.preventDefault(); openBrowse('country', el.dataset.country); clearActiveNav(); });
    });
    document.querySelectorAll('#nav-menu [data-year]').forEach(el => {
        el.addEventListener('click', e => { e.preventDefault(); openBrowse('year', el.dataset.year); clearActiveNav(); });
    });

    // My List link in nav
    document.querySelectorAll('#nav-menu [data-action="mylist"]').forEach(el => {
        el.addEventListener('click', e => { e.preventDefault(); openMyListPage(); setActiveNav(el); });
    });
    // Live TV link in nav
    document.querySelectorAll('#nav-menu [data-section="live-tv"]').forEach(el => {
        el.addEventListener('click', e => { e.preventDefault(); openLiveTVPage(); setActiveNav(el); });
    });

    // Logo click → home
    document.getElementById('nav-logo').addEventListener('click', () => {
        showHome();
        document.querySelectorAll('.nav__link').forEach(l => l.classList.remove('active'));
        document.getElementById('link-home')?.classList.add('active');
    });

    // Pager
    // Pager
    const firstBtn = document.getElementById('browse-first');
    if (firstBtn) {
        firstBtn.addEventListener('click', () => {
            if (browsePage > 1) { browsePage = 1; loadBrowsePage(); }
        });
    }
    document.getElementById('browse-prev').addEventListener('click', () => {
        if (browsePage > 1) { browsePage--; loadBrowsePage(); }
    });
    document.getElementById('browse-next').addEventListener('click', () => {
        if (browsePage < browseTotalPages) { browsePage++; loadBrowsePage(); }
    });
    const lastBtn = document.getElementById('browse-last');
    if (lastBtn) {
        lastBtn.addEventListener('click', () => {
            if (browsePage < browseTotalPages) { browsePage = browseTotalPages; loadBrowsePage(); }
        });
    }

    // Sort
    document.getElementById('browse-sort').addEventListener('change', () => sortBrowse());
}

function setActiveNav(el) {
    document.querySelectorAll('.nav__link').forEach(l => l.classList.remove('active'));
    el.classList.add('active');
}
function clearActiveNav() {
    document.querySelectorAll('.nav__link').forEach(l => l.classList.remove('active'));
}

function showHome() {
    document.getElementById('home-view').style.display = '';
    document.getElementById('browse').hidden = true;
    const tvView = document.getElementById('live-tv-view');
    if (tvView) tvView.hidden = true;
    browseType = null;
    renderHistoryRow();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openBrowse(type, slug) {
    browseType = type; browseSlug = slug; browsePage = 1;
    document.getElementById('home-view').style.display = 'none';
    document.getElementById('browse').hidden = false;
    const tvView = document.getElementById('live-tv-view');
    if (tvView) tvView.hidden = true;
    document.getElementById('browse-sort').value = 'default';

    let title = slug;
    if (type === 'type') title = TYPE_NAMES[slug] || slug;
    else if (type === 'genre') title = 'Thể loại: ' + (GENRE_NAMES[slug] || slug);
    else if (type === 'country') title = 'Quốc gia: ' + (COUNTRY_NAMES[slug] || slug);
    else if (type === 'year') title = 'Phim năm ' + slug;
    document.getElementById('browse-title').textContent = title;

    // Show sort & pager
    document.querySelector('.browse__toolbar').style.display = '';
    document.getElementById('browse-pager').style.display = '';

    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadBrowsePage();
}

// ══════════════════════════════════════════════════════════
//  MY LIST PAGE
// ══════════════════════════════════════════════════════════
function openMyListPage() {
    document.getElementById('home-view').style.display = 'none';
    document.getElementById('browse').hidden = false;
    const tvView = document.getElementById('live-tv-view');
    if (tvView) tvView.hidden = true;
    document.getElementById('browse-title').textContent = 'Danh sách của tôi';
    document.getElementById('browse-hero-bg').style.backgroundImage = '';

    // Hide sort & pager for local list
    document.querySelector('.browse__toolbar').style.display = 'none';
    document.getElementById('browse-pager').style.display = 'none';

    browseType = 'mylist';
    const list = STORAGE.getMyList();
    const grid = document.getElementById('browse-grid');
    grid.innerHTML = '';
    document.getElementById('browse-count').textContent = `${list.length} phim`;

    if (!list.length) {
        grid.innerHTML = `<div class="browse__empty" style="grid-column:1/-1;">
            <i class="fas fa-heart"></i>
            <p>Danh sách của bạn đang trống</p>
            <span>Hãy bấm nút + trên các phim bạn yêu thích để thêm vào đây!</span>
        </div>`;
        return;
    }

    // Use first item's poster as hero bg
    const heroEl = document.getElementById('browse-hero-bg');
    if (list.length) heroEl.style.backgroundImage = `url("${img(list[0].poster_url||list[0].thumb_url)}")`;

    list.forEach(m => {
        const card = document.createElement('div'); card.className = 'browse__card';
        card.innerHTML = `
            <img src="${img(m.poster_url||m.thumb_url)}" alt="${m.name}" loading="lazy" onerror="this.style.opacity=.2">
            <button class="browse__card-play" type="button"><i class="fas fa-play"></i></button>
            <button class="browse__card-remove" data-remove-mylist="${m.slug}" type="button" title="Xóa khỏi danh sách"><i class="fas fa-times"></i></button>
            <div class="browse__card-info">
                <div class="browse__card-name">${m.name}</div>
                <div class="browse__card-meta">
                    ${m.year ? `<span>${m.year}</span>` : ''}
                    ${m.quality ? `<span class="browse__card-badge">${m.quality}</span>` : ''}
                    ${m.lang ? `<span class="browse__card-badge">${m.lang}</span>` : ''}
                </div>
            </div>`;
        card.querySelector('.browse__card-play').addEventListener('click', e => { e.stopPropagation(); openModal(m.slug, true); });
        card.querySelector('[data-remove-mylist]').addEventListener('click', e => {
            e.stopPropagation();
            STORAGE.removeFromMyList(m.slug);
            card.style.transform = 'scale(0.8)';
            card.style.opacity = '0';
            setTimeout(() => openMyListPage(), 300);
        });
        card.addEventListener('click', () => openModal(m.slug));
        grid.appendChild(card);
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getBrowseUrl(page) {
    if (browseType === 'type') return `${API[browseSlug]}?page=${page}&limit=${BROWSE_SIZE}`;
    if (browseType === 'genre') return `${API.genre}${browseSlug}?page=${page}&limit=${BROWSE_SIZE}`;
    if (browseType === 'country') return `${API.country}${browseSlug}?page=${page}&limit=${BROWSE_SIZE}`;
    if (browseType === 'year') return `${API.list}?year=${browseSlug}&page=${page}&limit=${BROWSE_SIZE}`;
    return '';
}

async function loadBrowsePage() {
    const grid = document.getElementById('browse-grid');
    const firstBtn = document.getElementById('browse-first');
    const prevBtn = document.getElementById('browse-prev');
    const nextBtn = document.getElementById('browse-next');
    const lastBtn = document.getElementById('browse-last');
    const indicator = document.getElementById('browse-page-indicator');

    grid.innerHTML = Array(BROWSE_SIZE).fill('<div class="search-skeleton"></div>').join('');
    if (firstBtn) firstBtn.disabled = true;
    prevBtn.disabled = true; nextBtn.disabled = true;
    if (lastBtn) lastBtn.disabled = true;

    try {
        const url = getBrowseUrl(browsePage);
        const raw = await apiFetch(url);
        const items = raw.data?.items || raw.items || [];
        const totalItems = raw.data?.params?.pagination?.totalItems || raw.pagination?.totalItems || items.length;
        const totalPages = raw.data?.params?.pagination?.totalPages || raw.pagination?.totalPages || Math.ceil(totalItems / BROWSE_SIZE) || 1;

        browseTotalPages = totalPages;
        browseAllItems = items;

        const heroEl = document.getElementById('browse-hero-bg');
        if (items.length) heroEl.style.backgroundImage = `url("${img(items[0].poster_url||items[0].thumb_url)}")`;
        document.getElementById('browse-count').textContent = `${totalItems.toLocaleString()} phim`;
        indicator.textContent = `Trang ${browsePage} / ${totalPages}`;

        renderBrowseGrid(items);
        renderBrowsePager(browsePage, totalPages);
        if (firstBtn) firstBtn.disabled = browsePage <= 1;
        prevBtn.disabled = browsePage <= 1;
        nextBtn.disabled = browsePage >= totalPages;
        if (lastBtn) lastBtn.disabled = browsePage >= totalPages;
    } catch (err) {
        console.error('loadBrowsePage:', err);
        grid.innerHTML = '<p style="color:var(--t3);text-align:center;padding:40px;">Lỗi khi tải.</p>';
    }
}

function renderBrowseGrid(items) {
    const grid = document.getElementById('browse-grid'); grid.innerHTML = '';
    if (!items.length) { grid.innerHTML = '<p style="color:var(--t3);text-align:center;padding:40px;">Không có phim.</p>'; return; }
    items.forEach(m => {
        const card = document.createElement('div'); card.className = 'browse__card';
        card.innerHTML = `
            <img src="${img(m.poster_url||m.thumb_url)}" alt="${m.name}" loading="lazy" onerror="this.style.opacity=.2">
            <button class="browse__card-play" type="button"><i class="fas fa-play"></i></button>
            <div class="browse__card-info">
                <div class="browse__card-name">${m.name}</div>
                <div class="browse__card-meta">
                    ${m.year ? `<span>${m.year}</span>` : ''}
                    ${m.quality ? `<span class="browse__card-badge">${m.quality}</span>` : ''}
                    ${m.lang ? `<span class="browse__card-badge">${m.lang}</span>` : ''}
                </div>
            </div>`;
        card.addEventListener('click', () => openModal(m.slug));
        grid.appendChild(card);
    });
}

function renderBrowsePager(current, total) {
    const c = document.getElementById('browse-pager-numbers'); c.innerHTML = '';
    if (total <= 1) return;
    const maxVis = 7;
    let pages = [];
    if (total <= maxVis) pages = Array.from({length:total},(_,i)=>i+1);
    else if (current <= 4) pages = [1,2,3,4,5,'...',total];
    else if (current >= total-3) pages = [1,'...',total-4,total-3,total-2,total-1,total];
    else pages = [1,'...',current-1,current,current+1,'...',total];

    pages.forEach(p => {
        if (p === '...') { const s = document.createElement('span'); s.className = 'browse__page-dots'; s.textContent = '···'; c.appendChild(s); }
        else {
            const b = document.createElement('button'); b.className = 'browse__page-num' + (p === current ? ' active' : '');
            b.textContent = p;
            b.onclick = () => { if (p !== browsePage) { browsePage = p; loadBrowsePage(); window.scrollTo({top:0,behavior:'smooth'}); } };
            c.appendChild(b);
        }
    });
}

function sortBrowse() {
    const val = document.getElementById('browse-sort').value;
    let sorted = [...browseAllItems];
    if (val === 'name') sorted.sort((a,b) => (a.name||'').localeCompare(b.name||''));
    else if (val === 'year') sorted.sort((a,b) => (b.year||0) - (a.year||0));
    renderBrowseGrid(sorted);
}

// ══════════════════════════════════════════════════════════
//  TOAST NOTIFICATIONS
// ══════════════════════════════════════════════════════════
function showToast(title, desc, icon = 'fa-info-circle', onClickAction = null) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    if (onClickAction) {
        toast.style.cursor = 'pointer';
    }

    toast.innerHTML = `
        <div class="toast__icon"><i class="fas ${icon}"></i></div>
        <div class="toast__content">
            <div class="toast__title">${title}</div>
            <div class="toast__desc">${desc}</div>
        </div>
        <button class="toast__close" type="button" aria-label="Đóng"><i class="fas fa-times"></i></button>
    `;

    if (onClickAction) {
        toast.addEventListener('click', (e) => {
            if (e.target.closest('.toast__close')) return;
            onClickAction();
            hide();
        });
    }

    const hide = () => {
        toast.classList.add('toast-hide');
        setTimeout(() => toast.remove(), 300);
    };

    toast.querySelector('.toast__close').addEventListener('click', (e) => {
        e.stopPropagation();
        hide();
    });

    container.appendChild(toast);

    // Tự động đóng sau 6 giây
    setTimeout(() => {
        if (toast.parentNode) hide();
    }, 6000);
}

// Gợi ý phim mới ngẫu nhiên khi vào trang
function triggerRandomMovieSuggestion(movies) {
    if (!movies || !movies.length) return;
    setTimeout(() => {
        const rand = movies[Math.floor(Math.random() * movies.length)];
        showToast(
            'Gợi ý phim hot hôm nay 🎬',
            `Có phim mới cập nhật: <b>${rand.name}</b>. Xem ngay!`,
            'fa-ticket',
            () => openModal(rand.slug)
        );
    }, 3500); // 3.5 giây sau khi trang tải xong
}

// ══════════════════════════════════════════════════════════
//  MODAL
// ══════════════════════════════════════════════════════════
function initModal() {
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-backdrop').addEventListener('click', closeModal);

    // Tự động khôi phục tiêu điểm (focus) cho trang chính khi chuột di chuyển ra ngoài trình phát nhúng (iframe)
    // Giúp các phím tắt N và F luôn hoạt động mượt mà mà không bị kẹt tiêu điểm bên trong iframe
    const modalEl = document.getElementById('modal');
    if (modalEl) {
        const recoverFocus = () => {
            if (document.activeElement && document.activeElement.tagName === 'IFRAME') {
                window.focus();
                modalEl.focus();
            }
        };
        modalEl.addEventListener('mouseenter', recoverFocus);
        modalEl.addEventListener('mousemove', recoverFocus);
    }

    document.addEventListener('keydown', e => {
        const modal = document.getElementById('modal');
        if (!modal || modal.getAttribute('aria-hidden') === 'true') return;

        if (e.key === 'Escape') {
            closeModal();
            return;
        }

        // Tránh kích hoạt phím tắt khi người dùng đang gõ tìm kiếm hoặc trong các input khác
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
            return;
        }

        // VIP Player keyboard & Smart TV controls
        if (typeof VIPPlayer !== 'undefined' && VIPPlayer.isActive) {
            if (VIPPlayer.handleKeyDown(e)) {
                return;
            }
        }

        const key = e.key.toLowerCase();
        if (key === 'f') {
            const iframe = document.querySelector('#modal-hero iframe');
            if (iframe) {
                e.preventDefault();
                if (!document.fullscreenElement) {
                    if (iframe.requestFullscreen) {
                        iframe.requestFullscreen();
                    } else if (iframe.webkitRequestFullscreen) {
                        iframe.webkitRequestFullscreen();
                    } else if (iframe.mozRequestFullScreen) {
                        iframe.mozRequestFullScreen();
                    } else if (iframe.msRequestFullscreen) {
                        iframe.msRequestFullscreen();
                    }
                } else {
                    if (document.exitFullscreen) {
                        document.exitFullscreen();
                    } else if (document.webkitExitFullscreen) {
                        document.webkitExitFullscreen();
                    } else if (document.mozCancelFullScreen) {
                        document.mozCancelFullScreen();
                    } else if (document.msExitFullscreen) {
                        document.msExitFullscreen();
                    }
                }
            }
        } else if (key === 'n') {
            if (modal.classList.contains('is-playing')) {
                const nextBtn = document.getElementById('modal-next-bottom-btn');
                if (nextBtn && nextBtn.style.display !== 'none') {
                    e.preventDefault();
                    nextBtn.click();
                }
            }
        }
    });

    // Nút Tắt đèn (Theater Light Mode)
    const lightBtn = document.getElementById('modal-light-btn');
    if (lightBtn) {
        lightBtn.addEventListener('click', () => {
            const isOff = document.body.classList.toggle('theater-light-off');
            lightBtn.title = isOff ? 'Bật đèn' : 'Tắt đèn (Theater Mode)';
            lightBtn.innerHTML = `<i class="fas ${isOff ? 'fa-lightbulb' : 'fa-lightbulb'}"></i>`;
            
            showToast(
                isOff ? 'Chế độ rạp chiếu 🌙' : 'Chế độ thường ☀️',
                isOff ? 'Đã tắt đèn xung quanh để bạn tập trung xem phim!' : 'Đã bật lại đèn phòng.',
                isOff ? 'fa-moon' : 'fa-sun'
            );
        });
    }

    // Nút Rộng hơn (Theater Layout)
    const theaterBtn = document.getElementById('modal-theater-btn');
    if (theaterBtn) {
        theaterBtn.addEventListener('click', () => {
            const dialog = document.querySelector('.modal__dialog');
            if (dialog) {
                const isWide = dialog.classList.toggle('theater-layout');
                theaterBtn.title = isWide ? 'Thu nhỏ lại' : 'Chế độ rạp chiếu (Rộng hơn)';
                theaterBtn.innerHTML = `<i class="fas ${isWide ? 'fa-compress' : 'fa-expand'}"></i>`;
                
                showToast(
                    isWide ? 'Khung nhìn cực đại 🖥️' : 'Khung nhìn mặc định 📺',
                    isWide ? 'Đã mở rộng trình phát phim sang chuẩn rạp chiếu phim 21:9!' : 'Đã đưa trình phát về kích thước tiêu chuẩn.',
                    isWide ? 'fa-maximize' : 'fa-minimize'
                );
            }
        });
    }



    // Sự kiện tương tác đánh giá sao (Star Rating)
    const starsContainer = document.getElementById('modal-stars');
    if (starsContainer) {
        starsContainer.querySelectorAll('i').forEach(star => {
            // Hover hiệu ứng
            star.addEventListener('mouseenter', () => {
                const val = parseInt(star.dataset.value);
                highlightStars(val);
            });
            // Mouse leave thì hồi phục về giá trị đã lưu
            star.addEventListener('mouseleave', () => {
                const savedVal = STORAGE.getRating(_currentModalSlug);
                highlightStars(savedVal);
            });
            // Click chọn sao
            star.addEventListener('click', () => {
                const val = parseInt(star.dataset.value);
                STORAGE.saveRating(_currentModalSlug, val);
                highlightStars(val);
                
                showToast(
                    'Đánh giá thành công! ⭐',
                    `Cảm ơn bạn đã chấm <b>${val} sao</b> cho bộ phim này!`,
                    'fa-star'
                );
            });
        });
    }

    // Nút Tập tiếp theo
    const nextBtn = document.getElementById('modal-next-bottom-btn');
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const nextEp = getNextEpisode();
            if (nextEp && _currentModalMovie) {
                const epButtons = document.querySelectorAll('#modal-episodes-list .ep-btn');
                const currentIndex = _currentEpisodesList.findIndex(ep => ep.slug === _currentEpisode.slug || ep.name === _currentEpisode.name);
                const nextIndex = currentIndex + 1;
                
                if (epButtons && epButtons[nextIndex]) {
                    epButtons.forEach(x => x.classList.remove('active'));
                    epButtons[nextIndex].classList.add('active');
                    epButtons[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
                
                playEpisode(nextEp, _currentModalMovie);
                
                showToast(
                    'Đang chuyển tập 🚀',
                    `Đang tải <b>Tập ${nextEp.name}</b>...`,
                    'fa-forward'
                );
            }
        });
    }

    // Tự động chuyển tập cho Iframe
    initIframeAutoNext();
}

function initIframeAutoNext() {
    window.addEventListener('message', event => {
        let data = event.data;
        if (!data) return;

        // Thử giải mã nếu là chuỗi JSON
        if (typeof data === 'string') {
            try {
                data = JSON.parse(data);
            } catch (e) {
                // Nếu là chuỗi trơn, kiểm tra các trạng thái kết thúc phổ biến
                const str = data.toLowerCase();
                if (str === 'ended' || str === 'complete' || str === 'finish' || str === 'player_ended') {
                    triggerIframeNextEpisode();
                    return;
                }
            }
        }

        // Kiểm tra đối tượng dữ liệu
        if (data && typeof data === 'object') {
            const eventName = (data.event || data.type || data.action || data.method || data.msg || '') + '';
            const lowerEvent = eventName.toLowerCase();
            
            if (
                lowerEvent === 'ended' || 
                lowerEvent === 'complete' || 
                lowerEvent === 'finish' || 
                lowerEvent === 'oncomplete' || 
                lowerEvent === 'onended' || 
                lowerEvent === 'player_ended' ||
                data.status === 'ended' ||
                data.status === 'complete' ||
                (data.action === 'playerState' && data.value === 'ended')
            ) {
                triggerIframeNextEpisode();
            }
        }
    });
}

function triggerIframeNextEpisode() {
    const modal = document.getElementById('modal');
    if (!modal || modal.getAttribute('aria-hidden') === 'true') return;

    // Tránh tự động chuyển tập trùng lặp nếu trình phát VIP đang hoạt động
    if (typeof VIPPlayer !== 'undefined' && VIPPlayer.isActive) return;

    const nextEp = getNextEpisode();
    const nextBottomBtn = document.getElementById('modal-next-bottom-btn');
    if (nextEp && nextBottomBtn && nextBottomBtn.style.display !== 'none') {
        showToast(
            'Tự động chuyển tập ⏭️',
            `Đang tự động chuyển sang <b>Tập ${nextEp.name}</b> sau giây lát...`,
            'fa-forward'
        );
        setTimeout(() => {
            nextBottomBtn.click();
        }, 1500);
    }
}

// Tô màu sao phụ trợ
function highlightStars(ratingValue) {
    const starsContainer = document.getElementById('modal-stars');
    if (!starsContainer) return;
    starsContainer.querySelectorAll('i').forEach(star => {
        const val = parseInt(star.dataset.value);
        if (val <= ratingValue) {
            star.className = 'fas fa-star';
        } else {
            star.className = 'far fa-star';
        }
    });
}

function getNextEpisode() {
    if (!_currentEpisode || !_currentEpisodesList || !_currentEpisodesList.length) return null;
    const currentIndex = _currentEpisodesList.findIndex(ep => ep.slug === _currentEpisode.slug || ep.name === _currentEpisode.name);
    if (currentIndex !== -1 && currentIndex + 1 < _currentEpisodesList.length) {
        return _currentEpisodesList[currentIndex + 1];
    }
    return null;
}

function updateNextEpisodeButton() {
    const playerBar = document.getElementById('modal-player-bar');
    const nextBtn = document.getElementById('modal-next-bottom-btn');
    const epText = document.getElementById('player-bar-ep-text');
    if (!playerBar) return;
    
    const isPlaying = document.getElementById('modal').classList.contains('is-playing');
    const hasMultipleEps = _currentEpisodesList && _currentEpisodesList.length > 1;
    
    if (isPlaying && hasMultipleEps) {
        playerBar.style.display = 'flex';
        // Update ep info text
        if (epText && _currentEpisode) {
            epText.textContent = `Đang phát: Tập ${_currentEpisode.name}`;
        }
        // Show/hide next button
        const nextEp = getNextEpisode();
        if (nextBtn) {
            if (nextEp) {
                nextBtn.style.display = 'inline-flex';
                nextBtn.title = `Chuyển sang Tập ${nextEp.name}`;
            } else {
                nextBtn.style.display = 'none';
            }
        }
    } else {
        playerBar.style.display = 'none';
    }
}

async function openModal(slug, autoPlay = false) {
    const modal = document.getElementById('modal');
    const heroImg = document.getElementById('modal-hero-img');
    const hero = document.getElementById('modal-hero');

    _modalReqId++; const reqId = _modalReqId;
    if (_modalAbort) try { _modalAbort.abort(); } catch {}
    _modalAbort = new AbortController();

    _currentModalSlug = slug;
    _currentModalMovie = null;
    _currentEpisode = null;
    _currentEpisodesList = [];
    modal.classList.remove('is-playing');

    // Reset VIP player state
    if (typeof VIPPlayer !== 'undefined' && VIPPlayer.isActive) {
        VIPPlayer.deactivate();
    }
    const serverBar = document.getElementById('vip-server-bar');
    if (serverBar) serverBar.style.display = 'none';

    heroImg.style.backgroundImage = ''; heroImg.style.opacity = '';
    hero.querySelectorAll('iframe').forEach(f => f.remove());
    const grad = hero.querySelector('.modal__hero-gradient'); if (grad) grad.style.opacity = '';
    document.getElementById('modal-title').textContent = '...';
    document.getElementById('modal-desc').textContent = 'Đang tải...';
    document.getElementById('modal-episodes-list').innerHTML = '';
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Ẩn các nút điều khiển video khi chưa phát
    document.getElementById('modal-light-btn').style.display = 'none';
    document.getElementById('modal-theater-btn').style.display = 'none';
    document.getElementById('modal-player-bar').style.display = 'none';
    document.getElementById('modal-light-btn').title = 'Tắt đèn (Theater Mode)';

    // Reset buttons
    const myListBtn = document.getElementById('modal-mylist-btn');
    myListBtn.classList.remove('in-list');
    myListBtn.innerHTML = '<i class="fas fa-plus"></i>';
    
    const removeHistoryBtn = document.getElementById('modal-remove-history-btn');
    if (removeHistoryBtn) removeHistoryBtn.style.display = 'none';

    // Đọc rating của người dùng từ localStorage
    const savedRating = STORAGE.getRating(slug);
    highlightStars(savedRating);

    try {
        const d = await apiFetch(API.detail + slug, { signal: _modalAbort.signal });
        if (reqId !== _modalReqId) return;
        const m = d.movie || {}, eps = d.episodes?.[0]?.server_data || [];

        // Check if the movie is an adult movie
        if (isAdultMovie(m)) {
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
            showToast(
                'Nội dung bị hạn chế 🚫',
                `Phim <b>${m.name || 'này'}</b> không khả dụng do chính sách hạn chế nội dung 18+.`,
                'fa-ban'
            );
            return;
        }

        _currentModalMovie = m;
        _currentEpisodesList = eps;

        // Auto-initialize latest episode tracking if the movie is in My List
        if (STORAGE.isInMyList(slug) && eps.length > 0) {
            try {
                const tracked = JSON.parse(localStorage.getItem('longphim_tracked_episodes')) || {};
                const latestEpName = eps[eps.length - 1].name;
                if (!tracked[slug]) {
                    tracked[slug] = latestEpName;
                    localStorage.setItem('longphim_tracked_episodes', JSON.stringify(tracked));
                }
            } catch (e) {}
        }



        heroImg.style.backgroundImage = `url("${img(m.poster_url||m.thumb_url)}")`;
        document.getElementById('modal-title').textContent = m.name || '';
        document.getElementById('modal-year').textContent = m.year || '';
        document.getElementById('modal-quality').textContent = m.quality || 'HD';
        document.getElementById('modal-lang').textContent = m.lang || 'Vietsub';
        const tmp = document.createElement('div'); tmp.innerHTML = m.content || '';
        document.getElementById('modal-desc').textContent = tmp.textContent || 'Không có mô tả.';
        document.getElementById('modal-genres').innerHTML = `<span class="modal__label">Thể loại:</span> ${(m.category||[]).map(c=>c.name).filter(Boolean).join(', ')||'N/A'}`;
        document.getElementById('modal-country').innerHTML = `<span class="modal__label">Quốc gia:</span> ${(m.country||[]).map(c=>c.name).filter(Boolean).join(', ')||'N/A'}`;

        // Update My List button state
        const inList = STORAGE.isInMyList(slug);
        myListBtn.classList.toggle('in-list', inList);
        myListBtn.innerHTML = `<i class="fas fa-${inList ? 'check' : 'plus'}"></i>`;

        // My List button handler
        myListBtn.onclick = () => {
            if (!_currentModalMovie) return;
            const added = STORAGE.toggleMyList(_currentModalMovie);
            myListBtn.classList.toggle('in-list', added);
            myListBtn.innerHTML = `<i class="fas fa-${added ? 'check' : 'plus'}"></i>`;
            
            // If added to My List, immediately initialize latest episode tracking
            if (added && _currentEpisodesList.length > 0) {
                try {
                    const tracked = JSON.parse(localStorage.getItem('longphim_tracked_episodes')) || {};
                    tracked[_currentModalSlug] = _currentEpisodesList[_currentEpisodesList.length - 1].name;
                    localStorage.setItem('longphim_tracked_episodes', JSON.stringify(tracked));
                } catch (e) {}
            }
            
            // Also update card buttons in background
            updateAllMyListButtons(_currentModalMovie.slug, added);
            
            showToast(
                added ? 'Đã thêm vào danh sách! ✓' : 'Đã xóa khỏi danh sách!',
                added ? `Đã lưu phim <b>${_currentModalMovie.name}</b> vào Danh sách của tôi.` : `Đã xóa <b>${_currentModalMovie.name}</b> khỏi Danh sách của tôi.`,
                added ? 'fa-heart' : 'fa-trash-can'
            );
        };

        // Update Remove History button state
        const inHistory = STORAGE.getHistory().some(h => h.slug === slug);
        if (removeHistoryBtn) {
            removeHistoryBtn.style.display = inHistory ? 'inline-flex' : 'none';
            removeHistoryBtn.onclick = () => {
                STORAGE.removeHistory(slug);
                removeHistoryBtn.style.display = 'none';
                showToast(
                    'Đã xóa lịch sử! 🕒',
                    `Đã xóa phim <b>${m.name || ''}</b> khỏi Tiếp tục xem.`,
                    'fa-trash-can'
                );
                renderHistoryRow();
            };
        }

        renderEpisodes(eps, m);

        // Khôi phục tiến trình xem dở (nếu có)
        const savedProgress = STORAGE.getProgress(slug);
        let resumeIdx = 0;
        if (savedProgress && savedProgress.ep) {
            const idx = eps.findIndex(ep => ep.name === savedProgress.ep);
            if (idx !== -1) resumeIdx = idx;
        }

        document.getElementById('modal-play-btn').onclick = () => {
            if (eps.length) {
                playEpisode(eps[resumeIdx], m);
                const btns = document.querySelectorAll('.ep-btn');
                btns.forEach(x => x.classList.remove('active'));
                if (btns[resumeIdx]) btns[resumeIdx].classList.add('active');
            }
        };
        if (autoPlay && eps.length) {
            playEpisode(eps[resumeIdx], m);
            const btns = document.querySelectorAll('.ep-btn');
            btns.forEach(x => x.classList.remove('active'));
            if (btns[resumeIdx]) btns[resumeIdx].classList.add('active');
        }

        // Hiển thị badge tiếp tục xem cho nhanh nếu có lưu tiến trình
        if (savedProgress && savedProgress.ep && eps.length > 1 && !autoPlay) {
            const btns = document.querySelectorAll('.ep-btn');
            if (btns[resumeIdx]) btns[resumeIdx].classList.add('active');
        }
    } catch (err) {
        if (err.name === 'AbortError') return;
        document.getElementById('modal-desc').textContent = 'Lỗi khi tải.';
    }
}

function renderEpisodes(eps, movie) {
    const c = document.getElementById('modal-episodes-list');
    const sec = document.getElementById('modal-episodes-section');
    c.innerHTML = '';
    if (!eps.length) { sec.style.display = 'none'; return; }
    sec.style.display = '';
    eps.forEach(ep => {
        const b = document.createElement('button'); b.className = 'ep-btn';
        b.textContent = `Tập ${ep.name}`;
        b.onclick = () => {
            c.querySelectorAll('.ep-btn').forEach(x => x.classList.remove('active'));
            b.classList.add('active');
            playEpisode(ep, movie);
        };
        c.appendChild(b);
    });
}

function playEpisode(ep, movie) {
    _currentEpisode = ep;
    if (movie) _currentModalMovie = movie;

    const m3u8 = ep.link_m3u8;
    const embed = ep.link_embed;

    if (embed) {
        if (typeof VIPPlayer !== 'undefined') {
            VIPPlayer.currentM3u8 = m3u8;
            VIPPlayer.currentEmbed = embed;
            VIPPlayer.currentServer = 'iframe';
            
            // Hiển thị thanh nguồn phát nếu có đầy đủ cả 2 nguồn
            const serverBar = document.getElementById('vip-server-bar');
            if (serverBar) {
                serverBar.style.display = (m3u8 && embed) ? 'flex' : 'none';
            }
            
            // Cập nhật trạng thái active cho nút nguồn phát mặc định (iframe)
            const serverBtns = document.querySelectorAll('.vip-server-btn');
            serverBtns.forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-server') === 'iframe');
            });

            if (VIPPlayer.isActive) {
                VIPPlayer.deactivate();
            }
        }
        playInModal(embed);
    } else if (m3u8 && typeof VIPPlayer !== 'undefined') {
        const hero = document.getElementById('modal-hero');
        if (hero) hero.querySelectorAll('iframe').forEach(f => f.remove());
        VIPPlayer.load(m3u8, embed);
        VIPPlayer._updateNextButton();
    } else {
        if (typeof VIPPlayer !== 'undefined' && VIPPlayer.isActive) {
            VIPPlayer.deactivate();
        }
        playInModal(embed);
    }
    updateNextEpisodeButton();

    const modalEl = document.getElementById('modal');
    if (modalEl) {
        window.focus();
        modalEl.focus();
    }

    // Lưu tiến trình xem dở (tập nào)
    const slug = (movie && movie.slug) || _currentModalSlug;
    if (slug) STORAGE.saveProgress(slug, ep.name);

    // Save to history
    if (movie) {
        STORAGE.addHistory({
            slug: movie.slug || _currentModalSlug,
            name: movie.name || '',
            poster_url: movie.poster_url || '',
            thumb_url: movie.thumb_url || '',
            episode: ep.name || ''
        });
        
        // Hiện nút xóa lịch sử trong modal ngay lập tức
        const removeHistoryBtn = document.getElementById('modal-remove-history-btn');
        if (removeHistoryBtn) {
            removeHistoryBtn.style.display = 'inline-flex';
            removeHistoryBtn.onclick = () => {
                STORAGE.removeHistory(movie.slug || _currentModalSlug);
                removeHistoryBtn.style.display = 'none';
                showToast(
                    'Đã xóa lịch sử! 🕒',
                    `Đã xóa phim <b>${movie.name || ''}</b> khỏi Tiếp tục xem.`,
                    'fa-trash-can'
                );
                renderHistoryRow();
            };
        }
    }
}

function playInModal(url) {
    const hero = document.getElementById('modal-hero');
    hero.querySelectorAll('iframe').forEach(f => f.remove());
    const iframe = document.createElement('iframe');
    iframe.src = url; iframe.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture'; iframe.allowFullscreen = true;
    hero.appendChild(iframe);
    document.getElementById('modal-hero-img').style.opacity = '0';
    hero.querySelector('.modal__hero-gradient').style.opacity = '0';

    // Hiện các nút điều khiển video khi video bắt đầu được phát
    document.getElementById('modal-light-btn').style.display = 'inline-flex';
    document.getElementById('modal-theater-btn').style.display = 'inline-flex';

    document.getElementById('modal').classList.add('is-playing');
}

function closeModal() {
    if (typeof VIPPlayer !== 'undefined' && VIPPlayer.isActive) {
        VIPPlayer.deactivate();
    }
    const serverBar = document.getElementById('vip-server-bar');
    if (serverBar) serverBar.style.display = 'none';

    const modal = document.getElementById('modal'), hero = document.getElementById('modal-hero');
    hero.querySelectorAll('iframe').forEach(f => f.remove());
    document.getElementById('modal-hero-img').style.opacity = '';
    const g = hero.querySelector('.modal__hero-gradient'); if (g) g.style.opacity = '';
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (_modalAbort) try { _modalAbort.abort(); } catch {}
    _currentModalSlug = null;
    _currentModalMovie = null;
    _currentEpisodesList = [];

    modal.classList.remove('is-playing');
    const playerBar = document.getElementById('modal-player-bar');
    if (playerBar) playerBar.style.display = 'none';

    // Tắt các class rạp chiếu, tắt đèn
    document.body.classList.remove('theater-light-off');
    const dialog = document.querySelector('.modal__dialog');
    if (dialog) dialog.classList.remove('theater-layout');
    
    const theaterBtn = document.getElementById('modal-theater-btn');
    if (theaterBtn) {
        theaterBtn.innerHTML = '<i class="fas fa-expand"></i>';
        theaterBtn.title = 'Chế độ rạp chiếu (Rộng hơn)';
    }

    // Refresh history row if on home page
    if (!document.getElementById('home-view').style.display || document.getElementById('home-view').style.display !== 'none') {
        renderHistoryRow();
    }
    // Refresh My List page if currently showing
    if (browseType === 'mylist') {
        openMyListPage();
    }
}

// Update all card mylist buttons when toggling from modal
function updateAllMyListButtons(slug, added) {
    document.querySelectorAll(`[data-mylist-slug="${slug}"]`).forEach(btn => {
        btn.classList.toggle('in-list', added);
        btn.innerHTML = `<i class="fas fa-${added ? 'check' : 'plus'}"></i>`;
    });
}

// ══════════════════════════════════════════════════════════
//  VIP CUSTOM HLS VIDEO PLAYER
// ══════════════════════════════════════════════════════════
const VIPPlayer = {
    // State
    hls: null,
    video: null,
    container: null,
    isActive: false,
    isLive: false,
    currentM3u8: null,
    currentEmbed: null,
    currentServer: 'vip', // 'vip' or 'iframe'
    controlsTimeout: null,
    isSeeking: false,
    _lastVolume: 1,
    _tapTimers: { left: 0, right: 0 },
    _tapCounts: { left: 0, right: 0 },
    _tapFeedbackTimeouts: { left: null, right: null },
    _singleTapTimeout: null,
    _saveInterval: null,
    _seekOSDTimeout: null,
    _volumeOSDTimeout: null,
    _centerIndicatorTimeout: null,
    _tvFocusActive: false,

    // Initialize - call once on DOMContentLoaded
    init() {
        this.video = document.getElementById('vip-video');
        this.container = document.getElementById('vip-player-container');
        if (!this.video || !this.container) return;

        this._setupVideoEvents();
        this._setupControls();
        this._setupProgress();
        this._setupDoubleTap();
        this._setupSpeedMenu();
        this._setupServerSwitcher();
    },

    // Load HLS source
    load(m3u8Url, embedUrl, isLive = false) {
        this.isLive = isLive;
        this.currentM3u8 = m3u8Url;
        this.currentEmbed = embedUrl;
        this.currentServer = 'vip';

        // Hide backup TV button by default
        const backupBtn = document.getElementById('vip-btn-backup-tv');
        if (backupBtn) {
            backupBtn.style.display = 'none';
        }

        // Show/hide live-specific controls
        const progress = document.getElementById('vip-progress');
        const nextBtn = document.getElementById('vip-btn-next');
        const speedBtn = document.getElementById('vip-btn-speed');
        const serverBar = document.getElementById('vip-server-bar');
        const playerBar = document.getElementById('modal-player-bar');

        if (this.isLive) {
            if (progress) progress.style.display = 'none';
            if (nextBtn) nextBtn.style.display = 'none';
            if (speedBtn) speedBtn.style.display = 'none';
            if (serverBar) serverBar.style.display = 'none';
            if (playerBar) playerBar.style.display = 'none';
        } else {
            if (progress) progress.style.display = '';
            if (speedBtn) speedBtn.style.display = '';
            if (serverBar && embedUrl) serverBar.style.display = 'flex';
        }

        // Update server switcher buttons immediately
        const serverBtns = document.querySelectorAll('.vip-server-btn');
        serverBtns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-server') === 'vip');
        });

        // Clean up previous HLS instance
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }

        // Show loading spinner
        const loading = document.getElementById('vip-loading');
        if (loading) loading.style.display = 'flex';

        // Reset speed button display
        if (speedBtn) speedBtn.textContent = '1x';

        // If Hls.js is supported, load and play
        if (Hls.isSupported()) {
            this.hls = new Hls({
                maxMaxBufferLength: 30,
                enableWorker: true,
                lowLatencyMode: true
            });
            this.hls.loadSource(m3u8Url);
            this.hls.attachMedia(this.video);

            this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                if (typeof window._buildQualityMenu === 'function') {
                    window._buildQualityMenu(this.hls);
                }
            });

            this.hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    console.warn('Fatal HLS error, falling back to iframe:', data.type);
                    this.fallbackToIframe();
                }
            });
        } else if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari/iOS native HLS
            this.video.src = m3u8Url;
        } else {
            console.warn('HLS not supported on this browser, falling back to iframe.');
            this.fallbackToIframe();
            return;
        }

        this.activate();
    },

    // Fallback to backup embed iframe player
    fallbackToIframe() {
        this.deactivate();
        this.currentServer = 'iframe';
        const serverBtns = document.querySelectorAll('.vip-server-btn');
        serverBtns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-server') === 'iframe');
        });
        playInModal(this.currentEmbed);
    },

    // Activate VIP player UI
    activate() {
        this.isActive = true;
        this.container.style.display = '';

        // Hide billboard/modal hero background elements
        const heroImg = document.getElementById('modal-hero-img');
        const heroGrad = document.querySelector('#modal-hero .modal__hero-gradient');
        if (heroImg) heroImg.style.opacity = '0';
        if (heroGrad) heroGrad.style.opacity = '0';

        // Add active classes to modal and show it
        const modal = document.getElementById('modal');
        if (modal) {
            modal.setAttribute('aria-hidden', 'false');
            modal.classList.add('vip-active');
            modal.classList.add('is-playing');
        }
        document.body.style.overflow = 'hidden';

        // Hide movie metadata panels if viewing live TV
        if (this.isLive) {
            const modalBody = document.querySelector('.modal__body');
            if (modalBody) modalBody.style.display = 'none';
        }

        // Remove any backup iframes
        const hero = document.getElementById('modal-hero');
        if (hero) {
            hero.querySelectorAll('iframe').forEach(f => f.remove());
        }

        // Show the server selection bar (only if not live TV)
        const serverBar = document.getElementById('vip-server-bar');
        if (serverBar) serverBar.style.display = this.isLive ? 'none' : 'flex';

        // Configure control views based on Live HLS or normal movie
        const progress = document.getElementById('vip-progress');
        if (progress) progress.style.display = this.isLive ? 'none' : '';

        const speedBtn = document.getElementById('vip-btn-speed');
        if (speedBtn) speedBtn.style.display = this.isLive ? 'none' : '';

        // Show the speed menu and hide it by default
        const speedMenu = document.getElementById('vip-speed-menu');
        if (speedMenu) speedMenu.style.display = 'none';

        // Show controls initially, then autohide
        this.showControls();
        this.resetAutoHide();

        // Start progress save interval (every 5 seconds) if not live TV
        if (this._saveInterval) clearInterval(this._saveInterval);
        if (!this.isLive) {
            this._saveInterval = setInterval(() => this._saveTimeProgress(), 5000);
        } else {
            this._saveInterval = null;
            // Update time display to blinking red live indicator
            const timeDisplay = document.getElementById('vip-time-display');
            if (timeDisplay) {
                timeDisplay.innerHTML = `<span class="live-dot" style="display:inline-block; width:8px; height:8px; background:#e50914; border-radius:50%; margin-right:6px; box-shadow: 0 0 6px #e50914; animation: pulse 1s infinite;"></span> TRỰC TIẾP`;
            }
        }

        // Hide light/theater buttons as custom player handles all controls
        const lightBtn = document.getElementById('modal-light-btn');
        const theaterBtn = document.getElementById('modal-theater-btn');
        if (lightBtn) lightBtn.style.display = 'none';
        if (theaterBtn) theaterBtn.style.display = 'none';

        // Play the video
        this.video.play().catch(e => {
            console.log('Autoplay blocked or interrupted:', e);
            this._showCenterIndicator('play');
        });
    },

    // Deactivate and cleanup VIP player
    deactivate() {
        this.isActive = false;

        // Clear timeouts and intervals
        if (this._saveInterval) {
            clearInterval(this._saveInterval);
            this._saveInterval = null;
        }
        if (this.controlsTimeout) {
            clearTimeout(this.controlsTimeout);
            this.controlsTimeout = null;
        }
        this._removeNextEpisodeCountdown();

        // Save last progress time (only if not live TV)
        if (!this.isLive) {
            this._saveTimeProgress();
        }

        // Pause and reset video
        if (this.video) {
            this.video.pause();
            this.video.src = '';
            this.video.removeAttribute('src');
            this.video.load();
        }

        // Destroy HLS instance
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }

        // Hide VIP UI container
        if (this.container) {
            this.container.style.display = 'none';
            this.container.classList.remove('pseudo-fullscreen');
        }
        document.body.classList.remove('vip-pseudo-fs-active');

        // Restore custom styling elements
        const progress = document.getElementById('vip-progress');
        if (progress) progress.style.display = '';

        const speedBtn = document.getElementById('vip-btn-speed');
        if (speedBtn) speedBtn.style.display = '';

        const backupBtn = document.getElementById('vip-btn-backup-tv');
        if (backupBtn) backupBtn.style.display = 'none';

        const modalTitle = document.getElementById('vip-modal-title');
        if (modalTitle) modalTitle.textContent = '';

        // Restore modal body display if it was hidden
        const modalBody = document.querySelector('.modal__body');
        if (modalBody) modalBody.style.display = '';

        this.isLive = false;

        // Remove active classes
        const modal = document.getElementById('modal');
        if (modal) {
            modal.classList.remove('vip-active');
        }

        // Blur any TV focus elements
        if (this._tvFocusActive) {
            this.getFocusables().forEach(el => {
                el.classList.remove('tv-focus');
                el.blur();
            });
            this._tvFocusActive = false;
        }
    },

    // Set up standard HTML5 video event listeners
    _setupVideoEvents() {
        if (!this.video) return;

        this.video.addEventListener('play', () => {
            const playIcon = document.querySelector('#vip-btn-play i');
            if (playIcon) playIcon.className = 'fas fa-pause';
            this._showCenterIndicator('play');
            this.resetAutoHide();
        });

        this.video.addEventListener('pause', () => {
            const playIcon = document.querySelector('#vip-btn-play i');
            if (playIcon) playIcon.className = 'fas fa-play';
            this._showCenterIndicator('pause');
            this.showControls();
        });

        this.video.addEventListener('timeupdate', () => {
            this._updateProgress();
        });

        this.video.addEventListener('progress', () => {
            this._updateBuffered();
        });

        this.video.addEventListener('loadedmetadata', () => {
            // Restore playback position if saved
            this._restoreTimeProgress();
            this._updateProgress();
            this._updateNextButton();

            const loading = document.getElementById('vip-loading');
            if (loading) loading.style.display = 'none';
        });

        this.video.addEventListener('waiting', () => {
            const loading = document.getElementById('vip-loading');
            if (loading) loading.style.display = 'flex';
        });

        this.video.addEventListener('playing', () => {
            const loading = document.getElementById('vip-loading');
            if (loading) loading.style.display = 'none';
        });

        this.video.addEventListener('ended', () => {
            this._onEnded();
        });

        this.video.addEventListener('volumechange', () => {
            const muteIcon = document.querySelector('#vip-btn-mute i');
            const volSlider = document.getElementById('vip-volume-slider');
            
            if (this.video.muted || this.video.volume === 0) {
                if (muteIcon) muteIcon.className = 'fas fa-volume-mute';
                if (volSlider) volSlider.value = 0;
            } else {
                if (muteIcon) {
                    if (this.video.volume < 0.4) muteIcon.className = 'fas fa-volume-down';
                    else muteIcon.className = 'fas fa-volume-up';
                }
                if (volSlider) volSlider.value = this.video.volume;
            }
        });
    },

    // Set up general mouse and touch control bar events
    _setupControls() {
        const playBtn = document.getElementById('vip-btn-play');
        const muteBtn = document.getElementById('vip-btn-mute');
        const fsBtn = document.getElementById('vip-btn-fullscreen');
        const pipBtn = document.getElementById('vip-btn-pip');
        const nextBtn = document.getElementById('vip-btn-next');
        const volSlider = document.getElementById('vip-volume-slider');

        if (playBtn) playBtn.addEventListener('click', () => this.togglePlay());
        if (muteBtn) muteBtn.addEventListener('click', () => this.toggleMute());
        if (fsBtn) fsBtn.addEventListener('click', () => this.toggleFullscreen());
        
        if (pipBtn) {
            pipBtn.addEventListener('click', () => this.togglePiP());
            if (!document.pictureInPictureEnabled) pipBtn.style.display = 'none';
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                const nextBottomBtn = document.getElementById('modal-next-bottom-btn');
                if (nextBottomBtn && nextBottomBtn.style.display !== 'none') {
                    nextBottomBtn.click();
                }
            });
        }

        if (volSlider) {
            volSlider.addEventListener('input', (e) => {
                this.setVolume(parseFloat(e.target.value));
            });
        }

        // Show/hide controls on mouse hover / touch movement
        this.container.addEventListener('mousemove', () => {
            this.showControls();
            this.resetAutoHide();
        });

        this.container.addEventListener('mouseleave', () => {
            if (!this.video.paused) {
                this.hideControls();
            }
        });

        // Touch events for mobile to show controls
        this.container.addEventListener('touchstart', () => {
            this.showControls();
            this.resetAutoHide();
        }, { passive: true });
    },

    // Set up floating time tooltip and scrubbing logic
    _setupProgress() {
        const progress = document.getElementById('vip-progress');
        const tooltip = document.getElementById('vip-progress-tooltip');
        if (!progress) return;

        const seekTo = (e) => {
            if (this.isLive) return;
            if (!this.video || !this.video.duration) return;
            const rect = progress.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            let percent = (clientX - rect.left) / rect.width;
            percent = Math.max(0, Math.min(1, percent));
            this.video.currentTime = percent * this.video.duration;
            this._updateProgress();
        };

        const onMouseMove = (e) => {
            if (this.isLive) return;
            if (this.isSeeking) {
                seekTo(e);
            }
            if (this.video && this.video.duration && tooltip) {
                const rect = progress.getBoundingClientRect();
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                let percent = (clientX - rect.left) / rect.width;
                percent = Math.max(0, Math.min(1, percent));
                
                tooltip.style.left = `${percent * 100}%`;
                tooltip.textContent = this._formatTime(percent * this.video.duration);
                tooltip.classList.add('show');
            }
        };

        progress.addEventListener('mousedown', (e) => {
            if (this.isLive) return;
            this.isSeeking = true;
            seekTo(e);
            this.showControls();
            this.resetAutoHide();
        });

        progress.addEventListener('mousemove', onMouseMove);
        
        progress.addEventListener('mouseleave', () => {
            if (tooltip) tooltip.classList.remove('show');
        });

        window.addEventListener('mouseup', () => {
            if (this.isSeeking) {
                this.isSeeking = false;
                this.resetAutoHide();
            }
        });

        // Touch support for progress bar
        progress.addEventListener('touchstart', (e) => {
            if (this.isLive) return;
            this.isSeeking = true;
            seekTo(e);
            this.showControls();
            this.resetAutoHide();
        }, { passive: true });

        progress.addEventListener('touchmove', (e) => {
            if (this.isLive) return;
            if (this.isSeeking) seekTo(e);
        }, { passive: true });

        progress.addEventListener('touchend', () => {
            this.isSeeking = false;
            this.resetAutoHide();
        });
    },

    // Set up YouTube-style double-tap gestures
    _setupDoubleTap() {
        const leftZone = document.getElementById('vip-tap-left');
        const rightZone = document.getElementById('vip-tap-right');
        if (!leftZone || !rightZone) return;

        const handleTap = (zone, direction) => {
            if (this.isLive) {
                this.toggleControls();
                return;
            }
            const now = Date.now();
            const lastTap = this._tapTimers[direction];
            this._tapTimers[direction] = now;

            if (now - lastTap < 300) {
                // Double tap or subsequent multi-taps
                this._tapCounts[direction]++;
                
                if (this._singleTapTimeout) {
                    clearTimeout(this._singleTapTimeout);
                    this._singleTapTimeout = null;
                }

                this.executeDoubleTapSeek(direction);
            } else {
                // First tap
                this._tapCounts[direction] = 1;
                this._singleTapTimeout = setTimeout(() => {
                    // Single tap: toggle controls bar visibility
                    this.toggleControls();
                    this._singleTapTimeout = null;
                }, 280);
            }
        };

        leftZone.addEventListener('click', (e) => {
            e.preventDefault();
            handleTap(leftZone, 'left');
        });

        rightZone.addEventListener('click', (e) => {
            e.preventDefault();
            handleTap(rightZone, 'right');
        });
    },

    executeDoubleTapSeek(direction) {
        const tapCount = this._tapCounts[direction];
        const sign = direction === 'left' ? -1 : 1;
        const delta = sign * 10;

        // Perform seek
        this.seek(delta);

        // Ripple and pop feedback
        const zone = document.getElementById(`vip-tap-${direction}`);
        if (zone) {
            zone.classList.remove('active');
            void zone.offsetWidth; // force reflow
            zone.classList.add('active');
            
            const spanText = zone.querySelector('.vip-tap-feedback span');
            if (spanText) {
                spanText.textContent = `${(tapCount - 1) * 10}s`;
            }

            if (this._tapFeedbackTimeouts[direction]) {
                clearTimeout(this._tapFeedbackTimeouts[direction]);
            }
            this._tapFeedbackTimeouts[direction] = setTimeout(() => {
                zone.classList.remove('active');
            }, 600);
        }
    },

    // Set up video speed menus
    _setupSpeedMenu() {
        const speedBtn = document.getElementById('vip-btn-speed');
        const speedMenu = document.getElementById('vip-speed-menu');
        if (!speedBtn || !speedMenu) return;

        speedBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = speedMenu.style.display === 'flex';
            speedMenu.style.display = isOpen ? 'none' : 'flex';
            this.resetAutoHide();
        });

        speedMenu.querySelectorAll('button[data-speed]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const speed = parseFloat(btn.getAttribute('data-speed'));
                if (this.video) {
                    this.video.playbackRate = speed;
                    speedBtn.textContent = speed === 1 ? '1x' : `${speed}x`;
                    
                    speedMenu.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                }
                speedMenu.style.display = 'none';
                this.resetAutoHide();
                
                showToast(
                    'Tốc độ phát ⚡',
                    `Đã đổi tốc độ phát thành <b>${speed}x</b>.`,
                    'fa-gauge-high'
                );
            });
        });

        document.addEventListener('click', () => {
            speedMenu.style.display = 'none';
        });
    },

    // Set up source server buttons switching
    _setupServerSwitcher() {
        const btns = document.querySelectorAll('.vip-server-btn');
        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetServer = btn.getAttribute('data-server');
                if (targetServer === this.currentServer) return;

                btns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                if (targetServer === 'iframe') {
                    // Fall back to backup iframe
                    this.deactivate();
                    this.currentServer = 'iframe';
                    playInModal(this.currentEmbed);
                } else if (targetServer === 'vip') {
                    // Remove backup iframe and load VIP player m3u8
                    const hero = document.getElementById('modal-hero');
                    if (hero) hero.querySelectorAll('iframe').forEach(f => f.remove());
                    this.load(this.currentM3u8, this.currentEmbed);
                }
            });
        });
    },

    // Keyboard & D-pad key event processor (called from main keydown handler)
    handleKeyDown(e) {
        const k = e.key;

        // Smart TV Remote D-pad spatial navigation
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) {
            const controls = document.getElementById('vip-controls');
            
            // If controls are hidden, show controls first and don't navigate
            if (controls && controls.classList.contains('hidden')) {
                e.preventDefault();
                this.showControls();
                this.resetAutoHide();
                return true;
            }

            // ArrowLeft / ArrowRight seeking on progress bar, OR spatial focus navigation
            if (document.activeElement && document.activeElement.id === 'vip-progress') {
                if (k === 'ArrowLeft') {
                    e.preventDefault();
                    this.seek(-10);
                    return true;
                } else if (k === 'ArrowRight') {
                    e.preventDefault();
                    this.seek(10);
                    return true;
                }
            }

            // Spatial navigation
            e.preventDefault();
            const direction = k.replace('Arrow', '').toLowerCase();
            this.navigateFocus(direction);
            this.resetAutoHide();
            return true;
        }

        // Enter key action
        if (k === 'Enter') {
            const activeEl = document.activeElement;
            const focusables = this.getFocusables();
            
            // If controls are hidden, show them and play/pause
            const controls = document.getElementById('vip-controls');
            if (controls && controls.classList.contains('hidden')) {
                e.preventDefault();
                this.showControls();
                this.resetAutoHide();
                this.togglePlay();
                return true;
            }

            // If an element inside player is focused, let browser activate it natively
            if (activeEl && focusables.includes(activeEl)) {
                // native click activation by browser (let event bubble or trigger click)
                return false;
            }

            e.preventDefault();
            this.togglePlay();
            return true;
        }

        // Standard hotkeys
        if (k === ' ') {
            e.preventDefault();
            this.togglePlay();
            return true;
        }
        if (k === 'm' || k === 'M') {
            this.toggleMute();
            return true;
        }
        if (k === 'f' || k === 'F') {
            e.preventDefault();
            this.toggleFullscreen();
            return true;
        }
        if (k === 'ArrowLeft') {
            e.preventDefault();
            this.seek(-10);
            return true;
        }
        if (k === 'ArrowRight') {
            e.preventDefault();
            this.seek(10);
            return true;
        }
        if (k === 'ArrowUp') {
            e.preventDefault();
            this.setVolume(Math.min(1, this.video.volume + 0.1));
            return true;
        }
        if (k === 'ArrowDown') {
            e.preventDefault();
            this.setVolume(Math.max(0, this.video.volume - 0.1));
            return true;
        }
        if (k === '>' || k === '.') {
            e.preventDefault();
            this.changeSpeed(1);
            return true;
        }
        if (k === '<' || k === ',') {
            e.preventDefault();
            this.changeSpeed(-1);
            return true;
        }

        return false;
    },

    // Get all currently visible and focusable items for spatial navigation
    getFocusables() {
        const els = [];
        const playBtn = document.getElementById('vip-btn-play');
        const nextBtn = document.getElementById('vip-btn-next');
        const muteBtn = document.getElementById('vip-btn-mute');
        const volSlider = document.getElementById('vip-volume-slider');
        const speedBtn = document.getElementById('vip-btn-speed');
        const pipBtn = document.getElementById('vip-btn-pip');
        const fsBtn = document.getElementById('vip-btn-fullscreen');
        const progress = document.getElementById('vip-progress');
        const serverBtns = Array.from(document.querySelectorAll('#vip-server-bar .vip-server-btn'));

        if (playBtn) els.push(playBtn);
        if (nextBtn && nextBtn.style.display !== 'none') els.push(nextBtn);
        if (muteBtn) els.push(muteBtn);
        if (volSlider && volSlider.style.display !== 'none' && window.innerWidth > 600) els.push(volSlider);
        if (progress) els.push(progress);
        if (speedBtn) els.push(speedBtn);
        if (pipBtn && pipBtn.style.display !== 'none') els.push(pipBtn);
        if (fsBtn) els.push(fsBtn);
        return els;
    },

    // Navigate focus between elements spatially for TV Remote
    navigateFocus(direction) {
        const focusables = this.getFocusables();
        if (focusables.length === 0) return;

        const current = document.activeElement;
        let currentIndex = focusables.indexOf(current);

        if (currentIndex === -1) {
            // Nothing is focused, select play button first
            focusables[0].focus();
            focusables[0].classList.add('tv-focus');
            this._tvFocusActive = true;
            return;
        }

        // Remove highlight from old element
        focusables[currentIndex].classList.remove('tv-focus');

        let nextIndex = currentIndex;
        const isServerBtn = (el) => el.classList.contains('vip-server-btn');

        if (direction === 'left') {
            if (currentIndex > 0) {
                // Don't cross bounds from servers back to controls unless using arrow keys up/down
                if (isServerBtn(focusables[currentIndex]) && !isServerBtn(focusables[currentIndex - 1])) {
                    // stay on current
                } else {
                    nextIndex = currentIndex - 1;
                }
            }
        } else if (direction === 'right') {
            if (currentIndex < focusables.length - 1) {
                if (!isServerBtn(focusables[currentIndex]) && isServerBtn(focusables[currentIndex + 1])) {
                    // stay on current
                } else {
                    nextIndex = currentIndex + 1;
                }
            }
        } else if (direction === 'up') {
            // controls -> server selection bar
            const serverIndex = focusables.findIndex(isServerBtn);
            if (serverIndex !== -1 && !isServerBtn(focusables[currentIndex])) {
                nextIndex = serverIndex;
            }
        } else if (direction === 'down') {
            // server selection bar -> controls
            if (isServerBtn(focusables[currentIndex])) {
                nextIndex = 0; // Jump to Play button
            }
        }

        // Apply new focus
        const nextEl = focusables[nextIndex];
        if (nextEl) {
            nextEl.focus();
            nextEl.classList.add('tv-focus');
            this._tvFocusActive = true;
        }
    },

    // Play or pause the video
    togglePlay() {
        if (!this.video) return;
        if (this.video.paused) {
            this.video.play().catch(err => console.log(err));
        } else {
            this.video.pause();
        }
        this.resetAutoHide();
    },

    // Skip forward or backward by delta seconds
    seek(delta) {
        if (this.isLive) return;
        if (!this.video || !this.video.duration) return;
        let targetTime = this.video.currentTime + delta;
        targetTime = Math.max(0, Math.min(this.video.duration, targetTime));
        this.video.currentTime = targetTime;

        const label = delta > 0 ? `+${delta}s` : `${delta}s`;
        this._showOSD('seek', label);
        this._updateProgress();
    },

    // Mute or unmute the video
    toggleMute() {
        if (!this.video) return;
        if (this.video.muted) {
            this.video.muted = false;
            this.video.volume = this._lastVolume || 1;
        } else {
            this._lastVolume = this.video.volume;
            this.video.muted = true;
            this.video.volume = 0;
        }
        this._showOSD('volume', `${Math.round(this.video.volume * 100)}%`);
        this.resetAutoHide();
    },

    // Set precise volume value
    setVolume(value) {
        if (!this.video) return;
        this.video.volume = value;
        this.video.muted = (value === 0);
        this._showOSD('volume', `${Math.round(value * 100)}%`);
        this.resetAutoHide();
    },

    // Cycle or change speed
    changeSpeed(direction) {
        if (!this.video) return;
        const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
        const currentSpeed = this.video.playbackRate;
        let index = speeds.indexOf(currentSpeed);
        if (index === -1) index = 3; // default to 1x

        index = index + direction;
        if (index >= 0 && index < speeds.length) {
            const nextSpeed = speeds[index];
            this.video.playbackRate = nextSpeed;
            
            const speedBtn = document.getElementById('vip-btn-speed');
            if (speedBtn) speedBtn.textContent = nextSpeed === 1 ? '1x' : `${nextSpeed}x`;
            
            const speedMenu = document.getElementById('vip-speed-menu');
            if (speedMenu) {
                speedMenu.querySelectorAll('button').forEach(b => {
                    const s = parseFloat(b.getAttribute('data-speed'));
                    b.classList.toggle('active', s === nextSpeed);
                });
            }

            showToast(
                'Tốc độ phát ⚡',
                `Đã đổi tốc độ phát thành <b>${nextSpeed}x</b>.`,
                'fa-gauge-high'
            );
        }
        this.resetAutoHide();
    },

    // Toggle fullscreen mode
    toggleFullscreen() {
        if (!this.container) return;

        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        
        if (isIOS && this.video.webkitEnterFullscreen) {
            // iOS iPhone/Safari bắt buộc dùng webkitEnterFullscreen trực tiếp trên video element
            try {
                this.video.webkitEnterFullscreen();
            } catch (err) {
                console.error('iOS fullscreen failed:', err);
                this.fallbackToPseudoFullscreen();
            }
            this.resetAutoHide();
            return;
        }

        // 2. Với các trình duyệt hỗ trợ chuẩn Fullscreen API trên DOM Element (Android, Chrome, PC)
        const doc = document;
        const isFullscreen = doc.fullscreenElement || 
                             doc.webkitFullscreenElement || 
                             doc.mozFullScreenElement || 
                             doc.msFullscreenElement;

        if (!isFullscreen) {
            const requestFS = this.container.requestFullscreen || 
                              this.container.webkitRequestFullscreen || 
                              this.container.mozRequestFullScreen || 
                              this.container.msRequestFullscreen;
            if (requestFS) {
                requestFS.call(this.container).catch(err => {
                    console.error('Fullscreen request failed:', err);
                    // Nếu lỗi (do webview chặn chẳng hạn), dùng giả lập toàn màn hình CSS
                    this.fallbackToPseudoFullscreen();
                });
            } else if (this.video.webkitEnterFullscreen) {
                this.video.webkitEnterFullscreen();
            } else {
                this.fallbackToPseudoFullscreen();
            }
        } else {
            const exitFS = doc.exitFullscreen || 
                           doc.webkitExitFullscreen || 
                           doc.mozCancelFullScreen || 
                           doc.msExitFullscreen;
            if (exitFS) {
                exitFS.call(doc).catch(err => console.error('Exit fullscreen failed:', err));
            } else {
                this.fallbackToPseudoFullscreen();
            }
        }
        this.resetAutoHide();
    },

    // Giả lập chế độ toàn màn hình bằng CSS khi trình duyệt/webview chặn Fullscreen API gốc (Facebook, Zalo, in-app)
    fallbackToPseudoFullscreen() {
        if (!this.container) return;
        const isPseudo = this.container.classList.toggle('pseudo-fullscreen');
        document.body.classList.toggle('vip-pseudo-fs-active', isPseudo);
        
        // Cập nhật biểu tượng nút Fullscreen tương ứng
        const fsIcon = document.querySelector('#vip-btn-fullscreen i');
        if (fsIcon) {
            fsIcon.className = isPseudo ? 'fas fa-compress' : 'fas fa-expand';
        }

        showToast(
            isPseudo ? 'Toàn màn hình 📱' : 'Chế độ thường 📺',
            isPseudo ? 'Đã giả lập chế độ toàn màn hình tối ưu cho thiết bị của bạn!' : 'Đã quay lại chế độ thường.',
            isPseudo ? 'fa-expand' : 'fa-compress'
        );
    },

    // Picture-in-Picture mode toggle
    togglePiP() {
        if (!this.video) return;
        
        try {
            if (document.pictureInPictureElement) {
                document.exitPictureInPicture();
            } else if (document.pictureInPictureEnabled) {
                this.video.requestPictureInPicture();
            }
        } catch (e) {
            console.error('PiP error:', e);
        }
        this.resetAutoHide();
    },

    // Reveal custom player controls bar
    showControls() {
        const controls = document.getElementById('vip-controls');
        if (controls) {
            controls.classList.remove('hidden');
            this.container.classList.remove('controls-hidden');
        }
    },

    // Hide custom player controls bar
    hideControls() {
        const controls = document.getElementById('vip-controls');
        if (controls) {
            controls.classList.add('hidden');
            this.container.classList.add('controls-hidden');
        }
        const speedMenu = document.getElementById('vip-speed-menu');
        if (speedMenu) speedMenu.style.display = 'none';

        if (this._tvFocusActive) {
            this.getFocusables().forEach(el => {
                el.classList.remove('tv-focus');
                el.blur();
            });
            this._tvFocusActive = false;
        }
    },

    // Hide or show controls bar based on current visibility state
    toggleControls() {
        const controls = document.getElementById('vip-controls');
        if (controls && !controls.classList.contains('hidden')) {
            this.hideControls();
        } else {
            this.showControls();
            this.resetAutoHide();
        }
    },

    // Reset controls auto-hide timer (3 seconds)
    resetAutoHide() {
        if (this.controlsTimeout) clearTimeout(this.controlsTimeout);
        if (this.video && this.video.paused) return; // don't hide controls if video is paused

        this.controlsTimeout = setTimeout(() => {
            this.hideControls();
        }, 3000);
    },

    // Update played progress indicators
    _updateProgress() {
        if (!this.video || this.isSeeking) return;

        const played = document.getElementById('vip-progress-played');
        const handle = document.getElementById('vip-progress-handle');
        const timeDisplay = document.getElementById('vip-time-display');

        if (this.isLive) {
            if (timeDisplay) timeDisplay.innerHTML = '<span class="live-dot" style="display:inline-block; width:8px; height:8px; background:#e50914; border-radius:50%; margin-right:6px; box-shadow:0 0 8px #e50914; animation:pulse-glow 1.5s infinite;"></span>TRỰC TIẾP';
            if (played) played.style.width = '100%';
            if (handle) handle.style.left = '100%';
            return;
        }

        const curTime = this.video.currentTime || 0;
        const duration = this.video.duration || 0;

        if (duration) {
            const percent = (curTime / duration) * 100;
            if (played) played.style.width = `${percent}%`;
            if (handle) handle.style.left = `${percent}%`;
            if (timeDisplay) {
                timeDisplay.textContent = `${this._formatTime(curTime)} / ${this._formatTime(duration)}`;
            }
        } else {
            if (timeDisplay) {
                timeDisplay.textContent = `${this._formatTime(curTime)} / 00:00`;
            }
        }
    },

    // Update buffered progress indicators
    _updateBuffered() {
        if (this.isLive) return;
        if (!this.video || !this.video.duration) return;
        const buffered = document.getElementById('vip-progress-buffered');
        if (!buffered) return;

        const duration = this.video.duration;
        const b = this.video.buffered;
        if (b.length > 0) {
            const end = b.end(b.length - 1);
            buffered.style.width = `${(end / duration) * 100}%`;
        }
    },

    // Format time in seconds to HH:MM:SS or MM:SS
    _formatTime(seconds) {
        if (isNaN(seconds)) return '00:00';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);

        const pad = (n) => String(n).padStart(2, '0');

        if (h > 0) {
            return `${h}:${pad(m)}:${pad(s)}`;
        }
        return `${pad(m)}:${pad(s)}`;
    },

    // Display a high-end HUD overlay on top of player (Volume/Seek)
    _showOSD(type, text, duration = 800) {
        const seekOSD = document.getElementById('vip-seek-osd');
        const volOSD = document.getElementById('vip-volume-osd');

        if (type === 'seek' && seekOSD) {
            const osdText = document.getElementById('vip-seek-osd-text');
            if (osdText) osdText.textContent = text;
            
            seekOSD.style.display = 'flex';
            seekOSD.style.opacity = '1';
            seekOSD.style.transform = 'translateX(-50%) scale(1)';
            
            if (this._seekOSDTimeout) clearTimeout(this._seekOSDTimeout);
            this._seekOSDTimeout = setTimeout(() => {
                seekOSD.style.opacity = '0';
                seekOSD.style.transform = 'translateX(-50%) scale(0.9)';
                setTimeout(() => { seekOSD.style.display = 'none'; }, 200);
            }, duration);
        } else if (type === 'volume' && volOSD) {
            const fill = document.getElementById('vip-volume-osd-fill');
            const percentText = volOSD.querySelector('#vip-volume-osd-text');
            const icon = document.getElementById('vip-volume-osd-icon');
            
            if (fill) fill.style.width = `${Math.round(this.video.volume * 100)}%`;
            if (percentText) percentText.textContent = `${Math.round(this.video.volume * 100)}%`;
            
            if (icon) {
                if (this.video.volume === 0 || this.video.muted) {
                    icon.className = 'fas fa-volume-mute';
                } else if (this.video.volume < 0.4) {
                    icon.className = 'fas fa-volume-down';
                } else {
                    icon.className = 'fas fa-volume-up';
                }
            }
            
            volOSD.style.display = 'flex';
            volOSD.style.opacity = '1';
            volOSD.style.transform = 'translateX(-50%) scale(1)';
            
            if (this._volumeOSDTimeout) clearTimeout(this._volumeOSDTimeout);
            this._volumeOSDTimeout = setTimeout(() => {
                volOSD.style.opacity = '0';
                volOSD.style.transform = 'translateX(-50%) scale(0.9)';
                setTimeout(() => { volOSD.style.display = 'none'; }, 200);
            }, duration);
        }
    },

    // Animate a large play/pause graphic in center (OSD feedback)
    _showCenterIndicator(action) {
        const ind = document.getElementById('vip-center-indicator');
        if (!ind) return;

        ind.style.display = 'flex';
        ind.className = 'vip-center-indicator';
        
        const icon = ind.querySelector('i');
        if (icon) {
            icon.className = action === 'play' ? 'fas fa-play' : 'fas fa-pause';
        }

        void ind.offsetWidth; // force reflow
        ind.classList.add('animate-in');

        if (this._centerIndicatorTimeout) clearTimeout(this._centerIndicatorTimeout);
        this._centerIndicatorTimeout = setTimeout(() => {
            ind.classList.remove('animate-in');
            ind.style.display = 'none';
        }, 500);
    },

    // Event listener when video finishes
    _onEnded() {
        this._saveTimeProgress();
        const nextBottomBtn = document.getElementById('modal-next-bottom-btn');
        const nextEp = getNextEpisode();
        if (nextEp && nextBottomBtn && nextBottomBtn.style.display !== 'none') {
            this._showNextEpisodeCountdown(nextEp);
        } else {
            this.showControls();
        }
    },

    _showNextEpisodeCountdown(nextEp) {
        this._removeNextEpisodeCountdown();

        const playerContainer = document.getElementById('vip-player-container');
        if (!playerContainer) return;

        const overlay = document.createElement('div');
        overlay.id = 'vip-next-ep-countdown-overlay';
        overlay.className = 'vip-next-ep-overlay';
        
        overlay.innerHTML = `
            <div class="vip-next-ep-content">
                <div class="vip-next-ep-title">Tập tiếp theo: Tập ${nextEp.name}</div>
                <div class="vip-next-ep-timer">
                    <svg class="vip-timer-svg" viewBox="0 0 36 36">
                        <path class="vip-timer-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path id="vip-timer-progress-bar" class="vip-timer-progress" stroke-dasharray="100, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                    <div id="vip-timer-countdown-number" class="vip-timer-number">5</div>
                </div>
                <div class="vip-next-ep-buttons">
                    <button class="vip-btn-next-play focusable" id="vip-btn-next-now"><i class="fas fa-play"></i> Phát ngay</button>
                    <button class="vip-btn-next-cancel focusable" id="vip-btn-next-cancel">Hủy</button>
                </div>
            </div>
        `;

        playerContainer.appendChild(overlay);

        // Setup spatial navigation focus
        if (this.isTvMode) {
            setTimeout(() => {
                const nowBtn = document.getElementById('vip-btn-next-now');
                if (nowBtn) nowBtn.focus();
            }, 100);
        }

        let timeLeft = 5;
        const numberDiv = document.getElementById('vip-timer-countdown-number');
        const progressBar = document.getElementById('vip-timer-progress-bar');
        
        const updateTimer = () => {
            if (numberDiv) numberDiv.textContent = timeLeft;
            if (progressBar) {
                const dash = (timeLeft / 5) * 100;
                progressBar.setAttribute('stroke-dasharray', `${dash}, 100`);
            }
        };

        updateTimer();

        this._nextEpTimerInterval = setInterval(() => {
            timeLeft--;
            if (timeLeft <= 0) {
                clearInterval(this._nextEpTimerInterval);
                overlay.remove();
                this._playNextEpisode(nextEp);
            } else {
                updateTimer();
            }
        }, 1000);

        // Bind button actions
        const playNowBtn = document.getElementById('vip-btn-next-now');
        const cancelBtn = document.getElementById('vip-btn-next-cancel');

        if (playNowBtn) {
            playNowBtn.addEventListener('click', () => {
                clearInterval(this._nextEpTimerInterval);
                overlay.remove();
                this._playNextEpisode(nextEp);
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                clearInterval(this._nextEpTimerInterval);
                overlay.remove();
                this.showControls();
            });
        }
    },

    _removeNextEpisodeCountdown() {
        if (this._nextEpTimerInterval) {
            clearInterval(this._nextEpTimerInterval);
            this._nextEpTimerInterval = null;
        }
        const overlay = document.getElementById('vip-next-ep-countdown-overlay');
        if (overlay) overlay.remove();
    },

    _playNextEpisode(nextEp) {
        const nextBottomBtn = document.getElementById('modal-next-bottom-btn');
        if (nextBottomBtn && nextBottomBtn.style.display !== 'none') {
            nextBottomBtn.click();
        }
    },

    // Save exact position progress
    _saveTimeProgress() {
        if (!this.video || !this.isActive) return;
        const slug = _currentModalSlug;
        if (!slug || !this.video.currentTime) return;
        
        try {
            const data = JSON.parse(localStorage.getItem('longphim_vip_time_progress')) || {};
            const epSlug = _currentEpisode ? _currentEpisode.slug : 'default';
            if (!data[slug]) data[slug] = {};
            data[slug][epSlug] = {
                time: this.video.currentTime,
                duration: this.video.duration || 0,
                updatedAt: Date.now()
            };
            localStorage.setItem('longphim_vip_time_progress', JSON.stringify(data));
        } catch (e) {
            console.error('Failed to save time progress:', e);
        }
    },

    // Restore exact position progress
    _restoreTimeProgress() {
        if (!this.video) return;
        const slug = _currentModalSlug;
        if (!slug) return;
        
        try {
            const data = JSON.parse(localStorage.getItem('longphim_vip_time_progress')) || {};
            const epSlug = _currentEpisode ? _currentEpisode.slug : 'default';
            const saved = data[slug]?.[epSlug];
            if (saved && typeof saved.time === 'number') {
                if (saved.duration && saved.time / saved.duration < 0.95) {
                    this.video.currentTime = saved.time;
                    showToast(
                        'Tiếp tục xem ⏳',
                        `Đang phát tiếp từ <b>${this._formatTime(saved.time)}</b>.`,
                        'fa-clock'
                    );
                }
            }
        } catch (e) {
            console.error('Failed to restore time progress:', e);
        }
    },

    // Update VIP player next episode button visibility
    _updateNextButton() {
        const nextBtn = document.getElementById('vip-btn-next');
        if (!nextBtn) return;

        const nextBottomBtn = document.getElementById('modal-next-bottom-btn');
        const hasNext = !!(nextBottomBtn && nextBottomBtn.style.display !== 'none');
        nextBtn.style.display = hasNext ? 'flex' : 'none';
    }
};

// ══════════════════════════════════════════════════════════
//  EPISODE RELEASE REMINDERS (THEO DÕI LỊCH CHIẾU PHIM YÊU THÍCH)
// ══════════════════════════════════════════════════════════
const LPSubscriptions = {
    KEY: 'longphim_tracked_episodes',

    getTracked() {
        try {
            return JSON.parse(localStorage.getItem(this.KEY)) || {};
        } catch (e) {
            return {};
        }
    },

    saveTracked(dict) {
        localStorage.setItem(this.KEY, JSON.stringify(dict));
    },

    async checkNewEpisodes() {
        const myList = STORAGE.getMyList() || [];
        if (myList.length === 0) return;

        try {
            const res = await fetch('https://ophim1.com/danh-sach/phim-moi-cap-nhat?page=1');
            if (!res.ok) return;
            const data = await res.json();
            const items = data.items || [];
            if (!items.length) return;

            let tracked = this.getTracked();
            let changed = false;

            for (const fav of myList) {
                // Find if the favorite movie is in the recently updated list on page 1
                const matched = items.find(item => item.slug === fav.slug);
                if (matched) {
                    // Fetch details to get the exact latest episode name
                    const detailRes = await fetch(`https://ophim1.com/phim/${fav.slug}`);
                    if (!detailRes.ok) continue;
                    const detailData = await detailRes.json();
                    
                    const movieData = detailData.movie;
                    const episodes = detailData.episodes || [];
                    const epsList = episodes[0]?.server_data || [];
                    if (epsList.length > 0) {
                        const newEpName = epsList[epsList.length - 1].name;
                        
                        // If not tracked yet, initialize it so we don't alert old episodes
                        if (!tracked[fav.slug]) {
                            tracked[fav.slug] = newEpName;
                            changed = true;
                            continue;
                        }

                        // If there is a new episode!
                        if (newEpName && newEpName !== tracked[fav.slug]) {
                            showToast(
                                '🔔 Tập Mới Phim Yêu Thích!',
                                `Phim bạn thích <b>${movieData.name}</b> vừa cập nhật <b>${newEpName}</b>! Xem ngay!`,
                                'fa-bell',
                                () => { openModal(movieData.slug, true); }
                            );
                            
                            // Save new progress
                            tracked[fav.slug] = newEpName;
                            changed = true;
                        }
                    }
                }
            }

            if (changed) {
                this.saveTracked(tracked);
            }
        } catch (err) {
            console.error('LPSubscriptions error:', err);
        }
    }
};

// ══════════════════════════════════════════════════════════
//  LIVE TV & SPORTS
// ══════════════════════════════════════════════════════════
const WORLD_CUP_MATCHES = [
    {
        homeTeam: 'Argentina',
        homeFlag: '🇦🇷',
        awayTeam: 'Algérie',
        awayFlag: '🇩🇿',
        time: 'Trực tiếp - 45\'',
        group: 'Bảng J - World Cup',
        channel: 'VTV3 / VTV Cần Thơ',
        m3u8: 'https://live.fptplay53.net/live/media/vtv3/live247-hls-avc/index.m3u8',
        link: 'https://vtvgo.vn/xem-truc-tuyen-kenh-vtv3-3.html',
        status: 'Trực tiếp'
    },
    {
        homeTeam: 'Áo',
        homeFlag: '🇦🇹',
        awayTeam: 'Jordan',
        awayFlag: '🇯🇴',
        time: '11:00 - Hôm Nay',
        group: 'Bảng J - World Cup',
        channel: 'VTV5 / TV360',
        m3u8: 'https://live.a.fptplay53.net/live/media/vtv5/live247-hls-avc/index.m3u8',
        link: 'https://vtvgo.vn/xem-truc-tuyen-kenh-vtv5-5.html',
        status: 'Sắp diễn ra'
    },
    {
        homeTeam: 'Bồ Đào Nha',
        homeFlag: '🇵🇹',
        awayTeam: 'CHDC Congo',
        awayFlag: '🇨🇩',
        time: '00:00 - Ngày Mai',
        group: 'Bảng K - World Cup',
        channel: 'VTV3 / TV360',
        m3u8: 'https://live.fptplay53.net/live/media/vtv3/live247-hls-avc/index.m3u8',
        link: 'https://vtvgo.vn/xem-truc-tuyen-kenh-vtv3-3.html',
        status: 'Sắp diễn ra'
    },
    {
        homeTeam: 'Anh',
        homeFlag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
        awayTeam: 'Croatia',
        awayFlag: '🇭🇷',
        time: '03:00 - Ngày Mai',
        group: 'Bảng L - World Cup',
        channel: 'VTV5 / TV360',
        m3u8: 'https://live.a.fptplay53.net/live/media/vtv5/live247-hls-avc/index.m3u8',
        link: 'https://vtvgo.vn/xem-truc-tuyen-kenh-vtv5-5.html',
        status: 'Sắp diễn ra'
    },
    {
        homeTeam: 'Ghana',
        homeFlag: '🇬🇭',
        awayTeam: 'Panama',
        awayFlag: '🇵🇦',
        time: '06:00 - Ngày Mai',
        group: 'Bảng L - World Cup',
        channel: 'VTV3 / VTV Cần Thơ',
        m3u8: 'https://live.fptplay53.net/live/media/vtv3/live247-hls-avc/index.m3u8',
        link: 'https://vtvgo.vn/xem-truc-tuyen-kenh-vtv3-3.html',
        status: 'Sắp diễn ra'
    },
    {
        homeTeam: 'Uzbekistan',
        homeFlag: '🇺🇿',
        awayTeam: 'Colombia',
        awayFlag: '🇨🇴',
        time: '09:00 - Ngày Mai',
        group: 'Bảng K - World Cup',
        channel: 'VTV5 / TV360',
        m3u8: 'https://live.a.fptplay53.net/live/media/vtv5/live247-hls-avc/index.m3u8',
        link: 'https://vtvgo.vn/xem-truc-tuyen-kenh-vtv5-5.html',
        status: 'Sắp diễn ra'
    }
];

function renderWorldCupMatches() {
    const container = document.getElementById('world-cup-matches');
    if (!container) return;
    
    container.innerHTML = WORLD_CUP_MATCHES.map((match, idx) => {
        const statusBadge = match.status === 'Trực tiếp' 
            ? `<span class="live-badge-card" style="background: var(--red); color: white; font-size: 0.7rem; font-weight: 800; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px; animation: pulse 1.5s infinite; display: inline-flex; align-items: center; gap: 4px;"><span style="display:inline-block; width:5px; height:5px; background:white; border-radius:50%;"></span>LIVE</span>`
            : `<span style="background: rgba(255,255,255,0.06); padding: 2px 8px; border-radius: 10px; color: var(--t2); font-weight: 600;">${match.status}</span>`;

        const isLive = match.status === 'Trực tiếp';
        const buttonsHtml = isLive 
            ? `
                <button class="match-btn" onclick="playMatchLive(${idx})" style="flex: 1; background: var(--red); border: none; color: white; font-size: 0.85rem; font-weight: 700; padding: 10px 14px; border-radius: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 4px 15px rgba(229,9,20,0.3); transition: all 0.2s ease;">
                    <i class="fas fa-play"></i> Xem trực tiếp
                </button>
                <button class="match-btn-fallback" onclick="window.open('${match.link}', '_blank')" style="flex: 1; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); color: var(--t2); font-size: 0.85rem; font-weight: 600; padding: 10px 14px; border-radius: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s ease;">
                    <i class="fas fa-external-link-alt"></i> VTV Go backup
                </button>
            `
            : `
                <button class="match-btn-fallback" onclick="window.open('${match.link}', '_blank')" style="width: 100%; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); color: var(--t2); font-size: 0.85rem; font-weight: 600; padding: 10px 14px; border-radius: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s ease;">
                    <i class="fas fa-external-link-alt"></i> Xem trên ${match.channel.includes('TV360') ? 'TV360' : 'VTV Go'}
                </button>
            `;

        return `
            <div class="match-card" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 20px; transition: all 0.25s ease; backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; font-size: 0.8rem; color: var(--t3);">
                    <span>${match.group}</span>
                    ${statusBadge}
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between; margin: 20px 0;">
                    <div style="text-align: center; flex: 1;">
                        <div style="font-size: 2.2rem; margin-bottom: 8px;">${match.homeFlag}</div>
                        <div style="font-size: 0.95rem; font-weight: 700; color: var(--white);">${match.homeTeam}</div>
                    </div>
                    <div style="font-size: 0.85rem; font-weight: 800; color: var(--red); background: rgba(229,9,20,0.1); padding: 4px 12px; border-radius: 12px; border: 1px solid rgba(229,9,20,0.2);">VS</div>
                    <div style="text-align: center; flex: 1;">
                        <div style="font-size: 2.2rem; margin-bottom: 8px;">${match.awayFlag}</div>
                        <div style="font-size: 0.95rem; font-weight: 700; color: var(--white);">${match.awayTeam}</div>
                    </div>
                </div>
                <div style="text-align: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 14px; display: flex; flex-direction: column; gap: 8px;">
                    <div style="font-size: 0.9rem; font-weight: 700; color: var(--t2); margin-bottom: 2px;"><i class="far fa-clock" style="margin-right: 6px;"></i>${match.time}</div>
                    <div style="font-size: 0.8rem; color: var(--t3); margin-bottom: 6px;">Phát sóng: <b>${match.channel}</b></div>
                    <div style="display: flex; gap: 10px; width: 100%;">
                        ${buttonsHtml}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function openLiveTVPage() {
    document.getElementById('home-view').style.display = 'none';
    document.getElementById('browse').hidden = true;
    
    const tvView = document.getElementById('live-tv-view');
    if (tvView) {
        tvView.hidden = false;
    }
    
    renderWorldCupMatches();
    if (typeof renderTVChannels === 'function') {
        renderTVChannels('all');
    }
    if (typeof setupTVTabs === 'function') {
        setupTVTabs();
    }
    const fullSchedule = document.getElementById('full-schedule-section');
    if (fullSchedule) {
        fullSchedule.style.display = 'none';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.openTVChannel = function(channelId) {
    // Look up channel from the single source of truth
    const channel = TV_CHANNELS_DATA.find(ch => ch.key === channelId);
    if (!channel || !channel.m3u8) {
        if (channel && channel.fallback) window.open(channel.fallback, '_blank');
        return;
    }
    
    VIPPlayer.load(channel.m3u8, null, true);
    
    const modalTitle = document.getElementById('vip-modal-title');
    if (modalTitle) {
        modalTitle.textContent = `Đang phát: ${channel.name} (Trực Tiếp)`;
    }
    
    let backupBtn = document.getElementById('vip-btn-backup-tv');
    if (!backupBtn) {
        const controlsRight = document.querySelector('.vip-controls-right');
        if (controlsRight) {
            backupBtn = document.createElement('button');
            backupBtn.id = 'vip-btn-backup-tv';
            backupBtn.className = 'vip-control-btn';
            backupBtn.title = 'Xem Link Dự Phòng';
            backupBtn.innerHTML = '<i class="fas fa-external-link-alt" style="color:#ffd700;"></i>';
            backupBtn.style.marginRight = '12px';
            controlsRight.insertBefore(backupBtn, controlsRight.firstChild);
        }
    }
    if (backupBtn) {
        backupBtn.style.display = 'inline-flex';
        backupBtn.onclick = (e) => {
            e.stopPropagation();
            window.open(channel.fallback, '_blank');
        };
    }
};

window.playMatchLive = function(matchIndex) {
    const match = WORLD_CUP_MATCHES[matchIndex];
    if (!match) return;
    
    VIPPlayer.load(match.m3u8, null, true);
    
    const modalTitle = document.getElementById('vip-modal-title');
    if (modalTitle) {
        modalTitle.textContent = `Trực tiếp World Cup: ${match.homeTeam} vs ${match.awayTeam}`;
    }
    
    let backupBtn = document.getElementById('vip-btn-backup-tv');
    if (!backupBtn) {
        const controlsRight = document.querySelector('.vip-controls-right');
        if (controlsRight) {
            backupBtn = document.createElement('button');
            backupBtn.id = 'vip-btn-backup-tv';
            backupBtn.className = 'vip-control-btn';
            backupBtn.title = 'Xem Link Dự Phòng';
            backupBtn.innerHTML = '<i class="fas fa-external-link-alt" style="color:#ffd700;"></i>';
            backupBtn.style.marginRight = '12px';
            controlsRight.insertBefore(backupBtn, controlsRight.firstChild);
        }
    }
    if (backupBtn) {
        backupBtn.style.display = 'inline-flex';
        backupBtn.onclick = (e) => {
            e.stopPropagation();
            window.open(match.link, '_blank');
        };
    }
};

// ══════════════════════════════════════════════════════════
//  FULL WORLD CUP TOURNAMENT SCHEDULE DATA
// ══════════════════════════════════════════════════════════
const FULL_WORLD_CUP_SCHEDULE = [
    // Group Stage - Lượt trận 1
    { date: '18/06', time: '18:00', round: 'Vòng Bảng - Lượt 1', group: 'Bảng A', home: 'Qatar 🇶🇦', away: 'Ecuador 🇪🇨', channel: 'VTV2', link: 'https://vtvgo.vn/xem-truc-tuyen-kenh-vtv2-2.html' },
    { date: '18/06', time: '21:00', round: 'Vòng Bảng - Lượt 1', group: 'Bảng A', home: 'Senegal 🇸🇳', away: 'Hà Lan 🇳🇱', channel: 'VTV5', link: 'https://vtvgo.vn/xem-truc-tuyen-kenh-vtv5-5.html' },
    { date: '19/06', time: '00:00', round: 'Vòng Bảng - Lượt 1', group: 'Bảng B', home: 'Anh 🏴󠁧󠁢󠁥󠁮󠁧󠁿', away: 'Iran 🇮🇷', channel: 'VTV3', link: 'https://vtvgo.vn/xem-truc-tuyen-kenh-vtv3-3.html' },
    { date: '19/06', time: '03:00', round: 'Vòng Bảng - Lượt 1', group: 'Bảng B', home: 'Mỹ 🇺🇸', away: 'Xứ Wales 🏴󠁧󠁢󠁷󠁬󠁳󠁿', channel: 'VTV2', link: 'https://vtvgo.vn/xem-truc-tuyen-kenh-vtv2-2.html' },
    { date: '19/06', time: '18:00', round: 'Vòng Bảng - Lượt 1', group: 'Bảng C', home: 'Argentina 🇦🇷', away: 'Saudi Arabia 🇸🇦', channel: 'VTV5', link: 'https://vtvgo.vn/xem-truc-tuyen-kenh-vtv5-5.html' },
    { date: '19/06', time: '21:00', round: 'Vòng Bảng - Lượt 1', group: 'Bảng C', home: 'Mexico 🇲🇽', away: 'Ba Lan 🇵🇱', channel: 'VTV2', link: 'https://vtvgo.vn/xem-truc-tuyen-kenh-vtv2-2.html' },
    
    // Group Stage - Lượt trận 2
    { date: '20/06', time: '18:00', round: 'Vòng Bảng - Lượt 2', group: 'Bảng A', home: 'Qatar 🇶🇦', away: 'Senegal 🇸🇳', channel: 'VTV5', link: 'https://vtvgo.vn/xem-truc-tuyen-kenh-vtv5-5.html' },
    { date: '20/06', time: '21:00', round: 'Vòng Bảng - Lượt 2', group: 'Bảng A', home: 'Hà Lan 🇳🇱', away: 'Ecuador 🇪🇨', channel: 'VTV3', link: 'https://vtvgo.vn/xem-truc-tuyen-kenh-vtv3-3.html' },
    { date: '21/06', time: '00:00', round: 'Vòng Bảng - Lượt 2', group: 'Bảng B', home: 'Xứ Wales 🏴󠁧󠁢󠁷󠁬󠁳󠁿', away: 'Iran 🇮🇷', channel: 'VTV2', link: 'https://vtvgo.vn/xem-truc-tuyen-kenh-vtv2-2.html' },
    { date: '21/06', time: '03:00', round: 'Vòng Bảng - Lượt 2', group: 'Bảng B', home: 'Anh 🏴󠁧󠁢󠁥󠁮󠁧󠁿', away: 'Mỹ 🇺🇸', channel: 'VTV3', link: 'https://vtvgo.vn/xem-truc-tuyen-kenh-vtv3-3.html' },
    
    // Play-offs (Round of 16)
    { date: '28/06', time: '22:00', round: 'Vòng 16 Đội', group: 'Trận 49', home: 'Nhất Bảng A', away: 'Nhì Bảng B', channel: 'VTV2 / VTV Cần Thơ', link: 'https://vtvgo.vn/xem-truc-tuyen-kenh-vtv-c%E1%BB%A5n-th%C6%A1-6.html' },
    { date: '29/06', time: '02:00', round: 'Vòng 16 Đội', group: 'Trận 50', home: 'Nhất Bảng C', away: 'Nhì Bảng D', channel: 'VTV3', link: 'https://vtvgo.vn/xem-truc-tuyen-kenh-vtv3-3.html' },
    { date: '29/06', time: '22:00', round: 'Vòng 16 Đội', group: 'Trận 51', home: 'Nhất Bảng D', away: 'Nhì Bảng C', channel: 'VTV2', link: 'https://vtvgo.vn/xem-truc-tuyen-kenh-vtv2-2.html' },
    { date: '30/06', time: '02:00', round: 'Vòng 16 Đội', group: 'Trận 52', home: 'Nhất Bảng B', away: 'Nhì Bảng A', channel: 'VTV3', link: 'https://vtvgo.vn/xem-truc-tuyen-kenh-vtv3-3.html' },
    
    // Quarter-finals
    { date: '02/07', time: '22:00', round: 'Vòng Tứ Kết', group: 'Tứ Kết 1', home: 'Thắng Trận 49', away: 'Thắng Trận 50', channel: 'VTV2 / VTV Cần Thơ', link: 'https://vtvgo.vn/xem-truc-tuyen-kenh-vtv-c%E1%BB%A5n-th%C6%A1-6.html' },
    { date: '03/07', time: '02:00', round: 'Vòng Tứ Kết', group: 'Tứ Kết 2', home: 'Thắng Trận 53', away: 'Thắng Trận 54', channel: 'VTV3', link: 'https://vtvgo.vn/xem-truc-tuyen-kenh-vtv3-3.html' },
    { date: '03/07', time: '22:00', round: 'Vòng Tứ Kết', group: 'Tứ Kết 3', home: 'Thắng Trận 51', away: 'Thắng Trận 52', channel: 'VTV2 / VTV Cần Thơ', link: 'https://vtvgo.vn/xem-truc-tuyen-kenh-vtv-c%E1%BB%A5n-th%C6%A1-6.html' },
    { date: '04/07', time: '02:00', round: 'Vòng Tứ Kết', group: 'Tứ Kết 4', home: 'Thắng Trận 55', away: 'Thắng Trận 56', channel: 'VTV3', link: 'https://vtvgo.vn/xem-truc-tuyen-kenh-vtv3-3.html' },
    
    // Semi-finals
    { date: '06/07', time: '02:00', round: 'Vòng Bán Kết', group: 'Bán Kết 1', home: 'Thắng Tứ Kết 1', away: 'Thắng Tứ Kết 2', channel: 'VTV3', link: 'https://vtvgo.vn/xem-truc-tuyen-kenh-vtv3-3.html' },
    { date: '07/07', time: '02:00', round: 'Vòng Bán Kết', group: 'Bán Kết 2', home: 'Thắng Tứ Kết 3', away: 'Thắng Tứ Kết 4', channel: 'VTV3', link: 'https://vtvgo.vn/xem-truc-tuyen-kenh-vtv3-3.html' },
    
    // Final
    { date: '10/07', time: '02:00', round: 'Chung Kết', group: 'Chung Kết', home: 'Thắng Bán Kết 1', away: 'Thắng Bán Kết 2', channel: 'VTV3 / VTV Cần Thơ', link: 'https://vtvgo.vn/xem-truc-tuyen-kenh-vtv3-3.html' }
];

// ══════════════════════════════════════════════════════════
//  TV CHANNELS DATA (EXPANDED LIST)
// ══════════════════════════════════════════════════════════
const TV_CHANNELS_DATA = [
    {
        key: 'vtv1',
        name: 'VTV1 HD',
        category: 'national',
        logoText: 'VTV1',
        logoBg: 'linear-gradient(135deg, #e50914, #b20710)',
        logoShadow: 'rgba(229,9,20,0.3)',
        description: 'Kênh Thời sự - Chính trị',
        provider: 'Truyền hình Quốc gia VTV1',
        m3u8: 'https://live.fptplay53.net/live/media/vtv1/live247-hls-avc/index.m3u8',
        fallback: 'https://vtvgo.vn/xem-truc-tuyen-kenh-vtv1-1.html'
    },
    {
        key: 'vtv2',
        name: 'VTV2 HD',
        category: 'national',
        logoText: 'VTV2',
        logoBg: 'linear-gradient(135deg, #0072bc, #00558f)',
        logoShadow: 'rgba(0,114,188,0.3)',
        description: 'Kênh Khoa học - Giáo dục',
        provider: 'Truyền hình Quốc gia VTV2',
        m3u8: 'https://live.fptplay53.net/live/media/vtv2/live247-hls-avc/index.m3u8',
        fallback: 'https://vtvgo.vn/xem-truc-tuyen-kenh-vtv2-2.html'
    },
    {
        key: 'vtv3',
        name: 'VTV3 HD',
        category: 'national',
        logoText: 'VTV3',
        logoBg: 'linear-gradient(135deg, #39b54a, #2b8c38)',
        logoShadow: 'rgba(57,181,74,0.3)',
        description: 'Kênh Giải trí tổng hợp',
        provider: 'Truyền hình Quốc gia VTV3',
        m3u8: 'https://live.fptplay53.net/live/media/vtv3/live247-hls-avc/index.m3u8',
        fallback: 'https://vtvgo.vn/xem-truc-tuyen-kenh-vtv3-3.html'
    },
    {
        key: 'vtv5',
        name: 'VTV5 HD',
        category: 'national',
        logoText: 'VTV5',
        logoBg: 'linear-gradient(135deg, #f7941d, #c27214)',
        logoShadow: 'rgba(247,148,29,0.3)',
        description: 'Kênh Truyền hình dân tộc',
        provider: 'Truyền hình Quốc gia VTV5',
        m3u8: 'https://live.a.fptplay53.net/live/media/vtv5/live247-hls-avc/index.m3u8',
        fallback: 'https://vtvgo.vn/xem-truc-tuyen-kenh-vtv5-5.html'
    },
    {
        key: 'vtv8',
        name: 'VTV8 HD',
        category: 'national',
        logoText: 'VTV8',
        logoBg: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
        logoShadow: 'rgba(139,92,246,0.3)',
        description: 'Kênh Miền Trung - Tây Nguyên',
        provider: 'Truyền hình Quốc gia VTV8',
        m3u8: 'https://live.fptplay53.net/live/media/vtv8/live247-hls-avc/index.m3u8',
        fallback: 'https://vtvgo.vn/xem-truc-tuyen-kenh-vtv8-8.html'
    },
    {
        key: 'vtv9',
        name: 'VTV9 HD',
        category: 'national',
        logoText: 'VTV9',
        logoBg: 'linear-gradient(135deg, #06b6d4, #0891b2)',
        logoShadow: 'rgba(6,182,212,0.3)',
        description: 'Kênh Truyền hình Nam Bộ',
        provider: 'Truyền hình Quốc gia VTV9',
        m3u8: 'https://live.fptplay53.net/live/media/vtv9/live247-hls-avc/index.m3u8',
        fallback: 'https://vtvgo.vn/xem-truc-tuyen-kenh-vtv9-9.html'
    },
    {
        key: 'vtv-can-tho',
        name: 'VTV Cần Thơ',
        category: 'local',
        logoText: 'VTV Cần Thơ',
        logoBg: 'linear-gradient(135deg, #ec1c24, #b90d13)',
        logoShadow: 'rgba(236,28,36,0.3)',
        description: 'Kênh Tây Nam Bộ (VTV6 cũ)',
        provider: 'Truyền hình Quốc gia VTV Cần Thơ',
        m3u8: 'https://live.fptplay53.net/live/media/vtv6/live247-hls-avc/index.m3u8',
        fallback: 'https://vtvgo.vn/xem-truc-tuyen-kenh-vtv-c%E1%BB%A5n-th%C6%A1-6.html'
    },
    {
        key: 'htv7',
        name: 'HTV7 HD',
        category: 'entertainment',
        logoText: 'HTV7',
        logoBg: 'linear-gradient(135deg, #ff007f, #99004c)',
        logoShadow: 'rgba(255,0,127,0.3)',
        description: 'Kênh Giải trí & Phim truyện',
        provider: 'Đài Truyền hình TP.HCM (HTV)',
        m3u8: 'http://103.199.161.85/ip/2/hls/htv7/index.m3u8',
        fallback: 'https://hplus.com.vn/xem-kenh-htv7-hd-256.html'
    },
    {
        key: 'htv9',
        name: 'HTV9 HD',
        category: 'entertainment',
        logoText: 'HTV9',
        logoBg: 'linear-gradient(135deg, #ff5722, #bf360c)',
        logoShadow: 'rgba(255,87,34,0.3)',
        description: 'Kênh Tin tức & Tổng hợp',
        provider: 'Đài Truyền hình TP.HCM (HTV)',
        m3u8: 'http://103.199.161.85/ip/2/hls/htv9/index.m3u8',
        fallback: 'https://hplus.com.vn/xem-kenh-htv9-hd-257.html'
    },
    {
        key: 'vtc3',
        name: 'VTC3 HD',
        category: 'sports',
        logoText: 'VTC3',
        logoBg: 'linear-gradient(135deg, #10b981, #047857)',
        logoShadow: 'rgba(16,185,129,0.3)',
        description: 'Kênh Văn hóa - Thể thao VTC',
        provider: 'Đài Truyền hình Kỹ thuật số VTC',
        m3u8: 'https://live.fptplay53.net/live/media/vtc3/live247-hls-avc/index.m3u8',
        fallback: 'https://vtc.gov.vn/kenh/vtc3'
    },
    {
        key: 'tv360',
        name: 'TV360 Viettel',
        category: 'sports',
        logoText: 'TV360',
        logoBg: 'linear-gradient(135deg, #182a4c, #13203a)',
        logoShadow: 'rgba(32,224,255,0.15)',
        description: 'Cổng truyền hình thể thao Viettel',
        provider: 'Phát trực tiếp bản quyền bóng đá',
        m3u8: null,
        fallback: 'http://tv360.vn/'
    },
    {
        key: 'vtv4',
        name: 'VTV4 HD',
        category: 'national',
        logoText: 'VTV4',
        logoBg: 'linear-gradient(135deg, #d946ef, #a21caf)',
        logoShadow: 'rgba(217,70,239,0.3)',
        description: 'Kênh Phục vụ Kiều bào',
        provider: 'Truyền hình Quốc gia VTV4',
        m3u8: 'https://live.fptplay53.net/live/media/vtv4/live247-hls-avc/index.m3u8',
        fallback: 'https://vtvgo.vn/xem-truc-tuyen-kenh-vtv4-4.html'
    },
    {
        key: 'vtv7',
        name: 'VTV7 HD',
        category: 'entertainment',
        logoText: 'VTV7',
        logoBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
        logoShadow: 'rgba(245,158,11,0.3)',
        description: 'Kênh Thiếu nhi & Giáo dục',
        provider: 'Truyền hình Quốc gia VTV7',
        m3u8: 'https://live.fptplay53.net/live/media/vtv7/live247-hls-avc/index.m3u8',
        fallback: 'https://vtvgo.vn/xem-truc-tuyen-kenh-vtv7-359.html'
    },
    {
        key: 'thvl1',
        name: 'THVL1 HD',
        category: 'entertainment',
        logoText: 'THVL1',
        logoBg: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
        logoShadow: 'rgba(37,99,235,0.3)',
        description: 'Kênh Giải trí tổng hợp Vĩnh Long',
        provider: 'Đài PT-TH Vĩnh Long',
        m3u8: 'https://live.fptplay53.net/live/media/thvl1/live247-hls-avc/index.m3u8',
        fallback: 'https://www.thvl.vn/live/thvl1-hd/'
    },
    {
        key: 'thvl2',
        name: 'THVL2 HD',
        category: 'entertainment',
        logoText: 'THVL2',
        logoBg: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
        logoShadow: 'rgba(14,165,233,0.3)',
        description: 'Kênh Phim truyện Vĩnh Long',
        provider: 'Đài PT-TH Vĩnh Long',
        m3u8: 'https://live.fptplay53.net/live/media/thvl2/live247-hls-avc/index.m3u8',
        fallback: 'https://www.thvl.vn/live/thvl2-hd/'
    },
    {
        key: 'vtc1',
        name: 'VTC1 HD',
        category: 'national',
        logoText: 'VTC1',
        logoBg: 'linear-gradient(135deg, #dc2626, #991b1b)',
        logoShadow: 'rgba(220,38,38,0.3)',
        description: 'Kênh Tin tức & Thời sự VTC',
        provider: 'Đài Truyền hình Kỹ thuật số VTC',
        m3u8: 'https://live.fptplay53.net/live/media/vtc1/live247-hls-avc/index.m3u8',
        fallback: 'https://vtc.gov.vn/kenh/vtc1'
    },
    {
        key: 'vtc14',
        name: 'VTC14 HD',
        category: 'national',
        logoText: 'VTC14',
        logoBg: 'linear-gradient(135deg, #ea580c, #c2410c)',
        logoShadow: 'rgba(234,88,12,0.3)',
        description: 'Kênh Thời tiết & Đời sống',
        provider: 'Đài Truyền hình Kỹ thuật số VTC',
        m3u8: 'https://live.fptplay53.net/live/media/vtc14/live247-hls-avc/index.m3u8',
        fallback: 'https://vtc.gov.vn/kenh/vtc14'
    },
    {
        key: 'htv-the-thao',
        name: 'HTV Thể Thao',
        category: 'sports',
        logoText: 'HTV TT',
        logoBg: 'linear-gradient(135deg, #16a34a, #15803d)',
        logoShadow: 'rgba(22,163,74,0.3)',
        description: 'Kênh Thể thao TP.HCM',
        provider: 'Đài Truyền hình TP.HCM',
        m3u8: null,
        fallback: 'https://hplus.com.vn/xem-kenh-htv-the-thao-277.html'
    },
    {
        key: 'on-sports',
        name: 'On Sports',
        category: 'sports',
        logoText: 'ON',
        logoBg: 'linear-gradient(135deg, #f97316, #ea580c)',
        logoShadow: 'rgba(249,115,22,0.3)',
        description: 'Kênh Thể thao trực tuyến',
        provider: 'Truyền hình thể thao On Sports',
        m3u8: null,
        fallback: 'https://onsportstv.com/'
    },
    {
        key: 'k-plus',
        name: 'K+ PM',
        category: 'sports',
        logoText: 'K+',
        logoBg: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
        logoShadow: 'rgba(124,58,237,0.3)',
        description: 'Kênh Thể thao cao cấp K+',
        provider: 'Truyền hình K+ Vietnam',
        m3u8: null,
        fallback: 'https://kplus.vn/'
    },
    {
        key: 'fpt-play',
        name: 'FPT Play',
        category: 'sports',
        logoText: 'FPT',
        logoBg: 'linear-gradient(135deg, #e11d48, #be123c)',
        logoShadow: 'rgba(225,29,72,0.3)',
        description: 'Nền tảng xem thể thao trực tuyến',
        provider: 'FPT Telecom',
        m3u8: null,
        fallback: 'https://fptplay.vn/xem-truyen-hinh'
    },
    {
        key: 'sctv',
        name: 'SCTV HD',
        category: 'entertainment',
        logoText: 'SCTV',
        logoBg: 'linear-gradient(135deg, #0d9488, #0f766e)',
        logoShadow: 'rgba(13,148,136,0.3)',
        description: 'Kênh Truyền hình cáp SCTV',
        provider: 'Truyền hình cáp Saigontourist',
        m3u8: null,
        fallback: 'https://www.sctv.com.vn/'
    },
    {
        key: 'bibi',
        name: 'BiBi TV',
        category: 'entertainment',
        logoText: 'BiBi',
        logoBg: 'linear-gradient(135deg, #ec4899, #db2777)',
        logoShadow: 'rgba(236,72,153,0.3)',
        description: 'Kênh Thiếu nhi & Hoạt hình',
        provider: 'Truyền hình BiBi (SCTV22)',
        m3u8: null,
        fallback: 'https://www.sctv.com.vn/kenh-truyen-hinh/sctv22-bibi'
    },
    {
        key: 'antv',
        name: 'ANTV HD',
        category: 'national',
        logoText: 'ANTV',
        logoBg: 'linear-gradient(135deg, #b91c1c, #991b1b)',
        logoShadow: 'rgba(185,28,28,0.3)',
        description: 'Kênh Truyền hình Công an Nhân dân',
        provider: 'An ninh TV',
        m3u8: 'https://live.fptplay53.net/live/media/antv/live247-hls-avc/index.m3u8',
        fallback: 'https://antv.gov.vn/xem-truc-tuyen.html'
    },
    {
        key: 'quochoi',
        name: 'Truyền hình Quốc hội',
        category: 'national',
        logoText: 'QH',
        logoBg: 'linear-gradient(135deg, #ca8a04, #a16207)',
        logoShadow: 'rgba(202,138,4,0.3)',
        description: 'Kênh Truyền hình Quốc hội Việt Nam',
        provider: 'Truyền hình Quốc hội',
        m3u8: 'https://live.fptplay53.net/live/media/truyenhinhquochoi/live247-hls-avc/index.m3u8',
        fallback: 'https://quochoitv.vn/livetv'
    },
    {
        key: 'htv-phim',
        name: 'HTV Phim',
        category: 'entertainment',
        logoText: 'HTV Phim',
        logoBg: 'linear-gradient(135deg, #9333ea, #7e22ce)',
        logoShadow: 'rgba(147,51,234,0.3)',
        description: 'Kênh Phim truyện HTV',
        provider: 'Đài Truyền hình TP.HCM',
        m3u8: null,
        fallback: 'https://hplus.com.vn/xem-kenh-htv-phim-hd-371.html'
    },
    {
        key: 'vnews',
        name: 'VNEWS HD',
        category: 'national',
        logoText: 'VNEWS',
        logoBg: 'linear-gradient(135deg, #1e40af, #1e3a8a)',
        logoShadow: 'rgba(30,64,175,0.3)',
        description: 'Kênh Thông tấn xã Việt Nam',
        provider: 'TTXVN (VTV)',
        m3u8: 'https://live.fptplay53.net/live/media/vnews/live247-hls-avc/index.m3u8',
        fallback: 'https://vnews.gov.vn/video-truc-tuyen.htm'
    }
];

// ══════════════════════════════════════════════════════════
//  DYNAMIC SCHEDULE & TV CHANNELS RENDER METHODS
// ══════════════════════════════════════════════════════════
window.toggleFullSchedule = function() {
    const section = document.getElementById('full-schedule-section');
    const btn = document.getElementById('btn-toggle-full-schedule');
    if (!section || !btn) return;
    
    const isHidden = section.style.display === 'none' || section.style.display === '';
    if (isHidden) {
        window.renderFullSchedule();
        section.style.display = 'block';
        btn.innerHTML = '<i class="far fa-calendar-times"></i> Thu gọn lịch thi đấu';
        btn.style.background = 'rgba(229,9,20,0.15)';
        btn.style.borderColor = 'rgba(229,9,20,0.3)';
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        section.style.display = 'none';
        btn.innerHTML = '<i class="far fa-calendar-alt"></i> Xem toàn bộ lịch thi đấu';
        btn.style.background = '';
        btn.style.borderColor = '';
    }
};

window.renderFullSchedule = function() {
    const container = document.getElementById('full-schedule-table-body');
    if (!container) return;
    
    container.innerHTML = FULL_WORLD_CUP_SCHEDULE.map(item => `
        <tr class="schedule-row" style="border-bottom: 1px solid rgba(255,255,255,0.04); transition: all 0.2s ease;">
            <td style="padding: 14px 16px; font-weight: 700; color: var(--red);">${item.date}</td>
            <td style="padding: 14px 16px; color: var(--t2); font-family: monospace;">${item.time}</td>
            <td style="padding: 14px 16px; font-size: 0.82rem; font-weight: 600;"><span style="background: rgba(255,255,255,0.06); padding: 3px 8px; border-radius: 4px; color: var(--t3);">${item.round}</span></td>
            <td style="padding: 14px 16px; color: var(--t4); font-size: 0.85rem;">${item.group}</td>
            <td style="padding: 14px 16px; font-weight: 700; color: var(--white); text-align: right; width: 25%;">${item.home}</td>
            <td style="padding: 14px 16px; font-weight: 800; color: var(--red); text-align: center; width: 6%; background: rgba(229,9,20,0.04);">VS</td>
            <td style="padding: 14px 16px; font-weight: 700; color: var(--white); text-align: left; width: 25%;">${item.away}</td>
            <td style="padding: 14px 16px; font-size: 0.82rem; color: var(--t2); font-weight: 600;">${item.channel}</td>
            <td style="padding: 14px 16px; text-align: right;">
                <button onclick="window.open('${item.link}', '_blank')" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: var(--t2); font-size: 0.75rem; font-weight: 600; padding: 6px 12px; border-radius: 12px; cursor: pointer; transition: all 0.2s ease;">
                    <i class="fas fa-external-link-alt" style="font-size:0.7rem;"></i> Xem kênh
                </button>
            </td>
        </tr>
    `).join('');
};

window.renderTVChannels = function(categoryFilter = 'all') {
    const container = document.getElementById('tv-channels-grid');
    if (!container) return;
    
    const filtered = categoryFilter === 'all' 
        ? TV_CHANNELS_DATA 
        : TV_CHANNELS_DATA.filter(ch => ch.category === categoryFilter);
        
    container.innerHTML = filtered.map(channel => {
        const logoBorderColor = channel.logoShadow ? `box-shadow: 0 4px 15px ${channel.logoShadow};` : '';
        const clickHandler = channel.m3u8 
            ? `openTVChannel('${channel.key}')` 
            : `window.open('${channel.fallback}', '_blank')`;
            
        const liveLabel = channel.m3u8 
            ? `<span style="font-size: 0.75rem; background: rgba(229,9,20,0.15); border: 1px solid rgba(229,9,20,0.3); color: var(--red); padding: 2px 8px; border-radius: 10px; font-weight: 700;"><i class="fas fa-play" style="font-size:0.65rem; margin-right:4px;"></i>Phát trên Web</span>`
            : `<span style="font-size: 0.75rem; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: var(--t3); padding: 2px 8px; border-radius: 10px; font-weight: 700;"><i class="fas fa-external-link-alt" style="font-size:0.65rem; margin-right:4px;"></i>Liên kết ngoài</span>`;
            
        return `
            <div class="tv-card" onclick="${clickHandler}" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 24px; text-align: center; cursor: pointer; transition: all 0.25s ease; backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);">
                <div class="tv-logo-box" style="height: 60px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                    <span style="font-size: 2.2rem; font-weight: 900; color: #fff; background: ${channel.logoBg}; padding: 4px 18px; border-radius: 6px; ${logoBorderColor} font-family: 'Inter', sans-serif;">${channel.logoText}</span>
                </div>
                <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--white); margin: 0 0 6px 0;">${channel.name}</h3>
                <p style="font-size: 0.8rem; color: var(--t3); margin: 0 0 12px 0;">${channel.description}</p>
                <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                    ${liveLabel}
                </div>
                <button class="btn-xem-tv" onclick="event.stopPropagation(); window.open('${channel.fallback}', '_blank')" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: var(--t2); font-size: 0.85rem; font-weight: 600; padding: 8px 18px; border-radius: 20px; width: 100%; transition: all 0.2s ease; cursor: pointer;">
                    <i class="fas fa-external-link-alt" style="margin-right: 6px;"></i> Xem kênh chính thức
                </button>
            </div>
        `;
    }).join('');
};

window.setupTVTabs = function() {
    const tabContainer = document.getElementById('tv-category-tabs');
    if (!tabContainer) return;
    
    const tabs = tabContainer.querySelectorAll('.tv-tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const category = tab.getAttribute('data-category');
            window.renderTVChannels(category);
        });
    });
};
