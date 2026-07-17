#include "trie.h"
#include "aho_corasick.h"
#include <iostream>
#include <fstream>
#include <sstream>
#include <string>
#include <vector>

void jsonEscape(std::string& s) {
    std::string out;
    for (char c : s) {
        switch (c) {
            case '"': out += "\\\""; break;
            case '\\': out += "\\\\"; break;
            case '\n': out += "\\n"; break;
            default: out += c;
        }
    }
    s = out;
}

void runJsonMode(int argc, char* argv[]) {
    if (argc < 3) {
        std::cout << "{\"error\":\"usage: trie_cli --json <command> [args...]\"}" << std::endl;
        return;
    }

    std::string cmd = argv[2];
    Trie trie;

    std::ifstream checkFile("data/dictionary.txt");
    if (checkFile.good()) {
        checkFile.close();
        trie.loadDictionary("data/dictionary.txt");
    }

    if (cmd == "stats") {
        std::cout << "{\"wordCount\":" << trie.getWordCount()
                  << ",\"nodeCount\":" << trie.getNodeCount() << "}" << std::endl;
    } else if (cmd == "search" && argc >= 4) {
        std::string word = argv[3];
        int freq = trie.search(word);
        std::cout << "{\"word\":\"" << word << "\",\"frequency\":" << freq << "}" << std::endl;
    } else if (cmd == "insert" && argc >= 4) {
        std::string word = argv[3];
        trie.insert(word);
        int freq = trie.search(word);
        std::cout << "{\"success\":true,\"word\":\"" << word
                  << "\",\"frequency\":" << freq
                  << ",\"stats\":{\"wordCount\":" << trie.getWordCount()
                  << ",\"nodeCount\":" << trie.getNodeCount() << "}}" << std::endl;
    } else if (cmd == "autocomplete" && argc >= 5) {
        std::string prefix = argv[3];
        int k = std::stoi(argv[4]);
        auto results = trie.autocomplete(prefix, k);
        std::cout << "{\"prefix\":\"" << prefix << "\",\"k\":" << k << ",\"results\":[";
        for (int i = 0; i < (int)results.size(); i++) {
            if (i > 0) std::cout << ",";
            std::string w = results[i].first;
            jsonEscape(w);
            std::cout << "{\"word\":\"" << w << "\",\"frequency\":" << results[i].second << "}";
        }
        std::cout << "]}" << std::endl;
    } else if (cmd == "fuzzy" && argc >= 4) {
        std::string word = argv[3];
        int maxDist = argc >= 5 ? std::stoi(argv[4]) : 1;
        auto results = trie.fuzzySearch(word, maxDist);
        std::cout << "{\"word\":\"" << word << "\",\"maxDist\":" << maxDist << ",\"results\":[";
        int limit = std::min((int)results.size(), 50);
        for (int i = 0; i < limit; i++) {
            if (i > 0) std::cout << ",";
            std::string w = results[i].word;
            jsonEscape(w);
            std::cout << "{\"word\":\"" << w << "\",\"frequency\":" << results[i].frequency
                      << ",\"editDistance\":" << results[i].editDistance << "}";
        }
        std::cout << "]}" << std::endl;
    } else if (cmd == "benchmark") {
        auto result = trie.benchmark(1000);
        std::cout << "{\"search\":{\"queries\":1000,\"timeMs\":" << result.queryTimeMs
                  << "},\"autocomplete\":{\"queries\":1000,\"timeMs\":" << result.autocompleteTimeMs
                  << "},\"fuzzy\":{\"queries\":100,\"timeMs\":" << result.fuzzyTimeMs
                  << "},\"stats\":{\"wordCount\":" << result.dictionarySize
                  << ",\"nodeCount\":" << result.trieNodeCount << "}}" << std::endl;
    } else {
        std::cout << "{\"error\":\"unknown command: " << cmd << "\"}" << std::endl;
    }
}

void interactiveMode() {
    std::cout << "============================================" << std::endl;
    std::cout << "  Trie-Based Autocomplete System v1.0" << std::endl;
    std::cout << "============================================" << std::endl;

    Trie trie;
    std::ifstream checkFile("data/dictionary.txt");
    if (checkFile.good()) {
        checkFile.close();
        trie.loadDictionary("data/dictionary.txt");
    }

    int choice;
    while (true) {
        std::cout << "\nCommands:" << std::endl;
        std::cout << "  1. Insert a word" << std::endl;
        std::cout << "  2. Search a word" << std::endl;
        std::cout << "  3. Autocomplete (prefix -> top-K)" << std::endl;
        std::cout << "  4. Fuzzy search (edit distance <= 1)" << std::endl;
        std::cout << "  5. Load dictionary file" << std::endl;
        std::cout << "  6. Run benchmark" << std::endl;
        std::cout << "  7. Serialize trie" << std::endl;
        std::cout << "  8. Deserialize trie" << std::endl;
        std::cout << "  9. Aho-Corasick keyword match" << std::endl;
        std::cout << "  0. Exit" << std::endl;
        std::cout << "> ";
        std::cin >> choice;
        std::cin.ignore();

        if (choice == 0) break;

        switch (choice) {
            case 1: {
                std::cout << "Enter word: ";
                std::string word;
                std::getline(std::cin, word);
                trie.insert(word);
                std::cout << "Inserted \"" << word << "\"" << std::endl;
                break;
            }
            case 2: {
                std::cout << "Enter word: ";
                std::string word;
                std::getline(std::cin, word);
                int freq = trie.search(word);
                if (freq > 0) {
                    std::cout << "Found \"" << word << "\" (frequency: " << freq << ")" << std::endl;
                } else {
                    std::cout << "Not found." << std::endl;
                }
                break;
            }
            case 3: {
                std::cout << "Enter prefix: ";
                std::string prefix;
                std::getline(std::cin, prefix);
                std::cout << "Enter K: ";
                int k;
                std::cin >> k;
                std::cin.ignore();
                auto results = trie.autocomplete(prefix, k);
                std::cout << "Top-" << k << " for \"" << prefix << "\":" << std::endl;
                for (int i = 0; i < (int)results.size(); i++) {
                    std::cout << "  " << (i + 1) << ". " << results[i].first
                              << " (freq: " << results[i].second << ")" << std::endl;
                }
                if (results.empty()) std::cout << "  No results." << std::endl;
                break;
            }
            case 4: {
                std::cout << "Enter word: ";
                std::string word;
                std::getline(std::cin, word);
                auto results = trie.fuzzySearch(word, 1);
                std::cout << "Fuzzy results for \"" << word << "\":" << std::endl;
                for (int i = 0; i < (int)results.size() && i < 20; i++) {
                    std::cout << "  " << results[i].word
                              << " (dist: " << results[i].editDistance
                              << ", freq: " << results[i].frequency << ")" << std::endl;
                }
                if (results.empty()) std::cout << "  No results." << std::endl;
                break;
            }
            case 5: {
                std::cout << "Enter file path: ";
                std::string path;
                std::getline(std::cin, path);
                trie.loadDictionary(path);
                std::cout << "Total words: " << trie.getWordCount()
                          << ", Nodes: " << trie.getNodeCount() << std::endl;
                break;
            }
            case 6: {
                std::cout << "Running benchmark (1000 queries)..." << std::endl;
                auto result = trie.benchmark(1000);
                std::cout << "\n--- Benchmark Results ---" << std::endl;
                std::cout << "  Dictionary size: " << result.dictionarySize << " words" << std::endl;
                std::cout << "  Trie nodes: " << result.trieNodeCount << std::endl;
                std::cout << "  Search (1000 queries): " << result.queryTimeMs << " ms" << std::endl;
                std::cout << "  Autocomplete (1000 queries): " << result.autocompleteTimeMs << " ms" << std::endl;
                std::cout << "  Fuzzy search (100 queries): " << result.fuzzyTimeMs << " ms" << std::endl;
                if (result.queryTimeMs > 0)
                    std::cout << "  Avg search: " << result.queryTimeMs / 1000.0 << " ms/query" << std::endl;
                break;
            }
            case 7: {
                std::cout << "Enter output file: ";
                std::string path;
                std::getline(std::cin, path);
                trie.serialize(path);
                break;
            }
            case 8: {
                std::cout << "Enter input file: ";
                std::string path;
                std::getline(std::cin, path);
                trie.deserialize(path);
                std::cout << "Total words: " << trie.getWordCount()
                          << ", Nodes: " << trie.getNodeCount() << std::endl;
                break;
            }
            case 9: {
                AhoCorasick ac;
                std::vector<std::string> patterns = {"he", "she", "his", "hers"};
                ac.build(patterns);
                std::string text = "ahishers";
                std::cout << "\n--- Aho-Corasick Demo ---" << std::endl;
                std::cout << "Text: \"" << text << "\"" << std::endl;
                auto result = ac.searchWithTiming(text);
                std::cout << "Found " << result.totalMatches << " matches in " << result.searchTimeMs << " ms" << std::endl;
                for (auto& m : result.matches) {
                    std::cout << "  \"" << m.keyword << "\" at positions: ";
                    for (int pos : m.positions) std::cout << pos << " ";
                    std::cout << std::endl;
                }
                break;
            }
            default:
                std::cout << "Invalid choice." << std::endl;
        }
    }
    std::cout << "Goodbye!" << std::endl;
}

int main(int argc, char* argv[]) {
    if (argc >= 2 && std::string(argv[1]) == "--json") {
        runJsonMode(argc, argv);
        return 0;
    }
    interactiveMode();
    return 0;
}
