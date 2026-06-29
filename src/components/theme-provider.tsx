import { useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { ThemeProviderContext, type Theme, type ThemeProviderState } from '@/components/theme-context'

interface ThemeProviderProps extends PropsWithChildren {
  defaultTheme?: Theme
  storageKey?: string
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'koi-office-theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const storedTheme = localStorage.getItem(storageKey)
    return storedTheme === 'dark' || storedTheme === 'light' || storedTheme === 'system'
      ? storedTheme
      : defaultTheme
  })

  useEffect(() => {
    const root = document.documentElement
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    const resolvedTheme = theme === 'system' ? systemTheme : theme

    root.classList.remove('light', 'dark')
    root.classList.add(resolvedTheme)
    root.style.colorScheme = resolvedTheme
  }, [theme])

  const value = useMemo<ThemeProviderState>(() => ({
    theme,
    setTheme(nextTheme) {
      localStorage.setItem(storageKey, nextTheme)
      setThemeState(nextTheme)
    },
  }), [storageKey, theme])

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}
