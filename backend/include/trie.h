#pragma once
#include <string>
#include <vector>
#include <utility>
#include <memory>
#include "types.h"

struct TrieNode {
    std::unique_ptr<TrieNode> children[26];
    bool isEnd;
    int frequency;

    TrieNode();
    ~TrieNode();
};

class Trie {
public:
    Trie();
    ~Trie();

    void insert(const std::string& word);
    int search(const std::string& word) const;
    std::vector<std::pair<std::string, int>> autocomplete(const std::string& prefix, int k) const;
    std::vector<SearchResult> fuzzySearch(const std::string& word, int maxDist = 1) const;

    void loadDictionary(const std::string& filepath);
    void serialize(const std::string& filepath) const;
    void deserialize(const std::string& filepath);
    BenchmarkResult benchmark(int queries = 1000) const;

    int getNodeCount() const;
    int getWordCount() const;

private:
    std::unique_ptr<TrieNode> root;
    int nodeCount;
    int wordCount;

    void dfsFromNode(const TrieNode* node, std::string& current,
                     std::vector<std::pair<std::string, int>>& results) const;

    void fuzzyDfs(const TrieNode* node, const std::string& word, std::string& current,
                  int i, int dist, int maxDist,
                  std::vector<SearchResult>& results) const;

    void collectWords(const TrieNode* node, std::vector<std::string>& words) const;

    void serializeNode(const TrieNode* node, std::ofstream& out) const;
    std::unique_ptr<TrieNode> deserializeNode(std::ifstream& in);
};
