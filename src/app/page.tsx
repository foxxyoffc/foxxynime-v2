"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Home, Search, Bookmark, Film, BookOpen, ChevronRight,
  Flame, Sparkles, Loader2, BookmarkCheck, CalendarDays,
  Clock3, TrendingUp, RefreshCw, X, Play, Star, Globe
} from "lucide-react";

type MediaType = "anime" | "comic";
type Tab = "home" | "anime" | "comic" | "search" | "saved";

type Media = {
  title: string;
  url: string;
  thumbnail?: string;
  meta?: string;
  type: MediaType;
  views?: string;
  favorites?: string;
  day?: string;
  status?: string;
  genre?: string;
};

type ScheduleDay = {
  day: string;
  items: Media[];
};

type HomeData = {
  hot: Media[];
  new_added: Media[];
  popular: Media[];
  waiting: Media[];
  just_for_you: Media[];
  schedule: ScheduleDay[];
};

const ANIME_GENRES = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy",
  "Horror", "Mystery", "Romance", "Sci-Fi", "Slice of Life",
  "Sports", "Supernatural", "Thriller",
];

const DAYS = [
  "SENIN", "SELASA", "RABU", "KAMIS",
  "JUMAT", "SABTU", "MINGGU",
];

const BLOCKED = [
  "porn", "18+"
];

const emptyHome: HomeData = {
  hot: [],
  new_added: [],
  popular: [],
  waiting: [],
  just_for_you: [],
  schedule: [],
};

function isSafe(item: any) {
  const value = [
    item?.title, item?.name, item?.meta,
    item?.synopsis, item?.genre, item?.genres,
  ].join(" ").toLowerCase();

  return !BLOCKED.some((word) => value.includes(word));
}

async function requestCatalog(type: MediaType, query: string) {
  const params = new URLSearchParams({
    type,
    action: "search",
    q: query,
  });

  const response = await fetch(`/api/scraper?${params}`);
  const json = await response.json();

  if (!response.ok || !json.ok || !Array.isArray(json.data)) {
    throw new Error(json.error || "Katalog gagal dimuat.");
  }

  return json.data.map((item: any): Media => ({
    title: String(item.title || ""),
    url: String(item.url || ""),
    thumbnail: item.thumbnail || "",
    meta: item.meta || "",
    type,
  })).filter((item: Media) =>
    item.title && item.url && isSafe(item)
  );
}

function unique(items: Media[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = `${item.type}:${item.url}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function detailHref(item: Media) {
  const params = new URLSearchParams({
    type: item.type,
    title: item.title,
    url: item.url,
    thumbnail: item.thumbnail || "",
    meta: item.meta || "",
  });

  return `/detail?${params.toString()}`;
}

function formatViews(value?: string) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return "";
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}M views`;
  if (number >= 1_000) return `${(number / 1_000).toFixed(1)}K views`;
  return `${number} views`;
}

function Poster({
  item,
  saved,
  onSave,
}: {
  item: Media;
  saved: boolean;
  onSave: () => void;
}) {
  return (
    <article className="poster-card">
      <Link href={detailHref(item)} className="poster-image-link">
        <div className="poster-image">
          {item.thumbnail ? (
            <img src={item.thumbnail} alt={item.title} loading="lazy" />
          ) : (
            <div className="poster-placeholder">
              {item.type === "anime" ? <Film size={30} /> : <BookOpen size={30} />}
            </div>
          )}
          <span className="poster-category">
            {item.type === "anime" ? "ANIME" : "KOMIK"}
          </span>
          {item.status && (
            <span className={`poster-status ${item.status.toLowerCase()}`}>
              {item.status === "ONGOING" ? "ONGOING" : item.status}
            </span>
          )}
        </div>
      </Link>

      <div className="poster-info">
        <Link href={detailHref(item)} className="poster-title">
          {item.title}
        </Link>
        <div className="poster-meta">
          {item.meta?.split(" • ").slice(0, 2).join(" • ") || "FoxxyNime"}
        </div>
        <div className="poster-bottom">
          <span>{formatViews(item.views) || (item.type === "anime" ? "Anime" : "Komik")}</span>
          <button
            className={`save-button ${saved ? "saved" : ""}`}
            onClick={onSave}
            aria-label={saved ? "Hapus dari Saved" : "Simpan"}
          >
            {saved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
          </button>
        </div>
      </div>
    </article>
  );
}

function Section({
  title,
  subtitle,
  icon,
  items,
  savedItems,
  onSave,
  onSeeAll,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  items: Media[];
  savedItems: Media[];
  onSave: (item: Media) => void;
  onSeeAll?: () => void;
}) {
  if (!items.length) return null;

  return (
    <section className="content-section">
      <div className="section-heading">
        <div className="section-heading-left">
          {icon && <span className="section-icon">{icon}</span>}
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>
        {onSeeAll && (
          <button className="see-all" onClick={onSeeAll}>
            Lihat semua <ChevronRight size={15} />
          </button>
        )}
      </div>

      <div className="poster-grid">
        {items.map((item) => (
          <Poster
            key={`${item.type}-${item.url}`}
            item={item}
            saved={savedItems.some((saved) =>
              saved.type === item.type && saved.url === item.url
            )}
            onSave={() => onSave(item)}
          />
        ))}
      </div>
    </section>
  );
}

function Loading() {
  return (
    <div className="loading-state">
      <Loader2 className="spin" size={24} />
      <span>Memuat katalog...</span>
    </div>
  );
}

function GenreChipBar({
  genres,
  selected,
  onSelect,
}: {
  genres: string[];
  selected: string;
  onSelect: (genre: string) => void;
}) {
  return (
    <div style={{
      display: "flex", gap: 8, overflowX: "auto",
      paddingBottom: 12, marginBottom: 16,
      scrollbarWidth: "none",
    }}>
      {["Semua", ...genres].map((genre) => {
        const active = (genre === "Semua" && !selected) || genre === selected;
        return (
          <button
            key={genre}
            type="button"
            onClick={() => onSelect(genre === "Semua" ? "" : genre)}
            style={{
              flex: "0 0 auto", borderRadius: 999,
              padding: "8px 15px", fontSize: 12,
              fontWeight: 700, whiteSpace: "nowrap",
              border: active ? "1px solid #9B5CFF" : "1px solid #30283E",
              background: active ? "#9B5CFF" : "#171521",
              color: active ? "#fff" : "#B9B1C9",
            }}
          >
            {genre}
          </button>
        );
      })}
    </div>
  );
}

export default function HomePage() {
  const [showSupportBar, setShowSupportBar] = useState(false);

  useEffect(() => {
    setShowSupportBar(true);
    const timer = window.setTimeout(() => setShowSupportBar(false), 5000);
    return () => window.clearTimeout(timer);
  }, []);

  const [tab, setTab] = useState<Tab>("home");
  const [home, setHome] = useState<HomeData>(emptyHome);
  const [homeLoading, setHomeLoading] = useState(true);
  const [homeError, setHomeError] = useState("");

  const [savedItems, setSavedItems] = useState<Media[]>([]);
  const [comicItems, setComicItems] = useState<Media[]>([]);
  const [comicLoading, setComicLoading] = useState(false);
  const [comicLoaded, setComicLoaded] = useState(false);

  const [animeQuery, setAnimeQuery] = useState("");
  const [comicQuery, setComicQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<MediaType>("anime");

  const [animeResults, setAnimeResults] = useState<Media[]>([]);
  const [comicResults, setComicResults] = useState<Media[]>([]);
  const [searchResults, setSearchResults] = useState<Media[]>([]);

  const [animeLoading, setAnimeLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [animeSearched, setAnimeSearched] = useState(false);
  const [comicSearched, setComicSearched] = useState(false);
  const [searchSearched, setSearchSearched] = useState(false);

  const [selectedDay, setSelectedDay] = useState("");
  const [homeSection, setHomeSection] = useState<"popular" | "new_added">("popular");
  const [animeGenre, setAnimeGenre] = useState("");
  const [comicGenre, setComicGenre] = useState("");
  const [animeGenreResults, setAnimeGenreResults] = useState<Media[]>([]);
  const [comicGenreResults, setComicGenreResults] = useState<Media[]>([]);
  const [comicGenres, setComicGenres] = useState<string[]>([]);
  const [comicGenresLoaded, setComicGenresLoaded] = useState(false);

  function go(next: Tab) {
    setTab(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    try {
      const stored = localStorage.getItem("foxxy-nime-bookmarks");
      if (stored) setSavedItems(JSON.parse(stored));
    } catch {
      localStorage.removeItem("foxxy-nime-bookmarks");
    }
  }, []);

  function toggleSave(item: Media) {
    setSavedItems((current) => {
      const exists = current.some((saved) =>
        saved.type === item.type && saved.url === item.url
      );

      const next = exists
        ? current.filter((saved) =>
            !(saved.type === item.type && saved.url === item.url)
          )
        : [item, ...current];

      localStorage.setItem("foxxy-nime-bookmarks", JSON.stringify(next));
      return next;
    });
  }

  async function loadHome() {
    setHomeLoading(true);
    setHomeError("");

    try {
      const params = new URLSearchParams({
        type: "anime",
        action: "home",
      });

      const response = await fetch(`/api/scraper?${params}`);
      const json = await response.json();

      if (!response.ok || !json.ok || !json.data) {
        throw new Error(json.error || "Home gagal dimuat.");
      }

      const data = json.data;
      const map = (items: any[]): Media[] =>
        (Array.isArray(items) ? items : []).map((item) => ({
          ...item,
          type: "anime" as const,
        })).filter((item: Media) => item.title && item.url && isSafe(item));

      setHome({
        hot: map(data.hot),
        new_added: map(data.new_added),
        popular: map(data.popular),
        waiting: map(data.waiting),
        just_for_you: map(data.just_for_you),
        schedule: (Array.isArray(data.schedule) ? data.schedule : []).map((day: any) => ({
          day: day.day,
          items: map(day.items),
        })),
      });
    } catch (error) {
      setHomeError(error instanceof Error ? error.message : "Gagal memuat Home.");
    } finally {
      setHomeLoading(false);
    }
  }

  useEffect(() => {
    loadHome();
  }, []);

  async function loadComics() {
    if (comicLoaded || comicLoading) return;

    setComicLoading(true);
    try {
      const queries = ["One Piece", "Naruto", "Solo Leveling"];
      const results = await Promise.allSettled(
        queries.map((query) => requestCatalog("comic", query))
      );

      const items = results
        .filter((result): result is PromiseFulfilledResult<Media[]> =>
          result.status === "fulfilled"
        )
        .flatMap((result) => result.value);

      setComicItems(unique(items));
      setComicLoaded(true);
    } finally {
      setComicLoading(false);
    }
  }

  async function loadComicGenres() {
    if (comicGenresLoaded) return;
    try {
      const response = await fetch("/api/scraper?type=comic&action=genres");
      const json = await response.json();
      if (!response.ok || !json.ok || !Array.isArray(json.data)) return;

      const genres = json.data
        .filter((item: any) => isSafe(item))
        .map((item: any) => String(item.name || "").trim())
        .filter(Boolean);

      setComicGenres(Array.from(new Set<string>(genres as string[])));
      setComicGenresLoaded(true);
    } catch {
      setComicGenres([]);
    }
  }

  useEffect(() => {
    if (tab === "comic") {
      loadComics();
      loadComicGenres();
    }
  }, [tab]);

  async function searchAnime(event?: React.FormEvent) {
    event?.preventDefault();
    const query = animeQuery.trim();
    if (query.length < 2) return;

    setAnimeLoading(true);
    setAnimeSearched(true);

    try {
      setAnimeResults(await requestCatalog("anime", query));
    } catch {
      setAnimeResults([]);
    } finally {
      setAnimeLoading(false);
    }
  }

  async function searchComic(event?: React.FormEvent) {
    event?.preventDefault();
    const query = comicQuery.trim();
    if (query.length < 2) return;

    setComicLoading(true);
    setComicSearched(true);

    try {
      setComicResults(await requestCatalog("comic", query));
    } catch {
      setComicResults([]);
    } finally {
      setComicLoading(false);
    }
  }

  async function selectAnimeGenre(genre: string) {
    setAnimeGenre(genre);
    setAnimeSearched(false);
    setAnimeQuery("");
    setAnimeResults([]);
    setAnimeGenreResults([]);
    if (!genre) return;

    setAnimeLoading(true);
    try {
      const response = await fetch(
        `/api/catalog?type=ANIME&genre=${encodeURIComponent(genre)}`
      );
      const json = await response.json();
      const items = Array.isArray(json.items) ? json.items : [];

      setAnimeGenreResults(items.map((item: any): Media => ({
        title: String(item.title || "Untitled"),
        url: String(item.sourceUrl || `https://anilist.co/anime/${item.id}`),
        thumbnail: item.cover || "",
        meta: [item.year, item.status, item.score ? `⭐ ${item.score}` : ""]
          .filter(Boolean).join(" • "),
        genre: Array.isArray(item.genres) ? item.genres.join(", ") : "",
        status: item.status || "",
        type: "anime",
      })).filter((item: Media) => item.title && isSafe(item)));
    } catch {
      setAnimeGenreResults([]);
    } finally {
      setAnimeLoading(false);
    }
  }

  async function selectComicGenre(genre: string) {
    setComicGenre(genre);
    setComicSearched(false);
    setComicQuery("");
    setComicResults([]);
    setComicGenreResults([]);
    if (!genre) return;

    setComicLoading(true);
    try {
      const params = new URLSearchParams({
        type: "comic",
        action: "genre",
        genre,
      });
      const response = await fetch(`/api/scraper?${params}`);
      const json = await response.json();
      const items = Array.isArray(json.data) ? json.data : [];

      setComicGenreResults(items.map((item: any): Media => ({
        title: String(item.title || ""),
        url: String(item.url || ""),
        thumbnail: item.thumbnail || "",
        meta: item.meta || "",
        genre: item.genre || "",
        status: item.status || "",
        type: "comic",
      })).filter((item: Media) => item.title && item.url && isSafe(item)));
    } catch {
      setComicGenreResults([]);
    } finally {
      setComicLoading(false);
    }
  }

  async function performSearch(event?: React.FormEvent) {
    event?.preventDefault();
    const query = searchQuery.trim();
    if (query.length < 2) return;

    setSearchLoading(true);
    setSearchSearched(true);

    try {
      setSearchResults(await requestCatalog(searchType, query));
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }

  const today = DAYS[(new Date().getDay() + 6) % 7];
  const activeDay = selectedDay || today;
  const scheduleItems =
    home.schedule.find((day) => day.day === activeDay)?.items || [];

  const animeCatalog = unique([
    ...home.hot,
    ...home.new_added,
    ...home.popular,
    ...home.waiting,
    ...home.just_for_you,
  ]);

  const comicCatalog = unique(comicItems);

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => go("home")}>
          <span className="brand-logo"><Flame size={21} fill="currentColor" /></span>
          <span>Foxxy<span className="brand-accent">Nime</span></span>
          <span className="version-tag">V2</span>
        </button>

        <button className="top-search" onClick={() => go("search")} aria-label="Search">
          <Search size={19} />
        </button>
      </header>

      <main className="main-content">
        {tab === "home" && (
          <>
            <section className="welcome-banner">
              <div className="welcome-copy">
                <span className="eyebrow"><Sparkles size={13} /> FOXXYNIME DISCOVERY</span>
                <h1>Temukan cerita<br />favoritmu.</h1>
                <p>Update anime dan komik terbaru ada di sini.</p>
                <button className="primary-button" onClick={() => go("anime")}>
                  Jelajahi Anime <ChevronRight size={16} />
                </button>
              </div>
              <div className="welcome-art"><Flame size={100} /></div>
            
</section>

{/* FOXXYNIME WEBSITE ACCESS BAR */}
<a
  href="https://foxxynime.my.id"
  target="_blank"
  rel="noopener noreferrer"
  className="website-access-bar"
>
  <div className="website-access-icon">
    <Globe size={23} />
  </div>

  <div className="website-access-copy">
    <span className="website-access-label">FOXXYNIME WEBSITE</span>
    <strong>Ingin katalog lebih lengkap?</strong>
    <p>Jelajahi lebih banyak koleksi di website FoxxyNime.</p>
  </div>

  <div className="website-access-arrow">
    <ChevronRight size={21} />
  </div>
</a>

{homeLoading ? <Loading /> : homeError ?
 (
              <div className="error-panel">
                <p>{homeError}</p>
                <button onClick={loadHome}><RefreshCw size={15} /> Coba lagi</button>
              </div>
            ) : (
              <>
                <section className="content-section">
                  <div className="section-heading">
                    <div className="section-heading-left">
                      <span className="section-icon"><TrendingUp size={18} /></span>
                      <div><h2>Jelajahi Anime</h2><p>Pilihan dari katalog Anime</p></div>
                    </div>
                    <button className="see-all" onClick={() => go("anime")}>
                      Semua <ChevronRight size={15} />
                    </button>
                  </div>
                  <div className="feature-switch">
                    <button
                      className={homeSection === "popular" ? "active" : ""}
                      onClick={() => setHomeSection("popular")}
                    >Popular</button>
                    <button
                      className={homeSection === "new_added" ? "active" : ""}
                      onClick={() => setHomeSection("new_added")}
                    >New Added</button>
                  </div>
                  <div className="poster-grid">
                    {(homeSection === "popular" ? home.popular : home.new_added)
                      .slice(0, 6).map((item) => (
                        <Poster
                          key={item.url}
                          item={item}
                          saved={savedItems.some((saved) => saved.url === item.url && saved.type === item.type)}
                          onSave={() => toggleSave(item)}
                        />
                      ))}
                  </div>
                </section>

                <Section
                  title="Hot Anime"
                  subtitle="Sedang ramai diperbincangkan"
                  icon={<Flame size={18} />}
                  items={home.hot.slice(0, 6)}
                  savedItems={savedItems}
                  onSave={toggleSave}
                  onSeeAll={() => go("anime")}
                />

                <Section
                  title="Baru Ditambahkan"
                  subtitle="Judul yang baru masuk katalog"
                  icon={<Clock3 size={18} />}
                  items={home.new_added.slice(0, 6)}
                  savedItems={savedItems}
                  onSave={toggleSave}
                  onSeeAll={() => go("anime")}
                />

                <section className="content-section">
                  <div className="section-heading">
                    <div className="section-heading-left">
                      <span className="section-icon"><CalendarDays size={18} /></span>
                      <div><h2>Jadwal Anime</h2><p>Cek jadwal berdasarkan hari</p></div>
                    </div>
                  </div>

                  <div className="day-tabs">
                    {DAYS.map((day) => (
                      <button
                        key={day}
                        className={activeDay === day ? "active" : ""}
                        onClick={() => setSelectedDay(day)}
                      >
                        {day.slice(0, 3)}
                      </button>
                    ))}
                  </div>

                  {scheduleItems.length ? (
                    <div className="schedule-list">
                      {scheduleItems.map((item) => (
                        <Link
                          href={detailHref(item)}
                          className="schedule-item"
                          key={item.url}
                        >
                          <div className="schedule-thumb">
                            {item.thumbnail && <img src={item.thumbnail} alt="" loading="lazy" />}
                          </div>
                          <div className="schedule-info">
                            <strong>{item.title}</strong>
                            <span>{item.status || "Anime"} · {item.day || activeDay}</span>
                          </div>
                          <ChevronRight size={17} />
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-inline">Tidak ada jadwal yang tersedia untuk hari ini.</div>
                  )}
                </section>

                <Section
                  title="Paling Populer"
                  subtitle="Berdasarkan data popularitas katalog"
                  icon={<Star size={18} />}
                  items={home.popular.slice(0, 6)}
                  savedItems={savedItems}
                  onSave={toggleSave}
                  onSeeAll={() => go("anime")}
                />

                <Section
                  title="Segera Hadir"
                  subtitle="Anime yang masih menunggu update"
                  icon={<Clock3 size={18} />}
                  items={home.waiting}
                  savedItems={savedItems}
                  onSave={toggleSave}
                />

                <Section
                  title="Rekomendasi"
                  subtitle="Pilihan lainnya dari katalog"
                  icon={<Sparkles size={18} />}
                  items={home.just_for_you.slice(0, 6)}
                  savedItems={savedItems}
                  onSave={toggleSave}
                />
              </>
            )}

            <section className="quick-category">
              <button onClick={() => go("anime")}><Film size={20} /><span><b>Anime</b><small>Jelajahi anime</small></span><ChevronRight size={17} /></button>
              <button onClick={() => go("comic")}><BookOpen size={20} /><span><b>Komik</b><small>Jelajahi komik</small></span><ChevronRight size={17} /></button>
            </section>
          </>
        )}

        {tab === "anime" && (
          <section className="page-content">
            <div className="page-heading">
              <span className="eyebrow"><Film size={13} /> ANIME COLLECTION</span>
              <h1>Anime</h1>
              <p>Jelajahi katalog anime dan cari judul favoritmu.</p>
            </div>

            <form className="catalog-search" onSubmit={searchAnime}>
              <Search size={18} />
              <input value={animeQuery} onChange={(e) => setAnimeQuery(e.target.value)} placeholder="Cari anime..." />
              {animeQuery && <button type="button" onClick={() => { setAnimeQuery(""); setAnimeResults([]); setAnimeSearched(false); }}><X size={17} /></button>}
              <button className="search-submit" type="submit"><Search size={17} /></button>
            </form>

            <GenreChipBar
              genres={ANIME_GENRES}
              selected={animeGenre}
              onSelect={selectAnimeGenre}
            />

            {animeGenre ? (
              <>
                <div className="result-label">Genre: {animeGenre}</div>
                {animeLoading ? <Loading /> : (
                  <div className="poster-grid">
                    {animeGenreResults.map((item) => (
                      <Poster key={item.url} item={item}
                        saved={savedItems.some((s) => s.url === item.url && s.type === item.type)}
                        onSave={() => toggleSave(item)} />
                    ))}
                  </div>
                )}
                {!animeLoading && !animeGenreResults.length && (
                  <div className="empty-inline">Belum ada anime untuk genre ini.</div>
                )}
              </>
            ) : animeSearched ? (
              <>
                <div className="result-label">Hasil pencarian anime</div>
                {animeLoading ? <Loading /> : (
                  <div className="poster-grid">
                    {animeResults.map((item) => (
                      <Poster key={item.url} item={item} saved={savedItems.some((s) => s.url === item.url && s.type === item.type)} onSave={() => toggleSave(item)} />
                    ))}
                  </div>
                )}
                {!animeLoading && !animeResults.length && <div className="empty-inline">Tidak ada hasil. Coba kata kunci lain.</div>}
              </>
            ) : (
              homeLoading ? <Loading /> : (
                <>
                  <Section title="Anime Populer" items={home.popular} savedItems={savedItems} onSave={toggleSave} />
                  <Section title="Anime Terbaru" items={home.new_added} savedItems={savedItems} onSave={toggleSave} />
                  <Section title="Anime Sedang Tayang" items={home.hot.filter((item) => item.status === "ONGOING")} savedItems={savedItems} onSave={toggleSave} />
                  <Section title="Semua Anime" items={animeCatalog} savedItems={savedItems} onSave={toggleSave} />
                </>
              )
            )}
          </section>
        )}

        {tab === "comic" && (
          <section className="page-content">
            <div className="page-heading">
              <span className="eyebrow"><BookOpen size={13} /> COMIC COLLECTION</span>
              <h1>Komik</h1>
              <p>Temukan manga dan komik dari katalog KomikIndo.</p>
            </div>

            <form className="catalog-search" onSubmit={searchComic}>
              <Search size={18} />
              <input value={comicQuery} onChange={(e) => setComicQuery(e.target.value)} placeholder="Cari judul komik..." />
              {comicQuery && <button type="button" onClick={() => { setComicQuery(""); setComicResults([]); setComicSearched(false); }}><X size={17} /></button>}
              <button className="search-submit" type="submit"><Search size={17} /></button>
            </form>

            <GenreChipBar
              genres={comicGenres}
              selected={comicGenre}
              onSelect={selectComicGenre}
            />

            {comicGenre ? (
              <>
                <div className="result-label">Genre: {comicGenre}</div>
                {comicLoading ? <Loading /> : (
                  <div className="poster-grid">
                    {comicGenreResults.map((item) => (
                      <Poster key={item.url} item={item}
                        saved={savedItems.some((s) => s.url === item.url && s.type === item.type)}
                        onSave={() => toggleSave(item)} />
                    ))}
                  </div>
                )}
                {!comicLoading && !comicGenreResults.length && (
                  <div className="empty-inline">Belum ada komik untuk genre ini.</div>
                )}
              </>
            ) : comicSearched ? (
              <>
                <div className="result-label">Hasil pencarian komik</div>
                {comicLoading ? <Loading /> : (
                  <div className="poster-grid">
                    {comicResults.map((item) => (
                      <Poster key={item.url} item={item} saved={savedItems.some((s) => s.url === item.url && s.type === item.type)} onSave={() => toggleSave(item)} />
                    ))}
                  </div>
                )}
                {!comicLoading && !comicResults.length && <div className="empty-inline">Tidak ada hasil. Coba kata kunci lain.</div>}
              </>
            ) : comicLoading ? <Loading /> : (
              <Section
                title="Pilihan Komik"
                subtitle="Hasil dari katalog KomikIndo"
                items={comicCatalog}
                savedItems={savedItems}
                onSave={toggleSave}
              />
            )}
          </section>
        )}

        {tab === "search" && (
          <section className="page-content">
            <div className="page-heading">
              <span className="eyebrow"><Search size={13} /> DISCOVER</span>
              <h1>Search</h1>
              <p>Cari anime atau komik secara terpisah.</p>
            </div>

            <div className="search-type-switch">
              <button className={searchType === "anime" ? "active" : ""} onClick={() => { setSearchType("anime"); setSearchResults([]); setSearchSearched(false); }}>
                <Film size={17} /> Anime
              </button>
              <button className={searchType === "comic" ? "active" : ""} onClick={() => { setSearchType("comic"); setSearchResults([]); setSearchSearched(false); }}>
                <BookOpen size={17} /> Komik
              </button>
            </div>

            <form className="catalog-search" onSubmit={performSearch}>
              <Search size={18} />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={searchType === "anime" ? "Cari anime..." : "Cari komik..."} />
              {searchQuery && <button type="button" onClick={() => { setSearchQuery(""); setSearchResults([]); setSearchSearched(false); }}><X size={17} /></button>}
              <button className="search-submit" type="submit"><Search size={17} /></button>
            </form>

            {searchLoading ? <Loading /> : searchSearched ? (
              <div className="poster-grid">
                {searchResults.map((item) => (
                  <Poster key={item.url} item={item} saved={savedItems.some((s) => s.url === item.url && s.type === item.type)} onSave={() => toggleSave(item)} />
                ))}
              </div>
            ) : (
              <div className="search-hint">
                <Search size={28} />
                <strong>Mulai pencarian</strong>
                <span>Masukkan judul yang ingin kamu temukan.</span>
              </div>
            )}
          </section>
        )}

        {tab === "saved" && (
          <section className="page-content">
            <div className="page-heading">
              <span className="eyebrow"><Bookmark size={13} /> YOUR COLLECTION</span>
              <h1>Saved</h1>
              <p>Daftar anime dan komik yang kamu simpan.</p>
            </div>

            {savedItems.length ? (
              <div className="poster-grid">
                {savedItems.map((item) => (
                  <Poster key={`${item.type}-${item.url}`} item={item} saved onSave={() => toggleSave(item)} />
                ))}
              </div>
            ) : (
              <div className="search-hint">
                <Bookmark size={28} />
                <strong>Belum ada koleksi</strong>
                <span>Simpan anime atau komik untuk melihatnya di sini.</span>
              </div>
            )}
          </section>
        )}
      </main>

      {showSupportBar && (
        <div className="fixed inset-x-3 bottom-24 z-[80] mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-[#9B5CFF]/40 bg-[#171521]/95 p-3 shadow-[0_8px_35px_rgba(155,92,255,0.22)] backdrop-blur-xl">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#9B5CFF]/15 text-xl text-[#C49AFF]">
            ♡
          </div>

          <a
            href="https://sociabuzz.com/foxxyoffx"
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 flex-1"
          >
            <strong className="block text-sm font-bold text-white">
              Dukung FoxxyNime
            </strong>
            <span className="block text-xs text-[#AAA3B8]">
              Bantu dukungan owner & perawatan sistem.
            </span>
            <span className="mt-1 inline-block text-xs font-semibold text-[#C49AFF]">
              Berikan dukungan →
            </span>
          </a>

          <button
            type="button"
            onClick={() => setShowSupportBar(false)}
            aria-label="Tutup bar dukungan"
            className="self-start rounded-lg p-1 text-[#9993A8] hover:bg-white/10"
          >
            <X size={17} />
          </button>
        </div>
      )}

      <nav className="bottom-nav">
        {[
          { id: "home" as Tab, label: "Home", icon: Home },
          { id: "anime" as Tab, label: "Anime", icon: Film },
          { id: "comic" as Tab, label: "Komik", icon: BookOpen },
          { id: "search" as Tab, label: "Search", icon: Search },
          { id: "saved" as Tab, label: "Saved", icon: Bookmark },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} className={tab === id ? "active" : ""} onClick={() => go(id)}>
            <Icon size={20} strokeWidth={tab === id ? 2.4 : 1.8} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
