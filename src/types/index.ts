export interface Chunk {
  id: string;
  text: string;
  tokenCount: number;
  index: number;
  filename: string;
}

export interface UploadResponse {
  success: boolean;
  filename: string;
  totalChunks: number;
  totalEmbedded: number;
  chunks: Chunk[];
  error?: string;
}

export interface EmbedResponse {
  success: boolean;
  totalEmbedded: number;
  error?: string;
}

export interface DocumentRecord {
  id: string;
  filename: string;
  chunk_index: number;
  content: string;
  embedding: number[];
  created_at: string;
}

export type UploadStatus = 'idle' | 'uploading' | 'processing' | 'ready' | 'error';

export interface AppState {
  status: UploadStatus;
  filename: string | null;
  totalChunks: number;
  error: string | null;
}
