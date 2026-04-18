import { cn } from "@/lib/utils";
import type { GroupWithCache } from "@/lib/types";
import { LiveDataProvider } from "@/hooks/use-live-data";
import { SseBanner } from "./sse-banner";
import { DashboardClient } from "./dashboard-client";

export { DashboardClient } from "./dashboard-client";
export { Header } from "./header";
export { EditMode } from "./edit-mode";
export { ViewMode } from "./view-mode";
export { Dialogs } from "./dialogs";
export { TitleForm } from "./title-form";
export { SseBanner } from "./sse-banner";
export { EditBar } from "./edit-bar";
export { GroupCard } from "./group";
export { GroupCardDummy } from "./group-dummy";
export { DashboardSkeleton } from "./skeleton";

interface DashboardProps {
  groups: GroupWithCache[];
  isLoggedIn: boolean;
  title: string;
}

/**
 * Server-renderable dashboard shell.
 * The outer layout and SSE provider render on the server;
 * DashboardClient mounts client-side only.
 */
export function Dashboard({ groups, isLoggedIn, title }: DashboardProps) {
  return (
    <div className={cn("min-h-svh p-6")}>
      <LiveDataProvider>
        <SseBanner />
        <DashboardClient groups={groups} isLoggedIn={isLoggedIn} title={title} />
      </LiveDataProvider>
    </div>
  );
}
