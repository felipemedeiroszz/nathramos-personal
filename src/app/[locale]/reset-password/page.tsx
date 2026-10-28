"use client"
import { useState } from "react"
import Link from "next/link"
import { resetPasswordAction } from "@/app/actions/auth"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
export default function ResetPassword({ params: { locale } }: { params: { locale: string } }) {
 const [busy,setBusy] = useState(false)
 const [result,setResult] = useState<{ success: boolean; message: string } | null>(null)
 return <main className="min-h-dvh grid place-items-center px-4"><form className="bg-surface border border-border rounded-xl p-6 max-w-md w-full space-y-5" onSubmit={async e => { e.preventDefault(); const form = new FormData(e.currentTarget); setBusy(true); try { setResult(await resetPasswordAction(form)) } catch { setResult({ success: false, message: 'Não foi possível atualizar a senha. Tente novamente.' }) } finally { setBusy(false) } }}><h1 className="text-2xl font-bold">Redefinir senha</h1>{!result?.success && <><label className="block">Nova senha<Input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></label><label className="block">Confirmar senha<Input name="confirm" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></label><Button type="submit" disabled={busy}>Salvar nova senha</Button></>}<p role="status">{result?.message}</p><Link className="block text-primary underline" href={`/${locale}/login`}>Voltar para o login</Link></form></main>
}
