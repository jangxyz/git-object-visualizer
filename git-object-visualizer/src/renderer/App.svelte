<script lang="ts">
  import { repository, isRepositoryOpen } from './stores/repository'
  import MainLayout from './components/MainLayout.svelte'

  let isLoading = false

  async function handleOpenRepository() {
    isLoading = true
    repository.clearError()

    try {
      const selectedPath = await window.api.dialog.openFolder()

      if (!selectedPath) {
        // User cancelled the dialog
        isLoading = false
        return
      }

      const isValid = await window.api.git.isValidRepository(selectedPath)

      if (isValid) {
        // Extract repository name from path
        const repoName = selectedPath.split(/[/\\]/).pop() || selectedPath
        repository.setRepository(selectedPath, repoName)
      } else {
        repository.setError('유효한 Git 저장소가 아닙니다')
      }
    } catch (error) {
      repository.setError('저장소를 여는 중 오류가 발생했습니다')
    } finally {
      isLoading = false
    }
  }

  function handleOpenAnother() {
    repository.reset()
  }
</script>

{#if $isRepositoryOpen}
  <MainLayout repositoryName={$repository.name ?? ''} onOpenAnother={handleOpenAnother} />
{:else}
    <div class="welcome">
      <h1>Git Object Visualizer</h1>
      <p>Git 내부 객체 구조를 시각적으로 탐색하세요</p>

      <button class="open-repo-btn" onclick={handleOpenRepository} disabled={isLoading}>
        {#if isLoading}
          열는 중...
        {:else}
          저장소 열기
        {/if}
      </button>

      {#if $repository.error}
        <p class="error">{$repository.error}</p>
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
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
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
</style>
