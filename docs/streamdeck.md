# Stream Deck / Bitfocus Companion

The server exposes plain HTTP endpoints, so any Stream Deck setup that can send a web request can
pick the book. Nothing about the game depends on Companion, and it is optional.

## Endpoints

`GET` or `POST`, all return JSON (`200` ok, `409` refused with a reason, `401` bad token).

| URL | Does |
| --- | --- |
| `/api/book/<name>` | Select a book (e.g. `/api/book/Psalms`, `/api/book/1%20John`, `/api/book/1John`). Exact names only. |
| `/api/spin` | Spin. Refused unless a book is selected. |
| `/api/clear` | Clear the selection (re-lock). |
| `/api/settings?duration=5&autoSpin=1` | Spin seconds (1–30) and spin-on-select. |
| `/api/state` | Current state as JSON (`idle`, `armed`, `spinning`, `result`). |
| `/api/books` | All 66 books with their URLs. |

Add `?token=…` (or an `X-Token` header) to every request if the server was started with `SPIN_TOKEN`.

## Companion setup

1. Add a **Generic: HTTP Requests** connection (base URL `http://<mac-or-pi-ip>:8080`).
2. For each book button: action **GET** with the path `/api/book/<name>`.
   Optionally add a second **GET** `/api/spin` action if you want that button to spin immediately
   (or turn on *Spin as soon as a book is picked* on the control page).
3. Generate the full list of URLs to copy from:

```
node tools/streamdeck-urls.js http://<ip>:8080            # add a token as the 2nd argument if you use one
node tools/streamdeck-urls.js http://<ip>:8080 --csv > books.csv
```

Because the server is the single source of truth, a Stream Deck press, the control page and the
presenter's clicker can all be used at once without disagreeing. A press that arrives during a spin
or with an unknown name is simply refused (HTTP 409).
