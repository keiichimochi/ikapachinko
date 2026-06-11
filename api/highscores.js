import { list, put } from "@vercel/blob";

const PATHNAME = "data/highscores.json";
const MAX_SCORES = 50;
const API_VERSION = 2;
const GAME_ID = "ikapachinko";

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
  const countPlay = raw?.countPlay !== false;
  const gameId = String(raw?.gameId || GAME_ID).trim().slice(0, 32) || GAME_ID;
  return {
    gameId,
    name,
    score,
    milestone,
    deviceId,
    countPlay,
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
      gameId: String(entry.gameId || GAME_ID).trim().slice(0, 32) || GAME_ID,
      deviceId: String(entry.deviceId || "").trim().slice(0, 64),
      date: String(entry.date || ""),
    }))
    .sort((a, b) => b.score - a.score || a.date.localeCompare(b.date))
    .slice(0, MAX_SCORES);
}

function emptyData() {
  return {
    scores: [],
    stats: {
      totalPlays: 0,
      uniqueUsers: 0,
      updatedAt: null,
    },
    users: {},
  };
}

function normalizeData(parsed) {
  const data = emptyData();
  data.scores = sortScores(Array.isArray(parsed) ? parsed : parsed?.scores || []);
  const users = parsed?.users && typeof parsed.users === "object" ? parsed.users : {};
  data.users = Object.fromEntries(
    Object.entries(users).map(([id, user]) => [
      String(id).slice(0, 64),
      {
        name: String(user?.name || "IKA").trim().slice(0, 12) || "IKA",
        plays: Math.max(0, Math.floor(Number(user?.plays) || 0)),
        bestScore: Math.max(0, Math.floor(Number(user?.bestScore) || 0)),
        firstSeen: String(user?.firstSeen || ""),
        lastSeen: String(user?.lastSeen || ""),
      },
    ]),
  );
  const gameOverCounts = {};
  for (const entry of data.scores) {
    if (!entry.deviceId) continue;
    const current = data.users[entry.deviceId] || {
      name: entry.name,
      plays: 0,
      bestScore: 0,
      firstSeen: entry.date,
      lastSeen: entry.date,
    };
    current.name = current.name || entry.name;
    current.bestScore = Math.max(current.bestScore || 0, entry.score);
    current.firstSeen = current.firstSeen || entry.date;
    current.lastSeen = entry.date || current.lastSeen;
    if (entry.milestone === "GAME OVER") {
      gameOverCounts[entry.deviceId] = (gameOverCounts[entry.deviceId] || 0) + 1;
    }
    data.users[entry.deviceId] = current;
  }
  for (const [id, count] of Object.entries(gameOverCounts)) {
    data.users[id].plays = Math.max(data.users[id].plays || 0, count);
  }
  const stats = parsed?.stats || {};
  const userPlayCount = Object.values(data.users).reduce(
    (sum, user) => sum + Math.max(0, Math.floor(Number(user.plays) || 0)),
    0,
  );
  const scoreDeviceCount = new Set(data.scores.map((entry) => entry.deviceId).filter(Boolean))
    .size;
  const scoreGameOverCount = data.scores.filter((entry) => entry.milestone === "GAME OVER")
    .length;
  data.stats = {
    totalPlays: Math.max(
      0,
      Math.floor(Number(stats.totalPlays) || 0),
      userPlayCount,
      scoreGameOverCount,
    ),
    uniqueUsers: Math.max(Object.keys(data.users).length, scoreDeviceCount),
    updatedAt: stats.updatedAt || null,
  };
  return data;
}

async function readData() {
  const found = await list({ prefix: PATHNAME, limit: 1 });
  const blob = found.blobs.find((item) => item.pathname === PATHNAME);
  if (!blob) return emptyData();
  const response = await fetch(blob.url, { cache: "no-store" });
  if (!response.ok) return emptyData();
  const parsed = await response.json().catch(() => emptyData());
  return normalizeData(parsed);
}

async function writeData(data) {
  const normalized = normalizeData(data);
  normalized.stats.uniqueUsers = Object.keys(normalized.users).length;
  normalized.stats.updatedAt = new Date().toISOString();
  await put(PATHNAME, JSON.stringify(normalized), {
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
      const data = await readData();
      return json(res, 200, { apiVersion: API_VERSION, scores: data.scores, stats: data.stats });
    }

    if (req.method === "POST") {
      const body =
        typeof req.body === "object" && req.body
          ? req.body
          : JSON.parse(req.body || "{}");
      const entry = sanitizeEntry(body);
      if (entry.score <= 0 && !entry.countPlay) {
        return json(res, 400, { error: "invalid_score" });
      }
      const data = await readData();
      const now = entry.date;
      if (entry.deviceId) {
        const current = data.users[entry.deviceId] || {
          name: entry.name,
          plays: 0,
          bestScore: 0,
          firstSeen: now,
          lastSeen: now,
        };
        current.name = current.name || entry.name;
        if (entry.countPlay) current.plays += 1;
        current.bestScore = Math.max(current.bestScore || 0, entry.score);
        current.firstSeen = current.firstSeen || now;
        current.lastSeen = now;
        data.users[entry.deviceId] = current;
      }
      if (entry.countPlay) data.stats.totalPlays += 1;
      const scoreEntries = entry.score > 0 ? [...data.scores, entry] : data.scores;
      const allScores = scoreEntries.sort(
        (a, b) => b.score - a.score || a.date.localeCompare(b.date),
      );
      const rank =
        entry.score > 0
          ? allScores.findIndex((item) => item.date === entry.date && item.score === entry.score) +
            1
          : null;
      const scores = sortScores(allScores);
      data.scores = scores;
      await writeData(data);
      return json(res, 200, {
        apiVersion: API_VERSION,
        scores,
        stats: normalizeData(data).stats,
        rank,
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
