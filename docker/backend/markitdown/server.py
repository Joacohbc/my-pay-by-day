"""HTTP wrapper around Microsoft MarkItDown.

Exposes:
    GET  /health  -> {"status": "ok"}
    POST /convert -> {"markdown": "..."}
        Request body (JSON): {"data": "<base64>", "mediaType": "...", "filename": "..."}
        Errors return {"error": "..."} with status 400 (bad request) or 422 (conversion failed).
"""

import base64
import io
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from markitdown import MarkItDown, StreamInfo

PORT = int(os.environ.get("PORT", "8080"))

converter = MarkItDown(enable_plugins=False)


def stream_info_from(filename, media_type):
    extension = os.path.splitext(filename)[1] if filename else None
    return StreamInfo(
        mimetype=media_type or None,
        filename=filename or None,
        extension=extension or None,
    )


class ConvertHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path != "/health":
            self.send_json(404, {"error": "not found"})
            return
        self.send_json(200, {"status": "ok"})

    def do_POST(self):
        if self.path != "/convert":
            self.send_json(404, {"error": "not found"})
            return

        try:
            body = self.read_json_body()
            file_bytes = base64.b64decode(body["data"], validate=True)
        except (KeyError, ValueError, json.JSONDecodeError) as error:
            self.send_json(400, {"error": f"invalid request: {error}"})
            return

        filename = body.get("filename")
        media_type = body.get("mediaType")
        try:
            result = converter.convert_stream(
                io.BytesIO(file_bytes),
                stream_info=stream_info_from(filename, media_type),
            )
        except Exception as error:
            self.send_json(422, {"error": f"conversion failed: {error}"})
            return

        self.send_json(200, {"markdown": result.text_content})

    def read_json_body(self):
        content_length = int(self.headers.get("Content-Length", "0"))
        return json.loads(self.rfile.read(content_length))

    def send_json(self, status, payload):
        response = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)

    def log_message(self, format, *args):
        print(f"{self.address_string()} - {format % args}", flush=True)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", PORT), ConvertHandler)
    print(f"markitdown server listening on :{PORT}", flush=True)
    server.serve_forever()
