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
  chunks: Chunk[];
  error?: string;
}

export type UploadStatus = 'idle' | 'uploading' | 'processing' | 'ready' | 'error';

export interface AppState {
  status: UploadStatus;
  filename: string | null;
  totalChunks: number;
  error: string | null;
}
