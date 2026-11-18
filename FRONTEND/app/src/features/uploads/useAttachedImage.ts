import { useCallback, useEffect, useRef, useState } from "react";
import { PrepareError, prepareImage, type PrepareOptions } from "./prepareImage";

export interface AttachedImage {
  /** The converted JPEG, ready to upload. */
  blob: Blob | null;
  /** A local address for showing a preview. */
  previewUrl: string | null;
  error: string | null;
  /** True while converting. */
  busy: boolean;
  pick: (file: File) => Promise<void>;
  clear: () => void;
}

/** Holds one picked photo: converts it, makes a preview, and cleans the preview up. */
export function useAttachedImage(options: PrepareOptions): AttachedImage {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const urlRef = useRef<string | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const release = useCallback(() => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  }, []);

  useEffect(() => release, [release]);

  const clear = useCallback(() => {
    release();
    setBlob(null);
    setPreviewUrl(null);
    setError(null);
  }, [release]);

  const pick = useCallback(
    async (file: File) => {
      setError(null);
      setBusy(true);
      try {
        const out = await prepareImage(file, optionsRef.current);
        release();
        const url = URL.createObjectURL(out);
        urlRef.current = url;
        setBlob(out);
        setPreviewUrl(url);
      } catch (e) {
        setError(e instanceof PrepareError ? e.message : "That image couldn’t be read. Try another one.");
      } finally {
        setBusy(false);
      }
    },
    [release],
  );

  return { blob, previewUrl, error, busy, pick, clear };
}
