'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react'
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import { lightTheme, darkTheme } from '@/app/theme/theme'

// theme enum
export enum ThemeMode {
  light = 'light',
  dark = 'dark',
  system = 'system',
}

export type ThemeModeType = 'light' | 'dark' | 'system'

interface ThemeContextType {
  setTheme: (theme: ThemeModeType) => void
  currentTheme: ThemeModeType
  resolvedTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useThemeContext = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: ReactNode
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeModeType>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  // Update resolved theme based on system preference or user selection
  useEffect(() => {
    const handleSystemThemeChange = () => {
      if (currentTheme === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        setResolvedTheme(isDark ? 'dark' : 'light')
      }
    }

    handleSystemThemeChange() // Initialize on mount

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', handleSystemThemeChange)

    return () =>
      mediaQuery.removeEventListener('change', handleSystemThemeChange)
  }, [currentTheme])

  // Persist theme preference in localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme-mode') as ThemeMode
    if (savedTheme) {
      setCurrentTheme(savedTheme)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('theme-mode', currentTheme)
    if (currentTheme !== 'system') {
      setResolvedTheme(currentTheme)
    }
  }, [currentTheme])


  const setTheme = (theme: ThemeModeType) => {
    setCurrentTheme(theme)
  }

  const theme = resolvedTheme === ThemeMode.light ? lightTheme : darkTheme

  return (
    <ThemeContext.Provider
      value={{
        setTheme,
        currentTheme,
        resolvedTheme,
      }}
    >
      <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  )
}
