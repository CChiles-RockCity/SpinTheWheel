// Spin state machine. The chapter range is always derived from the currently selected
// book at the instant the spin starts, so a chapter outside the book can never be produced.
//
//   idle --select(book)--> armed --spin--> spinning --finish--> result --select(book)--> armed
//
// Spinning is impossible from `idle`, and the selection is cleared after every result, so a stale
// book from the previous spin can never be reused by accident.
(function (root) {
  const B = typeof require === "function" ? require("./books.js") : root.SpinBooks;

  function createMachine(rng) {
    let state = "idle";
    let book = null;
    let result = null;

    return {
      get state() { return state; },
      get book() { return book; },
      get result() { return result; },

      // Choose (or change) the book. Ignored while a spin is in progress.
      select(b) {
        if (state === "spinning") return false;
        book = b;
        result = null;
        state = "armed";
        return true;
      },
      clear() {
        if (state === "spinning") return false;
        book = null; result = null; state = "idle";
        return true;
      },
      // Returns { book, max, chapter } or null if no book is armed.
      spin() {
        if (state !== "armed" || !book) return null;
        state = "spinning";
        const max = book.chapters;
        result = { book, max, chapter: B.randomChapter(max, rng) };
        return result;
      },
      // Called when the animation ends. Locks the result and requires a fresh selection for the next spin.
      finish() {
        if (state !== "spinning") return null;
        state = "result";
        book = null;
        return result;
      },
    };
  }

  const api = { createMachine };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.SpinMachine = api;
})(typeof window !== "undefined" ? window : globalThis);
