import test from "node:test";
import assert from "node:assert/strict";
import { handleAdminApi } from "../worker/admin-api.mjs";
import { handleLearningApi } from "../worker/learning-api.mjs";

for (const [name, handle, path] of [
  ["教材", handleAdminApi, "/api/notebook"],
  ["学習記録", handleLearningApi, "/api/learning/sync"],
]) {
  test(`${name} API permits only the production Cloudflare Pages origin`, async () => {
    const origin = "https://sakurakou-lesson-review.pages.dev";
    const response = await handle(new Request(`https://api.example${path}`, {
      method: "OPTIONS", headers: { origin },
    }), {});
    assert.equal(response.status, 204);
    assert.equal(response.headers.get("access-control-allow-origin"), origin);
    assert.match(response.headers.get("access-control-allow-methods"), /POST/);
    for (const origin of ["https://unrelated.pages.dev", "https://preview.sakurakou-lesson-review.pages.dev", "https://sakurakou-lesson-review.pages.dev.evil.example"]) {
      const denied = await handle(new Request(`https://api.example${path}`, {
        method: "OPTIONS", headers: { origin },
      }), {});
      assert.equal(denied.status, 403);
      assert.equal(denied.headers.get("access-control-allow-origin"), null);
    }
  });
}

test("allows the public GitHub Pages origin to use the notebook API without a password", async () => {
  const request = new Request("https://api.example/api/notebook", {
    method: "OPTIONS",
    headers: { origin: "https://tenten-ensuku.github.io" },
  });
  const response = await handleAdminApi(request, {});
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), "https://tenten-ensuku.github.io");
});

test("rejects unrelated origins", async () => {
  const request = new Request("https://api.example/api/notebook", {
    method: "GET",
    headers: { origin: "https://evil.example" },
  });
  const response = await handleAdminApi(request, {});
  assert.equal(response.status, 403);
});
