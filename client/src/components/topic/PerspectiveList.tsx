import type { Perspective } from '../../api/types';
import { PerspectiveCard } from './PerspectiveCard';

interface Props {
  items: Perspective[];
  isGuest: boolean;
  isAdmin: boolean;
  username: string | null;
  pendingVoteIds: Set<string>;
  onToggleVote: (id: string) => void;
  selected: string[];
  onToggleCompare: (id: string) => void;
  onReport: (perspective: Perspective) => void;
  onRequestDeletion: (perspective: Perspective) => void;
  onAdminDelete: (perspective: Perspective) => void;
}

export function PerspectiveList(p: Props) {
  return (
    <ul className="space-y-4">
      {p.items.map((t) => (
        <li key={t.id} data-testid="perspective-item">
          <PerspectiveCard
            perspective={t}
            isGuest={p.isGuest}
            isOwn={p.username !== null && t.authorUsername === p.username}
            isAdmin={p.isAdmin}
            isVotePending={p.pendingVoteIds.has(t.id)}
            onToggleVote={p.onToggleVote}
            selected={p.selected.includes(t.id)}
            compareDisabled={!p.selected.includes(t.id) && p.selected.length >= 3}
            onToggleCompare={p.onToggleCompare}
            onReport={p.onReport}
            onRequestDeletion={p.onRequestDeletion}
            onAdminDelete={p.onAdminDelete}
          />
        </li>
      ))}
    </ul>
  );
}
