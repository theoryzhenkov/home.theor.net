import * as d3 from 'd3';
import type { GraphData, GraphEdge, EdgeType } from '@/lib/graph-data';
import { EDGE_STYLES, NODE_COLORS } from './styles';

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  title: string;
  connections: number;
  componentId: number;
  componentSize: number;
  anchorX: number;
  anchorY: number;
  didDrag: boolean;
}

interface SimEdge extends d3.SimulationLinkDatum<SimNode> {
  type: EdgeType;
}

export interface GraphConfig {
  visibleTypes?: Set<EdgeType>;
  highlightNode?: string;
  zoomable?: boolean;
  draggable?: boolean;
  onFocusChange?: (nodeId: string | null) => void;
}

export interface GraphInstance {
  destroy(): void;
  resize(): void;
  setVisibleTypes(types: Set<EdgeType>): void;
  resetView(): void;
  focusNode(nodeId: string): void;
  clearFocus(): void;
}

function slugToHref(slug: string): string {
  return slug === 'index' ? '/' : `/${slug}/`;
}

function nodeRadius(connections: number): number {
  return Math.max(4, Math.min(16, 4 + Math.sqrt(connections) * 2.5));
}

function nodeCollisionRadius(node: SimNode): number {
  return Math.max(
    nodeRadius(node.connections) + 10,
    Math.min(72, nodeRadius(node.connections) + 14 + node.title.length * 1.55),
  );
}

function edgeKey(edge: SimEdge): string {
  const source = typeof edge.source === 'object' ? edge.source.id : edge.source;
  const target = typeof edge.target === 'object' ? edge.target.id : edge.target;
  return `${source}-${target}-${edge.type}`;
}

function labelDirection(node: SimNode): 1 | -1 {
  const basis = node.componentSize === 1 ? 0 : node.anchorX;
  return (node.x ?? node.anchorX) >= basis ? 1 : -1;
}

function buildComponents(nodes: string[], edges: GraphEdge[]): string[][] {
  const adjacency = new Map<string, Set<string>>();

  nodes.forEach((id) => adjacency.set(id, new Set()));
  edges.forEach((edge) => {
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  });

  const seen = new Set<string>();
  const components: string[][] = [];

  for (const id of nodes) {
    if (seen.has(id)) continue;

    const queue = [id];
    const component: string[] = [];
    seen.add(id);

    while (queue.length > 0) {
      const current = queue.shift()!;
      component.push(current);

      for (const next of adjacency.get(current) ?? []) {
        if (seen.has(next)) continue;
        seen.add(next);
        queue.push(next);
      }
    }

    components.push(component.sort());
  }

  return components.sort((a, b) => b.length - a.length || a[0].localeCompare(b[0]));
}

function assignComponentAnchors(nodes: SimNode[], edges: GraphEdge[]): void {
  const components = buildComponents(nodes.map((node) => node.id), edges);
  const placement = new Map<string, { componentId: number; componentSize: number; anchorX: number; anchorY: number }>();

  components.forEach((component, index) => {
    const size = component.length;
    let anchorX = 0;
    let anchorY = 0;

    if (index > 0) {
      const ring = Math.floor((index - 1) / 8) + 1;
      const slot = (index - 1) % 8;
      const angle = (slot / 8) * Math.PI * 2 - Math.PI / 2;
      const ringRadius = size === 1 ? 118 + ring * 26 : 112 + ring * 60;
      anchorX = Math.cos(angle) * ringRadius;
      anchorY = Math.sin(angle) * ringRadius;
    }

    component.forEach((id) => {
      placement.set(id, {
        componentId: index,
        componentSize: size,
        anchorX,
        anchorY,
      });
    });
  });

  const membersByComponent = new Map<number, SimNode[]>();
  nodes.forEach((node) => {
    const placementInfo = placement.get(node.id) ?? {
      componentId: 0,
      componentSize: 1,
      anchorX: 0,
      anchorY: 0,
    };

    node.componentId = placementInfo.componentId;
    node.componentSize = placementInfo.componentSize;
    node.anchorX = placementInfo.anchorX;
    node.anchorY = placementInfo.anchorY;

    const members = membersByComponent.get(node.componentId) ?? [];
    members.push(node);
    membersByComponent.set(node.componentId, members);
  });

  for (const members of membersByComponent.values()) {
    const sorted = members.sort((a, b) => b.connections - a.connections || a.id.localeCompare(b.id));
    const size = sorted[0]?.componentSize ?? 1;
    const localRadius = size === 1 ? 0 : Math.min(160, 34 + Math.sqrt(size) * 26);

    sorted.forEach((node, index) => {
      if (size === 1) {
        node.x = node.anchorX;
        node.y = node.anchorY;
        node.vx = 0;
        node.vy = 0;
        return;
      }

      const angle = (index / size) * Math.PI * 2 - Math.PI / 2;
      const wobble = index % 2 === 0 ? 0.9 : 1.1;

      node.x = node.anchorX + Math.cos(angle) * localRadius * wobble;
      node.y = node.anchorY + Math.sin(angle) * localRadius * wobble;
      node.vx = 0;
      node.vy = 0;
    });
  }
}

function edgeGeometry(edge: SimEdge): {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  labelX: number;
  labelY: number;
  length: number;
} {
  const source = edge.source as SimNode;
  const target = edge.target as SimNode;
  const dx = (target.x ?? 0) - (source.x ?? 0);
  const dy = (target.y ?? 0) - (source.y ?? 0);
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const nx = -uy;
  const ny = ux;

  const sourceOffset = nodeRadius(source.connections) + 2;
  const targetOffset = nodeRadius(target.connections) + (EDGE_STYLES[edge.type].directed ? 8 : 2);
  const x1 = (source.x ?? 0) + ux * sourceOffset;
  const y1 = (source.y ?? 0) + uy * sourceOffset;
  const x2 = (target.x ?? 0) - ux * targetOffset;
  const y2 = (target.y ?? 0) - uy * targetOffset;
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const labelOffset = 12;

  return {
    x1,
    y1,
    x2,
    y2,
    labelX: midX + nx * labelOffset,
    labelY: midY + ny * labelOffset,
    length,
  };
}

function defaultTransform(width: number, height: number): d3.ZoomTransform {
  return d3.zoomIdentity.translate(width / 2, height / 2).scale(1.12);
}

export function createGraph(
  container: HTMLElement,
  data: GraphData,
  config: GraphConfig = {},
): GraphInstance {
  const {
    highlightNode,
    zoomable = true,
    draggable = true,
    onFocusChange,
  } = config;

  let visibleTypes = config.visibleTypes ?? new Set(Object.keys(EDGE_STYLES) as EdgeType[]);
  let focusedNodeId: string | null = highlightNode ?? null;
  let suppressAnchorUntil = 0;

  let width = container.clientWidth;
  let height = container.clientHeight;
  let initialTransform = defaultTransform(width, height);
  let currentTransform = initialTransform;

  const svg = d3.select(container)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${width} ${height}`);

  const defs = svg.append('defs');
  for (const [type, style] of Object.entries(EDGE_STYLES) as [EdgeType, typeof EDGE_STYLES[EdgeType]][]) {
    if (!style.directed) continue;
    defs.append('marker')
      .attr('id', `arrow-${type}`)
      .attr('viewBox', '0 -3 6 6')
      .attr('refX', 6.5)
      .attr('refY', 0)
      .attr('markerWidth', 4.25)
      .attr('markerHeight', 4.25)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-3L6,0L0,3')
      .style('fill', style.color);
  }

  const g = svg.append('g');

  let zoom: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;

  if (zoomable) {
    zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 5])
      .on('start', (event) => {
        if (event.sourceEvent && focusedNodeId) {
          clearFocusInternal({ notify: true });
        }
      })
      .on('zoom', (event) => {
        currentTransform = event.transform;
        g.attr('transform', event.transform);
      });
    svg.call(zoom);
    svg.property('__zoom', initialTransform);
  }

  g.attr('transform', initialTransform.toString());

  const simNodes: SimNode[] = data.nodes.map((node) => ({
    ...node,
    componentId: 0,
    componentSize: 1,
    anchorX: 0,
    anchorY: 0,
    didDrag: false,
  }));
  const nodeMap = new Map(simNodes.map((node) => [node.id, node]));

  const simEdges: SimEdge[] = data.edges
    .filter((edge) => nodeMap.has(edge.source) && nodeMap.has(edge.target))
    .map((edge) => ({
      source: nodeMap.get(edge.source)!,
      target: nodeMap.get(edge.target)!,
      type: edge.type,
    }));

  assignComponentAnchors(simNodes, data.edges);

  const simulation = d3.forceSimulation<SimNode>(simNodes)
    .force('link', d3.forceLink<SimNode, SimEdge>(simEdges)
      .id((node) => node.id)
      .distance((edge) => {
        if (edge.type === 'part_of') return 86;
        if (edge.type === 'is') return 94;
        if (edge.type === 'subclass_of') return 98;
        if (edge.type === 'next') return 102;
        if (edge.type === 'related') return 120;
        return 114;
      }))
    .force('charge', d3.forceManyBody<SimNode>().strength((node) => {
      if (node.componentSize === 1) return -18;
      return -118 - Math.min(node.connections, 12) * 5;
    }))
    .force('x', d3.forceX<SimNode>((node) => node.anchorX).strength((node) => {
      return node.componentSize === 1 ? 0.14 : 0.065;
    }))
    .force('y', d3.forceY<SimNode>((node) => node.anchorY).strength((node) => {
      return node.componentSize === 1 ? 0.14 : 0.065;
    }))
    .force('center', d3.forceCenter(0, 0))
    .force('collide', d3.forceCollide<SimNode>().radius((node) => nodeCollisionRadius(node)))
    .alphaDecay(0.04)
    .velocityDecay(0.45);

  const edgeGroup = g.append('g').attr('class', 'graph-edges');
  const edgeLabelGroup = g.append('g').attr('class', 'graph-edge-labels');
  const nodeGroup = g.append('g').attr('class', 'graph-nodes');

  const edgeSelection = edgeGroup.selectAll<SVGLineElement, SimEdge>('line')
    .data(simEdges, edgeKey)
    .join('line')
    .style('stroke', (edge) => EDGE_STYLES[edge.type].color)
    .attr('stroke-width', (edge) => EDGE_STYLES[edge.type].width)
    .attr('stroke-dasharray', (edge) => EDGE_STYLES[edge.type].dasharray)
    .attr('marker-end', (edge) => EDGE_STYLES[edge.type].directed ? `url(#arrow-${edge.type})` : null)
    .attr('stroke-linecap', 'round')
    .attr('opacity', 0.82);

  const edgeLabelSelection = edgeLabelGroup.selectAll<SVGTextElement, SimEdge>('text')
    .data(simEdges, edgeKey)
    .join('text')
    .text((edge) => EDGE_STYLES[edge.type].shortLabel)
    .style('fill', (edge) => EDGE_STYLES[edge.type].color)
    .style('font-family', NODE_COLORS.fontFamily)
    .attr('font-size', '9.5px')
    .attr('letter-spacing', '0.04em')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('paint-order', 'stroke')
    .style('stroke', NODE_COLORS.labelStroke)
    .attr('stroke-width', 4)
    .attr('stroke-linejoin', 'round')
    .attr('opacity', 0.72);

  const nodeGs = nodeGroup.selectAll<SVGGElement, SimNode>('g')
    .data(simNodes)
    .join('g')
    .attr('class', 'graph-node')
    .attr('cursor', draggable ? 'grab' : 'pointer');

  const nodeLinks = nodeGs.append('a')
    .attr('href', (node) => slugToHref(node.id))
    .attr('class', 'graph-node-link')
    .attr('data-astro-prefetch', 'hover')
    .on('click', (event) => {
      if (performance.now() < suppressAnchorUntil) {
        event.preventDefault();
        event.stopPropagation();
      }
    });

  const nodeCircles = nodeLinks.append('circle')
    .attr('r', (node) => nodeRadius(node.connections))
    .style('fill', NODE_COLORS.fill)
    .style('stroke', NODE_COLORS.stroke)
    .attr('stroke-width', 1.15);

  const nodeLabels = nodeLinks.append('text')
    .text((node) => node.title)
    .attr('y', 0)
    .attr('font-size', '11.5px')
    .style('font-family', NODE_COLORS.fontFamily)
    .style('fill', NODE_COLORS.labelFill)
    .attr('font-weight', NODE_COLORS.labelWeight)
    .attr('paint-order', 'stroke')
    .style('stroke', NODE_COLORS.labelStroke)
    .attr('stroke-width', 3)
    .attr('stroke-linejoin', 'round')
    .attr('pointer-events', 'none');

  function applyTransform(transform: d3.ZoomTransform, animate = false): void {
    currentTransform = transform;
    if (zoom) {
      svg.property('__zoom', transform);
    }

    if (animate) {
      g.interrupt()
        .transition()
        .duration(180)
        .attr('transform', transform.toString());
      return;
    }

    g.interrupt().attr('transform', transform.toString());
  }

  function applyNodeStyles(): void {
    nodeCircles
      .style('fill', (node) => node.id === focusedNodeId ? NODE_COLORS.fillHighlight : NODE_COLORS.fill)
      .style('stroke', (node) => node.id === focusedNodeId ? NODE_COLORS.strokeHighlight : NODE_COLORS.stroke)
      .attr('stroke-width', (node) => node.id === focusedNodeId ? 2 : 1.15);

    nodeLabels
      .style('fill', (node) => node.id === focusedNodeId ? NODE_COLORS.fillHighlight : NODE_COLORS.labelFill)
      .attr('font-weight', (node) => node.id === focusedNodeId ? 650 : NODE_COLORS.labelWeight);
  }

  function syncEdgeVisibility(): void {
    edgeSelection
      .attr('display', (edge) => visibleTypes.has(edge.type) ? null : 'none')
      .attr('pointer-events', 'none')
      .attr('opacity', (edge) => visibleTypes.has(edge.type) ? 0.82 : 0);

    edgeLabelSelection
      .attr('opacity', (edge) => visibleTypes.has(edge.type) ? 0.72 : 0)
      .attr('display', (edge) => {
        if (!visibleTypes.has(edge.type)) return 'none';
        return edgeGeometry(edge).length > 74 ? null : 'none';
      });
  }

  function focusedTransform(node: SimNode, scale = Math.max(currentTransform.k, 1.05)): d3.ZoomTransform {
    return d3.zoomIdentity
      .translate(width / 2 - (node.x ?? 0) * scale, height / 2 - (node.y ?? 0) * scale)
      .scale(scale);
  }

  function syncFocusedView(animate = false): void {
    if (!focusedNodeId) return;
    const node = simNodes.find((candidate) => candidate.id === focusedNodeId);
    if (!node || node.x === undefined || node.y === undefined) return;
    applyTransform(focusedTransform(node), animate);
  }

  function clearFocusInternal(options: { notify?: boolean } = {}): void {
    const { notify = false } = options;
    if (!focusedNodeId) return;

    focusedNodeId = null;
    applyNodeStyles();

    if (notify) {
      onFocusChange?.(null);
    }
  }

  applyNodeStyles();
  syncEdgeVisibility();

  if (draggable) {
    const drag = d3.drag<SVGGElement, SimNode>()
      .on('start', (event, node) => {
        node.didDrag = false;
        if (!event.active) simulation.alphaTarget(0.3).restart();
        node.fx = node.x;
        node.fy = node.y;
      })
      .on('drag', (event, node) => {
        node.didDrag = true;
        node.fx = event.x;
        node.fy = event.y;
        if (focusedNodeId === node.id) {
          syncFocusedView(false);
        }
      })
      .on('end', (event, node) => {
        if (!event.active) simulation.alphaTarget(0);
        if (node.didDrag) {
          suppressAnchorUntil = performance.now() + 250;
        }
        node.fx = null;
        node.fy = null;
      });

    nodeGs.call(drag);
  }

  nodeGs
    .on('mouseenter', (_event, node) => {
      const connectedIds = new Set<string>();
      simEdges.forEach((edge) => {
        if (!visibleTypes.has(edge.type)) return;
        const source = (edge.source as SimNode).id;
        const target = (edge.target as SimNode).id;
        if (source === node.id) connectedIds.add(target);
        if (target === node.id) connectedIds.add(source);
      });
      connectedIds.add(node.id);

      nodeGs.attr('opacity', (candidate) => connectedIds.has(candidate.id) ? 1 : 0.15);
      edgeSelection.attr('opacity', (edge) =>
        visibleTypes.has(edge.type) &&
        ((edge.source as SimNode).id === node.id || (edge.target as SimNode).id === node.id) ? 0.96 : 0.06,
      );
      edgeLabelSelection.attr('opacity', (edge) =>
        visibleTypes.has(edge.type) &&
        ((edge.source as SimNode).id === node.id || (edge.target as SimNode).id === node.id) ? 0.92 : 0.08,
      );
    })
    .on('mouseleave', () => {
      nodeGs.attr('opacity', 1);
      syncEdgeVisibility();
    });

  simulation.on('tick', () => {
    edgeSelection
      .attr('x1', (edge) => edgeGeometry(edge).x1)
      .attr('y1', (edge) => edgeGeometry(edge).y1)
      .attr('x2', (edge) => edgeGeometry(edge).x2)
      .attr('y2', (edge) => edgeGeometry(edge).y2);

    edgeLabelSelection
      .attr('x', (edge) => edgeGeometry(edge).labelX)
      .attr('y', (edge) => edgeGeometry(edge).labelY)
      .attr('display', (edge) => {
        if (!visibleTypes.has(edge.type)) return 'none';
        return edgeGeometry(edge).length > 74 ? null : 'none';
      });

    nodeGs.attr('transform', (node) => `translate(${node.x},${node.y})`);

    nodeLabels
      .attr('x', (node) => labelDirection(node) * (nodeRadius(node.connections) + 8))
      .attr('text-anchor', (node) => labelDirection(node) > 0 ? 'start' : 'end');

    if (focusedNodeId) {
      syncFocusedView(false);
    }
  });

  return {
    destroy() {
      simulation.stop();
      svg.remove();
    },
    resize() {
      width = container.clientWidth;
      height = container.clientHeight;
      initialTransform = defaultTransform(width, height);
      svg.attr('viewBox', `0 0 ${width} ${height}`);
      if (focusedNodeId) {
        syncFocusedView(false);
      }
      simulation.force('center', d3.forceCenter(0, 0));
      simulation.alpha(0.25).restart();
    },
    setVisibleTypes(types: Set<EdgeType>) {
      visibleTypes = types;
      syncEdgeVisibility();
    },
    resetView() {
      clearFocusInternal({ notify: true });
      initialTransform = defaultTransform(width, height);
      applyTransform(initialTransform, true);
    },
    focusNode(nodeId: string) {
      const node = simNodes.find((candidate) => candidate.id === nodeId);
      if (!node) return;

      focusedNodeId = nodeId;
      applyNodeStyles();
      syncFocusedView(true);
      onFocusChange?.(focusedNodeId);
    },
    clearFocus() {
      clearFocusInternal({ notify: true });
    },
  };
}
