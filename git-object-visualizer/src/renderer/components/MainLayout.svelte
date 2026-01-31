<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
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

  const STORAGE_KEY = 'git-visualizer-panel-sizes'
  const MIN_SIZE = 100

  interface PanelSizes {
    fileExplorerWidth: number
    timelineHeight: number
  }

  const DEFAULT_SIZES: PanelSizes = {
    fileExplorerWidth: 250,
    timelineHeight: 150
  }

  let fileExplorerWidth = $state(DEFAULT_SIZES.fileExplorerWidth)
  let timelineHeight = $state(DEFAULT_SIZES.timelineHeight)

  let isResizingHorizontal = $state(false)
  let isResizingVertical = $state(false)

  let contentRef: HTMLDivElement | null = $state(null)

  function loadSizes(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const sizes: PanelSizes = JSON.parse(saved)
        fileExplorerWidth = sizes.fileExplorerWidth ?? DEFAULT_SIZES.fileExplorerWidth
        timelineHeight = sizes.timelineHeight ?? DEFAULT_SIZES.timelineHeight
      }
    } catch {
      // Use defaults on error
    }
  }

  function saveSizes(): void {
    try {
      const sizes: PanelSizes = { fileExplorerWidth, timelineHeight }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sizes))
    } catch {
      // Ignore storage errors
    }
  }

  function startHorizontalResize(event: MouseEvent): void {
    event.preventDefault()
    isResizingHorizontal = true
  }

  function startVerticalResize(event: MouseEvent): void {
    event.preventDefault()
    isResizingVertical = true
  }

  function handleMouseMove(event: MouseEvent): void {
    if (!contentRef) return

    if (isResizingHorizontal) {
      const contentRect = contentRef.getBoundingClientRect()
      const newWidth = event.clientX - contentRect.left
      const maxWidth = contentRect.width - MIN_SIZE - 6 // 6px for resizer
      fileExplorerWidth = Math.max(MIN_SIZE, Math.min(newWidth, maxWidth))
    }

    if (isResizingVertical) {
      const contentRect = contentRef.getBoundingClientRect()
      const newHeight = contentRect.bottom - event.clientY
      const maxHeight = contentRect.height - MIN_SIZE - 6 // 6px for resizer
      timelineHeight = Math.max(MIN_SIZE, Math.min(newHeight, maxHeight))
    }
  }

  function handleMouseUp(): void {
    if (isResizingHorizontal || isResizingVertical) {
      saveSizes()
    }
    isResizingHorizontal = false
    isResizingVertical = false
  }

  onMount(() => {
    loadSizes()
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  })

  onDestroy(() => {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  })
</script>

<div class="main-layout" class:resizing-horizontal={isResizingHorizontal} class:resizing-vertical={isResizingVertical}>
  <Header {repositoryName} {onOpenAnother} />

  <div class="content" bind:this={contentRef}>
    <div class="top-section">
      <div class="file-explorer-panel" style="width: {fileExplorerWidth}px">
        <FileExplorer />
      </div>
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <div
        class="resizer resizer-horizontal"
        role="separator"
        aria-orientation="vertical"
        tabindex="0"
        onmousedown={startHorizontalResize}
        onkeydown={(e) => {
          if (e.key === 'ArrowLeft') fileExplorerWidth = Math.max(MIN_SIZE, fileExplorerWidth - 10)
          if (e.key === 'ArrowRight') fileExplorerWidth = Math.min(contentRef ? contentRef.offsetWidth - MIN_SIZE - 6 : fileExplorerWidth, fileExplorerWidth + 10)
          saveSizes()
        }}
      ></div>
      <div class="object-graph-panel">
        <ObjectGraph />
      </div>
    </div>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      class="resizer resizer-vertical"
      role="separator"
      aria-orientation="horizontal"
      tabindex="0"
      onmousedown={startVerticalResize}
      onkeydown={(e) => {
        if (e.key === 'ArrowUp') timelineHeight = Math.min(contentRef ? contentRef.offsetHeight - MIN_SIZE - 6 : timelineHeight, timelineHeight + 10)
        if (e.key === 'ArrowDown') timelineHeight = Math.max(MIN_SIZE, timelineHeight - 10)
        saveSizes()
      }}
    ></div>
    <div class="timeline-panel" style="height: {timelineHeight}px">
      <CommitTimeline />
    </div>
  </div>

  <ObjectDetailPanel />
</div>

<style>
  .main-layout {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: var(--bg-primary);
  }

  .main-layout.resizing-horizontal {
    cursor: col-resize;
    user-select: none;
  }

  .main-layout.resizing-vertical {
    cursor: row-resize;
    user-select: none;
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
    min-height: 100px;
  }

  .file-explorer-panel {
    flex-shrink: 0;
    overflow: hidden;
    min-width: 100px;
  }

  .object-graph-panel {
    flex: 1;
    overflow: hidden;
    min-width: 100px;
  }

  .timeline-panel {
    flex-shrink: 0;
    overflow: hidden;
    min-height: 100px;
  }

  .resizer {
    background-color: var(--bg-hover);
    flex-shrink: 0;
    transition: background-color 0.15s;
  }

  .resizer:hover,
  .resizer:active {
    background-color: var(--spinner-color);
  }

  .resizer-horizontal {
    width: 6px;
    cursor: col-resize;
  }

  .resizer-vertical {
    height: 6px;
    cursor: row-resize;
  }
</style>
