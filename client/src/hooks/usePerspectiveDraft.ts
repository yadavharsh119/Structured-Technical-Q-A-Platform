import { useEffect, useRef, useState } from 'react';

export interface PerspectiveDraft {
  proposedSolution: string;
  explanation: string;
  advantages: string[];
  limitations: string[];
  codeSnippets: Array<{ language: string; code: string }>;
  references: string[];
}

const SAVE_INTERVAL_MS = 60_000;

function draftKey(slug: string): string {
  return `perspective-draft-${slug}`;
}

export function isDraftDirty(d: PerspectiveDraft): boolean {
  return (
    d.proposedSolution.trim() !== '' ||
    d.explanation.trim() !== '' ||
    d.advantages.some((a) => a.trim() !== '') ||
    d.limitations.some((l) => l.trim() !== '') ||
    d.codeSnippets.some((s) => s.code.trim() !== '') ||
    d.references.some((r) => r.trim() !== '')
  );
}

interface LegacyDraft {
  solution?: unknown;
  references?: unknown;
}

export function loadPerspectiveDraft(slug: string): PerspectiveDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PerspectiveDraft> & LegacyDraft;
    const legacySolution = typeof parsed.solution === 'string' ? parsed.solution : '';
    const references = Array.isArray(parsed.references)
      ? parsed.references
          .map((entry) =>
            typeof entry === 'string'
              ? entry
              : typeof entry === 'object' && entry !== null && 'url' in entry
                ? String((entry as { url?: unknown }).url ?? '')
                : '',
          )
          .filter(Boolean)
      : [];
    return {
      proposedSolution:
        typeof parsed.proposedSolution === 'string' ? parsed.proposedSolution : legacySolution,
      explanation: typeof parsed.explanation === 'string' ? parsed.explanation : '',
      advantages: Array.isArray(parsed.advantages) ? parsed.advantages : [''],
      limitations: Array.isArray(parsed.limitations) ? parsed.limitations : [''],
      codeSnippets: Array.isArray(parsed.codeSnippets) ? parsed.codeSnippets : [],
      references,
    };
  } catch {
    return null;
  }
}

export function clearPerspectiveDraft(slug: string): void {
  try {
    localStorage.removeItem(draftKey(slug));
  } catch {
    // Storage unavailable
  }
}

export function savePerspectiveDraft(slug: string, draft: PerspectiveDraft): void {
  try {
    localStorage.setItem(draftKey(slug), JSON.stringify(draft));
  } catch {
    // Storage full or unavailable
  }
}

export function usePerspectiveDraft(
  slug: string,
  draft: PerspectiveDraft,
): { lastSaved: Date | null } {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const ref = useRef(draft);
  ref.current = draft;

  useEffect(() => {
    const save = () => {
      if (!isDraftDirty(ref.current)) return;
      savePerspectiveDraft(slug, ref.current);
      setLastSaved(new Date());
    };

    const timer = setInterval(save, SAVE_INTERVAL_MS);
    const onUnload = () => save();
    window.addEventListener('beforeunload', onUnload);

    return () => {
      clearInterval(timer);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [slug]);

  return { lastSaved };
}
