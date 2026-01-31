<script lang="ts">
  import { onDestroy } from 'svelte'
  import { repository } from '../stores/repository'
  import { selectedObjectStore, isDetailPanelOpen, selectedObject, type SelectedObjectInfo } from '../stores/selectedObject'
  import { isIpcError } from '../utils/ipcError'

  // Object type icons and colors
  const typeIcons: Record<string, string> = {
    commit: '&#9679;', // filled circle
    tree: '&#9670;',   // diamond
    blob: '&#9632;'    // square
  }

  const typeColors: Record<string, string> = {
    commit: '#4a90d9', // blue
    tree: '#50c878',   // green
    blob: '#f5a623'    // orange
  }

  const typeLabels: Record<string, string> = {
    commit: 'Commit',
    tree: 'Tree',
    blob: 'Blob'
  }

  // Git command tooltip descriptions
  const commandDescriptions: Record<string, string> = {
    'git cat-file -p': '객체의 pretty-print 된 내용을 출력합니다',
    'git ls-tree': 'tree 객체의 내용을 목록 형태로 출력합니다',
    'git show': '커밋의 상세 정보와 변경 내용(diff)을 출력합니다',
    'git log': '커밋 히스토리를 출력합니다'
  }

  // Tooltip state
  let activeTooltip = $state<string | null>(null)
  let tooltipTimer: ReturnType<typeof setTimeout> | null = null

  function showTooltip(command: string) {
    // Clear any existing timer
    if (tooltipTimer) {
      clearTimeout(tooltipTimer)
    }
    // Show tooltip after 0.5 seconds
    tooltipTimer = setTimeout(() => {
      activeTooltip = command
    }, 500)
  }

  function hideTooltip() {
    if (tooltipTimer) {
      clearTimeout(tooltipTimer)
      tooltipTimer = null
    }
    activeTooltip = null
  }

  function getCommandBase(command: string): string {
    // Extract the base command (e.g., "git cat-file -p" from "git cat-file -p <sha>")
    if (command.startsWith('git cat-file -p')) return 'git cat-file -p'
    if (command.startsWith('git ls-tree')) return 'git ls-tree'
    if (command.startsWith('git show')) return 'git show'
    if (command.startsWith('git log')) return 'git log'
    return command
  }

  // State
  let isLoading = $state(false)
  let error = $state<string | null>(null)
  let commitData = $state<CommitObject | null>(null)
  let treeData = $state<TreeEntry[] | null>(null)
  let blobData = $state<string | null>(null)

  // Subscribe to repository path
  let repoPath: string | null = null
  const unsubscribeRepo = repository.subscribe(state => {
    repoPath = state.path
  })

  // Subscribe to selected object and load data
  const unsubscribeObject = selectedObject.subscribe(async (obj) => {
    if (!obj || !repoPath) {
      resetData()
      return
    }
    await loadObjectData(obj)
  })

  function resetData() {
    commitData = null
    treeData = null
    blobData = null
    error = null
  }

  async function loadObjectData(obj: SelectedObjectInfo) {
    if (!repoPath) return

    isLoading = true
    error = null
    resetData()

    try {
      switch (obj.type) {
        case 'commit': {
          const result = await window.api.git.getCommit(repoPath, obj.id)
          if (isIpcError(result)) {
            error = result.message
          } else {
            commitData = result
          }
          break
        }
        case 'tree': {
          const result = await window.api.git.getTree(repoPath, obj.id)
          if (isIpcError(result)) {
            error = result.message
          } else {
            treeData = result
          }
          break
        }
        case 'blob': {
          const result = await window.api.git.getBlob(repoPath, obj.id)
          if (isIpcError(result)) {
            error = result.message
          } else {
            blobData = result
          }
          break
        }
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load object data'
    } finally {
      isLoading = false
    }
  }

  function handleClose() {
    selectedObjectStore.close()
  }

  function formatDate(isoDate: string): string {
    try {
      const date = new Date(isoDate)
      return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return isoDate
    }
  }

  function truncateBlob(content: string, maxLines: number = 50): string {
    const lines = content.split('\n')
    if (lines.length <= maxLines) {
      return content
    }
    return lines.slice(0, maxLines).join('\n') + '\n...'
  }

  // Copy to clipboard state - track which command was just copied
  let copiedCommand = $state<string | null>(null)

  async function copyToClipboard(command: string) {
    try {
      await navigator.clipboard.writeText(command)
      copiedCommand = command
      // Reset after 1.5 seconds
      setTimeout(() => {
        copiedCommand = null
      }, 1500)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  onDestroy(() => {
    unsubscribeRepo()
    unsubscribeObject()
  })
</script>

{#if $isDetailPanelOpen && $selectedObject}
  <div class="panel-overlay" onclick={handleClose} onkeydown={(e) => e.key === 'Escape' && handleClose()} role="button" tabindex="-1"></div>
  <div class="detail-panel">
    <div class="panel-header">
      <div class="object-type-badge" style="background-color: {typeColors[$selectedObject.type]}">
        <span class="type-icon">{@html typeIcons[$selectedObject.type]}</span>
        <span class="type-label">{typeLabels[$selectedObject.type]}</span>
      </div>
      <button class="close-btn" onclick={handleClose} title="닫기">
        &#10005;
      </button>
    </div>

    <div class="sha-display">
      <span class="sha-label">SHA</span>
      <code class="sha-value">{$selectedObject.id}</code>
    </div>

    {#if $selectedObject.name}
      <div class="name-display">
        <span class="name-label">Name</span>
        <span class="name-value">{$selectedObject.name}</span>
      </div>
    {/if}

    <div class="panel-content">
      {#if isLoading}
        <div class="loading">
          <span class="spinner"></span>
          <span>로딩 중...</span>
        </div>
      {:else if error}
        <div class="error">
          <span>오류: {error}</span>
        </div>
      {:else if $selectedObject.type === 'commit' && commitData}
        <div class="commit-details">
          <div class="detail-section">
            <h4>Author</h4>
            <p>{commitData.author}</p>
          </div>
          <div class="detail-section">
            <h4>Date</h4>
            <p>{formatDate(commitData.authorDate)}</p>
          </div>
          <div class="detail-section">
            <h4>Message</h4>
            <p class="commit-message">{commitData.message}</p>
          </div>
          {#if commitData.parents.length > 0}
            <div class="detail-section">
              <h4>Parent{commitData.parents.length > 1 ? 's' : ''}</h4>
              <ul class="parent-list">
                {#each commitData.parents as parentSha}
                  <li><code>{parentSha}</code></li>
                {/each}
              </ul>
            </div>
          {/if}
        </div>
      {:else if $selectedObject.type === 'tree' && treeData}
        <div class="tree-details">
          <div class="detail-section">
            <h4>Items ({treeData.length})</h4>
            <ul class="tree-list">
              {#each treeData as entry}
                <li class="tree-entry">
                  <span class="entry-icon">{entry.type === 'tree' ? '📁' : '📄'}</span>
                  <span class="entry-name">{entry.name}</span>
                  <span class="entry-type">({entry.type})</span>
                </li>
              {/each}
            </ul>
          </div>
        </div>
      {:else if $selectedObject.type === 'blob' && blobData !== null}
        <div class="blob-details">
          <div class="detail-section">
            <h4>Content</h4>
            <pre class="blob-content">{truncateBlob(blobData)}</pre>
          </div>
        </div>
      {/if}

      <!-- Git CLI Commands Section -->
      <div class="git-commands-section">
        <h4>관련 Git 명령어</h4>
        {#if $selectedObject.type === 'commit'}
          {@const cmd = `git cat-file -p ${$selectedObject.id}`}
          <div
            class="command-block"
            onmouseenter={() => showTooltip(cmd)}
            onmouseleave={hideTooltip}
          >
            <code>{cmd}</code>
            <button
              class="copy-btn"
              onclick={() => copyToClipboard(cmd)}
              title="명령어 복사"
            >
              {#if copiedCommand === cmd}
                <span class="copy-icon check">&#10003;</span>
              {:else}
                <span class="copy-icon">&#128203;</span>
              {/if}
            </button>
            {#if activeTooltip === cmd}
              <div class="tooltip">{commandDescriptions[getCommandBase(cmd)]}</div>
            {/if}
          </div>
        {:else if $selectedObject.type === 'tree'}
          {@const cmd = `git ls-tree ${$selectedObject.id}`}
          <div
            class="command-block"
            onmouseenter={() => showTooltip(cmd)}
            onmouseleave={hideTooltip}
          >
            <code>{cmd}</code>
            <button
              class="copy-btn"
              onclick={() => copyToClipboard(cmd)}
              title="명령어 복사"
            >
              {#if copiedCommand === cmd}
                <span class="copy-icon check">&#10003;</span>
              {:else}
                <span class="copy-icon">&#128203;</span>
              {/if}
            </button>
            {#if activeTooltip === cmd}
              <div class="tooltip">{commandDescriptions[getCommandBase(cmd)]}</div>
            {/if}
          </div>
        {:else if $selectedObject.type === 'blob'}
          {@const cmd1 = `git cat-file -p ${$selectedObject.id}`}
          {@const cmd2 = `git show ${$selectedObject.id}`}
          <div
            class="command-block"
            onmouseenter={() => showTooltip(cmd1)}
            onmouseleave={hideTooltip}
          >
            <code>{cmd1}</code>
            <button
              class="copy-btn"
              onclick={() => copyToClipboard(cmd1)}
              title="명령어 복사"
            >
              {#if copiedCommand === cmd1}
                <span class="copy-icon check">&#10003;</span>
              {:else}
                <span class="copy-icon">&#128203;</span>
              {/if}
            </button>
            {#if activeTooltip === cmd1}
              <div class="tooltip">{commandDescriptions[getCommandBase(cmd1)]}</div>
            {/if}
          </div>
          <div
            class="command-block"
            onmouseenter={() => showTooltip(cmd2)}
            onmouseleave={hideTooltip}
          >
            <code>{cmd2}</code>
            <button
              class="copy-btn"
              onclick={() => copyToClipboard(cmd2)}
              title="명령어 복사"
            >
              {#if copiedCommand === cmd2}
                <span class="copy-icon check">&#10003;</span>
              {:else}
                <span class="copy-icon">&#128203;</span>
              {/if}
            </button>
            {#if activeTooltip === cmd2}
              <div class="tooltip">{commandDescriptions[getCommandBase(cmd2)]}</div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .panel-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.3);
    z-index: 99;
  }

  .detail-panel {
    position: fixed;
    top: 0;
    right: 0;
    width: 400px;
    height: 100%;
    background-color: #252526;
    border-left: 1px solid #3c3c3c;
    z-index: 100;
    display: flex;
    flex-direction: column;
    animation: slideIn 0.2s ease-out;
  }

  @keyframes slideIn {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    border-bottom: 1px solid #3c3c3c;
  }

  .object-type-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    border-radius: 4px;
    color: white;
    font-weight: 600;
  }

  .type-icon {
    font-size: 12px;
  }

  .type-label {
    font-size: 14px;
    text-transform: uppercase;
  }

  .close-btn {
    background: none;
    border: none;
    color: #888;
    font-size: 18px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: background-color 0.2s, color 0.2s;
  }

  .close-btn:hover {
    background-color: #3c3c3c;
    color: #fff;
  }

  .sha-display, .name-display {
    padding: 12px 16px;
    border-bottom: 1px solid #3c3c3c;
  }

  .sha-label, .name-label {
    display: block;
    font-size: 11px;
    color: #888;
    text-transform: uppercase;
    margin-bottom: 4px;
  }

  .sha-value {
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
    font-size: 12px;
    color: #e0e0e0;
    word-break: break-all;
  }

  .name-value {
    font-size: 14px;
    color: #fff;
  }

  .panel-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  .loading, .error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px;
    gap: 8px;
    color: #888;
  }

  .error {
    color: #f87171;
  }

  .spinner {
    width: 24px;
    height: 24px;
    border: 3px solid #333;
    border-top-color: #4a90d9;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .detail-section {
    margin-bottom: 16px;
  }

  .detail-section h4 {
    font-size: 11px;
    color: #888;
    text-transform: uppercase;
    margin-bottom: 8px;
    font-weight: 600;
  }

  .detail-section p {
    color: #e0e0e0;
    font-size: 14px;
    line-height: 1.5;
    margin: 0;
  }

  .commit-message {
    white-space: pre-wrap;
    word-break: break-word;
  }

  .parent-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .parent-list li {
    margin-bottom: 4px;
  }

  .parent-list code {
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
    font-size: 12px;
    color: #4a90d9;
    background-color: #2d2d2d;
    padding: 2px 6px;
    border-radius: 3px;
  }

  .tree-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .tree-entry {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 0;
    border-bottom: 1px solid #2d2d2d;
  }

  .tree-entry:last-child {
    border-bottom: none;
  }

  .entry-icon {
    font-size: 14px;
  }

  .entry-name {
    color: #e0e0e0;
    font-size: 14px;
    flex: 1;
  }

  .entry-type {
    color: #666;
    font-size: 12px;
  }

  .blob-content {
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
    font-size: 12px;
    line-height: 1.5;
    color: #e0e0e0;
    background-color: #1e1e1e;
    padding: 12px;
    border-radius: 4px;
    overflow-x: auto;
    white-space: pre;
    margin: 0;
    max-height: 400px;
    overflow-y: auto;
  }

  /* Git CLI Commands Section */
  .git-commands-section {
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid #3c3c3c;
  }

  .git-commands-section h4 {
    font-size: 11px;
    color: #888;
    text-transform: uppercase;
    margin-bottom: 12px;
    font-weight: 600;
  }

  .command-block {
    margin-bottom: 8px;
    display: flex;
    align-items: stretch;
    gap: 0;
    position: relative;
  }

  .command-block:last-child {
    margin-bottom: 0;
  }

  .command-block code {
    flex: 1;
    display: block;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
    font-size: 12px;
    color: #c3e88d;
    background-color: #1e1e1e;
    padding: 10px 12px;
    border-radius: 4px 0 0 4px;
    border: 1px solid #333;
    border-right: none;
    word-break: break-all;
  }

  .copy-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 12px;
    background-color: #1e1e1e;
    border: 1px solid #333;
    border-left: none;
    border-radius: 0 4px 4px 0;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .copy-btn:hover {
    background-color: #2d2d2d;
  }

  .copy-icon {
    font-size: 14px;
    color: #888;
  }

  .copy-icon.check {
    color: #50c878;
  }

  /* Tooltip styles */
  .tooltip {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    background-color: #333;
    color: #e0e0e0;
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
    border-color: #333 transparent transparent transparent;
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
