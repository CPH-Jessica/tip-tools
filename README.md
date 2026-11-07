# The Invisible Pen — Website

This repository hosts [www.theinvisiblepen.com](https://www.theinvisiblepen.com), the public website for The Invisible Pen: AI writing coaching, community, and tools for romance authors, by Jessica Waldron.

## Looking for the writing tools?

- **Shop**: [Payhip Store](https://payhip.com/theinvisiblepen) — Pen Name Launcher, Psychological Thriller, Regency Romance, and Romantic Suspense skills
- **Community, classes & coaching**: [The Invisible Pen on Skool](https://www.skool.com/the-invisible-pen)
- **Newsletter**: [The Invisible Pen on Substack](https://theinvisiblepen.substack.com/)
- **YouTube**: [@theinvisiblepencoach](https://www.youtube.com/@theinvisiblepencoach)

Purchased tools and the student library are delivered through Payhip and the members-only area — they are not distributed from this repository.

## November desk

Source for a private November 2026 writing desk is in [`november-accountability/`](november-accountability/README.md). It is a Node.js 22.13+ application with its own `package.json` and a SQLite ledger. Run it from that folder: `npm install`, copy `.env.example` to `.env`, set `ADMIN_TOKEN` in that file, then `npm start`. The process listens on `127.0.0.1:8742` until you change `HOST` and `PORT`.

GitHub Pages publishes this repository as the static site at [www.theinvisiblepen.com](https://www.theinvisiblepen.com). Pages serves files. It does not run Node, and it does not keep a shared SQLite ledger, so this website cannot host the desk. The page at `/november-accountability/` says that in the site navigation. It is source plus that note. A shared room needs a private host you run yourself, with HTTPS, `SITE_ACCESS_CODE`, and `ADMIN_TOKEN` only in the server environment. The folder ships no member records, edit keys, tokens, or runtime database.

## Contact

[coach@theinvisiblepen.com](mailto:coach@theinvisiblepen.com)

---

© Clark Publishing House LLC / The Invisible Pen
