"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

/** Drafts older than this are dropped instead of restored */
const DRAFT_DAYS = 14;
const SAVE_DELAY_MS = 600;

type Stored<T> = { value: T; savedAt: number };

/**
 * Keeps an unsent form in this browser as you type, so a closed tab, a reload or a dropped connection loses
 * nothing. On the next visit the draft is put back with `restore` and `restoredAt` is set (show `DraftNote`).
 * Call `clear()` after the form is sent. Drafts are per account (`draft:<name>:<userId>`), so another account in
 * the same browser never sees them, and nothing is kept while signed out. Pass `enabled: false` while the form
 * shows a saved record (editing a deal or an existing review): nothing is restored or saved then.
 */
export function useFormDraft<T>(
  name: string,
  value: T,
  restore: (value: T) => void,
  { isEmpty, enabled = true }: { isEmpty: (value: T) => boolean; enabled?: boolean }
) {
  const { data: session, status } = useSession();
  const key = status === "authenticated" && session?.user?.id ? `draft:${name}:${session.user.id}` : null;
  const [ready, setReady] = useState(false);
  const [restoredAt, setRestoredAt] = useState<number | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  // The latest callbacks, without re-running the effects when the caller passes new functions
  const restoreRef = useRef(restore);
  const isEmptyRef = useRef(isEmpty);
  const valueRef = useRef(value);
  // The value that was sent: a save still waiting from the last keystroke mustn't bring it back
  const clearedRef = useRef<T | null>(null);
  useEffect(() => {
    restoreRef.current = restore;
    isEmptyRef.current = isEmpty;
    valueRef.current = value;
  });

  // Put a saved draft back when the account is known (not while disabled: the form shows saved data). Disabling
  // (a dialog closing) arms it again, so a form closed by mistake gets its text back when it opens again.
  const checkedRef = useRef<string | null>(null);
  // True from arming until the stored draft has been read: the form still shows its blank start then, and saving
  // that would delete the draft about to be put back
  const checkingRef = useRef(false);
  useEffect(() => {
    if (!enabled) {
      checkedRef.current = null;
      return;
    }
    if (!key || checkedRef.current === key) return;
    checkedRef.current = key;
    checkingRef.current = true;
    queueMicrotask(() => {
      checkingRef.current = false;
      try {
        const raw = localStorage.getItem(key);
        const stored = raw ? (JSON.parse(raw) as Stored<T>) : null;
        if (stored && Date.now() - stored.savedAt < DRAFT_DAYS * 86400000 && !isEmptyRef.current(stored.value)) {
          restoreRef.current(stored.value);
          setRestoredAt(stored.savedAt);
        } else if (raw) {
          localStorage.removeItem(key);
        }
      } catch {}
      setReady(true);
    });
  }, [key, enabled]);

  // Save shortly after typing stops; an emptied form removes the draft. A save still waiting when the form closes
  // or switches (another chat, another review) is written straight away instead of dropped.
  useEffect(() => {
    if (!key || !ready || !enabled || checkingRef.current) return;
    if (clearedRef.current !== null && clearedRef.current === value) return;
    clearedRef.current = null;
    const write = () => {
      if (clearedRef.current !== null && clearedRef.current === value) return false;
      try {
        if (isEmptyRef.current(value)) localStorage.removeItem(key);
        else localStorage.setItem(key, JSON.stringify({ value, savedAt: Date.now() } satisfies Stored<T>));
        return true;
      } catch {
        return false;
      }
    };
    let done = false;
    const t = setTimeout(() => {
      done = true;
      if (write()) setSavedAt(isEmptyRef.current(value) ? null : Date.now());
    }, SAVE_DELAY_MS);
    return () => {
      clearTimeout(t);
      if (!done) write();
    };
  }, [key, ready, enabled, value]);

  /** Forget the draft (after sending, or "Discard"). */
  const clear = useCallback(() => {
    clearedRef.current = valueRef.current;
    try { if (key) localStorage.removeItem(key); } catch {}
    setRestoredAt(null);
    setSavedAt(null);
  }, [key]);

  return { restoredAt, savedAt, clear };
}
