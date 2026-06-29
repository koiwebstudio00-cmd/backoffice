import { useContext } from 'react'
import { ThemeProviderContext, type ThemeProviderState } from '@/components/theme-context'

export function useTheme(): ThemeProviderState {
  const context = useContext(ThemeProviderContext)
  if (!context) throw new Error('useTheme debe usarse dentro de ThemeProvider')
  return context
}
