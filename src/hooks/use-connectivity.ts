"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { useOnAppResume } from "@/hooks/use-on-app-resume";

export type ConnectivityState = { status: "online" } | { status: "backend-down" }; // backend is unreachable

const HEALTH_ENDPOINT = "/api/health";
const POLL_INTERVAL = 5_000;

let toastId: string | number | null = null;

function dismissToast() {
  if (toastId != null) {
    toast.dismiss(toastId);
    toastId = null;
  }
}

async function isBackendReachable(): Promise<boolean> {
  try {
    const res = await fetch(HEALTH_ENDPOINT, {
      method: "HEAD",
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function useConnectivity() {
  const [state, setState] = useState<ConnectivityState>({ status: "online" });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recoveringRef = useRef(false);

  const clearPoll = useCallback(() => {
    if (intervalRef.current != null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (onRecovery: () => void) => {
      clearPoll();
      intervalRef.current = setInterval(async () => {
        if (recoveringRef.current) return;
        const reachable = await isBackendReachable();
        if (reachable) {
          recoveringRef.current = true;
          onRecovery();
        }
      }, POLL_INTERVAL);
    },
    [clearPoll],
  );

  useEffect(() => {
    // Initial check
    let cancelled = false;

    const check = async () => {
      const reachable = await isBackendReachable();
      if (!cancelled) {
        setState(reachable ? { status: "online" } : { status: "backend-down" });
      }
    };

    check();

    return () => {
      cancelled = true;
      clearPoll();
    };
  }, [clearPoll]);

  // Re-check connectivity on app resume (PWA background → foreground)
  useOnAppResume(async () => {
    const reachable = await isBackendReachable();
    setState(reachable ? { status: "online" } : { status: "backend-down" });
  });

  // Show / dismiss toasts based on state changes
  useEffect(() => {
    dismissToast();

    if (state.status === "backend-down") {
      recoveringRef.current = false;
      toastId = toast.error("Server unreachable", {
        description:
          "The backend server is not responding. It may be restarting or experiencing issues.",
        duration: Infinity,
        action: {
          label: "Retry now",
          onClick: async () => {
            const ok = await isBackendReachable();
            if (ok) {
              window.location.reload();
            } else {
              toast.error("Still unreachable", {
                description: "The server is still not responding. Trying again…",
              });
            }
          },
        },
      });
      startPolling(() => {
        if (recoveringRef.current) return;
        recoveringRef.current = true;
        dismissToast();
        toast.success("Server is back online", {
          description: "Everything is running normally.",
          duration: 4000,
        });
        setState({ status: "online" });
      });
    }
  }, [state.status, startPolling]);

  return state;
}
