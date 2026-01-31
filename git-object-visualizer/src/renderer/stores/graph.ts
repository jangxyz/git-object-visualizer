import { writable, derived } from 'svelte/store'
import type { ObjectGraph, GraphNode, GraphEdge } from '../types/graph'

export type { ObjectGraph, GraphNode, GraphEdge }

export interface GraphState {
  graph: ObjectGraph | null
  isLoading: boolean
  error: string | null
}

function createGraphStore() {
  const { subscribe, set, update } = writable<GraphState>({
    graph: null,
    isLoading: false,
    error: null
  })

  return {
    subscribe,
    setGraph: (graph: ObjectGraph) => {
      set({ graph, isLoading: false, error: null })
    },
    setLoading: (isLoading: boolean) => {
      update((state) => ({ ...state, isLoading }))
    },
    setError: (error: string) => {
      update((state) => ({ ...state, error, isLoading: false }))
    },
    reset: () => {
      set({ graph: null, isLoading: false, error: null })
    }
  }
}

export const graphStore = createGraphStore()

export const graphNodes = derived(graphStore, ($store) => $store.graph?.nodes ?? [])
export const graphEdges = derived(graphStore, ($store) => $store.graph?.edges ?? [])
