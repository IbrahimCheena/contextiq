# ContextIQ — AI-Powered RAG Document Assistant

> Your documents. Your answers. Cited.

**Live Demo:** [contextiq-henna.vercel.app](https://contextiq-henna.vercel.app)
**Repository:** [github.com/IbrahimCheena/contextiq](https://github.com/IbrahimCheena/contextiq)

---

## What It Does

ContextIQ lets you upload any PDF or text document and ask natural language questions about it. Instead of reading the whole thing, just ask — and get accurate, cited answers powered by GPT-4o.

- Upload PDF or TXT documents
- Automatically chunks and embeds content using OpenAI embeddings
- Semantic vector search finds the most relevant passages
- GPT-4o generates accurate answers with cited sources
- Interactive source cards show exactly which passages were used
- Dark and light mode support

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, TailwindCSS |
| Backend | Next.js API Routes, Node.js |
| AI | OpenAI text-embedding-3-small, GPT-4o |
| Database | Supabase PostgreSQL + pgvector |
| Deployment | Vercel |

---

## How It Works

1. **Upload** — User uploads a PDF or TXT file
2. **Chunk & Embed** — Document is split into 500-token chunks, each embedded via OpenAI into a 1536-dimension vector and stored in Supabase pgvector
3. **Semantic Search** — User question is embedded and compared against all stored vectors using cosine similarity
4. **Generate** — Top matching chunks are passed to GPT-4o as context, which streams back a cited answer

---

## Local Setup

```bash
git clone https://github.com/IbrahimCheena/contextiq.git
cd contextiq
npm install
```

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
SUPABASE_SERVICE_KEY=your-supabase-service-role-key
OPENAI_API_KEY=your-openai-api-key
```

Run the Supabase schema from `src/lib/schema.sql` in your Supabase SQL editor, then:

```bash
npm run dev
```

---

## Deployment

Deployed on Vercel. Add the three environment variables above in your Vercel project settings before deploying.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/IbrahimCheena/contextiq)

---

> Built as a portfolio project demonstrating production RAG architecture with semantic search, vector embeddings, and streaming LLM responses.
