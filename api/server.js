const express = require('express');
const cors = require('cors');
const path = require('path');
const { TrieBridge } = require('./trie');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const trie = new TrieBridge();

// Load dictionary on startup (for fallback mode)
const dictPath = path.join(__dirname, '..', 'backend', 'data', 'dictionary.txt');
try {
    trie.loadDictionary(dictPath);
    console.log('[API] Dictionary loaded');
} catch (e) {
    console.log('[API] No dictionary found, starting empty');
}

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', engine: trie.fallback ? 'node' : 'c++' });
});

// Insert a word
app.post('/api/insert', (req, res) => {
    const { word } = req.body;
    if (!word) return res.status(400).json({ error: 'word is required' });
    const result = trie.insert(word);
    res.json({ ...result, word, stats: trie.getStats() });
});

// Search exact word
app.post('/api/search', (req, res) => {
    const { word } = req.body;
    if (!word) return res.status(400).json({ error: 'word is required' });
    const result = trie.search(word);
    res.json({ word, ...result });
});

// Autocomplete (prefix -> top-K)
app.post('/api/autocomplete', (req, res) => {
    const { prefix = '', k = 10 } = req.body;
    const start = Date.now();
    const results = trie.autocomplete(prefix, k);
    const elapsed = Date.now() - start;
    res.json({ prefix, k, results, queryTimeMs: elapsed });
});

// Fuzzy search
app.post('/api/fuzzy', (req, res) => {
    const { word = '', maxDist = 1 } = req.body;
    const start = Date.now();
    const results = trie.fuzzySearch(word, maxDist);
    const elapsed = Date.now() - start;
    res.json({ word, maxDist, results, queryTimeMs: elapsed });
});

// Stats
app.get('/api/stats', (req, res) => {
    res.json(trie.getStats());
});

// Benchmark
app.get('/api/benchmark', (req, res) => {
    const data = trie.benchmark();
    res.json(data);
});

// Serve static frontend in production
app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));
app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, '..', 'frontend', 'dist', 'index.html');
    const fs = require('fs');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).json({ error: 'Frontend not built. Run: cd frontend && npm run build' });
    }
});

app.listen(PORT, () => {
    console.log(`[API] Server running on http://localhost:${PORT}`);
    console.log(`[API] Engine: ${trie.fallback ? 'Node.js fallback' : 'C++ binary'}`);
});
