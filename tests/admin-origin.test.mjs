import test from "node:test";
import assert from "node:assert/strict";
import { handleAdminApi } from "../worker/admin-api.mjs";

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
