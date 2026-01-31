import { writable, derived } from 'svelte/store'

/**
 * 선택된 객체 정보 타입
 */
export interface SelectedObjectInfo {
  id: string
  type: 'commit' | 'tree' | 'blob'
  label: string
  name?: string
}

interface SelectedObjectState {
  object: SelectedObjectInfo | null
  isOpen: boolean
  highlightedSha: string | null
}

const initialState: SelectedObjectState = {
  object: null,
  isOpen: false,
  highlightedSha: null
}

function createSelectedObjectStore() {
  const { subscribe, set, update } = writable<SelectedObjectState>(initialState)

  return {
    subscribe,

    /**
     * 객체를 선택하고 패널을 엽니다.
     */
    select(object: SelectedObjectInfo) {
      update(state => ({ ...state, object, isOpen: true }))
    },

    /**
     * 객체를 선택하고 하이라이트합니다. 파일 탐색기에서 사용.
     */
    selectAndHighlight(object: SelectedObjectInfo) {
      set({ object, isOpen: true, highlightedSha: object.id })
    },

    /**
     * 하이라이트를 제거합니다.
     */
    clearHighlight() {
      update(state => ({ ...state, highlightedSha: null }))
    },

    /**
     * 패널을 닫습니다.
     */
    close() {
      update(state => ({ ...state, isOpen: false }))
    },

    /**
     * 상태를 초기화합니다.
     */
    reset() {
      set(initialState)
    }
  }
}

export const selectedObjectStore = createSelectedObjectStore()

/**
 * 패널이 열려있는지 여부
 */
export const isDetailPanelOpen = derived(
  selectedObjectStore,
  $state => $state.isOpen
)

/**
 * 선택된 객체
 */
export const selectedObject = derived(
  selectedObjectStore,
  $state => $state.object
)

/**
 * 하이라이트된 노드 SHA
 */
export const highlightedSha = derived(
  selectedObjectStore,
  $state => $state.highlightedSha
)
