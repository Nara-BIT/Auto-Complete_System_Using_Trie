const { spawn } = require('child_process');
const readline = require('readline');
const path = require('path');
const fs = require('fs');

// The C++ build produces `trie_cli` on Linux/macOS (Docker, production) and
// `trie_cli.exe` on Windows (local dev). Pick whichever is present.
const BUILD_DIR = path.join(__dirname, '..', 'backend', 'build');
const BINARY_PATH = [
    path.join(BUILD_DIR, 'trie_cli'),
    path.join(BUILD_DIR, 'trie_cli.exe'),
].find(p => fs.existsSync(p)) || path.join(BUILD_DIR, 'trie_cli');

const BACKEND_CWD = path.join(__dirname, '..', 'backend');
const DICT_PATH = path.join(BACKEND_CWD, 'data', 'dictionary.txt');

/**
 * Bridge to the C++ trie engine.
 *
 * The engine runs as a SINGLE long-lived process (`trie_cli --serve`) that loads
 * the 370k-word dictionary once at startup and then answers queries over its
 * stdin/stdout pipe. Previously the bridge spawned a fresh `trie_cli --json`
 * process per request, which rebuilt the whole trie every time (~223 MB, hundreds
 * of ms) — that OOM-killed the child on small instances and showed up as
 * "0 words / 0 nodes". With a resident process, memory stays flat and each query
 * is O(prefix length).
 *
 * Responses come back one JSON object per line, in the same order requests were
 * sent, so a simple FIFO queue correlates each response with its promise. If the
 * engine ever fails to spawn or exits, the bridge transparently degrades to an
 * in-process JavaScript trie so the API keeps working.
 */
class TrieBridge {
    constructor() {
        this.proc = null;
        this.rl = null;
        this.queue = [];          // pending { resolve, reject }, FIFO
        this.ready = false;
        this.fallback = false;
        this._fallbackTrie = null;

        if (fs.existsSync(BINARY_PATH)) {
            this._spawnServer();
        } else {
            console.log('[API] C++ binary not found, using Node.js fallback trie');
            this._ensureFallback();
        }
    }

    _spawnServer() {
        try {
            this.proc = spawn(BINARY_PATH, ['--serve'], {
                cwd: BACKEND_CWD,
                stdio: ['pipe', 'pipe', 'pipe'],
                windowsHide: true,
            });
        } catch (e) {
            console.error('[API] Failed to spawn C++ engine:', e.message);
            return this._degradeToFallback();
        }

        this.proc.on('error', (e) => {
            console.error('[API] C++ engine process error:', e.message);
            this._degradeToFallback();
        });

        this.proc.on('exit', (code, signal) => {
            console.error(`[API] C++ engine exited (code=${code}, signal=${signal})`);
            const err = new Error('engine exited');
            while (this.queue.length) this.queue.shift().reject(err);
            this._degradeToFallback();
        });

        // stderr carries logs only (readiness + "Loaded N words"), never responses.
        this.proc.stderr.on('data', (d) => {
            const s = d.toString().trim();
            if (s) console.log('[trie_cli]', s);
            if (s.includes('ready')) this.ready = true;
        });

        // Exactly one JSON response per line on stdout.
        this.rl = readline.createInterface({ input: this.proc.stdout });
        this.rl.on('line', (raw) => {
            const line = raw.trim();
            if (!line.startsWith('{') && !line.startsWith('[')) return; // ignore stray output
            const pending = this.queue.shift();
            if (!pending) return;
            try {
                pending.resolve(JSON.parse(line));
            } catch (e) {
                pending.reject(new Error('bad JSON from engine: ' + line.slice(0, 120)));
            }
        });

        console.log('[API] Using C++ engine (persistent --serve):', BINARY_PATH);
    }

    // Build the in-process JS trie on demand (loaded from the same dictionary).
    _ensureFallback() {
        if (!this._fallbackTrie) {
            this._fallbackTrie = new FallbackTrie();
            try {
                this._fallbackTrie.loadDictionary(DICT_PATH);
            } catch (e) {
                console.error('[API] Fallback dictionary load failed:', e.message);
            }
        }
        this.fallback = true;
        return this._fallbackTrie;
    }

    _degradeToFallback() {
        if (this.rl) { try { this.rl.close(); } catch (e) { /* ignore */ } this.rl = null; }
        this.proc = null;
        if (!this.fallback) {
            console.error('[API] Degrading to Node.js fallback trie');
            this._ensureFallback();
        }
    }

    // Send one tab-delimited command line; resolve with the parsed JSON response.
    _send(fields) {
        const line = fields.map(f => String(f).replace(/[\t\r\n]/g, ' ')).join('\t');
        return new Promise((resolve, reject) => {
            if (this.fallback || !this.proc || !this.proc.stdin.writable) {
                return reject(new Error('engine not available'));
            }
            this.queue.push({ resolve, reject });
            this.proc.stdin.write(line + '\n');
        });
    }

    async insert(word) {
        if (this.fallback) return this._ensureFallback().insert(word);
        try {
            return await this._send(['insert', word]);
        } catch (e) {
            return this._ensureFallback().insert(word);
        }
    }

    async search(word) {
        if (this.fallback) return this._ensureFallback().search(word);
        try {
            return await this._send(['search', word]);
        } catch (e) {
            return this._ensureFallback().search(word);
        }
    }

    async autocomplete(prefix, k = 10) {
        if (this.fallback) return this._ensureFallback().autocomplete(prefix, k);
        try {
            const r = await this._send(['autocomplete', prefix, String(k)]);
            return r?.results || [];
        } catch (e) {
            return this._ensureFallback().autocomplete(prefix, k);
        }
    }

    async fuzzySearch(word, maxDist = 1) {
        if (this.fallback) return this._ensureFallback().fuzzySearch(word, maxDist);
        try {
            const r = await this._send(['fuzzy', word, String(maxDist)]);
            return r?.results || [];
        } catch (e) {
            return this._ensureFallback().fuzzySearch(word, maxDist);
        }
    }

    async benchmark() {
        if (this.fallback) return this.fallbackBenchmark();
        try {
            return await this._send(['benchmark']);
        } catch (e) {
            return this.fallbackBenchmark();
        }
    }

    async getStats() {
        if (this.fallback) {
            const t = this._ensureFallback();
            return { wordCount: t.getWordCount(), nodeCount: t.getNodeCount() };
        }
        try {
            return await this._send(['stats']);
        } catch (e) {
            const t = this._ensureFallback();
            return { wordCount: t.getWordCount(), nodeCount: t.getNodeCount() };
        }
    }

    // The persistent C++ engine loads the dictionary itself on startup, so this
    // is a no-op there and simply reports current stats. In fallback mode it
    // loads the given file into the in-process trie.
    async loadDictionary(filepath) {
        if (this.fallback) return this._ensureFallback().loadDictionary(filepath);
        return this.getStats();
    }

    fallbackBenchmark() {
        const t = this._ensureFallback();
        const sampleWords = [];
        const collectSample = (node, prefix, count) => {
            if (count <= 0 || !node) return count;
            if (node.isEnd) { sampleWords.push(prefix); count--; }
            for (const [c, child] of Object.entries(node.children || {})) {
                count = collectSample(child, prefix + c, count);
            }
            return count;
        };
        collectSample(t.root, '', 200);

        let searchTime = 0;
        const searchCount = Math.min(1000, sampleWords.length * 10);
        let s = Date.now();
        for (let i = 0; i < searchCount; i++) t.search(sampleWords[i % sampleWords.length]);
        searchTime = Date.now() - s;

        let acTime = 0;
        s = Date.now();
        for (let i = 0; i < 1000; i++) {
            const w = sampleWords[i % sampleWords.length];
            t.autocomplete(w.substring(0, Math.min(3, w.length)), 10);
        }
        acTime = Date.now() - s;

        let fuzzyTime = 0;
        s = Date.now();
        for (let i = 0; i < 100; i++) {
            const w = sampleWords[i % sampleWords.length];
            t.fuzzySearch(w.substring(0, Math.max(1, w.length - 1)), 1);
        }
        fuzzyTime = Date.now() - s;

        return {
            search: { queries: searchCount, timeMs: searchTime, avgPerQuery: (searchTime / searchCount).toFixed(3) },
            autocomplete: { queries: 1000, timeMs: acTime, avgPerQuery: (acTime / 1000).toFixed(3) },
            fuzzy: { queries: 100, timeMs: fuzzyTime, avgPerQuery: (fuzzyTime / 100).toFixed(3) },
            stats: { wordCount: t.getWordCount(), nodeCount: t.getNodeCount() }
        };
    }
}

// Node.js fallback trie (used when the C++ engine is unavailable or fails)
class TrieNode {
    constructor() {
        this.children = {};
        this.isEnd = false;
        this.frequency = 0;
    }
}

class FallbackTrie {
    constructor() {
        this.root = new TrieNode();
        this.nodeCount = 1;
        this.wordCount = 0;
    }

    insert(word) {
        word = word.toLowerCase().trim();
        if (!word || !/^[a-z]+$/.test(word)) return { success: false };
        let current = this.root;
        for (const c of word) {
            if (!current.children[c]) { current.children[c] = new TrieNode(); this.nodeCount++; }
            current = current.children[c];
        }
        if (!current.isEnd) this.wordCount++;
        current.isEnd = true;
        current.frequency++;
        return { success: true, frequency: current.frequency };
    }

    search(word) {
        word = word.toLowerCase().trim();
        let current = this.root;
        for (const c of word) {
            if (!current.children[c]) return { frequency: 0 };
            current = current.children[c];
        }
        return { frequency: current.isEnd ? current.frequency : 0 };
    }

    autocomplete(prefix, k = 10) {
        prefix = prefix.toLowerCase().trim();
        let current = this.root;
        for (const c of prefix) {
            if (!current.children[c]) return [];
            current = current.children[c];
        }
        const results = [];
        const dfs = (node, word) => {
            if (node.isEnd) results.push({ word, frequency: node.frequency });
            for (const [c, child] of Object.entries(node.children)) dfs(child, word + c);
        };
        dfs(current, prefix);
        results.sort((a, b) => b.frequency !== a.frequency ? b.frequency - a.frequency : a.word.localeCompare(b.word));
        return results.slice(0, k);
    }

    fuzzySearch(word, maxDist = 1) {
        word = word.toLowerCase().trim();
        const results = [];
        const seen = new Set();
        const dfs = (node, wordIdx, current, dist) => {
            if (dist > maxDist) return;
            if (wordIdx === word.length) {
                if (node.isEnd && !seen.has(current)) {
                    seen.add(current);
                    results.push({ word: current, frequency: node.frequency, editDistance: dist });
                }
                for (const [c, child] of Object.entries(node.children)) dfs(child, wordIdx, current + c, dist + 1);
                return;
            }
            for (const [c, child] of Object.entries(node.children)) {
                const newDist = c === word[wordIdx] ? dist : dist + 1;
                if (newDist <= maxDist) {
                    dfs(child, wordIdx + 1, current + c, newDist);
                    dfs(child, wordIdx, current + c, newDist + 1);
                }
            }
            dfs(node, wordIdx + 1, current, dist + 1);
        };
        dfs(this.root, 0, '', 0);
        results.sort((a, b) => a.editDistance !== b.editDistance ? a.editDistance - b.editDistance : b.frequency !== a.frequency ? b.frequency - a.frequency : a.word.localeCompare(b.word));
        return results;
    }

    loadDictionary(filepath) {
        try {
            const content = fs.readFileSync(filepath, 'utf-8');
            let count = 0;
            for (let word of content.split('\n')) {
                word = word.trim().toLowerCase();
                if (word && /^[a-z]+$/.test(word)) { this.insert(word); count++; }
            }
            return { wordCount: count };
        } catch (e) {
            console.error('[API] Failed to load dictionary:', e.message);
            return { wordCount: 0 };
        }
    }

    getWordCount() { return this.wordCount; }
    getNodeCount() { return this.nodeCount; }
}

module.exports = { TrieBridge, FallbackTrie };
