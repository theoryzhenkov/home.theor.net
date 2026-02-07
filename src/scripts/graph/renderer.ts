import * as d3 from 'd3';
import type { GraphData, GraphNode, GraphEdge, EdgeType } from '@/lib/graph-data';
import { EDGE_STYLES, resolveRuntimeColors } from './styles';

/* ── Types ────────────────────────────────────────────────────────── */

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  title: string;
  connections: number;
}

interface SimEdge extends d3.SimulationLinkDatum<SimNode> {
  type: EdgeType;
}

export interface GraphConfig {
  /** Relation types to render. Omit to show all. */
  visibleTypes?: Set<EdgeType>;
  /** Node ID to visually highlight (e.g. current page). */
  highlightNode?: string;
  /** Enable zoom / pan. Defaults to true. */
  zoomable?: boolean;
  /** Enable node drag. Defaults to true. */
  draggable?: boolean;
  /** Called when a node is clicked. Defaults to navigating to the page. */
  onNodeClick?: (nodeId: string) => void;
}

export interface GraphInstance {
  destroy(): void;
  resize(): void;
  setVisibleTypes(types: Set<EdgeType>): void;
}

/* ── Helpers ──────────────────────────────────────────────────────── */

function slugToHref(slug: string): string {
  return slug === 'index' ? '/' : `/${slug}/`;
}

function nodeRadius(connections: number): number {
  return Math.max(4, Math.min(16, 4 + Math.sqrt(connections) * 2.5));
}

/* ── Renderer ─────────────────────────────────────────────────────── */

export function createGraph(
  container: HTMLElement,
  data: GraphData,
  config: GraphConfig = {},
): GraphInstance {
  resolveRuntimeColors();

  const {
    highlightNode,
    zoomable = true,
    draggable = true,
    onNodeClick = (id) => { window.location.href = slugToHref(id); },
  } = config;

  let visibleTypes = config.visibleTypes ?? new Set(Object.keys(EDGE_STYLES) as EdgeType[]);

  /* ── Dimensions ─────────────────────────────────────────────── */

  let width = container.clientWidth;
  let height = container.clientHeight;

  /* ── SVG setup ──────────────────────────────────────────────── */

  const svg = d3.select(container)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${width} ${height}`);

  // Arrow markers for directed edges
  const defs = svg.append('defs');
  for (const [type, style] of Object.entries(EDGE_STYLES)) {
    if (!style.directed) continue;
    defs.append('marker')
      .attr('id', `arrow-${type}`)
      .attr('viewBox', '0 -4 8 8')
      .attr('refX', 12)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4')
      .attr('fill', style.color);
  }

  const g = svg.append('g');

  /* ── Zoom ───────────────────────────────────────────────────── */

  if (zoomable) {
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);

    // Fit content after simulation settles — set initial transform
    svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(0.9));
  }

  /* ── Data ────────────────────────────────────────────────────── */

  const simNodes: SimNode[] = data.nodes.map(n => ({ ...n }));
  const nodeMap = new Map(simNodes.map(n => [n.id, n]));

  const simEdges: SimEdge[] = data.edges
    .filter(e => nodeMap.has(e.source) && nodeMap.has(e.target))
    .map(e => ({
      source: nodeMap.get(e.source)!,
      target: nodeMap.get(e.target)!,
      type: e.type,
    }));

  /* ── Simulation ─────────────────────────────────────────────── */

  const simulation = d3.forceSimulation<SimNode>(simNodes)
    .force('link', d3.forceLink<SimNode, SimEdge>(simEdges)
      .id(d => d.id)
      .distance(80))
    .force('charge', d3.forceManyBody<SimNode>().strength(-200))
    .force('center', d3.forceCenter(0, 0))
    .force('collide', d3.forceCollide<SimNode>()
      .radius(d => nodeRadius(d.connections) + 8));

  /* ── Edge elements ──────────────────────────────────────────── */

  const edgeGroup = g.append('g').attr('class', 'graph-edges');

  let edgeSelection = edgeGroup.selectAll<SVGLineElement, SimEdge>('line')
    .data(simEdges.filter(e => visibleTypes.has(e.type)))
    .join('line')
    .attr('stroke', d => EDGE_STYLES[d.type].color)
    .attr('stroke-width', d => EDGE_STYLES[d.type].width)
    .attr('stroke-dasharray', d => EDGE_STYLES[d.type].dasharray)
    .attr('marker-end', d => EDGE_STYLES[d.type].directed ? `url(#arrow-${d.type})` : null)
    .attr('opacity', 0.6);

  /* ── Node elements ──────────────────────────────────────────── */

  const nodeGroup = g.append('g').attr('class', 'graph-nodes');

  const nodeGs = nodeGroup.selectAll<SVGGElement, SimNode>('g')
    .data(simNodes)
    .join('g')
    .attr('cursor', 'pointer')
    .on('click', (_event, d) => onNodeClick(d.id));

  // Circle
  nodeGs.append('circle')
    .attr('r', d => nodeRadius(d.connections))
    .attr('fill', d => d.id === highlightNode ? '#000055' : '#444')
    .attr('stroke', d => d.id === highlightNode ? '#000055' : '#999')
    .attr('stroke-width', d => d.id === highlightNode ? 2.5 : 1);

  // Label
  nodeGs.append('text')
    .text(d => d.title)
    .attr('x', d => nodeRadius(d.connections) + 4)
    .attr('y', 4)
    .attr('font-size', '11px')
    .attr('font-family', 'system-ui, sans-serif')
    .attr('fill', '#111')
    .attr('pointer-events', 'none');

  /* ── Drag ───────────────────────────────────────────────────── */

  if (draggable) {
    const drag = d3.drag<SVGGElement, SimNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
    nodeGs.call(drag);
  }

  /* ── Hover highlight ────────────────────────────────────────── */

  nodeGs
    .on('mouseenter', (_event, d) => {
      const connectedIds = new Set<string>();
      simEdges.forEach(e => {
        const src = (e.source as SimNode).id;
        const tgt = (e.target as SimNode).id;
        if (src === d.id) connectedIds.add(tgt);
        if (tgt === d.id) connectedIds.add(src);
      });
      connectedIds.add(d.id);

      nodeGs.attr('opacity', n => connectedIds.has(n.id) ? 1 : 0.15);
      edgeSelection.attr('opacity', e =>
        (e.source as SimNode).id === d.id || (e.target as SimNode).id === d.id ? 0.8 : 0.05,
      );
    })
    .on('mouseleave', () => {
      nodeGs.attr('opacity', 1);
      edgeSelection.attr('opacity', 0.6);
    });

  /* ── Tooltip ────────────────────────────────────────────────── */

  const tooltip = d3.select(container)
    .append('div')
    .style('position', 'absolute')
    .style('pointer-events', 'none')
    .style('background', 'var(--color-bg, #fff)')
    .style('border', '1px solid var(--color-border, #ccc)')
    .style('padding', '4px 8px')
    .style('font-size', '12px')
    .style('font-family', 'system-ui, sans-serif')
    .style('color', 'var(--color-text, #111)')
    .style('opacity', '0')
    .style('transition', 'opacity 50ms ease-out')
    .style('white-space', 'nowrap')
    .style('z-index', '10');

  nodeGs
    .on('mouseenter.tooltip', (event, d) => {
      tooltip
        .style('opacity', '1')
        .text(d.title);
    })
    .on('mousemove.tooltip', (event) => {
      const rect = container.getBoundingClientRect();
      tooltip
        .style('left', `${event.clientX - rect.left + 12}px`)
        .style('top', `${event.clientY - rect.top - 8}px`);
    })
    .on('mouseleave.tooltip', () => {
      tooltip.style('opacity', '0');
    });

  /* ── Tick ────────────────────────────────────────────────────── */

  simulation.on('tick', () => {
    edgeSelection
      .attr('x1', d => (d.source as SimNode).x!)
      .attr('y1', d => (d.source as SimNode).y!)
      .attr('x2', d => (d.target as SimNode).x!)
      .attr('y2', d => (d.target as SimNode).y!);

    nodeGs.attr('transform', d => `translate(${d.x},${d.y})`);
  });

  /* ── Public API ─────────────────────────────────────────────── */

  function rebuildEdges() {
    edgeSelection = edgeGroup.selectAll<SVGLineElement, SimEdge>('line')
      .data(simEdges.filter(e => visibleTypes.has(e.type)), (d) => {
        const src = typeof d.source === 'object' ? (d.source as SimNode).id : d.source;
        const tgt = typeof d.target === 'object' ? (d.target as SimNode).id : d.target;
        return `${src}-${tgt}-${d.type}`;
      })
      .join('line')
      .attr('stroke', d => EDGE_STYLES[d.type].color)
      .attr('stroke-width', d => EDGE_STYLES[d.type].width)
      .attr('stroke-dasharray', d => EDGE_STYLES[d.type].dasharray)
      .attr('marker-end', d => EDGE_STYLES[d.type].directed ? `url(#arrow-${d.type})` : null)
      .attr('opacity', 0.6);

    // Restart to update positions
    simulation.alpha(0.1).restart();
  }

  return {
    destroy() {
      simulation.stop();
      svg.remove();
      tooltip.remove();
    },
    resize() {
      width = container.clientWidth;
      height = container.clientHeight;
      svg.attr('viewBox', `0 0 ${width} ${height}`);
      simulation.force('center', d3.forceCenter(width / 2, height / 2));
      simulation.alpha(0.3).restart();
    },
    setVisibleTypes(types: Set<EdgeType>) {
      visibleTypes = types;
      rebuildEdges();
    },
  };
}
