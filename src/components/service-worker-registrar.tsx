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

    const getWorkerVersion = (worker: ServiceWorker): Promise<string> => {
      return new Promise((resolve) => {
        const channel = new MessageChannel();
        const timer = setTimeout(() => {
          channel.port1.close();
          resolve("");
        }, 1000);
        channel.port1.onmessage = (event) => {
          clearTimeout(timer);
          resolve(event.data?.version ?? "");
        };
        worker.postMessage({ type: "GET_VERSION" }, [channel.port2]);
      });
    };

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
          verifyAndNotify(worker);
        }
      };
      handleStateChange();
      worker.addEventListener("statechange", handleStateChange);
    };

    const verifyAndNotify = async (worker: ServiceWorker) => {
      if (!navigator.serviceWorker.controller) {
        // No active controller — first install, don't show toast
        return;
      }

      const [activeVersion, newVersion] = await Promise.all([
        getWorkerVersion(navigator.serviceWorker.controller),
        getWorkerVersion(worker),
      ]);

      if (activeVersion && newVersion && activeVersion === newVersion) {
        // Byte-level difference but same version — spurious update
        console.log("[SW] Version unchanged, skipping update notification");
        worker.postMessage({ type: "SKIP_WAITING" });
        return;
      }

      showUpdateToast(worker);
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
