import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

/**
 * La mascota de CODERS acompaña toda la web: cualquier pantalla puede hacerla hablar o cambiar de ánimo.
 * moods: idle | happy | surprised | angry | sad | thinking | sleepy | wink
 */
const MascotContext = createContext(null)

export function MascotProvider({ children }) {
  const [state, setState] = useState({ mood: 'idle', message: null, key: 0 })
  const timer = useRef()

  const say = useCallback((message, mood = 'idle', duration = 4200) => {
    clearTimeout(timer.current)
    setState((s) => ({ mood, message, key: s.key + 1 }))
    if (duration) {
      timer.current = setTimeout(() => setState((s) => ({ ...s, mood: 'idle', message: null })), duration)
    }
  }, [])

  const setMood = useCallback((mood) => setState((s) => ({ ...s, mood })), [])
  const hush = useCallback(() => setState((s) => ({ ...s, message: null })), [])

  const value = useMemo(() => ({ ...state, say, setMood, hush }), [state, say, setMood, hush])
  return <MascotContext.Provider value={value}>{children}</MascotContext.Provider>
}

export const useMascot = () => useContext(MascotContext)
