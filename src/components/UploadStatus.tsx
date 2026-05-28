'use client';

import { AppState } from '@/types';

interface UploadStatusProps {
  appState: AppState;
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 flex-shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className="w-4 h-4 flex-shrink-0"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      className="w-4 h-4 flex-shrink-0"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function UploadStatus({ appState }: UploadStatusProps) {
  const { status, filename, totalChunks, error } = appState;

  if (status === 'idle') return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 text-sm"
    >
      {status === 'uploading' && (
        <span className="flex items-center gap-2 text-zinc-400">
          <Spinner />
          Uploading
          {filename && (
            <span className="text-zinc-500 truncate max-w-[200px]">
              {filename}
            </span>
          )}
          …
        </span>
      )}

      {status === 'processing' && (
        <span className="flex items-center gap-2 text-blue-400">
          <Spinner />
          Processing &amp; chunking document…
        </span>
      )}

      {status === 'ready' && (
        <span className="flex items-center gap-2 text-emerald-400">
          <CheckIcon />
          Ready —{' '}
          <span className="font-semibold">{totalChunks} chunks indexed</span>
          {filename && (
            <span className="text-zinc-500 truncate max-w-[200px]">
              ({filename})
            </span>
          )}
        </span>
      )}

      {status === 'error' && (
        <span className="flex items-center gap-2 text-red-400">
          <XIcon />
          {error ?? 'Something went wrong. Please try again.'}
        </span>
      )}
    </div>
  );
}
