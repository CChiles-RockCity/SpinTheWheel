// Display page. Two modes, chosen automatically:
//   server mode     — served by server.js: the producer's control page / Stream Deck pick the book.
//   standalone mode — opened as a plain file/static site: pick the book right here.
(async function () {
  const { BOOKS } = window.SpinBooks;
  const $ = (id) => document.getElementById(id);
  const el = {
    stage: $("stage"), book: $("book"), number: $("number"), typed: $("typed"), status: $("status"),
    books: $("books"), spin: $("spin"), sound: $("sound"), duration: $("duration"),
    fullscreen: $("fullscreen"), present: $("present"), conn: $("conn"),
  };
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
  };
  const token = new URLSearchParams(location.search).get("token") || "";

  // ---- pick the mode
  let game, remote = false;
  if (location.protocol.indexOf("http") === 0) {
    try {
      const r = await fetch("/api/state" + (token ? "?token=" + encodeURIComponent(token) : ""));
      if (r.status === 401) { el.book.textContent = "Token required"; el.book.classList.add("muted"); return; }
      if (r.ok && (await r.json()).state) { game = window.SpinRemote.createRemote(token); remote = true; }
    } catch (e) { /* not served by server.js */ }
  }
  if (!game) game = window.SpinEngine.createEngine({ duration: parseFloat(store.get("duration", "5")) * 1000 });
  document.body.classList.toggle("remote", remote);

  // ---- sound (synthesized)
  let soundOn = store.get("sound", "on") === "on", ctx = null;
  function tone(freq, dur, type, gain, when) {
    if (!soundOn) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();
      const t0 = ctx.currentTime + (when || 0), o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(gain, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(ctx.destination); o.start(t0); o.stop(t0 + dur);
    } catch (e) { /* audio unavailable */ }
  }
  const blip = () => tone(620 + Math.random() * 140, 0.05, "triangle", 0.08);
  const chime = () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.5, "sine", 0.14, i * 0.09));

  // ---- spin animation: fast ticks that ease out. The final number comes from the "result" snapshot.
  let timers = [];
  const cancelAnim = () => { timers.forEach(clearTimeout); timers = []; };
  function tickValue(max, prev) {
    if (max === 1) return 1;
    let v; do { v = 1 + Math.floor(Math.random() * max); } while (v === prev);
    return v;
  }
  function playSpin(max, total, elapsed) {
    cancelAnim();
    let t = 0, last = 0;
    while (t < total) {
      if (t >= elapsed) timers.push(setTimeout(() => { last = tickValue(max, last); el.number.textContent = last; blip(); }, t - elapsed));
      const p = t / total; t += 60 + 340 * p * p * p;
    }
  }

  // ---- render from a snapshot
  let cur = null;
  const picker = window.SpinPicker.createPicker({
    select: (b) => game.select(b), clear: () => game.clear(),
    update: (info) => {
      el.typed.hidden = !info.typed;
      el.typed.textContent = info.typed && info.bad ? info.typed + " — no match" : (info.matches.length === 1 ? info.matches[0].name : info.typed);
      el.typed.classList.toggle("bad", info.bad);
      if (!remote) markMatches(info.matches);
    },
  });

  function apply(s) {
    const prev = cur; cur = s;
    const newSpin = s.state === "spinning" && (!prev || prev.state !== "spinning" || prev.spinId !== s.spinId);
    const newResult = s.state === "result" && (!prev || prev.state !== "result" || prev.spinId !== s.spinId);
    if (s.state !== "spinning") cancelAnim();

    el.number.dataset.state = s.state;
    el.status.classList.remove("warn");
    if (s.state === "idle") {
      el.book.textContent = remote ? "Waiting for the wheel…" : "Pick a book"; el.book.classList.add("muted");
      el.number.textContent = "?";
      el.status.textContent = "No book selected — spin is locked";
    } else if (s.state === "armed") {
      el.book.textContent = s.book.name; el.book.classList.remove("muted");
      el.number.textContent = "?";
      el.status.textContent = s.book.name + " · " + s.book.chapters + (s.book.chapters === 1 ? " chapter" : " chapters") + " — press Enter to spin";
    } else if (s.state === "spinning") {
      el.book.textContent = s.book.name; el.book.classList.remove("muted");
      el.status.textContent = "Spinning…";
      if (newSpin) playSpin(s.book.chapters, s.duration, s.elapsedMs);
    } else {
      el.book.textContent = s.result.book; el.book.classList.remove("muted");
      el.number.textContent = s.result.chapter;
      el.status.textContent = s.result.book + " " + s.result.chapter + " — select the next book to spin again";
      if (newResult && prev && prev.state === "spinning") chime();
    }
    // restart the blink animation on every new result
    if (newResult) { el.number.style.animation = "none"; void el.number.offsetWidth; el.number.style.animation = ""; }

    el.spin.disabled = s.state !== "armed";
    buttons.forEach((btn, name) => {
      btn.setAttribute("aria-pressed", String(s.state === "armed" && s.book.name === name));
      btn.disabled = s.state === "spinning";
    });
    if (document.activeElement !== el.duration) el.duration.value = s.duration / 1000;
  }

  // ---- standalone-mode operator drawer
  const buttons = new Map();
  if (!remote) {
    ["OT", "NT"].forEach((t) => {
      const h = document.createElement("h3");
      h.textContent = t === "OT" ? "Old Testament" : "New Testament";
      el.books.appendChild(h);
      BOOKS.filter((b) => b.testament === t).forEach((b) => {
        const btn = document.createElement("button");
        btn.type = "button"; btn.textContent = b.name;
        btn.title = b.chapters + (b.chapters === 1 ? " chapter" : " chapters");
        btn.setAttribute("aria-pressed", "false");
        btn.addEventListener("click", () => { btn.blur(); picker.reset(); game.select(b); });
        el.books.appendChild(btn); buttons.set(b.name, btn);
      });
    });
  }
  function markMatches(matches) {
    buttons.forEach((btn, name) => {
      btn.classList.toggle("match", matches.length > 1 && matches.some((m) => m.name === name));
      btn.classList.toggle("dim", matches.length > 0 && !matches.some((m) => m.name === name));
    });
  }
  const setSoundLabel = () => { el.sound.textContent = "Sound: " + (soundOn ? "on" : "off"); el.sound.setAttribute("aria-pressed", String(soundOn)); };
  setSoundLabel();
  el.sound.addEventListener("click", () => { soundOn = !soundOn; store.set("sound", soundOn ? "on" : "off"); setSoundLabel(); });
  el.duration.addEventListener("change", () => { const s = Math.max(1, Math.min(30, parseFloat(el.duration.value) || 5)); store.set("duration", String(s)); game.setDuration(s * 1000); });
  el.spin.addEventListener("click", () => { el.spin.blur(); game.spin(); });
  el.fullscreen.addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
  });
  function sizeStage() { document.documentElement.style.setProperty("--stage-h", el.stage.clientHeight + "px"); }
  const setPresenting = (on) => { document.body.classList.toggle("presenting", on); sizeStage(); };
  el.present.addEventListener("click", () => setPresenting(true));

  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "Tab") { e.preventDefault(); if (!remote) setPresenting(!document.body.classList.contains("presenting")); return; }
    if (e.target instanceof HTMLInputElement) { if (e.key === "Enter" || e.key === "Escape") e.target.blur(); return; }
    if (cur && cur.state === "spinning") return;
    if (e.key === "Enter") {
      if (e.target instanceof HTMLButtonElement) return;
      e.preventDefault(); picker.reset(); game.spin(); return;   // also the presenter's clicker in server mode
    }
    if (!remote) picker.key(e);    // in server mode the producer picks the book, not this screen
  });

  if (remote) game.onConnection((up) => { el.conn.hidden = up; });
  new ResizeObserver(sizeStage).observe(el.stage);
  window.addEventListener("resize", sizeStage);
  game.subscribe(apply);
  if (!cur && game.snapshot()) apply(game.snapshot());
  sizeStage();
})();
