"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Copy, Droplets, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card"
import { Progress } from "@/components/ui/Progress"
import type { RoutineData, RoutineItem } from "@/services/StudentRoutineService"
import { recordHealthAction, saveHydrationAction, setRoutineItemAction, setShoppingAction, waterAction } from "@/app/actions/routine"

function useSave() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  async function save(action: () => Promise<{ success: boolean; message?: string }>) {
    setBusy(true); setMessage("")
    try {
      const result = await action()
      if (!result.success) setMessage(result.message || "Não foi possível salvar.")
      else { setMessage("Salvo."); router.refresh() }
    } catch { setMessage("Não foi possível salvar. Verifique seu acesso e tente novamente.") }
    finally { setBusy(false) }
  }
  return { busy, save, status: <p role="status" className="text-sm text-text-secondary min-h-5">{message}</p> }
}
const meals: Record<string, string> = { breakfast: "Café da manhã", morning_snack: "Lanche da manhã", lunch: "Almoço", afternoon_snack: "Lanche da tarde", dinner: "Jantar", supper: "Ceia", pre_workout: "Pré-treino", post_workout: "Pós-treino", other: "Refeição" }
export function DailyItemsClient({ items, kind, consumed, planned, readOnly = false }: { readOnly?: boolean; items: RoutineItem[]; kind: "diet" | "supplement"; consumed?: RoutineData["consumedNutrition"]; planned?: RoutineData["plannedNutrition"] }) {
  const { busy, save, status } = useSave()
  const groupFor = (i: RoutineItem) => `${i.kit} · ${kind === "diet" ? meals[i.mealType] || i.mealType : "Doses"}`
  const groups = Array.from(new Set(items.map(groupFor)))
  return <div className="space-y-5">
    {planned && consumed && <Card><CardHeader><CardTitle>Nutrição do dia</CardTitle><CardDescription>Consumo registrado / total prescrito</CardDescription></CardHeader><CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {([['calories_kcal', 'Calorias', 'kcal'], ['protein_g', 'Proteínas', 'g'], ['carbs_g', 'Carboidratos', 'g'], ['fats_g', 'Gorduras', 'g']] as const).map(([key, title, unit]) => <div key={key}><p className="text-sm text-text-secondary">{title}</p><p className="font-bold">{Math.round(consumed[key])} / {Math.round(planned[key])} {unit}</p></div>)}
      {items.some(i => !i.nutrition) && <p className="text-sm text-text-secondary col-span-full">Itens com unidades diferentes da porção cadastrada não entram no cálculo nutricional.</p>}
    </CardContent></Card>}
    {status}
    {!items.length && <Card><CardContent className="py-10 text-text-secondary">Nenhum {kind === "diet" ? "alimento" : "suplemento"} atribuído para hoje. Seu acompanhamento aparecerá após a orientação da sua treinadora.</CardContent></Card>}
    {groups.map(group => <Card key={group}><CardHeader><CardTitle>{group}</CardTitle></CardHeader><CardContent className="space-y-3">
      {items.filter(i => groupFor(i) === group).map(item => <div key={item.key} className="flex flex-wrap items-center gap-3 border-b border-border pb-3 last:border-0">
        <div className="flex-1 min-w-32"><p className="font-semibold">{item.name}</p><p className="text-sm text-text-secondary">{item.quantity} {item.unit}{item.slot && ` · ${item.slot.startsWith('dose-') ? `Dose ${item.slot.slice(5)} · horário não informado` : item.slot}`}</p>{item.notes && <p className="text-sm text-text-secondary">{item.notes}</p>}</div>
        {readOnly ? <span className="text-sm text-text-secondary">{item.done ? "Registrado" : "Pendente"}</span> : <Button disabled={busy} variant={item.done ? "secondary" : "primary"} aria-pressed={item.done} onClick={() => save(() => setRoutineItemAction({ kind, assignmentId: item.assignmentId, itemId: item.itemId, slot: item.slot, done: !item.done }))}><Check size={16} className="mr-2" />{item.done ? "Desfazer" : kind === "diet" ? "Consumido" : "Tomei"}</Button>}
      </div>)}
    </CardContent></Card>)}
  </div>
}
export function HydrationClient({ data, targetId }: { data: RoutineData; targetId?: string }) {
  const { busy, save, status } = useSave()
  const [amount, setAmount] = useState("250")
  const [goal, setGoal] = useState(String(data.waterGoal || 2000))
  const [reminders, setReminders] = useState(data.hydrationReminders)
  const [frequency, setFrequency] = useState(data.hydrationFrequency)
  const [silent, setSilent] = useState(data.hydrationSilent)
  const today = data.water.filter(w => w.logged_date === data.date)
  const dates = Array.from({ length: 7 }, (_, index) => { const d = new Date(`${data.date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - (6 - index)); return d.toISOString().slice(0, 10) })
  return <div className="space-y-5">
    <Card><CardHeader><CardTitle>Água de hoje</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-3xl font-bold">{data.waterTotal} ml <span className="text-base text-text-secondary">{data.waterGoal ? `/ ${data.waterGoal} ml` : '· meta ainda não definida'}</span></p>{data.waterGoal && <Progress value={data.waterTotal} max={data.waterGoal} />}
      {!targetId && <div className="flex flex-wrap items-end gap-3"><label className="text-sm">Quantidade (ml)<Input aria-label="Quantidade de água em ml" type="number" min="10" max="5000" value={amount} onChange={e => setAmount(e.target.value)} /></label><Button disabled={busy} onClick={() => save(() => waterAction({ operation: "add", amount: Number(amount) }))}><Droplets size={16} className="mr-2" />Registrar</Button>{today.length > 0 && <Button disabled={busy} variant="ghost" onClick={() => { if (window.confirm("Apagar todos os registros de água de hoje?")) save(() => waterAction({ operation: "reset" })) }}>Redefinir dia</Button>}</div>}
      {status}
      <div className="space-y-2">{!today.length && <p className="text-text-secondary">Nenhum consumo registrado hoje.</p>}{today.map(w => <div key={w.id} className="flex justify-between items-center text-sm"><span>{w.logged_time.slice(0, 5)} · {w.amount_ml} ml</span>{!targetId && <Button disabled={busy} variant="ghost" size="sm" aria-label={`Remover ${w.amount_ml} ml das ${w.logged_time}`} onClick={() => save(() => waterAction({ operation: "remove", id: w.id }))}><Trash2 size={16} /></Button>}</div>)}</div>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Meta e lembretes</CardTitle></CardHeader><CardContent><form className="space-y-4" onSubmit={e => { e.preventDefault(); save(() => saveHydrationAction({ goal: Number(goal), reminders, frequency, silent }, targetId)) }}>
      <label className="block text-sm">Meta diária (ml)<Input type="number" min="500" max="10000" required value={goal} onChange={e => setGoal(e.target.value)} /></label>
      <label className="flex gap-2 items-center"><input type="checkbox" checked={reminders} onChange={e => setReminders(e.target.checked)} />Lembretes de hidratação</label>
      <label className="block text-sm">Intervalo entre lembretes<select className="block bg-surface border border-border rounded-lg p-2 w-full mt-1" value={frequency} onChange={e => setFrequency(Number(e.target.value))}>{[30,45,60,90,120].map(n => <option key={n} value={n}>{n} minutos</option>)}</select></label>
      <label className="flex gap-2 items-center"><input type="checkbox" checked={silent} onChange={e => setSilent(e.target.checked)} />Silenciar entre 22h e 7h</label>
      <Button type="submit" disabled={busy}>Salvar preferências</Button>
    </form></CardContent></Card>
    <Card><CardHeader><CardTitle>Últimos 7 dias</CardTitle></CardHeader><CardContent className="space-y-3">{dates.map(date => <div key={date} className="flex justify-between"><span>{new Date(`${date}T12:00:00Z`).toLocaleDateString(data.locale || 'pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit' })}</span><span>{data.water.filter(w => w.logged_date === date).reduce((sum, w) => sum + w.amount_ml, 0)} ml</span></div>)}</CardContent></Card>
  </div>
}
export function ShoppingClient({ data }: { data: RoutineData }) {
  const { busy, save, status } = useSave()
  const [copyMessage, setCopyMessage] = useState("")
  const quantity = (item: RoutineData['shopping'][number]) => item.quantities.map(q => `${Math.round(q.quantity * 100) / 100} ${q.unit}`).join(' + ')
  return <Card><CardHeader><CardTitle>Compras da dieta atual</CardTitle><CardDescription>Quantidades para um dia da dieta atribuída. Marcações organizadas por semana.</CardDescription></CardHeader><CardContent className="space-y-4">{status}
    {!data.shopping.length && <p className="text-text-secondary">A lista será preenchida com os alimentos da sua dieta.</p>}
    {data.shopping.map(item => <label key={item.foodId} className="flex items-center gap-3 py-2 border-b border-border"><input type="checkbox" disabled={busy} checked={item.bought} onChange={e => save(() => setShoppingAction(item.foodId, e.target.checked))} /><span className={`flex-1 ${item.bought ? 'line-through text-text-secondary' : ''}`}>{item.name}</span><span>{quantity(item)}</span></label>)}
    {!!data.shopping.length && <Button variant="secondary" onClick={async () => { try { await navigator.clipboard.writeText(data.shopping.map(i => `${i.bought ? '[x]' : '[ ]'} ${i.name}: ${quantity(i)}`).join('\n')); setCopyMessage("Lista copiada.") } catch { setCopyMessage("Não foi possível copiar. Selecione os itens para copiar manualmente.") } }}><Copy size={16} className="mr-2" />Copiar lista</Button>}<p role="status">{copyMessage}</p>
  </CardContent></Card>
}
export function HealthLogClient() {
  const { busy, save, status } = useSave()
  const [weight, setWeight] = useState("")
  const [sleep, setSleep] = useState("")
  return <Card><CardHeader><CardTitle>Registrar peso e sono de hoje</CardTitle></CardHeader><CardContent><form className="space-y-4" onSubmit={e => { e.preventDefault(); save(() => recordHealthAction({ ...(weight !== '' ? { weight: Number(weight) } : {}), ...(sleep !== '' ? { sleepMinutes: Math.round(Number(sleep) * 60) } : {}) })) }}>
    <label className="block text-sm">Peso (kg)<Input type="number" min="20" max="400" step="0.01" value={weight} onChange={e => setWeight(e.target.value)} /></label>
    <label className="block text-sm">Horas dormidas<Input type="number" min="0" max="24" step="0.1" value={sleep} onChange={e => setSleep(e.target.value)} /></label>
    <Button type="submit" disabled={busy || (!weight && !sleep)}>Salvar registro</Button>{status}
  </form></CardContent></Card>
}
