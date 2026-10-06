// The authoritative game engine: the spin state machine plus the spin timer, a snapshot for
// clients, and change notifications. The same code runs in Node (server.js, shared by every
// screen) and in the browser (standalone mode).
(function (root) {
  const isNode = typeof require === "function" && typeof module !== "undefined";
  const Books = isNode ? require("./books.js") : root.SpinBooks;
  const Machine = isNode ? require("./machine.js") : root.SpinMachine;

  const MIN_MS = 1000, MAX_MS = 30000;
  const clamp = (n) => Math.max(MIN_MS, Math.min(MAX_MS, Math.round(Number(n)) || 5000));

  // Exact book lookup by name ("1 John", "1john"). Prefix guessing is only for typing, never for the API.
  function findBook(x) {
    const key = x && typeof x === "object" ? x.key : Books.normalize(x);
    return Books.BOOKS.find((b) => b.key === key) || null;
  }

  function createEngine(opts) {
    opts = opts || {};
    const now = opts.now || Date.now;
    const setT = opts.setTimeout || setTimeout;
    const clearT = opts.clearTimeout || clearTimeout;
    const machine = Machine.createMachine(opts.rng);
    let duration = clamp(opts.duration || 5000);
    let autoSpin = !!opts.autoSpin;
    let startedAt = 0, timer = null, seq = 0, spinId = 0;
    const subs = new Set();

    function snapshot() {
      const st = machine.state;
      return {
        seq, spinId, state: st, duration, autoSpin,
        book: machine.book ? { name: machine.book.name, chapters: machine.book.chapters } : null,
        // The chapter is withheld until the spin has finished.
        result: st === "result" ? { book: machine.result.book.name, chapter: machine.result.chapter, max: machine.result.max } : null,
        elapsedMs: st === "spinning" ? now() - startedAt : 0,
      };
    }
    function emit() { seq++; const s = snapshot(); subs.forEach((f) => f(s)); return s; }
    const fail = (error) => ({ ok: false, error, snapshot: snapshot() });
    const done = () => ({ ok: true, snapshot: snapshot() });

    function spinNow() {
      if (machine.state === "spinning") return fail("busy: a spin is in progress");
      const r = machine.spin();
      if (!r) return fail(machine.state === "result" ? "locked: select the next book first" : "locked: no book selected");
      spinId++; startedAt = now();
      timer = setT(() => { timer = null; machine.finish(); emit(); }, duration);
      emit();
      return done();
    }

    return {
      snapshot,
      subscribe(f) { subs.add(f); return () => subs.delete(f); },
      select(x) {
        const b = findBook(x);
        if (!b) return fail("unknown book");
        if (!machine.select(b)) return fail("busy: a spin is in progress");
        emit();
        return autoSpin ? spinNow() : done();
      },
      clear() {
        if (!machine.clear()) return fail("busy: a spin is in progress");
        emit(); return done();
      },
      spin: spinNow,
      setDuration(ms) { duration = clamp(ms); emit(); return done(); },
      setAutoSpin(on) { autoSpin = !!on; emit(); return done(); },
      dispose() { if (timer) clearT(timer); subs.clear(); },
    };
  }

  const api = { createEngine, findBook };
  if (isNode) module.exports = api; else root.SpinEngine = api;
})(typeof window !== "undefined" ? window : globalThis);
