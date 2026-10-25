import { useEffect, useRef } from 'react';
import type { QuestionDraft } from '../api/questions';

const DRAFT_KEY = 'stackrationale-question-draft';
const SAVE_EVERY_MS = 60_000;

function isDirty(d: QuestionDraft): boolean {
  return d.title !== '' || d.description !== '' || d.techStack !== '' || d.tags.length > 0 || d.category !== '';
}

export function loadDraft(): QuestionDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<QuestionDraft>;
    return {
      title: typeof parsed.title === 'string' ? parsed.title : '',
      description: typeof parsed.description === 'string' ? parsed.description : '',
      category: typeof parsed.category === 'string' ? parsed.category : '',
      techStack: typeof parsed.techStack === 'string' ? parsed.techStack : '',
      tags: Array.isArray(parsed.tags) ? parsed.tags.filter((t): t is string => typeof t === 'string') : [],
    };
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Storage unavailable; nothing to clear.
  }
}

export function useQuestionDraft(draft: QuestionDraft): void {
  const ref = useRef(draft);
  ref.current = draft;

  useEffect(() => {
    const save = () => {
      if (!isDirty(ref.current)) return;
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(ref.current));
      } catch {
        // Storage full or unavailable; skip this save.
      }
    };
    const timer = setInterval(save, SAVE_EVERY_MS);
    const onUnload = () => save();
    window.addEventListener('beforeunload', onUnload);
    return () => {
      clearInterval(timer);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, []);
}

export function useUnsavedChangesWarning(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [active]);
}
