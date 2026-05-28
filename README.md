# ContextIQ — AI-Powered RAG Document Assistant

> Upload any document. Ask anything. Get cited answers — powered by GPT-4o.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-contextiq--henna.vercel.app-6d28d9?style=for-the-badge&logo=vercel&logoColor=white)](https://contextiq-henna.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js%2014-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com)

---

## Overview

ContextIQ is a full-stack Retrieval-Augmented Generation (RAG) application. Users upload PDF or text documents, ask natural language questions, and receive streamed answers that cite the exact source passages used — no hallucinations, no guesswork.

The project was built end-to-end from scratch: document ingestion pipeline, vector embedding, semantic search with pgvector, streaming LLM responses, and a polished React UI with dark/light mode.

**[→ Try the live demo](https://contextiq-henna.vercel.app)**

---

## Features

- **Drag-and-drop upload** — PDF and TXT support, up to 10 MB
- **Semantic chunking** — Documents split into 500-token segments with 50-token overlap to preserve context at boundaries
- **Vector embeddings** — Every chunk embedded with `text-embedding-3-small` (1536 dimensions) and stored in Supabase pgvector
- **Cosine similarity search** — Questions embedded at query time and matched against stored vectors; top 5 chunks retrieved
- **Streaming answers** — GPT-4o response streams token-by-token via Server-Sent Events; no waiting for the full response
- **Interactive source cards** — Each answer links back to the specific chunks used; cards expand to show full passage text, colour-coded by match confidence
- **Re-upload safety** — Existing chunks for a document are deleted before re-embedding, preventing stale duplicates
- **Dark / light mode** — Persisted to `localStorage` via `next-themes`
- **Mobile responsive** — Panels stack on small screens; input bar pinned to bottom

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 14 (App Router) | Server components, API routes, streaming |
| Language | TypeScript (strict mode) | No `any` except targeted Supabase workarounds |
| Styling | TailwindCSS v4 | Class-based dark mode, custom keyframe animations |
| AI — Embeddings | OpenAI `text-embedding-3-small` | 1536-dim vectors, batched 20 at a time |
| AI — Generation | OpenAI `gpt-4o` | Streaming via `ReadableStream` + SSE |
| Database | Supabase (PostgreSQL + pgvector) | `match_documents` RPC for similarity search |
| PDF Parsing | `pdf-parse` | Server-only via `serverExternalPackages` |
| Theme | `next-themes` | Persisted, SSR-safe with `suppressHydrationWarning` |
| Deployment | Vercel | Zero-config, edge-compatible |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Browser                        │
│  ┌────────────────┐    ┌───────────────────────┐ │
│  │  Upload Panel  │    │      Chat Panel        │ │
│  │  (DropZone)    │    │  (streaming SSE reader)│ │
│  └───────┬────────┘    └──────────┬────────────┘ │
└──────────┼──────────────────────┼───────────────┘
           │ POST /api/upload      │ POST /api/query
           ▼                       ▼
┌─────────────────────────────────────────────────┐
│              Next.js API Routes                  │
│                                                  │
│  /api/upload                /api/query           │
│  1. Parse PDF/TXT           1. Embed question    │
│  2. Chunk (500t / 50t)      2. match_documents() │
│  3. Embed chunks (×20)      3. Build GPT prompt  │
│  4. Upsert to Supabase      4. Stream GPT-4o     │
└──────────────┬──────────────────────┬────────────┘
               │                      │
               ▼                      ▼
     ┌──────────────────┐   ┌──────────────────┐
     │    Supabase DB    │   │    OpenAI API    │
     │  pgvector store   │   │  Embeddings +    │
     │  match_documents  │   │  GPT-4o stream   │
     └──────────────────┘   └──────────────────┘
```

---

## Engineering Decisions

**Chunking strategy** — Word-count approximation (~1.3 tokens/word) avoids a tokeniser dependency while producing consistent ~500-token chunks. Overlap prevents answers from straddling chunk boundaries.

**Streaming architecture** — The `/api/query` route opens a `ReadableStream`, emits sources as the first SSE event (so the UI can display them immediately), then pipes the GPT-4o stream token by token. The client reads chunks with `getReader()` and updates React state incrementally.

**ivfflat index trade-off** — The schema intentionally omits an ivfflat index for small datasets. An ivfflat index built on an empty table produces undefined cluster centroids and silently returns zero results. For datasets under ~10k rows, PostgreSQL's exact sequential scan is both correct and fast. The `/api/query` route also includes a JS cosine-similarity fallback that activates if the SQL function returns zero results despite rows existing.

**Supabase generic type workaround** — Passing a hand-written `Database` interface to `createClient<Database>` caused TypeScript to collapse the `Insert` type to `never` when `Row` referenced an external interface (a supabase-js generic resolution bug). The fix is to inline all field types directly inside the `Database` interface and derive external types from it, rather than the reverse.

**Filename sanitisation** — Windows hides file extensions by default; uploading `report.txt` produces a file named `report.txt.txt` on disk. A regex `(\.[^.]+)\1$` collapses consecutive duplicate extensions before the filename is stored.

---

## Local Setup

**Prerequisites:** Node.js 18+, a Supabase project, an OpenAI API key with GPT-4o access.

```bash
git clone https://github.com/IbrahimCheena/contextiq.git
cd contextiq
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
OPENAI_API_KEY=sk-...
```

Run the schema in your Supabase SQL editor:

```bash
# Copy the contents of src/lib/schema.sql and paste into the Supabase SQL editor
```

Start the dev server:

```bash
npm run dev
# → http://localhost:3000
```

---

## Deployment

Deployed to Vercel. Set the three environment variables in your Vercel project settings, then push to `main`.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/IbrahimCheena/contextiq)

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── upload/route.ts   # PDF parse → chunk → embed → store
│   │   └── query/route.ts    # Embed question → vector search → stream GPT-4o
│   ├── globals.css           # Tailwind v4, dark mode variant, keyframe animations
│   ├── layout.tsx            # ThemeProvider, font setup
│   └── page.tsx              # Two-panel layout (upload + chat)
├── components/
│   ├── ChatWindow.tsx        # Streaming chat, source cards, SSE reader
│   ├── DropZone.tsx          # Drag-and-drop, file validation
│   ├── ThemeProvider.tsx     # next-themes wrapper
│   ├── ThemeToggle.tsx       # Sun/moon toggle button
│   └── UploadStatus.tsx      # Upload progress indicator
├── lib/
│   ├── chunker.ts            # 500-token word-count chunker with overlap
│   ├── embeddings.ts         # OpenAI batch embedding + Supabase upsert
│   ├── schema.sql            # PostgreSQL schema + match_documents RPC
│   └── supabase.ts           # Supabase client
└── types/
    └── index.ts              # Chunk, Message, Source, AppState, UploadResponse
```

---

*Built by [Ibrahim Cheena](https://github.com/IbrahimCheena) — demonstrating production RAG architecture: document ingestion, vector embeddings, semantic search, and streaming LLM responses.*
