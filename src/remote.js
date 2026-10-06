// Browser client for server.js. Same shape as the engine (subscribe/select/clear/spin/...),
// but every call goes to the server, which is the single source of truth.
(function (root) {
  function createRemote(token) {
    const subs = new Set(), conn = new Set();
    let last = null, chain = Promise.resolve();
    const q = token ? "?token=" + encodeURIComponent(token) : "";
    const qa = token ? "&token=" + encodeURIComponent(token) : "";

    const es = new EventSource("/api/events" + q);
    es.onmessage = (e) => { last = JSON.parse(e.data); subs.forEach((f) => f(last)); };
    es.onopen = () => conn.forEach((f) => f(true));
    es.onerror = () => conn.forEach((f) => f(false));

    // Requests are sent strictly one after another so rapid key presses can't be reordered.
    function call(path, params) {
      const url = "/api/" + path + (params ? "?" + params + qa : q);
      chain = chain.then(() => fetch(url, { method: "POST" }).then((r) => r.json()).catch(() => ({ ok: false, error: "server unreachable" })));
      return chain;
    }
    return {
      snapshot: () => last,
      subscribe(f) { subs.add(f); if (last) f(last); return () => subs.delete(f); },
      onConnection(f) { conn.add(f); },
      select: (b) => call("book/" + encodeURIComponent(typeof b === "object" ? b.name : b)),
      clear: () => call("clear"),
      spin: () => call("spin"),
      setDuration: (ms) => call("settings", "duration=" + Math.round(ms / 1000)),
      setAutoSpin: (on) => call("settings", "autoSpin=" + (on ? 1 : 0)),
    };
  }
  root.SpinRemote = { createRemote };
})(window);
