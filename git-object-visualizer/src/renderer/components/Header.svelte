<script lang="ts">
  import { theme } from '../stores/theme'

  interface Props {
    repositoryName: string
    onOpenAnother: () => void
  }

  let { repositoryName, onOpenAnother }: Props = $props()

  function handleThemeToggle() {
    theme.toggle()
  }
</script>

<header class="header">
  <h1 class="repo-name">{repositoryName}</h1>
  <div class="header-actions">
    <button
      class="theme-toggle-btn"
      onclick={handleThemeToggle}
      title={$theme === 'dark' ? '라이트 테마로 전환' : '다크 테마로 전환'}
    >
      {#if $theme === 'dark'}
        <span class="theme-icon">☀️</span>
      {:else}
        <span class="theme-icon">🌙</span>
      {/if}
    </button>
    <button class="open-another-btn" onclick={onOpenAnother}>
      다른 저장소 열기
    </button>
  </div>
</header>

<style>
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    background-color: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
  }

  .repo-name {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .theme-toggle-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    padding: 0;
    background-color: transparent;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s, border-color 0.2s;
  }

  .theme-toggle-btn:hover {
    background-color: var(--bg-tertiary);
    border-color: var(--accent-color);
  }

  .theme-icon {
    font-size: 1.1rem;
    line-height: 1;
  }

  .open-another-btn {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    background-color: transparent;
    color: var(--accent-color);
    border: 1px solid var(--accent-color);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .open-another-btn:hover {
    background-color: var(--accent-color);
    color: white;
  }
</style>
