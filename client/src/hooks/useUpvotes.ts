import { useState } from 'react';
import { upvotePerspective } from '../api/perspectives';

export function useUpvotes(): { voted: Map<string, boolean>; toggle: (id: string) => void; delta: (id: string) => number } {
  const [voted, setVoted] = useState<Map<string, boolean>>(new Map());

  const toggle = (id: string) => {
    setVoted((prev) => {
      const next = new Map(prev);
      const isVoted = !!next.get(id);
      if (isVoted) {
        next.delete(id);
        void upvotePerspective(id, -1);
      } else {
        next.set(id, true);
        void upvotePerspective(id, 1);
      }
      return next;
    });
  };

  const delta = (id: string) => (voted.get(id) ? 1 : 0);

  return { voted, toggle, delta };
}
