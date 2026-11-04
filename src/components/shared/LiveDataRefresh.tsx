"use client";

import { useEffect } from "react";
import { usePanelRefresh } from "@/hooks/usePanelRefresh";
import { createClientBrowser } from "@/lib/supabase/client";

/** Realtime transports invalidation pulses only. All data is re-authorized on the server. */
export function LiveDataRefresh() {
  const request = usePanelRefresh();
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof BroadcastChannel === "undefined"
    )
      return;
    try {
      const channel = new BroadcastChannel("application_data_changed");
      channel.onmessage = (event) => {
        if (event.data === "changed") request();
      };
      return () => channel.close();
    } catch {
      return;
    }
  }, [request]);
  useEffect(() => {
    let client: ReturnType<typeof createClientBrowser>;
    try {
      client = createClientBrowser();
    } catch {
      return;
    }
    const channel = client
      .channel("application_live_updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_live_updates" },
        request,
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") request();
      });
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(() => request());
    return () => {
      subscription.unsubscribe();
      void client.removeChannel(channel).catch(() => {});
    };
  }, [request]);
  return null;
}
