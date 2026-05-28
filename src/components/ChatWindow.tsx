'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Message, Source } from '@/types';

type SSEEvent =
  | { type: 'sources'; sources: Source[] }
  | { type: 'token'; content: string }
  | { type: 'done' };

// ── Source card ───────────────────────────────────────────────────────────

function SourceCard({ source, index }: { source: Source; index: number }) {
  const pct = Math.round(source.similarity * 100);
  const preview =
    source.content.length > 180 ? source.content.slice(0, 180) + '…' : source.content;

  return (
    <div className="bg-zinc-950/80 border border-zinc-800/50 rounded-xl px-3 py-2.5 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-zinc-400 truncate">
          <span className="text-violet-400/70 mr-1">[{index + 1}]</span>
          {source.filename}
          <span className="text-zinc-600 ml-1">· chunk {source.chunk_index}</span>
        </span>
        <span className="flex-shrink-0 text-xs font-mono text-emerald-400/80">{pct}%</span>
      </div>
      <p className="text-xs text-zinc-500 leading-relaxed">{preview}</p>
    </div>
  );
}

// ── Loading indicator ─────────────────────────────────────────────────────

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      <span className="w-2 h-2 rounded-full bg-zinc-600 animate-bounce [animation-delay:-0.3s]" />
      <span className="w-2 h-2 rounded-full bg-zinc-600 animate-bounce [animation-delay:-0.15s]" />
      <span className="w-2 h-2 rounded-full bg-zinc-600 animate-bounce" />
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────

function MessageBubble({
  message,
  isActiveStream,
}: {
  message: Message;
  isActiveStream: boolean;
}) {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const isUser = message.role === 'user';
  const isEmpty = message.content === '';
  const hasSources = (message.sources?.length ?? 0) > 0;

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[78%] bg-violet-600 text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed shadow-lg shadow-violet-900/20">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start items-end gap-2.5">
      {/* AI avatar */}
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-0.5 shadow-md shadow-violet-900/40">
        <span className="text-white text-[9px] font-bold tracking-wide">IQ</span>
      </div>

      <div className="max-w-[78%] bg-zinc-900 border border-zinc-800/80 text-zinc-100 rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed shadow-sm">
        {isEmpty && isActiveStream ? (
          <ThinkingDots />
        ) : (
          <>
            <p className="whitespace-pre-wrap">
              {message.content}
              {isActiveStream && !isEmpty && (
                <span className="inline-block w-0.5 h-[1em] bg-violet-400/70 ml-px align-middle animate-pulse" />
              )}
            </p>

            {/* Collapsible sources — hidden by default */}
            {!isActiveStream && hasSources && (
              <div className="mt-3 pt-3 border-t border-zinc-800/60">
                <button
                  onClick={() => setSourcesOpen((o) => !o)}
                  className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors group"
                >
                  <svg
                    className={`w-3 h-3 transition-transform duration-200 ${sourcesOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                  {sourcesOpen ? 'Hide' : 'View'}{' '}
                  <span className="font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors">
                    {message.sources!.length}
                  </span>{' '}
                  {message.sources!.length === 1 ? 'source' : 'sources'}
                </button>

                {sourcesOpen && (
                  <div className="mt-2.5 flex flex-col gap-2">
                    {message.sources!.map((src, i) => (
                      <SourceCard key={src.id ?? i} source={src} index={i} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

interface ChatWindowProps {
  isReady: boolean;
  filename: string | null;
}

export default function ChatWindow({ isReady, filename }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMessages([]);
    setInput('');
  }, [filename]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isReady) inputRef.current?.focus();
  }, [isReady]);

  const sendMessage = useCallback(async () => {
    const question = input.trim();
    if (!question || isStreaming || !isReady) return;

    setInput('');
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: question },
      { role: 'assistant', content: '', sources: [] },
    ]);
    setIsStreaming(true);

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const trimmed = part.trim();
          if (!trimmed.startsWith('data:')) continue;
          const raw = trimmed.slice(5).trim();
          if (!raw) continue;

          let event: SSEEvent;
          try {
            event = JSON.parse(raw) as SSEEvent;
          } catch {
            continue;
          }

          if (event.type === 'sources') {
            setMessages((prev) => {
              const copy = [...prev];
              copy[copy.length - 1] = { ...copy[copy.length - 1], sources: event.sources };
              return copy;
            });
          } else if (event.type === 'token') {
            setMessages((prev) => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              copy[copy.length - 1] = { ...last, content: last.content + event.content };
              return copy;
            });
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: 'assistant',
          content: 'Something went wrong. Please try again.',
        };
        return copy;
      });
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, isReady]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!isReady) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-5 px-10 text-center select-none">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-inner">
            <svg
              className="w-9 h-9 text-zinc-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
              />
            </svg>
          </div>
          <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
            <svg className="w-3 h-3 text-violet-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M9.315 7.584C12.195 3.883 16.695 1.5 21.75 1.5a.75.75 0 0 1 .75.75c0 5.056-2.383 9.555-6.084 12.436A6.75 6.75 0 0 1 9.75 22.5a.75.75 0 0 1-.75-.75v-4.131A15.838 15.838 0 0 1 6.382 15H2.25a.75.75 0 0 1-.75-.75 6.75 6.75 0 0 1 7.815-6.666ZM15 6.75a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5Z" />
              <path d="M5.26 17.242a.75.75 0 1 0-.897-1.203 5.243 5.243 0 0 0-2.05 5.022.75.75 0 0 0 .625.627 5.243 5.243 0 0 0 5.022-2.051.75.75 0 1 0-1.202-.897 3.744 3.744 0 0 1-3.008 1.51c0-1.23.592-2.323 1.51-3.008Z" />
            </svg>
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-zinc-200 font-semibold text-base">No document loaded</p>
          <p className="text-zinc-500 text-sm max-w-[240px] leading-relaxed">
            Upload a PDF or text file on the left to start asking questions
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-600 border border-zinc-800 rounded-full px-3.5 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
          Powered by GPT-4o
        </div>
      </div>
    );
  }

  // ── Active chat ───────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Document bar */}
      <div className="flex-shrink-0 px-5 py-2.5 border-b border-zinc-800/50 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 flex-shrink-0" />
        <p className="text-xs text-zinc-500 truncate">
          Context:{' '}
          <span className="text-zinc-300 font-medium">{filename}</span>
        </p>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-1.5 text-center">
            <p className="text-zinc-400 font-medium text-sm">Ready</p>
            <p className="text-zinc-600 text-xs">Ask anything about {filename}</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isActiveStream =
            isStreaming && i === messages.length - 1 && msg.role === 'assistant';
          return (
            <MessageBubble key={i} message={msg} isActiveStream={isActiveStream} />
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="flex-shrink-0 px-4 pb-4 pt-3 border-t border-zinc-800/50">
        <div className="flex items-center gap-2.5">
          <div
            className={[
              'flex-1 flex items-center bg-zinc-900 border rounded-full px-5 transition-all duration-200',
              isStreaming
                ? 'border-zinc-800 opacity-60'
                : 'border-zinc-800 focus-within:border-violet-500/60 focus-within:ring-2 focus-within:ring-violet-500/10',
            ].join(' ')}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your document…"
              disabled={isStreaming}
              className="flex-1 bg-transparent text-zinc-100 text-sm py-3 outline-none placeholder-zinc-600 min-w-0"
            />
          </div>

          <button
            onClick={sendMessage}
            disabled={isStreaming || !input.trim()}
            aria-label="Send"
            className="flex-shrink-0 w-11 h-11 rounded-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors shadow-lg shadow-violet-900/30"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
