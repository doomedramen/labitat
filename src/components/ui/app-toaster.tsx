import { Toaster } from "@/components/ui/sonner";

export function AppToaster() {
  return (
    <Toaster
      richColors
      position="top-right"
      offset={{ top: "var(--app-fixed-top)", right: "var(--app-fixed-right)" }}
      mobileOffset={{
        top: "var(--app-fixed-top)",
        left: "var(--app-fixed-left)",
        right: "var(--app-fixed-right)",
      }}
    />
  );
}
