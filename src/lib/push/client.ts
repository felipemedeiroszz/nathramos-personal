"use client";

const OPT_OUT_KEY = "nathramos-push-disabled";
function optedOut(): boolean {
  try {
    return localStorage.getItem(OPT_OUT_KEY) === "true";
  } catch {
    return false;
  }
}

/** Utilitários de Web Push executados no navegador. */

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function notificationPermission():
  NotificationPermission | "unsupported" {
  if (!pushSupported()) return "unsupported";
  return Notification.permission;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator))
    return null;
  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      updateViaCache: "none",
    });
    if (registration.active) return registration;
    return await new Promise<ServiceWorkerRegistration | null>((resolve) => {
      const timer = setTimeout(() => resolve(null), 10000);
      navigator.serviceWorker.ready.then(
        (ready) => {
          clearTimeout(timer);
          resolve(ready);
        },
        () => {
          clearTimeout(timer);
          resolve(null);
        },
      );
    });
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

/**
 * Garante que o dispositivo atual tenha uma subscription registrada no backend.
 * Só atua quando a permissão já foi concedida pelo usuário.
 */
let syncing: Promise<boolean> | null = null;
export function syncPushSubscription(): Promise<boolean> {
  if (!syncing)
    syncing = performSync().finally(() => {
      syncing = null;
    });
  return syncing;
}
async function performSync(): Promise<boolean> {
  try {
    const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (
      !vapid ||
      !pushSupported() ||
      Notification.permission !== "granted" ||
      optedOut()
    )
      return false;

    const registration = await registerServiceWorker();
    if (!registration) return false;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapid),
        });
      } catch {
        return false;
      }
    }

    const payload = subscription.toJSON();
    try {
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: payload.keys,
          device_name:
            typeof navigator !== "undefined"
              ? navigator.userAgent.slice(0, 120)
              : null,
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  } catch {
    return false;
  }
}

export function pushAvailability():
  "insecure" | "install" | "unsupported" | "unconfigured" | null {
  if (typeof window === "undefined") return "unsupported";
  if (!window.isSecureContext) return "insecure";
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone;
  if (ios && !standalone) return "install";
  if (!pushSupported()) return "unsupported";
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return "unconfigured";
  return null;
}

/** Solicita permissão e registra a subscription (usado pela tela de preferências). */
export async function enablePush(): Promise<boolean> {
  if (!pushSupported()) return false;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;
    try {
      localStorage.removeItem(OPT_OUT_KEY);
    } catch {
      /* storage may be unavailable */
    }
    return await syncPushSubscription();
  } catch {
    return false;
  }
}

/** Remove a subscription do dispositivo atual. */
export async function disablePush(): Promise<boolean> {
  if (!pushSupported()) return true;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = registration
      ? await registration.pushManager.getSubscription()
      : null;
    if (!subscription) {
      try {
        localStorage.setItem(OPT_OUT_KEY, "true");
      } catch {
        /* storage may be unavailable */
      }
      return true;
    }

    const response = await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
    if (!response.ok) return false;
    const removed = await subscription.unsubscribe();
    if (removed) {
      try {
        localStorage.setItem(OPT_OUT_KEY, "true");
      } catch {
        /* storage may be unavailable */
      }
    }
    return removed;
  } catch {
    return false;
  }
}
