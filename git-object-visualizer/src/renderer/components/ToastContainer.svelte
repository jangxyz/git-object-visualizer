<script lang="ts">
  import { toastStore, type Toast } from '../stores/toast'

  function handleDismiss(id: number) {
    toastStore.dismiss(id)
  }

  function getIcon(type: Toast['type']): string {
    switch (type) {
      case 'error':
        return '⚠️'
      case 'success':
        return '✓'
      case 'info':
      default:
        return 'ℹ️'
    }
  }
</script>

<div class="toast-container">
  {#each $toastStore as toast (toast.id)}
    <div class="toast toast-{toast.type}" role="alert">
      <span class="toast-icon">{getIcon(toast.type)}</span>
      <span class="toast-message">{toast.message}</span>
      <button
        class="toast-dismiss"
        onclick={() => handleDismiss(toast.id)}
        aria-label="닫기"
      >
        ×
      </button>
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    bottom: 20px;
    right: 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    z-index: 9999;
    pointer-events: none;
  }

  .toast {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    border-radius: 8px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    max-width: 400px;
    min-width: 280px;
    animation: slideIn 0.3s ease-out;
    pointer-events: auto;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .toast-error {
    border-color: var(--error-color);
    background-color: var(--bg-tertiary);
  }

  .toast-error .toast-icon {
    color: var(--error-color);
  }

  .toast-success {
    border-color: var(--success-color);
    background-color: var(--bg-tertiary);
  }

  .toast-success .toast-icon {
    color: var(--success-color);
  }

  .toast-info {
    border-color: var(--accent-color);
    background-color: var(--bg-tertiary);
  }

  .toast-info .toast-icon {
    color: var(--accent-color);
  }

  .toast-icon {
    flex-shrink: 0;
    font-size: 16px;
  }

  .toast-message {
    flex: 1;
    font-size: 14px;
    color: var(--text-primary);
    word-break: break-word;
  }

  .toast-dismiss {
    flex-shrink: 0;
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 20px;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background-color 0.15s, color 0.15s;
  }

  .toast-dismiss:hover {
    background-color: var(--bg-hover);
    color: var(--text-primary);
  }
</style>
