import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { toast } from 'sonner'
import { ArrowLeft, ImagePlus, Plus, Save, Send, Settings2, Trash2 } from 'lucide-react'
import EventCard from '../../components/events/EventCard'
import { AdminHeader, Panel } from '../../components/admin/AdminUI'
import { Button, Field, PageLoader, StatusBadge } from '../../components/ui/ui'
import { iconFor, useCategories } from '../../lib/categories'
import { eventsApi } from '../../lib/api'
import { fromLocalInput, money, toLocalInput } from '../../lib/format'

const emptyEvent = (category) => ({
  title: '', subtitle: '', category, description: '', venue: '', city: 'Santa Cruz', image_url: '',
  starts_at: toLocalInput(new Date(Date.now() + 14 * 86_400_000)).slice(0, 11) + '20:00',
  sectors: [{ name: 'General', price: 100, capacity: 500 }, { name: 'VIP', price: 300, capacity: 100 }],
})

export default function EventEditor() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const categories = useCategories()
  const [form, setForm] = useState(null)
  const [status, setStatus] = useState('borrador')
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(null)
  const fileInput = useRef(null)

  useEffect(() => {
    if (isNew) {
      if (categories.length && !form) setForm(emptyEvent(categories[0].slug))
      return
    }
    eventsApi.get(id).then((e) => {
      setStatus(e.status)
      setForm({
        title: e.title, subtitle: e.subtitle, category: e.category, description: e.description, venue: e.venue, city: e.city,
        image_url: e.image_url, starts_at: toLocalInput(e.starts_at),
        sectors: e.sectors.map(({ id: sid, name, price, capacity, sold }) => ({ id: sid, name, price, capacity, sold })),
      })
    }).catch((err) => { toast.error(err.message); navigate('/organizador/eventos') })
  }, [id, isNew, navigate, categories.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const localPreview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => localPreview && URL.revokeObjectURL(localPreview), [localPreview])

  if (!form) return <PageLoader label="preparando el editor" />

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const setSector = (i, key, value) => setForm((f) => ({ ...f, sectors: f.sectors.map((s, j) => (j === i ? { ...s, [key]: value } : s)) }))
  const capacity = form.sectors.reduce((a, s) => a + (Number(s.capacity) || 0), 0)
  const potential = form.sectors.reduce((a, s) => a + (Number(s.capacity) || 0) * (Number(s.price) || 0), 0)

  const preview = {
    id: 'preview', ...form, image_url: localPreview || form.image_url, starts_at: fromLocalInput(form.starts_at),
    min_price: Math.min(...form.sectors.map((s) => Number(s.price) || 0)),
    capacity, available: form.sectors.reduce((a, s) => a + (Number(s.capacity) || 0) - (s.sold ?? 0), 0),
  }

  const save = async (publish) => {
    setSaving(publish ? 'publish' : 'draft')
    try {
      const payload = {
        ...form,
        starts_at: fromLocalInput(form.starts_at),
        sectors: form.sectors.map(({ id: sid, name, price, capacity: cap }) => ({ id: sid, name, price: Number(price), capacity: Number(cap) })),
      }
      let event = isNew ? await eventsApi.create(payload) : await eventsApi.update(id, payload)
      if (file) event = await eventsApi.uploadImage(event.id, file)
      if (publish && event.status !== 'publicado') event = await eventsApi.setStatus(event.id, 'publicado')
      toast.success(publish ? '¡Publicado! Ya aparece en la cartelera' : 'Cambios guardados')
      navigate('/organizador/eventos')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="space-y-6">
      <Link to="/organizador/eventos" className="inline-flex items-center gap-2 text-sm font-semibold text-mute hover:text-white"><ArrowLeft className="size-4" /> Volver a eventos</Link>
      <AdminHeader
        eyebrow={isNew ? 'Nuevo evento' : 'Editar evento'}
        title={isNew ? 'Crea tu evento' : form.title || 'Editar evento'}
        subtitle={!isNew && <span className="inline-flex items-center gap-2">Estado actual: <StatusBadge status={status} /></span>}
        actions={<>
          <Button variant="ghost" icon={Save} loading={saving === 'draft'} onClick={() => save(false)}>{isNew ? 'Guardar borrador' : 'Guardar'}</Button>
          {status !== 'publicado' && <Button icon={Send} loading={saving === 'publish'} onClick={() => save(true)}>Guardar y publicar</Button>}
        </>}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); save(false) }}>
          <Panel title="1 · Información">
            <div className="space-y-4">
              <Field label="Nombre del evento" required value={form.title} onChange={set('title')} placeholder="Ej. Neón Fest 2026" />
              <Field label="Bajada" value={form.subtitle} onChange={set('subtitle')} placeholder="Una línea que enganche" />
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-mute">Categoría</span>
                  <Link to="/organizador/categorias" className="flex items-center gap-1 text-xs font-bold text-neon hover:underline"><Settings2 className="size-3" /> Administrar categorías</Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => {
                    const Icon = iconFor(c.icon)
                    const on = form.category === c.slug
                    return (
                      <button type="button" key={c.slug} onClick={() => setForm((f) => ({ ...f, category: c.slug }))}
                        className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-bold transition-colors ${on ? 'border-neon bg-neon text-ink-950' : 'border-line text-soft hover:border-white/20 hover:text-white'}`}>
                        <Icon className="size-4" /> {c.name}
                      </button>
                    )
                  })}
                </div>
              </div>
              <Field label="Descripción" as="textarea" value={form.description} onChange={set('description')} placeholder="Cuéntale a la gente por qué no se lo puede perder" />
            </div>
          </Panel>

          <Panel title="2 · Cuándo y dónde">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Fecha y hora (Bolivia)" type="datetime-local" required value={form.starts_at} onChange={set('starts_at')} className="[&_input]:[color-scheme:dark]" />
              <Field label="Ciudad" required value={form.city} onChange={set('city')} />
              <Field label="Lugar" required className="sm:col-span-2" value={form.venue} onChange={set('venue')} placeholder="Ej. Estadio Tahuichi Aguilera" />
            </div>
          </Panel>

          <Panel title="3 · Imagen">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[200px_1fr]">
              <button type="button" onClick={() => fileInput.current.click()} data-cursor="Subir"
                className="grid grid-cols-1 aspect-[4/3] place-items-center overflow-hidden rounded-2xl border border-dashed border-line bg-ink-850 text-mute transition hover:border-neon/50 hover:text-neon">
                {localPreview || form.image_url ? <img src={localPreview || form.image_url} alt="" className="h-full w-full object-cover" /> : <span className="flex flex-col items-center gap-2 text-sm"><ImagePlus className="size-7" /> Subir imagen</span>}
              </button>
              <div className="space-y-3">
                <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                <p className="text-sm text-mute">Sube un JPG, PNG o WEBP (máx. 5 MB) o pega la URL de una imagen.</p>
                <Field placeholder="https://…" value={form.image_url} onChange={set('image_url')} />
                {file && <p className="font-mono text-xs text-neon">{file.name} se subirá al guardar</p>}
              </div>
            </div>
          </Panel>

          <Panel title="4 · Sectores, precios y cupos" action={
            <Button type="button" size="sm" variant="ghost" icon={Plus} onClick={() => setForm((f) => ({ ...f, sectors: [...f.sectors, { name: '', price: 0, capacity: 100 }] }))}>Sector</Button>
          }>
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {form.sectors.map((s, i) => (
                  <motion.div key={s.id ?? `new-${i}`} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-[1fr_1fr_40px] items-end gap-2 rounded-2xl border border-line p-3 sm:grid-cols-[1fr_110px_110px_40px] sm:rounded-none sm:border-0 sm:p-0">
                    <Field className="col-span-3 sm:col-span-1" label="Nombre" labelClassName={i ? 'sm:hidden' : ''} required value={s.name} onChange={(e) => setSector(i, 'name', e.target.value)} placeholder="General" />
                    <Field label="Precio Bs" labelClassName={i ? 'sm:hidden' : ''} type="number" min="0" step="0.5" required value={s.price} onChange={(e) => setSector(i, 'price', e.target.value)} />
                    <Field label="Cupo" labelClassName={i ? 'sm:hidden' : ''} type="number" min={Math.max(1, s.sold ?? 0)} required value={s.capacity} onChange={(e) => setSector(i, 'capacity', e.target.value)} />
                    <button type="button" disabled={form.sectors.length === 1 || (s.sold ?? 0) > 0} title={(s.sold ?? 0) > 0 ? 'Ya tiene ventas' : 'Eliminar'}
                      onClick={() => setForm((f) => ({ ...f, sectors: f.sectors.filter((_, j) => j !== i) }))}
                      className="mb-1 grid grid-cols-1 size-10 place-items-center rounded-xl text-mute hover:bg-bad/10 hover:text-bad disabled:opacity-30">
                      <Trash2 className="size-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div className="flex flex-wrap justify-between gap-2 border-t border-line pt-3 text-sm text-mute">
                <span>Aforo total: <b className="text-white">{capacity.toLocaleString('es-BO')}</b></span>
                <span>Recaudación potencial: <b className="text-white">{money(potential)}</b></span>
              </div>
            </div>
          </Panel>
        </form>

        <aside className="xl:sticky xl:top-24 xl:self-start">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-mute">Vista previa en la cartelera</p>
          <EventCard event={preview} preview />
        </aside>
      </div>
    </div>
  )
}
