'use client';

import { useCallback, useRef, useState } from 'react';
import { AppState } from '@/types';

interface DropZoneProps {
  onFileSelect: (file: File) => void;
  appState: AppState;
}

const ACCEPTED = new Set(['.pdf', '.txt']);

function getExt(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot).toLowerCase();
}

export default function DropZone({ onFileSelect, appState }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);
  const dragCounter = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const isDisabled =
    appState.status === 'uploading' || appState.status === 'processing';

  const handleFile = useCallback(
    (file: File) => {
      setDragError(null);
      if (!ACCEPTED.has(getExt(file.name))) {
        setDragError('Only PDF and TXT files are accepted.');
        return;
      }
      onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current += 1;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = '';
    },
    [handleFile]
  );

  const handleClick = useCallback(() => {
    if (!isDisabled) inputRef.current?.click();
  }, [isDisabled]);

  return (
    <div className="flex flex-col gap-2">
      <div
        role="button"
        tabIndex={isDisabled ? -1 : 0}
        aria-label="Upload document"
        onClick={handleClick}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={[
          'relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 select-none outline-none',
          isDragging
            ? 'border-violet-500/70 bg-violet-500/5 scale-[1.01]'
            : 'border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/30',
          isDisabled
            ? 'opacity-50 cursor-not-allowed pointer-events-none'
            : 'cursor-pointer focus-visible:ring-2 focus-visible:ring-violet-500/50',
        ].join(' ')}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt"
          className="hidden"
          onChange={handleInputChange}
          disabled={isDisabled}
          aria-hidden
        />

        <div className="flex flex-col items-center gap-3 pointer-events-none">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${
              isDragging
                ? 'bg-violet-500/20 shadow-lg shadow-violet-500/10'
                : 'bg-zinc-800/80'
            }`}
          >
            <svg
              className={`w-6 h-6 transition-colors ${
                isDragging ? 'text-violet-400' : 'text-zinc-500'
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z"
              />
            </svg>
          </div>

          <div>
            <p className="text-zinc-300 font-medium">
              {isDragging ? 'Release to upload' : 'Drop your document here'}
            </p>
            <p className="text-zinc-600 text-sm mt-0.5">
              or{' '}
              <span className="text-violet-400">browse files</span>
            </p>
          </div>

          <p className="text-zinc-700 text-xs">PDF or TXT · max 10 MB</p>
        </div>
      </div>

      {dragError && (
        <p className="text-red-400 text-xs px-1">{dragError}</p>
      )}
    </div>
  );
}
