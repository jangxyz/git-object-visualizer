<script lang="ts">
  import { repository, isRepositoryOpen } from "./stores/repository";
  import {
    recentRepositories,
    type RecentRepository,
  } from "./stores/recentRepositories";
  import { theme } from "./stores/theme";
  import MainLayout from "./components/MainLayout.svelte";

  let isLoading = false;
  let loadingRepoPath: string | null = null;

  async function openRepositoryByPath(path: string, name: string) {
    isLoading = true;
    loadingRepoPath = path;
    repository.clearError();

    try {
      const isValid = await window.api.git.isValidRepository(path);

      if (isValid) {
        repository.setRepository(path, name);
        recentRepositories.add(path, name);
      } else {
        // Path exists but is not a valid git repository
        repository.setError("유효한 Git 저장소가 아닙니다");
        recentRepositories.remove(path);
      }
    } catch (error) {
      // Path doesn't exist or other error
      repository.setError("저장소를 찾을 수 없습니다. 목록에서 제거됩니다.");
      recentRepositories.remove(path);
    } finally {
      isLoading = false;
      loadingRepoPath = null;
    }
  }

  async function handleOpenRepository() {
    isLoading = true;
    repository.clearError();

    try {
      const selectedPath = await window.api.dialog.openFolder();

      if (!selectedPath) {
        // User cancelled the dialog
        isLoading = false;
        return;
      }

      const isValid = await window.api.git.isValidRepository(selectedPath);

      if (isValid) {
        // Extract repository name from path
        const repoName = selectedPath.split(/[/\\]/).pop() || selectedPath;
        repository.setRepository(selectedPath, repoName);
        recentRepositories.add(selectedPath, repoName);
      } else {
        repository.setError("유효한 Git 저장소가 아닙니다");
      }
    } catch (error) {
      repository.setError("저장소를 여는 중 오류가 발생했습니다");
    } finally {
      isLoading = false;
    }
  }

  function handleOpenAnother() {
    repository.reset();
  }

  function handleRecentClick(repo: RecentRepository) {
    openRepositoryByPath(repo.path, repo.name);
  }
</script>

<div class="app" class:dark={$theme === 'dark'} class:light={$theme === 'light'}>
{#if $isRepositoryOpen}
  <MainLayout
    repositoryName={$repository.name ?? ""}
    onOpenAnother={handleOpenAnother}
  />
{:else}
  <div class="welcome">
    <h1>Git Object Visualizer</h1>
    <p>Git 내부 객체 구조를 시각적으로 탐색하세요</p>

    <button
      class="open-repo-btn"
      onclick={handleOpenRepository}
      disabled={isLoading && !loadingRepoPath}
    >
      {#if isLoading && !loadingRepoPath}
        열는 중...
      {:else}
        저장소 열기
      {/if}
    </button>

    {#if $repository.error}
      <p class="error">{$repository.error}</p>
    {/if}

    {#if $recentRepositories.length > 0}
      <div class="recent-section">
        <h2>최근 저장소</h2>
        <ul class="recent-list">
          {#each $recentRepositories as repo (repo.path)}
            <li>
              <button
                class="recent-item"
                onclick={() => handleRecentClick(repo)}
                disabled={isLoading}
              >
                <span class="repo-name">{repo.name}</span>
                <span class="repo-path">{repo.path}</span>
                {#if loadingRepoPath === repo.path}
                  <span class="loading-indicator">열는 중...</span>
                {/if}
              </button>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>
{/if}
</div>

<style>
  :global(*) {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
      Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
  }

  /* Theme CSS Variables */
  .app {
    height: 100vh;
    transition: background-color 0.2s, color 0.2s;
  }

  .app.dark {
    --bg-primary: #1e1e1e;
    --bg-secondary: #252526;
    --bg-tertiary: #2d2d2d;
    --bg-hover: #333333;
    --bg-selected: #264f78;
    --border-color: #3c3c3c;
    --border-hover: #4a9eff;
    --text-primary: #ffffff;
    --text-secondary: #e0e0e0;
    --text-muted: #888888;
    --text-dimmed: #666666;
    --accent-color: #4a9eff;
    --accent-hover: #3a8eef;
    --error-color: #ff6b6b;
    --success-color: #50c878;
    --code-bg: #1e1e1e;
    --code-text: #c3e88d;
    --spinner-track: #333333;
    --spinner-color: #4a90d9;
    --overlay-bg: rgba(0, 0, 0, 0.3);
    --tooltip-bg: #333333;
    --scrollbar-track: #2d2d2d;
    --scrollbar-thumb: #555555;
    --scrollbar-thumb-hover: #666666;
    /* Graph node colors - dark theme */
    --node-commit: #4a90d9;
    --node-tree: #50c878;
    --node-blob: #f5a623;
    --node-stroke: #ffffff;
    --edge-color: #666666;
    --arrow-color: #666666;
    --node-label-color: #cccccc;
    --node-name-color: #888888;

    background-color: var(--bg-primary);
    color: var(--text-primary);
  }

  .app.light {
    --bg-primary: #ffffff;
    --bg-secondary: #f5f5f5;
    --bg-tertiary: #e8e8e8;
    --bg-hover: #d0d0d0;
    --bg-selected: #cce5ff;
    --border-color: #d0d0d0;
    --border-hover: #4a9eff;
    --text-primary: #1e1e1e;
    --text-secondary: #333333;
    --text-muted: #666666;
    --text-dimmed: #999999;
    --accent-color: #0066cc;
    --accent-hover: #0055aa;
    --error-color: #dc3545;
    --success-color: #28a745;
    --code-bg: #f5f5f5;
    --code-text: #2e7d32;
    --spinner-track: #d0d0d0;
    --spinner-color: #4a90d9;
    --overlay-bg: rgba(0, 0, 0, 0.2);
    --tooltip-bg: #333333;
    --scrollbar-track: #e0e0e0;
    --scrollbar-thumb: #b0b0b0;
    --scrollbar-thumb-hover: #909090;
    /* Graph node colors - light theme (adjusted for visibility) */
    --node-commit: #2563eb;
    --node-tree: #16a34a;
    --node-blob: #ea580c;
    --node-stroke: #1e1e1e;
    --edge-color: #999999;
    --arrow-color: #999999;
    --node-label-color: #333333;
    --node-name-color: #666666;

    background-color: var(--bg-primary);
    color: var(--text-primary);
  }

  .welcome {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    text-align: center;
  }

  .welcome h1 {
    font-size: 2rem;
    margin-bottom: 1rem;
    color: var(--text-primary);
  }

  .welcome p {
    color: var(--text-muted);
  }

  .open-repo-btn {
    margin-top: 2rem;
    padding: 1rem 2rem;
    font-size: 1.1rem;
    background-color: var(--accent-color);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .open-repo-btn:hover:not(:disabled) {
    background-color: var(--accent-hover);
  }

  .open-repo-btn:disabled {
    background-color: var(--text-muted);
    cursor: not-allowed;
  }

  .error {
    margin-top: 1rem;
    color: var(--error-color);
    font-size: 0.9rem;
  }

  .recent-section {
    margin-top: 3rem;
    width: 100%;
    max-width: 500px;
  }

  .recent-section h2 {
    font-size: 1rem;
    color: var(--text-muted);
    margin-bottom: 1rem;
    text-align: left;
  }

  .recent-list {
    list-style: none;
  }

  .recent-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
    padding: 0.75rem 1rem;
    margin-bottom: 0.5rem;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    cursor: pointer;
    text-align: left;
    color: var(--text-primary);
    transition:
      background-color 0.2s,
      border-color 0.2s;
    position: relative;
  }

  .recent-item:hover:not(:disabled) {
    background-color: var(--bg-hover);
    border-color: var(--border-hover);
  }

  .recent-item:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }

  .repo-name {
    font-size: 1rem;
    font-weight: 500;
    margin-bottom: 0.25rem;
  }

  .repo-path {
    font-size: 0.8rem;
    color: var(--text-muted);
    word-break: break-all;
  }

  .loading-indicator {
    position: absolute;
    right: 1rem;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.8rem;
    color: var(--accent-color);
  }
</style>
