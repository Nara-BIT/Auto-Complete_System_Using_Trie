#include "aho_corasick.h"
#include <algorithm>
#include <chrono>
#include <iostream>
#include <queue>

ACNode::ACNode() : failure(0) {}

AhoCorasick::AhoCorasick() : built(false) {
    nodes.emplace_back();
}

void AhoCorasick::clear() {
    nodes.clear();
    patternStrings.clear();
    built = false;
    nodes.emplace_back();
}

void AhoCorasick::build(const std::vector<std::string>& patterns) {
    clear();
    patternStrings = patterns;

    // Build trie
    for (int p = 0; p < static_cast<int>(patterns.size()); p++) {
        int current = 0;
        for (char c : patterns[p]) {
            if (nodes[current].children.find(c) == nodes[current].children.end()) {
                nodes[current].children[c] = nodes.size();
                nodes.emplace_back();
            }
            current = nodes[current].children[c];
        }
        nodes[current].output.push_back(p);
    }

    buildFailureLinks();
    built = true;
}

void AhoCorasick::buildFailureLinks() {
    std::queue<int> q;

    for (auto& [ch, child] : nodes[0].children) {
        nodes[child].failure = 0;
        q.push(child);
    }

    while (!q.empty()) {
        int current = q.front();
        q.pop();

        for (auto& [ch, child] : nodes[current].children) {
            int fail = nodes[current].failure;

            while (fail != 0 && nodes[fail].children.find(ch) == nodes[fail].children.end()) {
                fail = nodes[fail].failure;
            }

            if (nodes[fail].children.find(ch) != nodes[fail].children.end() && nodes[fail].children[ch] != child) {
                nodes[child].failure = nodes[fail].children[ch];
            } else {
                nodes[child].failure = 0;
            }

            // Merge output from failure link
            for (int idx : nodes[nodes[child].failure].output) {
                nodes[child].output.push_back(idx);
            }

            q.push(child);
        }
    }
}

std::vector<KeywordMatch> AhoCorasick::search(const std::string& text) const {
    std::vector<KeywordMatch> matches;
    if (!built || text.empty()) return matches;

    std::vector<std::vector<int>> patternPositions(patternStrings.size());
    int current = 0;

    for (int i = 0; i < static_cast<int>(text.size()); i++) {
        char c = text[i];

        while (current != 0 && nodes[current].children.find(c) == nodes[current].children.end()) {
            current = nodes[current].failure;
        }

        if (nodes[current].children.find(c) != nodes[current].children.end()) {
            current = nodes[current].children.at(c);
        }

        for (int pIdx : nodes[current].output) {
            int start = i - static_cast<int>(patternStrings[pIdx].size()) + 1;
            patternPositions[pIdx].push_back(start);
        }
    }

    for (int i = 0; i < static_cast<int>(patternStrings.size()); i++) {
        if (!patternPositions[i].empty()) {
            matches.push_back({patternStrings[i], patternPositions[i]});
        }
    }

    return matches;
}

AhoResult AhoCorasick::searchWithTiming(const std::string& text) const {
    auto start = std::chrono::high_resolution_clock::now();
    auto matches = search(text);
    auto end = std::chrono::high_resolution_clock::now();

    int total = 0;
    for (auto& m : matches) {
        total += m.positions.size();
    }

    AhoResult result;
    result.matches = matches;
    result.totalMatches = total;
    result.searchTimeMs = std::chrono::duration<double, std::milli>(end - start).count();
    return result;
}
