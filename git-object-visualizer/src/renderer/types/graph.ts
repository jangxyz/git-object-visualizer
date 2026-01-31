export interface GraphNode {
  id: string
  type: 'commit' | 'tree' | 'blob'
  label: string
  name?: string
}

export interface GraphEdge {
  source: string
  target: string
}

export interface ObjectGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}
