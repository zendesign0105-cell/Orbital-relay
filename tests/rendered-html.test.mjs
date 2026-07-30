import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the single-screen Particle Signal tool", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(
    html,
    /<title>Particle Signal — Turn Images Into Interactive Particles<\/title>/i,
  );
  assert.match(html, /Turn any image into a/);
  assert.match(html, /living signal/);
  assert.match(html, /Choose an image/);
  assert.match(html, /Processed locally/);
  assert.match(html, /Shape the signal/);
  assert.match(html, /Background cleanup/);
  assert.match(html, /Zoom out/);
  assert.match(html, /Zoom in/);
  assert.match(html, /Export PNG/);
  assert.doesNotMatch(html, /SYSTEM ARCHITECTURE|Return to orbit|THE RELAY/i);
});

test("keeps upload, interaction, and one-screen contracts in the source", async () => {
  const [page, css, layout] = await Promise.all([
    readFile(new URL("app/page.tsx", projectRoot), "utf8"),
    readFile(new URL("app/globals.css", projectRoot), "utf8"),
    readFile(new URL("app/layout.tsx", projectRoot), "utf8"),
  ]);

  assert.match(page, /accept="image\/\*"/);
  assert.match(page, /const MAX_POINTS = 60_000/);
  assert.match(page, /type ColorMode = "original" \| "tint"/);
  assert.match(page, /type ForceMode = "repel" \| "attract"/);
  assert.match(page, /type FocusMode = "subject" \| "full"/);
  assert.match(page, /getBackgroundPalette/);
  assert.match(page, /Background cleanup/);
  assert.match(page, /aria-label="Zoom out"/);
  assert.match(page, /aria-label="Zoom in"/);
  assert.match(page, /Drag to rotate/);
  assert.match(page, /Scroll to zoom/);
  assert.match(page, /Move to distort/);
  assert.match(page, /canvas\.toBlob/);
  assert.match(page, /getImageData/);
  assert.match(css, /height:\s*100svh/);
  assert.match(css, /overflow:\s*hidden/);
  assert.match(layout, /image-to-particle studio/i);
  assert.doesNotMatch(layout, /communications satellite/i);
});
