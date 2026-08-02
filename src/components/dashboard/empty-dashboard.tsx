import Link from "next/link";
import { LayoutGrid, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyDashboard({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section className="flex min-h-[22rem] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-card/30 px-6 py-12 text-center">
      <div className="max-w-sm">
        <div className="mx-auto mb-5 flex size-11 items-center justify-center rounded-xl bg-secondary text-muted-foreground ring-1 ring-foreground/10">
          <LayoutGrid className="size-5" />
        </div>
        <h2 className="text-lg font-semibold tracking-tight">Your dashboard is ready</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground text-pretty">
          {isLoggedIn
            ? "Create a group, then add the services and links you want to keep within reach."
            : "No services have been added yet. Sign in to start building this dashboard."}
        </p>
        {isLoggedIn && (
          <Button asChild className="mt-6">
            <Link href="/edit">
              <Plus className="size-4" />
              Add your first group
            </Link>
          </Button>
        )}
      </div>
    </section>
  );
}
