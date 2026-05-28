import { NextRequest, NextResponse } from 'next/server';
import { chunkText } from '@/lib/chunker';
import { embedChunks } from '@/lib/embeddings';
import type { UploadResponse } from '@/types';

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.txt']);
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot === -1 ? '' : filename.slice(dot).toLowerCase();
}

function errorResponse(
  message: string,
  status: number,
  filename = ''
): NextResponse<UploadResponse> {
  return NextResponse.json<UploadResponse>(
    { success: false, filename, totalChunks: 0, totalEmbedded: 0, chunks: [], error: message },
    { status }
  );
}

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  let file: File;

  try {
    const formData = await request.formData();
    const raw = formData.get('file');

    if (!raw || typeof raw === 'string') {
      return errorResponse('No file provided.', 400);
    }

    file = raw as File;
  } catch {
    return errorResponse('Could not parse form data.', 400);
  }

  const ext = getExtension(file.name);

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return errorResponse('Only PDF and TXT files are supported.', 415, file.name);
  }

  if (file.size > MAX_BYTES) {
    return errorResponse('File exceeds the 10 MB limit.', 413, file.name);
  }

  // ── Parse ──────────────────────────────────────────────────────────────────
  let text: string;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    if (ext === '.pdf') {
      // Import from the lib path to bypass pdf-parse's debug test-file loading
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (
        data: Buffer,
        options?: Record<string, unknown>
      ) => Promise<{ text: string }>;
      const parsed = await pdfParse(buffer);
      text = parsed.text;
    } else {
      text = buffer.toString('utf-8');
    }
  } catch (err) {
    console.error('[upload] parse error:', err);
    return errorResponse('Failed to parse file.', 500, file.name);
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return NextResponse.json<UploadResponse>(
      {
        success: false,
        filename: file.name,
        totalChunks: 0,
        totalEmbedded: 0,
        chunks: [],
        error: 'File is empty or contains no extractable text.',
      },
      { status: 422 }
    );
  }

  // ── Chunk ──────────────────────────────────────────────────────────────────
  const chunks = chunkText(trimmed, file.name);

  // ── Embed + store ──────────────────────────────────────────────────────────
  const embedResult = await embedChunks(chunks, file.name);

  if (!embedResult.success) {
    console.error('[upload] embedding error:', embedResult.error);
    return NextResponse.json<UploadResponse>(
      {
        success: false,
        filename: file.name,
        totalChunks: chunks.length,
        totalEmbedded: embedResult.totalEmbedded,
        chunks,
        error: embedResult.error,
      },
      { status: 502 }
    );
  }

  return NextResponse.json<UploadResponse>({
    success: true,
    filename: file.name,
    totalChunks: chunks.length,
    totalEmbedded: embedResult.totalEmbedded,
    chunks,
  });
}
