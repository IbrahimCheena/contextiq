# ContextIQ

**AI-powered document assistant — upload PDFs, ask questions, get cited answers.**

---

## What it does

- **Semantic ingestion** — Drag-and-drop a PDF or TXT file. ContextIQ extracts the text, splits it into 500-token chunks with 50-token overlap, and embeds every chunk with OpenAI's `text-embedding-3-small`.
- **Vector storage** — Embeddings are stored in Supabase with the pgvector extension, enabling fast cosine-similarity retrieval at query time.
- **Retrieval-augmented generation** — Each question is embedded and matched against the stored chunks. The top 5 most relevant passages are passed to GPT-4o as grounded context.
- **Cited answers** — Every response references the exact source chunks it used (with filename, chunk index, and similarity score), making answers verifiable and hallucination-resistant.

---

## Tech Stack

| Layer       | Technology                                              |
|-------------|--------------------------------------------------------|
| Frontend    | Next.js 14 (App Router) · TypeScript · TailwindCSS v4  |
| Backend     | Next.js API Routes (Node.js runtime)                   |
| AI          | OpenAI `text-embedding-3-small` + `gpt-4o` (streaming) |
| Database    | Supabase · PostgreSQL · pgvector                       |
| Deployment  | Vercel                                                 |

---

## How it works

```
Upload  →  Chunk  →  Embed  →  Query
```

1. **Upload** — User drags a PDF or TXT file onto the upload zone. The server parses the text with `pdf-parse`.
2. **Chunk** — Text is split into ~500-token segments (word-count approximation) with 50-token overlap so no context is lost at boundaries.
3. **Embed** — Each chunk is sent to the OpenAI Embeddings API in batches of 20, then upserted into the `documents` table in Supabase as a 1536-dimension vector.
4. **Query** — The user's question is embedded with the same model, matched against stored vectors via cosine similarity (`match_documents` RPC), and the top results are streamed through GPT-4o with a grounding prompt that restricts answers to the retrieved context.

---

## Setup

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- An [OpenAI](https://platform.openai.com) API key with access to `gpt-4o`

### 1. Clone and install

```bash
git clone https://github.com/IbrahimCheena/contextiq.git
cd contextiq
npm install
```

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
# Open .env.local and fill in your keys
```

| Variable                    | Where to find it                              |
|-----------------------------|-----------------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`  | Supabase dashboard → Project Settings → API   |
| `SUPABASE_SERVICE_KEY`      | Supabase dashboard → Project Settings → API   |
| `OPENAI_API_KEY`            | platform.openai.com → API Keys                |

### 3. Set up the database

In the Supabase SQL editor, run the contents of `src/lib/schema.sql`.  
This creates the `documents` table, enables pgvector, and adds the `match_documents` similarity-search function.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), upload a document, and start asking questions.

---

## Live Demo

🔗 **[contextiq.vercel.app](https://contextiq.vercel.app)** ← URL to be updated after deployment

---

## Deployment

Deploy to Vercel in one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/IbrahimCheena/contextiq)

Set `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and `SUPABASE_SERVICE_KEY` in the Vercel project environment variables before deploying.

---

> Built as a portfolio project demonstrating production RAG architecture — document ingestion, vector search, streaming LLM responses, and source citations end-to-end.
