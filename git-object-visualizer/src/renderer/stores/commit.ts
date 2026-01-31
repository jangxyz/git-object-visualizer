import { writable, derived } from 'svelte/store'

export interface Commit {
  sha: string
  message: string
  author: string
  date: string
}

export interface CommitState {
  commits: Commit[]
  selectedSha: string | null
  isLoading: boolean
  error: string | null
}

function createCommitStore() {
  const { subscribe, set, update } = writable<CommitState>({
    commits: [],
    selectedSha: null,
    isLoading: false,
    error: null
  })

  return {
    subscribe,
    setCommits: (commits: Commit[]) => {
      update((state) => ({ ...state, commits, error: null }))
    },
    selectCommit: (sha: string) => {
      update((state) => ({ ...state, selectedSha: sha }))
    },
    setLoading: (isLoading: boolean) => {
      update((state) => ({ ...state, isLoading }))
    },
    setError: (error: string) => {
      update((state) => ({ ...state, error, isLoading: false }))
    },
    reset: () => {
      set({ commits: [], selectedSha: null, isLoading: false, error: null })
    }
  }
}

export const commitStore = createCommitStore()

export const selectedCommit = derived(commitStore, ($store) =>
  $store.commits.find((c) => c.sha === $store.selectedSha) ?? null
)
