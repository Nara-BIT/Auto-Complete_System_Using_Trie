FROM gcc:13 as cpp-build
WORKDIR /app/backend
COPY backend/ .
RUN apt-get update && apt-get install -y cmake && \
    mkdir -p build && cd build && \
    cmake -DCMAKE_BUILD_TYPE=Release .. && \
    make -j$(nproc)

FROM node:20-slim
WORKDIR /app
COPY --from=cpp-build /app/backend/build/trie_cli /app/backend/build/trie_cli
COPY backend/data/ /app/backend/data/
COPY api/ /app/api/
COPY frontend/dist/ /app/frontend/dist/
RUN cd /app/api && npm install
EXPOSE 3001
CMD ["node", "api/server.js"]
