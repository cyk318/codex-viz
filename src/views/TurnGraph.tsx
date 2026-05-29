import { useMemo } from 'react';
import { Background, Controls, ReactFlow, type Edge, type Node } from '@xyflow/react';
import dagre from 'dagre';
import type { TurnGraph as TurnGraphData } from '../lib/types';

export function TurnGraph({ graph }: { graph: TurnGraphData }) {
  const { nodes, edges } = useMemo(() => layout(graph), [graph]);
  return (
    <div className="h-[calc(100vh-250px)] overflow-hidden rounded border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

function layout(graph: TurnGraphData): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 35, ranksep: 80 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of graph.nodes) g.setNode(node.id, { width: 190, height: 58 });
  for (const edge of graph.edges) g.setEdge(edge.source, edge.target);
  dagre.layout(g);

  return {
    nodes: graph.nodes.map((node) => {
      const pos = g.node(node.id) || { x: 0, y: 0 };
      return {
        id: node.id,
        position: { x: pos.x - 95, y: pos.y - 29 },
        data: { label: node.label },
        className: node.type === 'patch' ? 'border-red-300 bg-red-50 dark:bg-red-950' : undefined
      };
    }),
    edges: graph.edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target }))
  };
}
