'use client';

import { useCallback, useState } from 'react';
import DropZone from '@/components/DropZone';
import UploadStatus from '@/components/UploadStatus';
import ChatWindow from '@/components/ChatWindow';
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
    <main className="h-screen bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <header className="flex-shrink-0 border-b border-zinc-800/60 px-6 py-4">
        <div className="flex items-center justify-between max-w-none">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-violet-700 rounded-lg flex items-center justify-center shadow-lg shadow-violet-900/40">
              <span className="text-white font-bold text-xs tracking-wider">IQ</span>
            </div>
            <span className="text-zinc-100 font-semibold text-lg tracking-tight">
              ContextIQ
            </span>
          </div>
          <span className="hidden sm:block text-zinc-600 text-xs font-mono">
            Your documents. Your answers. Cited.
          </span>
        </div>
      </header>

      {/* ── Two-panel body ── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

        {/* ── Left panel — Upload ── */}
        <aside className="flex-shrink-0 lg:w-[380px] flex flex-col border-b lg:border-b-0 lg:border-r border-zinc-800/60 overflow-y-auto">
          <div className="flex flex-col gap-8 p-8">

            {/* Tagline */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-snug text-zinc-100">
                Your documents.{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-blue-400">
                  Your answers.
                </span>{' '}
                Cited.
              </h1>
              <p className="mt-2 text-zinc-500 text-sm leading-relaxed">
                Upload a PDF or text file, then ask anything.
                ContextIQ retrieves the exact passages and cites its sources.
              </p>
            </div>

            {/* Upload card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl shadow-black/30">
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

            {/* Stats — show after upload */}
            {appState.status === 'ready' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <p className="text-2xl font-bold text-violet-400">{appState.totalChunks}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">chunks indexed</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <p className="text-2xl font-bold text-emerald-400">GPT-4o</p>
                  <p className="text-xs text-zinc-500 mt-0.5">model active</p>
                </div>
              </div>
            )}

          </div>
        </aside>

        {/* ── Right panel — Chat ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ChatWindow
            key={appState.filename ?? '__empty__'}
            isReady={appState.status === 'ready'}
            filename={appState.filename}
          />
        </div>

      </div>

      {/* ── Footer ── */}
      <footer className="flex-shrink-0 border-t border-zinc-800/60 px-6 py-3">
        <div className="flex items-center justify-between text-zinc-700 text-xs">
          <span>ContextIQ — AI-Powered RAG Document Assistant</span>
          <span>Phase 3: Query Engine</span>
        </div>
      </footer>
    </main>
  );
}
