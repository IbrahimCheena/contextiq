import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabase';
import type { Source } from '@/types';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const CHAT_MODEL = 'gpt-4o';
const MATCH_COUNT = 5;

const enc = new TextEncoder();

function sse(event: object): Uint8Array {
  return enc.encode(`data: ${JSON.stringify(event)}\n\n`);
}

function buildSystemPrompt(sources: Source[]): string {
  const context = sources
    .map((s, i) => `[${i + 1}] ${s.filename} (chunk ${s.chunk_index}):\n${s.content}`)
    .join('\n\n---\n\n');

  return `You are a precise document assistant. Answer the user's question using ONLY the context provided below. If the answer is not present in the context, say so clearly — do not invent information.

When citing information, reference the source number like [1] or [2]. These numbers correspond to the numbered context entries.

Context:
${context}`;
}

// Cosine similarity for the JS fallback path (used when the SQL RPC returns 0
// results due to a broken ivfflat index built on an empty table).
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

// pgvector returns embeddings as "[0.1,0.2,...]" or "{0.1,0.2,...}" via PostgREST.
// The global flag on the regex is required — without it only the leading bracket
// is stripped, leaving "0.3]" which parses to NaN and poisons the dot product.
function parseEmbedding(val: unknown): number[] {
  if (Array.isArray(val)) return (val as unknown[]).map(Number);
  if (typeof val === 'string') {
    return val.replace(/^[\[{]|[\]}]$/g, '').split(',').map(Number);
  }
  return [];
}

export async function POST(request: NextRequest): Promise<Response> {
  // ── Parse and validate request ─────────────────────────────────────────────
  let question: string;
  let filename: string;

  try {
    const body = (await request.json()) as { question?: unknown; filename?: unknown };

    if (!body.question || typeof body.question !== 'string' || !body.question.trim()) {
      return new Response(JSON.stringify({ error: 'question is required.' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }
    if (!body.filename || typeof body.filename !== 'string' || !body.filename.trim()) {
      return new Response(JSON.stringify({ error: 'filename is required.' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    question = body.question.trim();
    filename = body.filename.trim();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body.' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'OPENAI_API_KEY is not configured.' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  const openai = new OpenAI({ apiKey });

  // ── Embed the question ─────────────────────────────────────────────────────
  let queryEmbedding: number[];
  try {
    const embRes = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: question,
    });
    queryEmbedding = embRes.data[0].embedding;
  } catch (err) {
    console.error('[query] embedding error:', err);
    return new Response(JSON.stringify({ error: 'Failed to embed question.' }), {
      status: 502, headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── Vector search — scoped to the current document only ───────────────────
  // Pass filter_filename so match_documents only returns chunks belonging to
  // this document. Without this, every user's uploads bleed into each other.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('match_documents', {
    query_embedding: queryEmbedding,
    match_count: MATCH_COUNT,
    filter_filename: filename,
  });

  if (rpcError) {
    console.error('[query] RPC error:', rpcError.message);
  }

  let sources: Source[] = Array.isArray(rpcData) ? (rpcData as Source[]) : [];

  // ── JS fallback: exact cosine search when the SQL RPC returns nothing ──────
  // Triggered when an ivfflat index built on an empty table returns 0 results.
  // Scoped to the same filename to match the RPC behaviour.
  if (sources.length === 0 && !rpcError) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: allDocs } = await (supabase
      .from('documents')
      .select('id, filename, chunk_index, content, embedding')
      .eq('filename', filename) as any);

    if (Array.isArray(allDocs) && allDocs.length > 0) {
      sources = (allDocs as Array<Record<string, unknown>>)
        .map((doc) => ({
          id:          doc.id as string,
          filename:    doc.filename as string,
          chunk_index: doc.chunk_index as number,
          content:     doc.content as string,
          similarity:  cosineSimilarity(queryEmbedding, parseEmbedding(doc.embedding)),
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, MATCH_COUNT);
    }
  }

  // ── Stream the response ────────────────────────────────────────────────────
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(sse({ type: 'sources', sources }));

      if (sources.length === 0) {
        controller.enqueue(sse({
          type: 'token',
          content: "I couldn't find any relevant information in this document for that question.",
        }));
        controller.enqueue(sse({ type: 'done' }));
        controller.close();
        return;
      }

      try {
        const chatStream = await openai.chat.completions.create({
          model: CHAT_MODEL,
          temperature: 0.2,
          stream: true,
          messages: [
            { role: 'system', content: buildSystemPrompt(sources) },
            { role: 'user', content: question },
          ],
        });

        for await (const chunk of chatStream) {
          const token = chunk.choices[0]?.delta?.content;
          if (token) controller.enqueue(sse({ type: 'token', content: token }));
        }
      } catch (err) {
        console.error('[query] GPT-4o stream error:', err);
        controller.enqueue(sse({
          type: 'token',
          content: '\n\n[Error generating response — please try again.]',
        }));
      }

      controller.enqueue(sse({ type: 'done' }));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
