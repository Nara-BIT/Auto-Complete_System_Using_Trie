const express = require('express');
const cors = require('cors');
const path = require('path');
const { TrieBridge } = require('./trie');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const trie = new TrieBridge();

// The persistent C++ engine loads the dictionary itself on startup; in fallback
// mode this loads it into the in-process trie. Fire-and-forget with a log.
const dictPath = path.join(__dirname, '..', 'backend', 'data', 'dictionary.txt');
trie.loadDictionary(dictPath)
    .then((stats) => console.log('[API] Dictionary ready:', stats))
    .catch((e) => console.log('[API] Dictionary load issue:', e.message));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', engine: trie.fallback ? 'node' : 'c++' });
});

// Insert a word
app.post('/api/insert', async (req, res) => {
    const { word } = req.body;
    if (!word) return res.status(400).json({ error: 'word is required' });
    const result = await trie.insert(word);
    const stats = await trie.getStats();
    res.json({ ...result, word, stats });
});

// Search exact word
app.post('/api/search', async (req, res) => {
    const { word } = req.body;
    if (!word) return res.status(400).json({ error: 'word is required' });
    const result = await trie.search(word);
    res.json({ word, ...result });
});

// Autocomplete (prefix -> top-K)
app.post('/api/autocomplete', async (req, res) => {
    const { prefix = '', k = 10 } = req.body;
    const start = Date.now();
    const results = await trie.autocomplete(prefix, k);
    const elapsed = Date.now() - start;
    res.json({ prefix, k, results, queryTimeMs: elapsed });
});

// Fuzzy search
app.post('/api/fuzzy', async (req, res) => {
    const { word = '', maxDist = 1 } = req.body;
    const start = Date.now();
    const results = await trie.fuzzySearch(word, maxDist);
    const elapsed = Date.now() - start;
    res.json({ word, maxDist, results, queryTimeMs: elapsed });
});

// Stats
app.get('/api/stats', async (req, res) => {
    res.json(await trie.getStats());
});

// Benchmark
app.get('/api/benchmark', async (req, res) => {
    const data = await trie.benchmark();
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
    console.log(`[API] Engine: ${trie.fallback ? 'Node.js fallback' : 'C++ binary (persistent)'}`);
});
