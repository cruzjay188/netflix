// tmdb: calls the TMDB API for Myflix and keeps the TMDB key secret (AI-9, Netflix Clone V).
// The browser calls this function; only this function ever sees TMDB_API_KEY.
//
// GET /functions/v1/tmdb?path=/trending/tv/week
// GET /functions/v1/tmdb?path=/search/tv&query=office
// GET /functions/v1/tmdb?path=/tv/1399

import { createClient } from "@supabase/supabase-js";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const POSTER_BASE_URL = "https://image.tmdb.org/t/p/w500"; // tall (2:3) poster
const BACKDROP_BASE_URL = "https://image.tmdb.org/t/p/w780"; // wide (16:9) still, fits Myflix cards

// TMDB's TV genre ids → names (https://api.themoviedb.org/3/genre/tv/list).
// The same names are in the genres table (migration 20261020170000_tmdb_titles.sql).
const GENRES: Record<number, string> = {
  10759: "Action & Adventure", 16: "Animation", 35: "Comedy", 80: "Crime", 99: "Documentary",
  18: "Drama", 10751: "Family", 10762: "Kids", 9648: "Mystery", 10763: "News", 10764: "Reality",
  10765: "Sci-Fi & Fantasy", 10766: "Soap", 10767: "Talk", 10768: "War & Politics", 37: "Western",
};
const DEFAULT_GENRE = "Drama";

// The only TMDB endpoints this function will call. Anything else gets a 400.
const ALLOWED_PATHS = [/^\/trending\/tv\/week$/, /^\/search\/tv$/, /^\/tv\/\d+$/];

// CORS headers let the Myflix page (another origin) read the response.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Keep only the fields Myflix shows: full image URLs, the year, and the first genre's name.
// Lists send genre_ids ([18, 80]); one show (/tv/{id}) sends genres ([{ id, name }]).
// deno-lint-ignore no-explicit-any
function trimShow(show: any) {
  const genreId = show.genre_ids?.[0] ?? show.genres?.[0]?.id;
  return {
    id: show.id,
    name: show.name,
    overview: show.overview,
    first_air_date: show.first_air_date,
    year: Number(show.first_air_date.slice(0, 4)),
    genre: GENRES[genreId] ?? DEFAULT_GENRE,
    poster_url: show.poster_path ? POSTER_BASE_URL + show.poster_path : null,
    backdrop_url: show.backdrop_path ? BACKDROP_BASE_URL + show.backdrop_path : null,
  };
}

// Myflix needs a year for every title, so leave out shows with no air date yet.
// deno-lint-ignore no-explicit-any
const hasAirDate = (show: any) => /^\d{4}-/.test(show.first_air_date ?? "");

Deno.serve(async (req) => {
  // The browser's "preflight" check: answer it with the CORS headers and no body.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // 1. Only logged-in Myflix users. supabase.functions.invoke() sends their token for us.
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return json({ error: "Log in to Myflix to use this function." }, 401);
  }
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data, error: authError } = await supabase.auth.getUser(token);
  if (authError || !data.user) {
    return json({ error: "Your login is missing or expired. Log in again." }, 401);
  }

  // 2. Check the request: which TMDB endpoint, and a search word for /search/tv.
  const params = new URL(req.url).searchParams;
  const path = params.get("path");
  const query = params.get("query")?.trim();
  if (!path) {
    return json({ error: "Missing the path parameter, e.g. ?path=/trending/tv/week" }, 400);
  }
  if (!ALLOWED_PATHS.some((allowed) => allowed.test(path))) {
    return json({ error: `Path not allowed: ${path}. Use /trending/tv/week, /search/tv or /tv/{id}.` }, 400);
  }
  if (path === "/search/tv" && !query) {
    return json({ error: "Missing the query parameter, e.g. ?path=/search/tv&query=office" }, 400);
  }

  // 3. Call TMDB with the secret key (set with `npx supabase secrets set`).
  const apiKey = Deno.env.get("TMDB_API_KEY");
  if (!apiKey) {
    return json({ error: "The server is missing TMDB_API_KEY." }, 500);
  }
  const tmdbUrl = new URL(TMDB_BASE_URL + path);
  if (query) tmdbUrl.searchParams.set("query", query);

  let tmdbResponse: Response;
  try {
    tmdbResponse = await fetch(tmdbUrl, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    });
  } catch {
    return json({ error: "Could not reach TMDB. Try again in a moment." }, 502);
  }
  if (!tmdbResponse.ok) {
    return json({ error: `TMDB returned an error (HTTP ${tmdbResponse.status}).` }, 502);
  }

  // 4. Send back only what Myflix needs: one show for /tv/{id}, a list for the others.
  const body = await tmdbResponse.json();
  if (path.startsWith("/tv/")) {
    if (!hasAirDate(body)) {
      return json({ error: "That show has no air date on TMDB yet." }, 404);
    }
    return json(trimShow(body));
  }
  return json({ results: body.results.filter(hasAirDate).map(trimShow) });
});
