<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import * as d3 from 'd3'
  import { repository } from '../stores/repository'
  import { commitStore } from '../stores/commit'
  import { selectedObjectStore, highlightedSha } from '../stores/selectedObject'
  import { theme } from '../stores/theme'
  import { toastStore } from '../stores/toast'
  import { isIpcError } from '../utils/ipcError'

  interface GraphNode extends d3.SimulationNodeDatum {
    id: string
    type: 'commit' | 'tree' | 'blob'
    label: string
    name?: string
  }

  interface GraphEdge {
    source: string | GraphNode
    target: string | GraphNode
  }

  let container: HTMLDivElement
  let svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null
  let simulation: d3.Simulation<GraphNode, GraphEdge> | null = null
  let zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null
  let graphGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null
  let currentNodes: GraphNode[] = []

  let isLoading = $state(false)
  let error = $state<string | null>(null)

  // Subscribe to repository and commit store
  let repoPath: string | null = null
  let selectedSha: string | null = null

  const unsubscribeRepo = repository.subscribe((state) => {
    repoPath = state.path
  })

  const unsubscribeCommit = commitStore.subscribe((state) => {
    selectedSha = state.selectedSha
    if (repoPath && selectedSha) {
      loadGraph(repoPath, selectedSha)
    } else {
      clearGraph()
    }
  })

  // Subscribe to highlighted SHA for file explorer -> graph connection
  const unsubscribeHighlight = highlightedSha.subscribe((sha) => {
    highlightNode(sha)
  })

  // Subscribe to theme changes to update graph colors
  const unsubscribeTheme = theme.subscribe(() => {
    if (repoPath && selectedSha && currentNodes.length > 0) {
      updateGraphColors()
    }
  })

  // Get node colors from CSS variables
  function getNodeColors(): Record<string, string> {
    if (!container) {
      return {
        commit: '#4a90d9',
        tree: '#50c878',
        blob: '#f5a623'
      }
    }
    const style = getComputedStyle(container)
    return {
      commit: style.getPropertyValue('--node-commit').trim() || '#4a90d9',
      tree: style.getPropertyValue('--node-tree').trim() || '#50c878',
      blob: style.getPropertyValue('--node-blob').trim() || '#f5a623'
    }
  }

  function getGraphColors() {
    if (!container) {
      return {
        nodeStroke: '#ffffff',
        edgeColor: '#666666',
        arrowColor: '#666666',
        labelColor: '#cccccc',
        nameColor: '#888888'
      }
    }
    const style = getComputedStyle(container)
    return {
      nodeStroke: style.getPropertyValue('--node-stroke').trim() || '#ffffff',
      edgeColor: style.getPropertyValue('--edge-color').trim() || '#666666',
      arrowColor: style.getPropertyValue('--arrow-color').trim() || '#666666',
      labelColor: style.getPropertyValue('--node-label-color').trim() || '#cccccc',
      nameColor: style.getPropertyValue('--node-name-color').trim() || '#888888'
    }
  }

  function updateGraphColors() {
    if (!graphGroup || !svg) return

    const nodeColors = getNodeColors()
    const graphColors = getGraphColors()

    // Update node fill colors
    graphGroup.selectAll<SVGCircleElement, GraphNode>('.node circle')
      .attr('fill', (d) => nodeColors[d.type] || '#999')
      .filter(':not(.highlighted)')
      .attr('stroke', graphColors.nodeStroke)

    // Update labels
    graphGroup.selectAll<SVGTextElement, GraphNode>('.node text')
      .filter(function() {
        return (this as SVGTextElement).getAttribute('dy') === '30'
      })
      .attr('fill', graphColors.labelColor)

    graphGroup.selectAll<SVGTextElement, GraphNode>('.node text')
      .filter(function() {
        return (this as SVGTextElement).getAttribute('dy') === '42'
      })
      .attr('fill', graphColors.nameColor)

    // Update edges
    graphGroup.selectAll('.links line')
      .attr('stroke', graphColors.edgeColor)

    // Update arrow marker
    svg.select('#arrowhead path')
      .attr('fill', graphColors.arrowColor)
  }

  function clearGraph() {
    if (svg) {
      svg.selectAll('*').remove()
    }
    if (simulation) {
      simulation.stop()
      simulation = null
    }
    zoomBehavior = null
    graphGroup = null
    currentNodes = []
  }

  // Zoom control functions
  function handleZoomIn() {
    if (!svg || !zoomBehavior) return
    svg.transition().duration(300).call(zoomBehavior.scaleBy, 1.3)
  }

  function handleZoomOut() {
    if (!svg || !zoomBehavior) return
    svg.transition().duration(300).call(zoomBehavior.scaleBy, 0.7)
  }

  function handleFitToScreen() {
    if (!svg || !zoomBehavior || !container || currentNodes.length === 0) return

    const width = container.clientWidth
    const height = container.clientHeight

    // Calculate bounds of all nodes
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const node of currentNodes) {
      const x = node.x ?? 0
      const y = node.y ?? 0
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }

    // Add padding
    const padding = 50
    minX -= padding
    maxX += padding
    minY -= padding
    maxY += padding

    const graphWidth = maxX - minX
    const graphHeight = maxY - minY

    // Calculate scale to fit
    const scale = Math.min(
      width / graphWidth,
      height / graphHeight,
      3 // max zoom
    )
    const clampedScale = Math.max(0.1, Math.min(scale, 3))

    // Calculate translation to center
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    const translateX = width / 2 - centerX * clampedScale
    const translateY = height / 2 - centerY * clampedScale

    svg.transition().duration(500).call(
      zoomBehavior.transform,
      d3.zoomIdentity.translate(translateX, translateY).scale(clampedScale)
    )
  }

  function highlightNode(sha: string | null) {
    if (!graphGroup) return

    const graphColors = getGraphColors()

    // Remove previous highlight
    graphGroup.selectAll('.node circle')
      .classed('highlighted', false)
      .attr('stroke', graphColors.nodeStroke)
      .attr('stroke-width', 2)

    if (!sha) return

    // Find the node with this SHA
    const targetNode = currentNodes.find(n => n.id === sha)
    if (!targetNode) return

    // Add highlight to the matching node
    graphGroup.selectAll<SVGGElement, GraphNode>('.node')
      .filter(d => d.id === sha)
      .select('circle')
      .classed('highlighted', true)
      .attr('stroke', '#ff4444')
      .attr('stroke-width', 4)

    // Pan to center on the highlighted node
    panToNode(targetNode)
  }

  function panToNode(node: GraphNode) {
    if (!svg || !zoomBehavior || !container) return

    const width = container.clientWidth
    const height = container.clientHeight

    const nodeX = node.x ?? 0
    const nodeY = node.y ?? 0

    // Get current transform
    const currentTransform = d3.zoomTransform(svg.node()!)
    const currentScale = currentTransform.k

    // Calculate translation to center the node
    const translateX = width / 2 - nodeX * currentScale
    const translateY = height / 2 - nodeY * currentScale

    svg.transition().duration(500).call(
      zoomBehavior.transform,
      d3.zoomIdentity.translate(translateX, translateY).scale(currentScale)
    )
  }

  async function loadGraph(path: string, sha: string) {
    isLoading = true
    error = null

    try {
      const result = await window.api.git.buildObjectGraph(path, sha, 3)

      if (isIpcError(result)) {
        error = result.message
        toastStore.error(result.message)
        isLoading = false
        return
      }

      renderGraph(result.nodes as GraphNode[], result.edges)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '객체 그래프를 불러오는데 실패했습니다'
      error = errorMsg
      toastStore.error(errorMsg)
    } finally {
      isLoading = false
    }
  }

  function renderGraph(nodes: GraphNode[], edges: GraphEdge[]) {
    if (!container) return

    clearGraph()
    currentNodes = nodes

    const width = container.clientWidth
    const height = container.clientHeight

    const nodeColors = getNodeColors()
    const graphColors = getGraphColors()

    // Create SVG
    svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height])

    // Define arrow marker for edges
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .append('path')
      .attr('d', 'M 0,-5 L 10,0 L 0,5')
      .attr('fill', graphColors.arrowColor)

    // Create zoom behavior with constraints
    zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3]) // 0.1x to 3x zoom
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        if (graphGroup) {
          graphGroup.attr('transform', event.transform.toString())
        }
      })

    // Apply zoom behavior to SVG
    svg.call(zoomBehavior)
      .on('dblclick.zoom', null) // Disable double-click zoom

    // Create container group for zoom/pan
    const g = svg.append('g')
    graphGroup = g

    // Create simulation
    simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphEdge>(edges)
        .id((d) => d.id)
        .distance(80))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(35))

    // Create edges
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(edges)
      .join('line')
      .attr('stroke', graphColors.edgeColor)
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#arrowhead)')

    // Create node groups
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended))

    // Add circles to nodes
    node.append('circle')
      .attr('r', 15)
      .attr('fill', (d) => nodeColors[d.type] || '#999')
      .attr('stroke', graphColors.nodeStroke)
      .attr('stroke-width', 2)

    // Add labels to nodes
    node.append('text')
      .text((d) => d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', 30)
      .attr('font-size', '10px')
      .attr('fill', graphColors.labelColor)

    // Add name labels if available
    node.filter((d) => d.name !== undefined)
      .append('text')
      .text((d) => d.name || '')
      .attr('text-anchor', 'middle')
      .attr('dy', 42)
      .attr('font-size', '9px')
      .attr('fill', graphColors.nameColor)

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as GraphNode).x || 0)
        .attr('y1', (d) => (d.source as GraphNode).y || 0)
        .attr('x2', (d) => (d.target as GraphNode).x || 0)
        .attr('y2', (d) => (d.target as GraphNode).y || 0)

      node.attr('transform', (d) => `translate(${d.x || 0},${d.y || 0})`)
    })

    // Drag functions
    function dragstarted(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>) {
      if (!event.active && simulation) simulation.alphaTarget(0.3).restart()
      event.subject.fx = event.subject.x
      event.subject.fy = event.subject.y
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>) {
      event.subject.fx = event.x
      event.subject.fy = event.y
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>) {
      if (!event.active && simulation) simulation.alphaTarget(0)
      event.subject.fx = null
      event.subject.fy = null
    }

    // Node click handler
    function handleNodeClick(event: MouseEvent, d: GraphNode) {
      event.stopPropagation()
      // Clear previous highlight (from file explorer selection)
      selectedObjectStore.clearHighlight()
      selectedObjectStore.select({
        id: d.id,
        type: d.type,
        label: d.label,
        name: d.name
      })
    }

    // Add click handlers to nodes
    node.on('click', handleNodeClick)
  }

  onMount(() => {
    // Initial load if we already have a selected commit
    if (repoPath && selectedSha) {
      loadGraph(repoPath, selectedSha)
    }
  })

  onDestroy(() => {
    unsubscribeRepo()
    unsubscribeCommit()
    unsubscribeHighlight()
    unsubscribeTheme()
    clearGraph()
  })
</script>

<div class="object-graph" bind:this={container}>
  {#if isLoading}
    <div class="loading">
      <span class="spinner"></span>
      <span>객체 그래프 생성 중...</span>
    </div>
  {:else if error}
    <div class="error">
      <span>오류: {error}</span>
    </div>
  {:else if !selectedSha}
    <div class="placeholder">
      <h2 class="panel-title">객체 그래프</h2>
      <p>커밋을 선택하면 객체 그래프가 표시됩니다</p>
    </div>
  {/if}

  {#if selectedSha && !isLoading && !error}
    <div class="zoom-controls">
      <button class="zoom-btn" onclick={handleZoomIn} title="확대">+</button>
      <button class="zoom-btn" onclick={handleZoomOut} title="축소">-</button>
      <button class="zoom-btn fit-btn" onclick={handleFitToScreen} title="맞춤">맞춤</button>
    </div>
  {/if}
</div>

<style>
  .object-graph {
    height: 100%;
    width: 100%;
    background-color: var(--bg-primary);
    position: relative;
    overflow: hidden;
  }

  .placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-muted);
  }

  .panel-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
  }

  .placeholder p {
    font-size: 0.875rem;
    margin: 0;
  }

  .loading, .error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 0.5rem;
    color: var(--text-muted);
  }

  .error {
    color: var(--error-color);
  }

  .spinner {
    width: 24px;
    height: 24px;
    border: 3px solid var(--spinner-track);
    border-top-color: var(--spinner-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .object-graph :global(svg) {
    display: block;
  }

  .object-graph :global(.node) {
    cursor: pointer;
  }

  .object-graph :global(.node:hover circle) {
    filter: brightness(1.2);
  }

  .object-graph :global(.node circle.highlighted) {
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% {
      filter: drop-shadow(0 0 0 rgba(255, 68, 68, 0));
    }
    50% {
      filter: drop-shadow(0 0 8px rgba(255, 68, 68, 0.8));
    }
  }

  /* Zoom controls */
  .zoom-controls {
    position: absolute;
    top: 12px;
    right: 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    z-index: 10;
  }

  .zoom-btn {
    width: 32px;
    height: 32px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background-color: var(--bg-tertiary);
    color: var(--text-secondary);
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s, border-color 0.2s;
  }

  .zoom-btn:hover {
    background-color: var(--bg-hover);
    border-color: var(--text-dimmed);
  }

  .zoom-btn:active {
    background-color: var(--text-dimmed);
  }

  .fit-btn {
    width: auto;
    padding: 0 10px;
    font-size: 12px;
    font-weight: normal;
  }
</style>
