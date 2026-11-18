import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Briefcase, IdCard, KeyRound, Mail, Pencil, Phone, Power, ScanLine, ShieldCheck, UserPlus, UserRound } from 'lucide-react'
import { AdminHeader, Badge, SearchBox, Select, Table, Tabs } from '../../components/admin/AdminUI'
import Drawer from '../../components/ui/Drawer'
import { Button, Field, Skeleton } from '../../components/ui/ui'
import { initials } from '../../components/layout/ProfileDrawer'
import { useAuth } from '../../context/AuthContext'
import { authApi } from '../../lib/api'
import { dateTime } from '../../lib/format'

const ROLES = {
  portero: { label: 'Portero', icon: ScanLine, text: 'Valida entradas en la puerta. Solo ve el control de acceso.' },
  organizador: { label: 'Organizador', icon: ShieldCheck, text: 'Administrador con acceso total: eventos, ventas, categorías y personal.' },
}

function NewStaffForm({ defaultRole, onSaved, onCancel }) {
  const [form, setForm] = useState({ role: defaultRole, name: '', email: '', password: '', phone: '', document_id: '', position: '' })
  const [confirm, setConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const isOrg = form.role === 'organizador'
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const created = await authApi.createStaff({ ...form, phone: form.phone || null, document_id: form.document_id || null, position: form.position || null })
      toast.success(`Cuenta creada para ${created.name}`)
      onSaved()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(ROLES).map(([key, r]) => (
          <button type="button" key={key} onClick={() => setForm({ ...form, role: key })}
            className={`rounded-2xl border p-4 text-left transition-colors ${form.role === key ? 'border-neon bg-neon/10' : 'border-line hover:border-white/20'}`}>
            <r.icon className={`size-5 ${form.role === key ? 'text-neon' : 'text-mute'}`} />
            <p className="mt-2 font-bold text-white">{r.label}</p>
            <p className="mt-0.5 text-xs text-mute">{r.text}</p>
          </button>
        ))}
      </div>

      <fieldset className="space-y-3">
        <legend className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-mute">Datos personales</legend>
        <Field icon={UserRound} placeholder="Nombre completo" required minLength={2} value={form.name} onChange={set('name')} />
        <div className="grid grid-cols-2 gap-2">
          <Field icon={Phone} placeholder={isOrg ? 'Teléfono *' : 'Teléfono'} required={isOrg} value={form.phone} onChange={set('phone')} />
          <Field icon={IdCard} placeholder={isOrg ? 'CI / documento *' : 'CI / documento'} required={isOrg} value={form.document_id} onChange={set('document_id')} />
        </div>
        <Field icon={Briefcase} placeholder={isOrg ? 'Cargo (ej. Gerente de eventos)' : 'Puerta asignada (ej. Puerta norte)'} value={form.position} onChange={set('position')} />
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-mute">Acceso</legend>
        <Field icon={Mail} type="email" placeholder="correo@ejemplo.com" required value={form.email} onChange={set('email')} />
        <Field icon={KeyRound} type="password" placeholder="Contraseña inicial (mín. 6)" minLength={6} required value={form.password} onChange={set('password')}
          hint="La persona podrá cambiarla desde su perfil." />
      </fieldset>

      {isOrg && (
        <label className="flex items-start gap-3 rounded-2xl border border-warn/30 bg-warn/5 p-4 text-sm text-warn">
          <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="mt-0.5 size-4 accent-[#fbbf24]" />
          Entiendo que esta persona tendrá acceso total al panel de administración.
        </label>
      )}

      <div className="flex gap-2">
        <Button type="button" variant="ghost" className="flex-1" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" className="flex-1" loading={saving} disabled={isOrg && !confirm} icon={UserPlus}>Crear cuenta</Button>
      </div>
    </form>
  )
}

function EditStaffForm({ person, onSaved, onCancel }) {
  const [form, setForm] = useState({ name: person.name, phone: person.phone ?? '', document_id: person.document_id ?? '', position: person.position ?? '', new_password: '' })
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await authApi.updateStaff(person.id, { ...form, new_password: form.new_password || null })
      toast.success('Datos actualizados')
      onSaved()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-ink-850 p-4">
        <span className="grid grid-cols-1 size-11 place-items-center rounded-xl border border-neon/30 bg-neon/10 font-display text-sm font-bold text-white">{initials(person.name)}</span>
        <div><p className="font-bold text-white">{person.email}</p><p className="text-xs text-mute">{ROLES[person.role].label}</p></div>
      </div>
      <Field label="Nombre" icon={UserRound} required value={form.name} onChange={set('name')} />
      <div className="grid grid-cols-2 gap-2">
        <Field label="Teléfono" icon={Phone} value={form.phone} onChange={set('phone')} />
        <Field label="Documento" icon={IdCard} value={form.document_id} onChange={set('document_id')} />
      </div>
      <Field label={person.role === 'portero' ? 'Puerta asignada' : 'Cargo'} icon={Briefcase} value={form.position} onChange={set('position')} />
      <Field label="Restablecer contraseña" icon={KeyRound} type="password" minLength={6} placeholder="Déjalo vacío para no cambiarla" value={form.new_password} onChange={set('new_password')} />
      <div className="flex gap-2">
        <Button type="button" variant="ghost" className="flex-1" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" className="flex-1" loading={saving}>Guardar</Button>
      </div>
    </form>
  )
}

export default function StaffAdmin() {
  const { user } = useAuth()
  const [role, setRole] = useState('portero')
  const [q, setQ] = useState('')
  const [active, setActive] = useState('')
  const [data, setData] = useState(null)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(null)

  const load = useCallback(() => {
    authApi.staff({ role, q, active }).then(setData).catch((e) => toast.error(e.message))
  }, [role, q, active])
  useEffect(() => { load() }, [load])

  const toggle = async (p) => {
    try {
      await authApi.updateStaff(p.id, { is_active: !p.is_active })
      toast.success(p.is_active ? `${p.name} ya no puede ingresar` : `${p.name} puede ingresar de nuevo`)
      load()
    } catch (e) { toast.error(e.message) }
  }

  const counts = data?.counts ?? {}
  return (
    <div className="space-y-5">
      <AdminHeader eyebrow="Operación" title="Personal" subtitle={`Tu equipo de trabajo. Clientes registrados en la plataforma: ${counts.clientes ?? 0}.`}
        actions={<Button icon={UserPlus} onClick={() => setCreating(true)}>Nuevo miembro</Button>} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Tabs value={role} onChange={setRole} items={[
          { key: 'portero', label: 'Porteros', count: counts.portero ?? 0 },
          { key: 'organizador', label: 'Administradores', count: counts.organizador ?? 0 },
        ]} />
        <SearchBox className="flex-1" value={q} onChange={setQ} placeholder="Buscar nombre, correo o CI…" />
        <Select value={active} onChange={setActive}>
          <option value="">Todos los estados</option>
          <option value="true">Activos</option>
          <option value="false">Desactivados</option>
        </Select>
      </div>

      {!data ? <Skeleton className="h-72" /> : (
        <>
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:hidden">
          {data.items.map((p) => (
            <li key={p.id} className={`rounded-2xl border border-line bg-ink-900/70 p-4 ${p.is_active ? '' : 'opacity-60'}`}>
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-ink-850 font-display text-[11px] font-bold text-white">{initials(p.name)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">{p.name}{p.id === user.id && <span className="ml-2 text-[10px] font-bold text-neon">TÚ</span>}</p>
                  <p className="truncate text-xs text-mute">{p.email}</p>
                </div>
                {p.is_active ? <Badge tone="ok">Activo</Badge> : <Badge>Inactivo</Badge>}
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <dt className="text-mute">Teléfono</dt><dd className="text-right text-soft">{p.phone ?? '—'}</dd>
                <dt className="text-mute">Documento</dt><dd className="text-right font-mono text-soft">{p.document_id ?? '—'}</dd>
                <dt className="text-mute">{role === 'portero' ? 'Puerta' : 'Cargo'}</dt><dd className="truncate text-right text-soft">{p.position ?? '—'}</dd>
                <dt className="text-mute">Último acceso</dt><dd className="text-right text-soft">{p.last_login_at ? dateTime(p.last_login_at) : 'Nunca'}</dd>
              </dl>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="ghost" icon={Pencil} className="flex-1" onClick={() => setEditing(p)}>Editar</Button>
                {p.id !== user.id && <Button size="sm" variant={p.is_active ? 'danger' : 'success'} icon={Power} className="flex-1" onClick={() => toggle(p)}>{p.is_active ? 'Desactivar' : 'Activar'}</Button>}
              </div>
            </li>
          ))}
          {data.items.length === 0 && <li className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-mute">No hay personas con estos filtros.</li>}
        </ul>
        <div className="hidden xl:block">
        <Table head={['Persona', 'Contacto', 'Documento', role === 'portero' ? 'Puerta' : 'Cargo', 'Último acceso', 'Estado', '']}
          empty={data.items.length === 0 && <p className="p-8 text-center text-sm text-mute">No hay personas con estos filtros.</p>}>
          {data.items.map((p) => (
            <tr key={p.id} className={`hover:bg-white/[0.02] ${p.is_active ? '' : 'opacity-60'}`}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="grid grid-cols-1 size-9 shrink-0 place-items-center rounded-xl border border-line bg-ink-850 font-display text-[11px] font-bold text-white">{initials(p.name)}</span>
                  <div><p className="font-semibold text-white">{p.name}{p.id === user.id && <span className="ml-2 text-[10px] font-bold text-neon">TÚ</span>}</p><p className="text-xs text-mute">{p.email}</p></div>
                </div>
              </td>
              <td className="px-4 py-3 text-soft">{p.phone ?? '—'}</td>
              <td className="px-4 py-3 font-mono text-xs text-soft">{p.document_id ?? '—'}</td>
              <td className="px-4 py-3 text-soft">{p.position ?? '—'}</td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-mute">{p.last_login_at ? dateTime(p.last_login_at) : 'Nunca'}</td>
              <td className="px-4 py-3">{p.is_active ? <Badge tone="ok">Activo</Badge> : <Badge>Desactivado</Badge>}</td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-1.5">
                  <button onClick={() => setEditing(p)} title="Editar" className="grid grid-cols-1 size-8 place-items-center rounded-full border border-line text-soft hover:text-white"><Pencil className="size-3.5" /></button>
                  {p.id !== user.id && (
                    <button onClick={() => toggle(p)} title={p.is_active ? 'Desactivar' : 'Activar'} className={`grid size-8 place-items-center rounded-full border ${p.is_active ? 'border-line text-soft hover:border-bad/40 hover:text-bad' : 'border-ok/30 text-ok'}`}><Power className="size-3.5" /></button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </Table>
        </div>
        </>
      )}

      <Drawer open={creating} onClose={() => setCreating(false)} title="Nuevo miembro del equipo" subtitle="Elige el rol y completa sus datos" width="max-w-lg">
        {creating && <NewStaffForm defaultRole={role} onCancel={() => setCreating(false)} onSaved={() => { setCreating(false); load() }} />}
      </Drawer>
      <Drawer open={!!editing} onClose={() => setEditing(null)} title="Editar miembro" subtitle={editing?.name}>
        {editing && <EditStaffForm key={editing.id} person={editing} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
      </Drawer>
    </div>
  )
}
