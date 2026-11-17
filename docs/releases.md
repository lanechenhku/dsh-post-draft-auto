# Release notes (one section per version)

`lib/release-notes.mjs` parses this file: the first heading that matches your version wins, and its
bullet list becomes the `release-note` facts the model is allowed to use. Keep it short and factual —
one line per user-visible change, no internal file names or table schemas.

Layout:

    ## v1.2.3 — one-line title
    _2026-11-18_

    - what changed for the user
    - another user-visible change

If a version has no section here, `post_facts` falls back to the configured `referenceFile` (usually your
CHANGELOG) and, failing that, marks the draft 待补 instead of inventing bullets.

---

## v1.2.3 — example entry (replace me)

_2026-11-18_

- Example bullet: what changed for the user
- Example bullet: another user-visible change
