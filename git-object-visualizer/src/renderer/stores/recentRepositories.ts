import { writable } from 'svelte/store'

const STORAGE_KEY = 'recentRepositories'
const MAX_RECENT = 5

export interface RecentRepository {
  path: string
  name: string
  lastOpened: number
}

function loadFromStorage(): RecentRepository[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Failed to load recent repositories from localStorage:', e)
  }
  return []
}

function saveToStorage(repos: RecentRepository[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(repos))
  } catch (e) {
    console.error('Failed to save recent repositories to localStorage:', e)
  }
}

function createRecentRepositoriesStore() {
  const { subscribe, set, update } = writable<RecentRepository[]>(loadFromStorage())

  return {
    subscribe,
    add: (path: string, name: string) => {
      update((repos) => {
        // Remove existing entry with same path if present
        const filtered = repos.filter((r) => r.path !== path)

        // Add new entry at the beginning
        const newRepo: RecentRepository = {
          path,
          name,
          lastOpened: Date.now()
        }

        // Keep only MAX_RECENT entries
        const updated = [newRepo, ...filtered].slice(0, MAX_RECENT)

        saveToStorage(updated)
        return updated
      })
    },
    remove: (path: string) => {
      update((repos) => {
        const updated = repos.filter((r) => r.path !== path)
        saveToStorage(updated)
        return updated
      })
    },
    clear: () => {
      saveToStorage([])
      set([])
    }
  }
}

export const recentRepositories = createRecentRepositoriesStore()
