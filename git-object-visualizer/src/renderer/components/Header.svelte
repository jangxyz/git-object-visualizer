<script lang="ts">
  interface Props {
    repositoryName: string
    onOpenAnother: () => void
  }

  let { repositoryName, onOpenAnother }: Props = $props()
</script>

<header class="header">
  <h1 class="repo-name">{repositoryName}</h1>
  <button class="open-another-btn" onclick={onOpenAnother}>
    다른 저장소 열기
  </button>
</header>

<style>
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    background-color: #252526;
    border-bottom: 1px solid #3c3c3c;
  }

  .repo-name {
    font-size: 1rem;
    font-weight: 600;
    color: #fff;
  }

  .open-another-btn {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    background-color: transparent;
    color: #4a9eff;
    border: 1px solid #4a9eff;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .open-another-btn:hover {
    background-color: #4a9eff;
    color: white;
  }
</style>
