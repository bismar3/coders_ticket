import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, Pencil, Plus, Power, Trash2 } from 'lucide-react'
import { AdminHeader, Badge } from '../../components/admin/AdminUI'
import Drawer from '../../components/ui/Drawer'
import { Button, Field, Skeleton } from '../../components/ui/ui'
import { ICONS, iconFor, loadCategories } from '../../lib/categories'
import { eventsApi } from '../../lib/api'

const EMPTY = { name: '', description: '', icon: 'sparkles', is_active: true, sort_order: 0 }

function CategoryForm({ initial, onSaved, onCancel }) {
  const [form, setForm] = useState(initial ?? EMPTY)
  const [saving, setSaving] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = { name: form.name, description: form.description, icon: form.icon, is_active: form.is_active, sort_order: form.sort_order }
      initial?.id ? await eventsApi.updateCategory(initial.id, data) : await eventsApi.createCategory(data)
      toast.success(initial?.id ? 'Categoría actualizada' : 'Categoría creada')
      onSaved()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }
  const Preview = iconFor(form.icon)
  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-center gap-4 rounded-2xl border border-line bg-ink-850 p-4">
        <span className="grid grid-cols-1 size-12 place-items-center rounded-2xl border border-neon/30 bg-neon/10 text-neon"><Preview className="size-5" /></span>
        <div><p className="font-bold text-white">{form.name || 'Nombre de la categoría'}</p><p className="text-sm text-mute">{form.description || 'Descripción corta'}</p></div>
      </div>
      <Field label="Nombre" required minLength={2} maxLength={60} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. Stand-up" />
      <Field label="Descripción" maxLength={160} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Se muestra en la portada" />
      <div>
        <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-mute">Ícono</span>
        <div className="grid grid-cols-8 gap-1.5">
          {Object.entries(ICONS).map(([key, Icon]) => (
            <button type="button" key={key} title={key} onClick={() => setForm({ ...form, icon: key })}
              className={`grid aspect-square place-items-center rounded-xl border transition-colors ${form.icon === key ? 'border-neon bg-neon/15 text-neon' : 'border-line text-mute hover:text-white'}`}>
              <Icon className="size-4" />
            </button>
          ))}
        </div>
      </div>
      <label className="flex items-center justify-between rounded-2xl border border-line px-4 py-3">
        <span><span className="block text-sm font-bold text-white">Activa</span><span className="text-xs text-mute">Las inactivas no aparecen en la web ni al crear eventos.</span></span>
        <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="size-5 accent-[#22d3ee]" />
      </label>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" className="flex-1" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" className="flex-1" loading={saving}>Guardar</Button>
      </div>
    </form>
  )
}

export default function CategoriesAdmin() {
  const [list, setList] = useState(null)
  const [editing, setEditing] = useState(null) // null | {} (nueva) | categoría

  const load = () => loadCategories({ all: true }).then(setList).catch((e) => toast.error(e.message))
  useEffect(() => { load() }, [])
  const refreshAll = () => { load(); loadCategories({ force: true }) }

  const update = async (c, patch) => {
    try {
      await eventsApi.updateCategory(c.id, { name: c.name, description: c.description, icon: c.icon, is_active: c.is_active, sort_order: c.sort_order, ...patch })
      refreshAll()
    } catch (e) { toast.error(e.message) }
  }
  const move = async (index, dir) => {
    const a = list[index]
    const b = list[index + dir]
    if (!b) return
    await Promise.all([
      eventsApi.updateCategory(a.id, { ...a, sort_order: index + dir }),
      eventsApi.updateCategory(b.id, { ...b, sort_order: index }),
    ]).catch((e) => toast.error(e.message))
    refreshAll()
  }
  const remove = async (c) => {
    if (!window.confirm(`¿Eliminar la categoría "${c.name}"?`)) return
    try {
      await eventsApi.deleteCategory(c.id)
      toast.success('Categoría eliminada')
      refreshAll()
    } catch (e) { toast.error(e.message) }
  }

  return (
    <div className="space-y-5">
      <AdminHeader eyebrow="Gestión" title="Categorías" subtitle="Los tipos de evento que ven tus clientes. Agrega los que necesites sin tocar código."
        actions={<Button icon={Plus} onClick={() => setEditing({})}>Nueva categoría</Button>} />

      {!list ? <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div> : (
        <ul className="space-y-2">
          {list.map((c, i) => {
            const Icon = iconFor(c.icon)
            return (
              <li key={c.id} className={`flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-ink-900/70 p-3 sm:flex-nowrap sm:gap-4 ${c.is_active ? '' : 'opacity-55'}`}>
                <div className="flex flex-col">
                  <button disabled={i === 0} onClick={() => move(i, -1)} className="grid grid-cols-1 size-6 place-items-center text-mute hover:text-white disabled:opacity-20" aria-label="Subir"><ArrowUp className="size-3.5" /></button>
                  <button disabled={i === list.length - 1} onClick={() => move(i, 1)} className="grid grid-cols-1 size-6 place-items-center text-mute hover:text-white disabled:opacity-20" aria-label="Bajar"><ArrowDown className="size-3.5" /></button>
                </div>
                <span className="grid grid-cols-1 size-11 shrink-0 place-items-center rounded-xl border border-neon/25 bg-neon/5 text-neon"><Icon className="size-5" /></span>
                <div className="min-w-0 flex-1 basis-40">
                  <p className="flex items-center gap-2 font-bold text-white">{c.name} {!c.is_active && <Badge>Inactiva</Badge>}</p>
                  <p className="truncate text-sm text-mute">{c.description || 'Sin descripción'} · <span className="font-mono text-xs">/{c.slug}</span></p>
                </div>
                <span className="hidden font-mono text-xs text-soft sm:block">{c.events_count} eventos</span>
                <div className="ml-auto flex gap-1.5">
                  <button onClick={() => update(c, { is_active: !c.is_active })} title={c.is_active ? 'Desactivar' : 'Activar'} className={`grid size-9 place-items-center rounded-full border ${c.is_active ? 'border-ok/30 text-ok' : 'border-line text-mute'} hover:bg-white/5`}><Power className="size-4" /></button>
                  <button onClick={() => setEditing(c)} title="Editar" className="grid grid-cols-1 size-9 place-items-center rounded-full border border-line text-soft hover:text-white"><Pencil className="size-4" /></button>
                  <button onClick={() => remove(c)} disabled={c.events_count > 0} title={c.events_count ? 'Tiene eventos: desactívala' : 'Eliminar'} className="grid grid-cols-1 size-9 place-items-center rounded-full border border-line text-soft hover:border-bad/40 hover:text-bad disabled:opacity-30"><Trash2 className="size-4" /></button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <Drawer open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Editar categoría' : 'Nueva categoría'} subtitle="Nombre, ícono y visibilidad">
        {editing && <CategoryForm key={editing.id ?? 'new'} initial={editing.id ? editing : { ...EMPTY, sort_order: list?.length ?? 0 }} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); refreshAll() }} />}
      </Drawer>
    </div>
  )
}
