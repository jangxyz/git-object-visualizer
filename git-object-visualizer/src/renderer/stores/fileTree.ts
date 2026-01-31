import { writable } from 'svelte/store'

export interface FileTreeNode {
  sha: string
  name: string
  type: 'blob' | 'tree'
  mode: string
  children?: FileTreeNode[]
  isExpanded: boolean
  isLoading: boolean
}

export interface FileTreeState {
  rootNodes: FileTreeNode[]
  rootTreeSha: string | null
  isLoading: boolean
  error: string | null
}

function createFileTreeStore() {
  const { subscribe, set, update } = writable<FileTreeState>({
    rootNodes: [],
    rootTreeSha: null,
    isLoading: false,
    error: null
  })

  return {
    subscribe,
    setRootNodes: (nodes: FileTreeNode[], rootTreeSha: string) => {
      update((state) => ({ ...state, rootNodes: nodes, rootTreeSha, error: null }))
    },
    setLoading: (isLoading: boolean) => {
      update((state) => ({ ...state, isLoading }))
    },
    setError: (error: string) => {
      update((state) => ({ ...state, error, isLoading: false }))
    },
    toggleExpand: (sha: string) => {
      update((state) => ({
        ...state,
        rootNodes: toggleNodeExpanded(state.rootNodes, sha)
      }))
    },
    setNodeChildren: (sha: string, children: FileTreeNode[]) => {
      update((state) => ({
        ...state,
        rootNodes: setChildrenForNode(state.rootNodes, sha, children)
      }))
    },
    setNodeLoading: (sha: string, isLoading: boolean) => {
      update((state) => ({
        ...state,
        rootNodes: setNodeLoadingState(state.rootNodes, sha, isLoading)
      }))
    },
    reset: () => {
      set({ rootNodes: [], rootTreeSha: null, isLoading: false, error: null })
    }
  }
}

function toggleNodeExpanded(nodes: FileTreeNode[], sha: string): FileTreeNode[] {
  return nodes.map((node) => {
    if (node.sha === sha) {
      return { ...node, isExpanded: !node.isExpanded }
    }
    if (node.children) {
      return { ...node, children: toggleNodeExpanded(node.children, sha) }
    }
    return node
  })
}

function setChildrenForNode(nodes: FileTreeNode[], sha: string, children: FileTreeNode[]): FileTreeNode[] {
  return nodes.map((node) => {
    if (node.sha === sha) {
      return { ...node, children, isLoading: false, isExpanded: true }
    }
    if (node.children) {
      return { ...node, children: setChildrenForNode(node.children, sha, children) }
    }
    return node
  })
}

function setNodeLoadingState(nodes: FileTreeNode[], sha: string, isLoading: boolean): FileTreeNode[] {
  return nodes.map((node) => {
    if (node.sha === sha) {
      return { ...node, isLoading }
    }
    if (node.children) {
      return { ...node, children: setNodeLoadingState(node.children, sha, isLoading) }
    }
    return node
  })
}

export const fileTreeStore = createFileTreeStore()
