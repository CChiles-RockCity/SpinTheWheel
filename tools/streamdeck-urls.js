#!/usr/bin/env node
// Prints one line per book: the URL a Stream Deck / Companion button should request.
//   node tools/streamdeck-urls.js http://10.0.0.5:8080 [token]   [--csv]
const { BOOKS } = require("../src/books.js");
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const base = (args[0] || "http://localhost:8080").replace(/\/$/, "");
const q = args[1] ? "?token=" + encodeURIComponent(args[1]) : "";
const csv = process.argv.includes("--csv");
if (csv) console.log("book,chapters,url");
for (const b of BOOKS) {
  const url = base + "/api/book/" + encodeURIComponent(b.name) + q;
  console.log(csv ? `"${b.name}",${b.chapters},${url}` : b.name.padEnd(16) + url);
}
console.log((csv ? "" : "\n") + (csv ? "" : "Spin".padEnd(16)) + base + "/api/spin" + q);
