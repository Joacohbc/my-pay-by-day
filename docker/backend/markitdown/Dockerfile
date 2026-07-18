# MarkItDown document-to-markdown sidecar for the backend — standalone service image.
# Build context is the repo root.
# glibc base (Debian) is required: MarkItDown's content sniffer magika depends on
# onnxruntime, which publishes only manylinux/glibc wheels (no musl/Alpine).

FROM python:3.12-slim

RUN useradd -r -u 1000 -m -d /home/appuser appuser

WORKDIR /app
RUN pip install --no-cache-dir 'markitdown[all]'
COPY --chown=appuser:appuser docker/backend/markitdown/server.py /app/server.py

EXPOSE 8590
ENV PORT=8590

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python3 -c "import os,sys,urllib.request; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:'+os.environ.get('PORT','8590')+'/health', timeout=3).status==200 else 1)"

USER appuser
CMD ["python3", "/app/server.py"]
