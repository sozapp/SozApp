import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_COMMIT_DELAY_MS = 150;
const DEFAULT_UNDO_WINDOW_MS = 4500;

export type UndoableDeleteRequest = {
  /** Toast’ta gösterilecek metin (örn. "Not silindi"). */
  message: string;
  /** UI’dan hemen kaldır — sync olmalı. */
  apply: () => void;
  /** Gecikmeli kalıcı silme (AsyncStorage vb.). */
  commit: () => void | Promise<void>;
  /** Geri Al — state’i ve gerekirse diski eski haline getir. */
  restore: () => void | Promise<void>;
};

export type UndoToastState = {
  message: string;
} | null;

/**
 * Gmail/Apple Mail deseni: silmeyi hemen uygula, kısa süre "Geri Al" sun.
 * Commit ~150ms gecikmeli; undo penceresi içinde disk yazımı iptal edilebilir.
 */
export function useUndoableDelete(options?: {
  commitDelayMs?: number;
  undoWindowMs?: number;
}) {
  const commitDelayMs = options?.commitDelayMs ?? DEFAULT_COMMIT_DELAY_MS;
  const undoWindowMs = options?.undoWindowMs ?? DEFAULT_UNDO_WINDOW_MS;

  const [toast, setToast] = useState<UndoToastState>(null);
  const pendingRef = useRef<{
    commitTimer: ReturnType<typeof setTimeout> | null;
    dismissTimer: ReturnType<typeof setTimeout> | null;
    commit: () => void | Promise<void>;
    restore: () => void | Promise<void>;
    committed: boolean;
  } | null>(null);

  const finalizePendingCommit = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    if (pending.commitTimer) {
      clearTimeout(pending.commitTimer);
      pending.commitTimer = null;
    }
    if (pending.dismissTimer) {
      clearTimeout(pending.dismissTimer);
      pending.dismissTimer = null;
    }
    if (!pending.committed) {
      pending.committed = true;
      void pending.commit();
    }
    pendingRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      finalizePendingCommit();
    };
  }, [finalizePendingCommit]);

  const runDelete = useCallback(
    (req: UndoableDeleteRequest) => {
      // Önceki bekleyen silmeyi geri alınamaz şekilde tamamla (tek toast).
      finalizePendingCommit();

      req.apply();
      setToast({ message: req.message });

      const entry = {
        commitTimer: null as ReturnType<typeof setTimeout> | null,
        dismissTimer: null as ReturnType<typeof setTimeout> | null,
        commit: req.commit,
        restore: req.restore,
        committed: false,
      };

      entry.commitTimer = setTimeout(() => {
        entry.commitTimer = null;
        if (!entry.committed) {
          entry.committed = true;
          void entry.commit();
        }
      }, commitDelayMs);

      entry.dismissTimer = setTimeout(() => {
        entry.dismissTimer = null;
        setToast(null);
        if (pendingRef.current === entry) pendingRef.current = null;
      }, undoWindowMs);

      pendingRef.current = entry;
    },
    [commitDelayMs, undoWindowMs, finalizePendingCommit]
  );

  const undo = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;

    if (pending.commitTimer) {
      clearTimeout(pending.commitTimer);
      pending.commitTimer = null;
    }
    if (pending.dismissTimer) {
      clearTimeout(pending.dismissTimer);
      pending.dismissTimer = null;
    }
    // Geç commit’i engelle
    pending.committed = true;
    pendingRef.current = null;
    setToast(null);
    void pending.restore();
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  return { toast, runDelete, undo, dismissToast };
}
