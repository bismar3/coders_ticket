/**
 * Fondo global: luces suaves estáticas + rejilla. Sin animaciones ni filtros de desenfoque
 * (los gradientes radiales ya son suaves y no cuestan rendimiento).
 */
export default function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_15%_0%,rgba(59,130,246,0.13),transparent_70%),radial-gradient(50%_40%_at_90%_15%,rgba(34,211,238,0.08),transparent_70%),radial-gradient(60%_50%_at_50%_110%,rgba(59,130,246,0.08),transparent_70%)]" />
      <div className="absolute inset-0 bg-grid opacity-40 mask-radial" />
    </div>
  )
}
