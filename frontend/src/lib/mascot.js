import hero from '../assets/mascot/hero.webp'
import frontal from '../assets/mascot/frontal.webp'
import tresCuartos from '../assets/mascot/tres-cuartos.webp'
import perfil from '../assets/mascot/perfil.webp'
import espalda from '../assets/mascot/espalda.webp'
import feliz from '../assets/mascot/feliz.webp'
import triste from '../assets/mascot/triste.webp'
import sorprendido from '../assets/mascot/sorprendido.webp'
import enfadado from '../assets/mascot/enfadado.webp'
import pensando from '../assets/mascot/pensando.webp'
import durmiendo from '../assets/mascot/durmiendo.webp'
import programando from '../assets/mascot/programando.webp'
import trabajando from '../assets/mascot/trabajando.webp'
import corriendo from '../assets/mascot/corriendo.webp'
import saltando from '../assets/mascot/saltando.webp'
import saludando from '../assets/mascot/saludando.webp'
import conLentes from '../assets/mascot/con-lentes.webp'

/** Poses de la mascota de CODERS. */
export const POSES = {
  hero, frontal, tresCuartos, perfil, espalda, feliz, triste, sorprendido, enfadado,
  pensando, durmiendo, programando, trabajando, corriendo, saltando, saludando, conLentes,
}

export const preloadPoses = () => Object.values(POSES).forEach((src) => { const img = new Image(); img.src = src })
