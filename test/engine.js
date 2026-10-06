const assert = require("assert");
const { createEngine } = require("../src/engine.js");

// fake clock
let t = 0, queue = [];
const clock = {
  now: () => t,
  setTimeout: (fn, ms) => { const h = { fn, at: t + ms }; queue.push(h); return h; },
  clearTimeout: (h) => { queue = queue.filter((x) => x !== h); },
  advance(ms) { const end = t + ms; for (;;) { queue.sort((a, b) => a.at - b.at); const n = queue[0]; if (!n || n.at > end) break; queue.shift(); t = n.at; n.fn(); } t = end; },
};
const make = (o) => createEngine(Object.assign({ now: clock.now, setTimeout: clock.setTimeout, clearTimeout: clock.clearTimeout, duration: 5000 }, o));

// locked until a book is selected
let e = make();
assert.strictEqual(e.snapshot().state, "idle");
assert.strictEqual(e.spin().ok, false);

// select -> spin -> locked mid-spin -> result -> locked again until next select
assert.strictEqual(e.select("Psalms").ok, true);
assert.strictEqual(e.snapshot().state, "armed");
assert.strictEqual(e.spin().ok, true);
let s = e.snapshot();
assert.strictEqual(s.state, "spinning");
assert.strictEqual(s.result, null, "chapter is withheld while spinning");
clock.advance(2000);
assert.strictEqual(e.snapshot().elapsedMs, 2000);
assert.strictEqual(e.select("Ruth").ok, false, "cannot change book mid-spin");
assert.strictEqual(e.spin().ok, false, "no double spin");
clock.advance(3000);
s = e.snapshot();
assert.strictEqual(s.state, "result");
assert.ok(s.result.chapter >= 1 && s.result.chapter <= 150 && s.result.book === "Psalms");
assert.strictEqual(s.book, null);
assert.match(e.spin().error, /locked/, "locked after a result");
assert.strictEqual(e.select("1john").ok, true, "API names are forgiving about spacing/case");
assert.strictEqual(e.snapshot().book.name, "1 John");
assert.strictEqual(e.select("jo").ok, false, "prefixes are not accepted by the API");
assert.strictEqual(e.select("Nope").ok, false);

// changing your mind before the spin is fine, and the range follows the LAST selection
e.select("Psalms"); e.select("Obadiah"); e.spin(); clock.advance(5000);
assert.deepStrictEqual([e.snapshot().result.book, e.snapshot().result.chapter], ["Obadiah", 1]);

// clear
e.select("Ruth"); assert.strictEqual(e.clear().ok, true); assert.strictEqual(e.snapshot().state, "idle");
assert.strictEqual(e.spin().ok, false);

// auto spin
e = make({ autoSpin: true });
e.select("Ruth"); assert.strictEqual(e.snapshot().state, "spinning");
clock.advance(5000); assert.strictEqual(e.snapshot().state, "result");

// settings + notifications
e = make(); const seen = []; e.subscribe((x) => seen.push(x.state));
e.setDuration(9000); assert.strictEqual(e.snapshot().duration, 9000);
e.setDuration(999999); assert.strictEqual(e.snapshot().duration, 30000);
e.setDuration(-5); assert.ok(e.snapshot().duration >= 1000);
e.select("Ruth"); e.spin(); clock.advance(30000);
assert.deepStrictEqual(seen.slice(-3), ["armed", "spinning", "result"]);
console.log("engine tests passed");
