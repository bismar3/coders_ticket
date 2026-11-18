import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { LayoutGroup, motion } from 'motion/react'
import { toast } from 'sonner'
import { CalendarClock, History, IdCard, KeyRound, LogOut, Mail, Phone, ShieldCheck, Ticket, UserRound } from 'lucide-react'
import Drawer from '../ui/Drawer'
import { Button, Field } from '../ui/ui'
import { ROLE_LABEL, useAuth } from '../../context/AuthContext'
import { authApi } from '../../lib/api'
import { dateTime, shortDate } from '../../lib/format'

export const initials = (name = '') => name.split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase()

function strength(pw) {
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return score
}
const STRENGTH = ['Muy débil', 'Débil', 'Aceptable', 'Buena', 'Excelente']

function ProfileForm({ profile, onSaved }) {
  const { renew } = useAuth()
  const [form, setForm] = useState({ name: profile.name, phone: profile.phone ?? '', document_id: profile.document_id ?? '' })
  const [saving, setSaving] = useState(false)
  const dirty = form.name !== profile.name || form.phone !== (profile.phone ?? '') || form.document_id !== (profile.document_id ?? '')

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await authApi.updateMe(form)
      renew(res)
      onSaved(res.user)
      toast.success('Tus datos se actualizaron')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Nombre completo" icon={UserRound} required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <Field label="Correo" icon={Mail} value={profile.email} disabled hint="El correo es tu usuario y no se puede cambiar." />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Teléfono" icon={Phone} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="70000000" />
        <Field label="Documento" icon={IdCard} value={form.document_id} onChange={(e) => setForm({ ...form, document_id: e.target.value })} placeholder="CI" />
      </div>
      <Button type="submit" className="w-full" loading={saving} disabled={!dirty}>Guardar cambios</Button>
    </form>
  )
}

function PasswordForm() {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const score = strength(form.next)
  const mismatch = form.confirm && form.next !== form.confirm

  const submit = async (e) => {
    e.preventDefault()
    if (form.next !== form.confirm) return toast.error('Las contraseñas no coinciden')
    setSaving(true)
    try {
      await authApi.changePassword(form.current, form.next)
      setForm({ current: '', next: '', confirm: '' })
      toast.success('Contraseña actualizada')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Contraseña actual" icon={KeyRound} type="password" required autoComplete="current-password" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} />
      <div>
        <Field label="Nueva contraseña" icon={KeyRound} type="password" required minLength={6} autoComplete="new-password" value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} />
        {form.next && (
          <div className="mt-2">
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((i) => <span key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < score ? 'bg-neon' : 'bg-white/10'}`} />)}
            </div>
            <p className="mt-1 text-xs text-mute">{STRENGTH[score]}</p>
          </div>
        )}
      </div>
      <Field label="Repite la nueva contraseña" icon={KeyRound} type="password" required value={form.confirm} error={mismatch ? 'No coincide' : undefined}
        onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
      <Button type="submit" className="w-full" loading={saving} disabled={!form.current || form.next.length < 6 || mismatch}>Cambiar contraseña</Button>
    </form>
  )
}

/** Perfil del usuario (cualquier rol): se abre al tocar su nombre en la barra superior. */
export default function ProfileDrawer() {
  const { user, profileOpen, closeProfile, logout } = useAuth()
  const [profile, setProfile] = useState(null)
  const [tab, setTab] = useState('datos')

  useEffect(() => {
    if (profileOpen) authApi.me().then(setProfile).catch((e) => toast.error(e.message))
    else setTab('datos')
  }, [profileOpen])

  if (!user) return null

  return (
    <Drawer open={profileOpen} onClose={closeProfile} title="Mi perfil" subtitle="Tus datos y la seguridad de tu cuenta"
      footer={<Button variant="danger" className="w-full" icon={LogOut} onClick={logout}>Cerrar sesión</Button>}>
      <div className="flex items-center gap-4">
        <span className="grid grid-cols-1 size-16 shrink-0 place-items-center rounded-2xl border border-neon/30 bg-[linear-gradient(135deg,rgba(34,211,238,0.25),rgba(59,130,246,0.15))] font-display text-xl font-bold text-white">
          {initials(user.name)}
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-bold text-white">{user.name}</p>
          <p className="truncate text-sm text-mute">{user.email}</p>
          <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-neon/25 bg-neon/5 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-neon">
            <ShieldCheck className="size-3" /> {ROLE_LABEL[user.role]}
          </span>
        </div>
      </div>

      {profile && (
        <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
          {[
            ['Miembro desde', shortDate(profile.created_at)],
            ['Último acceso', profile.last_login_at ? dateTime(profile.last_login_at) : '—'],
            ...(profile.position ? [['Cargo', profile.position]] : []),
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl border border-line bg-ink-850 px-4 py-3">
              <dt className="text-[11px] uppercase tracking-wider text-mute">{k}</dt>
              <dd className="mt-0.5 font-semibold text-white">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      {user.role === 'cliente' && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Link to="/mis-entradas" onClick={closeProfile} className="flex items-center gap-2 rounded-2xl border border-line px-4 py-3 text-sm font-semibold text-soft hover:border-neon/40 hover:text-white"><Ticket className="size-4 text-neon" /> Mis entradas</Link>
          <Link to="/mis-compras" onClick={closeProfile} className="flex items-center gap-2 rounded-2xl border border-line px-4 py-3 text-sm font-semibold text-soft hover:border-neon/40 hover:text-white"><History className="size-4 text-neon" /> Mis compras</Link>
        </div>
      )}

      <LayoutGroup id="profile-tabs">
        <div className="mt-8 grid grid-cols-2 rounded-full border border-line bg-ink-850 p-1">
          {[['datos', 'Mis datos', UserRound], ['seguridad', 'Seguridad', KeyRound]].map(([key, label, Icon]) => (
            <button key={key} onClick={() => setTab(key)} className="relative flex items-center justify-center gap-2 rounded-full py-2 text-sm font-bold">
              {tab === key && <motion.span layoutId="profile-tab" className="absolute inset-0 rounded-full bg-white/10" />}
              <Icon className={`relative size-4 ${tab === key ? 'text-neon' : 'text-mute'}`} />
              <span className={`relative ${tab === key ? 'text-white' : 'text-mute'}`}>{label}</span>
            </button>
          ))}
        </div>
      </LayoutGroup>

      <div className="mt-6">
        {tab === 'datos'
          ? (profile ? <ProfileForm key={profile.updated_at ?? profile.name} profile={profile} onSaved={setProfile} /> : <p className="text-sm text-mute">Cargando…</p>)
          : <PasswordForm />}
      </div>
      <p className="mt-6 flex items-center gap-2 text-xs text-mute"><CalendarClock className="size-3.5" /> Tus datos se guardan de forma segura y tu contraseña se almacena cifrada.</p>
    </Drawer>
  )
}
