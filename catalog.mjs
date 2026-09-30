import { readFileSync } from "node:fs";

const raw = readFileSync(new URL("../stickers.json", import.meta.url), "utf8");

export const catalog = Object.freeze(JSON.parse(raw));

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\s，。！？、,.!?;；:：~～—_-]+/g, "");
}

function scoreSticker(sticker, query) {
  const q = normalize(query);
  if (!q) return 1;

  const id = normalize(sticker.id);
  const name = normalize(sticker.name);
  const labels = sticker.labels.map(normalize);
  let score = 0;

  if (q === id) score += 1000;
  if (q === name) score += 500;
  if (name.includes(q)) score += 180;
  if (q.includes(name)) score += 150;

  for (const label of labels) {
    if (q === label) score += 220;
    else if (q.includes(label)) score += 90 + Math.min(label.length, 8);
    else if (q.length >= 2 && label.includes(q)) score += 65;
  }

  return score;
}

export function searchStickers(query = "", limit = 6) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 6, 12));
  const scored = catalog
    .map(sticker => ({ sticker, score: scoreSticker(sticker, query) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.sticker.id.localeCompare(b.sticker.id));

  return scored.slice(0, safeLimit).map(item => item.sticker);
}

export function getSticker(id) {
  const wanted = String(id ?? "").trim().padStart(3, "0");
  return catalog.find(sticker => sticker.id === wanted);
}

export function stickerWithUrl(sticker, baseUrl) {
  return {
    id: sticker.id,
    name: sticker.name,
    labels: sticker.labels,
    imageUrl: `${baseUrl.replace(/\/$/, "")}/stickers/${encodeURIComponent(sticker.file)}`
  };
}
