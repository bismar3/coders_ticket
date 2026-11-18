import { useEffect, useState } from 'react'
import {
  Baby, Bike, BookOpen, Camera, Church, Clapperboard, Drama, Dumbbell, Film, Flame, Gamepad2, Globe, GraduationCap,
  Guitar, Heart, Laptop, Leaf, Mic, Music, Palette, PartyPopper, Plane, Presentation, Sparkles, Star, Store, Tent,
  Ticket, Trophy, Utensils, Wine,
} from 'lucide-react'
import { eventsApi } from './api'

/**
 * Las categorías (tipos de evento) viven en el servicio events y las administra el organizador.
 * Aquí solo está el catálogo de íconos que puede elegir para cada una.
 */
export const ICONS = {
  music: Music, guitar: Guitar, mic: Mic, trophy: Trophy, dumbbell: Dumbbell, bike: Bike, drama: Drama,
  clapperboard: Clapperboard, film: Film, presentation: Presentation, 'graduation-cap': GraduationCap,
  'book-open': BookOpen, 'party-popper': PartyPopper, tent: Tent, store: Store, utensils: Utensils, wine: Wine,
  palette: Palette, camera: Camera, 'gamepad-2': Gamepad2, laptop: Laptop, heart: Heart, star: Star,
  sparkles: Sparkles, baby: Baby, plane: Plane, globe: Globe, church: Church, leaf: Leaf, flame: Flame, ticket: Ticket,
}

export const iconFor = (name) => ICONS[name] ?? Sparkles

let cache = null
let inflight = null
const listeners = new Set()

export function loadCategories({ force = false, all = false } = {}) {
  if (all) return eventsApi.categories(true)
  if (cache && !force) return Promise.resolve(cache)
  inflight = inflight && !force ? inflight : eventsApi.categories().then((list) => {
    cache = list
    inflight = null
    listeners.forEach((fn) => fn(list))
    return list
  })
  return inflight
}

/** Categorías activas (con caché compartida entre pantallas). */
export function useCategories() {
  const [list, setList] = useState(cache ?? [])
  useEffect(() => {
    listeners.add(setList)
    loadCategories().then(setList).catch(() => {})
    return () => listeners.delete(setList)
  }, [])
  return list
}

/** Datos de presentación de una categoría a partir de su slug. */
export function categoryMeta(slug, list = cache ?? []) {
  const found = list.find((c) => c.slug === slug)
  return { slug, name: found?.name ?? 'Evento', icon: iconFor(found?.icon) }
}
