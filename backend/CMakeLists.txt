cmake_minimum_required(VERSION 3.16)
project(AutoCompleteTrie VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_library(trielib STATIC
    src/trie.cpp
    src/aho_corasick.cpp
)

target_include_directories(trielib PUBLIC include)

add_executable(trie_cli src/main.cpp)
target_link_libraries(trie_cli PRIVATE trielib)

enable_testing()
find_package(GTest QUIET)
if(GTest_FOUND)
    add_executable(tests tests/test_trie.cpp tests/test_aho_corasick.cpp)
    target_link_libraries(tests PRIVATE trielib GTest::GTest GTest::Main)
    add_test(NAME AllTests COMMAND tests)
else()
    message(STATUS "GoogleTest not found, skipping tests")
endif()
