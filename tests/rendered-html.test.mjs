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

test("ships the Version 4 MapLibre and H3 intelligence layer", async () => {
  const map = await readFile(new URL("../components/intelligence-map.tsx", import.meta.url), "utf8");
  const geo = await readFile(new URL("../lib/geo.ts", import.meta.url), "utf8");
  const schema = await readFile(new URL("../db/schema.ts", import.meta.url), "utf8");
  assert.match(map, /maplibre-gl/);
  assert.match(map, /cellToBoundary/);
  assert.match(map, /<polygon/);
  assert.match(map, /projectZones/);
  assert.match(geo, /latLngToCell/);
  assert.match(schema, /h3_cell/);
});
