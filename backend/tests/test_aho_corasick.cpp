#include <gtest/gtest.h>
#include "aho_corasick.h"

class AhoCorasickTest : public ::testing::Test {
protected:
    AhoCorasick ac;

    void SetUp() override {
        ac.build({"he", "she", "his", "hers"});
    }
};

TEST_F(AhoCorasickTest, BasicSearch) {
    auto matches = ac.search("ahishers");
    EXPECT_FALSE(matches.empty());

    bool foundShe = false, foundHe = false, foundHis = false, foundHers = false;
    for (auto& m : matches) {
        if (m.keyword == "she") foundShe = true;
        if (m.keyword == "he") foundHe = true;
        if (m.keyword == "his") foundHis = true;
        if (m.keyword == "hers") foundHers = true;
    }
    EXPECT_TRUE(foundShe);
    EXPECT_TRUE(foundHe);
    EXPECT_TRUE(foundHis);
    EXPECT_TRUE(foundHers);
}

TEST_F(AhoCorasickTest, PositionsCorrect) {
    auto matches = ac.search("ahishers");
    for (auto& m : matches) {
        if (m.keyword == "his") {
            EXPECT_EQ(m.positions.size(), 1u);
            EXPECT_EQ(m.positions[0], 1);
        }
    }
}

TEST_F(AhoCorasickTest, NoMatch) {
    AhoCorasick ac2;
    ac2.build({"xyz", "uvw"});
    auto matches = ac2.search("abcdef");
    EXPECT_TRUE(matches.empty());
}

TEST_F(AhoCorasickTest, MultipleOccurrences) {
    AhoCorasick ac2;
    ac2.build({"ab"});
    auto matches = ac2.search("ababab");
    EXPECT_EQ(matches.size(), 1u);
    EXPECT_EQ(matches[0].positions.size(), 3u);
}

TEST_F(AhoCorasickTest, Timing) {
    auto result = ac.searchWithTiming("ahishers");
    EXPECT_GE(result.totalMatches, 1);
    EXPECT_GE(result.searchTimeMs, 0.0);
}

TEST_F(AhoCorasickTest, EmptyText) {
    auto matches = ac.search("");
    EXPECT_TRUE(matches.empty());
}

TEST_F(AhoCorasickTest, ClearAndReuse) {
    ac.clear();
    ac.build({"cat", "car"});
    auto matches = ac.search("the cat sat on the car");
    EXPECT_EQ(matches.size(), 2u);
}

int main(int argc, char** argv) {
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}
