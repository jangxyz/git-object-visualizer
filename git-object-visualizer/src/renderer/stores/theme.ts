import { writable, derived } from 'svelte/store'

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'git-visualizer-theme'

function getInitialTheme(): Theme {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') {
      return saved
    }
  }
  // Default to dark theme
  return 'dark'
}

function createThemeStore() {
  const { subscribe, set, update } = writable<Theme>(getInitialTheme())

  return {
    subscribe,
    toggle: () => {
      update((current) => {
        const newTheme = current === 'dark' ? 'light' : 'dark'
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, newTheme)
        }
        return newTheme
      })
    },
    set: (theme: Theme) => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, theme)
      }
      set(theme)
    }
  }
}

export const theme = createThemeStore()

export const isDarkTheme = derived(theme, ($theme) => $theme === 'dark')
