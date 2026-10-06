# CLAUDE.md

Guidance for working on **Spin the Wheel**, the chapter picker for the Rock City Church game.

## What this is

IRL there is a giant 10-foot wheel with all 66 Bible books. When it stops on a book, the producer /
stage manager selects that book, and the big screen spins a random chapter **from that book only**.
After every spin the screen locks until a book is selected again.

Runs on a Mac or Raspberry Pi driving a projector/LED wall, with the producer on a phone/tablet,
and optionally a Stream Deck (via Bitfocus Companion).

## Hard requirements (do not regress these)

1. **A chapter outside the selected book must be impossible.** The original bug: a Stream Deck wrote
   the max chapter to a file *after* the wheel stopped, so a slow operator spun against the previous
   book's range. The range now comes from the selected book at the instant of the spin.
2. **Locked until a book is selected, and locked again after every result.**
3. Ambiguous/unknown typing (`jo`) **disarms** the selection so Enter can't spin a stale book.
4. No book changes mid-spin; the chosen chapter is **withheld from clients until the spin ends**.
5. **No runtime dependencies, no build step.** Plain HTML/CSS/JS plus a zero-dependency Node server
   (Node 16+). It must keep working offline on a Pi. Don't add a framework or npm packages.
6. Must still work **standalone** (opening `index.html` / static hosting, e.g. GitHub Pages) with no server.

## Architecture

| File | Role |
| --- | --- |
| `src/books.js` | The 66 books + chapter counts (1,189 total), type-ahead matching, unbiased `crypto` RNG |
| `src/machine.js` | State machine: `idle → armed → spinning → result` |
| `src/engine.js` | Machine + spin timer + snapshots + subscribe. **Same code runs in Node and the browser** |
| `src/picker.js` | Type-ahead picker shared by display (standalone) and control page |
| `src/remote.js` | Browser client for the server (SSE for updates, serialized POSTs for commands) |
| `src/app.js` | Display page (`index.html`). Auto-detects server mode vs standalone |
| `src/control.js` | Producer page (`control.html`) |
| `server.js` | HTTP + Server-Sent Events + JSON API; the single source of truth in server mode |
| `tools/streamdeck-urls.js` | Prints the per-book URLs for Companion buttons |
| `docs/streamdeck.md` | Stream Deck / Companion setup |

The `src/*.js` files are UMD-style (`module.exports` in Node, `window.*` in browsers) so tests and
the server import the exact code the browser runs. Keep them as classic scripts (no ES modules):
Chrome blocks module imports from `file://`, which would break standalone mode.

API (GET or POST): `/api/book/<name>`, `/api/spin`, `/api/clear`, `/api/settings?duration=&autoSpin=`,
`/api/state`, `/api/books`, `/api/events` (SSE). The API takes **exact** book names only (spacing/case
forgiving: `1john` works, `jo` does not); prefix guessing is for human typing only.

## Commands

```
node server.js                 # display :8080/  control :8080/control
npm test                       # runs test/run.js, test/engine.js, test/server.js
node tools/streamdeck-urls.js http://<ip>:8080 [token] [--csv]
```
Env: `PORT`, `HOST`, `SPIN_TOKEN`, `DURATION` (seconds), `AUTO_SPIN=1`.

## Conventions and gotchas

- **Only whitelisted files are served** (see `STATIC` in `server.js`). If you add a file the pages
  need, add it there too or it will 404.
- **Test the live pages, not just status codes.** An earlier server bug sent HTML as a serialized
  Buffer and still returned 200; the test now checks the body and content type.
- Mutating API calls reject `Sec-Fetch-Site: cross-site` (CSRF guard for GET-triggered actions).
  `SPIN_TOKEN` is optional; without it anyone on the network can control the game. Recommend setting it.
- The server binds `0.0.0.0` by default so the producer's tablet can reach it.
- Spin timing is eased (fast → slow); the final number always comes from the server's `result`
  snapshot, never from the client animation.
- Colors keep the original branding: parchment `#f6e2a4`, maroon `#801818`, orange `#e64b25`.
  Sound is synthesized with WebAudio on purpose, so no audio files are bundled.
- `.gitignore` excludes `Spin The Wheel/` (local source material) and `*.zip`. **Never commit the
  Companion configs or `node_modules` from there:** the configs contain device IPs, TP-Link plug IDs
  and Stream Deck serial numbers, and the repo is public.

## Background (the old setup, for context)

The previous version lived in `Spin The Wheel/` (ignored): a React/Vite/MUI app run via per-machine
shell scripts with hard-coded paths (`/Users/productiondevices/...`, `/var/tmp/...`), 66 per-book
shell scripts that wrote `maxChapter.txt`, and a Companion config that also drove two TP-Link smart
plugs (lights + monitor). The Pi copy is a clone of someone else's GitLab repo
(`ericcparsons/rc-spin-the-wheel`). The rebuild intentionally drops all of that.

## Open items / ideas

- No license chosen yet.
- Not yet tested on a real Pi, over Wi-Fi from a second device, or with Companion.
- Possible: a Companion module/feedback that reflects LOCKED/READY on the Stream Deck buttons.
