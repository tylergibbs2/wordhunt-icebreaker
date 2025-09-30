export class TrieNode {
  children: Map<string, TrieNode>;
  isEndOfWord: boolean;
  word?: string; // Store the complete word for easy access

  constructor() {
    this.children = new Map();
    this.isEndOfWord = false;
  }

  // Add a word to the trie
  insert(word: string): void {
    let current = this as TrieNode;

    for (const char of word.toLowerCase()) {
      if (!current.children.has(char)) {
        current.children.set(char, new TrieNode());
      }
      current = current.children.get(char)!;
    }

    current.isEndOfWord = true;
    current.word = word.toLowerCase();
  }

  // Check if a word exists in the trie
  search(word: string): boolean {
    let current = this as TrieNode;

    for (const char of word.toLowerCase()) {
      if (!current.children.has(char)) {
        return false;
      }
      current = current.children.get(char)!;
    }

    return current.isEndOfWord;
  }

  // Check if a prefix exists in the trie
  startsWith(prefix: string): boolean {
    let current = this as TrieNode;

    for (const char of prefix.toLowerCase()) {
      if (!current.children.has(char)) {
        return false;
      }
      current = current.children.get(char)!;
    }

    return true;
  }

  // Get all words that start with a given prefix
  getWordsWithPrefix(prefix: string): string[] {
    let current = this as TrieNode;

    // Navigate to the prefix node
    for (const char of prefix.toLowerCase()) {
      if (!current.children.has(char)) {
        return [];
      }
      current = current.children.get(char)!;
    }

    // Collect all words from this node
    const words: string[] = [];
    this.collectWords(current, words);
    return words;
  }

  // Helper method to collect all words from a node
  private collectWords(node: TrieNode, words: string[]): void {
    if (node.isEndOfWord && node.word) {
      words.push(node.word);
    }

    for (const child of node.children.values()) {
      this.collectWords(child, words);
    }
  }

  // Get the node at a specific path (useful for board validation)
  getNodeAtPath(path: string): TrieNode | null {
    let current = this as TrieNode;

    for (const char of path.toLowerCase()) {
      if (!current.children.has(char)) {
        return null;
      }
      current = current.children.get(char)!;
    }

    return current;
  }

  // Get all possible next characters from a given path
  getNextCharacters(path: string): string[] {
    const node = this.getNodeAtPath(path);
    if (!node) return [];

    return Array.from(node.children.keys());
  }
}
