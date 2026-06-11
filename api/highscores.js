import { list, put } from "@vercel/blob";

const PATHNAME = "data/highscores.json";
const MAX_SCORES = 50;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function sanitizeEntry(raw) {
  const score = Math.max(0, Math.min(999999999, Math.floor(Number(raw?.score) || 0)));
  const name = String(raw?.name || "IKA").trim().slice(0, 12) || "IKA";
  const milestone = String(raw?.milestone || "GAME OVER").trim().slice(0, 24);
  const deviceId = String(raw?.deviceId || "").trim().slice(0, 64);
  return {
    name,
    score,
    milestone,
    deviceId,
    date: new Date().toISOString(),
  };
}

function sortScores(scores) {
  return scores
    .filter((entry) => entry && Number.isFinite(Number(entry.score)))
    .map((entry) => ({
      name: String(entry.name || "IKA").trim().slice(0, 12) || "IKA",
      score: Math.max(0, Math.floor(Number(entry.score) || 0)),
      milestone: String(entry.milestone || "").trim().slice(0, 24),
      deviceId: String(entry.deviceId || "").trim().slice(0, 64),
      date: String(entry.date || ""),
    }))
    .sort((a, b) => b.score - a.score || a.date.localeCompare(b.date))
    .slice(0, MAX_SCORES);
}

async function readScores() {
  const found = await list({ prefix: PATHNAME, limit: 1 });
  const blob = found.blobs.find((item) => item.pathname === PATHNAME);
  if (!blob) return [];
  const response = await fetch(blob.url, { cache: "no-store" });
  if (!response.ok) return [];
  const parsed = await response.json().catch(() => []);
  return sortScores(Array.isArray(parsed) ? parsed : parsed.scores || []);
}

async function writeScores(scores) {
  await put(PATHNAME, JSON.stringify(sortScores(scores)), {
    access: "public",
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 0,
  });
}

export default async function handler(req, res) {
  if (
    !process.env.BLOB_READ_WRITE_TOKEN &&
    !process.env.VERCEL_OIDC_TOKEN &&
    !process.env.BLOB_STORE_ID
  ) {
    return json(res, 503, {
      error: "highscore_storage_not_configured",
      message: "Link a Vercel Blob store to enable shared highscores.",
      scores: [],
    });
  }

  try {
    if (req.method === "GET") {
      const scores = await readScores();
      return json(res, 200, { scores });
    }

    if (req.method === "POST") {
      const body =
        typeof req.body === "object" && req.body
          ? req.body
          : JSON.parse(req.body || "{}");
      const entry = sanitizeEntry(body);
      if (entry.score <= 0) {
        return json(res, 400, { error: "invalid_score" });
      }
      const scores = sortScores([...(await readScores()), entry]);
      await writeScores(scores);
      return json(res, 200, {
        scores,
        rank: scores.findIndex((item) => item.date === entry.date && item.score === entry.score) + 1,
      });
    }

    res.setHeader("Allow", "GET, POST");
    return json(res, 405, { error: "method_not_allowed" });
  } catch (error) {
    return json(res, 500, {
      error: "highscore_api_error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
