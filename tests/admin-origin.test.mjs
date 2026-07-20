import test from "node:test";
import assert from "node:assert/strict";
import { handleAdminApi } from "../worker/admin-api.mjs";

test("allows the public GitHub Pages origin to use the admin API", async () => {
  const request = new Request("https://api.example/api/admin/login", {
    method: "POST",
    headers: { origin: "https://tenten-ensuku.github.io", "content-type": "application/json" },
    body: JSON.stringify({ password: "test-password" }),
  });
  const response = await handleAdminApi(request, { ADMIN_PASSWORD: "test-password" });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), "https://tenten-ensuku.github.io");
});

test("rejects unrelated origins", async () => {
  const request = new Request("https://api.example/api/admin/login", {
    method: "POST",
    headers: { origin: "https://evil.example", "content-type": "application/json" },
    body: JSON.stringify({ password: "test-password" }),
  });
  const response = await handleAdminApi(request, { ADMIN_PASSWORD: "test-password" });
  assert.equal(response.status, 403);
});
