import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { catalog, getSticker, searchStickers, stickerWithUrl } from "../lib/catalog.mjs";

test("catalog contains 29 unique stickers", () => {
  assert.equal(catalog.length, 29);
  assert.equal(new Set(catalog.map(item => item.id)).size, 29);
});

test("all catalog images are real JPEG files", () => {
  for (const sticker of catalog) {
    const file = new URL(`../public/stickers/${sticker.file}`, import.meta.url);
    assert.equal(existsSync(file), true, `${sticker.file} is missing`);
    const bytes = readFileSync(file).subarray(0, 3);
    assert.deepEqual([...bytes], [0xff, 0xd8, 0xff], `${sticker.file} is not JPEG`);
  }
});

test("Chinese intent search finds useful stickers", () => {
  assert.ok(searchStickers("给我一个委屈的表情").some(item => item.labels.includes("委屈")));
  assert.ok(searchStickers("想抱抱").some(item => item.id === "020"));
  assert.equal(searchStickers("查岗", 1)[0].id, "029");
});

test("IDs are normalized and image URLs are absolute", () => {
  const sticker = getSticker("1");
  assert.equal(sticker.id, "001");
  assert.equal(stickerWithUrl(sticker, "https://example.com/").imageUrl, "https://example.com/stickers/001.jpg");
});
