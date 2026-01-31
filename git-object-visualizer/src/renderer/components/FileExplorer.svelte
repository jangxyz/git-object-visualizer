<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { repository } from '../stores/repository'
  import { commitStore } from '../stores/commit'
  import { fileTreeStore, type FileTreeNode } from '../stores/fileTree'
  import { selectedObjectStore } from '../stores/selectedObject'
  import { toastStore } from '../stores/toast'
  import { isIpcError } from '../utils/ipcError'

  let repoPath: string | null = null
  let selectedSha: string | null = null

  const unsubscribeRepo = repository.subscribe((state) => {
    repoPath = state.path
  })

  const unsubscribeCommit = commitStore.subscribe((state) => {
    if (state.selectedSha !== selectedSha) {
      selectedSha = state.selectedSha
      if (repoPath && selectedSha) {
        loadRootTree(repoPath, selectedSha)
      } else {
        fileTreeStore.reset()
      }
    }
  })

  let fileTreeState = $state({
    rootNodes: [] as FileTreeNode[],
    rootTreeSha: null as string | null,
    isLoading: false,
    error: null as string | null
  })

  const unsubscribeFileTree = fileTreeStore.subscribe((state) => {
    fileTreeState = state
  })

  async function loadRootTree(path: string, commitSha: string) {
    fileTreeStore.setLoading(true)

    try {
      // First, get the commit to find its tree SHA
      const commit = await window.api.git.getCommit(path, commitSha)
      if (isIpcError(commit)) {
        fileTreeStore.setError(commit.message)
        toastStore.error(commit.message)
        return
      }

      // Then get the root tree entries
      const treeEntries = await window.api.git.getTree(path, commit.tree)
      if (isIpcError(treeEntries)) {
        fileTreeStore.setError(treeEntries.message)
        toastStore.error(treeEntries.message)
        return
      }

      // Sort: folders first, then files, alphabetically
      const sortedEntries = [...treeEntries].sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'tree' ? -1 : 1
        }
        return a.name.localeCompare(b.name)
      })

      // Convert to FileTreeNode
      const nodes: FileTreeNode[] = sortedEntries.map((entry) => ({
        sha: entry.sha,
        name: entry.name,
        type: entry.type,
        mode: entry.mode,
        isExpanded: false,
        isLoading: false
      }))

      fileTreeStore.setRootNodes(nodes, commit.tree)
      fileTreeStore.setLoading(false)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '파일 트리를 불러오는데 실패했습니다'
      fileTreeStore.setError(errorMsg)
      toastStore.error(errorMsg)
    }
  }

  async function handleToggleFolder(node: FileTreeNode) {
    if (node.type !== 'tree') return
    if (!repoPath) return

    // If already has children, just toggle
    if (node.children) {
      fileTreeStore.toggleExpand(node.sha)
      return
    }

    // Load children
    fileTreeStore.setNodeLoading(node.sha, true)

    try {
      const treeEntries = await window.api.git.getTree(repoPath, node.sha)
      if (isIpcError(treeEntries)) {
        fileTreeStore.setNodeLoading(node.sha, false)
        toastStore.error(treeEntries.message)
        return
      }

      // Sort: folders first, then files, alphabetically
      const sortedEntries = [...treeEntries].sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'tree' ? -1 : 1
        }
        return a.name.localeCompare(b.name)
      })

      // Convert to FileTreeNode
      const children: FileTreeNode[] = sortedEntries.map((entry) => ({
        sha: entry.sha,
        name: entry.name,
        type: entry.type,
        mode: entry.mode,
        isExpanded: false,
        isLoading: false
      }))

      fileTreeStore.setNodeChildren(node.sha, children)
    } catch {
      fileTreeStore.setNodeLoading(node.sha, false)
    }
  }

  function handleItemClick(node: FileTreeNode) {
    // Select and highlight the node in the graph
    selectedObjectStore.selectAndHighlight({
      id: node.sha,
      type: node.type,
      label: node.sha.substring(0, 7),
      name: node.name
    })
  }

  onMount(() => {
    // Initial load if we already have a selected commit
    if (repoPath && selectedSha) {
      loadRootTree(repoPath, selectedSha)
    }
  })

  onDestroy(() => {
    unsubscribeRepo()
    unsubscribeCommit()
    unsubscribeFileTree()
  })
</script>

<div class="file-explorer">
  <h2 class="panel-title">파일 탐색기</h2>

  {#if fileTreeState.isLoading}
    <div class="loading">
      <span class="spinner"></span>
      <span>로딩 중...</span>
    </div>
  {:else if fileTreeState.error}
    <div class="error">
      <span>오류: {fileTreeState.error}</span>
    </div>
  {:else if fileTreeState.rootNodes.length === 0}
    <div class="empty">
      <span>커밋을 선택하면 파일 트리가 표시됩니다</span>
    </div>
  {:else}
    <ul class="tree-list">
      {#each fileTreeState.rootNodes as node}
        {@render treeNode(node, 0)}
      {/each}
    </ul>
  {/if}
</div>

{#snippet treeNode(node: FileTreeNode, depth: number)}
  <li class="tree-item">
    <button
      class="tree-item-btn"
      class:folder={node.type === 'tree'}
      class:file={node.type === 'blob'}
      style="padding-left: {depth * 16 + 8}px"
      onclick={() => {
        if (node.type === 'tree') {
          handleToggleFolder(node)
        }
        handleItemClick(node)
      }}
    >
      {#if node.type === 'tree'}
        <span class="expand-icon">{node.isExpanded ? '▼' : '▶'}</span>
        <span class="icon">📁</span>
      {:else}
        <span class="expand-icon-placeholder"></span>
        <span class="icon">📄</span>
      {/if}
      <span class="name">{node.name}</span>
      {#if node.isLoading}
        <span class="item-spinner"></span>
      {/if}
    </button>
    {#if node.type === 'tree' && node.isExpanded && node.children}
      <ul class="tree-list nested">
        {#each node.children as childNode}
          {@render treeNode(childNode, depth + 1)}
        {/each}
      </ul>
    {/if}
  </li>
{/snippet}

<style>
  .file-explorer {
    height: 100%;
    background-color: var(--bg-primary);
    border-right: 1px solid var(--border-color);
    padding: 1rem;
    overflow: auto;
    display: flex;
    flex-direction: column;
  }

  .panel-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 1rem 0;
    flex-shrink: 0;
  }

  .loading, .error, .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    color: var(--text-muted);
    padding: 2rem;
    text-align: center;
  }

  .error {
    color: var(--error-color);
  }

  .empty {
    font-size: 0.875rem;
  }

  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--spinner-track);
    border-top-color: var(--spinner-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .tree-list {
    list-style: none;
    margin: 0;
    padding: 0;
    overflow: auto;
    flex: 1;
  }

  .tree-list.nested {
    overflow: visible;
    flex: none;
  }

  .tree-item {
    margin: 0;
    padding: 0;
  }

  .tree-item-btn {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 4px 8px;
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 0.875rem;
    text-align: left;
    cursor: pointer;
    border-radius: 4px;
    gap: 4px;
  }

  .tree-item-btn:hover {
    background-color: var(--bg-tertiary);
  }

  .tree-item-btn.folder {
    cursor: pointer;
  }

  .tree-item-btn.file {
    cursor: pointer;
  }

  .expand-icon {
    width: 12px;
    font-size: 8px;
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .expand-icon-placeholder {
    width: 12px;
    flex-shrink: 0;
  }

  .icon {
    font-size: 14px;
    flex-shrink: 0;
  }

  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  .item-spinner {
    width: 12px;
    height: 12px;
    border: 2px solid var(--spinner-track);
    border-top-color: var(--spinner-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    flex-shrink: 0;
  }
</style>
