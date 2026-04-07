FROM node:24-bookworm-slim AS node-runtime

FROM oven/bun:1

COPY --from=node-runtime /usr/local/bin/node /usr/local/bin/node
COPY --from=node-runtime /usr/local/lib/node_modules /usr/local/lib/node_modules

RUN ln -sf ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm && \
    ln -sf ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      python3 \
      patch \
      bubblewrap \
      sqlite3 \
      git \
      ca-certificates \
      ffmpeg \
      docker.io && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /workspace
