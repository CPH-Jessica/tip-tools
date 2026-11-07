# November desk

A private writing-accountability page for The Invisible Pen, November 1–30, 2026.

Writers log their own days. The room can see display names, units, and totals. It does not rank anyone, and it does not turn a blank day into a zero.

This folder is source in the tip-tools repository. It is not a live site, it does not connect to Skool, and it does not send invitations or messages. The folder contains no member records, day logs, edit keys, tokens, or runtime database.

## GitHub Pages does not run this desk

[www.theinvisiblepen.com](https://www.theinvisiblepen.com) is the static site at the repository root, published with GitHub Pages. GitHub Pages serves HTML, CSS, and JavaScript files. It does not run Node.js, and it does not open or share a SQLite file.

- The site page `/november-accountability/` explains where the source lives. It is not a member-ready hosted board.
- Opening `public/index.html` on GitHub Pages, or as a file on disk, does not save the month. That page asks its own host for `/api/health`. Pages has no ledger API. Styles and scripts are requested from the host root (`/styles.css`, `/app.js`, `/fonts/…`) because the Node server serves `public/` as the origin root.
- Two browsers share a ledger only when both reach the same Node process and the same `data/tracker.sqlite` file.
- Adding this folder does not deploy a server, register a domain, create accounts, or invite writers.

## Local runnable draft, and a private host

These are different. This package does not deploy anything.

**On your own computer.** From this folder, `npm start` listens on `127.0.0.1:8742` only. The ledger is the SQLite file `data/tracker.sqlite`, created when the server starts, with WAL files beside it. Every browser that can open that local process shares that one file. That is real shared storage for this machine. It is not a hosted site, and a loopback address is not a link anyone else can open.

**What you must have for persistence.** Node.js 22.13 or newer (see `engines` in `package.json`), npm, a writable disk for `data/tracker.sqlite`, and the same server process — or a later process pointed at that same file — for every writer. The HTML file does not store the month. Closing the browser does not keep a private copy. Losing the SQLite file loses the desks, the day logs, and the sealed edit keys.

**Private HTTPS, if you later share it with the room.** You host it yourself, on a machine you control that stays running. Put the Node process behind HTTPS that you control. Give the desk its own hostname and forward that whole host to this process. The app, its cookies (`Path=/`), and `/api` expect the origin root. They are not built to sit under a path prefix on the marketing site. Keep the SQLite file on persistent disk. Set a long `ADMIN_TOKEN` only in the server environment. Set `SITE_ACCESS_CODE` so the board is hidden without that code. Set `COOKIE_SECURE=1` only behind HTTPS. Bind beyond loopback only when that private host is ready. Do not put the desk on the public internet without the access code and HTTPS. Do not commit `data/`, `uploads/`, or `.env`. This package does not include a public deploy, a domain, or a certificate.

## Run it locally

Node.js 22.13 or newer. Run these commands inside `november-accountability/`. The repository root stays a static site and has no `package.json` for this app.

```bash
cd november-accountability
npm install
cp .env.example .env
# Put a long random ADMIN_TOKEN in .env before importing anyone.
# Leave SITE_ACCESS_CODE empty only while you are the only person who can open 127.0.0.1.
npm start
```

Then open the loopback address printed by the server. The default port is 8742. Leave `HOST` as `127.0.0.1` until a private host is ready.

```bash
npm test
npm run typecheck
```

`npm test` uses Node’s built-in test runner (`node --test`). One test looks for a private opt-in seed at `uploads/tracker_seed_private_a6a5.json`. That path is gitignored and is not in this folder, so the test skips. Leave it skipped. Do not commit a seed, and do not invent writers to satisfy it.

The portable front end is `public/index.html`, `public/styles.css`, and `public/app.js`. Opening the HTML file by itself does not save anything. The Node server is the ledger.

## What is stored

SQLite file, default `data/tracker.sqlite` (not committed):

- Display name
- Optional private notes from an opt-in file, visible only to that writer and the keeper
- A private edit key (stored as a hash, and sealed so the keeper can export it)
- Goal, baseline, unit, start date, and day logs after the writer saves them

Not stored:

- The source web address
- Profile links
- Original comment threads
- Numeric totals from the opt-in file
- Review-only names on the community board

Writers set their own goals. An empty numeric field is not turned into zero. A historical percent or a manuscript total in a note is not November progress and is not a completed milestone.

## Import

Put the opt-in JSON in `data/private/opt-ins.json` (that folder is gitignored) and run:

```bash
npm run import -- data/private/opt-ins.json
```

The file must say `"month": "2026-11"`. Shape and an empty file are in `schema/opt-in.schema.json` and `schema/opt-in.empty.json`. Those files contain no writers.

| Field | Use |
| --- | --- |
| `display_name` | Required for someone who is enrolled. Shown in the room. |
| `stated_goals` | Optional private note for that writer and the keeper. |
| `reported_progress_note` | Optional private note. Never a progress total. |
| `numeric_month_goal` | Ignored. Not applied, and not turned into zero when empty. |
| `numeric_month_total` | Ignored. Not applied, and not turned into zero when empty. |
| `review_only.ambiguous_participants` | Keeper list only. Not enrolled. |
| `instruction` | Discarded. Not followed. |
| `source_url`, profile links, comments | Refused or not stored. |

`review_only.ambiguous_participants` is kept for the keeper and is not enrolled. Any `instruction` text in the file is discarded and not followed.

Do not place the opt-in file under `public/`. The server will not serve `data/`.

New edit keys are written to `data/private/last-import-keys.json` and are not shown on the community board. Give each key to that writer in private. Importing again updates private notes and does not wipe goals or days they have already saved.

Units can be words, chapters, scenes, sessions, minutes, or a custom name. The room average uses each person’s completion of their own goal. Different units are not added together.

## Days

- Unreported means no entry. It is not zero.
- Zero appears only when someone logs a zero.
- A rest day is an entry and adds nothing.
- A future date cannot be logged and is not counted.
- Editing a day replaces that day’s number. Totals are recomputed from the month, so an edit does not double count.
- Pace uses the writer’s start date through November 30.

## Keeper backup

Unlock the keeper drawer with `ADMIN_TOKEN`, or call the admin routes with `Authorization: Bearer`.

`GET /api/admin/backup` downloads the ledger, including private notes and edit keys. Restore only with the confirm phrase `restore the ledger`.

## Privacy before anyone else can open it

- Leave `HOST` as `127.0.0.1` until you intend to share it.
- Set `SITE_ACCESS_CODE` so the board is hidden without that code.
- Set `COOKIE_SECURE=1` only behind HTTPS.
- Do not commit `data/`, `uploads/`, `.env`, SQLite files, or import key files.

Opting in somewhere else is not consent to put full names, comments, or manuscript details on a public page. This desk shows display names only in the room.

## What is not done

No public host, domain, or HTTPS is configured. No site code is set in the example env. The SQLite file lives on the machine running the server. Two browsers share data only when they can both reach that server. Publishing this folder with GitHub Pages does not start that server. The desk stays a local draft until you host it yourself.
