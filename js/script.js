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
async function apiFetch(url, opts = {}) {
    const k = opts.signal ? null : url;
    if (k && _cache.has(k)) return _cache.get(k);
    const r = await fetch(url, opts); if (!r.ok) throw new Error(r.status);
    const d = await r.json(); if (k) _cache.set(k, d); return d;
}
function normalizeList(raw) { return raw.items || raw.data?.items || []; }

// ══════════════════════════════════════════════════════════
//  LOCALSTORAGE MANAGER
// ══════════════════════════════════════════════════════════
const STORAGE = {
    HISTORY_KEY: 'longphim_history',
    MYLIST_KEY: 'longphim_mylist',
    RATINGS_KEY: 'longphim_ratings',
    NOTES_KEY: 'longphim_notes',
    PROGRESS_KEY: 'longphim_progress',
    MAX_HISTORY: 20,

    _get(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } },
    _set(key, arr) { localStorage.setItem(key, JSON.stringify(arr)); },

    // ---- History ----
    getHistory() { return this._get(this.HISTORY_KEY); },
    addHistory(movie) {
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
    getMyList() { return this._get(this.MYLIST_KEY); },
    isInMyList(slug) { return this.getMyList().some(m => m.slug === slug); },
    toggleMyList(movie) {
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

    // ---- Notes ----
    getNotes() { return this._get(this.NOTES_KEY); },
    getNote(slug) {
        const list = this.getNotes();
        const found = list.find(n => n.slug === slug);
        return found ? found.note : '';
    },
    saveNote(slug, note) {
        let list = this.getNotes().filter(n => n.slug !== slug);
        if (note.trim() !== '') {
            list.push({ slug, note: note.trim(), time: Date.now() });
        }
        this._set(this.NOTES_KEY, list);
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
    if (typeof VIPPlayer !== 'undefined') VIPPlayer.init();
    loadAll();
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

    // Logo click → home
    document.getElementById('nav-logo').addEventListener('click', () => {
        showHome();
        document.querySelectorAll('.nav__link').forEach(l => l.classList.remove('active'));
        document.getElementById('link-home')?.classList.add('active');
    });

    // Pager
    document.getElementById('browse-prev').addEventListener('click', () => {
        if (browsePage > 1) { browsePage--; loadBrowsePage(); }
    });
    document.getElementById('browse-next').addEventListener('click', () => {
        if (browsePage < browseTotalPages) { browsePage++; loadBrowsePage(); }
    });

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
    browseType = null;
    renderHistoryRow();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openBrowse(type, slug) {
    browseType = type; browseSlug = slug; browsePage = 1;
    document.getElementById('home-view').style.display = 'none';
    document.getElementById('browse').hidden = false;
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
    const prevBtn = document.getElementById('browse-prev');
    const nextBtn = document.getElementById('browse-next');
    const indicator = document.getElementById('browse-page-indicator');

    grid.innerHTML = Array(BROWSE_SIZE).fill('<div class="search-skeleton"></div>').join('');
    prevBtn.disabled = true; nextBtn.disabled = true;

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
        prevBtn.disabled = browsePage <= 1; nextBtn.disabled = browsePage >= totalPages;
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

        // Tránh kích hoạt phím tắt khi người dùng đang gõ ghi chú hoặc tìm kiếm
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

    // Nút Lưu ghi chú cá nhân
    const saveNotesBtn = document.getElementById('modal-save-notes-btn');
    if (saveNotesBtn) {
        saveNotesBtn.addEventListener('click', () => {
            if (!_currentModalSlug) return;
            const input = document.getElementById('modal-notes-input');
            const noteText = input ? input.value : '';
            STORAGE.saveNote(_currentModalSlug, noteText);
            
            showToast(
                'Lưu thành công! 📝',
                'Ghi chú cá nhân của bạn đã được ghi nhớ thành công.',
                'fa-circle-check'
            );
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

    // Đọc rating & note của người dùng từ localStorage
    const savedRating = STORAGE.getRating(slug);
    highlightStars(savedRating);
    const savedNote = STORAGE.getNote(slug);
    const noteInput = document.getElementById('modal-notes-input');
    if (noteInput) noteInput.value = savedNote;

    try {
        const d = await apiFetch(API.detail + slug, { signal: _modalAbort.signal });
        if (reqId !== _modalReqId) return;
        const m = d.movie || {}, eps = d.episodes?.[0]?.server_data || [];

        _currentModalMovie = m;
        _currentEpisodesList = eps;



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

    if (m3u8 && typeof VIPPlayer !== 'undefined') {
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
    load(m3u8Url, embedUrl) {
        this.currentM3u8 = m3u8Url;
        this.currentEmbed = embedUrl;
        this.currentServer = 'vip';

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
        const speedBtn = document.getElementById('vip-btn-speed');
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

        // Add active classes to modal
        const modal = document.getElementById('modal');
        if (modal) {
            modal.classList.add('vip-active');
            modal.classList.add('is-playing');
        }

        // Remove any backup iframes
        const hero = document.getElementById('modal-hero');
        if (hero) {
            hero.querySelectorAll('iframe').forEach(f => f.remove());
        }

        // Show the server selection bar
        const serverBar = document.getElementById('vip-server-bar');
        if (serverBar) serverBar.style.display = 'flex';

        // Show the speed menu and hide it by default
        const speedMenu = document.getElementById('vip-speed-menu');
        if (speedMenu) speedMenu.style.display = 'none';

        // Show controls initially, then autohide
        this.showControls();
        this.resetAutoHide();

        // Start progress save interval (every 5 seconds)
        if (this._saveInterval) clearInterval(this._saveInterval);
        this._saveInterval = setInterval(() => this._saveTimeProgress(), 5000);

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

        // Save last progress time
        this._saveTimeProgress();

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
        if (this.container) this.container.style.display = 'none';

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
            if (!this.video || !this.video.duration) return;
            const rect = progress.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            let percent = (clientX - rect.left) / rect.width;
            percent = Math.max(0, Math.min(1, percent));
            this.video.currentTime = percent * this.video.duration;
            this._updateProgress();
        };

        const onMouseMove = (e) => {
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
            this.isSeeking = true;
            seekTo(e);
            this.showControls();
            this.resetAutoHide();
        }, { passive: true });

        progress.addEventListener('touchmove', (e) => {
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
        
        serverBtns.forEach(btn => els.push(btn));
        
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

    // Request fullscreen on container element
    toggleFullscreen() {
        if (!this.container) return;
        
        if (!document.fullscreenElement) {
            if (this.container.requestFullscreen) {
                this.container.requestFullscreen();
            } else if (this.container.webkitRequestFullscreen) {
                this.container.webkitRequestFullscreen();
            } else if (this.container.mozRequestFullScreen) {
                this.container.mozRequestFullScreen();
            } else if (this.container.msRequestFullscreen) {
                this.container.msRequestFullscreen();
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
        this.resetAutoHide();
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
        const nextBtn = document.getElementById('vip-btn-next');
        if (nextBtn && nextBtn.style.display !== 'none') {
            nextBtn.click();
        } else {
            this.showControls();
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
