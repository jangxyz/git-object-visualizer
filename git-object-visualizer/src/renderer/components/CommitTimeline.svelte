<script lang="ts">
  import { commitStore } from '../stores/commit'
  import { repository } from '../stores/repository'
  import { toastStore } from '../stores/toast'
  import { onMount, onDestroy } from 'svelte'
  import { isIpcError } from '../utils/ipcError'

  let unsubscribeRepo: (() => void) | null = null

  // Copy to clipboard state - track which commit SHA was just copied
  let copiedSha = $state<string | null>(null)

  // Git command tooltip descriptions
  const commandDescriptions: Record<string, string> = {
    'git show': '커밋의 상세 정보와 변경 내용(diff)을 출력합니다'
  }

  // Tooltip state
  let activeTooltipSha = $state<string | null>(null)
  let tooltipTimer: ReturnType<typeof setTimeout> | null = null

  function showTooltip(sha: string) {
    // Clear any existing timer
    if (tooltipTimer) {
      clearTimeout(tooltipTimer)
    }
    // Show tooltip after 0.5 seconds
    tooltipTimer = setTimeout(() => {
      activeTooltipSha = sha
    }, 500)
  }

  function hideTooltip() {
    if (tooltipTimer) {
      clearTimeout(tooltipTimer)
      tooltipTimer = null
    }
    activeTooltipSha = null
  }

  async function copyGitShow(sha: string, event: MouseEvent) {
    // Prevent commit selection when clicking copy button
    event.stopPropagation()

    try {
      const command = `git show ${sha}`
      await navigator.clipboard.writeText(command)
      copiedSha = sha
      // Reset after 1.5 seconds
      setTimeout(() => {
        copiedSha = null
      }, 1500)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  async function loadCommits(repoPath: string) {
    commitStore.setLoading(true)
    try {
      const result = await window.api.git.getCommitHistory(repoPath)

      if (isIpcError(result)) {
        const errorMsg = result.message
        commitStore.setError(errorMsg)
        toastStore.error(errorMsg)
        return
      }

      commitStore.setCommits(result)
      // Auto-select HEAD commit (first commit in list)
      if (result.length > 0) {
        commitStore.selectCommit(result[0].sha)
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '커밋 히스토리를 불러오는 중 오류가 발생했습니다'
      commitStore.setError(errorMsg)
      toastStore.error(errorMsg)
    }
  }

  function handleCommitClick(sha: string) {
    commitStore.selectCommit(sha)
  }

  function truncateMessage(message: string, maxLength: number = 50): string {
    const firstLine = message.split('\n')[0]
    if (firstLine.length <= maxLength) return firstLine
    return firstLine.slice(0, maxLength - 3) + '...'
  }

  function formatSha(sha: string): string {
    return sha.slice(0, 7)
  }

  onMount(() => {
    // Subscribe to repository changes to load commits when repo opens
    unsubscribeRepo = repository.subscribe(($repo) => {
      if ($repo.path) {
        loadCommits($repo.path)
      } else {
        commitStore.reset()
      }
    })

    return () => {
      if (unsubscribeRepo) {
        unsubscribeRepo()
      }
    }
  })

  onDestroy(() => {
    // Clean up tooltip timer
    if (tooltipTimer) {
      clearTimeout(tooltipTimer)
    }
  })
</script>

<div class="commit-timeline">
  <h2 class="panel-title">커밋 타임라인</h2>

  {#if $commitStore.isLoading}
    <div class="loading">
      <span class="spinner"></span>
      <span>커밋 히스토리 로딩 중...</span>
    </div>
  {:else if $commitStore.error}
    <div class="error">{$commitStore.error}</div>
  {:else if $commitStore.commits.length === 0}
    <div class="empty">커밋이 없습니다</div>
  {:else}
    <div class="commit-list">
      {#each $commitStore.commits as commit}
        <div
          class="commit-item"
          class:selected={$commitStore.selectedSha === commit.sha}
          onclick={() => handleCommitClick(commit.sha)}
          onkeydown={(e) => e.key === 'Enter' && handleCommitClick(commit.sha)}
          role="button"
          tabindex="0"
        >
          <div class="commit-header">
            <span class="commit-sha">{formatSha(commit.sha)}</span>
            <div
              class="copy-btn-wrapper"
              onmouseenter={() => showTooltip(commit.sha)}
              onmouseleave={hideTooltip}
            >
              <button
                class="copy-btn"
                onclick={(e) => copyGitShow(commit.sha, e)}
                title="git show {commit.sha} 복사"
              >
                {#if copiedSha === commit.sha}
                  <span class="copy-icon check">&#10003;</span>
                {:else}
                  <span class="copy-icon">&#128203;</span>
                {/if}
              </button>
              {#if activeTooltipSha === commit.sha}
                <div class="tooltip">{commandDescriptions['git show']}</div>
              {/if}
            </div>
          </div>
          <span class="commit-message">{truncateMessage(commit.message)}</span>
          <span class="commit-author">{commit.author}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .commit-timeline {
    height: 100%;
    background-color: var(--bg-primary);
    border-top: 1px solid var(--border-color);
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
  }

  .panel-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
    flex-shrink: 0;
  }

  .commit-list {
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
    overflow-y: hidden;
    flex: 1;
    align-items: stretch;
    padding-bottom: 0.5rem;
  }

  .commit-list::-webkit-scrollbar {
    height: 6px;
  }

  .commit-list::-webkit-scrollbar-track {
    background: var(--scrollbar-track);
    border-radius: 3px;
  }

  .commit-list::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb);
    border-radius: 3px;
  }

  .commit-list::-webkit-scrollbar-thumb:hover {
    background: var(--scrollbar-thumb-hover);
  }

  .commit-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
    padding: 0.5rem 0.75rem;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    cursor: pointer;
    min-width: 180px;
    max-width: 220px;
    flex-shrink: 0;
    transition: background-color 0.15s, border-color 0.15s;
    text-align: left;
    color: inherit;
    font-family: inherit;
  }

  .commit-item:hover {
    background-color: var(--bg-hover);
    border-color: var(--text-dimmed);
  }

  .commit-item.selected {
    background-color: var(--bg-selected);
    border-color: var(--accent-color);
  }

  .commit-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    gap: 4px;
  }

  .commit-sha {
    font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
    font-size: 0.75rem;
    color: var(--accent-color);
    font-weight: 600;
  }

  .copy-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px 4px;
    background: none;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    transition: background-color 0.15s;
  }

  .copy-btn:hover {
    background-color: var(--overlay-bg);
  }

  .copy-icon {
    font-size: 12px;
    color: var(--text-muted);
  }

  .copy-icon.check {
    color: var(--success-color);
  }

  .commit-message {
    font-size: 0.8rem;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
  }

  .commit-author {
    font-size: 0.7rem;
    color: var(--text-muted);
  }

  .loading,
  .error,
  .empty {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    font-size: 0.875rem;
    color: var(--text-muted);
    gap: 0.5rem;
  }

  .error {
    color: var(--error-color);
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid var(--spinner-track);
    border-top-color: var(--spinner-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Copy button wrapper for tooltip positioning */
  .copy-btn-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  /* Tooltip styles */
  .tooltip {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    background-color: var(--tooltip-bg);
    color: var(--text-secondary);
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    font-family: inherit;
    white-space: nowrap;
    z-index: 1000;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    animation: tooltipFadeIn 0.15s ease-out;
  }

  .tooltip::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border-width: 6px;
    border-style: solid;
    border-color: var(--tooltip-bg) transparent transparent transparent;
  }

  @keyframes tooltipFadeIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }
</style>
