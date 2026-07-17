# MarkItDown document-to-markdown sidecar for the backend — standalone service image.
# Build context is the docker/markitdown/ directory.
# glibc base (Debian) is required: MarkItDown's content sniffer magika depends on
# onnxruntime, which publishes only manylinux/glibc wheels (no musl/Alpine).

FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir 'markitdown[all]'
COPY server.py /app/server.py

EXPOSE 8590
ENV PORT=8590

CMD ["python3", "/app/server.py"]
