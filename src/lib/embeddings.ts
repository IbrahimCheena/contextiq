import OpenAI from 'openai';
import { supabase } from './supabase';
import type { Chunk, EmbedResponse } from '@/types';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const BATCH_SIZE = 20;

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set.');
  return new OpenAI({ apiKey });
}

async function fetchEmbeddings(openai: OpenAI, texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });

  // The API guarantees order matches input, but sort by index to be safe.
  return response.data
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
}

export async function embedChunks(
  chunks: Chunk[],
  filename: string
): Promise<EmbedResponse> {
  let openai: OpenAI;

  try {
    openai = getOpenAIClient();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Configuration error.';
    return { success: false, totalEmbedded: 0, error: message };
  }

  // Delete stale rows for this filename so re-uploads don't stack duplicates
  const { error: deleteError } = await supabase
    .from('documents')
    .delete()
    .eq('filename', filename);
  if (deleteError) {
    return { success: false, totalEmbedded: 0, error: `Failed to clear old chunks: ${deleteError.message}` };
  }

  let totalEmbedded = 0;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);

    let embeddings: number[][];
    try {
      embeddings = await fetchEmbeddings(openai, batch.map((c) => c.text));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'OpenAI request failed.';
      return {
        success: false,
        totalEmbedded,
        error: `Embedding batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${message}`,
      };
    }

    const records = batch.map((chunk, j) => ({
      filename,
      chunk_index: chunk.index,
      content: chunk.text,
      embedding: embeddings[j],
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: dbError } = await supabase.from('documents').insert(records as any);

    if (dbError) {
      return {
        success: false,
        totalEmbedded,
        error: `Database insert failed: ${dbError.message}`,
      };
    }

    totalEmbedded += batch.length;
  }

  return { success: true, totalEmbedded };
}
