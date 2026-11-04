/** Invalidate local views without reloading the document or sending private data. */
export function notifyDataChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("app:data-changed"));
  if (typeof BroadcastChannel !== "undefined") {
    try {
      const channel = new BroadcastChannel("application_data_changed");
      channel.postMessage("changed");
      channel.close();
    } catch {
      /* Polling and server invalidation remain available. */
    }
  }
}
export function isStudentPanelPath(pathname: string) {
  return (
    /^\/(?:pt-BR|en-US)\/(?:dashboard|treino|dieta|suplementos|hidratacao|progresso|lista-compras|conversas|reunioes|exames|ebooks|mais|account)(?:\/|$)/.test(
      pathname,
    ) || /^\/(?:pt-BR|en-US)\/assinatura\/?$/.test(pathname)
  );
}
