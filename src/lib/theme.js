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
  const safe = /^#[0-9A-Fa-f]{6}$/.test(primaryColor) ? primaryColor : '#8B0000'
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

export function generateDarkTheme(primaryColor) {
  const safe = /^#[0-9A-Fa-f]{6}$/.test(primaryColor) ? primaryColor : '#8B0000'
  const { h } = hexToHSL(safe)

  // Teinte bleu-marine fixe, légèrement influencée par la couleur du restaurant
  // mais jamais neutre/noire — c'est la clé de la lisibilité
  const baseHue = 230 // bleu-marine de référence (type VSCode/Discord)
  const blendedHue = (baseHue + h * 0.15) % 360 // légère touche de la couleur de marque

  return {
    mode: 'dark',
    primary: safe,
    pageBackground: hslToHex(blendedHue, 35, 25),    // bleu-marine profond, pas noir
    cardBackground: hslToHex(blendedHue, 18, 25),     // un ton au-dessus, même famille
    textPrimary: '#FFFFFF',
    textSecondary: '#C8CCDA',     // gris-bleu clair, plus lisible qu'un gris neutre
    textMuted: '#8B92A8',          // gris-bleu discret mais toujours lisible
    borderLight: hslToHex(blendedHue, 25, 26),
  }
}

export function getTheme(primaryColor, darkMode) {
  return darkMode ? generateDarkTheme(primaryColor) : generateTheme(primaryColor)
}