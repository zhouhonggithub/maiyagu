import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders the AI farm application shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>麦芽谷 · AI 农场<\/title>/i);
  assert.match(html, /正在打开麦芽谷/);
  assert.match(html, /class="app-boot"/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("ships the product entrypoint and local demo data", async () => {
  const [page, app, data, layout] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/AIFarmApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/farmData.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(page, /<AIFarmApp \/>/);
  assert.match(app, /maiyagu-session/);
  assert.match(app, /视频流待接入/);
  assert.match(app, /123456/);
  assert.match(data, /SOLAR_TERMS_2026/);
  assert.match(data, /Asia|杭州/i);
  assert.match(layout, /麦芽谷 · AI 农场/);
});
