// Producer / stage-manager page. After the giant wheel stops, pick the book here.
// The random-number screen is locked after every spin and only unlocks when a book is selected again.
(function () {
  const { BOOKS } = window.SpinBooks;
  const $ = (id) => document.getElementById(id);
  const el = { banner: $("banner"), big: $("big"), sub: $("sub"), spin: $("spin"), books: $("books"), typed: $("typed"),
    dot: $("dot"), connText: $("connText"), auto: $("auto"), duration: $("duration"), clear: $("clear") };
  const token = new URLSearchParams(location.search).get("token") || "";
  const game = window.SpinRemote.createRemote(token);
  let cur = null, lastResult = "";

  const picker = window.SpinPicker.createPicker({
    select: (b) => game.select(b), clear: () => game.clear(),
    update: (info) => {
      el.typed.classList.toggle("bad", info.bad);
      el.typed.textContent = !info.typed ? "" : info.bad ? info.typed + " — no match"
        : info.matches.length === 1 ? info.matches[0].name : info.matches.length + " books match — keep typing";
      buttons.forEach((btn, name) => {
        btn.classList.toggle("match", info.matches.length > 1 && info.matches.some((m) => m.name === name));
        btn.classList.toggle("dim", info.matches.length > 0 && !info.matches.some((m) => m.name === name));
      });
    },
  });

  const buttons = new Map();
  ["OT", "NT"].forEach((t) => {
    const h = document.createElement("h3");
    h.textContent = t === "OT" ? "Old Testament" : "New Testament";
    el.books.appendChild(h);
    BOOKS.filter((b) => b.testament === t).forEach((b) => {
      const btn = document.createElement("button");
      btn.type = "button"; btn.textContent = b.name; btn.setAttribute("aria-pressed", "false");
      btn.title = b.chapters + (b.chapters === 1 ? " chapter" : " chapters");
      btn.addEventListener("click", () => { btn.blur(); picker.reset(); game.select(b); });
      el.books.appendChild(btn); buttons.set(b.name, btn);
    });
  });

  function apply(s) {
    cur = s;
    el.banner.dataset.state = s.state;
    if (s.state === "result") lastResult = s.result.book + " " + s.result.chapter;
    if (s.state === "idle") { el.big.textContent = "LOCKED — select the book"; el.sub.textContent = lastResult ? "Last spin: " + lastResult : "Pick the book the wheel landed on."; }
    else if (s.state === "result") { el.big.textContent = "LOCKED — select the next book"; el.sub.textContent = "Last spin: " + lastResult; }
    else if (s.state === "armed") { el.big.textContent = "READY — " + s.book.name; el.sub.textContent = s.book.chapters + (s.book.chapters === 1 ? " chapter" : " chapters") + (s.autoSpin ? "" : " · press Enter or SPIN"); }
    else { el.big.textContent = "SPINNING — " + s.book.name; el.sub.textContent = "Please wait…"; }
    el.spin.disabled = s.state !== "armed";
    el.clear.disabled = s.state === "spinning" || s.state === "idle";
    buttons.forEach((btn, name) => {
      btn.setAttribute("aria-pressed", String(s.state === "armed" && s.book.name === name));
      btn.disabled = s.state === "spinning";
    });
    if (document.activeElement !== el.auto) el.auto.checked = s.autoSpin;
    if (document.activeElement !== el.duration) el.duration.value = s.duration / 1000;
  }

  el.spin.addEventListener("click", () => { el.spin.blur(); game.spin(); });
  el.clear.addEventListener("click", () => { picker.reset(); game.clear(); });
  el.auto.addEventListener("change", () => game.setAutoSpin(el.auto.checked));
  el.duration.addEventListener("change", () => game.setDuration((Math.max(1, Math.min(30, parseFloat(el.duration.value) || 5))) * 1000));

  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target instanceof HTMLInputElement) { if (e.key === "Enter" || e.key === "Escape") e.target.blur(); return; }
    if (cur && cur.state === "spinning") return;
    if (e.key === "Enter") { if (e.target instanceof HTMLButtonElement) return; e.preventDefault(); picker.reset(); game.spin(); return; }
    picker.key(e);
  });

  game.onConnection((up) => { el.dot.classList.toggle("off", !up); el.connText.textContent = up ? "Connected" : "Reconnecting…"; if (!up) { el.big.textContent = "Reconnecting…"; el.spin.disabled = true; } });
  game.subscribe(apply);
})();
