import { NextRequest, NextResponse } from "next/server";

const ANILIST_URL = "https://graphql.anilist.co";

const ALLOWED_GENRES = new Set([
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Fantasy",
  "Horror",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Slice of Life",
  "Sports",
  "Supernatural",
  "Thriller",
]);

const QUERY = `
  query (
    $page: Int,
    $type: MediaType!,
    $search: String,
    $genre: String
  ) {
    Page(page: $page, perPage: 20) {
      pageInfo {
        currentPage
        hasNextPage
      }
      media(
        type: $type
        search: $search
        genre: $genre
        isAdult: false
        sort: [POPULARITY_DESC, SCORE_DESC]
      ) {
        id
        type
        title {
          romaji
          english
          native
        }
        coverImage {
          large
          extraLarge
        }
        description(asHtml: false)
        genres
        episodes
        chapters
        status
        seasonYear
        averageScore
        siteUrl
        isAdult
      }
    }
  }
`;

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const rawType = (params.get("type") || "ANIME").toUpperCase();
  const type = rawType === "MANGA" ? "MANGA" : "ANIME";

  const search = (params.get("q") || "").trim().slice(0, 80);
  const rawGenre = (params.get("genre") || "").trim();
  const genre = ALLOWED_GENRES.has(rawGenre) ? rawGenre : null;

  const requestedPage = Number(params.get("page") || 1);
  const page = Number.isInteger(requestedPage)
    ? Math.min(Math.max(requestedPage, 1), 100)
    : 1;

  try {
    const response = await fetch(ANILIST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query: QUERY,
        variables: {
          page,
          type,
          search: search || null,
          genre,
        },
      }),
      next: {
        revalidate: 1800,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "Catalog provider is temporarily unavailable",
        },
        { status: response.status === 429 ? 429 : 502 },
      );
    }

    const payload = await response.json();

    if (payload.errors?.length || !payload.data?.Page) {
      return NextResponse.json(
        { ok: false, error: "Invalid catalog response" },
        { status: 502 },
      );
    }

    const result = payload.data.Page;

    const items = result.media
      .filter((item: { isAdult: boolean }) => item.isAdult === false)
      .map((item: {
        id: number;
        type: string;
        title: {
          romaji: string | null;
          english: string | null;
          native: string | null;
        };
        coverImage: {
          large: string | null;
          extraLarge: string | null;
        };
        description: string | null;
        genres: string[];
        episodes: number | null;
        chapters: number | null;
        status: string | null;
        seasonYear: number | null;
        averageScore: number | null;
        siteUrl: string;
      }) => ({
        id: item.id,
        type: item.type,
        title:
          item.title.english ||
          item.title.romaji ||
          item.title.native ||
          "Untitled",
        cover: item.coverImage.extraLarge || item.coverImage.large,
        description: item.description,
        genres: item.genres,
        episodes: item.episodes,
        chapters: item.chapters,
        status: item.status,
        year: item.seasonYear,
        score: item.averageScore,
        sourceUrl: item.siteUrl,
      }));

    return NextResponse.json(
      {
        ok: true,
        provider: "AniList",
        type,
        page: result.pageInfo.currentPage,
        hasNextPage: result.pageInfo.hasNextPage,
        items,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to connect to catalog provider" },
      { status: 502 },
    );
  }
}
