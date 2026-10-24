"use client"

/** Utilitários de Web Push executados no navegador. */

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  )
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported"
  return Notification.permission
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null
  try {
    return await navigator.serviceWorker.register("/sw.js")
  } catch {
    return null
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(base64)
  const output = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i)
  return output
}

/**
 * Garante que o dispositivo atual tenha uma subscription registrada no backend.
 * Só atua quando a permissão já foi concedida pelo usuário.
 */
export async function syncPushSubscription(): Promise<boolean> {
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapid || !pushSupported() || Notification.permission !== "granted") return false

  const registration = await registerServiceWorker()
  if (!registration) return false

  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid),
      })
    } catch {
      return false
    }
  }

  const payload = subscription.toJSON()
  try {
    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: payload.keys,
        device_name: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 120) : null,
      }),
    })
    return response.ok
  } catch {
    return false
  }
}

/** Solicita permissão e registra a subscription (usado pela tela de preferências). */
export async function enablePush(): Promise<boolean> {
  if (!pushSupported()) return false
  const permission = await Notification.requestPermission()
  if (permission !== "granted") return false
  return syncPushSubscription()
}

/** Remove a subscription do dispositivo atual. */
export async function disablePush(): Promise<boolean> {
  if (!pushSupported()) return true
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    const subscription = registration
      ? await registration.pushManager.getSubscription()
      : null
    if (!subscription) return true

    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    })
    await subscription.unsubscribe()
    return true
  } catch {
    return false
  }
}
