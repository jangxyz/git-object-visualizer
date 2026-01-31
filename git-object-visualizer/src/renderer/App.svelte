<script lang="ts">
  import { repository, isRepositoryOpen } from "./stores/repository";
  import {
    recentRepositories,
    type RecentRepository,
  } from "./stores/recentRepositories";
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

<style>
  :global(*) {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
      Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
    background-color: #1e1e1e;
    color: #fff;
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
  }

  .welcome p {
    color: #888;
  }

  .open-repo-btn {
    margin-top: 2rem;
    padding: 1rem 2rem;
    font-size: 1.1rem;
    background-color: #4a9eff;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .open-repo-btn:hover:not(:disabled) {
    background-color: #3a8eef;
  }

  .open-repo-btn:disabled {
    background-color: #666;
    cursor: not-allowed;
  }

  .error {
    margin-top: 1rem;
    color: #ff6b6b;
    font-size: 0.9rem;
  }

  .recent-section {
    margin-top: 3rem;
    width: 100%;
    max-width: 500px;
  }

  .recent-section h2 {
    font-size: 1rem;
    color: #888;
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
    background-color: #2a2a2a;
    border: 1px solid #3a3a3a;
    border-radius: 6px;
    cursor: pointer;
    text-align: left;
    color: #fff;
    transition:
      background-color 0.2s,
      border-color 0.2s;
    position: relative;
  }

  .recent-item:hover:not(:disabled) {
    background-color: #333;
    border-color: #4a9eff;
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
    color: #888;
    word-break: break-all;
  }

  .loading-indicator {
    position: absolute;
    right: 1rem;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.8rem;
    color: #4a9eff;
  }
</style>
