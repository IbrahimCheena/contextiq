import { Chunk } from '@/types';

const CHUNK_SIZE_TOKENS = 500;
const OVERLAP_TOKENS = 50;

// Approximate: GPT-family tokenizers average ~1.3 tokens per word
const TOKENS_PER_WORD = 1.3;
const WORDS_PER_CHUNK = Math.floor(CHUNK_SIZE_TOKENS / TOKENS_PER_WORD); // ~384
const WORDS_OVERLAP = Math.floor(OVERLAP_TOKENS / TOKENS_PER_WORD);      // ~38

function estimateTokenCount(text: string): number {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.round(wordCount * TOKENS_PER_WORD);
}

function buildChunkStrings(words: string[]): string[] {
  if (words.length === 0) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + WORDS_PER_CHUNK, words.length);
    chunks.push(words.slice(start, end).join(' '));
    if (end === words.length) break;
    start += WORDS_PER_CHUNK - WORDS_OVERLAP;
  }

  return chunks;
}

export function chunkText(text: string, filename: string): Chunk[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const words = normalized.split(/\s+/).filter(Boolean);
  const chunkStrings = buildChunkStrings(words);

  return chunkStrings.map((chunkContent, index) => ({
    id: `${filename}::chunk-${index}`,
    text: chunkContent,
    tokenCount: estimateTokenCount(chunkContent),
    index,
    filename,
  }));
}
