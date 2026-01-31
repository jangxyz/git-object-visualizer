<script lang="ts">
  import Header from './Header.svelte'
  import FileExplorer from './FileExplorer.svelte'
  import ObjectGraph from './ObjectGraph.svelte'
  import CommitTimeline from './CommitTimeline.svelte'
  import ObjectDetailPanel from './ObjectDetailPanel.svelte'

  interface Props {
    repositoryName: string
    onOpenAnother: () => void
  }

  let { repositoryName, onOpenAnother }: Props = $props()
</script>

<div class="main-layout">
  <Header {repositoryName} {onOpenAnother} />

  <div class="content">
    <div class="top-section">
      <div class="file-explorer-panel">
        <FileExplorer />
      </div>
      <div class="object-graph-panel">
        <ObjectGraph />
      </div>
    </div>
    <div class="timeline-panel">
      <CommitTimeline />
    </div>
  </div>

  <ObjectDetailPanel />
</div>

<style>
  .main-layout {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background-color: #1e1e1e;
  }

  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .top-section {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .file-explorer-panel {
    width: 250px;
    flex-shrink: 0;
    overflow: hidden;
  }

  .object-graph-panel {
    flex: 1;
    overflow: hidden;
  }

  .timeline-panel {
    height: 150px;
    flex-shrink: 0;
    overflow: hidden;
  }
</style>
