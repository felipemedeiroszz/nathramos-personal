"use client"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
export default function StudentError({ reset }: { error: Error; reset: () => void }) {
 return <div className="rounded-xl border border-border bg-surface p-6 space-y-4" role="alert"><h2 className="text-xl font-bold">Não foi possível carregar seu acompanhamento</h2><p>Seus dados não foram substituídos por valores de exemplo. Tente novamente ou confira sua conta.</p><Button onClick={reset}>Tentar novamente</Button><Link className="block underline" href="/account">Minha conta</Link></div>
}
