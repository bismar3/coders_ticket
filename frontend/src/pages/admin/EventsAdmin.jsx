import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { Ban, Eye, LayoutList, Pencil, Plus, Rows3, Send, ShoppingBag, SlidersHorizontal, Undo2 } from 'lucide-react'
import { AdminHeader, Pagination, SearchBox, Select, Tabs } from '../../components/admin/AdminUI'
import { Button, EmptyState, Skeleton, StatusBadge } from '../../components/ui/ui'
import { EventArt } from '../../components/events/EventCard'
import { categoryMeta, useCategories } from '../../lib/categories'
import { eventsApi } from '../../lib/api'
import { money, shortDate, time } from '../../lib/format'

const SIZE = 12

function EventRow({ event, onStatus }) {
  const categories = useCategories()
  const cat = categoryMeta(event.category, categories)
  const sold = event.capacity - event.available
  const revenue = event.sectors.reduce((a, s) => a + s.sold * s.price, 0)
  const past = new Date(event.starts_at) < new Date()
  return (
    <li className="group flex flex-col gap-4 rounded-2xl border border-line bg-ink-900/70 p-3 transition-colors hover:border-white/15 md:flex-row md:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="size-14 shrink-0 overflow-hidden rounded-xl"><EventArt event={event} /></div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Link to={`/organizador/eventos/${event.id}`} className="truncate font-bold text-white hover:text-neon">{event.title}</Link>
            {past && <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase text-mute">Finalizado</span>}
          </div>
          <p className="truncate text-xs text-mute">
            <cat.icon className="mr-1 inline size-3 text-neon" />{cat.name} · {shortDate(event.starts_at)} {time(event.starts_at)} · {event.venue}, {event.city}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 text-xs md:w-[360px]">
        <div>
          <p className="text-mute">Vendidas</p>
          <p className="font-bold text-white">{sold.toLocaleString('es-BO')}<span className="font-normal text-mute"> / {event.capacity.toLocaleString('es-BO')}</span></p>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/5"><div className="h-full bg-neon/80" style={{ width: `${(sold / event.capacity) * 100}%` }} /></div>
        </div>
        <div><p className="text-mute">Ingresos</p><p className="font-bold text-white">{money(revenue)}</p></div>
        <div><p className="text-mute">Estado</p><StatusBadge status={event.status} /></div>
      </div>
      <div className="flex items-center gap-1.5">
        <Link to={`/organizador/eventos/${event.id}`} title="Editar" className="grid grid-cols-1 size-9 place-items-center rounded-full border border-line text-soft hover:border-neon/40 hover:text-white"><Pencil className="size-4" /></Link>
        <Link to={`/organizador/ventas?event=${event.id}`} title="Ventas" className="grid grid-cols-1 size-9 place-items-center rounded-full border border-line text-soft hover:border-neon/40 hover:text-white"><ShoppingBag className="size-4" /></Link>
        {event.status === 'publicado' && <a href={`/eventos/${event.id}`} target="_blank" rel="noreferrer" title="Ver publicado" className="grid grid-cols-1 size-9 place-items-center rounded-full border border-line text-soft hover:border-neon/40 hover:text-white"><Eye className="size-4" /></a>}
        {event.status === 'borrador' && <button onClick={() => onStatus(event, 'publicado')} title="Publicar" className="grid grid-cols-1 size-9 place-items-center rounded-full border border-ok/30 text-ok hover:bg-ok/10"><Send className="size-4" /></button>}
        {event.status === 'publicado' && <button onClick={() => onStatus(event, 'borrador')} title="Pasar a borrador" className="grid grid-cols-1 size-9 place-items-center rounded-full border border-line text-soft hover:text-white"><Undo2 className="size-4" /></button>}
        {event.status !== 'cancelado' && <button onClick={() => onStatus(event, 'cancelado')} title="Cancelar evento" className="grid grid-cols-1 size-9 place-items-center rounded-full border border-line text-soft hover:border-bad/40 hover:text-bad"><Ban className="size-4" /></button>}
      </div>
    </li>
  )
}

export default function EventsAdmin() {
  const categories = useCategories()
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState(null)
  const [grouped, setGrouped] = useState(() => { try { return localStorage.getItem('coderstick.admin.grouped') === '1' } catch { return false } })

  const filters = {
    q: params.get('q') ?? '',
    category: params.get('category') ?? '',
    status: params.get('status') ?? '',
    when: params.get('when') ?? '',
    date_from: params.get('from') ?? '',
    date_to: params.get('to') ?? '',
    sort: params.get('sort') ?? 'date_asc',
    page: Number(params.get('page') ?? 1),
  }
  const set = (key, value) => {
    const next = new URLSearchParams(params)
    value ? next.set(key, value) : next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next, { replace: true })
  }

  const load = useCallback(() => {
    eventsApi.mine({
      q: filters.q, category: filters.category, status: filters.status, when: filters.when, sort: filters.sort,
      date_from: filters.date_from ? `${filters.date_from}T00:00:00-04:00` : '',
      date_to: filters.date_to ? `${filters.date_to}T23:59:59-04:00` : '',
      page: filters.page, size: grouped ? 100 : SIZE,
    }).then(setData).catch((e) => toast.error(e.message))
  }, [params.toString(), grouped]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const changeStatus = async (event, status) => {
    if (status === 'cancelado' && !window.confirm(`¿Cancelar "${event.title}"? Dejará de venderse.`)) return
    try {
      await eventsApi.setStatus(event.id, status)
      toast.success({ publicado: 'Evento publicado', borrador: 'Evento pasado a borrador', cancelado: 'Evento cancelado' }[status])
      load()
    } catch (e) {
      toast.error(e.message)
    }
  }

  const groups = useMemo(() => {
    if (!data || !grouped) return null
    const map = new Map()
    for (const e of data.items) {
      if (!map.has(e.category)) map.set(e.category, [])
      map.get(e.category).push(e)
    }
    return [...map.entries()]
  }, [data, grouped])

  const toggleGrouped = () => {
    setGrouped((g) => { try { localStorage.setItem('coderstick.admin.grouped', g ? '0' : '1') } catch { /* sin almacenamiento */ } return !g })
  }
  const counts = data?.counts ?? {}
  const anyFilter = filters.q || filters.category || filters.when || filters.date_from || filters.date_to
  // En celular los filtros avanzados se pliegan detrás de un botón (con cuántos hay activos)
  const advanced = [filters.category, filters.when, filters.date_from, filters.date_to].filter(Boolean).length
  const [showFilters, setShowFilters] = useState(false)

  return (
    <div className="space-y-5">
      <AdminHeader eyebrow="Gestión" title="Eventos" subtitle="Busca, filtra y administra todos tus eventos."
        actions={<Button to="/organizador/eventos/nuevo" icon={Plus}>Nuevo evento</Button>} />

      <div className="flex flex-col gap-3 rounded-3xl border border-line bg-ink-900/50 p-3">
        <div className="flex flex-col gap-2 lg:flex-row">
          <div className="flex gap-2 lg:flex-1">
            <SearchBox className="min-w-0 flex-1" value={filters.q} onChange={(v) => set('q', v)} placeholder="Buscar evento o lugar…" />
            <button onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}
              className={`flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-bold sm:hidden ${showFilters || advanced ? 'border-neon/40 bg-neon/10 text-white' : 'border-line text-soft'}`}>
              <SlidersHorizontal className="size-4" /> Filtros{advanced ? ` (${advanced})` : ''}
            </button>
          </div>
          <div className={`${showFilters ? 'grid' : 'hidden'} grid-cols-1 gap-2 sm:grid sm:grid-cols-3 lg:flex`}>
          <Select value={filters.category} onChange={(v) => set('category', v)}>
            <option value="">Todas las categorías</option>
            {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </Select>
          <Select value={filters.when} onChange={(v) => set('when', v)}>
            <option value="">Cualquier fecha</option>
            <option value="upcoming">Próximos</option>
            <option value="past">Finalizados</option>
          </Select>
          <Select value={filters.sort} onChange={(v) => set('sort', v)}>
            <option value="date_asc">Fecha (próximos primero)</option>
            <option value="date_desc">Fecha (recientes primero)</option>
            <option value="created_desc">Creados recientemente</option>
            <option value="title">Nombre (A-Z)</option>
          </Select>
          </div>
        </div>
        <div className={`${showFilters ? 'flex' : 'hidden'} flex-wrap items-center gap-2 sm:flex`}>
          <label className="flex items-center gap-2 text-xs text-mute">Desde
            <input type="date" value={filters.date_from} onChange={(e) => set('from', e.target.value)} className="h-9 rounded-full border border-line bg-ink-900/70 px-3 text-sm text-white outline-none focus:border-neon/60 [color-scheme:dark]" />
          </label>
          <label className="flex items-center gap-2 text-xs text-mute">Hasta
            <input type="date" value={filters.date_to} onChange={(e) => set('to', e.target.value)} className="h-9 rounded-full border border-line bg-ink-900/70 px-3 text-sm text-white outline-none focus:border-neon/60 [color-scheme:dark]" />
          </label>
          {anyFilter && <button onClick={() => setParams({}, { replace: true })} className="text-xs font-bold text-neon hover:underline">Limpiar filtros</button>}
          <button onClick={toggleGrouped} className={`ml-auto flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${grouped ? 'border-neon/40 bg-neon/10 text-white' : 'border-line text-mute hover:text-white'}`}>
            {grouped ? <Rows3 className="size-4" /> : <LayoutList className="size-4" />} {grouped ? 'Agrupado por categoría' : 'Agrupar por categoría'}
          </button>
        </div>
      </div>

      <Tabs value={filters.status} onChange={(v) => set('status', v)} items={[
        { key: '', label: 'Todos', count: counts.todos ?? 0 },
        { key: 'publicado', label: 'Publicados', count: counts.publicado ?? 0 },
        { key: 'borrador', label: 'Borradores', count: counts.borrador ?? 0 },
        { key: 'cancelado', label: 'Cancelados', count: counts.cancelado ?? 0 },
      ]} />

      {!data ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : data.items.length === 0 ? (
        <EmptyState pose="pensando" title="No encontramos eventos" description={anyFilter || filters.status ? 'Prueba con otros filtros.' : 'Crea tu primer evento para empezar a vender.'}
          action={!anyFilter && <Button to="/organizador/eventos/nuevo" icon={Plus}>Crear evento</Button>} />
      ) : groups ? (
        <div className="space-y-8">
          {groups.map(([slug, list]) => {
            const cat = categoryMeta(slug, categories)
            return (
              <section key={slug}>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-soft">
                  <cat.icon className="size-4 text-neon" /> {cat.name} <span className="font-mono text-xs text-mute">({list.length})</span>
                </h2>
                <ul className="space-y-2">{list.map((e) => <EventRow key={e.id} event={e} onStatus={changeStatus} />)}</ul>
              </section>
            )
          })}
        </div>
      ) : (
        <>
          <ul className="space-y-2">{data.items.map((e) => <EventRow key={e.id} event={e} onStatus={changeStatus} />)}</ul>
          <Pagination page={data.page} size={data.size} total={data.total} onPage={(p) => set('page', String(p))} />
        </>
      )}
    </div>
  )
}
