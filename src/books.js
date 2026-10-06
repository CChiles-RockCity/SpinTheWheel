// The 66 books of the Bible with chapter counts, in canonical order.
(function (root) {
  const OT = [
    ["Genesis", 50], ["Exodus", 40], ["Leviticus", 27], ["Numbers", 36], ["Deuteronomy", 34],
    ["Joshua", 24], ["Judges", 21], ["Ruth", 4], ["1 Samuel", 31], ["2 Samuel", 24],
    ["1 Kings", 22], ["2 Kings", 25], ["1 Chronicles", 29], ["2 Chronicles", 36], ["Ezra", 10],
    ["Nehemiah", 13], ["Esther", 10], ["Job", 42], ["Psalms", 150], ["Proverbs", 31],
    ["Ecclesiastes", 12], ["Song of Solomon", 8], ["Isaiah", 66], ["Jeremiah", 52], ["Lamentations", 5],
    ["Ezekiel", 48], ["Daniel", 12], ["Hosea", 14], ["Joel", 3], ["Amos", 9],
    ["Obadiah", 1], ["Jonah", 4], ["Micah", 7], ["Nahum", 3], ["Habakkuk", 3],
    ["Zephaniah", 3], ["Haggai", 2], ["Zechariah", 14], ["Malachi", 4],
  ];
  const NT = [
    ["Matthew", 28], ["Mark", 16], ["Luke", 24], ["John", 21], ["Acts", 28],
    ["Romans", 16], ["1 Corinthians", 16], ["2 Corinthians", 13], ["Galatians", 6], ["Ephesians", 6],
    ["Philippians", 4], ["Colossians", 4], ["1 Thessalonians", 5], ["2 Thessalonians", 3], ["1 Timothy", 6],
    ["2 Timothy", 4], ["Titus", 3], ["Philemon", 1], ["Hebrews", 13], ["James", 5],
    ["1 Peter", 5], ["2 Peter", 3], ["1 John", 5], ["2 John", 1], ["3 John", 1],
    ["Jude", 1], ["Revelation", 22],
  ];

  const BOOKS = []
    .concat(OT.map(([name, chapters]) => ({ name, chapters, testament: "OT" })))
    .concat(NT.map(([name, chapters]) => ({ name, chapters, testament: "NT" })));
  BOOKS.forEach((b, i) => { b.index = i; b.key = normalize(b.name); });

  // "1 John" -> "1john", "Song of Solomon" -> "songofsolomon"
  function normalize(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  // Books whose name starts with the typed text. "1jo" -> [1 John]; "jo" -> Job, Joel, John, ...
  function matchBooks(query) {
    const q = normalize(query);
    if (!q) return [];
    return BOOKS.filter((b) => b.key.startsWith(q));
  }

  // Unbiased random integer in [1, max] using crypto (rejection sampling), with Math.random fallback.
  function randomChapter(max, rng) {
    if (!Number.isInteger(max) || max < 1) throw new RangeError("max must be a positive integer");
    if (rng) return Math.floor(rng() * max) + 1;
    const c = root.crypto || (typeof require === "function" ? require("crypto").webcrypto : null);
    if (!c || !c.getRandomValues) return Math.floor(Math.random() * max) + 1;
    const limit = Math.floor(0x100000000 / max) * max;
    const buf = new Uint32Array(1);
    do { c.getRandomValues(buf); } while (buf[0] >= limit);
    return (buf[0] % max) + 1;
  }

  const api = { BOOKS, normalize, matchBooks, randomChapter };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.SpinBooks = api;
})(typeof window !== "undefined" ? window : globalThis);
