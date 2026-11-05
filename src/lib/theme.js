function hexToHSL(hex) {
  let r = parseInt(hex.slice(1, 3), 16) / 255
  let g = parseInt(hex.slice(3, 5), 16) / 255
  let b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h, s, l = (max + min) / 2

  if (max === min) { h = s = 0 }
  else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }
  return { h: h * 360, s: s * 100, l: l * 100 }
}

function hslToHex(h, s, l) {
  l /= 100
  const a = s * Math.min(l, 1 - l) / 100
  const f = n => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

export function generateTheme(primaryColor) {
  const safe = /^#[0-9A-Fa-f]{6}$/.test(primaryColor) ? primaryColor : '#1F2A44'
  const { h, s } = hexToHSL(safe)

  return {
    mode: 'light',
    primary: safe,
    pageBackground: hslToHex(h, Math.min(s, 30), 96),
    cardBackground: '#FFFFFF',
    textPrimary: '#1A1A1A',       // texte important — quasi noir
    textSecondary: '#666666',      // texte secondaire — gris moyen
    textMuted: '#999999',          // texte tertiaire (timestamps, hints)
    borderLight: hslToHex(h, Math.min(s, 20), 90),
  }
}

/* ---------- contraste (WCAG 2.1) ---------- */

function relativeLuminance(hex) {
  const c = [1, 3, 5]
    .map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

/** Rapport de contraste entre deux couleurs hexadécimales (1:1 → 21:1). */
export function contrastRatio(a, b) {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const hi = Math.max(la, lb)
  const lo = Math.min(la, lb)
  return (hi + 0.05) / (lo + 0.05)
}

function adjustLightness(hex, delta) {
  const { h, s, l } = hexToHSL(hex)
  return hslToHex(h, s, Math.max(0, Math.min(100, l + delta)))
}

/**
 * Assombrit `background` jusqu'à ce que tous les textes de `foregrounds`
 * atteignent le rapport `target`. Sans cela, une couleur de marque claire
 * (jaune, vert, cyan…) produisait des cartes trop lumineuses où le texte
 * secondaire descendait sous 4,5:1 — donc illisible en mode sombre.
 */
function ensureContrast(background, foregrounds, target = 4.5) {
  let out = background
  for (let i = 0; i < 50; i++) {
    if (foregrounds.every(fg => contrastRatio(fg, out) >= target)) return out
    out = adjustLightness(out, -1)
  }
  return out
}

/** Plus court chemin angulaire entre deux teintes, dans [-180, 180]. */
function shortestDelta(from, to) {
  return (((from - to + 180) % 360) + 360) % 360 - 180
}

export function generateDarkTheme(primaryColor) {
  const safe = /^#[0-9A-Fa-f]{6}$/.test(primaryColor) ? primaryColor : '#1F2A44'
  const { h } = hexToHSL(safe)

  // L'ancienne formule `(230 + h * 13.01) % 360` brouillait la teinte : un
  // primaire magenta donnait une carte olive, un primaire jaune une carte
  // vert-jaune très claire, avec des contrastes imprévisibles (jusqu'à 2,1:1).
  // On se contente d'infléchir le bleu-marine de référence vers la teinte de
  // marque, d'au plus ~32° : les surfaces restent sombres et cohérentes.
  const baseHue = 230 // bleu-marine de référence (type VSCode/Discord)
  const blendedHue = (baseHue + shortestDelta(h, baseHue) * 0.18 + 360) % 360

  const textPrimary = '#FFFFFF'
  const textSecondary = '#C8CCDA'
  const textMuted = '#A8AFC4' // éclairci : #8B92A8 ne dépassait pas 3,3:1 sur carte

  // Les surfaces sont calculées puis assombries autant que nécessaire pour que
  // les trois niveaux de texte restent lisibles quelle que soit la marque.
  const pageBackground = ensureContrast(
    hslToHex(blendedHue, 30, 18),
    [textSecondary, textMuted]
  )
  const cardBackground = ensureContrast(
    hslToHex(blendedHue, 22, 28),
    [textSecondary, textMuted]
  )

  return {
    mode: 'dark',
    primary: safe,
    pageBackground,
    cardBackground,
    textPrimary,
    textSecondary,
    textMuted,
    borderLight: adjustLightness(cardBackground, 9),
  }
}

export function getTheme(primaryColor, darkMode) {
  return darkMode ? generateDarkTheme(primaryColor) : generateTheme(primaryColor)
}