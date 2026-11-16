"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, BookOpen, Film, Loader2, AlertCircle,
  ExternalLink, Play, ChevronLeft, ChevronRight,
  Lock, LockOpen, Smartphone, Zap, SkipForward,
} from "lucide-react";
import Hls from "hls.js";

type MediaFile = {
  type?: string;
  quality?: string;
  url?: string;
  headers?: Record<string, string>;
};

type Entry = { title?: string; url?: string };

function isHttpsUrl(value?: string) {
  try {
    return !!value && new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isHlsUrl(value?: string) {
  try {
    return !!value && new URL(value).pathname.toLowerCase().endsWith(".m3u8");
  } catch {
    return false;
  }
}

function isDirectVideo(file: MediaFile) {
  if (!isHttpsUrl(file.url)) return false;
  const path = new URL(file.url!).pathname.toLowerCase();
  return file.type === "video" || /\.(mp4|webm|ogg|mov|m4v)$/.test(path);
}

function isWebPlayer(file: MediaFile) {
  return file.type === "link" &&
    isHttpsUrl(file.url) &&
    !isHlsUrl(file.url) &&
    !isDirectVideo(file);
}

function isAllowedEmbed(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      url.hostname === "desustream.net" &&
      url.pathname.startsWith("/dstream/");
  } catch {
    return false;
  }
}

function ViewerContent() {
  const router = useRouter();
  const params = useSearchParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const holdRef = useRef(false);
  const orientationRef = useRef(false);

  const type = params.get("type") === "comic" ? "comic" : "anime";
  const title = params.get("title") || "Konten";
  const entryTitle = params.get("entryTitle") || "Bagian";
  const sourceUrl = params.get("url") || "";
  const seriesUrl = params.get("seriesUrl") || "";
  const currentIndex = Number(params.get("index") || 0);

  const [files, setFiles] = useState<MediaFile[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [embedUrl, setEmbedUrl] = useState("");
  const [showEmbed, setShowEmbed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [playbackError, setPlaybackError] = useState("");
  const [selected, setSelected] = useState(0);
  const [autoNext, setAutoNext] = useState(false);
  const [screenLocked, setScreenLocked] = useState(false);
  const [landscapeLocked, setLandscapeLocked] = useState(false);
  const [readerAtEnd, setReaderAtEnd] = useState(false);

  const isAnime = type === "anime";
  const Icon = isAnime ? Film : BookOpen;

  useEffect(() => {
    let active = true;

    async function loadMedia() {
      if (!sourceUrl) {
        setError("Alamat konten tidak tersedia.");
        setLoading(false);
        return;
      }

      try {
        const query = new URLSearchParams({ type, action: "scrape", url: sourceUrl });
        const response = await fetch(`/api/scraper?${query}`);
        const json = await response.json();

        if (!response.ok || !json.ok) {
          throw new Error(json.error || "Konten gagal dimuat.");
        }

        const data = json.data;
        const downloads: MediaFile[] = Array.isArray(data?.downloads)
          ? data.downloads
          : Array.isArray(data?.images)
            ? data.images.map((url: string) => ({ type: "photo", url }))
            : [];

        const usable = downloads.filter((item) => {
          if (!item || !isHttpsUrl(item.url)) return false;
          if (type === "comic") return item.type === "photo";
          return isDirectVideo(item) || isHlsUrl(item.url) || isWebPlayer(item);
        });

        const candidateEmbed = typeof data?.embedUrl === "string" ? data.embedUrl : "";
        const safeEmbed = isAllowedEmbed(candidateEmbed) ? candidateEmbed : "";

        if (!usable.length && !(type === "anime" && safeEmbed)) {
          throw new Error(
            type === "anime"
              ? "Katalog belum menyediakan URL video yang bisa diputar."
              : "Katalog belum menyediakan gambar chapter."
          );
        }

        if (active) {
          setFiles(usable);
          setSelected(0);
          setEmbedUrl(safeEmbed);
          setShowEmbed(false);
          setPlaybackError("");
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Gagal memuat media.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadMedia();
    return () => { active = false; };
  }, [type, sourceUrl]);

  useEffect(() => {
    let active = true;

    async function loadEntries() {
      if (!seriesUrl) return;

      try {
        const query = new URLSearchParams({
          type,
          action: type === "anime" ? "episodes" : "chapters",
          url: seriesUrl,
        });
        const response = await fetch(`/api/scraper?${query}`);
        const json = await response.json();

        if (response.ok && json.ok && Array.isArray(json.data) && active) {
          setEntries(json.data.filter((item: Entry) => item?.title && item?.url));
        }
      } catch {
        // Navigasi episode tetap opsional jika daftar gagal dimuat.
      }
    }

    loadEntries();
    return () => { active = false; };
  }, [type, seriesUrl]);

  const selectedFile = files[selected];
  const selectedIsHls = isHlsUrl(selectedFile?.url);
  const selectedIsDirect = selectedFile ? isDirectVideo(selectedFile) : false;
  const selectedIsWebPlayer = selectedFile ? isWebPlayer(selectedFile) : false;

  const previousEntry = entries[currentIndex + 1];
  const nextEntry = entries[currentIndex - 1];

  function goToEntry(entry: Entry | undefined, index: number) {
    if (!entry?.url) return;

    const query = new URLSearchParams({
      type,
      title,
      entryTitle: entry.title || `Bagian ${index + 1}`,
      url: entry.url,
      seriesUrl,
      index: String(index),
    });

    router.push(`/viewer?${query.toString()}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedFile?.url || !isAnime) return;

    setPlaybackError("");

    if (selectedIsWebPlayer) {
      video.pause();
      video.removeAttribute("src");
      video.load();
      return;
    }

    if (!selectedIsHls) return;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(selectedFile.url);
      hls.attachMedia(video);

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          const status = data.response?.code;
          const detail = data.details || data.type || "unknown";
          setPlaybackError(
            `HLS tidak dapat diputar: ${detail}` +
            (status ? ` | HTTP ${status}` : "") +
            ". Coba sumber lain jika tersedia."
          );
          hls.destroy();
        }
      });

      return () => hls.destroy();
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = selectedFile.url;
      video.load();
      return;
    }

    setPlaybackError("Browser ini tidak mendukung pemutaran HLS.");
  }, [selectedFile?.url, selectedIsHls, selectedIsWebPlayer, isAnime]);

  useEffect(() => {
    if (!isAnime) return;

    return () => {
      const video = videoRef.current;
      if (video) video.playbackRate = 1;

      if (orientationRef.current) {
        try { screen.orientation.unlock(); } catch {}
      }
    };
  }, [isAnime]);

  useEffect(() => {
    if (isAnime || !files.length) return;

    function checkEnd() {
      const nearEnd =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 180;
      setReaderAtEnd(nearEnd);
    }

    window.addEventListener("scroll", checkEnd, { passive: true });
    checkEnd();
    return () => window.removeEventListener("scroll", checkEnd);
  }, [isAnime, files.length]);

  function startFastPlayback() {
    if (!isAnime || screenLocked) return;
    const video = videoRef.current;
    if (!video || selectedIsWebPlayer) return;

    holdRef.current = true;
    video.playbackRate = 2;
  }

  function stopFastPlayback() {
    const video = videoRef.current;
    holdRef.current = false;
    if (video) video.playbackRate = 1;
  }

  async function toggleOrientation() {
    try {
      if (!landscapeLocked) {
        await (screen.orientation as any).lock("landscape");
        orientationRef.current = true;
        setLandscapeLocked(true);
      } else {
        screen.orientation.unlock();
        orientationRef.current = false;
        setLandscapeLocked(false);
      }
    } catch {
      setPlaybackError("Kunci rotasi tidak didukung browser ini. Coba aktifkan fullscreen terlebih dahulu.");
    }
  }

  function toggleScreenLock() {
    setScreenLocked((value) => !value);
    stopFastPlayback();
  }

  return (
    <div className="app-shell viewer-shell">
      <header className="simple-header">
        <button className="icon-button" onClick={() => router.back()} aria-label="Kembali">
          <ArrowLeft size={20} />
        </button>
        <div className="detail-header-label">
          FOXXYNIME <span>{isAnime ? "PLAYER" : "READER"}</span>
        </div>
        <span className="detail-header-spacer" />
      </header>

      <main className="simple-main viewer-main">
        <div className="viewer-heading">
          <span className="detail-type">{isAnime ? "NOW PLAYING" : "NOW READING"}</span>
          <h1>{title}</h1>
          <p>{entryTitle}</p>
        </div>

        {loading ? (
          <div className="catalog-status">
            <Loader2 className="spin" size={24} /> Mengambil media...
          </div>
        ) : error ? (
          <div className="viewer-error">
            <AlertCircle size={24} />
            <p>{error}</p>
            <small>Pastikan sumber dapat diakses dan memiliki izin distribusi.</small>
          </div>
        ) : isAnime ? (
          <>
            <section className="viewer-player">
              <div
                className={`viewer-screen ${screenLocked ? "screen-is-locked" : ""}`}
                onPointerDown={startFastPlayback}
                onPointerUp={stopFastPlayback}
                onPointerLeave={stopFastPlayback}
                onPointerCancel={stopFastPlayback}
                onContextMenu={(event) => event.preventDefault()}
              >
                {showEmbed && embedUrl ? (
                  <iframe
                    key={embedUrl}
                    src={embedUrl}
                    title={`${entryTitle} - Player`}
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                ) : selectedIsWebPlayer ? (
                  <div className="viewer-error">
                    <ExternalLink size={28} />
                    <p>{selectedFile?.quality || "Web Player tersedia"}</p>
                    <small>Sumber ini merupakan halaman player provider.</small>
                    <button
                      className="viewer-open-source"
                      onClick={() => selectedFile?.url && window.open(
                        selectedFile.url, "_blank", "noopener,noreferrer"
                      )}
                    >
                      <Play size={17} /> Buka Web Player
                    </button>
                  </div>
                ) : selectedIsDirect || selectedIsHls ? (
                  <video
                    ref={videoRef}
                    key={selectedFile?.url}
                    controls={!screenLocked}
                    playsInline
                    preload="metadata"
                    src={selectedIsHls ? undefined : selectedFile?.url}
                    onEnded={() => {
                      if (autoNext && nextEntry) {
                        goToEntry(nextEntry, currentIndex - 1);
                      }
                    }}
                  />
                ) : embedUrl ? (
                  <div className="viewer-error">
                    <p>Player embed resmi tersedia.</p>
                    <button className="viewer-open-source" onClick={() => setShowEmbed(true)}>
                      Gunakan Embed Provider
                    </button>
                  </div>
                ) : (
                  <div className="viewer-error">
                    <AlertCircle size={22} />
                    <p>Tidak ada sumber yang bisa ditampilkan.</p>
                  </div>
                )}

                {screenLocked && (
                  <button className="viewer-unlock-overlay" onClick={toggleScreenLock}>
                    <LockOpen size={18} /> Buka Kunci Layar
                  </button>
                )}
              </div>

              <div className="viewer-source-note">
                <Icon size={15} /> SUMBER KATALOG FOXXYNIME
              </div>

              {files.length > 0 && (
                <div className="viewer-quality-panel">
                  <div className="viewer-control-heading">PILIH SUMBER / KUALITAS</div>
                  <div className="viewer-quality-list">
                    {files.map((file, index) => (
                      <button
                        key={`${file.url}-${index}`}
                        className={selected === index ? "active" : ""}
                        onClick={() => {
                          setShowEmbed(false);
                          setSelected(index);
                          setPlaybackError("");
                        }}
                      >
                        {file.quality || `Sumber ${index + 1}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="viewer-tools">
                <button className={screenLocked ? "active" : ""} onClick={toggleScreenLock}>
                  {screenLocked ? <Lock size={17} /> : <LockOpen size={17} />}
                  {screenLocked ? "Layar terkunci" : "Kunci layar"}
                </button>
                <button
                  className={landscapeLocked ? "active" : ""}
                  onClick={toggleOrientation}
                >
                  <Smartphone size={17} />
                  {landscapeLocked ? "Rotasi terkunci" : "Kunci rotasi"}
                </button>
                <button className={autoNext ? "active" : ""} onClick={() => setAutoNext(!autoNext)}>
                  <SkipForward size={17} />
                  Auto next {autoNext ? "ON" : "OFF"}
                </button>
              </div>

              <div className="viewer-speed-hint">
                <Zap size={15} /> Tahan area video untuk kecepatan 2×
              </div>

              {embedUrl && (
                <button className="viewer-open-source" onClick={() => setShowEmbed(true)}>
                  Gunakan Embed Provider
                </button>
              )}
            </section>

            <div className="episode-navigation">
              <button disabled={!previousEntry} onClick={() => goToEntry(previousEntry, currentIndex + 1)}>
                <ChevronLeft size={19} />
                <span><small>SEBELUMNYA</small>{previousEntry?.title || "Tidak tersedia"}</span>
              </button>
              <button disabled={!nextEntry} onClick={() => goToEntry(nextEntry, currentIndex - 1)}>
                <span><small>BERIKUTNYA</small>{nextEntry?.title || "Tidak tersedia"}</span>
                <ChevronRight size={19} />
              </button>
            </div>

            {playbackError && (
              <div className="viewer-error">
                <AlertCircle size={20} /><p>{playbackError}</p>
              </div>
            )}
          </>
        ) : (
          <>
            <section className="reader-pages">
              {files.map((file, index) => (
                <img
                  key={`${file.url}-${index}`}
                  src={file.url}
                  alt={`${entryTitle} halaman ${index + 1}`}
                  loading={index < 2 ? "eager" : "lazy"}
                />
              ))}
            </section>

            <div className={`episode-navigation reader-navigation ${readerAtEnd ? "reader-navigation-end" : ""}`}>
              <button disabled={!previousEntry} onClick={() => goToEntry(previousEntry, currentIndex + 1)}>
                <ChevronLeft size={19} />
                <span><small>CHAPTER SEBELUMNYA</small>{previousEntry?.title || "Tidak tersedia"}</span>
              </button>
              <button disabled={!nextEntry} onClick={() => goToEntry(nextEntry, currentIndex - 1)}>
                <span><small>CHAPTER BERIKUTNYA</small>{nextEntry?.title || "Tidak tersedia"}</span>
                <ChevronRight size={19} />
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function ViewerPage() {
  return (
    <Suspense fallback={<div className="catalog-status">Memuat player...</div>}>
      <ViewerContent />
    </Suspense>
  );
}
