#!/usr/bin/env node
// Spin the Wheel server: serves the display (/) and control (/control) pages and keeps the one
// authoritative game state, so every screen, the Stream Deck and the producer's tablet agree.
// No dependencies. Usage:  node server.js   (PORT=8080 HOST=0.0.0.0 SPIN_TOKEN=secret DURATION=5 AUTO_SPIN=0)
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { createEngine } = require("./src/engine.js");
const { BOOKS } = require("./src/books.js");

const STATIC = {
  "/": "index.html", "/index.html": "index.html", "/control": "control.html", "/control.html": "control.html",
  "/style.css": "style.css", "/src/books.js": "src/books.js", "/src/machine.js": "src/machine.js",
  "/src/engine.js": "src/engine.js", "/src/picker.js": "src/picker.js", "/src/remote.js": "src/remote.js",
  "/src/app.js": "src/app.js", "/src/control.js": "src/control.js",
};
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8" };

function createApp(opts) {
  opts = opts || {};
  const token = opts.token || "";
  const engine = createEngine({ duration: (opts.duration || 5) * 1000, autoSpin: !!opts.autoSpin, rng: opts.rng });
  const clients = new Set();
  engine.subscribe((s) => { for (const res of clients) res.write("data: " + JSON.stringify(s) + "\n\n"); });

  const send = (res, code, body, type) => {
    res.writeHead(code, { "Content-Type": type || "application/json; charset=utf-8", "Cache-Control": "no-store" });
    res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
  };

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://" + (req.headers.host || "localhost"));
    const p = url.pathname;

    if (!p.startsWith("/api/")) {
      const file = STATIC[p];
      if (!file) return send(res, 404, "Not found", "text/plain");
      return fs.readFile(path.join(__dirname, file), (err, data) =>
        err ? send(res, 500, "Error", "text/plain") : send(res, 200, data, TYPES[path.extname(file)]));
    }

    if (token && url.searchParams.get("token") !== token && req.headers["x-token"] !== token)
      return send(res, 401, { ok: false, error: "missing or wrong token" });

    if (p === "/api/state") return send(res, 200, engine.snapshot());
    if (p === "/api/books")
      return send(res, 200, BOOKS.map((b) => ({ name: b.name, chapters: b.chapters, path: "/api/book/" + encodeURIComponent(b.name) })));
    if (p === "/api/events") {
      res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store", Connection: "keep-alive" });
      res.write("data: " + JSON.stringify(engine.snapshot()) + "\n\n");
      clients.add(res);
      const beat = setInterval(() => res.write(": keep-alive\n\n"), 20000);
      req.on("close", () => { clearInterval(beat); clients.delete(res); });
      return;
    }

    // Everything below changes state. Refuse requests that a web page on another site made in the browser.
    const site = req.headers["sec-fetch-site"];
    if (site && site !== "same-origin" && site !== "none") return send(res, 403, { ok: false, error: "cross-site request refused" });
    if (req.method !== "GET" && req.method !== "POST") return send(res, 405, { ok: false, error: "use GET or POST" });

    let r;
    if (p.startsWith("/api/book/")) r = engine.select(decodeURIComponent(p.slice("/api/book/".length)));
    else if (p === "/api/spin") r = engine.spin();
    else if (p === "/api/clear") r = engine.clear();
    else if (p === "/api/settings") {
      if (url.searchParams.has("duration")) engine.setDuration(parseFloat(url.searchParams.get("duration")) * 1000);
      if (url.searchParams.has("autoSpin")) engine.setAutoSpin(url.searchParams.get("autoSpin") === "1");
      r = { ok: true, snapshot: engine.snapshot() };
    } else return send(res, 404, { ok: false, error: "unknown endpoint" });
    send(res, r.ok ? 200 : 409, { ok: r.ok, error: r.error, state: r.snapshot });
  });

  return { server, engine, close() { engine.dispose(); for (const c of clients) c.end(); server.close(); } };
}

if (require.main === module) {
  const port = parseInt(process.env.PORT, 10) || 8080;
  const host = process.env.HOST || "0.0.0.0";
  const token = process.env.SPIN_TOKEN || "";
  const app = createApp({ token, duration: parseFloat(process.env.DURATION) || 5, autoSpin: process.env.AUTO_SPIN === "1" });
  app.server.listen(port, host, () => {
    const t = token ? "?token=" + token : "";
    console.log("Spin the Wheel is running.\n");
    console.log("  Display (big screen):  http://localhost:" + port + "/" + t);
    console.log("  Control (producer):    http://localhost:" + port + "/control" + t);
    for (const list of Object.values(os.networkInterfaces()))
      for (const i of list || []) if (i.family === "IPv4" && !i.internal)
        console.log("  On your network:       http://" + i.address + ":" + port + "/control" + t);
    if (!token) console.log("\nNo SPIN_TOKEN set: anyone on this network can control it. Set SPIN_TOKEN=... to require one.");
  });
}
module.exports = { createApp };
