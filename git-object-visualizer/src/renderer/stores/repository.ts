import { writable, derived } from 'svelte/store'

export interface RepositoryState {
  path: string | null
  name: string | null
  error: string | null
}

function createRepositoryStore() {
  const { subscribe, set, update } = writable<RepositoryState>({
    path: null,
    name: null,
    error: null
  })

  return {
    subscribe,
    setRepository: (path: string, name: string) => {
      set({ path, name, error: null })
    },
    setError: (error: string) => {
      update((state) => ({ ...state, error }))
    },
    clearError: () => {
      update((state) => ({ ...state, error: null }))
    },
    reset: () => {
      set({ path: null, name: null, error: null })
    }
  }
}

export const repository = createRepositoryStore()

export const isRepositoryOpen = derived(repository, ($repo) => $repo.path !== null)
