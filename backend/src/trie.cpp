#include "trie.h"
#include <fstream>
#include <sstream>
#include <algorithm>
#include <queue>
#include <chrono>
#include <random>
#include <iostream>
#include <climits>

TrieNode::TrieNode() : isEnd(false), frequency(0) {
    for (int i = 0; i < 26; i++) {
        children[i] = nullptr;
    }
}

TrieNode::~TrieNode() = default;

Trie::Trie() : nodeCount(0), wordCount(0) {
    root = std::make_unique<TrieNode>();
    nodeCount = 1;
}

Trie::~Trie() = default;

void Trie::insert(const std::string& word) {
    if (word.empty()) return;

    TrieNode* current = root.get();
    for (char c : word) {
        int idx = c - 'a';
        if (idx < 0 || idx >= 26) continue;
        if (!current->children[idx]) {
            current->children[idx] = std::make_unique<TrieNode>();
            nodeCount++;
        }
        current = current->children[idx].get();
    }

    if (!current->isEnd) {
        wordCount++;
    }
    current->isEnd = true;
    current->frequency++;
}

int Trie::search(const std::string& word) const {
    if (word.empty()) return 0;

    TrieNode* current = root.get();
    for (char c : word) {
        int idx = c - 'a';
        if (idx < 0 || idx >= 26) return 0;
        if (!current->children[idx]) return 0;
        current = current->children[idx].get();
    }

    return current->isEnd ? current->frequency : 0;
}

void Trie::dfsFromNode(const TrieNode* node, std::string& current,
                       std::vector<std::pair<std::string, int>>& results) const {
    if (!node) return;

    if (node->isEnd) {
        results.emplace_back(current, node->frequency);
    }

    for (int i = 0; i < 26; i++) {
        if (node->children[i]) {
            current.push_back('a' + i);
            dfsFromNode(node->children[i].get(), current, results);
            current.pop_back();
        }
    }
}

std::vector<std::pair<std::string, int>> Trie::autocomplete(const std::string& prefix, int k) const {
    std::vector<std::pair<std::string, int>> results;

    TrieNode* current = root.get();
    for (char c : prefix) {
        int idx = c - 'a';
        if (idx < 0 || idx >= 26) return results;
        if (!current->children[idx]) return results;
        current = current->children[idx].get();
    }

    std::string prefixCopy = prefix;
    dfsFromNode(current, prefixCopy, results);

    // Min-heap of size K: top = smallest frequency
    std::priority_queue<std::pair<int, int>,
                        std::vector<std::pair<int, int>>,
                        std::greater<std::pair<int, int>>> minHeap;

    for (int i = 0; i < static_cast<int>(results.size()); i++) {
        minHeap.push({results[i].second, i});
        if (static_cast<int>(minHeap.size()) > k) {
            minHeap.pop();
        }
    }

    std::vector<std::pair<std::string, int>> topK;
    while (!minHeap.empty()) {
        auto [freq, idx] = minHeap.top();
        minHeap.pop();
        topK.push_back(results[idx]);
    }

    std::sort(topK.begin(), topK.end(),
              [](const auto& a, const auto& b) {
                  if (a.second != b.second) return a.second > b.second;
                  return a.first < b.first;
              });

    return topK;
}

void Trie::fuzzyDfs(const TrieNode* node, const std::string& word, std::string& current,
                     int i, int dist, int maxDist,
                     std::vector<SearchResult>& results) const {
    if (!node) return;
    if (dist > maxDist) return;

    if (i == static_cast<int>(word.size())) {
        if (node->isEnd) {
            results.push_back({current, node->frequency, dist});
        }
        // Continue matching remaining trie characters with insertions
        for (int c = 0; c < 26; c++) {
            if (node->children[c]) {
                current.push_back('a' + c);
                fuzzyDfs(node->children[c].get(), word, current,
                         i, dist + 1, maxDist, results);
                current.pop_back();
            }
        }
        return;
    }

    for (int c = 0; c < 26; c++) {
        if (!node->children[c]) continue;

        char target = word[i];
        int newDist = dist;

        if ('a' + c != target) {
            newDist = dist + 1;
        }

        if (newDist <= maxDist) {
            current.push_back('a' + c);

            // Match character
            fuzzyDfs(node->children[c].get(), word, current,
                     i + 1, newDist, maxDist, results);

            // Skip character in word (insertion in trie)
            fuzzyDfs(node->children[c].get(), word, current,
                     i, newDist + 1, maxDist, results);

            current.pop_back();
        }
    }

    // Skip character in trie (deletion from word)
    fuzzyDfs(node, word, current,
             i + 1, dist + 1, maxDist, results);
}

std::vector<SearchResult> Trie::fuzzySearch(const std::string& word, int maxDist) const {
    std::vector<SearchResult> results;
    std::string current;
    fuzzyDfs(root.get(), word, current, 0, 0, maxDist, results);

    std::sort(results.begin(), results.end(),
              [](const SearchResult& a, const SearchResult& b) {
                  if (a.editDistance != b.editDistance) return a.editDistance < b.editDistance;
                  if (a.frequency != b.frequency) return a.frequency > b.frequency;
                  return a.word < b.word;
              });

    // Remove duplicates
    std::vector<SearchResult> unique;
    for (auto& r : results) {
        if (unique.empty() || unique.back().word != r.word) {
            unique.push_back(r);
        }
    }

    return unique;
}

void Trie::loadDictionary(const std::string& filepath) {
    std::ifstream file(filepath);
    if (!file.is_open()) {
        std::cerr << "Failed to open dictionary: " << filepath << std::endl;
        return;
    }

    std::string word;
    int count = 0;
    while (std::getline(file, word)) {
        // Trim whitespace and convert to lowercase
        word.erase(0, word.find_first_not_of(" \t\r\n"));
        word.erase(word.find_last_not_of(" \t\r\n") + 1);

        if (!word.empty()) {
            std::transform(word.begin(), word.end(), word.begin(), ::tolower);
            // Only insert alphabetic words
            bool valid = true;
            for (char c : word) {
                if (c < 'a' || c > 'z') {
                    valid = false;
                    break;
                }
            }
            if (valid) {
                insert(word);
                count++;
            }
        }
    }

    std::cerr << "Loaded " << count << " words from dictionary." << std::endl;
}

void Trie::collectWords(const TrieNode* node, std::vector<std::string>& words) const {
    if (!node) return;
    if (node->isEnd) {
        std::string w;
        // We'll collect in a different way
    }
    for (int i = 0; i < 26; i++) {
        if (node->children[i]) {
            collectWords(node->children[i].get(), words);
        }
    }
}

void Trie::serializeNode(const TrieNode* node, std::ofstream& out) const {
    if (!node) {
        char null = 0;
        out.write(&null, 1);
        return;
    }

    char marker = 1;
    out.write(&marker, 1);

    char isEnd = node->isEnd ? 1 : 0;
    out.write(&isEnd, 1);

    out.write(reinterpret_cast<const char*>(&node->frequency), sizeof(int));

    for (int i = 0; i < 26; i++) {
        if (node->children[i]) {
            char hasChild = 1;
            out.write(&hasChild, 1);
            serializeNode(node->children[i].get(), out);
        } else {
            char noChild = 0;
            out.write(&noChild, 1);
        }
    }
}

void Trie::serialize(const std::string& filepath) const {
    std::ofstream out(filepath, std::ios::binary);
    if (!out.is_open()) {
        std::cerr << "Failed to open file for serialization: " << filepath << std::endl;
        return;
    }

    out.write(reinterpret_cast<const char*>(&nodeCount), sizeof(int));
    out.write(reinterpret_cast<const char*>(&wordCount), sizeof(int));
    serializeNode(root.get(), out);

    std::cout << "Serialized trie to " << filepath
              << " (" << nodeCount << " nodes, " << wordCount << " words)" << std::endl;
}

std::unique_ptr<TrieNode> Trie::deserializeNode(std::ifstream& in) {
    char marker;
    in.read(&marker, 1);

    if (!in.good() || marker == 0) return nullptr;

    auto node = std::make_unique<TrieNode>();

    char isEnd;
    in.read(&isEnd, 1);
    node->isEnd = (isEnd == 1);

    in.read(reinterpret_cast<char*>(&node->frequency), sizeof(int));

    for (int i = 0; i < 26; i++) {
        char hasChild;
        in.read(&hasChild, 1);
        if (hasChild == 1) {
            node->children[i] = deserializeNode(in);
        }
    }

    return node;
}

void Trie::deserialize(const std::string& filepath) {
    std::ifstream in(filepath, std::ios::binary);
    if (!in.is_open()) {
        std::cerr << "Failed to open file for deserialization: " << filepath << std::endl;
        return;
    }

    in.read(reinterpret_cast<char*>(&nodeCount), sizeof(int));
    in.read(reinterpret_cast<char*>(&wordCount), sizeof(int));
    root = deserializeNode(in);

    std::cout << "Deserialized trie from " << filepath
              << " (" << nodeCount << " nodes, " << wordCount << " words)" << std::endl;
}

BenchmarkResult Trie::benchmark(int queries) const {
    BenchmarkResult result{};
    result.dictionarySize = wordCount;
    result.trieNodeCount = nodeCount;

    // Collect all words for sampling
    std::vector<std::string> allWords;
    std::string current;
    auto collectFromNode = [&](auto&& self, const TrieNode* node, std::string& word) -> void {
        if (!node) return;
        if (node->isEnd) allWords.push_back(word);
        for (int i = 0; i < 26; i++) {
            if (node->children[i]) {
                word.push_back('a' + i);
                self(self, node->children[i].get(), word);
                word.pop_back();
            }
        }
    };
    collectFromNode(collectFromNode, root.get(), current);

    if (allWords.empty()) return result;

    std::mt19937 rng(42);
    std::uniform_int_distribution<int> dist(0, allWords.size() - 1);

    // Benchmark search
    auto start = std::chrono::high_resolution_clock::now();
    volatile int sum = 0;
    for (int i = 0; i < queries; i++) {
        sum += search(allWords[dist(rng)]);
    }
    auto end = std::chrono::high_resolution_clock::now();
    result.queryTimeMs = std::chrono::duration<double, std::milli>(end - start).count();

    // Benchmark autocomplete
    start = std::chrono::high_resolution_clock::now();
    for (int i = 0; i < queries; i++) {
        auto prefix = allWords[dist(rng)].substr(0, std::min(3, (int)allWords[dist(rng)].size()));
        auto res = const_cast<Trie*>(this)->autocomplete(prefix, 10);
    }
    end = std::chrono::high_resolution_clock::now();
    result.autocompleteTimeMs = std::chrono::duration<double, std::milli>(end - start).count();

    // Benchmark fuzzy
    start = std::chrono::high_resolution_clock::now();
    for (int i = 0; i < queries / 10; i++) {
        auto w = allWords[dist(rng)];
        if (w.size() > 2) w.pop_back();
        auto res = const_cast<Trie*>(this)->fuzzySearch(w, 1);
    }
    end = std::chrono::high_resolution_clock::now();
    result.fuzzyTimeMs = std::chrono::duration<double, std::milli>(end - start).count();

    return result;
}

int Trie::getNodeCount() const { return nodeCount; }
int Trie::getWordCount() const { return wordCount; }
