FROM oven/bun:1

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      bubblewrap \
      sqlite3 \
      git \
      ca-certificates \
      ffmpeg \
      docker.io && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /workspace
