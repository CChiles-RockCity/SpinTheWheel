# Spin the Wheel

A chapter picker for the Rock City Church "Spin the Wheel" game.

**The flow:** the pastor spins the giant wheel and it lands on a Bible book. The producer/stage
manager selects that book on a control page (or Stream Deck). The big screen then spins a random
chapter **from that book only**. After each spin the screen **locks**, and it only unlocks when a
book is selected again.

No dependencies and no build step. Two ways to run it:

| Mode | How | Who picks the book |
| --- | --- | --- |
| **Server mode** (recommended) | `node server.js` on the Mac/Pi | Producer on `/control` (phone, tablet, laptop) and/or a Stream Deck |
| **Standalone** | open `index.html`, or host it as a static site | Whoever is at that screen (type or click) |

## Server mode

```
node server.js                       # Node 16+, nothing to install
# or: DURATION=5 PORT=8080 SPIN_TOKEN=mysecret AUTO_SPIN=0 node server.js
```

It prints the addresses:

- **Display (big screen):** `http://<host>:8080/`: full-screen it. Shows the book and chapter; the cursor is hidden.
- **Control (producer):** `http://<host>:8080/control`: a big red **LOCKED** / green **READY** banner and 66 book buttons.

Producer workflow: wheel lands → type the book (`psa`, `1jo`, `song`) or tap it → the banner turns
green (**READY — Psalms**) and the big screen shows the book → press **Enter** or **SPIN**
(or tick *Spin as soon as a book is picked*). The presenter's clicker/`Enter` on the display can also spin.

Set `SPIN_TOKEN` and open both pages with `?token=mysecret` if you don't want anyone on the network
to be able to control it. Stream Deck: see [docs/streamdeck.md](docs/streamdeck.md).

## Standalone mode

Open `index.html`. Type a book on the keyboard (or click), press **Enter** to spin, **Tab** to hide the controls.
`Backspace`/`Esc` edit or clear the selection.

## Why a wrong chapter can't happen

The old setup relied on a Stream Deck setting the max chapter *after* the wheel stopped, so a slow
operator could spin against the previous book's range. Now:

- The server holds the only copy of the game state; the chapter range is read from the selected book **at the instant of the spin**.
- **Spin is locked until a book is selected**, and **locked again after every result**.
- Typing an ambiguous/unknown name (`jo`) **clears** the selection, so a stale book can't be spun.
- The book name is on the big screen next to the number, so a mismatch is visible immediately.
- Books can't be changed mid-spin, and the chosen chapter is withheld from clients until the spin ends.
- Requests from other websites in a browser are refused, and an optional token guards the API.

Chapters are chosen with `crypto.getRandomValues` (unbiased); the animation never repeats a number twice in a row.

## Development

```
npm test        # or: node test/run.js && node test/engine.js && node test/server.js
```

`server.js` (HTTP + live updates) · `src/engine.js` (state machine + timer, shared by server and standalone) ·
`src/machine.js` · `src/books.js` · `src/picker.js` (type-ahead) · `src/remote.js` (browser client) ·
`src/app.js` (display) · `src/control.js` (control page) · `tools/streamdeck-urls.js`.
