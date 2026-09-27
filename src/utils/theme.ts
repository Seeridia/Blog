export type Theme = 'system' | 'dark' | 'light'
const themes: Theme[] = ['system', 'dark', 'light']

export function preferredTheme(): Theme {
  try {
    const value = localStorage.getItem('theme')
    return themes.includes(value as Theme) ? (value as Theme) : 'system'
  } catch {
    return 'system'
  }
}

export function applyTheme(theme: Theme, save = false) {
  if (save) {
    try {
      localStorage.setItem('theme', theme)
    } catch {
      /* Storage may be disabled. */
    }
  }
  const dark =
    theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.theme = theme
  document.documentElement.classList.toggle('dark', dark)
  const background = getComputedStyle(document.documentElement)
    .getPropertyValue('--background')
    .trim()
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', `hsl(${background})`)
  document.dispatchEvent(new CustomEvent('theme-change', { detail: { theme, dark } }))
}

export function cycleTheme() {
  const current = (document.documentElement.dataset.theme as Theme) || preferredTheme()
  const theme = themes[(themes.indexOf(current) + 1) % themes.length]
  applyTheme(theme, true)
  return theme
}
