import type { Perspective } from '../../types/topic';
import { PerspectiveCard } from './PerspectiveCard';

interface Props {
  items: Perspective[];
  voted: Map<string, boolean>;
  delta: (id: string) => number;
  isGuest: boolean;
  username: string | null;
  onToggleVote: (id: string) => void;
  selected: string[];
  onToggleCompare: (id: string) => void;
}

export function PerspectiveList(p: Props) {
  return (
    <ul className="space-y-4">
      {p.items.map((t) => (
        <li key={t.id}>
          <PerspectiveCard
            perspective={t}
            voted={p.voted.get(t.id) ?? false}
            delta={p.delta(t.id)}
            isGuest={p.isGuest}
            isOwn={p.username !== null && t.author !== null && t.author === p.username}
            onToggleVote={p.onToggleVote}
            selected={p.selected.includes(t.id)}
            compareDisabled={!p.selected.includes(t.id) && p.selected.length >= 3}
            onToggleCompare={p.onToggleCompare}
          />
        </li>
      ))}
    </ul>
  );
}
