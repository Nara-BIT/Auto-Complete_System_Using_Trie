#pragma once
#include <string>
#include <vector>
#include <unordered_map>
#include <queue>
#include "types.h"

struct ACNode {
    std::unordered_map<char, int> children;
    int failure;
    std::vector<int> output;

    ACNode();
};

class AhoCorasick {
public:
    AhoCorasick();

    void build(const std::vector<std::string>& patterns);
    std::vector<KeywordMatch> search(const std::string& text) const;
    AhoResult searchWithTiming(const std::string& text) const;
    void clear();

private:
    std::vector<ACNode> nodes;
    std::vector<std::string> patternStrings;
    bool built;

    void buildFailureLinks();
};
