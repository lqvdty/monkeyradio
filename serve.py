#!/usr/bin/env python3
"""Local dev server with SPA fallback.

Plain `python3 -m http.server` 404s on direct hits to client-side routes
like /about or /show/<slug>. This serves real files when they exist and
falls back to index.html otherwise, matching the Firebase Hosting rewrite.

    python3 serve.py          # http://localhost:8000
    python3 serve.py 5173     # custom port
"""

import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000


class SPAHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def send_head(self):
        path = self.translate_path(self.path)
        # No real file and not a directory listing -> serve the app shell.
        if not os.path.exists(path) and not os.path.isdir(path):
            self.path = "/index.html"
        return super().send_head()

    def end_headers(self):
        # Don't let the browser cache anything during development - a stale
        # assets/app.js is the classic "my change isn't showing" trap.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    httpd = ThreadingHTTPServer(("", PORT), SPAHandler)
    print(f"Serving {ROOT} on http://localhost:{PORT}  (SPA fallback on)")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        httpd.shutdown()
