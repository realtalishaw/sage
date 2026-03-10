#!/usr/bin/env python3

"""
Small local callback receiver for OpenClaw hook completion testing.

Think of this as the tiniest possible stand-in for the future interaction-agent
callback endpoint. It only does two things:

1. Accept POST requests on /api/oc-callback
2. Print the received JSON payload so you can see the completion webhook arrive
"""

from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import os


HOST = os.environ.get("SAGE_CALLBACK_HOST", "127.0.0.1")
PORT = int(os.environ.get("SAGE_CALLBACK_PORT", "4010"))
TOKEN = os.environ.get("SAGE_CALLBACK_TOKEN", "")


class CallbackHandler(BaseHTTPRequestHandler):
    # The built-in server is enough here because this is a local dev helper, not
    # a production service. We keep the handler tiny so the flow is easy to read.
    def do_POST(self):
        if self.path != "/api/oc-callback":
            self.send_response(404)
            self.end_headers()
            return

        if TOKEN:
            auth = self.headers.get("Authorization", "")
            if auth != f"Bearer {TOKEN}":
                self.send_response(401)
                self.end_headers()
                return

        content_length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(content_length).decode("utf-8") if content_length else "{}"

        try:
            payload = json.loads(raw_body)
        except json.JSONDecodeError:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b'{"ok":false,"error":"invalid json"}')
            return

        print("\n--- OpenClaw callback received ---")
        print(json.dumps(payload, indent=2, sort_keys=True))
        print("--- end callback ---\n")

        response_body = json.dumps({"ok": True}).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(response_body)))
        self.end_headers()
        self.wfile.write(response_body)

    # The default request logging is noisy for this tiny helper, so we replace
    # it with a single concise line when a request comes in.
    def log_message(self, format, *args):
        print(f"[callback-receiver] {self.address_string()} - {format % args}")


def main():
    server = HTTPServer((HOST, PORT), CallbackHandler)
    print(f"Listening for OpenClaw callbacks at http://{HOST}:{PORT}/api/oc-callback")
    if TOKEN:
      print("Authorization required: Bearer token enabled")
    server.serve_forever()


if __name__ == "__main__":
    main()
