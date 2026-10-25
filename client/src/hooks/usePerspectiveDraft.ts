import { useEffect, useRef, useState } from 'react';

export interface PerspectiveDraft {
  solution: string;
  explanation: string;
  advantages: string[];
  limitations: string[];
  codeSnippets: Array<{ language: string; code: string }>;
  references: Array<{ label: string; url: string }>;
  anonymous: boolean;
}

const SAVE_INTERVAL_MS = 60_000;

function draftKey(slug: string): string {
  return `perspective-draft-${slug}`;
}

export function isDraftDirty(d: PerspectiveDraft): boolean {
  return (
    d.solution.trim() !== '' ||
    d.explanation.trim() !== '' ||
    d.advantages.some((a) => a.trim() !== '') ||
    d.limitations.some((l) => l.trim() !== '') ||
    d.codeSnippets.some((s) => s.code.trim() !== '') ||
    d.references.some((r) => r.url.trim() !== '')
  );
}

export function loadPerspectiveDraft(slug: string): PerspectiveDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PerspectiveDraft>;
    return {
      solution: typeof parsed.solution === 'string' ? parsed.solution : '',
      explanation: typeof parsed.explanation === 'string' ? parsed.explanation : '',
      advantages: Array.isArray(parsed.advantages) ? parsed.advantages : [''],
      limitations: Array.isArray(parsed.limitations) ? parsed.limitations : [''],
      codeSnippets: Array.isArray(parsed.codeSnippets) ? parsed.codeSnippets : [],
      references: Array.isArray(parsed.references) ? parsed.references : [],
      anonymous: Boolean(parsed.anonymous),
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

export function usePerspectiveDraft(slug: string, draft: PerspectiveDraft): { lastSaved: Date | null } {
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
