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
let _currentEpisode = null;

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
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('modal').getAttribute('aria-hidden') === 'false') closeModal(); });

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
    modal.classList.remove('is-playing');

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
        document.getElementById('modal-play-btn').onclick = () => { if (eps.length) { playEpisode(eps[0], m); const f=document.querySelector('.ep-btn'); if(f) f.classList.add('active'); } };
        if (autoPlay && eps.length) { playEpisode(eps[0], m); const f=document.querySelector('.ep-btn'); if(f) f.classList.add('active'); }
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

    const url = ep.link_embed;
    playInModal(url);
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
    const modal = document.getElementById('modal'), hero = document.getElementById('modal-hero');
    hero.querySelectorAll('iframe').forEach(f => f.remove());
    document.getElementById('modal-hero-img').style.opacity = '';
    const g = hero.querySelector('.modal__hero-gradient'); if (g) g.style.opacity = '';
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (_modalAbort) try { _modalAbort.abort(); } catch {}
    _currentModalSlug = null;
    _currentModalMovie = null;

    modal.classList.remove('is-playing');

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
