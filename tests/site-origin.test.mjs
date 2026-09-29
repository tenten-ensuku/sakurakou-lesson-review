import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SITE_ORIGIN, LEGACY_SITE_ORIGIN, resolveSiteUrl } from "../app/lib/site-origin.mjs";
import { tokenizeRichText } from "../app/lib/rich-text.mjs";
import { materialDetails } from "../app/lib/materials.mjs";
test("only this project's exact retired origin is remapped, preserving path/query/fragment",()=>{
  assert.equal(resolveSiteUrl(LEGACY_SITE_ORIGIN+"/api/images/a.jpg?x=1#zoom"),SITE_ORIGIN+"/api/images/a.jpg?x=1#zoom");
  for(const value of ["", "/api/notebook", "https://youtu.be/CNCAKOAMyqU",LEGACY_SITE_ORIGIN+".example.com/a", "https://example.com/?next="+LEGACY_SITE_ORIGIN,"javascript:alert(1)",SITE_ORIGIN+"/a"])
    assert.equal(resolveSiteUrl(value),value);
});
test("legacy question/image/resource URLs are resolved on display without changing editor data",()=>{
  const raw=`問題\n![盤面](${LEGACY_SITE_ORIGIN}/api/images/a.jpg)\n資料 ${LEGACY_SITE_ORIGIN}/materials/september-2026/0929.html`;
  const saved={question:raw,url:LEGACY_SITE_ORIGIN+"/materials/september-2026/0929.html",kind:"link",label:"まとめ"};
  const before=JSON.stringify(saved);
  const tokens=tokenizeRichText(saved.question);
  assert.ok(tokens.find(t=>t.type==="image").url.startsWith(SITE_ORIGIN));
  assert.ok(tokens.find(t=>t.type==="link").url.startsWith(SITE_ORIGIN));
  assert.equal(materialDetails(saved).service,"授業のまとめ");
  assert.equal(JSON.stringify(saved),before);
});
test("all rendered material pages and build targets use the current backend",()=>{
  for(const path of ["august-2026/0822","august-2026/0824","august-2026/0828","september-2026/0927","september-2026/0929"]){
    const html=readFileSync(`public/materials/${path}.html`,"utf8");
    assert.ok(!html.includes(LEGACY_SITE_ORIGIN));assert.ok(html.includes(SITE_ORIGIN));
  }
  const pkg=JSON.parse(readFileSync("package.json","utf8"));
  for(const build of ["build:pages","build:cloudflare"])assert.ok(pkg.scripts[build].includes(SITE_ORIGIN));
});
