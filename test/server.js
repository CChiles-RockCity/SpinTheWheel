const assert = require("assert");
const http = require("http");
const { createApp } = require("../server.js");

function req(port, path, method, headers) {
  return new Promise((resolve, reject) => {
    const r = http.request({ port, path, method: method || "GET", headers }, (res) => {
      let b = ""; res.on("data", (c) => (b += c)); res.on("end", () => resolve({ code: res.statusCode, body: b, headers: res.headers }));
    });
    r.on("error", reject); r.end();
  });
}
const json = (r) => JSON.parse(r.body);

(async () => {
  const app = createApp({ duration: 1, token: "sekret" });
  await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
  const port = app.server.address().port;

  const page = await req(port, "/");
  assert.strictEqual(page.code, 200);
  assert.ok(page.body.startsWith("<!DOCTYPE html>") && /text\/html/.test(page.headers["content-type"]), "index.html served as real HTML");
  assert.ok((await req(port, "/control")).body.includes("Spin the Wheel"));
  assert.ok((await req(port, "/src/engine.js")).body.includes("createEngine"));
  assert.ok(/text\/javascript/.test((await req(port, "/src/app.js")).headers["content-type"]));
  assert.strictEqual((await req(port, "/server.js")).code, 404, "only whitelisted files are served");
  assert.strictEqual((await req(port, "/../package.json")).code, 404);
  assert.strictEqual((await req(port, "/api/state")).code, 401, "token required");
  assert.strictEqual((await req(port, "/api/spin?token=wrong")).code, 401);

  const t = "?token=sekret";
  assert.strictEqual(json(await req(port, "/api/state" + t)).state, "idle");
  let r = await req(port, "/api/spin" + t, "POST");
  assert.strictEqual(r.code, 409, "spin refused with no book");

  r = await req(port, "/api/book/Psalms" + t);                       // GET works for Companion
  assert.strictEqual(r.code, 200); assert.strictEqual(json(r).state.book.name, "Psalms");
  r = await req(port, "/api/book/1%20John" + t, "POST");
  assert.strictEqual(json(r).state.book.name, "1 John");
  assert.strictEqual((await req(port, "/api/book/Bogus" + t)).code, 409);
  assert.strictEqual((await req(port, "/api/spin" + t, "POST", { "Sec-Fetch-Site": "cross-site" })).code, 403, "cross-site refused");
  assert.strictEqual((await req(port, "/api/spin" + t, "DELETE")).code, 405);

  r = await req(port, "/api/spin" + t, "POST");
  assert.strictEqual(r.code, 200); assert.strictEqual(json(r).state.state, "spinning");
  assert.strictEqual((await req(port, "/api/book/Ruth" + t, "POST")).code, 409, "locked mid-spin");
  await new Promise((r) => setTimeout(r, 1200));
  const s = json(await req(port, "/api/state" + t));
  assert.strictEqual(s.state, "result");
  assert.ok(s.result.chapter >= 1 && s.result.chapter <= 5 && s.result.book === "1 John");
  assert.strictEqual((await req(port, "/api/spin" + t, "POST")).code, 409, "locked after result");

  assert.strictEqual(json(await req(port, "/api/books" + t)).length, 66);
  await req(port, "/api/settings?duration=7&autoSpin=1" + "&token=sekret", "POST");
  assert.strictEqual(json(await req(port, "/api/state" + t)).duration, 7000);

  // server-sent events deliver a snapshot on connect and on change
  const events = await new Promise((resolve) => {
    const got = [];
    http.get({ port, path: "/api/events" + t }, (res) => {
      res.on("data", (c) => { got.push(...String(c).split("\n\n").filter((x) => x.startsWith("data:"))); if (got.length === 1) req(port, "/api/clear" + t, "POST"); if (got.length >= 2) { res.destroy(); resolve(got); } });
    });
  });
  assert.strictEqual(JSON.parse(events[1].slice(5)).state, "idle");

  app.close();
  console.log("server tests passed");
})().catch((e) => { console.error(e); process.exit(1); });
