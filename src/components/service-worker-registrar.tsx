"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

/** Registers the service worker and handles updates */
export function ServiceWorkerRegistrar() {
  const toastIdRef = useRef<string | number | null>(null);
  const shownRef = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let controllerChangeHandler: (() => void) | null = null;

    const showUpdateToast = (worker: ServiceWorker) => {
      if (shownRef.current) return;
      shownRef.current = true;
      if (toastIdRef.current != null) toast.dismiss(toastIdRef.current);

      toastIdRef.current = toast.info("Update available", {
        description: "A new version of Labitat is ready.",
        action: {
          label: "Refresh",
          onClick: () => {
            worker.postMessage({ type: "SKIP_WAITING" });
            window.location.reload();
          },
        },
        duration: Infinity,
      });
    };

    const addStateChangeListener = (worker: ServiceWorker) => {
      const handleStateChange = () => {
        console.log("[SW] Worker state:", worker.state);
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          showUpdateToast(worker);
        }
      };
      // Worker may already be in "installed" state by now (if updatefound fired synchronously)
      handleStateChange();
      worker.addEventListener("statechange", handleStateChange);
    };

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("[SW] Registered:", registration.scope);

        // Detect when an update is found and a waiting worker exists
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          addStateChangeListener(newWorker);
        });

        // If an installing worker already exists, updatefound already fired synchronously
        if (registration.installing) {
          addStateChangeListener(registration.installing);
        }

        // Waiting SW on load means a previous update was never applied — activate silently
        if (registration.waiting && navigator.serviceWorker.controller) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
          controllerChangeHandler = () => window.location.reload();
          navigator.serviceWorker.addEventListener("controllerchange", controllerChangeHandler);
        }
      })
      .catch((err) => {
        console.error("[SW] Registration failed:", err);
      });

    return () => {
      if (toastIdRef.current != null) {
        toast.dismiss(toastIdRef.current);
      }
      if (controllerChangeHandler) {
        navigator.serviceWorker.removeEventListener("controllerchange", controllerChangeHandler);
      }
    };
  }, []);

  return null;
}
