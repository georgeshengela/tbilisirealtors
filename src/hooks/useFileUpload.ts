import { useCallback, useState } from 'react';
import { useAdminAuth } from '../contexts/AdminAuthContext';

export interface UploadedFile {
  url: string;
  name: string;
  size: number;
  kind: 'image' | 'pdf';
}

/**
 * Posts files to the upload route and hands back their public URLs.
 * Defaults to the admin session; pass a token to upload as a public member.
 */
export function useFileUpload(tokenOverride?: string | null) {
  const { token: adminToken } = useAdminAuth();
  const token = tokenOverride ?? adminToken;
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (files: File[] | FileList): Promise<UploadedFile[]> => {
    const list = Array.from(files);
    if (!list.length) return [];

    const body = new FormData();
    list.forEach(file => body.append('files', file));

    setUploading(true);
    setError(null);
    try {
      const res = await fetch('/api/uploads', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'ატვირთვა ვერ მოხერხდა');
      return data.files as UploadedFile[];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ატვირთვა ვერ მოხერხდა');
      return [];
    } finally {
      setUploading(false);
    }
  }, [token]);

  return { upload, uploading, error, clearError: () => setError(null) };
}
