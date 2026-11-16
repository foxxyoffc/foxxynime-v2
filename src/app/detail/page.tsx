"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, BookOpen, Film, Loader2, ChevronRight, Play } from "lucide-react";

type Entry = { title?: string; url?: string };

function DetailContent() {
  const router = useRouter();
  const params = useSearchParams();

  const type = params.get("type") === "comic" ? "comic" : "anime";
  const title = params.get("title") || "Detail konten";
  const sourceUrl = params.get("url") || "";
  const thumbnail = params.get("thumbnail") || "";
  const meta = params.get("meta") || "";

  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      if (!sourceUrl) {
        setError("Informasi konten tidak lengkap.");
        setLoading(false);
        return;
      }

      try {
        const query = new URLSearchParams({
          type,
          action: type === "anime" ? "episodes" : "chapters",
          url: sourceUrl,
        });

        const response = await fetch(`/api/scraper?${query}`);
        const json = await response.json();

        if (!response.ok || !json.ok || !Array.isArray(json.data)) {
          throw new Error(json.error || "Gagal mengambil daftar.");
        }

        if (active) {
          setEntries(json.data.filter(
            (item: Entry) => item?.title && item?.url
          ));
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Gagal menghubungi katalog.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, [type, sourceUrl]);

  const isAnime = type === "anime";
  const Icon = isAnime ? Film : BookOpen;

  return (
    <div className="app-shell">
      <header className="simple-header">
        <button className="icon-button" onClick={() => router.back()} aria-label="Kembali">
          <ArrowLeft size={20} />
        </button>
        <div className="detail-header-label">FOXXYNIME <span>DETAIL</span></div>
        <span className="detail-header-spacer" />
      </header>

      <main className="simple-main detail-main">
        <section className="detail-hero">
          <div className="detail-cover">
            {thumbnail ? <img src={thumbnail} alt={title} /> : <Icon size={36} />}
          </div>
          <div className="detail-information">
            <span className="detail-type">{isAnime ? "ANIME SERIES" : "MANGA SERIES"}</span>
            <h1>{title}</h1>
            {meta && <p className="detail-meta">{meta}</p>}
            <span className="detail-hero-tag">
              <span className="detail-live-dot" /> FOXXYNIME CATALOG
            </span>
          </div>
        </section>

        <section className="detail-list-section">
          <div className="detail-list-heading">
            <div>
              <span className="detail-section-kicker">LIBRARY</span>
              <h2>{isAnime ? "Daftar Episode" : "Daftar Chapter"}</h2>
              <p>{entries.length} tersedia</p>
            </div>
            <Icon size={22} />
          </div>

          {loading ? (
            <div className="catalog-status">
              <Loader2 className="spin" size={22} /> Mengambil daftar konten...
            </div>
          ) : error ? (
            <div className="catalog-status"><p>{error}</p></div>
          ) : entries.length === 0 ? (
            <div className="catalog-status">Belum ada konten yang tersedia.</div>
          ) : (
            <div className="detail-entry-list">
              {entries.map((entry, index) => {
                const viewerParams = new URLSearchParams({
                  type,
                  title,
                  entryTitle: entry.title || `Bagian ${index + 1}`,
                  url: entry.url || "",
                  seriesUrl: sourceUrl,
                  index: String(index),
                });

                return (
                  <Link
                    className="detail-entry"
                    href={`/viewer?${viewerParams.toString()}`}
                    key={`${entry.url}-${index}`}
                  >
                    <span className="detail-entry-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="detail-entry-title">{entry.title}</span>
                    <span className="detail-entry-kind">{isAnime ? "EP" : "CH"}</span>
                    <ChevronRight size={17} />
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default function DetailPage() {
  return (
    <Suspense fallback={<div className="catalog-status">Memuat detail...</div>}>
      <DetailContent />
    </Suspense>
  );
}
