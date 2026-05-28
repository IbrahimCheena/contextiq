'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Message, Source } from '@/types';

// ── SSE event union (internal to this component) ──────────────────────────
type SSEEvent =
  | { type: 'sources'; sources: Source[] }
  | { type: 'token'; content: string }
  | { type: 'done' };

// ── Sub-components ────────────────────────────────────────────────────────

function SourceCard({ source, index }: { source: Source; index: number }) {
  const pct = Math.round(source.similarity * 100);
  const preview =
    source.content.length > 160
      ? source.content.slice(0, 160) + '…'
      : source.content;

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-zinc-400">
          [{index + 1}] {source.filename}
          <span className="text-zinc-600"> · chunk {source.chunk_index}</span>
        </span>
        <span className="text-xs font-mono text-emerald-500">{pct}%</span>
      </div>
      <p className="text-xs text-zinc-500 leading-relaxed">{preview}</p>
    </div>
  );
}

function LoadingDots() {
  return (
    <div className="flex items-center gap-1.5 py-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:-0.3s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:-0.15s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" />
    </div>
  );
}

function MessageBubble({
  message,
  isActiveStream,
}: {
  message: Message;
  isActiveStream: boolean;
}) {
  const isUser = message.role === 'user';
  const isEmpty = message.content === '';
  const hasSources = (message.sources?.length ?? 0) > 0;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={[
          'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bg-violet-600 text-white rounded-tr-sm'
            : 'bg-zinc-800 text-zinc-100 rounded-tl-sm',
        ].join(' ')}
      >
        {/* Content or loading */}
        {isEmpty && isActiveStream ? (
          <LoadingDots />
        ) : (
          <p className="whitespace-pre-wrap">
            {message.content}
            {isActiveStream && !isEmpty && (
              <span className="inline-block w-0.5 h-[1em] bg-zinc-400 ml-px align-middle animate-pulse" />
            )}
          </p>
        )}

        {/* Sources — only after streaming finishes */}
        {!isActiveStream && hasSources && (
          <div className="mt-3 pt-3 border-t border-zinc-700">
            <p className="text-xs text-zinc-500 mb-2 font-medium uppercase tracking-wide">
              Sources
            </p>
            <div className="flex flex-col gap-2">
              {message.sources!.map((src, i) => (
                <SourceCard key={src.id ?? i} source={src} index={i} />
              ))}
            </div>
          </div>
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

  // Clear history when a new document is loaded
  useEffect(() => {
    setMessages([]);
    setInput('');
  }, [filename]);

  // Scroll to bottom on new content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when document becomes ready
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

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

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
          // 'done' — loop exits naturally when reader is done
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

  // ── Empty state (no document) ─────────────────────────────────────────────
  if (!isReady) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center">
        <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
          <svg
            className="w-5 h-5 text-zinc-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
            />
          </svg>
        </div>
        <p className="text-zinc-500 text-sm">Upload a document to get started</p>
      </div>
    );
  }

  // ── Active chat ───────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Document label */}
      <div className="px-4 py-2 border-b border-zinc-800/60 flex-shrink-0">
        <p className="text-xs text-zinc-600">
          Asking about{' '}
          <span className="text-zinc-400 font-medium">{filename}</span>
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center py-16">
            <p className="text-zinc-600 text-sm">Ask anything about this document</p>
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
      <div className="flex-shrink-0 border-t border-zinc-800 px-4 py-3 flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about your document…"
          disabled={isStreaming}
          className="flex-1 bg-zinc-800 text-zinc-100 text-sm rounded-xl px-4 py-2.5 placeholder-zinc-600 outline-none focus:ring-1 focus:ring-violet-500 transition-shadow disabled:opacity-50 min-w-0"
        />
        <button
          onClick={sendMessage}
          disabled={isStreaming || !input.trim()}
          className="flex-shrink-0 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl px-4 py-2.5 transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
