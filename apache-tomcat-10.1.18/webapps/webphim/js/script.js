/* ==========================================================
   WebPhim — Netflix Premium Clone JS (Expanded Categories)
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
};

// State
let billboardMovies = [], billboardIdx = 0, billboardTimer = null, progressIv = null;
const BILLBOARD_MS = 8000, ITEMS_PER_PAGE = 6;
const _cache = new Map();
let _modalReqId = 0, _modalAbort = null;
const sliderState = {};

// Browse state
let browseType = null, browseSlug = null, browsePage = 1, browseTotalPages = 1;
const BROWSE_SIZE = 24;
let browseAllItems = [];

// Genre/Country display names
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
//  INIT
// ══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initSearch();
    initModal();
    initBrowse();
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
    let open = false;

    const toggle = () => { open = !open; wrap.classList.toggle('open', open); if (open) setTimeout(() => input.focus(), 100); else { input.value = ''; closeSearch(); } };
    const closeSearch = () => { overlay.hidden = true; open = false; wrap.classList.remove('open'); input.value = ''; };

    btn.addEventListener('click', toggle);
    closeB.addEventListener('click', closeSearch);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !overlay.hidden) closeSearch(); });

    const doSearch = debounce(async q => {
        if (q.length < 2) { overlay.hidden = true; return; }
        overlay.hidden = false; kw.textContent = q; empty.hidden = true;
        grid.innerHTML = Array(12).fill('<div class="search-skeleton"></div>').join('');
        try {
            const d = await apiFetch(`${API.search}?keyword=${encodeURIComponent(q)}&limit=24`);
            const items = d.data?.items || d.items || [];
            if (!items.length) { grid.innerHTML = ''; empty.hidden = false; return; }
            grid.innerHTML = '';
            items.forEach(m => {
                const c = document.createElement('div'); c.className = 'search-card';
                c.innerHTML = `<img src="${img(m.poster_url||m.thumb_url)}" alt="${m.name}" loading="lazy" onerror="this.style.opacity=.2"><div class="search-card__name">${m.name}</div>`;
                c.onclick = () => { closeSearch(); openModal(m.slug); };
                grid.appendChild(c);
            });
        } catch { grid.innerHTML = ''; empty.hidden = false; }
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
    } catch (e) { console.error('loadAll:', e); }
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
    card.innerHTML = `
        <img class="card__img" src="${poster}" alt="${movie.name}" loading="lazy" onerror="this.style.opacity=.2">
        <div class="card__info">
            <div class="card__info-row">
                <div class="card__info-left">
                    <button class="card__mini-btn card__mini-btn--play" data-slug="${movie.slug}" data-play="1" type="button"><i class="fas fa-play"></i></button>
                </div>
                <div class="card__info-right">
                    <button class="card__mini-btn" type="button"><i class="fas fa-thumbs-up"></i></button>
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
    return card;
}

// ══════════════════════════════════════════════════════════
//  BROWSE (Category / Genre / Country / Year)
// ══════════════════════════════════════════════════════════
function initBrowse() {
    // Direct nav links (Phim Bộ, Phim Lẻ, etc.)
    document.querySelectorAll('[data-section="home"]').forEach(el => {
        el.addEventListener('click', e => { e.preventDefault(); showHome(); setActiveNav(el); });
    });
    document.querySelectorAll('[data-browse]').forEach(el => {
        el.addEventListener('click', e => {
            e.preventDefault();
            openBrowse('type', el.dataset.browse);
            setActiveNav(el);
        });
    });

    // Genre dropdown
    document.querySelectorAll('[data-genre]').forEach(el => {
        el.addEventListener('click', e => { e.preventDefault(); openBrowse('genre', el.dataset.genre); clearActiveNav(); });
    });

    // Country dropdown
    document.querySelectorAll('[data-country]').forEach(el => {
        el.addEventListener('click', e => { e.preventDefault(); openBrowse('country', el.dataset.country); clearActiveNav(); });
    });

    // Year dropdown
    document.querySelectorAll('[data-year]').forEach(el => {
        el.addEventListener('click', e => { e.preventDefault(); openBrowse('year', el.dataset.year); clearActiveNav(); });
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openBrowse(type, slug) {
    browseType = type; browseSlug = slug; browsePage = 1;
    document.getElementById('home-view').style.display = 'none';
    document.getElementById('browse').hidden = false;
    document.getElementById('browse-sort').value = 'default';

    // Set title
    let title = slug;
    if (type === 'type') title = TYPE_NAMES[slug] || slug;
    else if (type === 'genre') title = 'Thể loại: ' + (GENRE_NAMES[slug] || slug);
    else if (type === 'country') title = 'Quốc gia: ' + (COUNTRY_NAMES[slug] || slug);
    else if (type === 'year') title = 'Phim năm ' + slug;
    document.getElementById('browse-title').textContent = title;

    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadBrowsePage();
}

function getBrowseUrl(page) {
    if (browseType === 'type') return `${API[browseSlug]}?page=${page}&limit=${BROWSE_SIZE}`;
    if (browseType === 'genre') return `${API.genre}${browseSlug}?page=${page}&limit=${BROWSE_SIZE}`;
    if (browseType === 'country') return `${API.country}${browseSlug}?page=${page}&limit=${BROWSE_SIZE}`;
    if (browseType === 'year') return `${API.year}${browseSlug}?page=${page}&limit=${BROWSE_SIZE}`;
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
//  MODAL
// ══════════════════════════════════════════════════════════
function initModal() {
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-backdrop').addEventListener('click', closeModal);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('modal').getAttribute('aria-hidden') === 'false') closeModal(); });
}

async function openModal(slug, autoPlay = false) {
    const modal = document.getElementById('modal');
    const heroImg = document.getElementById('modal-hero-img');
    const hero = document.getElementById('modal-hero');

    _modalReqId++; const reqId = _modalReqId;
    if (_modalAbort) try { _modalAbort.abort(); } catch {}
    _modalAbort = new AbortController();

    heroImg.style.backgroundImage = ''; heroImg.style.opacity = '';
    hero.querySelectorAll('iframe').forEach(f => f.remove());
    const grad = hero.querySelector('.modal__hero-gradient'); if (grad) grad.style.opacity = '';
    document.getElementById('modal-title').textContent = '...';
    document.getElementById('modal-desc').textContent = 'Đang tải...';
    document.getElementById('modal-episodes-list').innerHTML = '';
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    try {
        const d = await apiFetch(API.detail + slug, { signal: _modalAbort.signal });
        if (reqId !== _modalReqId) return;
        const m = d.movie || {}, eps = d.episodes?.[0]?.server_data || [];

        heroImg.style.backgroundImage = `url("${img(m.poster_url||m.thumb_url)}")`;
        document.getElementById('modal-title').textContent = m.name || '';
        document.getElementById('modal-year').textContent = m.year || '';
        document.getElementById('modal-quality').textContent = m.quality || 'HD';
        document.getElementById('modal-lang').textContent = m.lang || 'Vietsub';
        const tmp = document.createElement('div'); tmp.innerHTML = m.content || '';
        document.getElementById('modal-desc').textContent = tmp.textContent || 'Không có mô tả.';
        document.getElementById('modal-genres').innerHTML = `<span class="modal__label">Thể loại:</span> ${(m.category||[]).map(c=>c.name).filter(Boolean).join(', ')||'N/A'}`;
        document.getElementById('modal-country').innerHTML = `<span class="modal__label">Quốc gia:</span> ${(m.country||[]).map(c=>c.name).filter(Boolean).join(', ')||'N/A'}`;

        renderEpisodes(eps);
        document.getElementById('modal-play-btn').onclick = () => { if (eps.length) { playInModal(eps[0].link_embed); const f=document.querySelector('.ep-btn'); if(f) f.classList.add('active'); } };
        if (autoPlay && eps.length) { playInModal(eps[0].link_embed); const f=document.querySelector('.ep-btn'); if(f) f.classList.add('active'); }
    } catch (err) {
        if (err.name === 'AbortError') return;
        document.getElementById('modal-desc').textContent = 'Lỗi khi tải.';
    }
}

function renderEpisodes(eps) {
    const c = document.getElementById('modal-episodes-list');
    const sec = document.getElementById('modal-episodes-section');
    c.innerHTML = '';
    if (!eps.length) { sec.style.display = 'none'; return; }
    sec.style.display = '';
    eps.forEach(ep => {
        const b = document.createElement('button'); b.className = 'ep-btn';
        b.textContent = `Tập ${ep.name}`;
        b.onclick = () => { c.querySelectorAll('.ep-btn').forEach(x => x.classList.remove('active')); b.classList.add('active'); playInModal(ep.link_embed); };
        c.appendChild(b);
    });
}

function playInModal(url) {
    const hero = document.getElementById('modal-hero');
    hero.querySelectorAll('iframe').forEach(f => f.remove());
    const iframe = document.createElement('iframe');
    iframe.src = url; iframe.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture'; iframe.allowFullscreen = true;
    hero.appendChild(iframe);
    document.getElementById('modal-hero-img').style.opacity = '0';
    hero.querySelector('.modal__hero-gradient').style.opacity = '0';
}

function closeModal() {
    const modal = document.getElementById('modal'), hero = document.getElementById('modal-hero');
    hero.querySelectorAll('iframe').forEach(f => f.remove());
    document.getElementById('modal-hero-img').style.opacity = '';
    const g = hero.querySelector('.modal__hero-gradient'); if (g) g.style.opacity = '';
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (_modalAbort) try { _modalAbort.abort(); } catch {}
}
