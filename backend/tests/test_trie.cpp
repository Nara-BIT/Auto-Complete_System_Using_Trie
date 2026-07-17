#include <gtest/gtest.h>
#include "trie.h"

class TrieTest : public ::testing::Test {
protected:
    Trie trie;

    void SetUp() override {
        trie.insert("apple");
        trie.insert("app");
        trie.insert("application");
        trie.insert("apply");
        trie.insert("ape");
        trie.insert("bat");
        trie.insert("ball");
        trie.insert("band");
        trie.insert("banana");
        trie.insert("cat");
    }
};

TEST_F(TrieTest, InsertAndSearch) {
    EXPECT_EQ(trie.search("apple"), 1);
    EXPECT_EQ(trie.search("app"), 1);
    EXPECT_EQ(trie.search("bat"), 1);
    EXPECT_EQ(trie.search("xyz"), 0);
    EXPECT_EQ(trie.search(""), 0);
}

TEST_F(TrieTest, FrequencyIncrement) {
    trie.insert("apple");
    trie.insert("apple");
    EXPECT_EQ(trie.search("apple"), 3);
    EXPECT_EQ(trie.search("app"), 1);
}

TEST_F(TrieTest, AutocompleteBasic) {
    auto results = trie.autocomplete("app", 10);
    EXPECT_GE(results.size(), 4u);
    EXPECT_EQ(results[0].first, "app");
}

TEST_F(TrieTest, AutocompleteTopK) {
    // Insert "cat" many times to make it highest frequency
    for (int i = 0; i < 10; i++) trie.insert("cat");
    auto results = trie.autocomplete("ca", 2);
    EXPECT_LE(results.size(), 2u);
    EXPECT_EQ(results[0].first, "cat");
}

TEST_F(TrieTest, AutocompleteNoMatch) {
    auto results = trie.autocomplete("xyz", 5);
    EXPECT_TRUE(results.empty());
}

TEST_F(TrieTest, FuzzySearchExact) {
    auto results = trie.fuzzySearch("apple", 0);
    EXPECT_FALSE(results.empty());
    EXPECT_EQ(results[0].word, "apple");
}

TEST_F(TrieTest, FuzzySearchEditDistance1) {
    auto results = trie.fuzzySearch("aple", 1);
    bool found = false;
    for (auto& r : results) {
        if (r.word == "apple") found = true;
    }
    EXPECT_TRUE(found);
}

TEST_F(TrieTest, FuzzySearchSubstitution) {
    auto results = trie.fuzzySearch("bpple", 1);
    bool found = false;
    for (auto& r : results) {
        if (r.word == "apple") found = true;
    }
    EXPECT_TRUE(found);
}

TEST_F(TrieTest, SerializeDeserialize) {
    trie.serialize("test_trie.bin");
    Trie trie2;
    trie2.deserialize("test_trie.bin");
    EXPECT_EQ(trie2.search("apple"), 1);
    EXPECT_EQ(trie2.search("bat"), 1);
    EXPECT_EQ(trie2.getWordCount(), trie.getWordCount());
    remove("test_trie.bin");
}

TEST_F(TrieTest, NodeCount) {
    EXPECT_GT(trie.getNodeCount(), 0);
}

TEST_F(TrieTest, WordCount) {
    EXPECT_EQ(trie.getWordCount(), 10);
}

TEST_F(TrieTest, EmptyPrefix) {
    auto results = trie.autocomplete("", 10);
    EXPECT_EQ(results.size(), 10u);
}

int main(int argc, char** argv) {
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}
