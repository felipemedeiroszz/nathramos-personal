"use client";

import { useEffect } from "react";
import { registerServiceWorker, syncPushSubscription } from "@/lib/push/client";

/**
 * Registra o Service Worker e mantém a subscription de push sincronizada
 * quando a permissão já foi concedida. Não solicita permissão automaticamente.
 */
export function PushNotificationManager() {
  useEffect(() => {
    let active = true;
    (async () => {
      await registerServiceWorker();
      if (!active) return;
      await syncPushSubscription();
    })();
    return () => {
      active = false;
    };
  }, []);

  return null;
}

export default PushNotificationManager;
