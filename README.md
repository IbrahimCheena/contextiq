# ContextIQ

**Your documents. Your answers. Cited.**

ContextIQ is a production-grade AI-powered RAG (Retrieval-Augmented Generation) document assistant. Upload PDFs or text files, ask natural language questions, and receive accurate answers with cited source passages — no hallucinations.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | TailwindCSS v4 |
| PDF Parsing | pdf-parse |
| Embeddings | OpenAI (coming soon) |
| Vector Store | Supabase pgvector (coming soon) |
| LLM | GPT-4o (coming soon) |

## Project Structure

```
src/
├── app/
│   ├── api/upload/route.ts   # Multipart upload → PDF parse → chunk
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx              # Landing page with drag-and-drop upload
├── components/
│   ├── DropZone.tsx          # Drag-and-drop / click-to-browse upload zone
│   └── UploadStatus.tsx      # Upload progress and status messages
├── lib/
│   └── chunker.ts            # 500-token chunker with 50-token overlap
└── types/
    └── index.ts              # Shared TypeScript interfaces
```

## Setup

> Full setup instructions (Supabase schema, environment variables, embedding pipeline) coming in Phase 2.

## Development

```bash
cp .env.local.example .env.local
# fill in your keys

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Roadmap

- [x] Phase 1 — Document ingestion pipeline (upload, parse, chunk)
- [ ] Phase 2 — OpenAI embeddings + Supabase pgvector storage
- [ ] Phase 3 — Semantic search + GPT-4o answer generation with citations
- [ ] Phase 4 — Chat history, multi-document support, auth
