const assert = require("assert");
const { BOOKS, matchBooks, randomChapter } = require("../src/books.js");
const { createMachine } = require("../src/machine.js");

// --- data
assert.strictEqual(BOOKS.length, 66);
assert.strictEqual(BOOKS.reduce((n, b) => n + b.chapters, 0), 1189, "Bible has 1,189 chapters");
assert.strictEqual(BOOKS.filter((b) => b.testament === "OT").length, 39);
assert.strictEqual(BOOKS.filter((b) => b.testament === "NT").length, 27);

// --- search
const one = (q) => { const m = matchBooks(q); assert.strictEqual(m.length, 1, `${q} -> ${m.map((b) => b.name)}`); return m[0].name; };
assert.strictEqual(one("psa"), "Psalms");
assert.strictEqual(one("1 jo"), "1 John");
assert.strictEqual(one("john"), "John");
assert.strictEqual(one("song"), "Song of Solomon");
assert.strictEqual(one("2co"), "2 Corinthians");
assert.ok(matchBooks("jo").length > 1, "jo is ambiguous");
assert.strictEqual(matchBooks("").length, 0);
assert.strictEqual(matchBooks("zzz").length, 0);
BOOKS.forEach((b) => assert.strictEqual(matchBooks(b.name)[0].name, b.name)); // full names resolve to themselves

// --- randomness stays in range, hits both ends
for (const b of BOOKS) {
  const seen = new Set();
  for (let i = 0; i < 3000; i++) {
    const c = randomChapter(b.chapters);
    assert.ok(Number.isInteger(c) && c >= 1 && c <= b.chapters, `${b.name}: ${c}`);
    seen.add(c);
  }
  if (b.chapters <= 20) assert.strictEqual(seen.size, b.chapters, `${b.name} covers every chapter`);
}
assert.throws(() => randomChapter(0));
assert.throws(() => randomChapter(NaN));

// --- the race-condition guarantees
const m = createMachine();
assert.strictEqual(m.spin(), null, "cannot spin with no book");
const ruth = BOOKS.find((b) => b.name === "Ruth");
const psalms = BOOKS.find((b) => b.name === "Psalms");
m.select(psalms);
assert.strictEqual(m.select(ruth), true, "can correct the book before spinning");
const r = m.spin();
assert.strictEqual(r.book.name, "Ruth");
assert.ok(r.chapter >= 1 && r.chapter <= 4, "range comes from Ruth, not Psalms");
assert.strictEqual(m.select(psalms), false, "selection locked mid-spin");
assert.strictEqual(m.spin(), null, "no double spin");
m.finish();
assert.strictEqual(m.state, "result");
assert.strictEqual(m.spin(), null, "cannot re-spin the previous book without reselecting");
m.select(psalms);
assert.strictEqual(m.spin().book.name, "Psalms");

console.log("all tests passed");
