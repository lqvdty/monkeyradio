# _archive — not part of the live app

The live site is **`/index.html`** plus **`/assets/`** and the deploy configs
(`firebase.json`, `.firebaserc`, `_redirects`, `vercel.json`). Nothing in this
folder is served or built.

Kept here for reference only:

| Path | What it is |
|------|------------|
| `Monkey Radio India v2.dc.html` | Design-canvas source that `index.html` was derived from. Editing it has **no effect** on the live app. |
| `Monkey Radio India.dc.html` | Older v1 design-canvas source. |
| `support.js` | Runtime used only by the `.dc.html` canvas files. |
| `_ds/` | Design-system bundle for the canvas. |
| `uploads/` | Images pasted into the canvas. |
| `Monkey Radio India webapp design/`, `*.zip` | Design-tool export dumps (gitignored). |
| `.thumbnail`, `firebase-debug.log` | Tool/build cruft (gitignored). |

To change the site, edit `/index.html` directly.
