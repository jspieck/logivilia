// Black or white text, whichever reads better on the given background
// (relative luminance per WCAG).
export function textColorFor (background, dark = '#000000', light = '#ffffff') {
  const hex = background.charAt(0) === '#' ? background.substring(1, 7) : background
  const channels = [0, 2, 4].map(i => parseInt(hex.substring(i, i + 2), 16) / 255)
  const [r, g, b] = channels.map(c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)))
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance > 0.179 ? dark : light
}
