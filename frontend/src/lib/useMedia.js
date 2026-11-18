import { useEffect, useState } from 'react'

/** true mientras la media query se cumple (se actualiza al girar o cambiar el tamaño). */
export function useMedia(query) {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const m = window.matchMedia(query)
    const on = () => setMatch(m.matches)
    on()
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [query])
  return match
}

/** Escritorio = 1024 px o más (mismo corte que `lg` de Tailwind). */
export const useIsDesktop = () => useMedia('(min-width: 1024px)')
