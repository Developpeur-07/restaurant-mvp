// Convertit hex en HSL pour manipulation
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
  const { h, s } = hexToHSL(primaryColor)

  return {
    primary: primaryColor,
    pageBackground: hslToHex(h, Math.min(s, 30), 96),   // très clair, légère teinte
    cardBackground: '#FFFFFF',                            // toujours blanc, neutre
    textPrimary: '#1A1A1A',
    textSecondary: '#666666',
    borderLight: hslToHex(h, Math.min(s, 20), 90),
  }
}

export function generateDarkTheme(primaryColor) {
  const { h, s } = hexToHSL(primaryColor)

  return {
    primary: primaryColor,
    pageBackground: hslToHex(h, Math.min(s, 25), 8),     // très sombre, légère teinte
    cardBackground: hslToHex(h, Math.min(s, 15), 14),
    textPrimary: '#F5F5F5',
    textSecondary: '#A0A0A0',
    borderLight: hslToHex(h, Math.min(s, 20), 20),
  }
}