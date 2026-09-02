import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ships CIVIQ product metadata", async () => {
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /CIVIQ \| Urban Intelligence Layer/);
  assert.match(layout, /citizen reports into live, prioritized problem zones/i);
  assert.doesNotMatch(layout, /Starter Project/);
});

test("declares the persistent database and evidence storage", async () => {
  const manifest = JSON.parse(await readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"));
  assert.equal(manifest.d1, "DB");
  assert.equal(manifest.r2, "BUCKET");
});
