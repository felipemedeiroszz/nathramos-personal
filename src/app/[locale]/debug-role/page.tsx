import { createClientSSR } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DebugRolePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const supabase = await createClientSSR();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Não autenticado</h1>
        <p>Faça login primeiro</p>
      </div>
    );
  }

  // Usar service role para bypass RLS e ver o profile real
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .limit(1)
    .maybeSingle();

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Debug - User Role</h1>

      <div className="space-y-4">
        <div className="p-4 bg-surface rounded-lg">
          <h2 className="font-bold mb-2">User ID:</h2>
          <p className="font-mono text-sm">{user.id}</p>
        </div>

        <div className="p-4 bg-surface rounded-lg">
          <h2 className="font-bold mb-2">User Email:</h2>
          <p className="font-mono text-sm">{user.email}</p>
        </div>

        <div className="p-4 bg-surface rounded-lg">
          <h2 className="font-bold mb-2">Profile Data:</h2>
          <pre className="font-mono text-xs overflow-auto bg-black/30 p-4 rounded">
            {JSON.stringify(profile, null, 2)}
          </pre>
        </div>

        <div className="p-4 bg-surface rounded-lg">
          <h2 className="font-bold mb-2">Role:</h2>
          <p className="font-mono text-lg font-bold text-primary">
            {profile?.role || "NÃO DEFINIDO"}
          </p>
        </div>

        {profile?.role === "admin" || profile?.role === "coach" ? (
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p className="text-green-400 font-bold">✓ Usuário tem acesso admin</p>
            <button
              onClick={() => redirect(`/${locale}/admin/dashboard`)}
              className="mt-2 px-4 py-2 bg-primary rounded-lg"
            >
              Ir para Admin Dashboard
            </button>
          </div>
        ) : (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 font-bold">✗ Usuário NÃO tem acesso admin</p>
            <p className="text-sm mt-2">Role atual: {profile?.role || "undefined"}</p>
            <p className="text-xs mt-2 text-text-secondary">
              Se o profile é null, execute a migration 000005_fix_admin_profile.sql no Supabase
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
