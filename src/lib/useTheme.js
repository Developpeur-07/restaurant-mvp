import { useState, useEffect } from 'react'
import {  getTheme } from './theme'

export function useTheme(primaryColor) {
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem('theme_mode') === 'dark'
  )

  useEffect(() => {
    localStorage.setItem('theme_mode', darkMode ? 'dark' : 'light')
  }, [darkMode])

  const theme = getTheme(primaryColor || '#8B0000', darkMode)

  function toggleDarkMode() {
    setDarkMode(prev => !prev)
  }

  return { theme, darkMode, toggleDarkMode }
}