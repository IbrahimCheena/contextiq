'use client';

import { useCallback, useState } from 'react';
import DropZone from '@/components/DropZone';
import UploadStatus from '@/components/UploadStatus';
import { AppState, UploadResponse } from '@/types';

const INITIAL_STATE: AppState = {
  status: 'idle',
  filename: null,
  totalChunks: 0,
  error: null,
};

const COMING_SOON = [
  'OpenAI Embeddings',
  'pgvector Search',
  'GPT-4o Answers',
  'Source Citations',
];

export default function Home() {
  const [appState, setAppState] = useState<AppState>(INITIAL_STATE);

  const handleFileSelect = useCallback(async (file: File) => {
    setAppState({ status: 'uploading', filename: file.name, totalChunks: 0, error: null });

    let res: Response;
    try {
      const form = new FormData();
      form.append('file', file);
      res = await fetch('/api/upload', { method: 'POST', body: form });
    } catch {
      setAppState({
        status: 'error',
        filename: file.name,
        totalChunks: 0,
        error: 'Network error — check your connection and try again.',
      });
      return;
    }

    setAppState((prev) => ({ ...prev, status: 'processing' }));

    let data: UploadResponse;
    try {
      data = (await res.json()) as UploadResponse;
    } catch {
      setAppState({
        status: 'error',
        filename: file.name,
        totalChunks: 0,
        error: 'Unexpected server response.',
      });
      return;
    }

    if (!res.ok || !data.success) {
      setAppState({
        status: 'error',
        filename: file.name,
        totalChunks: 0,
        error: data.error ?? 'Upload failed.',
      });
      return;
    }

    setAppState({
      status: 'ready',
      filename: data.filename,
      totalChunks: data.totalChunks,
      error: null,
    });
  }, []);

  const handleReset = useCallback(() => setAppState(INITIAL_STATE), []);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* ── Header ── */}
      <header className="border-b border-zinc-800/60 px-6 py-4 flex-shrink-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-violet-700 rounded-lg flex items-center justify-center shadow-lg shadow-violet-900/40">
              <span className="text-white font-bold text-xs tracking-wider">IQ</span>
            </div>
            <span className="text-zinc-100 font-semibold text-lg tracking-tight">
              ContextIQ
            </span>
          </div>
          <span className="hidden sm:block text-zinc-600 text-xs font-mono">
            Phase 1 — Ingestion
          </span>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-2xl flex flex-col gap-10">
          {/* Tagline */}
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight text-zinc-100">
              Your documents.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-blue-400">
                Your answers.
              </span>{' '}
              Cited.
            </h1>
            <p className="mt-4 text-zinc-400 text-base sm:text-lg max-w-lg mx-auto leading-relaxed">
              Upload a PDF or text file. Ask anything. ContextIQ retrieves
              exact passages and cites its sources — no hallucinations.
            </p>
          </div>

          {/* Upload card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl shadow-black/40">
            <DropZone onFileSelect={handleFileSelect} appState={appState} />

            <div className="mt-4 min-h-6 flex items-center justify-between gap-4">
              <UploadStatus appState={appState} />
              {appState.status !== 'idle' && (
                <button
                  onClick={handleReset}
                  className="ml-auto text-xs text-zinc-600 hover:text-zinc-300 transition-colors flex-shrink-0"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Coming-soon badges */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {COMING_SOON.map((feature) => (
              <span
                key={feature}
                className="text-xs text-zinc-600 bg-zinc-900/80 border border-zinc-800 rounded-full px-3 py-1"
              >
                {feature} — coming soon
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-zinc-800/60 px-6 py-4 flex-shrink-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-zinc-700 text-xs">
          <span>ContextIQ — AI-Powered RAG Document Assistant</span>
          <span>Phase 1: Ingestion Pipeline</span>
        </div>
      </footer>
    </main>
  );
}
