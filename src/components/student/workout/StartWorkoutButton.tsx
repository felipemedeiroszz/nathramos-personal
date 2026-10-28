"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { startWorkoutSessionAction } from "@/app/actions/workouts"
export function StartWorkoutButton({ dayId, programId }: { dayId: string; programId: string }) {
 const [busy,setBusy]=useState(false); const [error,setError]=useState(""); const router=useRouter()
 return <div className="space-y-3"><Button disabled={busy} onClick={async () => { setBusy(true);setError("");try { const result=await startWorkoutSessionAction({ dayId,programId }); if(result.success) router.refresh(); else setError(result.message) } catch { setError("Não foi possível iniciar o treino. Tente novamente.") } finally { setBusy(false) } }}>Iniciar treino</Button><p role="status" className="text-sm text-text-secondary">{error}</p></div>
}
