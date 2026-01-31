<script lang="ts">
  import { commitStore } from '../stores/commit'
  import { repository } from '../stores/repository'
  import { onMount } from 'svelte'

  let unsubscribeRepo: (() => void) | null = null

  async function loadCommits(repoPath: string) {
    commitStore.setLoading(true)
    try {
      const commits = await window.api.git.getCommitHistory(repoPath)
      commitStore.setCommits(commits)
      // Auto-select HEAD commit (first commit in list)
      if (commits.length > 0) {
        commitStore.selectCommit(commits[0].sha)
      }
    } catch (error) {
      commitStore.setError('커밋 히스토리를 불러오는 중 오류가 발생했습니다')
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
</script>

<div class="commit-timeline">
  <h2 class="panel-title">커밋 타임라인</h2>

  {#if $commitStore.isLoading}
    <div class="loading">커밋 히스토리 로딩 중...</div>
  {:else if $commitStore.error}
    <div class="error">{$commitStore.error}</div>
  {:else if $commitStore.commits.length === 0}
    <div class="empty">커밋이 없습니다</div>
  {:else}
    <div class="commit-list">
      {#each $commitStore.commits as commit}
        <button
          class="commit-item"
          class:selected={$commitStore.selectedSha === commit.sha}
          onclick={() => handleCommitClick(commit.sha)}
        >
          <span class="commit-sha">{formatSha(commit.sha)}</span>
          <span class="commit-message">{truncateMessage(commit.message)}</span>
          <span class="commit-author">{commit.author}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .commit-timeline {
    height: 100%;
    background-color: #1e1e1e;
    border-top: 1px solid #3c3c3c;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
  }

  .panel-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: #888;
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
    background: #2d2d2d;
    border-radius: 3px;
  }

  .commit-list::-webkit-scrollbar-thumb {
    background: #555;
    border-radius: 3px;
  }

  .commit-list::-webkit-scrollbar-thumb:hover {
    background: #666;
  }

  .commit-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
    padding: 0.5rem 0.75rem;
    background-color: #2d2d2d;
    border: 1px solid #3c3c3c;
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
    background-color: #363636;
    border-color: #4a4a4a;
  }

  .commit-item.selected {
    background-color: #264f78;
    border-color: #4a9eff;
  }

  .commit-sha {
    font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
    font-size: 0.75rem;
    color: #4a9eff;
    font-weight: 600;
  }

  .commit-message {
    font-size: 0.8rem;
    color: #e0e0e0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
  }

  .commit-author {
    font-size: 0.7rem;
    color: #888;
  }

  .loading,
  .error,
  .empty {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    font-size: 0.875rem;
    color: #888;
  }

  .error {
    color: #ff6b6b;
  }
</style>
