import type { GroupWithItems } from "@/lib/types";
import { GroupCard } from "./group";

interface ViewModeProps {
  groups: GroupWithItems[];
}

export function ViewMode({ groups }: ViewModeProps) {
  return (
    <div className="flex flex-col gap-8">
      {groups.map((group) => (
        <GroupCard key={group.id} group={group} />
      ))}
    </div>
  );
}
