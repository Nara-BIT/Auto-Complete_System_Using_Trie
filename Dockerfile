# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Stage 1 — compile the C++ trie engine into a Linux binary (trie_cli)
# ---------------------------------------------------------------------------
FROM gcc:13 AS cpp-build
WORKDIR /app/backend
COPY backend/ .
RUN apt-get update && apt-get install -y --no-install-recommends cmake && \
    rm -rf /var/lib/apt/lists/* && \
    rm -rf build && mkdir -p build && cd build && \
    cmake -DCMAKE_BUILD_TYPE=Release .. && \
    make -j"$(nproc)"

# ---------------------------------------------------------------------------
# Stage 2 — build the React/Vite frontend into static assets
# ---------------------------------------------------------------------------
FROM node:20-slim AS web-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 3 — runtime: Express API serving the built frontend + C++ binary
# ---------------------------------------------------------------------------
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production

# C++ engine (Linux binary — no .exe) and the dictionary it loads at query time
COPY --from=cpp-build /app/backend/build/trie_cli /app/backend/build/trie_cli
COPY backend/data/ /app/backend/data/

# API server + its production dependencies
COPY api/package.json api/package-lock.json /app/api/
RUN cd /app/api && npm ci --omit=dev
COPY api/ /app/api/

# Pre-built frontend
COPY --from=web-build /app/frontend/dist/ /app/frontend/dist/

# server.js listens on process.env.PORT (falls back to 3001). Render/Railway/Fly
# inject PORT automatically; EXPOSE is documentation for local runs.
EXPOSE 3001
CMD ["node", "api/server.js"]
