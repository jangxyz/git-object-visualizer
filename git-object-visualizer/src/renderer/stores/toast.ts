import { writable } from 'svelte/store'

export type ToastType = 'error' | 'success' | 'info'

export interface Toast {
  id: number
  message: string
  type: ToastType
}

function createToastStore() {
  const { subscribe, update } = writable<Toast[]>([])
  let nextId = 0

  return {
    subscribe,
    show: (message: string, type: ToastType = 'info', duration: number = 4000) => {
      const id = nextId++
      update((toasts) => [...toasts, { id, message, type }])

      if (duration > 0) {
        setTimeout(() => {
          update((toasts) => toasts.filter((t) => t.id !== id))
        }, duration)
      }

      return id
    },
    error: (message: string, duration: number = 5000) => {
      const id = nextId++
      update((toasts) => [...toasts, { id, message, type: 'error' }])

      if (duration > 0) {
        setTimeout(() => {
          update((toasts) => toasts.filter((t) => t.id !== id))
        }, duration)
      }

      return id
    },
    success: (message: string, duration: number = 3000) => {
      const id = nextId++
      update((toasts) => [...toasts, { id, message, type: 'success' }])

      if (duration > 0) {
        setTimeout(() => {
          update((toasts) => toasts.filter((t) => t.id !== id))
        }, duration)
      }

      return id
    },
    dismiss: (id: number) => {
      update((toasts) => toasts.filter((t) => t.id !== id))
    },
    clear: () => {
      update(() => [])
    }
  }
}

export const toastStore = createToastStore()
