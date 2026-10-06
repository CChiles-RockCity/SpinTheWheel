// Type-ahead book picker shared by the display (standalone mode) and the control page.
// A unique match selects the book. Anything ambiguous/unknown DISARMS, so Enter can never spin a stale book.
(function (root) {
  const isNode = typeof require === "function" && typeof module !== "undefined";
  const Books = isNode ? require("./books.js") : root.SpinBooks;

  function createPicker(o) {
    let typed = "", timer = null;
    const emit = (matches, bad) => o.update({ typed, matches: matches || [], bad: !!bad });
    function reset() { typed = ""; clearTimeout(timer); emit([]); }
    function changed() {
      clearTimeout(timer);
      timer = setTimeout(() => { typed = ""; emit([]); }, 2500);
      const m = Books.matchBooks(typed);
      if (m.length === 1) { o.select(m[0]); emit(m); }
      else { o.clear(); emit(m, m.length === 0); }
    }
    // Returns true when the key was consumed.
    function key(e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return false;
      if (/^[a-z0-9]$/i.test(e.key)) { typed += e.key; changed(); return true; }
      if (e.key === "Backspace") { typed = typed.slice(0, -1); if (typed) changed(); else { reset(); o.clear(); } return true; }
      if (e.key === "Escape") { reset(); o.clear(); return true; }
      return false;
    }
    return { key, reset };
  }

  const api = { createPicker };
  if (isNode) module.exports = api; else root.SpinPicker = api;
})(typeof window !== "undefined" ? window : globalThis);
