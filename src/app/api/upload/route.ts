import { NextRequest, NextResponse } from 'next/server';
import { chunkText } from '@/lib/chunker';
import type { UploadResponse } from '@/types';

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.txt']);
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot === -1 ? '' : filename.slice(dot).toLowerCase();
}

function errorResponse(message: string, status: number): NextResponse<UploadResponse> {
  return NextResponse.json<UploadResponse>(
    { success: false, filename: '', totalChunks: 0, chunks: [], error: message },
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
    return errorResponse('Only PDF and TXT files are supported.', 415);
  }

  if (file.size > MAX_BYTES) {
    return errorResponse('File exceeds the 10 MB limit.', 413);
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    let text: string;

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

    const trimmed = text.trim();

    if (!trimmed) {
      return NextResponse.json<UploadResponse>(
        {
          success: false,
          filename: file.name,
          totalChunks: 0,
          chunks: [],
          error: 'File is empty or contains no extractable text.',
        },
        { status: 422 }
      );
    }

    const chunks = chunkText(trimmed, file.name);

    return NextResponse.json<UploadResponse>({
      success: true,
      filename: file.name,
      totalChunks: chunks.length,
      chunks,
    });
  } catch (err) {
    console.error('[upload] processing error:', err);
    return errorResponse('Failed to process file. Please try another document.', 500);
  }
}
