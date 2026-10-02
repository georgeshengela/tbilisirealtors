import { useCallback, useState } from 'react';
import { useAdminAuth } from '../contexts/AdminAuthContext';

export interface UploadedFile {
  url: string;
  name: string;
  size: number;
  kind: 'image' | 'pdf';
}

const CHUNK = 5;

export interface UploadOptions {
  /** false = no brand stamp (broker portraits). Only honoured for staff. */
  watermark?: boolean;
  /** 'avatar' = one square, unstamped profile picture. Open to every signed-in user. */
  purpose?: 'avatar';
}

function uploadUrl(options: UploadOptions): string {
  if (options.purpose === 'avatar') return '/api/uploads?purpose=avatar';
  return options.watermark === false ? '/api/uploads?watermark=0' : '/api/uploads';
}

/**
 * Posts files to the upload route and hands back their public URLs.
 * Large batches go up in chunks so the picker can send 10–20 photos at once.
 */
export function useFileUpload(tokenOverride?: string | null) {
  const { token: adminToken } = useAdminAuth();
  const token = tokenOverride ?? adminToken;
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (files: File[] | FileList, options: UploadOptions = {}): Promise<UploadedFile[]> => {
    const list = Array.from(files);
    if (!list.length) return [];

    setUploading(true);
    setError(null);
    setProgress({ done: 0, total: list.length });
    const collected: UploadedFile[] = [];

    try {
      for (let i = 0; i < list.length; i += CHUNK) {
        const chunk = list.slice(i, i + CHUNK);
        const body = new FormData();
        chunk.forEach(file => body.append('files', file));
        const res = await fetch(uploadUrl(options), {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'ატვირთვა ვერ მოხერხდა');
        collected.push(...((data.files as UploadedFile[]) ?? []));
        setProgress({ done: Math.min(i + chunk.length, list.length), total: list.length });
      }
      return collected;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ატვირთვა ვერ მოხერხდა');
      return collected;
    } finally {
      setUploading(false);
      setProgress(null);
    }
  }, [token]);

  return { upload, uploading, progress, error, clearError: () => setError(null) };
}
