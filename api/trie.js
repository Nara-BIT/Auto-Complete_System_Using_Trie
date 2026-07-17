const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const BINARY_PATH = path.join(__dirname, '..', 'backend', 'build', 'trie_cli.exe');

class TrieBridge {
    constructor() {
        this.useBinary = fs.existsSync(BINARY_PATH);
        this.fallback = !this.useBinary;
        if (this.fallback) {
            console.log('[API] C++ binary not found, using Node.js fallback trie');
            this.trie = new FallbackTrie();
        } else {
            console.log('[API] Using C++ binary:', BINARY_PATH);
        }
    }

    callBinary(args) {
        try {
            const result = execFileSync(BINARY_PATH, ['--json', ...args], {
                timeout: 15000,
                maxBuffer: 10 * 1024 * 1024,
                cwd: path.join(__dirname, '..', 'backend'),
                windowsHide: true,
            });
            const output = result.toString().trim();
            // First line may be "Loaded N words..." stderr-like output, skip non-JSON lines
            const lines = output.split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('{')) {
                    return JSON.parse(trimmed);
                }
            }
            return null;
        } catch (e) {
            console.error('[API] Binary call failed:', e.message?.substring(0, 200));
            return null;
        }
    }

    insert(word) {
        if (this.fallback) return this.trie.insert(word);
        return this.callBinary(['insert', word]) || { success: false };
    }

    search(word) {
        if (this.fallback) return this.trie.search(word);
        const result = this.callBinary(['search', word]);
        return result || { frequency: 0 };
    }

    autocomplete(prefix, k = 10) {
        if (this.fallback) return this.trie.autocomplete(prefix, k);
        const result = this.callBinary(['autocomplete', prefix, String(k)]);
        return result?.results || [];
    }

    fuzzySearch(word, maxDist = 1) {
        if (this.fallback) return this.trie.fuzzySearch(word, maxDist);
        const result = this.callBinary(['fuzzy', word, String(maxDist)]);
        return result?.results || [];
    }

    benchmark() {
        if (this.fallback) return this.fallbackBenchmark();
        return this.callBinary(['benchmark']) || {};
    }

    fallbackBenchmark() {
        const sampleWords = [];
        const collectSample = (node, prefix, count) => {
            if (count <= 0 || !node) return count;
            if (node.isEnd) { sampleWords.push(prefix); count--; }
            for (const [c, child] of Object.entries(node.children || {})) {
                count = collectSample(child, prefix + c, count);
            }
            return count;
        };
        collectSample(this.trie.root, '', 200);

        let searchTime = 0;
        const searchCount = Math.min(1000, sampleWords.length * 10);
        let s = Date.now();
        for (let i = 0; i < searchCount; i++) this.trie.search(sampleWords[i % sampleWords.length]);
        searchTime = Date.now() - s;

        let acTime = 0;
        s = Date.now();
        for (let i = 0; i < 1000; i++) {
            const w = sampleWords[i % sampleWords.length];
            this.trie.autocomplete(w.substring(0, Math.min(3, w.length)), 10);
        }
        acTime = Date.now() - s;

        let fuzzyTime = 0;
        s = Date.now();
        for (let i = 0; i < 100; i++) {
            const w = sampleWords[i % sampleWords.length];
            this.trie.fuzzySearch(w.substring(0, Math.max(1, w.length - 1)), 1);
        }
        fuzzyTime = Date.now() - s;

        return {
            search: { queries: searchCount, timeMs: searchTime, avgPerQuery: (searchTime / searchCount).toFixed(3) },
            autocomplete: { queries: 1000, timeMs: acTime, avgPerQuery: (acTime / 1000).toFixed(3) },
            fuzzy: { queries: 100, timeMs: fuzzyTime, avgPerQuery: (fuzzyTime / 100).toFixed(3) },
            stats: this.getStats()
        };
    }

    loadDictionary(filepath) {
        if (this.fallback) return this.trie.loadDictionary(filepath);
        // Binary loads dictionary on startup automatically
        return this.getStats();
    }

    getStats() {
        if (this.fallback) {
            return { wordCount: this.trie.getWordCount(), nodeCount: this.trie.getNodeCount() };
        }
        const result = this.callBinary(['stats']);
        return result || { wordCount: 0, nodeCount: 0 };
    }
}

// Node.js fallback trie (used when C++ binary is unavailable)
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
