#pragma once
#include <string>
#include <vector>
#include <utility>

struct BenchmarkResult {
    double insertTimeMs;
    double queryTimeMs;
    double fuzzyTimeMs;
    double autocompleteTimeMs;
    int dictionarySize;
    int trieNodeCount;
};

struct SearchResult {
    std::string word;
    int frequency;
    int editDistance;
};

struct KeywordMatch {
    std::string keyword;
    std::vector<int> positions;
};

struct AhoResult {
    std::vector<KeywordMatch> matches;
    int totalMatches;
    double searchTimeMs;
};
