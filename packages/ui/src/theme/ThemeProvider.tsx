import React, { createContext, useContext, useMemo } from 'react'
import { neutral, semantic, spacing, radius, typography, resolveStorefrontTheme, staffBrand } from '@yws/tokens'

export interface Theme {
  colors: {
    background: string
    surface: string
    border: string
    text: string
    textMuted: string
    brand50: string
    brand100: string
    brand500: string
    brand600: string
    brand700: string
  } & typeof semantic
  spacing: typeof spacing
  radius: typeof radius
  typography: typeof typography
}

function buildTheme(brand: { 50: string; 100: string; 500: string; 600: string; 700: string }): Theme {
  return {
    colors: {
      background: neutral[50],
      surface: neutral[0],
      border: neutral[200],
      text: neutral[900],
      textMuted: neutral[500],
      brand50: brand[50],
      brand100: brand[100],
      brand500: brand[500],
      brand600: brand[600],
      brand700: brand[700],
      ...semantic,
    },
    spacing,
    radius,
    typography,
  }
}

/** The staff app's own brand, independent of any tenant. */
export const staffTheme = buildTheme(staffBrand)

const ThemeContext = createContext<Theme>(staffTheme)

/**
 * Wraps a subtree in a theme. Pass `tenantThemeName` from the active tenant's
 * `theme` column (customer app, per-store) or omit it for the staff app's own
 * fixed brand.
 */
export function ThemeProvider({
  tenantThemeName,
  children,
}: {
  tenantThemeName?: string | null
  children: React.ReactNode
}) {
  const theme = useMemo(
    () => (tenantThemeName !== undefined ? buildTheme(resolveStorefrontTheme(tenantThemeName)) : staffTheme),
    [tenantThemeName],
  )
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
}

export function useTheme(): Theme {
  return useContext(ThemeContext)
}
