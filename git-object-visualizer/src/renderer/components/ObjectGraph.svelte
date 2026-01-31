<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import * as d3 from 'd3'
  import { repository } from '../stores/repository'
  import { commitStore } from '../stores/commit'
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

  // Node colors by type
  const nodeColors: Record<string, string> = {
    commit: '#4a90d9', // blue
    tree: '#50c878',   // green
    blob: '#f5a623'    // orange
  }

  function clearGraph() {
    if (svg) {
      svg.selectAll('*').remove()
    }
    if (simulation) {
      simulation.stop()
      simulation = null
    }
  }

  async function loadGraph(path: string, sha: string) {
    isLoading = true
    error = null

    try {
      const result = await window.api.git.buildObjectGraph(path, sha, 3)

      if (isIpcError(result)) {
        error = result.message
        isLoading = false
        return
      }

      renderGraph(result.nodes as GraphNode[], result.edges)
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load object graph'
    } finally {
      isLoading = false
    }
  }

  function renderGraph(nodes: GraphNode[], edges: GraphEdge[]) {
    if (!container) return

    clearGraph()

    const width = container.clientWidth
    const height = container.clientHeight

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
      .attr('fill', '#666')

    // Create container group for zoom/pan
    const g = svg.append('g')

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
      .attr('stroke', '#666')
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
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)

    // Add labels to nodes
    node.append('text')
      .text((d) => d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', 30)
      .attr('font-size', '10px')
      .attr('fill', '#ccc')

    // Add name labels if available
    node.filter((d) => d.name !== undefined)
      .append('text')
      .text((d) => d.name || '')
      .attr('text-anchor', 'middle')
      .attr('dy', 42)
      .attr('font-size', '9px')
      .attr('fill', '#888')

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
    clearGraph()
  })
</script>

<div class="object-graph" bind:this={container}>
  {#if isLoading}
    <div class="loading">
      <span class="spinner"></span>
      <span>객체 그래프 로딩 중...</span>
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
</div>

<style>
  .object-graph {
    height: 100%;
    width: 100%;
    background-color: #1e1e1e;
    position: relative;
    overflow: hidden;
  }

  .placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #888;
  }

  .panel-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: #888;
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

  .object-graph :global(svg) {
    display: block;
  }

  .object-graph :global(.node) {
    cursor: pointer;
  }

  .object-graph :global(.node:hover circle) {
    filter: brightness(1.2);
  }
</style>
