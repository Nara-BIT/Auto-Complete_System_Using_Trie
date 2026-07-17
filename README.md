# Trie Autocomplete System

A high-performance search autocomplete system powered by a C++ Trie data structure with a modern React frontend.

## Features

- **Trie-based Autocomplete** — prefix search with top-K frequency-ranked suggestions
- **Fuzzy Search** — find words within edit distance using trie pruning
- **Aho-Corasick** — multi-pattern keyword matching (ACL use case)
- **Dictionary Loading** — 370k+ words loaded and queried in milliseconds
- **Serialization** — save/load trie state to disk for persistence
- **Benchmarking** — measure insert, search, autocomplete, and fuzzy query speeds
- **Modern UI** — dark-themed React interface with real-time suggestions

## Architecture

```
┌─────────────────┐     REST API      ┌──────────────────┐
│  React Frontend │ ◄──────────────►  │  Express.js API  │
│  (Vite + TS)    │                   │  (Node.js)       │
└─────────────────┘                   └────────┬─────────┘
                                               │
                                      ┌────────▼─────────┐
                                      │  C++ Trie Engine  │
                                      │  (or Node fallback)│
                                      └──────────────────┘
```

## Benchmark Results (370k words)

| Operation | Queries | Total Time | Avg/Query |
|-----------|---------|------------|-----------|
| Exact Search | 1000 | ~2 ms | **0.002 ms** |
| Autocomplete | 1000 | ~2700 ms | **2.7 ms** |
| Fuzzy Search (d=1) | 100 | ~27 ms | **0.27 ms** |

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [g++](https://gcc.gnu.org/) or [MSYS2](https://www.msys2.org/) (for C++ backend)
- CMake 3.16+

### Build & Run

```bash
# 1. Build C++ backend
cd backend
mkdir -p build && cd build
cmake -G "MinGW Makefiles" ..   # Windows
# cmake ..                        # Linux/Mac
make -j4
cd ../..

# 2. Install API dependencies
cd api && npm install && cd ..

# 3. Install & build frontend
cd frontend && npm install && npm run build && cd ..

# 4. Start the server
cd api && npm start
# Server runs at http://localhost:3001
```

### Docker

```bash
docker compose up --build
```

## API Endpoints

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/insert` | `{ word }` | Insert a word into the trie |
| POST | `/api/autocomplete` | `{ prefix, k }` | Get top-K autocomplete suggestions |
| POST | `/api/fuzzy` | `{ word, maxDist }` | Fuzzy search with edit distance |
| GET | `/api/benchmark` | — | Run performance benchmarks |
| GET | `/api/stats` | — | Get trie statistics |
| GET | `/api/health` | — | Health check |

## Project Structure

```
├── backend/
│   ├── include/          # C++ headers (trie, aho_corasick, types)
│   ├── src/              # C++ implementations
│   ├── tests/            # Google Test unit tests
│   ├── data/             # Dictionary file (370k words)
│   └── CMakeLists.txt
├── api/
│   ├── server.js         # Express API server
│   ├── trie.js           # Node.js trie fallback
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom hooks
│   │   ├── services/     # API client
│   │   └── types/        # TypeScript types
│   └── vite.config.ts
├── Dockerfile
└── docker-compose.yml
```

## Tech Stack

- **Core**: C++17 (Trie, Aho-Corasick, min-heap, DFS)
- **API**: Express.js (Node.js)
- **Frontend**: React + TypeScript + Vite
- **Styling**: Custom CSS (dark theme)
- **Build**: CMake, Vite
- **Deploy**: Docker Compose

## Resume Highlights

- Implemented Trie-based autocomplete with O(m + K log K) prefix search across 370k+ words
- Built fuzzy matching with bounded edit-distance using trie pruning
- Designed Aho-Corasick automaton for multi-pattern keyword matching
- Achieved sub-millisecond exact search latency (0.002ms/query)
- Serializes 1M+ trie nodes for persistence and fast reload
