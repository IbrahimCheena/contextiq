'use client';

import { useCallback, useState } from 'react';
import DropZone from '@/components/DropZone';
import UploadStatus from '@/components/UploadStatus';
import ChatWindow from '@/components/ChatWindow';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AppState, UploadResponse } from '@/types';

const INITIAL_STATE: AppState = {
  status: 'idle',
  filename: null,
  totalChunks: 0,
  error: null,
};

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
      setAppState({ status: 'error', filename: file.name, totalChunks: 0, error: 'Network error — try again.' });
      return;
    }

    setAppState((prev) => ({ ...prev, status: 'processing' }));

    let data: UploadResponse;
    try {
      data = (await res.json()) as UploadResponse;
    } catch {
      setAppState({ status: 'error', filename: file.name, totalChunks: 0, error: 'Unexpected server response.' });
      return;
    }

    if (!res.ok || !data.success) {
      setAppState({ status: 'error', filename: file.name, totalChunks: 0, error: data.error ?? 'Upload failed.' });
      return;
    }

    setAppState({ status: 'ready', filename: data.filename, totalChunks: data.totalChunks, error: null });
  }, []);

  const handleReset = useCallback(() => {
    // Delete the current document's chunks from Supabase so stale data doesn't
    // accumulate. Fire-and-forget — the UI resets immediately regardless.
    if (appState.filename) {
      fetch('/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: appState.filename }),
      }).catch((err) => console.error('[reset] delete failed:', err));
    }
    setAppState(INITIAL_STATE);
  }, [appState.filename]);

  return (
    <main className="h-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100">

      {/* ── Header ── */}
      <header className="flex-shrink-0 border-b border-slate-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-950 px-5 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5 animate-fade-up">
            <div className="relative">
              <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/25 ring-1 ring-white/10">
                <span className="text-white font-bold text-xs tracking-wider">IQ</span>
              </div>
              <div className="absolute inset-0 rounded-xl bg-violet-500/20 blur-lg -z-10 scale-110" />
            </div>
            <div>
              <span className="font-semibold text-base tracking-tight text-slate-900 dark:text-zinc-100">ContextIQ</span>
              <span className="hidden sm:inline ml-2 text-xs text-slate-400 dark:text-zinc-600">/ document assistant</span>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 text-xs border rounded-full px-3 py-1.5 border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/70" />
              GPT-4o
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* ── Two-panel body ── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

        {/* ── Left panel — Upload ──
            Mobile: fixed height portion at top (scrollable)
            Desktop: 380px fixed-width sidebar                    */}
        <aside className="relative flex-shrink-0 lg:w-[380px] flex flex-col border-b lg:border-b-0 lg:border-r max-h-[45vh] lg:max-h-none overflow-y-auto border-slate-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-950">

          {/* Subtle animated glow blobs (dark only) */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
            <div className="absolute top-4 left-8 w-64 h-64 bg-violet-600/5 rounded-full blur-3xl dark:opacity-100 opacity-0 animate-pulse" />
            <div className="absolute bottom-8 right-4 w-48 h-48 bg-indigo-600/5 rounded-full blur-3xl dark:opacity-100 opacity-0 animate-pulse [animation-delay:2s]" />
          </div>

          <div className="relative flex flex-col gap-6 p-6 lg:p-7">

            {/* Hero */}
            <div className="space-y-2 animate-fade-up">
              <h1 className="text-xl lg:text-2xl font-bold tracking-tight leading-snug text-slate-900 dark:text-zinc-100">
                Your documents.{' '}
                <span className="animate-gradient text-transparent bg-clip-text bg-gradient-to-r from-violet-500 via-indigo-400 to-blue-400">
                  Your answers.
                </span>{' '}
                Cited.
              </h1>
              <p className="text-sm text-slate-500 dark:text-zinc-500 leading-relaxed">
                Upload a document, ask anything. ContextIQ finds the exact
                passages and cites every source.
              </p>
            </div>

            {/* Upload card */}
            <div className="animate-fade-up [animation-delay:0.05s] bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm dark:shadow-xl dark:shadow-black/20 space-y-4">
              <DropZone onFileSelect={handleFileSelect} appState={appState} />
              <div className="flex items-center justify-between gap-4 min-h-5">
                <UploadStatus appState={appState} />
                {appState.status !== 'idle' && (
                  <button
                    onClick={handleReset}
                    className="text-xs text-slate-400 dark:text-zinc-700 hover:text-slate-600 dark:hover:text-zinc-400 transition-colors flex-shrink-0"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* File info card — shown after successful upload */}
            {appState.status === 'ready' && appState.filename && (
              <div className="animate-fade-up flex items-center gap-3.5 p-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 rounded-2xl shadow-sm">
                <div className="w-10 h-10 bg-violet-500/10 border border-violet-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-violet-500 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-zinc-100 truncate">{appState.filename}</p>
                  <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
                    {appState.totalChunks} chunks · text-embedding-3-small · GPT-4o
                  </p>
                </div>
                <span className="flex-shrink-0 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full px-2.5 py-1 font-medium">
                  Ready
                </span>
              </div>
            )}

          </div>
        </aside>

        {/* ── Right panel — Chat ── */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-slate-50 dark:bg-zinc-950">
          <ChatWindow
            key={appState.filename ?? '__empty__'}
            isReady={appState.status === 'ready'}
            filename={appState.filename}
          />
        </div>

      </div>

      {/* ── Footer ── */}
      <footer className="flex-shrink-0 border-t border-slate-200 dark:border-zinc-800/50 px-6 py-2.5 bg-white dark:bg-zinc-950">
        <div className="flex items-center justify-between text-xs text-slate-300 dark:text-zinc-700">
          <span>ContextIQ</span>
          <span>RAG · pgvector · GPT-4o</span>
        </div>
      </footer>

    </main>
  );
}
